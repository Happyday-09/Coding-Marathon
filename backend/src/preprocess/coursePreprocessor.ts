import path from 'path';
import { CsvRow, readCsv } from './csv';
import {
  Coordinate,
  haversineDistanceM,
  isInsideKoreaBBox,
  toGeoJsonLineString,
  toLineStringWkt,
  toPointWkt,
} from './geo';

type QualityStatus = 'valid' | 'needs_review' | 'rejected';
type Difficulty = 'flat' | 'hill' | 'trail' | 'mixed' | 'unknown';
type Severity = 'info' | 'warning' | 'error';

interface SourcePoint {
  sourcePointId: string;
  sourceTrackId: string;
  sourceOrder: number;
  lng: number;
  lat: number;
  elevationM: number | null;
  recordedAt: string | null;
}

interface CleanPoint extends SourcePoint {
  seq: number;
  segmentDistanceM: number;
  distanceFromStartM: number;
}

interface QualityIssue {
  source_type: 'beagle';
  source_course_id: string;
  source_track_id: string;
  issue_code: string;
  issue_message: string;
  severity: Severity;
  source_payload: Record<string, unknown>;
}

export interface PreprocessedCourse {
  course: Record<string, unknown>;
  coursePoints: Record<string, unknown>[];
  qualityIssues: QualityIssue[];
  routeGeojson: ReturnType<typeof toGeoJsonLineString>;
}

export interface PreprocessSummary {
  coursesRead: number;
  tracksRead: number;
  pointsRead: number;
  outputCourses: number;
  valid: number;
  needsReview: number;
  rejected: number;
}

export interface PreprocessResult {
  summary: PreprocessSummary;
  courses: PreprocessedCourse[];
  qualityIssues: QualityIssue[];
}

const MIN_VALID_POINTS = 10;
const MIN_LINESTRING_POINTS = 2;
const MIN_DISTANCE_M = 500;
const POINT_JUMP_REVIEW_M = 2000;
const POINT_JUMP_REJECT_COUNT = 3;
const DISTANCE_REVIEW_RATIO = 0.1;
const DISTANCE_REJECT_RATIO = 0.3;

const parseNumber = (value: string | undefined): number | null => {
  if (!value || value === 'NA') return null;
  const parsed = Number(value.replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
};

const parseInteger = (value: string | undefined): number | null => {
  const parsed = parseNumber(value);
  return parsed === null ? null : Math.round(parsed);
};

const nullIfEmpty = (value: string | undefined): string | null => {
  if (!value || value === 'NA') return null;
  return value;
};

const groupBy = <T>(items: T[], getKey: (item: T) => string): Map<string, T[]> => {
  const grouped = new Map<string, T[]>();
  items.forEach((item) => {
    const key = getKey(item);
    const bucket = grouped.get(key) ?? [];
    bucket.push(item);
    grouped.set(key, bucket);
  });
  return grouped;
};

const addIssue = (
  issues: QualityIssue[],
  sourceCourseId: string,
  sourceTrackId: string,
  issueCode: string,
  issueMessage: string,
  severity: Severity,
  sourcePayload: Record<string, unknown> = {}
): void => {
  issues.push({
    source_type: 'beagle',
    source_course_id: sourceCourseId,
    source_track_id: sourceTrackId,
    issue_code: issueCode,
    issue_message: issueMessage,
    severity,
    source_payload: sourcePayload,
  });
};

const normalizePoint = (
  row: CsvRow,
  issues: QualityIssue[],
  sourceCourseId: string
): SourcePoint | null => {
  const sourceTrackId = row.PRNTS_TRK_IDNO;
  const sourcePointId = row.TRK_PNT_IDNO;
  const sourceOrder = parseInteger(row.TRK_PNT_SRTNG_ORDR);
  const rawLng = parseNumber(row.TRK_PNT_LNGTD);
  const rawLat = parseNumber(row.TRK_PNT_LTTD);

  if (!sourceTrackId || !sourcePointId || sourceOrder === null || rawLng === null || rawLat === null) {
    addIssue(issues, sourceCourseId, sourceTrackId || '', 'invalid_coordinate', 'Point has missing or non-numeric coordinate/order data.', 'warning', {
      sourcePointId,
      rawLng: row.TRK_PNT_LNGTD,
      rawLat: row.TRK_PNT_LTTD,
      rawOrder: row.TRK_PNT_SRTNG_ORDR,
    });
    return null;
  }

  let lng = rawLng;
  let lat = rawLat;

  if (!isInsideKoreaBBox({ lng, lat }) && isInsideKoreaBBox({ lng: rawLat, lat: rawLng })) {
    lng = rawLat;
    lat = rawLng;
    addIssue(issues, sourceCourseId, sourceTrackId, 'lat_lng_swapped', 'Point coordinate was corrected by swapping lat/lng.', 'info', {
      sourcePointId,
      rawLng,
      rawLat,
    });
  }

  if (!isInsideKoreaBBox({ lng, lat })) {
    addIssue(issues, sourceCourseId, sourceTrackId, 'outside_korea_bbox', 'Point is outside Korea bbox after swap check.', 'warning', {
      sourcePointId,
      lng,
      lat,
    });
    return null;
  }

  return {
    sourcePointId,
    sourceTrackId,
    sourceOrder,
    lng,
    lat,
    elevationM: parseNumber(row.TRK_PNT_HASLV),
    recordedAt: nullIfEmpty(row.TRK_PNT_RCRD_DTM),
  };
};

const removeConsecutiveDuplicates = (
  points: SourcePoint[],
  issues: QualityIssue[],
  sourceCourseId: string,
  sourceTrackId: string
): SourcePoint[] => {
  const deduped: SourcePoint[] = [];
  let removed = 0;

  points.forEach((point) => {
    const previous = deduped[deduped.length - 1];
    if (previous && previous.lng === point.lng && previous.lat === point.lat) {
      removed += 1;
      return;
    }
    deduped.push(point);
  });

  if (removed > 0) {
    addIssue(issues, sourceCourseId, sourceTrackId, 'duplicate_points_removed', 'Consecutive duplicate points were removed.', 'info', {
      removed,
    });
  }

  return deduped;
};

const withDistances = (points: SourcePoint[]): CleanPoint[] => {
  let cumulative = 0;

  return points.map((point, index) => {
    const previous = points[index - 1];
    const segmentDistanceM = previous
      ? haversineDistanceM(previous, point)
      : 0;
    cumulative += segmentDistanceM;

    return {
      ...point,
      seq: index,
      segmentDistanceM: Math.round(segmentDistanceM * 100) / 100,
      distanceFromStartM: Math.round(cumulative * 100) / 100,
    };
  });
};

const classifyDifficulty = (course: CsvRow, track: CsvRow): Difficulty => {
  const avgSlope = parseNumber(track.TRK_AVRG_GRDNT) ?? parseNumber(course.COURS_AVRG_GRDNT) ?? 0;
  const uphillKm = parseNumber(track.TRK_UPR_LNGTH) ?? parseNumber(course.COURS_UPR_LNGTH) ?? 0;
  const trailHint = `${course.COURS_NM ?? ''} ${course.COURS_DSCRT ?? ''} ${track.TRK_NM ?? ''}`;

  if (/trail|트레일|산|둘레|등산|숲/i.test(trailHint)) return 'trail';
  if (avgSlope >= 3 || uphillKm >= 2) return 'hill';
  if (avgSlope >= 1 || uphillKm >= 0.5) return 'mixed';
  return 'flat';
};

const buildCourse = (
  course: CsvRow,
  track: CsvRow,
  points: CleanPoint[],
  qualityStatus: QualityStatus,
  qualityFlags: Set<string>,
  issues: QualityIssue[]
): PreprocessedCourse => {
  const sourceCourseId = course.COURS_IDNO;
  const sourceTrackId = track.TRK_IDNO;
  const startPoint = points[0];
  const endPoint = points[points.length - 1];
  const calculatedDistanceM = Math.round(endPoint.distanceFromStartM);
  const sourceDistanceM = parseInteger(course.COURS_TOT_LNGTH) ?? parseInteger(track.TRK_LNGTH);
  const sourceTimeSec = parseInteger(course.COURS_RQRMN_TM) ?? parseInteger(track.TRK_RQRMN_TM);
  const startEndDistanceM = Math.round(haversineDistanceM(startPoint, endPoint));

  return {
    course: {
      source_type: 'beagle',
      source_course_id: sourceCourseId,
      source_track_id: sourceTrackId,
      source_properties: {
        source_track_name: nullIfEmpty(track.TRK_NM),
        source_course_data_set_type: nullIfEmpty(course.COURS_DATA_SET_TPCD),
        source_data_status: nullIfEmpty(course.DATA_STCD),
        point_count: points.length,
        start_end_distance_m: startEndDistanceM,
        is_loop_candidate: startEndDistanceM <= 100,
        supports_partial_route: true,
        partial_route_basis: 'course_points.distance_from_start_m',
      },
      name: nullIfEmpty(course.COURS_NM) ?? nullIfEmpty(track.TRK_NM) ?? `Course ${sourceCourseId}`,
      short_name: nullIfEmpty(course.COURS_SNNM) ?? nullIfEmpty(track.TRK_SNNM),
      description: nullIfEmpty(course.COURS_DSCRT),
      province: nullIfEmpty(course.COURS_CTPRV_NM) ?? nullIfEmpty(track.TRK_CTPRV_NM),
      city: nullIfEmpty(course.COURS_EMNDN_NM) ?? nullIfEmpty(track.TRK_EMNDN_NM),
      area_name: nullIfEmpty(course.COURS_ARA_NM) ?? nullIfEmpty(track.TRK_ARA_NM),
      source_url: nullIfEmpty(course.COURS_WEBS_ADDR),
      distance_m: calculatedDistanceM,
      source_distance_m: sourceDistanceM,
      distance_delta_m: sourceDistanceM === null ? null : calculatedDistanceM - sourceDistanceM,
      estimated_time_sec: sourceTimeSec === null ? null : sourceTimeSec,
      min_elevation_m: parseNumber(track.TRK_LOWST_HASLV) ?? parseNumber(course.COURS_LOWST_HASLV),
      max_elevation_m: parseNumber(track.TRK_TOP_HASLV) ?? parseNumber(course.COURS_TOP_HASLV),
      avg_slope_percent: parseNumber(track.TRK_AVRG_GRDNT) ?? parseNumber(course.COURS_AVRG_GRDNT),
      difficulty: classifyDifficulty(course, track),
      quality_status: qualityStatus,
      quality_flags: [...qualityFlags],
      tags: [],
      route: toLineStringWkt(points),
      start_point: toPointWkt(startPoint),
      end_point: toPointWkt(endPoint),
      is_public: qualityStatus === 'valid',
      visibility: 'public',
      imported_at: new Date().toISOString(),
    },
    coursePoints: points.map((point) => ({
      seq: point.seq,
      lng: point.lng,
      lat: point.lat,
      elevation_m: point.elevationM,
      segment_distance_m: point.segmentDistanceM,
      distance_from_start_m: point.distanceFromStartM,
      recorded_at: point.recordedAt,
      source_point_id: point.sourcePointId,
    })),
    qualityIssues: issues,
    routeGeojson: toGeoJsonLineString(points),
  };
};

const determineQuality = (
  sourceCourseId: string,
  sourceTrackId: string,
  points: CleanPoint[],
  sourceDistanceM: number | null,
  qualityFlags: Set<string>,
  issues: QualityIssue[]
): QualityStatus => {
  if (points.length < MIN_LINESTRING_POINTS) {
    qualityFlags.add('too_few_points');
    addIssue(issues, sourceCourseId, sourceTrackId, 'too_few_points', 'Fewer than 2 valid points remain after cleanup.', 'error', {
      pointCount: points.length,
    });
    return 'rejected';
  }

  const calculatedDistanceM = points[points.length - 1].distanceFromStartM;
  const jumpCount = points.filter((point) => point.segmentDistanceM > POINT_JUMP_REVIEW_M).length;
  let status: QualityStatus = 'valid';

  if (points.length < MIN_VALID_POINTS) {
    qualityFlags.add('low_point_count');
    addIssue(issues, sourceCourseId, sourceTrackId, 'low_point_count', 'Course has fewer than recommended points.', 'warning', {
      pointCount: points.length,
    });
    status = 'needs_review';
  }

  if (calculatedDistanceM < MIN_DISTANCE_M) {
    qualityFlags.add('too_short');
    addIssue(issues, sourceCourseId, sourceTrackId, 'too_short', 'Calculated course distance is shorter than minimum service threshold.', 'error', {
      calculatedDistanceM,
    });
    status = 'rejected';
  }

  if (jumpCount > 0) {
    qualityFlags.add('point_jump_detected');
    addIssue(issues, sourceCourseId, sourceTrackId, 'point_jump_detected', 'One or more adjacent point jumps exceed review threshold.', jumpCount >= POINT_JUMP_REJECT_COUNT ? 'error' : 'warning', {
      jumpCount,
      thresholdM: POINT_JUMP_REVIEW_M,
    });
    status = jumpCount >= POINT_JUMP_REJECT_COUNT ? 'rejected' : 'needs_review';
  }

  if (sourceDistanceM && sourceDistanceM > 0) {
    const ratio = Math.abs(calculatedDistanceM - sourceDistanceM) / sourceDistanceM;
    if (ratio > DISTANCE_REJECT_RATIO) {
      qualityFlags.add('distance_mismatch');
      addIssue(issues, sourceCourseId, sourceTrackId, 'distance_mismatch', 'Calculated distance differs from source distance by more than 30%.', 'warning', {
        sourceDistanceM,
        calculatedDistanceM,
        ratio,
      });
      status = status === 'rejected' ? status : 'needs_review';
    } else if (ratio > DISTANCE_REVIEW_RATIO) {
      qualityFlags.add('distance_mismatch_minor');
      addIssue(issues, sourceCourseId, sourceTrackId, 'distance_mismatch_minor', 'Calculated distance differs from source distance by more than 10%.', 'warning', {
        sourceDistanceM,
        calculatedDistanceM,
        ratio,
      });
      status = status === 'valid' ? 'needs_review' : status;
    }
  }

  return status;
};

export async function preprocessBeagleCourses(dataDir: string): Promise<PreprocessResult> {
  const [courseRows, connectionRows, trackRows, pointRows] = await Promise.all([
    readCsv(path.join(dataDir, 'TB_TRKG_COURSE_INFO_M.csv')),
    readCsv(path.join(dataDir, 'TB_TRKG_COURSE_TRK_CONN_RLTN_R.csv')),
    readCsv(path.join(dataDir, 'TB_TRKG_TRK_INFO_D.csv')),
    readCsv(path.join(dataDir, 'TB_TRKG_TRK_PNT_NO1_L.csv')),
  ]);

  const tracksById = new Map(trackRows.map((track) => [track.TRK_IDNO, track]));
  const connectionsByCourseId = groupBy(connectionRows, (connection) => connection.CONN_COURS_IDNO);
  const rawPointsByTrackId = groupBy(pointRows, (point) => point.PRNTS_TRK_IDNO);
  const courses: PreprocessedCourse[] = [];
  const allQualityIssues: QualityIssue[] = [];
  let valid = 0;
  let needsReview = 0;
  let rejected = 0;

  courseRows.forEach((course) => {
    const sourceCourseId = course.COURS_IDNO;
    const connections = (connectionsByCourseId.get(sourceCourseId) ?? [])
      .sort((a, b) => (parseInteger(a.COURS_TRK_ORDR) ?? 0) - (parseInteger(b.COURS_TRK_ORDR) ?? 0));

    connections.forEach((connection) => {
      const sourceTrackId = connection.CONN_TRK_IDNO;
      const track = tracksById.get(sourceTrackId);
      const issues: QualityIssue[] = [];
      const qualityFlags = new Set<string>();

      if (!track) {
        qualityFlags.add('missing_track');
        addIssue(issues, sourceCourseId, sourceTrackId, 'missing_track', 'Course-track connection references a missing track.', 'error');
        allQualityIssues.push(...issues);
        rejected += 1;
        return;
      }

      const sourcePoints = (rawPointsByTrackId.get(sourceTrackId) ?? [])
        .map((row) => normalizePoint(row, issues, sourceCourseId))
        .filter((point): point is SourcePoint => point !== null)
        .sort((a, b) => a.sourceOrder - b.sourceOrder);

      const dedupedPoints = removeConsecutiveDuplicates(sourcePoints, issues, sourceCourseId, sourceTrackId);
      const cleanPoints = withDistances(dedupedPoints);
      const sourceDistanceM = parseInteger(course.COURS_TOT_LNGTH) ?? parseInteger(track.TRK_LNGTH);
      const qualityStatus = determineQuality(sourceCourseId, sourceTrackId, cleanPoints, sourceDistanceM, qualityFlags, issues);

      if (qualityStatus === 'rejected') rejected += 1;
      if (qualityStatus === 'needs_review') needsReview += 1;
      if (qualityStatus === 'valid') valid += 1;

      allQualityIssues.push(...issues);

      if (cleanPoints.length >= MIN_LINESTRING_POINTS) {
        courses.push(buildCourse(course, track, cleanPoints, qualityStatus, qualityFlags, issues));
      }
    });
  });

  return {
    summary: {
      coursesRead: courseRows.length,
      tracksRead: trackRows.length,
      pointsRead: pointRows.length,
      outputCourses: courses.length,
      valid,
      needsReview,
      rejected,
    },
    courses,
    qualityIssues: allQualityIssues,
  };
}
