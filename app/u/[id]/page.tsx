import Link from "next/link"
import { notFound } from "next/navigation"
import { headers } from "next/headers"
import { isValidEntryId } from "@/lib/extract-id"
import { fetchUserStatus } from "@/lib/entry-api"
import { getStatsForUser } from "@/lib/stats-service"
import { checkRateLimit, getClientIp } from "@/lib/rate-limit"
import {
  getUserRankPositions,
  type UserRankPositions,
} from "@/lib/ranking"
import StatsView from "@/components/StatsView"

export const dynamic = "force-dynamic"

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params
  if (!isValidEntryId(id)) return { title: "잘못된 ID", robots: { index: false } }
  try {
    const user = await fetchUserStatus(id)
    if (!user) return { title: "유저 없음", robots: { index: false } }
    const title = `${user.nickname}님의 통계`
    const description = `${user.nickname}님의 엔트리 작품 통계`
    return {
      title,
      description,
      openGraph: { title: `${title} — 유저 찾기`, description },
      robots: { index: false, follow: true },
    }
  } catch {
    return { title: "유저 찾기" }
  }
}

export default async function UserStatsPage({ params }: PageProps) {
  const { id } = await params

  if (!isValidEntryId(id)) notFound()

  const h = await headers()
  const ip = getClientIp(h)
  const rl = checkRateLimit(`ip:${ip}`)

  if (!rl.allowed) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6 py-12">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-bold text-slate-900">
            잠시 후 다시 시도해주세요
          </h1>
          <p className="mt-3 text-slate-600">
            너무 많은 요청이 발생했어요. 약 {rl.retryAfterSec}초 후에 다시
            시도해주세요.
          </p>
          <Link
            href="/"
            className="mt-6 inline-block text-sm text-brand-600 hover:underline"
          >
            ← 홈으로
          </Link>
        </div>
      </main>
    )
  }

  const result = await getStatsForUser(id)
  if (!result) notFound()

  // 랭킹 순위는 유저 통계 값이 필요해서 순차 호출
  // (각 부문당 1 Firestore count read 로 저렴하므로 레이턴시 영향 미미)
  const rankPositions = await getUserRankPositions(id, result.stats).catch(
    (): UserRankPositions => ({}),
  )

  return (
    <main className="min-h-screen px-6 py-12">
      <div className="mx-auto max-w-6xl">
        <nav className="mb-6">
          <Link
            href="/"
            className="text-sm text-slate-500 transition hover:text-brand-600"
          >
            ← 다른 유저 검색
          </Link>
        </nav>
        <StatsView stats={result.stats} rankPositions={rankPositions} />
      </div>
    </main>
  )
}
