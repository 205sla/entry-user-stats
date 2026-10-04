# Ent2

[![CI](https://github.com/205sla/entry-user-stats/actions/workflows/ci.yml/badge.svg)](https://github.com/205sla/entry-user-stats/actions/workflows/ci.yml)

엔트리([playentry.org](https://playentry.org)) 프로필 URL을 붙여넣으면 해당 유저의 작품 통계를 보여주고, 검색된 유저들로 부문별 랭킹을 제공하는 Next.js 15 웹앱입니다.

**운영 사이트:** [유저찾기.엔트리.org](https://유저찾기.엔트리.org)

## 기능

### 유저 통계
- 엔트리 프로필 사진과 배경 사진을 활용한 유저 헤더 (사진이 없으면 기본 디자인 표시)
- 총 조회수 / 좋아요 / 댓글 / 사본 수 / 사용 블록 합계
- 작품 분류 분포 (스태프 선정 · 인기 작품 · 겹침 · 일반)
- 카테고리별 작품 수 및 집계
- 조회수 · 좋아요 기준 상위 10개 작품 (썸네일 툴팁)
- 연도별 작품 제작 수
- 가장 최근 수정한 작품 + 활동 일자 (상대 시간 표기)
- 가입일 기준 총 활동 기간
- 닉네임 공유 주소 복사 (`https://유저찾기.엔트리.org/l/닉네임`)
- 유저의 랭킹 배지를 누르면 해당 부문에서 유저 행으로 자동 이동
- 닉네임·초성·한/영 키보드 오타 자동완성 (서버 검색 API)

### 랭킹 (10개 부문)
- **총 조회수 / 좋아요 / 댓글 / 사본 / 사용 블록**
- **총 활동 기간** (가입일 기반)
- **총 인기 작품 수 / 스태프 선정 작품 수**
- **팔로워 수 / 팔로잉 수** (프로필 기준, 작품 집계 한도와 무관)
- 사용자가 `/u/{id}` 로 검색하면 해당 유저의 통계가 자동으로 Firestore 에 등록됩니다 (1시간 dedupe).
- 팔로워·팔로잉 값이 없는 기존 유저는 다음 검색 때 등록됩니다. 전체 재수집이나 일괄 백필은 하지 않으며, 미수집 유저를 0명으로 랭킹에 넣지 않습니다. 실제 0명은 정상 수집 값입니다.
- 최근 1시간 이내 기록된 유저도 팔로워·팔로잉 값이 누락되어 있으면 검색 때 보완합니다.
- 원본 API에서 수치를 받지 못하면 `미수집`으로 표시하고 랭킹 필드를 만들지 않습니다. 기존에 확인한 수치는 보존합니다.
- 순위 배지는 랭킹에 저장된 수치를 기준으로 계산합니다. 처음 검색한 유저·부문은 백그라운드 등록이 끝난 뒤 다시 조회할 때부터 배지가 표시됩니다.
- 작품 집계 7개 부문은 작품 300개 초과 유저(부분 집계)를 제외합니다. 활동 기간·팔로워·팔로잉 부문에는 포함합니다.
- 현재 선택한 랭킹 부문 주소를 버튼 한 번으로 복사할 수 있습니다.

## 스택

- Next.js 15 (App Router, Server Components, SSR, ISR, `after()`)
- React 19
- TypeScript
- Tailwind CSS
- Recharts
- Google Cloud Firestore 서버 SDK (랭킹 영구 저장)

## 로컬 실행

```bash
npm install
npm run dev
```

Node.js 22 이상이 필요합니다. 배포 전에는 `npm run check`와 `npm run build`를 실행하세요.

Windows에서는 `run.bat` 더블클릭으로도 실행 가능합니다. 이후 <http://localhost:3000> 에 접속하세요.

## 배포

`main` 브랜치에 변경사항을 올리면 GitHub Actions가 린트·타입 검사·테스트·빌드를 검증하고, Vercel이 프로덕션에 자동 배포합니다.

- 기본 주소: [유저찾기.엔트리.org](https://유저찾기.엔트리.org)
- Vercel 주소: [entry-user-stats.vercel.app](https://entry-user-stats.vercel.app)

## 환경 변수 (`.env.local`)

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
- `/ranking?type=likes` — 부문 직접 지정 (`views`, `likes`, `comments`, `clones`, `blocks`, `activity`, `popular`, `staff`, `followers`, `following`)
- `/u/[id]` — 통계 페이지 (SSR)
- `/l/[nickname]` — 읽기 쉬운 공유 주소. 닉네임 인덱스에서 ID를 찾아 통계 페이지로 연결
- `/api/stats?id=...` — JSON API
- `/api/users/search?q=...` — 닉네임 자동완성 API (최대 8건)

## 내부 구조

### 통계
- `app/u/[id]/page.tsx` — 통계 페이지 렌더
- `app/api/stats/route.ts` — JSON API 핸들러
- `lib/stats-service.ts` — 페이지/API 공통 통계 조회 (30분 공유 Data Cache + 메모리 캐시 + 요청 합치기)
- `lib/entry-api.ts` — 엔트리 GraphQL 클라이언트 (CSRF 세션 캐시 포함)
- `lib/aggregate.ts` — 작품 리스트 → 통계 집계
- `lib/cache.ts` — warm 인스턴스용 보조 in-memory TTL 캐시
- `lib/extract-id.ts` — URL → 유저 ID 추출
- `lib/rate-limit.ts` — bounded IP fixed-window 제한 (통계 3회/분, 자동완성 30회/분; best-effort)

### 랭킹
- `app/ranking/page.tsx` — 랭킹 페이지 (탭 + Suspense)
- `lib/firebase.ts` — Firestore 서버 SDK 싱글톤 (lazy 초기화)
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
                                        (1시간 이내 재기록 skip, 신규 항목 누락은 보완)
```

랭킹 쿼리 자체를 Next.js 공유 Data Cache에 60초 저장하므로, 쿼리스트링으로 탭을
선택하는 동적 페이지에서도 Firestore read를 반복하지 않습니다. 랭킹 기록이 바뀌면
관련 캐시 태그를 즉시 무효화합니다.

통계 메모리 캐시로 응답하는 재검색에서도 백그라운드 기록을 시도하므로 이전 저장
실패를 다음 검색 때 재시도할 수 있습니다. 엔트리 API를 추가 호출하지 않고 이미
조회한 프로필의 팔로워·팔로잉 수를 사용합니다. 수치는 실시간이 아닌 마지막 검색
기준이며, 통계 캐시는 30분, 기존 랭킹 값의 기록 간격은 1시간입니다.

동시 기록은 유저별로 합치고, Firestore 트랜잭션에서 기록 간격 검사와 랭킹·닉네임
인덱스 저장을 함께 처리합니다. 한쪽 저장만 성공하는 상태가 생기지 않으며 실패하면
다음 검색에서 다시 시도합니다. 이전 버전에서 인덱스가 누락된 문서도 재검색 때 복구합니다.
1시간 안에 누락된 수치를 보완할 때는 기존 수치와 기록 시각을 덮어쓰지 않습니다.

팔로워·팔로잉 쿼리는 Firestore의 단일 필드 자동 인덱스를 사용합니다.
정렬 필드가 없거나 `null`인 문서는 제외하고 실제 0명부터 조회하므로, 기존 유저는
검색으로 해당 필드가 저장된 이후부터 자연스럽게 랭킹에 포함됩니다. 새 composite 인덱스는 필요 없습니다.

## 검색엔진 노출 (SEO)

- 홈의 제목·설명과 `WebSite` 구조화 데이터에 서비스명, 닉네임 검색, 작품 통계, 랭킹을 명시합니다.
- 10개 랭킹 부문마다 제목·설명·canonical·Open Graph·Twitter 메타데이터를 제공합니다.
- canonical은 선택한 부문을 보존하되 유저 강조용 `user` 및 그 외 쿼리 파라미터는 제외합니다.
- `sitemap.xml`에는 홈과 10개 부문 주소만 포함하며, 홈에서 각 부문으로 이동할 수 있습니다.
- 개인 유저 통계와 닉네임 공유 주소는 기존대로 `noindex`를 유지합니다.
- 공통 메타데이터는 `lib/site-metadata.ts`, 공개 서비스 주소는 `lib/share-url.ts`에서 관리합니다.

## Firebase 셋업

랭킹을 사용하려면 Firebase 프로젝트와 Firestore 가 필요합니다.

1. **프로젝트 생성** — <https://console.firebase.google.com>
2. **Firestore Database 활성화** — 위치 `asia-northeast3` (Seoul) 권장, 프로덕션 모드
3. **서비스 계정 키 발급** — 프로젝트 설정 → 서비스 계정 → 새 비공개 키 생성 → JSON 다운로드. JSON 의 3개 필드를 환경 변수로 등록 (위 `.env.local` 참고)
4. **보안 규칙** — 서버 SDK만 사용합니다. 저장소의 `firestore.rules`가 브라우저
   직접 접근을 모두 차단하며 `firebase deploy --only firestore:rules`로 배포합니다.
5. **인덱스** — 작품 집계 7개 부문 쿼리는 composite 인덱스가 필요합니다. 활동 기간·팔로워·팔로잉은 자동 인덱스를 사용합니다. 두 가지 방법:
   - **자동**: 첫 쿼리 실패 시 콘솔 에러에 포함된 링크를 클릭하면 한 번에 생성됩니다 (탭마다 한 번씩)
   - **일괄 배포**: `firebase deploy --only firestore:indexes` (저장소 루트의 `firestore.indexes.json` 사용)

## 비용 견적 (Firestore Spark / 무료)

| 지표 | 한도 | 예상 사용량 (검색 100/일 + 랭킹뷰 50/일) |
|---|---|---|
| Reads/일 | 50,000 | ~1,500 (3%) |
| Writes/일 | 20,000 | ~100 (0.5%) |
| Storage | 1 GiB | doc 당 ~250B → 5만 유저 = 12 MB (1%) |
| Composite indexes | 200 | 14 (7%, 작품 집계 7개 부문의 ASC/DESC) |

트래픽이 30배 늘어도 무료 한도 내 유지 가능합니다.

## 제한 사항

- 엔트리 API 호출 부담을 줄이기 위해 작품 페이지네이션을 **최대 6회 호출 (= 300개)** 로 제한합니다. 300개 초과가 첫 페이지에서 확인되면 나머지 5개 페이지는 요청하지 않습니다.
- 작품이 300개를 초과하는 유저는 상세 통계 집계를 생략하고, 헤더 정보 · 총 작품 수 · 총 활동 기간 · 가장 최근 활동 작품만 표시합니다 (최근 작품 타겟 호출 1회 추가).
- 300개 초과 유저는 부분 집계라 작품 집계 랭킹에서 제외됩니다 (`truncated` 플래그). 활동 기간·팔로워·팔로잉 랭킹에는 포함됩니다.
- 엔트리 GraphQL은 공식 공개 API가 아니므로 언제든 스키마 · 필드 · 필터 · 인증 방식이 변경될 수 있습니다.
- 외부 엔트리 요청마다 4.5초 타임아웃을 적용하며, Vercel 함수 최대 실행 시간은 30초로 설정합니다.
- `lib/rate-limit.ts` 의 IP 당 분당 3회 제한은 인스턴스 메모리 기반이라 cold start 시 초기화됩니다 (best-effort).
- 강한 분산 요청 제한이 필요하면 Redis/KV 기반 저장소로 교체해야 합니다.

## 프라이버시

- `/u/{id}` 검색 시 해당 유저의 통계가 자동으로 랭킹에 등록됩니다. 별도 동의 절차는 없습니다.
- 메인 페이지와 `/ranking` 페이지에 자동 등록 안내 문구가 표시됩니다.
- `/u/{id}`와 `/l/{nickname}`는 페이지 메타데이터의 `noindex`로 검색 노출을 막습니다. 크롤러가 이 지시를 읽을 수 있도록 `robots.txt`에서는 차단하지 않습니다.
- `/ranking` 은 공개 노출이 목적이므로 인덱싱을 허용합니다.

## 안내

이 프로젝트는 **엔트리(playentry.org) 공식 서비스가 아니며, 엔트리와 아무런 제휴·연관이 없습니다.** 공개된 프로필 정보만 조회하며, 비영리 · 개인 열람 용도로 제작되었습니다.

원작: [gnlow/Ent2ml](https://github.com/gnlow/Ent2ml) — 본 프로젝트는 위 작품을 참고해 Next.js로 재구성한 비공식 클론입니다.
