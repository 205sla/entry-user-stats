/**
 * 랭킹 기록/조회 로직.
 *
 * - `recordRanking(stats)` : 검색된 유저의 통계를 Firestore 에 단일 doc 으로 저장.
 *   1시간 이내 재기록은 skip 하여 쓰기 비용을 줄인다. truncated 유저도 메타데이터는
 *   보존하되 `truncated: true` 로 마킹되며, 활동 기간 외 랭킹 쿼리에서는 제외된다.
 *
 * - `getRanking(type, limit)` : 부문별 top N 조회. 옵션 B 정책에 따라 활동 기간
 *   랭킹은 truncated 유저도 포함, 나머지 7개 부문은 제외한다.
 */

import { Timestamp, FieldValue } from "firebase-admin/firestore"
import { getDb } from "@/lib/firebase"
import { cacheGet, cacheSet } from "@/lib/cache"
import type { AggregatedStats } from "@/lib/aggregate"
import {
  RANKING_TYPES,
  type RankingType,
  type RankingEntry,
  type UserRankPositions,
} from "@/lib/ranking-types"

// 클라이언트 안전 타입/상수를 re-export (서버 코드에서도 한 곳에서 import 가능)
export {
  RANKING_TYPES,
  RANKING_LABELS,
  type RankingType,
  type RankingEntry,
  type UserRankPositions,
} from "@/lib/ranking-types"

const COLLECTION = "ent2_users"
const MIN_REFRESH_MS = 60 * 60 * 1000 // 1시간

/** RankingType → Firestore 필드명 */
const FIELD_MAP: Record<RankingType, string> = {
  views: "totalViews",
  likes: "totalLikes",
  comments: "totalComments",
  clones: "totalClones",
  blocks: "totalBlocks",
  activity: "activityDays",
  popular: "popularCount",
  staff: "staffCount",
}

function activityDaysFromCreated(createdIso: string): number {
  const start = new Date(createdIso).getTime()
  if (isNaN(start)) return 0
  const diff = Date.now() - start
  if (diff <= 0) return 0
  return Math.floor(diff / 86_400_000)
}

/**
 * 검색된 유저의 통계를 Firestore 에 기록한다.
 * - 1시간 이내 재기록 skip
 * - merge 모드라 firstRecorded 보존
 * - 실패해도 throw 하지 않고 콘솔에 경고만 남긴다 (백그라운드 호출용)
 */
export async function recordRanking(stats: AggregatedStats): Promise<void> {
  try {
    const db = getDb()
    const { user, totals, truncated } = stats
    const ref = db.collection(COLLECTION).doc(user.id)

    // 1시간 이내 재기록 skip
    const snap = await ref.get()
    if (snap.exists) {
      const last = snap.get("lastRecorded") as Timestamp | undefined
      if (last && Date.now() - last.toMillis() < MIN_REFRESH_MS) {
        return
      }
    }

    const payload: Record<string, unknown> = {
      nickname: user.nickname,
      totalProjects: stats.totalProjects,
      totalViews: totals.views,
      totalLikes: totals.likes,
      totalComments: totals.comments,
      totalClones: totals.clones,
      totalBlocks: totals.totalBlocks,
      activityDays: activityDaysFromCreated(user.created),
      popularCount: totals.ranked,
      staffCount: totals.staffPicked,
      truncated,
      lastRecorded: FieldValue.serverTimestamp(),
    }

    if (!snap.exists) {
      payload.firstRecorded = FieldValue.serverTimestamp()
    }

    await ref.set(payload, { merge: true })
  } catch (err) {
    console.warn("[ranking] recordRanking 실패:", err)
  }
}

/**
 * 부문별 top N 조회.
 * - 옵션 B: 활동 기간 랭킹은 truncated 유저 포함 (가입일 기반이라 정확)
 * - 나머지 7개 부문은 부분 집계라 제외 (`where truncated == false`)
 */
export async function getRanking(
  type: RankingType,
  limit = 20,
): Promise<RankingEntry[]> {
  const db = getDb()
  const field = FIELD_MAP[type]
  const collection = db.collection(COLLECTION)

  const base =
    type === "activity"
      ? collection
      : collection.where("truncated", "==", false)

  const snap = await base.orderBy(field, "desc").limit(limit).get()

  return snap.docs.map((d) => {
    const data = d.data()
    return {
      id: d.id,
      nickname: (data.nickname as string) ?? "(알 수 없음)",
      totalProjects: (data.totalProjects as number) ?? 0,
      totalViews: (data.totalViews as number) ?? 0,
      totalLikes: (data.totalLikes as number) ?? 0,
      totalComments: (data.totalComments as number) ?? 0,
      totalClones: (data.totalClones as number) ?? 0,
      totalBlocks: (data.totalBlocks as number) ?? 0,
      activityDays: (data.activityDays as number) ?? 0,
      popularCount: (data.popularCount as number) ?? 0,
      staffCount: (data.staffCount as number) ?? 0,
      truncated: (data.truncated as boolean) ?? false,
    }
  })
}

// ---------------------------------------------------------------------------
// 유저별 랭킹 순위 조회
// ---------------------------------------------------------------------------

const RANKING_CACHE_TTL = 60_000 // 1분

/**
 * 유저가 top 100 에 포함된 부문과 순위를 반환한다.
 * 8개 부문을 병렬 조회하며 결과는 1분간 캐시해 Firestore read 절약.
 * Firebase 미설정 등으로 실패하면 빈 객체를 반환한다 (페이지 렌더에 영향 없음).
 */
export async function getUserRankPositions(
  userId: string,
): Promise<UserRankPositions> {
  try {
    const results = await Promise.all(
      RANKING_TYPES.map(async (type) => {
        const cacheKey = `ranking:${type}`
        let entries = cacheGet<RankingEntry[]>(cacheKey)
        if (!entries) {
          entries = await getRanking(type, 100)
          cacheSet(cacheKey, entries, RANKING_CACHE_TTL)
        }
        return { type, entries }
      }),
    )

    const positions: UserRankPositions = {}
    for (const { type, entries } of results) {
      const idx = entries.findIndex((e) => e.id === userId)
      if (idx !== -1) {
        positions[type] = idx + 1
      }
    }
    return positions
  } catch (err) {
    console.warn("[ranking] getUserRankPositions 실패:", err)
    return {}
  }
}
