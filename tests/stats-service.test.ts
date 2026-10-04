import { beforeEach, expect, it, vi } from "vitest"
import { aggregate } from "../lib/aggregate"
import { getStatsForUser } from "../lib/stats-service"

const mocks = vi.hoisted(() => ({
  after: vi.fn(),
  recordRanking: vi.fn(),
  cacheGet: vi.fn(),
  cacheSet: vi.fn(),
  fetchUserStatus: vi.fn(),
}))

vi.mock("next/server", () => ({ after: mocks.after }))
vi.mock("next/cache", () => ({ unstable_cache: (fn: unknown) => fn }))
vi.mock("@/lib/ranking", () => ({ recordRanking: mocks.recordRanking }))
vi.mock("@/lib/cache", () => ({ cacheGet: mocks.cacheGet, cacheSet: mocks.cacheSet }))
vi.mock("@/lib/entry-api", () => ({
  fetchUserStatus: mocks.fetchUserStatus,
  fetchAllUserProjects: vi.fn().mockResolvedValue({ total: 0, projects: [] }),
  fetchLatestUpdatedProject: vi.fn(),
}))

const user = {
  id: "56136825dadc91e1235b460d",
  nickname: "테스트 유저",
  username: "test-user",
  role: "member",
  created: "2020-01-01T00:00:00.000Z",
  profileImage: null,
  coverImage: null,
  status: { project: 0, projectAll: 0, follower: 120, following: 45 },
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.recordRanking.mockResolvedValue(undefined)
})

it("캐시로 응답한 재검색도 백그라운드 등록을 시도한다", async () => {
  const stats = aggregate(user, [], 0)
  mocks.cacheGet.mockReturnValue(stats)
  expect(await getStatsForUser(user.id)).toEqual({ stats, cached: true })
  expect(mocks.fetchUserStatus).not.toHaveBeenCalled()
  expect(mocks.recordRanking).not.toHaveBeenCalled()
  await mocks.after.mock.calls[0][0]()
  expect(mocks.recordRanking).toHaveBeenCalledWith(stats)
})

it("동시에 같은 유저를 검색하면 조회와 백그라운드 등록을 합친다", async () => {
  mocks.cacheGet.mockReturnValue(null)
  mocks.fetchUserStatus.mockResolvedValue(user)
  const results = await Promise.all([getStatsForUser(user.id), getStatsForUser(user.id)])
  expect(results[0]?.stats.user.followers).toBe(120)
  expect(results[1]?.stats).toBe(results[0]?.stats)
  expect(mocks.fetchUserStatus).toHaveBeenCalledTimes(1)
  expect(mocks.after).toHaveBeenCalledTimes(1)
  await mocks.after.mock.calls[0][0]()
  expect(mocks.recordRanking).toHaveBeenCalledTimes(1)
})
