// ============================================
// GPX Course Import Script
// Usage: npm run import:gpx
// ============================================

import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { supabase } from '../config/supabase';

const GPX_DIR = path.resolve(__dirname, '../../../gpx files');

// ── GPX Parsing ──────────────────────────────────────────────

function extractText(xml: string, tag: string): string {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`);
  const m = xml.match(regex);
  return m ? m[1].trim() : '';
}

function parseDescription(rawDesc: string): string {
  if (!rawDesc) return '';
  try {
    const decoded = rawDesc
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>');
    const doc = JSON.parse(decoded);
    const texts: string[] = [];
    const walk = (node: any) => {
      if (node.type === 'text' && node.text) texts.push(node.text);
      if (Array.isArray(node.content)) node.content.forEach(walk);
    };
    walk(doc);
    return texts.join(' ');
  } catch {
    return rawDesc;
  }
}

function parseGpx(xml: string): { name: string; description: string; points: [number, number][] } {
  const metadataMatch = xml.match(/<metadata>([\s\S]*?)<\/metadata>/);
  const metadataBlock = metadataMatch ? metadataMatch[1] : '';

  const name = extractText(metadataBlock, 'name') || 'Unknown';
  const rawDesc = extractText(metadataBlock, 'desc');
  const description = parseDescription(rawDesc) || name;

  const points: [number, number][] = [];
  const re = /<trkpt\s+lat="([\d.]+)"\s+lon="([\d.]+)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    points.push([parseFloat(m[1]), parseFloat(m[2])]);
  }

  return { name, description, points };
}

// ── Distance & Difficulty ────────────────────────────────────

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function totalDistance(points: [number, number][]): number {
  let d = 0;
  for (let i = 1; i < points.length; i++) {
    d += haversine(points[i - 1][0], points[i - 1][1], points[i][0], points[i][1]);
  }
  return d;
}

function getDifficulty(distM: number): string {
  if (distM < 5000) return 'flat';
  if (distM < 10000) return 'mixed';
  return 'hill';
}

// ── Sampling ─────────────────────────────────────────────────

function sample(points: [number, number][], max: number): [number, number][] {
  if (points.length <= max) return points;
  const step = Math.ceil(points.length / max);
  const result: [number, number][] = [];
  for (let i = 0; i < points.length; i += step) result.push(points[i]);
  const last = points[points.length - 1];
  if (result[result.length - 1] !== last) result.push(last);
  return result;
}

// ── Location & Tags ──────────────────────────────────────────

interface Location { province: string; city: string; areaName: string }

function mapLocation(name: string): Location {
  if (name.includes('여의도')) return { province: '서울특별시', city: '영등포구', areaName: '여의도동' };
  if (name.includes('도림천')) return { province: '서울특별시', city: '관악구', areaName: '도림동' };
  if (name.includes('노들') || name.includes('원효') || name.includes('마포대교')) return { province: '서울특별시', city: '영등포구', areaName: '노들섬' };
  if (name.includes('어린이대공원')) return { province: '서울특별시', city: '광진구', areaName: '능동' };
  if (name.includes('양재')) return { province: '서울특별시', city: '서초구', areaName: '양재동' };
  if (name.includes('서울숲')) return { province: '서울특별시', city: '성동구', areaName: '성수동1가' };
  if (name.includes('청계천') || name.includes('광화문') || name.includes('댕댕')) return { province: '서울특별시', city: '종로구', areaName: '세종로' };
  if (name.includes('성수') || name.includes('팩토리')) return { province: '서울특별시', city: '성동구', areaName: '성수동' };
  if (name.includes('남산') || name.includes('남북순')) return { province: '서울특별시', city: '용산구', areaName: '남산공원' };
  if (name.includes('송파') || name.includes('닥스')) return { province: '서울특별시', city: '송파구', areaName: '잠실동' };
  if (name.includes('동작')) return { province: '서울특별시', city: '동작구', areaName: '동작동' };
  if (name.includes('백운호수')) return { province: '경기도', city: '의왕시', areaName: '학의동' };
  if (name.includes('세종') || name.includes('거북이')) return { province: '세종특별자치시', city: '세종시', areaName: '도담동' };
  if (name.includes('서울대')) return { province: '서울특별시', city: '관악구', areaName: '신림동' };
  if (name.includes('광교')) return { province: '경기도', city: '수원시', areaName: '이의동' };
  if (name.includes('목요일') || name.includes('20km')) return { province: '서울특별시', city: '마포구', areaName: '상암동' };
  return { province: '서울특별시', city: '서울시', areaName: '' };
}

function getTags(name: string): string[] {
  const tags: string[] = [];
  if (name.includes('한강') || name.includes('노들') || name.includes('원효') || name.includes('동작')) tags.push('한강');
  if (name.includes('공원')) tags.push('공원');
  if (name.includes('남산') || name.includes('남북순')) { tags.push('남산'); tags.push('트레일'); }
  if (name.includes('트레일')) tags.push('트레일');
  if (name.includes('청계천')) tags.push('청계천');
  if (name.includes('광화문') || name.includes('도심') || name.includes('댕댕')) tags.push('도심');
  if (name.includes('호수') || name.includes('광교') || name.includes('백운')) tags.push('호수');
  if (name.includes('숲') || name.includes('서울숲') || name.includes('양재')) tags.push('숲길');
  if (name.includes('20km') || name.includes('목요일')) tags.push('장거리');
  if (name.includes('하트') || name.includes('붕어빵') || name.includes('식빵') || name.includes('고구마') || name.includes('나비') || name.includes('거북이') || name.includes('닥스') || name.includes('고래')) tags.push('테마런');
  if (name.includes('순환') || name.includes('한바퀴') || name.includes('인코스')) tags.push('순환코스');
  return [...new Set(tags)];
}

// ── WKT Helpers ──────────────────────────────────────────────

const toLineWKT = (pts: [number, number][]) =>
  `SRID=4326;LINESTRING(${pts.map(([lat, lng]) => `${lng} ${lat}`).join(', ')})`;

const toPointWKT = (lat: number, lng: number) =>
  `SRID=4326;POINT(${lng} ${lat})`;

// ── Main ─────────────────────────────────────────────────────

async function main() {
  console.log('🏁 GPX Course Import Starting...');
  console.log(`📁 GPX directory: ${GPX_DIR}\n`);

  if (!fs.existsSync(GPX_DIR)) {
    console.error('❌ GPX directory not found:', GPX_DIR);
    process.exit(1);
  }

  const files = fs.readdirSync(GPX_DIR).filter((f) => f.endsWith('.gpx'));
  console.log(`Found ${files.length} GPX files\n`);

  let imported = 0;
  let skipped = 0;
  let failed = 0;

  for (const file of files) {
    const sourceId = `gpx_${file}`;
    const xml = fs.readFileSync(path.join(GPX_DIR, file), 'utf8');
    const { name, description, points } = parseGpx(xml);

    if (points.length < 2) {
      console.warn(`⚠️  Skipping ${file}: insufficient track points`);
      skipped++;
      continue;
    }

    // Check if already imported
    const { data: existing } = await supabase
      .from('courses')
      .select('id')
      .eq('source_type', 'public_standard')
      .eq('source_course_id', sourceId)
      .maybeSingle();

    if (existing) {
      console.log(`⏭️  Already imported: ${name}`);
      skipped++;
      continue;
    }

    const distM = Math.round(totalDistance(points));
    const difficulty = getDifficulty(distM);
    const estimatedTimeSec = Math.round((distM / 1000 / 6) * 3600); // 6 km/h avg
    const location = mapLocation(name);
    const tags = getTags(name);

    // Sample to max 200 points for polyline
    const sampled = sample(points, 200);

    const { data: courseData, error: courseErr } = await supabase
      .from('courses')
      .insert({
        source_type: 'public_standard',
        source_course_id: sourceId,
        name,
        description,
        province: location.province,
        city: location.city,
        area_name: location.areaName,
        distance_m: distM,
        estimated_time_sec: estimatedTimeSec,
        difficulty,
        quality_status: 'valid',
        tags,
        route: toLineWKT(sampled),
        start_point: toPointWKT(points[0][0], points[0][1]),
        end_point: toPointWKT(points[points.length - 1][0], points[points.length - 1][1]),
        is_public: true,
        visibility: 'public',
      })
      .select('id')
      .single();

    if (courseErr || !courseData) {
      console.error(`❌ Failed to insert course "${name}":`, courseErr?.message);
      failed++;
      continue;
    }

    const pointRows = sampled.map(([lat, lng], idx) => ({
      course_id: courseData.id,
      seq: idx,
      lat,
      lng,
    }));

    const { error: ptsErr } = await supabase.from('course_points').insert(pointRows);
    if (ptsErr) {
      console.error(`⚠️  Course inserted but points failed for "${name}":`, ptsErr.message);
    }

    console.log(
      `✅ ${name}  |  ${(distM / 1000).toFixed(2)} km  |  ${difficulty}  |  ${sampled.length} pts  |  [${location.province} ${location.city}]`
    );
    imported++;
  }

  console.log(`\n🏁 Done — imported: ${imported}, skipped: ${skipped}, failed: ${failed}`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});