import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { supabase } from '../config/supabase';

// Haversine formula to compute distance in km
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const coordsToLineStringWKT = (coords: any[]): string => {
  if (!coords || coords.length < 2) return '';
  return `SRID=4326;LINESTRING(${coords.map((c) => `${c.longitude} ${c.latitude}`).join(', ')})`;
};

const coordToPointWKT = (coord: any): string => {
  if (!coord) return '';
  return `SRID=4326;POINT(${coord.longitude} ${coord.latitude})`;
};

async function importGpx() {
  console.log('🔄 Importing GPX Course: 전남_순천시_오천동.gpx ...');

  const gpxPath = path.resolve(__dirname, '../../../gpx files/전남_순천시_오천도NG.gpx');
  // Handle normalization for KakaoMap route name or fallback to direct name
  const alternativePath = path.resolve(__dirname, '../../../gpx files/전남_순천시_오천동.gpx');
  
  let targetPath = gpxPath;
  if (!fs.existsSync(targetPath)) {
    targetPath = alternativePath;
  }
  
  if (!fs.existsSync(targetPath)) {
    console.error('❌ GPX file not found.');
    return;
  }

  const gpxContent = fs.readFileSync(targetPath, 'utf8');

  // Match all trkpt tags
  const trkptRegex = /<trkpt\s+lat="([\d.-]+)"\s+lon="([\d.-]+)"/g;
  let match;
  const coordinates: { latitude: number; longitude: number }[] = [];

  while ((match = trkptRegex.exec(gpxContent)) !== null) {
    coordinates.push({
      latitude: parseFloat(match[1]),
      longitude: parseFloat(match[2]),
    });
  }

  if (coordinates.length < 2) {
    console.error('❌ No coordinates found in GPX file.');
    return;
  }

  console.log(`📍 Parsed ${coordinates.length} points.`);

  // Calculate total distance
  let totalDistKm = 0;
  for (let i = 0; i < coordinates.length - 1; i++) {
    const p1 = coordinates[i];
    const p2 = coordinates[i + 1];
    totalDistKm += haversineKm(p1.latitude, p1.longitude, p2.latitude, p2.longitude);
  }

  const distanceFormatted = Math.round(totalDistKm * 100) / 100;
  const distanceMeters = Math.round(totalDistKm * 1000);
  console.log(`📏 Calculated Course Distance: ${distanceFormatted} km (${distanceMeters} m)`);

  // Setup Course Metadata
  const courseData = {
    id: crypto.randomUUID(),
    name: '순천 동천 오천동 코스',
    description: '순천 동천 물길을 따라 걷고 달리는 상쾌한 오천동 코스입니다. 평탄하고 쾌적한 보행로가 조성되어 러닝에 최적화되어 있습니다.',
    province: '전라남도',
    city: '순천시',
    area_name: '오천동',
    distance_m: distanceMeters,
    source_distance_m: distanceMeters,
    difficulty: 'easy',
    tags: ['순천동천', '오천그린광장', '평지코스', '리버뷰'],
    source_type: 'public_standard',
    source_course_id: 'gpx_suncheon_ocheon',
    created_at: new Date().toISOString(),
  };

  // Convert to DB Format (removing 'coordinates' json attribute)
  const dbCourse = {
    id: courseData.id,
    name: courseData.name,
    description: courseData.description,
    province: courseData.province,
    city: courseData.city,
    area_name: courseData.area_name,
    distance_m: courseData.distance_m,
    source_distance_m: courseData.source_distance_m,
    difficulty: 'flat', // map to DB enum
    tags: courseData.tags,
    source_type: courseData.source_type,
    source_course_id: courseData.source_course_id,
    created_at: courseData.created_at,
    route: coordsToLineStringWKT(coordinates),
    start_point: coordToPointWKT(coordinates[0]),
    end_point: coordToPointWKT(coordinates[coordinates.length - 1]),
    visibility: 'public',
    quality_status: 'valid',
  };

  // 0. Clean old imported record to avoid unique constraints violation
  console.log('🧹 Cleaning old duplicate GPX courses...');
  await supabase.from('courses').delete().eq('source_course_id', dbCourse.source_course_id);

  // 1. Insert into Supabase (courses)
  console.log('💾 Inserting into Supabase courses table...');
  const { error: courseErr } = await supabase.from('courses').upsert(dbCourse, { onConflict: 'id' });

  if (courseErr) {
    console.error('❌ Supabase courses Upsert Failed:', courseErr.message);
    return;
  }
  console.log('✅ Inserted course main info.');

  // 2. Insert into Supabase (course_points)
  console.log('💾 Inserting course coordinates into course_points...');
  const pointsData = coordinates.map((coord, idx) => ({
    course_id: dbCourse.id,
    seq: idx,
    lng: coord.longitude,
    lat: coord.latitude,
  }));

  const { error: pointsErr } = await supabase.from('course_points').insert(pointsData);
  if (pointsErr) {
    console.error('❌ Supabase course_points Insert Failed:', pointsErr.message);
    return;
  }
  console.log('✅ Successfully inserted all course coordinates!');
  console.log('🎉 Done! All tasks completed successfully.');
}

importGpx();
