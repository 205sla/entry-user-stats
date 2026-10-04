import Link from "next/link"
import { Suspense } from "react"
import RankingTable from "@/components/RankingTable"
import ShareButton from "@/components/ShareButton"
import { rankingShareUrl } from "@/lib/share-url"
import { publicPageMetadata, SITE_NAME } from "@/lib/site-metadata"
import { isProfileRanking, parseRankingType, RANKING_DESCRIPTIONS } from "@/lib/ranking-types"
import {
  normalizeFocusedUserId,
  rankingPageHref,
} from "@/lib/ranking-navigation"
import {
  getRanking,
  RANKING_TYPES,
  RANKING_LABELS,
  type RankingType,
} from "@/lib/ranking"

// ISR: 60초마다 재검증 (Firestore read 절약)
export const revalidate = 60

interface PageProps {
  searchParams: Promise<{ type?: string | string[]; user?: string | string[] }>
}

export async function generateMetadata({ searchParams }: PageProps) {
  const type = parseRankingType((await searchParams).type)
  return publicPageMetadata(
    `엔트리 ${RANKING_LABELS[type]} 랭킹 | ${SITE_NAME}`,
    `${RANKING_DESCRIPTIONS[type]}를 확인하세요. 유저찾기에서 검색된 유저의 ${RANKING_LABELS[type]} 상위 100명을 보여주며, 검색할 때 정보가 자동으로 등록·갱신됩니다.`,
    rankingPageHref(type),
  )
}

export default async function RankingPage({ searchParams }: PageProps) {
  const params = await searchParams
  const type = parseRankingType(params.type)
  const focusedUserId = normalizeFocusedUserId(
    typeof params.user === "string" ? params.user : undefined,
  )

  return (
    <main className="min-h-screen px-4 py-12 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <nav className="mb-6">
          <Link
            href="/"
            className="text-sm text-slate-500 transition hover:text-brand-600"
          >
            ← 홈으로
          </Link>
        </nav>

        <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              엔트리 {RANKING_LABELS[type]} 랭킹
            </h1>
            <p className="mt-3 text-slate-600">
              검색된 유저 중 부문별 상위 사용자를 보여줍니다.
            </p>
          </div>
          <ShareButton
            url={rankingShareUrl(type)}
            title={`${RANKING_LABELS[type]} 랭킹 — 유저 찾기.엔트리.org`}
            label="랭킹 링크 복사"
          />
        </header>

        <nav aria-label="랭킹 부문" className="mb-6">
          <div className="flex flex-wrap gap-2">
            {RANKING_TYPES.map((t) => {
              const active = t === type
              return (
                <Link
                  key={t}
                  href={rankingPageHref(t, focusedUserId)}
                  aria-current={active ? "page" : undefined}
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
        </nav>

        <div className="mb-4 text-sm text-slate-500">
          {RANKING_DESCRIPTIONS[type]}
        </div>

        <Suspense fallback={<RankingSkeleton />}>
          <RankingContent type={type} focusedUserId={focusedUserId} />
        </Suspense>

        <section className="mt-10 rounded-xl border border-slate-200 bg-slate-50 p-5">
          <h2 className="text-sm font-semibold text-slate-900">
            랭킹 등록 방식
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            누군가가 유저를 검색하면 해당 유저의 통계가 자동으로 랭킹에
            등록됩니다.
          </p>
          {(type === "followers" || type === "following") && (
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              아직 팔로워·팔로잉 정보가 없는 유저는 다음 검색 때부터 이 랭킹에
              참여합니다. 작품 수에 관계없이, 검색 당시 확인한 인원수를 기준으로 합니다.
            </p>
          )}
          {!isProfileRanking(type) && (
            <p className="mt-2 text-xs text-slate-500">
              ※ 작품 300개 초과 유저는 작품 집계 부문에서 제외됩니다.
              활동 기간·팔로워·팔로잉 랭킹에는 참여할 수 있습니다.
            </p>
          )}
        </section>
      </div>
    </main>
  )
}

async function RankingContent({
  type,
  focusedUserId,
}: {
  type: RankingType
  focusedUserId?: string
}) {
  let entries
  try {
    entries = await getRanking(type, 100)
  } catch (err) {
    console.error("[ranking] 조회 실패:", err)
    return <RankingError />
  }
  return (
    <RankingTable
      type={type}
      entries={entries}
      focusedUserId={focusedUserId}
    />
  )
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
