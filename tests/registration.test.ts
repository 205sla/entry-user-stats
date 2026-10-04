import { beforeEach, afterEach, expect, it, vi } from "vitest"
import { aggregate } from "../lib/aggregate"
import { getStatsForUser } from "../lib/stats-service"
import { FakeFirestore } from "./firestore-fake"
import type { EntryUserStatus } from "../lib/entry-api"

const mocks = vi.hoisted(() => ({
  after: vi.fn(), getDb: vi.fn(), fetchUserStatus: vi.fn(), fetchAllUserProjects: vi.fn(), revalidateTag: vi.fn(),
}))
vi.mock("next/server", () => ({ after: mocks.after }))
vi.mock("next/cache", () => ({ unstable_cache: (fn: unknown) => fn, revalidateTag: mocks.revalidateTag }))
vi.mock("@/lib/firebase", () => ({ getDb: mocks.getDb }))
vi.mock("@/lib/entry-api", () => ({
  fetchUserStatus: mocks.fetchUserStatus,
  fetchAllUserProjects: mocks.fetchAllUserProjects,
  fetchLatestUpdatedProject: vi.fn(),
}))

function user(id: string): EntryUserStatus {
  return { id, nickname: "재검색 테스트", username: "test", role: "member",
    created: "2020-01-01T00:00:00Z", profileImage: null, coverImage: null,
    status: { project: 0, projectAll: 0, follower: 120, following: 45 } }
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.fetchAllUserProjects.mockResolvedValue({ total: 0, projects: [] })
  vi.useFakeTimers()
  vi.setSystemTime(new Date("2026-10-04T12:00:00Z"))
})
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks() })

async function finishResponses() {
  const callbacks = mocks.after.mock.calls.map(([callback]) => callback as () => Promise<void>)
  mocks.after.mockClear()
  await Promise.all(callbacks.map(callback => callback()))
}

it.each([undefined, null])("원본 status가 %s이면 미수집 상태를 유지한다", status => {
  const stats = aggregate({ ...user("missing"), status }, [], 0)
  expect(stats.user.followers).toBeNull()
  expect(stats.user.following).toBeNull()
})

it("한쪽 수치만 누락된 응답에서도 실제 0명을 보존한다", () => {
  const stats = aggregate({ ...user("partial"), status: { project: 0, projectAll: 0, follower: 0 } }, [], 0)
  expect(stats.user.followers).toBe(0)
  expect(stats.user.following).toBeNull()
})

it("첫 응답 직후 겹친 캐시 검색도 실제 저장은 한 번만 한다", async () => {
  const profile = user("aaaaaaaaaaaaaaaaaaaaaaaa")
  const store = new FakeFirestore()
  mocks.getDb.mockReturnValue(store.asFirestore())
  mocks.fetchUserStatus.mockResolvedValue(profile)
  await getStatsForUser(profile.id)
  const cached = await Promise.all([getStatsForUser(profile.id), getStatsForUser(profile.id)])
  expect(cached.every(result => result?.cached)).toBe(true)
  await finishResponses()
  expect(store.commits).toHaveLength(1)
  expect(mocks.fetchUserStatus).toHaveBeenCalledTimes(1)
})

it("원자적 저장 실패 뒤 캐시 재검색은 API 재호출 없이 등록을 복구한다", async () => {
  vi.spyOn(console, "warn").mockImplementation(() => {})
  const profile = user("bbbbbbbbbbbbbbbbbbbbbbbb")
  const store = new FakeFirestore()
  mocks.getDb.mockReturnValue(store.asFirestore())
  mocks.fetchUserStatus.mockResolvedValue(profile)
  store.failCommitContaining = "ent2_index/"
  await getStatsForUser(profile.id)
  await finishResponses()
  expect(store.documents.has(`ent2_users/${profile.id}`)).toBe(false)
  expect((await getStatsForUser(profile.id))?.cached).toBe(true)
  await finishResponses()
  expect(store.documents.get(`ent2_users/${profile.id}`)).toMatchObject({ followers: 120, following: 45 })
  expect(mocks.fetchUserStatus).toHaveBeenCalledTimes(1)
  expect(store.commits).toHaveLength(1)
})

it("30분 캐시 만료 후 누락 수치만 보완하며 1시간 기록 간격은 유지한다", async () => {
  const profile = user("cccccccccccccccccccccccc")
  const store = new FakeFirestore()
  mocks.getDb.mockReturnValue(store.asFirestore())
  mocks.fetchUserStatus.mockResolvedValue({ ...profile, status: null })
  await getStatsForUser(profile.id)
  await finishResponses()
  const recorded = store.documents.get(`ent2_users/${profile.id}`)?.lastRecorded

  vi.setSystemTime(new Date("2026-10-04T12:31:00Z"))
  mocks.fetchUserStatus.mockResolvedValue(profile)
  expect((await getStatsForUser(profile.id))?.cached).toBe(false)
  await finishResponses()
  expect(store.documents.get(`ent2_users/${profile.id}`)).toMatchObject({ followers: 120, following: 45, lastRecorded: recorded })

  vi.setSystemTime(new Date("2026-10-04T13:02:00Z"))
  mocks.fetchUserStatus.mockResolvedValue({ ...profile, status: { ...profile.status, follower: 100, following: 40 } })
  await getStatsForUser(profile.id)
  await finishResponses()
  expect(store.documents.get(`ent2_users/${profile.id}`)).toMatchObject({ followers: 100, following: 40 })
  expect(mocks.fetchUserStatus).toHaveBeenCalledTimes(3)
})
