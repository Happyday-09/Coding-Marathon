// ============================================
// Database Seed Script for Supabase
// ============================================

import dotenv from 'dotenv';
import path from 'path';
// Load environment variables first
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { supabase } from '../config/supabase';
import { Course, Run, Battle } from '../types';
import {
  dummyUsers,
  dummyCourses,
  dummyRuns,
  dummyBattles,
} from '../data/dummyData';

const testUserUUIDs: Record<string, string> = {
  'user-001': '00000000-0000-0000-0000-000000000001',
  'user-002': '00000000-0000-0000-0000-000000000002',
  'user-003': '00000000-0000-0000-0000-000000000003',
};

// Map difficulty from UI to DB enum ('flat', 'hill', 'trail', 'mixed', 'unknown')
const mapDifficulty = (diff: string): string => {
  if (diff === 'easy') return 'flat';
  if (diff === 'medium') return 'mixed';
  if (diff === 'hard') return 'hill';
  return 'unknown';
};

const coordsToLineStringWKT = (coords: any[]): string => {
  if (!coords || coords.length < 2) return '';
  return `SRID=4326;LINESTRING(${coords.map((c) => `${c.longitude} ${c.latitude}`).join(', ')})`;
};

const coordToPointWKT = (coord: any): string => {
  if (!coord) return '';
  return `SRID=4326;POINT(${coord.longitude} ${coord.latitude})`;
};

async function seed() {
  console.log('🏁 Starting Supabase Database Seeding...');

  try {
    // ── 1. Clean Existing Test Data ─────────────────────────────
    console.log('🧹 Cleaning old test data...');

    // Delete existing test auth users (will cascade delete profiles, runs, battles)
    for (const userId of Object.values(testUserUUIDs)) {
      await supabase.auth.admin.deleteUser(userId).catch(() => {});
    }

    // Delete public standard courses
    await supabase.from('courses').delete().eq('source_type', 'public_standard');

    // ── 2. Seed Users & Profiles ────────────────────────────────
    console.log('👤 Seeding auth users and profiles...');
    for (const dummyUser of dummyUsers) {
      const uuid = testUserUUIDs[dummyUser.id];
      const email =
        dummyUser.id === 'user-001'
          ? 'runner@example.com'
          : dummyUser.id === 'user-002'
          ? 'speedy@example.com'
          : 'newbie@example.com';

      // Create Auth User
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        id: uuid,
        email: email,
        password: 'password123',
        email_confirm: true,
        user_metadata: { nickname: dummyUser.nickname },
      });

      if (authError) {
        console.error(`Failed to create auth user ${email}:`, authError.message);
        continue;
      }

      // Update Profile (created automatically by trigger)
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          running_level: dummyUser.level,
        })
        .eq('id', uuid);

      if (profileError) {
        console.error(`Failed to update profile for ${dummyUser.nickname}:`, profileError.message);
      } else {
        console.log(`✅ Seeded User: ${dummyUser.nickname} (${email})`);
      }
    }

    // ── 3. Seed Courses & Points ────────────────────────────────
    console.log('🗺️ Seeding courses and path points...');
    const courseIdMapping: Record<string, string> = {};

    for (const course of dummyCourses) {
      const routeWKT = coordsToLineStringWKT(course.coordinates);
      const startWKT = coordToPointWKT(course.coordinates[0]);
      const endWKT = coordToPointWKT(course.coordinates[course.coordinates.length - 1]);

      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .insert({
          source_type: 'public_standard',
          name: course.name,
          description: course.description,
          province: course.location.split(' ')[0] || '서울',
          city: course.location.split(' ')[1] || '',
          distance_m: Math.round(course.distance * 1000),
          estimated_time_sec: course.estimatedTime * 60,
          difficulty: mapDifficulty(course.difficulty),
          quality_status: 'valid',
          tags: course.tags,
          route: routeWKT,
          start_point: startWKT,
          end_point: endWKT,
          is_public: true,
          visibility: 'public',
        })
        .select()
        .single();

      if (courseError) {
        console.error(`Failed to insert course ${course.name}:`, courseError.message);
        continue;
      }

      const newCourseId = courseData.id;
      courseIdMapping[course.id] = newCourseId;
      console.log(`✅ Seeded Course: ${course.name}`);

      // Insert Course Points
      const pointsData = course.coordinates.map((coord, idx) => ({
        course_id: newCourseId,
        seq: idx,
        lng: coord.longitude,
        lat: coord.latitude,
      }));

      const { error: pointsError } = await supabase.from('course_points').insert(pointsData);
      if (pointsError) {
        console.error(`Failed to insert course points for ${course.name}:`, pointsError.message);
      }
    }

    // ── 4. Seed Runs & Points ───────────────────────────────────
    console.log('🏃 Seeding runs and points...');
    const runIdMapping: Record<string, string> = {};

    for (const run of dummyRuns) {
      const userUUID = testUserUUIDs[run.userId];
      if (!userUUID) continue;

      const matchedCourseId = courseIdMapping[run.id.replace('run', 'course')]; // Simple auto mapping
      const routeWKT = coordsToLineStringWKT(run.route);

      // Convert pace (min/km) to seconds/km
      const avgPaceSec = Math.round(run.pace * 60);

      const { data: runData, error: runError } = await supabase
        .from('runs')
        .insert({
          user_id: userUUID,
          course_id: matchedCourseId || null,
          title: matchedCourseId ? '지정 코스 완주' : '자유 달리기',
          distance_m: Math.round(run.distance * 1000),
          duration_sec: run.duration,
          avg_pace_sec_per_km: avgPaceSec,
          route: routeWKT || null,
          started_at: new Date(new Date(run.createdAt).getTime() - run.duration * 1000).toISOString(),
          ended_at: run.createdAt,
          visibility: 'private',
        })
        .select()
        .single();

      if (runError) {
        console.error(`Failed to insert run ${run.id}:`, runError.message);
        continue;
      }

      const newRunId = runData.id;
      runIdMapping[run.id] = newRunId;

      // Insert Run Points
      if (run.route && run.route.length > 0) {
        const pointsData = run.route.map((coord, idx) => ({
          run_id: newRunId,
          seq: idx,
          lng: coord.longitude,
          lat: coord.latitude,
        }));
        const { error: pointsError } = await supabase.from('run_points').insert(pointsData);
        if (pointsError) {
          console.error(`Failed to insert run points for run ${run.id}:`, pointsError.message);
        }
      }
    }
    console.log(`✅ Seeded ${dummyRuns.length} run records.`);

    // ── 5. Seed Battles ─────────────────────────────────────────
    console.log('⚔️ Seeding battles...');
    for (const battle of dummyBattles) {
      const challengerUUID = testUserUUIDs[battle.challengerId];
      const opponentUUID = testUserUUIDs[battle.opponentId];
      const challengerRunUUID = runIdMapping[battle.challengerRunId];
      const opponentRunUUID = battle.opponentRunId ? runIdMapping[battle.opponentRunId] : null;

      if (!challengerUUID || !opponentUUID || !challengerRunUUID) continue;

      const { error: battleError } = await supabase.from('battles').insert({
        challenger_id: challengerUUID,
        opponent_id: opponentUUID,
        status: battle.status,
        target_distance: battle.targetDistance,
        target_duration: battle.targetDuration,
        target_pace: battle.targetPace,
        opponent_progress: battle.opponentProgress,
        opponent_duration: battle.opponentDuration || null,
        winner_id: battle.winnerId ? testUserUUIDs[battle.winnerId] : null,
        challenger_run_id: challengerRunUUID,
        opponent_run_id: opponentRunUUID,
        created_at: battle.createdAt,
      });

      if (battleError) {
        console.error(`Failed to insert battle ${battle.id}:`, battleError.message);
      } else {
        console.log(`✅ Seeded Battle: ${battle.id} (${battle.status})`);
      }
    }

    console.log('🎉 Seeding successfully completed!');
  } catch (err: any) {
    console.error('❌ Seeding failed with unexpected error:', err);
  }
}

seed();
