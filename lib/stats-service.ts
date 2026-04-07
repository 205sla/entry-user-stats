/**
 * 유저 통계 조회의 공통 엔트리포인트.
 * 페이지(/u/[id])와 JSON API(/api/stats) 양쪽에서 동일한 캐시를 공유한다.
 *
 * 캐시 미스로 새로 집계가 끝났을 때 백그라운드(after)로 Firestore 랭킹에 기록한다.
 * - 응답 지연 0ms
 * - Firestore 측에서 1시간 dedupe 하므로 안전
 */

import { after } from "next/server"
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
import { cacheGet, cacheSet } from "@/lib/cache"
import { recordRanking } from "@/lib/ranking"

const STATS_TTL_MS = 30 * 60 * 1000 // 30분

export interface StatsResult {
  stats: AggregatedStats
  cached: boolean
}

/**
 * - 캐시 히트 시 즉시 반환 (cached: true)
 * - 미스 시 엔트리 API 호출 → 집계 → 캐시 세팅 → 반환
 * - 유저를 찾을 수 없으면 null 반환
 */
export async function getStatsForUser(
  id: string,
): Promise<StatsResult | null> {
  const cacheKey = `stats:${id}`
  const hit = cacheGet<AggregatedStats>(cacheKey)
  if (hit) {
    return { stats: hit, cached: true }
  }

  const user = await fetchUserStatus(id)
  if (!user) return null

  const { total, projects } = await fetchAllUserProjects(id)
  const latestUpdated =
    total > MAX_PROJECTS ? await fetchLatestUpdatedProject(id) : null
  const stats = aggregate(user, projects, total, latestUpdated)

  cacheSet(cacheKey, stats, STATS_TTL_MS)

  // 응답 후 백그라운드로 랭킹 기록 (실패해도 응답에는 영향 없음)
  after(async () => {
    await recordRanking(stats)
  })

  return { stats, cached: false }
}
