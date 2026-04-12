/**
 * 랭킹 관련 타입과 상수.
 * firebase-admin 의존 없이 클라이언트/서버 양쪽에서 안전하게 import 가능.
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

export const RANKING_TYPES: RankingType[] = [
  "views",
  "likes",
  "comments",
  "clones",
  "blocks",
  "activity",
  "popular",
  "staff",
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
  truncated: boolean
}

export type UserRankPositions = Partial<Record<RankingType, number>>
