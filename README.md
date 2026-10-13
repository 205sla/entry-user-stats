# Ent2

[![CI](https://github.com/205sla/entry-user-stats/actions/workflows/ci.yml/badge.svg)](https://github.com/205sla/entry-user-stats/actions/workflows/ci.yml)

엔트리([playentry.org](https://playentry.org)) 프로필 URL을 붙여넣으면 해당 유저의 작품 통계를 보여주고, 검색된 유저들로 부문별 랭킹을 제공하는 Next.js 15 웹앱입니다.

**운영 사이트:** [유저찾기.엔트리.org](https://유저찾기.엔트리.org)

## 기능

- 메인 제목은 CSS 여백으로 `유저 찾기.엔트리.org`처럼 보이지만, 텍스트를 복사하면 공백 없는 `유저찾기.엔트리.org`가 됩니다.

### 유저 통계
- 엔트리 프로필 사진과 배경 사진을 활용한 유저 헤더 (사진이 없으면 기본 디자인 표시)
- 유저 헤더에서 엔트리 마이페이지·엔트리유저위키로 바로 이동 (새 탭)
- 지정한 유저에게만 추가 링크·소개 항목 표시 ([추가 정보 관리](#유저별-추가-정보-관리))
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

### 랭킹 (11개 부문)
- **총 조회수 / 좋아요 / 댓글 / 사본 / 사용 블록**
- **전체 공개 작품 수** (작품 300개 초과 유저도 포함)
- **총 활동 기간** (가입일 기반)
- **총 인기 작품 수 / 스태프 선정 작품 수**
- **팔로워 수 / 팔로잉 수** (프로필 기준, 작품 집계 한도와 무관)
- 사용자가 `/u/{id}` 로 검색하면 해당 유저의 통계가 자동으로 Firestore 에 등록됩니다 (1시간 dedupe).
- 팔로워·팔로잉 값이 없는 기존 유저는 다음 검색 때 등록됩니다. 전체 재수집이나 일괄 백필은 하지 않으며, 미수집 유저를 0명으로 랭킹에 넣지 않습니다. 실제 0명은 정상 수집 값입니다.
- 최근 1시간 이내 기록된 유저도 팔로워·팔로잉 값이 누락되어 있으면 검색 때 보완합니다.
- 원본 API에서 수치를 받지 못하면 `미수집`으로 표시하고 랭킹 필드를 만들지 않습니다. 기존에 확인한 수치는 보존합니다.
- 순위 배지는 랭킹에 저장된 수치를 기준으로 계산합니다. 처음 검색한 유저·부문은 백그라운드 등록이 끝난 뒤 다시 조회할 때부터 배지가 표시됩니다.
- 작품 집계 7개 부문은 작품 300개 초과 유저(부분 집계)를 제외합니다. 작품 수·활동 기간·팔로워·팔로잉 부문에는 포함합니다.
- 작품 수는 이미 저장된 `totalProjects`를 기준으로 정렬하며, 추가 수집이나 일괄 백필 없이 기존 유저도 참여합니다.
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
- `/ranking?type=likes` — 부문 직접 지정 (`views`, `likes`, `comments`, `clones`, `blocks`, `projects`, `activity`, `popular`, `staff`, `followers`, `following`)
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

## 유저별 추가 정보 관리

추가 정보가 있는 유저만 `lib/user-extra-info.ts`의 `USER_EXTRA_INFO`에 등록합니다.
키는 고정된 엔트리 유저 ID이며, `nickname`은 관리용 이름입니다. 닉네임이 바뀌어도
연결이 유지되고, 같은 닉네임을 쓰는 다른 계정에는 표시되지 않습니다.

| 필드 | 용도 | 표시 방식 |
| --- | --- | --- |
| `nickname` | 관리용 닉네임 | 실제 화면의 닉네임은 엔트리 조회 결과 사용 |
| `links` | `label`·`href` 목록 | 이름과 주소를 지정한 외부 링크 버튼 |
| `details` | `label`·`value` 목록 | 항목명과 일반 텍스트 내용 |

`links`와 `details`는 필요한 경우에만 넣습니다. 나무위키는 `links`의 한 항목이며,
유튜브·개인 사이트 등 다른 링크도 같은 구조로 추가할 수 있습니다. 소개·활동 등
사용자가 전달한 정보는 `details`에 넣습니다. 값은 HTML이 아닌 일반 텍스트로 표시합니다.

등록 예시(아래 이름·주소·내용은 설명용이며 실제 유저 정보가 아닙니다):

```ts
"확인한 엔트리 유저 ID": {
  nickname: "관리용 닉네임",
  links: [{ label: "개인 사이트", href: "https://example.com" }],
  details: [{ label: "소개", value: "사용자가 전달한 소개 내용" }],
},
```

공통 링크 생성은 `lib/user-external-links.ts`에서 처리합니다.

| 링크 | 표시 대상 | 주소 기준 |
| --- | --- | --- |
| 마이페이지 바로가기 | 모든 유저 | `https://playentry.org/profile/{유저 ID}` |
| 엔트리유저위키에서 보기 | 모든 유저 | `https://entrywiki.org/w/{닉네임}` |
| 추가 외부 링크 | `USER_EXTRA_INFO`에 `links`가 등록된 유저 | 각 항목의 `label`과 `href` |

엔트리유저위키는 닉네임을 URL 경로로 인코딩해 연결합니다. 문서 유무를 검사하거나
존재 여부를 별도로 저장하지 않습니다. 공백·`#`·`?`·`/`가 포함된 닉네임도 링크의
쿼리나 앵커로 해석되지 않도록 처리합니다. 모든 링크는 새 탭으로 열립니다.

추가 정보는 코드에 있는 작은 정적 목록이며 Firestore 필드나 컬렉션을 추가하지 않습니다.
대상이 아닌 유저에게 빈 문서·빈 필드를 만들지 않으며, 이 기능 때문에 DB 읽기·쓰기나
외부 위키 요청이 늘어나지 않습니다.
현재는 205님의 나무위키 링크만 등록돼 있습니다. 그 외 추가 정보는 전달받은 뒤 등록합니다.
작품 300개 초과로 상세 통계가 생략되는 유저도 같은 헤더를 사용하므로 링크와 추가 정보가 표시됩니다.

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

작품 수·팔로워·팔로잉 쿼리는 Firestore의 단일 필드 자동 인덱스를 사용합니다.
정렬 필드가 없거나 `null`인 문서는 제외하고 실제 0부터 조회합니다. 팔로워·팔로잉 값이
없는 기존 유저는 다음 검색으로 해당 필드가 저장된 이후부터 랭킹에 포함됩니다. 새 composite 인덱스는 필요 없습니다.
작품 수는 기존에 저장된 전체 공개 작품 수를 사용하므로 재검색 없이 바로 랭킹에 포함됩니다.

## 검색엔진 노출 (SEO)

- 홈의 제목·설명과 `WebSite` 구조화 데이터에 서비스명, 닉네임 검색, 작품 통계, 랭킹을 명시합니다.
- 11개 랭킹 부문마다 제목·설명·canonical·Open Graph·Twitter 메타데이터를 제공합니다.
- canonical은 선택한 부문을 보존하되 유저 강조용 `user` 및 그 외 쿼리 파라미터는 제외합니다.
- `sitemap.xml`에는 홈과 11개 부문 주소만 포함하며, 홈에서 각 부문으로 이동할 수 있습니다.
- 개인 유저 통계와 닉네임 공유 주소는 기존대로 `noindex`를 유지합니다.
- 공통 메타데이터는 `lib/site-metadata.ts`, 공개 서비스 주소는 `lib/share-url.ts`에서 관리합니다.

## Firebase 셋업

랭킹을 사용하려면 Firebase 프로젝트와 Firestore 가 필요합니다.

1. **프로젝트 생성** — <https://console.firebase.google.com>
2. **Firestore Database 활성화** — 위치 `asia-northeast3` (Seoul) 권장, 프로덕션 모드
3. **서비스 계정 키 발급** — 프로젝트 설정 → 서비스 계정 → 새 비공개 키 생성 → JSON 다운로드. JSON 의 3개 필드를 환경 변수로 등록 (위 `.env.local` 참고)
4. **보안 규칙** — 서버 SDK만 사용합니다. 저장소의 `firestore.rules`가 브라우저
   직접 접근을 모두 차단하며 `firebase deploy --only firestore:rules`로 배포합니다.
5. **인덱스** — 작품 집계 7개 부문 쿼리는 composite 인덱스가 필요합니다. 작품 수·활동 기간·팔로워·팔로잉은 자동 인덱스를 사용합니다. 두 가지 방법:
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
- 300개 초과 유저는 부분 집계라 작품 집계 랭킹에서 제외됩니다 (`truncated` 플래그). 작품 수·활동 기간·팔로워·팔로잉 랭킹에는 포함됩니다.
- 엔트리 GraphQL은 공식 공개 API가 아니므로 언제든 스키마 · 필드 · 필터 · 인증 방식이 변경될 수 있습니다.
- 외부 엔트리 요청마다 4.5초 타임아웃을 적용하며, Vercel 함수 최대 실행 시간은 30초로 설정합니다.
- `lib/rate-limit.ts` 의 IP 당 분당 3회 제한은 인스턴스 메모리 기반이라 cold start 시 초기화됩니다 (best-effort).
- 강한 분산 요청 제한이 필요하면 Redis/KV 기반 저장소로 교체해야 합니다.

## 프라이버시

- `/u/{id}` 검색 시 해당 유저의 통계가 자동으로 랭킹에 등록됩니다. 별도 동의 절차는 없습니다.
- 메인 페이지와 `/ranking` 페이지에 자동 등록 안내 문구가 표시됩니다.
- `/u/{id}`와 `/l/{nickname}`는 페이지 메타데이터의 `noindex`로 검색 노출을 막습니다. 크롤러가 이 지시를 읽을 수 있도록 `robots.txt`에서는 차단하지 않습니다.
- `/ranking` 은 공개 노출이 목적이므로 인덱싱을 허용합니다.

## 변경 기록

### 2026-10-13 — 유저 정보 외부 링크·범용 추가 정보

- 유저 헤더에 **마이페이지 바로가기**, **엔트리유저위키에서 보기**를 추가했습니다.
- 엔트리유저위키는 문서 존재 여부와 관계없이 현재 닉네임으로 연결합니다. 외부 문서 확인 API나 데이터베이스 필드는 추가하지 않습니다.
- 추가 정보가 있는 유저만 등록하는 ID 기반 `USER_EXTRA_INFO`를 도입했습니다. 여러 링크와 항목명·내용을 저장할 수 있으며 나무위키 전용 필드나 DB는 없습니다.
- 205님(`56136825dadc91e1235b460d`)의 추가 링크에 전달받은 나무위키 `이영호(2003)` 문서를 등록했습니다.
- 데이터 형식과 관리 방법은 [유저별 추가 정보 관리](#유저별-추가-정보-관리)에 정리했습니다.
- 배포 전 ESLint·TypeScript·기존 테스트 40개·프로덕션 빌드가 통과했습니다. 브라우저에서 205님의 링크 3개 주소와 새 탭 속성, 명단에 없는 300개 초과 유저의 링크 2개, 모바일에서 가로 넘침 없는 배치를 확인했습니다.

### 2026-10-13 — 제목 주소 복사 수정·작품 수 랭킹 추가

메인 제목을 복사하면 `유저 찾기.엔트리.org`의 공백 때문에 주소로 연결되지 않는 문제를 수정했습니다.
`유저`와 `찾기` 사이의 실제 공백을 없애고 `span`의 `margin-left: 0.25em`으로 간격을 표현합니다.
별도 복사 이벤트나 숨은 문자를 넣지 않으므로 일반적인 텍스트 선택·복사로 `유저찾기.엔트리.org`를 얻습니다.

`/ranking?type=projects`에 **작품 수** 부문을 추가했습니다.

- Firestore에 이미 저장된 `totalProjects`를 내림차순 정렬합니다. 가져온 작품 목록의 길이인 `totals.projects`와 구분합니다.
- 전체 작품 수는 엔트리 API의 목록 `total` 값이므로 상세 집계 한도인 300개를 초과한 유저도 참여합니다.
- 작품 수가 없거나 `null`이면 제외하고, 실제 0개는 포함합니다. 같은 작품 수는 같은 순위입니다.
- 홈·랭킹 탭, 유저 순위 배지, 부문별 공유 링크, 메타데이터·사이트맵까지 11개 부문으로 연결했습니다.
- 추가 엔트리 API 호출, 전체 재수집, 데이터 백필, 새 Firestore 복합 인덱스 배포는 필요하지 않습니다.

배포 전 검증:

- ESLint와 TypeScript 검사 통과, Vitest 4개 파일·40개 테스트 통과, Next.js 프로덕션 빌드 통과.
- 실제 브라우저에서 제목의 표시 간격과 복사 문자열을 확인했습니다.
- 저장된 실제 데이터로 작품 수 내림차순 표시와 300개 초과 유저 포함을 확인했습니다.
- PC와 좁은 모바일 화면에서 제목·랭킹 탭·표가 가로로 넘치지 않는 것을 확인했습니다.

운영 배포 확인 (2026-10-13):

- 기능 배포 커밋: [`e3791f8`](https://github.com/205sla/entry-user-stats/commit/e3791f8f758d281961dd6d825bf97204fd9fb31e). `main` 푸시로 배포했습니다.
- [GitHub Actions CI #38388857427](https://github.com/205sla/entry-user-stats/actions/runs/38388857427)의 설치·린트·타입 검사·테스트·빌드가 모두 성공했습니다.
- [Vercel Production 배포](https://vercel.com/205slas-projects/entry-user-stats/7pUSbacDrakppi9mDWjDehs7z8Tk)가 `success` 상태로 완료됐습니다.
- [운영 홈](https://유저찾기.엔트리.org)에서 제목을 직접 선택·복사해 주소 내부 공백이 없는 것을 확인했습니다.
- [운영 작품 수 랭킹](https://유저찾기.엔트리.org/ranking?type=projects)에서 첫 20행의 내림차순 정렬, 작품 300개 초과 유저 포함, `개` 단위 표시를 확인했습니다.

## 안내

이 프로젝트는 **엔트리(playentry.org) 공식 서비스가 아니며, 엔트리와 아무런 제휴·연관이 없습니다.** 공개된 프로필 정보만 조회하며, 비영리 · 개인 열람 용도로 제작되었습니다.

원작: [gnlow/Ent2ml](https://github.com/gnlow/Ent2ml) — 본 프로젝트는 위 작품을 참고해 Next.js로 재구성한 비공식 클론입니다.
