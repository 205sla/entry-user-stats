/**
 * 랭킹 관련 타입과 상수.
 * Firestore 서버 SDK 의존 없이 클라이언트/서버 양쪽에서 안전하게 import 가능.
 */

export type RankingType =
  | "views"
  | "likes"
  | "comments"
  | "clones"
  | "blocks"
  | "activity"
  | "popular"
  | "staff"
  | "followers"
  | "following"

export const RANKING_TYPES: RankingType[] = [
  "views",
  "likes",
  "comments",
  "clones",
  "blocks",
  "activity",
  "popular",
  "staff",
  "followers",
  "following",
]

/** RankingType → 한글 라벨 (UI 전역에서 사용) */
export const RANKING_LABELS: Record<RankingType, string> = {
  views: "조회수",
  likes: "좋아요",
  comments: "댓글",
  clones: "사본",
  blocks: "사용 블록",
  activity: "활동 기간",
  popular: "인기 작품",
  staff: "스태프 선정",
  followers: "팔로워",
  following: "팔로잉",
}

export const RANKING_DESCRIPTIONS: Record<RankingType, string> = {
  views: "작품 조회수의 합이 가장 많은 유저",
  likes: "작품 좋아요의 합이 가장 많은 유저",
  comments: "작품 댓글의 합이 가장 많은 유저",
  clones: "작품 사본의 합이 가장 많은 유저",
  blocks: "작품에서 사용한 블록 수의 합이 가장 많은 유저",
  activity: "엔트리 가입 후 가장 오래 활동한 유저",
  popular: "인기 작품으로 선정된 작품이 가장 많은 유저",
  staff: "스태프 선정 작품이 가장 많은 유저",
  followers: "팔로워 수가 가장 많은 유저",
  following: "팔로잉 수가 가장 많은 유저",
}

/** 프로필에서 직접 얻는 값은 작품 집계 한도와 관계없이 정확하다. */
export function isProfileRanking(type: RankingType): boolean {
  return type === "activity" || type === "followers" || type === "following"
}

export function parseRankingType(value: string | string[] | undefined): RankingType {
  return typeof value === "string" && RANKING_TYPES.includes(value as RankingType)
    ? (value as RankingType)
    : "views"
}

export interface RankingEntry {
  id: string
  nickname: string
  totalProjects: number
  totalViews: number
  totalLikes: number
  totalComments: number
  totalClones: number
  totalBlocks: number
  activityDays: number
  popularCount: number
  staffCount: number
  /** 기존 문서에는 없을 수 있다. 미수집 값은 0명과 구분한다. */
  followers: number | null
  following: number | null
  truncated: boolean
  lastRecorded?: string
}

export type UserRankPositions = Partial<Record<RankingType, number>>
