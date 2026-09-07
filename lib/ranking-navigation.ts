import { isValidEntryId } from "./extract-id"
import type { RankingEntry, RankingType } from "./ranking-types"

export const RANKING_PAGE_SIZE = 20

export function normalizeFocusedUserId(
  value: string | undefined,
): string | undefined {
  return value && isValidEntryId(value) ? value.toLowerCase() : undefined
}

/** 랭킹 부문과 강조할 유저를 함께 보존하는 내부 이동 주소. */
export function rankingPageHref(
  type: RankingType,
  userId?: string,
): string {
  const focusedUserId = normalizeFocusedUserId(userId)
  const params = new URLSearchParams()

  if (type !== "views") params.set("type", type)
  if (focusedUserId) params.set("user", focusedUserId)

  const query = params.toString()
  const hash = focusedUserId ? `#ranking-user-${focusedUserId}` : ""
  return `/ranking${query ? `?${query}` : ""}${hash}`
}

/** 대상 행이 접힌 20명 단위 목록 안에 있으면 필요한 만큼 미리 펼친다. */
export function focusedRankingVisibleCount(
  entries: readonly Pick<RankingEntry, "id">[],
  focusedUserId?: string,
): number {
  if (!focusedUserId) return RANKING_PAGE_SIZE

  const index = entries.findIndex((entry) => entry.id === focusedUserId)
  if (index < 0) return RANKING_PAGE_SIZE

  return Math.max(
    RANKING_PAGE_SIZE,
    Math.ceil((index + 1) / RANKING_PAGE_SIZE) * RANKING_PAGE_SIZE,
  )
}
