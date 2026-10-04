/**
 * 유저 통계 조회의 공통 엔트리포인트.
 * 페이지(/u/[id])와 JSON API(/api/stats) 양쪽에서 동일한 캐시를 공유한다.
 *
 * 검색 응답 후 백그라운드(after)로 Firestore 랭킹에 기록한다.
 * 캐시 응답도 기록을 재시도하여 이전 저장 실패나 신규 랭킹 필드 누락을 보완한다.
 * - 응답 지연 0ms
 * - Firestore 측에서 1시간 dedupe 하므로 안전
 */

import { after } from "next/server"
import { unstable_cache } from "next/cache"
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
const inFlight = new Map<string, Promise<AggregatedStats | null>>()

export interface StatsResult {
  stats: AggregatedStats
  cached: boolean
}

/**
 * - 캐시 히트 시 즉시 반환 (cached: true)
 * - 미스 시 엔트리 API 호출 → 집계 → 캐시 세팅 → 반환
 * - 유저를 찾을 수 없으면 null 반환
 */
async function loadStats(id: string): Promise<AggregatedStats | null> {
  const user = await fetchUserStatus(id)
  if (!user) return null

  const { total, projects } = await fetchAllUserProjects(id, {
    stopWhenTotalExceeds: MAX_PROJECTS,
  })
  const latestUpdated =
    total > MAX_PROJECTS ? await fetchLatestUpdatedProject(id) : null
  return aggregate(user, projects, total, latestUpdated)
}

const loadCachedStats = unstable_cache(loadStats, ["entry-user-stats-v4"], {
  revalidate: STATS_TTL_MS / 1000,
})

export async function getStatsForUser(
  id: string,
): Promise<StatsResult | null> {
  const cacheKey = `stats:v4:${id}`
  const hit = cacheGet<AggregatedStats>(cacheKey)
  if (hit) {
    after(() => recordRanking(hit))
    return { stats: hit, cached: true }
  }

  let pending = inFlight.get(id)
  const ownsRequest = !pending
  if (!pending) {
    pending = loadCachedStats(id)
    inFlight.set(id, pending)
  }

  let stats: AggregatedStats | null
  try {
    stats = await pending
  } finally {
    if (ownsRequest && inFlight.get(id) === pending) inFlight.delete(id)
  }

  if (!stats) return null

  cacheSet(cacheKey, stats, STATS_TTL_MS)

  if (ownsRequest) {
    // 응답 후 백그라운드로 랭킹 기록 (실패해도 응답에는 영향 없음)
    after(async () => {
      await recordRanking(stats)
    })
  }

  return { stats, cached: false }
}
