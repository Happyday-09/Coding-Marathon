# Coding-Marathon# 🏃 러닝 앱 기술 스택 & 개발 계획

> 작성일: 2026년 6월 25일  
> 개발 기간: 무박 2일  
> 팀 인원: 3명

---

## 1. 최종 확정 스택

| 분류 | 기술 | 선택 이유 |
|------|------|----------|
| **Frontend** | React Native + Expo (TypeScript) | 빠른 세팅, Expo Go로 즉시 테스트, JS 기반 |
| **Backend** | Node.js + Express | 가장 대중적, 자료 풍부, 빠른 개발 |
| **Database** | Supabase (PostgreSQL) | SQL 기반 강력한 쿼리, Realtime 지원 |
| **Auth** | Supabase Auth | 소셜 로그인 빠르게 구현 가능 |
| **AI** | Claude API | 코스 추천 / 퍼스널 코칭 |
| **지도** | React Native Maps + Kakao Map API | 한국 지도 최적화 |
| **스타일** | NativeWind (Tailwind RN 버전) | 빠른 UI 개발 |
| **서버 배포** | Railway 또는 Render | Express 서버 무료 배포 |
| **앱 배포** | Expo Go | 무박 2일 데모용 |

---

## 2. 시스템 아키텍처

```
[React Native App (Expo)]
          ↕ REST API
[Node.js + Express 서버]
          ↕                    ↕
[Supabase DB]           [Claude API]
(기록, 유저, 코스)       (AI 코스 추천 / 코칭)
          ↕
[Kakao Map API]
(코스 지도 표시)
```

---

## 3. 핵심 패키지

### Frontend (React Native + Expo)

```bash
npx create-expo-app frontend --template blank-typescript
cd frontend

npx expo install expo-location          # GPS 트래킹
npx expo install expo-task-manager      # 백그라운드 위치
npx expo install react-native-maps      # 지도
npm install @supabase/supabase-js       # Supabase 연동
npm install nativewind                  # 스타일링
npm install @react-navigation/native    # 네비게이션
npm install @react-navigation/stack
npm install axios                       # API 통신
```

### Backend (Node.js + Express)

```bash
mkdir backend && cd backend
npm init -y

npm install express
npm install @supabase/supabase-js       # Supabase 연동
npm install @anthropic-ai/sdk           # Claude API
npm install dotenv cors helmet          # 환경변수 / 보안
npm install -D typescript ts-node nodemon
```

---

## 4. Supabase DB 테이블 설계

### users (유저)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid | Primary Key |
| email | text | 이메일 |
| nickname | text | 닉네임 |
| level | text | 초보 / 중급 / 고급 |
| created_at | timestamp | 가입일 |

### runs (러닝 기록)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid | Primary Key |
| user_id | uuid | FK → users |
| distance | float | 거리 (km) |
| duration | int | 시간 (초) |
| pace | float | 평균 페이스 |
| route | jsonb | GPS 좌표 배열 |
| created_at | timestamp | 러닝 날짜 |

### courses (추천 코스)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid | Primary Key |
| name | text | 코스 이름 |
| location | text | 지역 |
| distance | float | 거리 (km) |
| difficulty | text | 난이도 |
| coordinates | jsonb | 경로 좌표 |

### battles (친구 대결)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid | Primary Key |
| challenger_id | uuid | FK → users |
| opponent_id | uuid | FK → users |
| status | text | pending / active / done |
| target_distance | float | 목표 거리 |
| created_at | timestamp | 대결 생성일 |

---

## 5. 3명 역할 분담

| 역할 | 담당자 | 담당 업무 |
|------|--------|----------|
| **프론트 A** | - | GPS 트래킹 화면, 지도 연동, 러닝 중 실시간 UI |
| **프론트 B** | - | 로그인/회원가입, 기록 히스토리, AI 추천 결과 UI |
| **백엔드** | - | Express 서버 구축, Supabase 연동, Claude API 코스 추천 로직 |

---

## 6. 무박 2일 타임라인

| 시간 | 프론트 A | 프론트 B | 백엔드 |
|------|---------|---------|--------|
| **0~2h** | Expo 세팅 + 공통 컴포넌트 구조 | Expo 세팅 + 네비게이션 설정 | Supabase 프로젝트 생성 + DB 테이블 설계 |
| **2~8h** | GPS 트래킹 + 카카오맵 연동 | 로그인 / 회원가입 화면 | Express 서버 기본 구조 + Auth API |
| **8~16h** | 러닝 중 실시간 UI (거리/페이스/시간) | 러닝 기록 히스토리 화면 | Claude API 코스 추천 로직 구현 |
| **16~24h** | AI 추천 코스 지도 표시 | AI 추천 결과 UI 화면 | Realtime 친구 대결 기능 |
| **24~40h** | 버그 수정 + UI 다듬기 | 버그 수정 + UI 다듬기 | 서버 배포 (Railway) + 연동 테스트 |
| **40~48h** | 발표 데모 준비 | 발표 자료 작성 | 최종 배포 + 안정화 |

---

## 7. 개발 우선순위

무박 2일 특성상 범위를 좁혀야 합니다.

```
✅ 1순위 (필수 구현)
  - GPS 러닝 트래킹 (거리, 시간, 페이스)
  - 러닝 기록 저장 및 히스토리
  - 로그인 / 회원가입

✅ 2순위 (핵심 차별점)
  - AI 코스 추천 (Claude API)

🔺 3순위 (시간 되면)
  - 친구 대결 UI

❌ 포기 (다음 버전)
  - 스케줄 공유
  - 워치 연동
  - 상세 통계
```

---

## 8. 환경변수 (.env)

```env
# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key

# Claude API
ANTHROPIC_API_KEY=your_claude_api_key

# Kakao Map
KAKAO_MAP_API_KEY=your_kakao_api_key

# Server
PORT=3000
```

---

*무박 2일 MVP 완성 후 Flutter 전환 및 기능 고도화 예정*