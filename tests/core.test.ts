import { describe, expect, it } from "vitest"
import { extractEntryId, isValidEntryId } from "../lib/extract-id"
import { thumbUrl } from "../lib/aggregate"
import { searchNicknames, toSearchable } from "../lib/nickname-search"
import { checkRateLimit } from "../lib/rate-limit"
import { entryPictureUrl } from "../lib/entry-media"
import {
  focusedRankingVisibleCount,
  rankingPageHref,
} from "../lib/ranking-navigation"
import {
  decodeFriendlyNickname,
  encodeFriendlyNickname,
  profileShareUrl,
  rankingShareUrl,
} from "../lib/share-url"

describe("공유 URL", () => {
  it("한글 닉네임을 읽을 수 있는 주소로 유지한다", () => {
    expect(profileShareUrl("205님")).toBe(
      "https://유저찾기.엔트리.org/l/205님",
    )
  })

  it("경로 의미를 바꾸는 문자는 이스케이프한다", () => {
    expect(encodeFriendlyNickname("테스트 #1?% ")).toBe(
      "테스트%20%231%3F%25",
    )
  })

  it("Next.js가 넘긴 인코딩 경로를 원래 닉네임으로 복원한다", () => {
    expect(decodeFriendlyNickname(["205%EB%8B%98"])).toBe("205님")
  })

  it("랭킹 부문을 공유 주소에 보존한다", () => {
    expect(rankingShareUrl("views")).toBe(
      "https://유저찾기.엔트리.org/ranking",
    )
    expect(rankingShareUrl("likes")).toBe(
      "https://유저찾기.엔트리.org/ranking?type=likes",
    )
  })
})

describe("랭킹 유저 이동", () => {
  const userId = "56136825dadc91e1235b460d"

  it("랭킹 주소에 대상 유저와 행 앵커를 포함한다", () => {
    expect(rankingPageHref("views", userId)).toBe(
      `/ranking?user=${userId}#ranking-user-${userId}`,
    )
    expect(rankingPageHref("staff", userId)).toBe(
      `/ranking?type=staff&user=${userId}#ranking-user-${userId}`,
    )
  })

  it("대상 유저가 보일 때까지 20명 단위로 목록을 펼친다", () => {
    const entries = Array.from({ length: 80 }, (_, index) => ({
      id: `user-${index}`,
    }))

    expect(focusedRankingVisibleCount(entries, "user-10")).toBe(20)
    expect(focusedRankingVisibleCount(entries, "user-54")).toBe(60)
    expect(focusedRankingVisibleCount(entries, "missing")).toBe(20)
  })
})

describe("입력과 검색", () => {
  it("프로필 URL에서 ObjectId를 추출한다", () => {
    const id = "56136825dadc91e1235b460d"
    expect(extractEntryId(`https://playentry.org/profile/${id}/project`)).toBe(id)
    expect(isValidEntryId(id)).toBe(true)
    expect(isValidEntryId("205님")).toBe(false)
  })

  it("초성과 영문 키보드 오타로 닉네임을 찾는다", () => {
    const entries = toSearchable([
      { id: "1", nickname: "한국", totalProjects: 10, activityDays: 100 },
      { id: "2", nickname: "한강", totalProjects: 5, activityDays: 50 },
    ])
    expect(searchNicknames(entries, "ㅎㄱ").map((entry) => entry.nickname)).toEqual([
      "한국",
      "한강",
    ])
    expect(searchNicknames(entries, "gksrnr")[0]?.nickname).toBe("한국")
  })
})

describe("보호 로직", () => {
  it("요청 제한을 초과하면 거부한다", () => {
    const key = `test:${Math.random()}`
    expect(checkRateLimit(key, { maxRequests: 2 }).allowed).toBe(true)
    expect(checkRateLimit(key, { maxRequests: 2 }).allowed).toBe(true)
    expect(checkRateLimit(key, { maxRequests: 2 }).allowed).toBe(false)
  })

  it("엔트리 호스트의 안전한 썸네일 URL만 허용한다", () => {
    expect(thumbUrl("/uploads/thumb/a.png")).toBe(
      "https://playentry.org/uploads/thumb/a.png",
    )
    expect(thumbUrl("https://example.com/a.png")).toBeNull()
    expect(thumbUrl(null)).toBeNull()
  })

  it("엔트리 사진 객체를 공개 업로드 URL로 안전하게 변환한다", () => {
    expect(
      entryPictureUrl({
        filename: "4c9d5814m0gnt5bt1kkxbc32844be41d",
        imageType: "jpeg",
      }),
    ).toBe(
      "https://playentry.org/uploads/4c/9d/4c9d5814m0gnt5bt1kkxbc32844be41d.jpeg",
    )
    expect(
      entryPictureUrl({ filename: "../../secret", imageType: "png" }),
    ).toBeNull()
    expect(
      entryPictureUrl({ filename: "safe-filename", imageType: "svg" }),
    ).toBeNull()
  })
})
