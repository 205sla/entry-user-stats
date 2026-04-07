# Ent2

엔트리([playentry.org](https://playentry.org)) 프로필 URL을 붙여넣으면 해당 유저의 작품 통계를 보여주는 Next.js 15 웹앱입니다.

## 기능

- 총 조회수 / 좋아요 / 댓글 / 사본 수 / 사용 블록 합계
- 작품 분류 분포 (스태프 선정 · 인기 작품 · 겹침 · 일반)
- 카테고리별 작품 수 및 집계
- 조회수 · 좋아요 기준 상위 10개 작품 (썸네일 툴팁)
- 연도별 작품 제작 수
- 가장 최근 수정한 작품 + 활동 일자 (상대 시간 표기)
- 가입일 기준 총 활동 기간

## 스택

- Next.js 15 (App Router, Server Components, SSR)
- React 19
- TypeScript
- Tailwind CSS
- Recharts

## 로컬 실행

```bash
npm install
npm run dev
```

Windows에서는 `run.bat` 더블클릭으로도 실행 가능합니다. 이후 <http://localhost:3000> 에 접속하세요.

## 주요 경로

- `/` — 홈 (프로필 URL 입력)
- `/u/[id]` — 통계 페이지 (SSR)
- `/api/stats?id=...` — JSON API

## 내부 구조

- `app/u/[id]/page.tsx` — 통계 페이지 렌더
- `app/api/stats/route.ts` — JSON API 핸들러
- `lib/entry-api.ts` — 엔트리 GraphQL 클라이언트 (CSRF 세션 캐시 포함)
- `lib/aggregate.ts` — 작품 리스트 → 통계 집계
- `lib/cache.ts` — in-memory TTL 캐시 (stats 30분 / CSRF 토큰 10분)
- `components/` — StatsView, StatCards, FlagsPieChart, CategoryChart, TopProjectsChart, YearBarChart 등

## 제한 사항

- 엔트리 API 호출 부담을 줄이기 위해 작품 페이지네이션을 **최대 4회 호출 (= 200개)** 로 제한합니다.
- 작품이 200개를 초과하는 유저는 상세 통계 집계를 생략하고, 헤더 정보 · 총 작품 수 · 총 활동 기간 · 가장 최근 활동 작품만 표시합니다 (후자는 별도 타겟 호출 1회 추가).
- 엔트리 GraphQL은 공식 공개 API가 아니므로 언제든 스키마 · 필드 · 필터 · 인증 방식이 변경될 수 있습니다.
- Vercel Hobby 티어의 함수 타임아웃(10초) 내에 응답해야 합니다. 작품 수가 매우 많은 truncated 유저는 여전히 여유가 있습니다.

## 안내

이 프로젝트는 **엔트리(playentry.org) 공식 서비스가 아니며, 엔트리와 아무런 제휴·연관이 없습니다.** 공개된 프로필 정보만 조회하며, 비영리 · 개인 열람 용도로 제작되었습니다.
