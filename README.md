# Ent2

엔트리([playentry.org](https://playentry.org)) 프로필 URL을 붙여넣으면 해당 유저의 작품 통계를 보여주고, 검색된 유저들로 부문별 랭킹을 제공하는 Next.js 15 웹앱입니다.

## 기능

### 유저 통계
- 총 조회수 / 좋아요 / 댓글 / 사본 수 / 사용 블록 합계
- 작품 분류 분포 (스태프 선정 · 인기 작품 · 겹침 · 일반)
- 카테고리별 작품 수 및 집계
- 조회수 · 좋아요 기준 상위 10개 작품 (썸네일 툴팁)
- 연도별 작품 제작 수
- 가장 최근 수정한 작품 + 활동 일자 (상대 시간 표기)
- 가입일 기준 총 활동 기간

### 랭킹 (8개 부문)
- **총 조회수 / 좋아요 / 댓글 / 사본 / 사용 블록**
- **총 활동 기간** (가입일 기반)
- **총 인기 작품 수 / 스태프 선정 작품 수**
- 사용자가 `/u/{id}` 로 검색하면 해당 유저의 통계가 자동으로 Firestore 에 등록됩니다 (1시간 dedupe).
- 활동 기간 외 7개 부문은 작품 300개 초과 유저(부분 집계)를 제외합니다.

## 스택

- Next.js 15 (App Router, Server Components, SSR, ISR, `after()`)
- React 19
- TypeScript
- Tailwind CSS
- Recharts
- Firebase Admin SDK (Firestore — 랭킹 영구 저장)

## 로컬 실행

```bash
npm install
npm run dev
```

Windows에서는 `run.bat` 더블클릭으로도 실행 가능합니다. 이후 <http://localhost:3000> 에 접속하세요.

### 환경 변수 (`.env.local`)

랭킹 기능을 사용하려면 Firebase 서비스 계정 자격 증명이 필요합니다. 통계 페이지만 사용한다면 비워두어도 동작하며, 검색 시 백그라운드 기록만 실패합니다.

```
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

> `FIREBASE_PRIVATE_KEY` 의 개행은 literal `\n` 문자열로 저장하세요. 코드(`lib/firebase.ts`) 가 런타임에 실제 개행으로 치환합니다.

## 주요 경로

- `/` — 홈 (프로필 URL 입력)
- `/ranking` — 랭킹 페이지 (탭으로 부문 전환, ISR 60초)
- `/ranking?type=likes` — 부문 직접 지정 (`views`, `likes`, `comments`, `clones`, `blocks`, `activity`, `popular`, `staff`)
- `/u/[id]` — 통계 페이지 (SSR)
- `/api/stats?id=...` — JSON API

## 내부 구조

### 통계
- `app/u/[id]/page.tsx` — 통계 페이지 렌더
- `app/api/stats/route.ts` — JSON API 핸들러
- `lib/stats-service.ts` — 페이지/API 공통 통계 조회 (캐시 + 백그라운드 랭킹 기록)
- `lib/entry-api.ts` — 엔트리 GraphQL 클라이언트 (CSRF 세션 캐시 포함)
- `lib/aggregate.ts` — 작품 리스트 → 통계 집계
- `lib/cache.ts` — in-memory TTL 캐시 (stats 30분 / CSRF 토큰 10분)
- `lib/extract-id.ts` — URL → 유저 ID 추출
- `lib/rate-limit.ts` — IP 당 분당 3회 fixed-window 제한 (best-effort)

### 랭킹
- `app/ranking/page.tsx` — 랭킹 페이지 (탭 + Suspense + ISR)
- `lib/firebase.ts` — Firebase Admin SDK 싱글톤 (lazy 초기화)
- `lib/ranking.ts` — `recordRanking(stats)` / `getRanking(type, limit)`
- `components/RankingTable.tsx` — 순위 테이블 컴포넌트
- `firestore.indexes.json` — composite 인덱스 정의 (배포용)

### UI 컴포넌트
- `components/` — StatsView, StatCards, FlagsPieChart, CategoryChart, TopProjectsChart, YearBarChart, UrlForm, RankingTable

## 랭킹 동작 흐름

```
[사용자가 /u/{id} 검색]
        ↓
  getStatsForUser(id)
        ↓
  통계 페이지 응답 전송
        ↓
  after(() => recordRanking(stats))   ← 백그라운드 Firestore 쓰기
                                        (1시간 이내 재기록 skip)
```

랭킹 페이지는 60초 ISR 캐시로 재방문 시 Firestore read 를 절약합니다.

## Firebase 셋업

랭킹을 사용하려면 Firebase 프로젝트와 Firestore 가 필요합니다.

1. **프로젝트 생성** — <https://console.firebase.google.com>
2. **Firestore Database 활성화** — 위치 `asia-northeast3` (Seoul) 권장, 프로덕션 모드
3. **서비스 계정 키 발급** — 프로젝트 설정 → 서비스 계정 → 새 비공개 키 생성 → JSON 다운로드. JSON 의 3개 필드를 환경 변수로 등록 (위 `.env.local` 참고)
4. **보안 규칙** — Admin SDK 만 사용하므로 클라이언트 직접 접근은 차단해 두세요:
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /{document=**} { allow read, write: if false; }
     }
   }
   ```
5. **인덱스** — 활동 기간 외 7개 부문 쿼리는 composite 인덱스가 필요합니다. 두 가지 방법:
   - **자동**: 첫 쿼리 실패 시 콘솔 에러에 포함된 링크를 클릭하면 한 번에 생성됩니다 (탭마다 한 번씩)
   - **일괄 배포**: `firebase deploy --only firestore:indexes` (저장소 루트의 `firestore.indexes.json` 사용)

## 비용 견적 (Firestore Spark / 무료)

| 지표 | 한도 | 예상 사용량 (검색 100/일 + 랭킹뷰 50/일) |
|---|---|---|
| Reads/일 | 50,000 | ~1,500 (3%) |
| Writes/일 | 20,000 | ~100 (0.5%) |
| Storage | 1 GiB | doc 당 ~250B → 5만 유저 = 12 MB (1%) |
| Composite indexes | 200 | 7 (3.5%) |

트래픽이 30배 늘어도 무료 한도 내 유지 가능합니다.

## 제한 사항

- 엔트리 API 호출 부담을 줄이기 위해 작품 페이지네이션을 **최대 6회 호출 (= 300개)** 로 제한합니다.
- 작품이 300개를 초과하는 유저는 상세 통계 집계를 생략하고, 헤더 정보 · 총 작품 수 · 총 활동 기간 · 가장 최근 활동 작품만 표시합니다 (후자는 별도 타겟 호출 1회 추가).
- 300개 초과 유저는 부분 집계라 활동 기간 랭킹 외에서는 제외됩니다 (`truncated` 플래그).
- 엔트리 GraphQL은 공식 공개 API가 아니므로 언제든 스키마 · 필드 · 필터 · 인증 방식이 변경될 수 있습니다.
- Vercel Hobby 티어의 함수 타임아웃(10초) 내에 응답해야 합니다. 작품 수가 매우 많은 truncated 유저는 여전히 여유가 있습니다.
- `lib/rate-limit.ts` 의 IP 당 분당 3회 제한은 인스턴스 메모리 기반이라 cold start 시 초기화됩니다 (best-effort).
- `lib/cache.ts` 도 in-memory 라 인스턴스 간 공유되지 않습니다 (랭킹 저장소만 영구).

## 프라이버시

- `/u/{id}` 검색 시 해당 유저의 통계가 자동으로 랭킹에 등록됩니다. 별도 동의 절차는 없습니다.
- 메인 페이지와 `/ranking` 페이지에 자동 등록 안내 문구가 표시됩니다.
- `/u/{id}` 는 `robots.txt` 에서 disallow 처리되어 검색 엔진 인덱싱을 막습니다.
- `/ranking` 은 공개 노출이 목적이므로 인덱싱을 허용합니다.

## 안내

이 프로젝트는 **엔트리(playentry.org) 공식 서비스가 아니며, 엔트리와 아무런 제휴·연관이 없습니다.** 공개된 프로필 정보만 조회하며, 비영리 · 개인 열람 용도로 제작되었습니다.

원작: [gnlow/Ent2ml](https://github.com/gnlow/Ent2ml) — 본 프로젝트는 위 작품을 참고해 Next.js로 재구성한 비공식 클론입니다.
