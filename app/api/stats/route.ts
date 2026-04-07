import { NextResponse } from "next/server"
import {
  fetchUserStatus,
  fetchAllUserProjects,
  fetchLatestUpdatedProject,
} from "@/lib/entry-api"
import {
  aggregate,
  MAX_PROJECTS,
  type AggregatedStats,
} from "@/lib/aggregate"
import { isValidEntryId } from "@/lib/extract-id"
import { cacheGet, cacheSet } from "@/lib/cache"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const STATS_TTL_MS = 30 * 60 * 1000 // 30분

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id")?.trim().toLowerCase() ?? ""

  if (!id || !isValidEntryId(id)) {
    return NextResponse.json(
      { error: "invalid id. expected 24-char hex ObjectId." },
      { status: 400 },
    )
  }

  const cacheKey = `stats:${id}`
  const cached = cacheGet<AggregatedStats>(cacheKey)
  if (cached) {
    return NextResponse.json(
      { cached: true, stats: cached },
      { headers: { "Cache-Control": "public, max-age=0, s-maxage=1800" } },
    )
  }

  try {
    // 1) userstatus로 존재 확인 + 닉네임/총 작품 수 취득
    const user = await fetchUserStatus(id)
    if (!user) {
      return NextResponse.json(
        { error: "user not found" },
        { status: 404 },
      )
    }

    // 2) 작품 페이지네이션 (최대 4회 호출 = 200개까지)
    const { total, projects } = await fetchAllUserProjects(id)

    // 2.5) truncated 케이스는 sort:updated 타겟 호출 1회 추가 (최근 활동용)
    const latestUpdated =
      total > MAX_PROJECTS ? await fetchLatestUpdatedProject(id) : null

    // 3) 집계 (total > 200 이면 truncated 플래그로 경고)
    const stats = aggregate(user, projects, total, latestUpdated)
    cacheSet(cacheKey, stats, STATS_TTL_MS)

    return NextResponse.json(
      { cached: false, stats },
      { headers: { "Cache-Control": "public, max-age=0, s-maxage=1800" } },
    )
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 502 })
  }
}
