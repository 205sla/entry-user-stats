import { Timestamp } from "@google-cloud/firestore"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { aggregate } from "../lib/aggregate"
import { getRanking, getUserRankPositions, recordRanking } from "../lib/ranking"
import { getNicknameIndex } from "../lib/nickname-index"
import { FakeFirestore } from "./firestore-fake"

const mocks = vi.hoisted(() => ({ getDb: vi.fn(), revalidateTag: vi.fn() }))
vi.mock("@/lib/firebase", () => ({ getDb: mocks.getDb }))
vi.mock("next/cache", () => ({
  unstable_cache: (fn: unknown) => fn,
  revalidateTag: mocks.revalidateTag,
}))

const id = "56136825dadc91e1235b460d"
const userPath = `ent2_users/${id}`
const indexPath = "ent2_index/shard_5"
const now = new Date("2026-10-04T12:00:00Z")

function statsFor(totalProjects = 0, followers: number | null = 120, following: number | null = 45) {
  return aggregate({
    id, nickname: "테스트 유저", username: "test-user", role: "member",
    created: "2020-01-01T00:00:00.000Z", profileImage: null, coverImage: null,
    status: { project: totalProjects, projectAll: totalProjects, follower: followers, following },
  }, [], totalProjects)
}

function useStore(data?: Record<string, unknown>) {
  const store = new FakeFirestore(data ? { [userPath]: data } : {})
  mocks.getDb.mockReturnValue(store.asFirestore())
  return store
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers()
  vi.setSystemTime(now)
})
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks() })

describe("검색 시 랭킹과 닉네임 등록", () => {
  it("신규 유저의 두 수치와 닉네임 인덱스를 함께 커밋한다", async () => {
    const store = useStore()
    await recordRanking(statsFor())
    expect(store.commits).toEqual([[indexPath, userPath]])
    expect(store.documents.get(userPath)).toMatchObject({
      followers: 120, following: 45, nicknameIndexVersion: 1,
      firstRecorded: Timestamp.now(), lastRecorded: Timestamp.now(),
    })
    expect(store.documents.get(indexPath)).toMatchObject({ users: { [id]: { nickname: "테스트 유저" } } })
    expect(mocks.revalidateTag).toHaveBeenCalledWith("rankings")
  })

  it.each([{}, { followers: 5 }, { following: 8 }, { followers: null, following: null }])(
    "최근 문서는 누락 수치만 보완하고 기존 값과 기록 시각을 보존한다: %j", async (counts) => {
      const recorded = Timestamp.fromMillis(Date.now() - 60_000)
      const store = useStore({
        nickname: "저장된 닉네임", totalViews: 500, nicknameIndexVersion: 1,
        lastRecorded: recorded, firstRecorded: recorded, ...counts,
      })
      await recordRanking(statsFor())
      expect(store.documents.get(userPath)).toMatchObject({
        nickname: "저장된 닉네임", totalViews: 500, lastRecorded: recorded, firstRecorded: recorded,
        followers: counts.followers ?? 120, following: counts.following ?? 45,
      })
      expect(store.commits).toEqual([[userPath]])
    },
  )

  it("0명은 수집 완료로 취급하고 1시간 이내 중복 쓰기를 건너뛴다", async () => {
    const store = useStore({ followers: 0, following: 0, lastRecorded: Timestamp.now(), nicknameIndexVersion: 1 })
    await recordRanking(statsFor(0, 0, 0))
    expect(store.commits).toHaveLength(0)
    expect(mocks.revalidateTag).not.toHaveBeenCalled()
  })

  it("1시간이 지나면 수치 감소도 정상 반영하고 firstRecorded는 보존한다", async () => {
    const first = Timestamp.fromMillis(Date.now() - 86_400_000)
    const store = useStore({ followers: 999, following: 999, firstRecorded: first,
      lastRecorded: Timestamp.fromMillis(Date.now() - 3_600_001), nicknameIndexVersion: 1 })
    await recordRanking(statsFor())
    expect(store.documents.get(userPath)).toMatchObject({ followers: 120, following: 45, firstRecorded: first })
  })

  it("수치를 수집하지 못한 신규 유저는 0명으로 등록하지 않는다", async () => {
    const store = useStore()
    await recordRanking(statsFor(0, null, null))
    expect(store.documents.get(userPath)).not.toHaveProperty("followers")
    expect(store.documents.get(userPath)).not.toHaveProperty("following")
    expect(await getRanking("followers", 100)).toEqual([])
    await recordRanking(statsFor(0, null, null))
    expect(store.commits).toHaveLength(1)
    await recordRanking(statsFor(0, 0, 0))
    expect((await getRanking("followers", 100))[0]?.followers).toBe(0)
  })

  it("재수집 실패가 이전에 확인한 수치를 덮어쓰지 않는다", async () => {
    const store = useStore({ followers: 12, following: 34,
      lastRecorded: Timestamp.fromMillis(Date.now() - 3_600_001), nicknameIndexVersion: 1 })
    await recordRanking(statsFor(0, null, null))
    expect(store.documents.get(userPath)).toMatchObject({ followers: 12, following: 34 })
  })

  it("작품 300개 초과 유저도 프로필 수치를 저장한다", async () => {
    const store = useStore()
    await recordRanking(statsFor(350))
    expect(store.documents.get(userPath)).toMatchObject({ followers: 120, following: 45, truncated: true })
  })

  it("같은 인스턴스의 동시 기록은 한 작업으로 합친다", async () => {
    const store = useStore()
    await Promise.all([recordRanking(statsFor()), recordRanking(statsFor())])
    expect(store.transactionOptions).toHaveLength(1)
    expect(store.commits).toHaveLength(1)
  })

  it("서로 다른 인스턴스의 경합도 재조회 후 중복 커밋하지 않는다", async () => {
    const store = useStore()
    vi.resetModules()
    const otherInstance = await import("../lib/ranking")
    await Promise.all([recordRanking(statsFor()), otherInstance.recordRanking(statsFor())])
    expect(store.retries).toBe(1)
    expect(store.commits).toHaveLength(1)
  })

  it("닉네임 쓰기 실패 시 랭킹도 롤백되고 다음 검색에서 함께 복구된다", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {})
    const store = useStore()
    store.documents.set("ent2_index/meta", { builtAt: Date.now() })
    expect(await getNicknameIndex()).toEqual([])
    store.failCommitContaining = "ent2_index/"
    await recordRanking(statsFor())
    expect(store.documents.has(userPath)).toBe(false)
    expect(await getNicknameIndex()).toEqual([])
    expect(mocks.revalidateTag).not.toHaveBeenCalled()
    await recordRanking(statsFor())
    expect(store.documents.has(userPath)).toBe(true)
    expect(await getNicknameIndex()).toEqual([expect.objectContaining({ id, nickname: "테스트 유저" })])
  })

  it("이전 버전의 인덱스 부분 실패도 저장된 닉네임 기준으로 복구한다", async () => {
    const recorded = Timestamp.now()
    const store = useStore({ nickname: "기존 이름", totalProjects: 10, activityDays: 100,
      followers: 12, following: 34, lastRecorded: recorded })
    await recordRanking(statsFor())
    expect(store.documents.get(userPath)).toMatchObject({ followers: 12, following: 34, lastRecorded: recorded, nicknameIndexVersion: 1 })
    expect(store.documents.get(indexPath)).toEqual({ users: { [id]: { nickname: "기존 이름", totalProjects: 10, activityDays: 100 } } })
    await recordRanking(statsFor())
    expect(store.commits).toHaveLength(1)
  })
})

describe("목록과 배지", () => {
  it.each(["followers", "following"] as const)("%s는 미수집을 제외하고 0명·작품 한도 초과 유저를 정렬한다", async (type) => {
    const store = useStore()
    for (const [id, count] of [["a", undefined], ["b", null], ["c", 0], ["d", 5], ["e", 5], ["f", 10]] as const) {
      store.documents.set(`ent2_users/${id}`, { ...(count === undefined ? {} : { [type]: count }), truncated: true })
    }
    const entries = await getRanking(type, 100)
    expect(entries.map(entry => entry.id)).toEqual(["f", "e", "d", "c"])
    for (const entry of entries) {
      const rank = entries.filter(other => other[type]! > entry[type]!).length + 1
      expect((await getUserRankPositions(entry.id))[type]).toBe(rank)
    }
  })

  it("감소한 최신 통계 대신 목록에 저장된 값으로 배지를 계산한다", async () => {
    const store = useStore({ followers: 120, following: 45, lastRecorded: Timestamp.now(), nicknameIndexVersion: 1 })
    store.documents.set("ent2_users/b", { followers: 115 })
    store.documents.set("ent2_users/c", { followers: 110 })
    await recordRanking(statsFor(0, 100, 45))
    expect((await getUserRankPositions(id)).followers).toBe(1)
    expect((await getRanking("followers", 100))[0].id).toBe(id)
    vi.setSystemTime(new Date(now.getTime() + 3_600_001))
    await recordRanking(statsFor(0, 100, 45))
    expect((await getUserRankPositions(id)).followers).toBe(3)
    expect((await getRanking("followers", 100))[2].id).toBe(id)
    expect(store.transactionOptions).toContainEqual({ readOnly: true })
  })

  it("등록되지 않은 유저와 미수집 부문에는 배지를 표시하지 않는다", async () => {
    const store = useStore()
    expect(await getUserRankPositions(id)).toEqual({})
    store.documents.set(userPath, { followers: null, following: null })
    expect(await getUserRankPositions(id)).toEqual({})
  })

  it("작품 한도 초과 유저는 프로필 부문에만 참여한다", async () => {
    const store = useStore()
    await recordRanking(statsFor(350))
    expect(await getRanking("views", 100)).toEqual([])
    expect(await getUserRankPositions(id)).toEqual({ activity: 1, followers: 1, following: 1 })
    expect((await getRanking("activity", 100))[0].id).toBe(id)
    expect(store.commits).toHaveLength(1)
  })

  it("기존 작품 부문도 동률 순위와 한도 제외를 유지한다", async () => {
    const store = useStore({ totalViews: 50, truncated: false })
    store.documents.set("ent2_users/b", { totalViews: 100, truncated: false })
    store.documents.set("ent2_users/c", { totalViews: 50, truncated: false })
    store.documents.set("ent2_users/d", { totalViews: 500, truncated: true })
    expect((await getRanking("views", 100)).map(entry => entry.totalViews)).toEqual([100, 50, 50])
    expect((await getUserRankPositions(id)).views).toBe(2)
    expect((await getUserRankPositions("c")).views).toBe(2)
  })
})
