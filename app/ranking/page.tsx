import Link from "next/link"
import { Suspense } from "react"
import RankingTable from "@/components/RankingTable"
import {
  getRanking,
  RANKING_TYPES,
  RANKING_LABELS,
  type RankingType,
} from "@/lib/ranking"

export const metadata = {
  title: "랭킹",
  description: "검색된 엔트리 유저 중 부문별 상위 사용자를 보여줍니다.",
  openGraph: {
    title: "랭킹 — 유저 찾기",
    description: "검색된 엔트리 유저 중 부문별 상위 사용자를 보여줍니다.",
  },
  alternates: {
    canonical: "/ranking",
  },
}

// ISR: 60초마다 재검증 (Firestore read 절약)
export const revalidate = 60

const TAB_DESCRIPTIONS: Record<RankingType, string> = {
  views: "작품 조회수의 합이 가장 많은 유저",
  likes: "작품 좋아요의 합이 가장 많은 유저",
  comments: "작품 댓글의 합이 가장 많은 유저",
  clones: "작품 사본의 합이 가장 많은 유저",
  blocks: "작품에서 사용한 블록 수의 합이 가장 많은 유저",
  activity: "엔트리 가입 후 가장 오래 활동한 유저",
  popular: "인기 작품으로 선정된 작품이 가장 많은 유저",
  staff: "스태프 선정 작품이 가장 많은 유저",
}

function isRankingType(v: string | undefined): v is RankingType {
  return !!v && (RANKING_TYPES as string[]).includes(v)
}

interface PageProps {
  searchParams: Promise<{ type?: string }>
}

export default async function RankingPage({ searchParams }: PageProps) {
  const params = await searchParams
  const type: RankingType = isRankingType(params.type) ? params.type : "views"

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

        <div className="-mx-6 mb-6 overflow-x-auto px-6">
          <div className="flex gap-2 whitespace-nowrap">
            {RANKING_TYPES.map((t) => {
              const active = t === type
              return (
                <Link
                  key={t}
                  href={t === "views" ? "/ranking" : `/ranking?type=${t}`}
                  className={
                    active
                      ? "rounded-full bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm"
                      : "rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
                  }
                >
                  {RANKING_LABELS[t]}
                </Link>
              )
            })}
          </div>
        </div>

        <div className="mb-4 text-sm text-slate-500">
          {TAB_DESCRIPTIONS[type]}
        </div>

        <Suspense fallback={<RankingSkeleton />}>
          <RankingContent type={type} />
        </Suspense>

        <section className="mt-10 rounded-xl border border-slate-200 bg-slate-50 p-5">
          <h2 className="text-sm font-semibold text-slate-900">
            랭킹 등록 방식
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            누군가가 유저를 검색하면 해당 유저의 통계가 자동으로 랭킹에
            등록됩니다.
          </p>
          {type !== "activity" && (
            <p className="mt-2 text-xs text-slate-500">
              ※ 작품 300개 초과 유저는 부분 집계라 활동 기간 외 부문에서는 제외됩니다.
            </p>
          )}
        </section>
      </div>
    </main>
  )
}

async function RankingContent({ type }: { type: RankingType }) {
  let entries
  try {
    entries = await getRanking(type, 20)
  } catch (err) {
    console.error("[ranking] 조회 실패:", err)
    return <RankingError />
  }
  return <RankingTable type={type} entries={entries} />
}

/**
 * Firestore 에러를 사용자에게 보여주는 컴포넌트.
 */
function RankingError() {
  return (
    <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-800">
      <p className="font-semibold">랭킹 데이터를 불러오지 못했어요.</p>
      <p className="mt-2">잠시 후 다시 시도해 주세요.</p>
    </div>
  )
}

function RankingSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="animate-pulse divide-y divide-slate-100">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-4">
            <div className="h-7 w-7 rounded-full bg-slate-200" />
            <div className="h-4 flex-1 rounded bg-slate-200" />
            <div className="h-4 w-20 rounded bg-slate-200" />
          </div>
        ))}
      </div>
    </div>
  )
}
