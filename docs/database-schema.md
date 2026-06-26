# Supabase DB Schema

이 문서는 러닝 코스 MVP를 위한 Supabase PostgreSQL 스키마 기준입니다. 기존 README의 러프한 테이블 설계보다 이 문서를 우선합니다.

## 설계 기준

- 지도 검색은 PostGIS `geography` 타입을 사용합니다.
- 서비스 화면은 정제 완료된 `courses`만 조회합니다.
- 비글 원본 데이터는 바로 서비스 테이블에 넣지 않고 전처리 후 적재합니다.
- 원본 ID, 원본 거리, 계산 거리 차이, 품질 플래그를 남겨서 데이터 품질을 추적합니다.
- 사용자 기록/찜은 MVP에 포함하고, 친구 공개/공유는 `visibility`로 확장 여지를 둡니다.

## 핵심 테이블

### `profiles`

Supabase Auth의 `auth.users`와 1:1로 연결되는 앱 사용자 프로필입니다.

주요 컬럼:

- `id`: `auth.users.id` 참조
- `nickname`
- `running_level`: `beginner`, `intermediate`, `advanced`
- `avatar_url`

### `courses`

서비스에서 보여줄 정제된 러닝 코스의 중심 테이블입니다.

주요 컬럼:

- `source_type`: `beagle`, `public_standard`, `user_recorded`
- `source_course_id`: 비글 `COURS_IDNO` 또는 공공 데이터 원본 ID
- `source_track_id`: 비글 `TRK_IDNO`
- `source_properties`: 원본에서 보존할 부가 필드 JSON
- `name`, `description`, `province`, `city`, `area_name`
- `distance_m`: 전처리에서 재계산한 서비스 기준 거리
- `source_distance_m`: 원본이 제공한 거리
- `distance_delta_m`: 원본 거리와 계산 거리 차이
- `estimated_time_sec`
- `elevation_gain_m`, `elevation_loss_m`, `min_elevation_m`, `max_elevation_m`
- `difficulty`: `flat`, `hill`, `trail`, `mixed`, `unknown`
- `quality_status`: `pending`, `valid`, `needs_review`, `rejected`
- `quality_flags`: `outside_korea_bbox`, `lat_lng_swapped`, `too_short` 같은 품질 플래그
- `route`: PostGIS LineString
- `start_point`, `end_point`: 주변 검색과 지도 핀용 Point
- `visibility`: `private`, `friends`, `public`

### `course_points`

코스 라인을 구성하는 정렬된 GPS 포인트입니다.

주요 컬럼:

- `course_id`
- `seq`
- `lng`, `lat`
- `elevation_m`
- `recorded_at`
- `source_point_id`
- `point`: PostGIS Point 생성 컬럼

`course_id + seq`는 중복될 수 없습니다.

### `course_waypoints`

비글 `TB_TRKG_WPT_INFO_L.csv` 같은 웨이포인트/사진 지점용 테이블입니다. MVP 필수는 아니지만 지도 상세 화면에서 POI로 쓸 수 있습니다.

### `course_quality_issues`

전처리 과정에서 발견한 문제를 남기는 테이블입니다.

예시:

- 위도/경도 swap 보정됨
- 한국 bbox 밖 좌표 발견
- 포인트 수 부족
- 계산 거리와 원본 거리 차이 과도
- 너무 짧은 코스
- LineString 생성 실패

`rejected` 코스는 `courses`에 넣지 않고 이 테이블에 원본 식별자와 `source_payload`만 남기는 것도 가능합니다.

### `course_favorites`

사용자 찜/저장 기능입니다.

주요 컬럼:

- `user_id`
- `course_id`
- `created_at`

### `runs`

사용자가 직접 기록한 러닝 세션입니다.

주요 컬럼:

- `user_id`
- `course_id`: 기존 코스를 따라 달렸다면 연결
- `distance_m`
- `duration_sec`
- `avg_pace_sec_per_km`
- `route`: 사용자가 실제로 달린 LineString
- `visibility`
- `created_course_id`: 이 러닝 기록을 코스로 전환했을 때 연결

### `run_points`

러닝 기록의 원본 GPS 포인트입니다. `runs.route`는 요약 LineString이고, 상세 재계산이나 리플레이가 필요하면 이 테이블을 사용합니다.

## 비글 데이터 매핑

비글 CSV는 다음 순서로 조인합니다.

```text
TB_TRKG_COURSE_INFO_M.COURS_IDNO
  -> TB_TRKG_COURSE_TRK_CONN_RLTN_R.CONN_COURS_IDNO
  -> TB_TRKG_COURSE_TRK_CONN_RLTN_R.CONN_TRK_IDNO
  -> TB_TRKG_TRK_INFO_D.TRK_IDNO
  -> TB_TRKG_TRK_PNT_NO1_L.PRNTS_TRK_IDNO
```

실제 컬럼명은 대문자입니다.

매핑:

| 비글 컬럼 | 적재 대상 |
| --- | --- |
| `COURS_IDNO` | `courses.source_course_id` |
| `TRK_IDNO` | `courses.source_track_id` |
| `COURS_NM` 또는 `TRK_NM` | `courses.name` |
| `COURS_DSCRT` | `courses.description` |
| `COURS_CTPRV_NM` | `courses.province` |
| `COURS_EMNDN_NM` | `courses.city` |
| `COURS_ARA_NM` | `courses.area_name` |
| `COURS_TOT_LNGTH` 또는 `TRK_LNGTH` | `courses.source_distance_m` |
| 재계산 거리 | `courses.distance_m` |
| `TRK_BGN_LCTN_LNGTD`, `TRK_BGN_LCTN_LTTD` | `courses.start_point` |
| `TRK_END_LCTN_LNGTD`, `TRK_END_LCTN_LTTD` | `courses.end_point` |
| `TRK_AVRG_GRDNT` | `courses.avg_slope_percent` |
| `TRK_TOP_HASLV` | `courses.max_elevation_m` |
| `TRK_LOWST_HASLV` | `courses.min_elevation_m` |
| `TRK_PNT_SRTNG_ORDR` | `course_points.seq` |
| `TRK_PNT_LNGTD`, `TRK_PNT_LTTD` | `course_points.lng`, `course_points.lat` |
| `TRK_PNT_HASLV` | `course_points.elevation_m` |
| `TRK_PNT_RCRD_DTM` | `course_points.recorded_at` |

## 전처리 판정 기준 초안

초기 기준입니다. 실제 지도 검수 후 조정합니다.

| 항목 | 기준 |
| --- | --- |
| 한국 bbox | 경도 124~132, 위도 33~39 |
| 최소 포인트 수 | 2개 이상, 권장 10개 이상 |
| 최소 거리 | 500m 이상 |
| 거리 필터 | 3km, 5km, 10km는 `distance_m` 범위로 처리 |
| 평지 | 평균 경사 낮고 고도 상승 적은 코스 |
| 언덕 | 고도 상승 또는 평균 경사가 높은 코스 |
| 트레일 | 원본 지역/태그/설명에 산, 숲, 둘레길, 트레일 성격이 강한 코스 |
| 깨진 코스 | 포인트 부족, 좌표 이상, LineString 실패, 거리 차이 과대 |

## 앱에서 쓸 대표 쿼리

주변 코스 조회는 RPC로 처리합니다.

```sql
select *
from public.nearby_courses(
  user_lat := 37.5665,
  user_lng := 126.9780,
  radius_m := 3000,
  min_distance_m := 2500,
  max_distance_m := 3500,
  difficulty_filter := null,
  limit_count := 30
);
```

코스 카드 목록은 `course_cards` 뷰를 사용할 수 있습니다.

```sql
select *
from public.course_cards
where distance_m between 4500 and 5500
order by distance_m;
```

## 실행 파일

초기 마이그레이션:

```text
supabase/migrations/20260625111000_initial_running_schema.sql
```

Supabase SQL Editor에 그대로 붙여넣거나, Supabase CLI를 세팅한 뒤 migration으로 실행합니다.

## 남은 결정 사항

- `difficulty` 판정 공식을 실제 데이터 분포 기반으로 조정해야 합니다.
- `3km`, `5km`, `10km` 필터를 정확히 `±500m`로 할지, `0~3km`, `3~5km`, `5~10km` 범위형으로 할지 정해야 합니다.
- 친구 기능을 넣을 때 `friendships`, `course_shares` 테이블을 추가할지 결정합니다.
- 공공 표준 데이터는 좌표가 부족하므로 MVP에서는 설명 데이터로만 둘지, 지오코딩 후 별도 적재할지 정해야 합니다.
