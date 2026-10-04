/**
 * 랭킹 기록/조회 로직.
 *
 * - `recordRanking(stats)` : 검색된 유저의 통계를 Firestore 에 단일 doc 으로 저장.
 *   1시간 이내 재기록은 skip 하여 쓰기 비용을 줄인다. truncated 유저도 메타데이터는
 *   보존하되 `truncated: true` 로 마킹되며, 작품 집계 랭킹에서만 제외된다.
 *
 * - `getRanking(type, limit)` : 부문별 top N 조회. 활동 기간·팔로워·팔로잉은
 *   truncated 유저도 포함, 작품 집계가 필요한 7개 부문은 제외한다.
 */

import { Timestamp, FieldValue } from "@google-cloud/firestore"
import { revalidateTag, unstable_cache } from "next/cache"
import { getDb } from "@/lib/firebase"
import {
  setNicknameIndexEntry,
  updateNicknameIndexCache,
  type NicknameEntry,
} from "@/lib/nickname-index"
import type { AggregatedStats } from "@/lib/aggregate"
import { collectedCount } from "@/lib/collected-count"
import {
  RANKING_TYPES,
  isProfileRanking,
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
const RANKING_CACHE_TAG = "rankings"
const NICKNAME_INDEX_VERSION = 1
const recording = new Map<string, Promise<void>>()

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
  followers: "followers",
  following: "following",
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
 * - 1시간 이내 재기록 skip. 팔로워·팔로잉이 없는 기존 문서는 검색 때 보완한다.
 * - merge 모드라 firstRecorded 보존
 * - 실패해도 throw 하지 않고 콘솔에 경고만 남긴다 (백그라운드 호출용)
 */
export function recordRanking(stats: AggregatedStats): Promise<void> {
  const id = stats.user.id
  const pending = recording.get(id)
  if (pending) return pending

  const task = writeRanking(stats).finally(() => recording.delete(id))
  recording.set(id, task)
  return task
}

async function writeRanking(stats: AggregatedStats): Promise<void> {
  try {
    const db = getDb()
    const { user, totals, truncated } = stats
    const ref = db.collection(COLLECTION).doc(user.id)

    // 검사와 두 문서의 쓰기를 함께 커밋한다. 다른 인스턴스와 겹치면 재조회 후 skip한다.
    const result = await db.runTransaction(async (transaction) => {
      const snap = await transaction.get(ref)
      const existing = snap.data() ?? {}
      const last = existing.lastRecorded
      const recent = last instanceof Timestamp && Date.now() - last.toMillis() < MIN_REFRESH_MS
      const payload: Record<string, unknown> = recent ? {} : {
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

      // 미수집 값으로 기존 수치를 지우지 않는다. 1시간 안에는 누락 필드만 보완한다.
      for (const field of ["followers", "following"] as const) {
        const value = collectedCount(user[field])
        if (value !== null && (!recent || collectedCount(existing[field]) === null)) {
          payload[field] = value
        }
      }

      if (!snap.exists) payload.firstRecorded = FieldValue.serverTimestamp()

      let indexEntry: NicknameEntry | undefined
      if (!recent || existing.nicknameIndexVersion !== NICKNAME_INDEX_VERSION) {
        // 기존 부분 실패 문서도 다음 검색 때만 복구한다. 저장된 프로필과 인덱스를 맞춘다.
        const saved = { ...existing, ...payload }
        indexEntry = {
          id: user.id,
          nickname: typeof saved.nickname === "string" ? saved.nickname : user.nickname,
          totalProjects: collectedCount(saved.totalProjects) ?? stats.totalProjects,
          activityDays: collectedCount(saved.activityDays) ?? activityDaysFromCreated(user.created),
        }
        setNicknameIndexEntry(transaction, db, indexEntry)
        payload.nicknameIndexVersion = NICKNAME_INDEX_VERSION
      }

      if (Object.keys(payload).length === 0) return null
      transaction.set(ref, payload, { merge: true })
      return { indexEntry }
    })

    if (result) {
      if (result.indexEntry) updateNicknameIndexCache(result.indexEntry)
      revalidateTag(RANKING_CACHE_TAG)
    }
  } catch (err) {
    console.warn("[ranking] recordRanking 실패:", err)
  }
}

/**
 * 부문별 top N 조회.
 * - 활동 기간·팔로워·팔로잉은 truncated 유저 포함 (프로필 기반이라 정확)
 * - 작품 집계 7개 부문은 부분 집계라 제외 (`where truncated == false`)
 * - orderBy는 해당 필드가 없는 기존 문서를 제외한다. 검색되기 전에는 참여하지 않는다.
 */
async function queryRanking(
  type: RankingType,
  limit = 20,
): Promise<RankingEntry[]> {
  const db = getDb()
  const field = FIELD_MAP[type]
  const collection = db.collection(COLLECTION)

  let base =
    isProfileRanking(type)
      ? collection
      : collection.where("truncated", "==", false)

  if (type === "followers" || type === "following") {
    // 필드 부재뿐 아니라 기존 null 값도 랭킹에서 제외한다. 실제 0명은 포함한다.
    base = base.where(field, ">=", 0)
  }

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
      followers: collectedCount(data.followers),
      following: collectedCount(data.following),
      truncated: (data.truncated as boolean) ?? false,
      lastRecorded:
        data.lastRecorded instanceof Timestamp
          ? data.lastRecorded.toDate().toISOString()
          : undefined,
    }
  })
}

const queryCachedRanking = unstable_cache(queryRanking, ["ranking-list-v4"], {
  revalidate: 60,
  tags: [RANKING_CACHE_TAG],
})

/** 서버 인스턴스가 달라도 공유되는 60초 Data Cache를 사용한다. */
export async function getRanking(
  type: RankingType,
  limit = 20,
): Promise<RankingEntry[]> {
  return queryCachedRanking(type, limit)
}

// ---------------------------------------------------------------------------
// 유저별 랭킹 순위 조회 (Firestore count aggregation)
// ---------------------------------------------------------------------------

const MAX_DISPLAYED_RANK = 100

/**
 * 유저가 top 100 에 포함된 부문과 순위를 반환한다.
 *
 * 각 부문에 대해 Firestore count() aggregation 으로 "유저보다 값이 큰 다른 유저 수"
 * 를 세어 순위 계산. 각 쿼리는 매칭된 문서 1000개당 1 read 로 과금되므로 유저 풀이
 * 작을 땐 부문당 ~1 read (총 10 reads) 로 매우 저렴.
 *
 * - truncated 유저는 작품 집계 부문에서만 제외
 * - rank > 100 이면 뱃지 미노출
 * - 저장된 유저 문서와 count를 같은 읽기 스냅샷에서 조회한다.
 *   최신 통계와 저장값을 섞지 않으므로 본인을 더 높은 유저로 세지 않는다.
 * - 아직 등록되지 않은 유저/부문은 등록 후 검색부터 배지를 표시한다.
 */
export async function getUserRankPositions(
  userId: string,
): Promise<UserRankPositions> {
  try {
    const db = getDb()
    const collection = db.collection(COLLECTION)
    return await db.runTransaction(async (transaction) => {
      const user = await transaction.get(collection.doc(userId))
      if (!user.exists) return {}

      const tasks = RANKING_TYPES.map(async (type) => {
        try {
          if (!isProfileRanking(type) && user.get("truncated") !== false) return null
          const field = FIELD_MAP[type]
          const value = collectedCount(user.get(field))
          if (value === null) return null

          const base = isProfileRanking(type)
            ? collection
            : collection.where("truncated", "==", false)
          const snap = await transaction.get(base.where(field, ">", value).count())
          const rank = snap.data().count + 1
          return rank <= MAX_DISPLAYED_RANK ? { type, rank } : null
        } catch (err) {
          console.warn(`[ranking] count query failed for type="${type}":`, err)
          return null
        }
      })

      const positions: UserRankPositions = {}
      for (const result of await Promise.all(tasks)) {
        if (result) positions[result.type] = result.rank
      }
      return positions
    }, { readOnly: true })
  } catch (err) {
    console.warn("[ranking] 순위 조회 실패:", err)
    return {}
  }
}
