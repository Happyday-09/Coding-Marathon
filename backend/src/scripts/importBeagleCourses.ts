import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { supabase } from '../config/supabase';

type QualityStatus = 'valid' | 'needs_review' | 'rejected';
type Severity = 'info' | 'warning' | 'error';

interface QualityIssuePayload {
  source_type: 'beagle';
  source_course_id: string;
  source_track_id: string;
  issue_code: string;
  issue_message: string;
  severity: Severity;
  source_payload: Record<string, unknown>;
}

interface PreprocessedCoursePayload {
  course: {
    source_type: 'beagle';
    source_course_id: string;
    source_track_id: string;
    quality_status: QualityStatus;
    [key: string]: unknown;
  };
  coursePoints: Array<Record<string, unknown>>;
  qualityIssues: QualityIssuePayload[];
}

interface ImportSummary {
  totalRead: number;
  eligible: number;
  insertedCourses: number;
  insertedPoints: number;
  insertedIssues: number;
  skippedExisting: number;
  skippedByStatus: number;
  failed: number;
}

const parseAllowedStatuses = (): Set<QualityStatus> => {
  const raw = process.env.IMPORT_COURSE_STATUSES ?? 'valid';
  const values = raw.split(',').map((value) => value.trim()).filter(Boolean);
  return new Set(values as QualityStatus[]);
};

const batch = <T>(items: T[], size: number): T[][] => {
  const batches: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    batches.push(items.slice(index, index + size));
  }
  return batches;
};

const sourceKey = (courseId: string | null, trackId: string | null): string =>
  `${courseId ?? ''}::${trackId ?? ''}`;

const readPreprocessedCourses = (filePath: string): PreprocessedCoursePayload[] => {
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw) as PreprocessedCoursePayload[];
};

const fetchExistingBeagleCourseKeys = async (): Promise<Set<string>> => {
  const { data, error } = await supabase
    .from('courses')
    .select('source_course_id, source_track_id')
    .eq('source_type', 'beagle');

  if (error) {
    throw new Error(`Failed to fetch existing beagle courses: ${error.message}`);
  }

  return new Set(
    (data ?? []).map((row) => sourceKey(row.source_course_id, row.source_track_id))
  );
};

const validateDatabaseSchema = async (): Promise<void> => {
  const { error } = await supabase
    .from('course_points')
    .select('id, segment_distance_m, distance_from_start_m')
    .limit(1);

  if (error) {
    throw new Error(
      `Supabase schema is missing required course point distance columns. Apply the latest migration first. Detail: ${error.message}`
    );
  }
};

const insertBatches = async (
  tableName: string,
  rows: Array<Record<string, unknown>>,
  batchSize: number
): Promise<number> => {
  let inserted = 0;

  for (const rowsBatch of batch(rows, batchSize)) {
    const { error } = await supabase.from(tableName).insert(rowsBatch);
    if (error) {
      throw new Error(`Failed to insert ${tableName}: ${error.message}`);
    }
    inserted += rowsBatch.length;
  }

  return inserted;
};

const importCourses = async (): Promise<ImportSummary> => {
  const inputPath = path.resolve(
    __dirname,
    '../../../data/processed/beagle_courses_preprocessed.json'
  );
  const courses = readPreprocessedCourses(inputPath);
  const allowedStatuses = parseAllowedStatuses();
  const includeInfoIssues = process.env.IMPORT_INFO_ISSUES === 'true';
  const batchSize = Number(process.env.IMPORT_BATCH_SIZE ?? 500);

  await validateDatabaseSchema();

  const existingKeys = await fetchExistingBeagleCourseKeys();

  const summary: ImportSummary = {
    totalRead: courses.length,
    eligible: 0,
    insertedCourses: 0,
    insertedPoints: 0,
    insertedIssues: 0,
    skippedExisting: 0,
    skippedByStatus: 0,
    failed: 0,
  };

  for (const item of courses) {
    const course = item.course;

    if (!allowedStatuses.has(course.quality_status)) {
      summary.skippedByStatus += 1;
      continue;
    }

    summary.eligible += 1;

    const key = sourceKey(course.source_course_id, course.source_track_id);
    if (existingKeys.has(key)) {
      summary.skippedExisting += 1;
      continue;
    }

    const { data: insertedCourse, error: courseError } = await supabase
      .from('courses')
      .insert(course)
      .select('id')
      .single();

    if (courseError || !insertedCourse) {
      summary.failed += 1;
      console.error(
        `Failed to insert course ${course.source_course_id}/${course.source_track_id}: ${courseError?.message}`
      );
      continue;
    }

    const courseId = insertedCourse.id as string;
    summary.insertedCourses += 1;
    existingKeys.add(key);

    try {
      const points = item.coursePoints.map((point) => ({
        ...point,
        course_id: courseId,
      }));
      summary.insertedPoints += await insertBatches('course_points', points, batchSize);

      const issues = item.qualityIssues
        .filter((issue) => includeInfoIssues || issue.severity !== 'info')
        .map((issue) => ({
          ...issue,
          course_id: courseId,
        }));

      summary.insertedIssues += await insertBatches('course_quality_issues', issues, batchSize);

      console.log(
        `Imported ${course.source_course_id}/${course.source_track_id}: ${points.length} points, ${issues.length} issues`
      );
    } catch (error) {
      summary.failed += 1;
      summary.insertedCourses -= 1;
      existingKeys.delete(key);

      await supabase.from('courses').delete().eq('id', courseId);
      console.error(
        `Rolled back course ${course.source_course_id}/${course.source_track_id}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  return summary;
};

importCourses()
  .then((summary) => {
    console.log('Beagle course import complete.');
    console.log(JSON.stringify(summary, null, 2));
  })
  .catch((error) => {
    console.error('Beagle course import failed:', error);
    process.exit(1);
  });
