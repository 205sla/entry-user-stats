/**
 * 닉네임 검색/자동완성용 전체 인덱스.
 *
 * Firestore `ent2_users` 컬렉션에서 경량 필드만 가져와 (id, 닉네임, 작품 수,
 * 활동 일수) 서버 메모리에 5분간 캐시한다. 검색은 클라이언트에서 이 배열을
 * filter 하는 방식이라 타이핑 시 추가 Firestore read 없음.
 */

import { getDb } from "@/lib/firebase"

export interface NicknameEntry {
  id: string
  nickname: string
  totalProjects: number
  activityDays: number
}

const INDEX_CACHE_TTL_MS = 5 * 60 * 1000 // 5분

let cached: { at: number; data: NicknameEntry[] } | null = null

export async function getNicknameIndex(): Promise<NicknameEntry[]> {
  if (cached && Date.now() - cached.at < INDEX_CACHE_TTL_MS) {
    return cached.data
  }

  try {
    const db = getDb()
    const snap = await db
      .collection("ent2_users")
      .select("nickname", "totalProjects", "activityDays")
      .get()

    const data: NicknameEntry[] = snap.docs.map((d) => ({
      id: d.id,
      nickname: (d.get("nickname") as string) ?? "",
      totalProjects: (d.get("totalProjects") as number) ?? 0,
      activityDays: (d.get("activityDays") as number) ?? 0,
    }))

    cached = { at: Date.now(), data }
    return data
  } catch (err) {
    console.warn("[nickname-index] 조회 실패:", err)
    // 실패 시 기존 캐시 있으면 재활용 (stale-while-error), 없으면 빈 배열
    return cached?.data ?? []
  }
}
