import type { EntryProject, EntryUserStatus } from "./entry-api"

/**
 * 정확한 통계를 표시할 수 있는 최대 작품 수.
 * fetchAllUserProjects 의 maxCalls(4) × display(50) 와 반드시 일치해야 한다.
 */
export const MAX_PROJECTS = 200

/** 엔트리 categoryCode → 한글 라벨 매핑 */
const CATEGORY_LABELS: Record<string, string> = {
  game: "게임",
  living: "생활과 도구",
  storytelling: "스토리텔링",
  arts: "예술",
  knowledge: "지식 공유",
  etc: "기타",
  animation: "애니메이션",
  media: "미디어아트",
  physical: "피지컬",
  embed: "임베디드",
  education: "교육",
}

function labelForCategory(code: string | null): string {
  if (!code) return "미분류"
  return CATEGORY_LABELS[code] ?? code
}

export function thumbUrl(thumb: string | null): string | null {
  if (!thumb) return null
  if (thumb.startsWith("http")) return thumb
  return "https://playentry.org" + thumb
}

export function projectUrl(id: string): string {
  return `https://playentry.org/project/${id}`
}

export interface ProjectCard {
  id: string
  name: string
  thumb: string | null
  url: string
  visit: number
  likeCnt: number
  comment: number
  childCnt: number
  categoryCode: string | null
  categoryLabel: string
  staffPicked: boolean
  ranked: boolean
}

export interface CategoryStat {
  code: string
  label: string
  count: number
  views: number
  likes: number
}

export interface FlagsBreakdown {
  /** 스태프 ∩ 인기 둘 다 선정 */
  both: number
  /** 스태프 선정만 */
  staffOnly: number
  /** 인기 작품만 */
  rankedOnly: number
  /** 어떤 플래그도 없음 */
  normal: number
}

export interface LatestActivity {
  /** updated ?? created (ISO) */
  at: string
  project: ProjectCard
}

export interface AggregatedStats {
  user: {
    id: string
    nickname: string
    role: string
    created: string
    followers: number
    following: number
  }
  /** 가장 최근 수정된 작품 (truncated 유저는 별도 타겟 호출 결과, 아니면 현재 fetched 세트에서 선택) */
  latestActivity: LatestActivity | null
  totals: {
    projects: number
    staffPicked: number
    ranked: number
    views: number
    likes: number
    comments: number
    clones: number
    /** complexity > 0 인 작품들의 합 (null·0 은 무시) */
    totalBlocks: number
    /** 가입일로부터 현재까지의 활동 기간 (한글, 예: "9년 2개월") */
    activityPeriod: string
  }
  flags: FlagsBreakdown
  categories: CategoryStat[]
  topByViews: ProjectCard[]
  topByLikes: ProjectCard[]
  byYear: Array<{ year: string; count: number }>
  /** 엔트리 API 가 응답한 전체 작품 수 (페이지네이션 이전의 원래 값) */
  totalProjects: number
  /** totalProjects > MAX_PROJECTS 라서 일부만 집계된 상태 */
  truncated: boolean
}

function yearOf(iso: string): string {
  if (!iso) return "?"
  const d = new Date(iso)
  if (isNaN(d.getTime())) return "?"
  return String(d.getFullYear())
}

/** 일 수를 한글 기간 문자열로 변환 ("3일", "2개월", "1년 5개월") */
export function formatDays(days: number): string {
  if (days < 0) return "-"
  if (days < 30) return `${days}일`
  const totalMonths = Math.floor(days / 30.44)
  const years = Math.floor(totalMonths / 12)
  const months = totalMonths % 12
  if (years === 0) return `${totalMonths}개월`
  if (months === 0) return `${years}년`
  return `${years}년 ${months}개월`
}

/** 가입일(ISO) 기준 현재까지의 활동 기간을 한글로 포맷 */
function formatActivityPeriod(createdIso: string): string {
  if (!createdIso) return "-"
  const start = new Date(createdIso).getTime()
  if (isNaN(start)) return "-"
  const diffMs = Date.now() - start
  if (diffMs < 0) return "-"
  return formatDays(Math.floor(diffMs / (1000 * 60 * 60 * 24)))
}

function toCard(p: EntryProject): ProjectCard {
  return {
    id: p.id,
    name: p.name,
    thumb: thumbUrl(p.thumb),
    url: projectUrl(p.id),
    visit: p.visit ?? 0,
    likeCnt: p.likeCnt ?? 0,
    comment: p.comment ?? 0,
    childCnt: p.childCnt ?? 0,
    categoryCode: p.categoryCode,
    categoryLabel: labelForCategory(p.categoryCode),
    staffPicked: !!p.staffPicked,
    ranked: !!p.ranked,
  }
}

export function aggregate(
  user: EntryUserStatus,
  projects: EntryProject[],
  totalProjects: number,
  latestActivityOverride: EntryProject | null = null,
): AggregatedStats {
  let staffPicked = 0
  let ranked = 0
  let views = 0
  let likes = 0
  let comments = 0
  let clones = 0
  let totalBlocks = 0

  // 최근 활동 (updated ?? created) 추적 — override 없을 때만 사용
  let latestAtMs = -Infinity
  let latestProj: EntryProject | null = null

  const flags: FlagsBreakdown = {
    both: 0,
    staffOnly: 0,
    rankedOnly: 0,
    normal: 0,
  }

  const catMap = new Map<string, CategoryStat>()
  const yearMap = new Map<string, number>()

  for (const p of projects) {
    const isStaff = !!p.staffPicked
    const isRanked = !!p.ranked
    if (isStaff) staffPicked++
    if (isRanked) ranked++

    if (isStaff && isRanked) flags.both++
    else if (isStaff) flags.staffOnly++
    else if (isRanked) flags.rankedOnly++
    else flags.normal++

    views += p.visit ?? 0
    likes += p.likeCnt ?? 0
    comments += p.comment ?? 0
    clones += p.childCnt ?? 0
    if (p.complexity && p.complexity > 0) totalBlocks += p.complexity

    const code = p.categoryCode ?? "unknown"
    const label = labelForCategory(p.categoryCode)
    const prev = catMap.get(code)
    if (prev) {
      prev.count++
      prev.views += p.visit ?? 0
      prev.likes += p.likeCnt ?? 0
    } else {
      catMap.set(code, {
        code,
        label,
        count: 1,
        views: p.visit ?? 0,
        likes: p.likeCnt ?? 0,
      })
    }

    const y = yearOf(p.created)
    yearMap.set(y, (yearMap.get(y) ?? 0) + 1)

    const activityIso = p.updated ?? p.created
    const activityMs = new Date(activityIso).getTime()
    if (!isNaN(activityMs) && activityMs > latestAtMs) {
      latestAtMs = activityMs
      latestProj = p
    }
  }

  // override가 있으면(= truncated 케이스의 타겟 호출 결과) 그걸 사용
  let latestActivity: LatestActivity | null = null
  const latestSource = latestActivityOverride ?? latestProj
  if (latestSource) {
    latestActivity = {
      at: latestSource.updated ?? latestSource.created,
      project: toCard(latestSource),
    }
  }

  const topByViews = [...projects]
    .sort((a, b) => (b.visit ?? 0) - (a.visit ?? 0))
    .slice(0, 10)
    .map(toCard)

  const topByLikes = [...projects]
    .sort((a, b) => (b.likeCnt ?? 0) - (a.likeCnt ?? 0))
    .slice(0, 10)
    .map(toCard)

  const categories = [...catMap.values()].sort((a, b) => b.count - a.count)

  const byYear = [...yearMap.entries()]
    .filter(([y]) => y !== "?")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([year, count]) => ({ year, count }))

  return {
    user: {
      id: user.id,
      nickname: user.nickname,
      role: user.role,
      created: user.created,
      followers: user.status?.follower ?? 0,
      following: user.status?.following ?? 0,
    },
    latestActivity,
    totals: {
      projects: projects.length,
      staffPicked,
      ranked,
      views,
      likes,
      comments,
      clones,
      totalBlocks,
      activityPeriod: formatActivityPeriod(user.created),
    },
    flags,
    categories,
    topByViews,
    topByLikes,
    byYear,
    totalProjects,
    truncated: totalProjects > MAX_PROJECTS,
  }
}
