/**
 * 닉네임 검색/자동완성용 경량 인덱스.
 *
 * ## 설계 (O(1) 핫패스)
 * 과거 구현은 홈 로드마다 `ent2_users` 컬렉션 **전체**를 읽어 인덱스를 만들었다
 * (유저 N명 = N reads). Vercel 서버리스는 인스턴스마다 메모리 캐시가 따로라
 * cold start 마다 전체 스캔이 되살아났고, 유저가 쌓이면서 Firestore 무료 일일
 * 읽기 한도(5만)를 넘겨 닉네임 검색·랭킹이 통째로 막혔다.
 *
 * 현재는 인덱스를 **샤딩된 영구 문서**(`ent2_index/shard_{n}`)에 비정규화해 둔다:
 *  - 각 샤드 doc 은 `{ users: { [userId]: {nickname, totalProjects, activityDays} } }`.
 *  - 읽기: 메타 + 샤드 doc 을 `getAll` 로 한 번에 → 고정 `SHARD_COUNT + 1` reads
 *    (유저 수와 무관). 5분 in-memory 캐시로 warm 인스턴스는 0 read.
 *  - 쓰기: `recordRanking` 이 유저를 기록할 때 해당 샤드의 키 하나만 merge 업서트
 *    (`upsertNicknameIndexEntry`). 1 write, 전체 재기록 없음.
 *  - 최초 1회(샤드 부재 시)만 `ent2_users` 를 스캔해 백필한다(`rebuildIndex`).
 *
 * 샤드를 나누는 이유: Firestore 단일 문서 1 MiB 제한 회피. 8 샤드 × ~수천 키로
 * 수만 유저까지 여유. 검색 필터링은 클라이언트(`UrlForm`)에서 수행한다.
 */

import { getDb } from "@/lib/firebase"
import type { Firestore } from "firebase-admin/firestore"

export interface NicknameEntry {
  id: string
  nickname: string
  totalProjects: number
  activityDays: number
}

/** 샤드 doc 의 users 맵 값 (id 는 키이므로 제외) */
type ShardUser = Omit<NicknameEntry, "id">

const INDEX_COLLECTION = "ent2_index"
const META_DOC = "meta"
const SHARD_COUNT = 8
const INDEX_CACHE_TTL_MS = 5 * 60 * 1000 // 5분

let cached: { at: number; data: NicknameEntry[] } | null = null

/** ObjectId(16진수)의 끝 글자로 0..SHARD_COUNT-1 샤드를 결정한다. */
function shardFor(id: string): number {
  const c = parseInt(id.slice(-1), 16)
  return (Number.isNaN(c) ? 0 : c) % SHARD_COUNT
}

function shardDocId(shard: number): string {
  return `shard_${shard}`
}

/** 모든 샤드의 users 맵을 평탄화해 NicknameEntry[] 로 변환. */
function flattenShards(
  shardMaps: (Record<string, ShardUser> | undefined)[],
): NicknameEntry[] {
  const data: NicknameEntry[] = []
  for (const users of shardMaps) {
    if (!users) continue
    for (const [id, v] of Object.entries(users)) {
      data.push({
        id,
        nickname: v?.nickname ?? "",
        totalProjects: v?.totalProjects ?? 0,
        activityDays: v?.activityDays ?? 0,
      })
    }
  }
  return data
}

/**
 * 샤드 부재(최초 배포) 시 1회만: `ent2_users` 전체를 스캔해 샤드 + 메타를 채운다.
 * 이 O(N) 스캔은 백필 1회로 끝나고, 이후엔 샤드만 읽으므로 한도를 재소진하지 않는다.
 */
async function rebuildIndex(db: Firestore): Promise<NicknameEntry[]> {
  const snap = await db
    .collection("ent2_users")
    .select("nickname", "totalProjects", "activityDays")
    .get()

  const shards: Record<number, Record<string, ShardUser>> = {}
  const data: NicknameEntry[] = []

  for (const d of snap.docs) {
    const entry: ShardUser = {
      nickname: (d.get("nickname") as string) ?? "",
      totalProjects: (d.get("totalProjects") as number) ?? 0,
      activityDays: (d.get("activityDays") as number) ?? 0,
    }
    data.push({ id: d.id, ...entry })
    const s = shardFor(d.id)
    ;(shards[s] ??= {})[d.id] = entry
  }

  await Promise.all([
    ...Object.entries(shards).map(([s, users]) =>
      db
        .collection(INDEX_COLLECTION)
        .doc(shardDocId(Number(s)))
        .set({ users }, { merge: true }),
    ),
    db
      .collection(INDEX_COLLECTION)
      .doc(META_DOC)
      .set({ builtAt: Date.now(), count: data.length }),
  ])

  return data
}

/**
 * 닉네임 인덱스 전체를 반환한다 (자동완성용).
 * - in-memory 5분 캐시 → warm 인스턴스는 Firestore 접근 없음
 * - 캐시 미스: 메타 + 전체 샤드를 getAll (고정 SHARD_COUNT+1 reads)
 * - 메타 부재: 최초 1회 백필 후 반환
 * - 실패(할당량 초과 등): 기존 캐시 재활용, 없으면 빈 배열 (검색만 일시 비활성)
 */
export async function getNicknameIndex(): Promise<NicknameEntry[]> {
  if (cached && Date.now() - cached.at < INDEX_CACHE_TTL_MS) {
    return cached.data
  }

  try {
    const db = getDb()
    const col = db.collection(INDEX_COLLECTION)
    const metaRef = col.doc(META_DOC)
    const shardRefs = Array.from({ length: SHARD_COUNT }, (_, i) =>
      col.doc(shardDocId(i)),
    )

    const [metaSnap, ...shardSnaps] = await db.getAll(metaRef, ...shardRefs)

    // 메타가 없으면 아직 백필 전 → 1회 스캔 백필
    if (!metaSnap.exists) {
      const data = await rebuildIndex(db)
      cached = { at: Date.now(), data }
      return data
    }

    const data = flattenShards(
      shardSnaps.map((s) => s.get("users") as Record<string, ShardUser>),
    )
    cached = { at: Date.now(), data }
    return data
  } catch (err) {
    console.warn("[nickname-index] 조회 실패:", err)
    // 실패 시 기존 캐시 있으면 재활용 (stale-while-error), 없으면 빈 배열
    return cached?.data ?? []
  }
}

/**
 * 단일 유저의 경량 인덱스 엔트리를 해당 샤드에 merge 업서트한다.
 * `recordRanking` 에서 호출 — 검색된 유저가 자동완성에 즉시 반영되게 한다.
 * 키 하나만 merge 하므로 1 write, 샤드 전체 재기록 없음.
 */
export async function upsertNicknameIndexEntry(
  entry: NicknameEntry,
): Promise<void> {
  const db = getDb()
  const { id, nickname, totalProjects, activityDays } = entry
  await db
    .collection(INDEX_COLLECTION)
    .doc(shardDocId(shardFor(id)))
    .set(
      { users: { [id]: { nickname, totalProjects, activityDays } } },
      { merge: true },
    )

  // 로컬 in-memory 캐시도 즉시 갱신 (있을 때만; 다음 미스에서 어차피 재로딩)
  if (cached) {
    const next = cached.data.filter((e) => e.id !== id)
    next.push({ id, nickname, totalProjects, activityDays })
    cached = { at: cached.at, data: next }
  }
}
