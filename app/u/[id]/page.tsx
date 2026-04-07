import Link from "next/link"
import { notFound } from "next/navigation"
import { isValidEntryId } from "@/lib/extract-id"
import {
  fetchUserStatus,
  fetchAllUserProjects,
  fetchLatestUpdatedProject,
} from "@/lib/entry-api"
import { aggregate, MAX_PROJECTS } from "@/lib/aggregate"
import StatsView from "@/components/StatsView"

export const dynamic = "force-dynamic"
export const revalidate = 1800

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params
  if (!isValidEntryId(id)) return { title: "잘못된 ID — Ent2" }
  try {
    const user = await fetchUserStatus(id)
    if (!user) return { title: "유저 없음 — Ent2" }
    return {
      title: `${user.nickname}님의 통계 — Ent2`,
      description: `${user.nickname}님의 엔트리 작품 통계`,
    }
  } catch {
    return { title: "Ent2" }
  }
}

export default async function UserStatsPage({ params }: PageProps) {
  const { id } = await params

  if (!isValidEntryId(id)) notFound()

  const user = await fetchUserStatus(id)
  if (!user) notFound()

  const { total, projects } = await fetchAllUserProjects(id)
  // truncated(>MAX_PROJECTS) 케이스는 최근 수정 작품이 fetched 세트에 없을 수 있어
  // 별도로 sort:updated 타겟 호출을 한다.
  const latestUpdated =
    total > MAX_PROJECTS ? await fetchLatestUpdatedProject(id) : null
  const stats = aggregate(user, projects, total, latestUpdated)

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
        <StatsView stats={stats} />
      </div>
    </main>
  )
}
