import Link from "next/link"

export const metadata = {
  title: "랭킹 — 유저 찾기",
  description: "엔트리 유저 부문별 랭킹",
}

const RANKING_CATEGORIES: Array<{
  name: string
  description: string
  includesTruncated?: boolean
}> = [
  { name: "총 조회수", description: "작품 조회수 합계" },
  { name: "총 좋아요수", description: "작품 좋아요 합계" },
  { name: "총 댓글수", description: "작품 댓글 합계" },
  { name: "총 사본수", description: "작품 사본 합계" },
  { name: "총 사용 블록", description: "작품 사용 블록 합계" },
  {
    name: "총 활동 기간",
    description: "가입 후 경과 일수",
    includesTruncated: true,
  },
  { name: "총 인기작품수", description: "인기 작품으로 선정된 수" },
  { name: "총 스태프 선정수", description: "스태프 선정 작품 수" },
]

export default function RankingPage() {
  return (
    <main className="min-h-screen px-6 py-12">
      <div className="mx-auto max-w-3xl">
        <nav className="mb-6">
          <Link
            href="/"
            className="text-sm text-slate-500 transition hover:text-brand-600"
          >
            ← 홈으로
          </Link>
        </nav>

        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            랭킹
          </h1>
          <p className="mt-3 text-slate-600">
            검색된 유저 중 부문별 상위 사용자를 보여줍니다.
          </p>
        </header>

        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
          <h2 className="text-base font-semibold text-amber-900">준비중</h2>
          <p className="mt-2 text-sm leading-relaxed text-amber-800">
            랭킹 기능은 현재 준비중입니다. 데이터베이스 연결 후 활성화 됩니다.
            그 전까지는 검색 기능만 사용할 수 있어요.
          </p>
        </div>

        <section className="mt-10">
          <h2 className="text-lg font-semibold text-slate-900">
            지원 예정 부문 (8개)
          </h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {RANKING_CATEGORIES.map((cat) => (
              <li
                key={cat.name}
                className="rounded-lg border border-slate-200 bg-white px-4 py-3"
              >
                <p className="text-sm font-medium text-slate-900">{cat.name}</p>
                <p className="mt-1 text-xs text-slate-500">{cat.description}</p>
                {cat.includesTruncated && (
                  <p className="mt-2 text-xs text-emerald-700">
                    작품 200개 초과 유저 포함
                  </p>
                )}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-slate-500">
            ※ 활동 기간 외 7개 부문은 작품 200개 초과 유저(부분 집계)는 제외됩니다.
          </p>
        </section>

        <section className="mt-10 rounded-xl border border-slate-200 bg-slate-50 p-5">
          <h2 className="text-sm font-semibold text-slate-900">
            랭킹 등록 방식
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            누군가가 <code className="rounded bg-white px-1.5 py-0.5 text-slate-700">/u/&#123;id&#125;</code>{" "}
            로 유저를 검색하면 해당 유저의 통계가 자동으로 랭킹에 등록됩니다.
            별도의 동의 절차는 없습니다. 랭킹에서 빼고 싶은 유저는 추후 옵트아웃
            방법을 추가할 예정입니다.
          </p>
        </section>
      </div>
    </main>
  )
}
