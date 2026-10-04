/**
 * Entry GraphQL API 클라이언트.
 *
 * 핵심 동작:
 *  1. playentry.org 아무 페이지 HTML을 한 번 가져와 <meta name="csrf-token">과
 *     Set-Cookie 헤더를 추출한다.
 *  2. 이후 GraphQL 요청은 CSRF-Token 헤더 + 같은 쿠키로 보낸다.
 *  3. 토큰+쿠키는 프로세스 메모리에 일정 시간 캐시해 재사용한다.
 *
 * 검증된 쿼리:
 *  - FIND_USERSTATUS_BY_USERNAME(id: ObjectId) → 닉네임/프로필 사진/배경 사진/총 작품 수
 *  - SELECT_USER_PROJECTS(user, pageParam.start offset) → 전체 작품 리스트
 */

import type { EntryPicture } from "./entry-media"

const ENTRY_ORIGIN = "https://playentry.org"
const CSRF_TTL_MS = 10 * 60 * 1000 // 10분
const FETCH_TIMEOUT_MS = 4_500

export interface EntryProject {
  id: string
  name: string
  /** "/uploads/thumb/..." 상대 경로 */
  thumb: string | null
  /** categoryCode 값 (game, arts, living, knowledge, etc, storytelling ...) */
  categoryCode: string | null
  /** null 이면 미선정, DateTime 문자열이면 선정 */
  staffPicked: string | null
  /** null 이면 미선정, DateTime 문자열이면 인기작품 */
  ranked: string | null
  /** 사용 블록 수 근사치. 최신/소형 작품은 null/0. */
  complexity: number | null
  visit: number
  likeCnt: number
  comment: number
  childCnt: number
  created: string
  updated: string | null
  isopen: boolean
}

export interface EntryUserStatus {
  id: string
  nickname: string
  username: string
  role: string
  created: string
  profileImage: EntryPicture | null
  coverImage: EntryPicture | null
  status?: {
    project: number
    projectAll: number
    follower?: number | null
    following?: number | null
  } | null
}

interface CsrfSession {
  token: string
  cookie: string
  acquiredAt: number
}

let cached: CsrfSession | null = null
let csrfRequest: Promise<CsrfSession> | null = null

async function requestCsrf(): Promise<CsrfSession> {
  const res = await fetch(ENTRY_ORIGIN + "/", {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; Ent2Stats/1.0; +https://playentry.org/)",
      "Accept": "text/html,application/xhtml+xml",
      "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8",
    },
    cache: "no-store",
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  })

  if (!res.ok) {
    throw new Error(`entry home fetch failed: ${res.status}`)
  }

  const html = await res.text()
  const tokenMatch = html.match(
    /<meta[^>]+name=["']csrf-token["'][^>]+content=["']([^"']+)["']/i,
  )
  if (!tokenMatch) {
    throw new Error("csrf-token meta not found")
  }
  const token = tokenMatch[1]

  // Set-Cookie 여러 개를 합쳐 단일 Cookie 헤더 값으로 변환
  const setCookies = res.headers.getSetCookie?.() ?? []
  const cookie = setCookies
    .map((c) => c.split(";")[0])
    .filter(Boolean)
    .join("; ")

  cached = { token, cookie, acquiredAt: Date.now() }
  return cached
}

async function acquireCsrf(): Promise<CsrfSession> {
  if (cached && Date.now() - cached.acquiredAt < CSRF_TTL_MS) {
    return cached
  }
  if (csrfRequest) return csrfRequest

  csrfRequest = requestCsrf()
  try {
    return await csrfRequest
  } finally {
    csrfRequest = null
  }
}

/** 세션 정보로 단일 GraphQL fetch 를 수행하고 파싱된 data 를 반환한다. */
async function graphqlFetch<T>(
  operationName: string,
  body: string,
  session: CsrfSession,
): Promise<T> {
  const res = await fetch(`${ENTRY_ORIGIN}/graphql/${operationName}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "CSRF-Token": session.token,
      "X-Client-Type": "Client",
      "Cookie": session.cookie,
      "Origin": ENTRY_ORIGIN,
      "Referer": ENTRY_ORIGIN + "/",
      "User-Agent":
        "Mozilla/5.0 (compatible; Ent2Stats/1.0; +https://playentry.org/)",
    },
    body,
    cache: "no-store",
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  })

  if (!res.ok) {
    throw Object.assign(new Error(`graphql ${operationName} failed: ${res.status}`), {
      status: res.status,
    })
  }
  const json = await res.json()
  if (json.errors) {
    throw new Error(
      `graphql ${operationName} errors: ${JSON.stringify(json.errors)}`,
    )
  }
  return json.data as T
}

/** CSRF 세션으로 GraphQL 요청. 403 시 세션 갱신 후 1회 재시도. */
async function graphql<T>(
  operationName: string,
  query: string,
  variables: Record<string, unknown>,
): Promise<T> {
  const body = JSON.stringify({ operationName, query, variables })

  try {
    const session = await acquireCsrf()
    return await graphqlFetch<T>(operationName, body, session)
  } catch (err) {
    if (err instanceof Error && (err as { status?: number }).status === 403) {
      // 세션 만료 가능성 → 캐시 무효화 후 1회 재시도
      cached = null
      const freshSession = await acquireCsrf()
      return graphqlFetch<T>(operationName, body, freshSession)
    }
    throw err
  }
}

const USERSTATUS_QUERY = /* GraphQL */ `
  query FIND_USERSTATUS_BY_USERNAME($id: String) {
    userstatus(id: $id) {
      id
      nickname
      username
      role
      created
      profileImage {
        filename
        imageType
      }
      coverImage {
        filename
        imageType
      }
      status {
        project
        projectAll
        follower
        following
      }
    }
  }
`

export async function fetchUserStatus(
  id: string,
): Promise<EntryUserStatus | null> {
  const data = await graphql<{ userstatus: EntryUserStatus | null }>(
    "FIND_USERSTATUS_BY_USERNAME",
    USERSTATUS_QUERY,
    { id },
  )
  return data.userstatus ?? null
}

const USER_PROJECTS_QUERY = /* GraphQL */ `
  query SELECT_USER_PROJECTS(
    $user: String!
    $pageParam: PageParam
    $isOpen: String
    $term: String
  ) {
    userProjectList(
      user: $user
      pageParam: $pageParam
      isOpen: $isOpen
      term: $term
    ) {
      total
      list {
        id
        name
        thumb
        categoryCode
        staffPicked
        ranked
        complexity
        visit
        likeCnt
        comment
        childCnt
        created
        updated
        isopen
      }
    }
  }
`

interface UserProjectsPage {
  userProjectList: {
    total: number
    list: EntryProject[]
  }
}

async function fetchUserProjectsPage(
  userId: string,
  start: number,
  display: number,
  sort: "created" | "updated" = "created",
): Promise<UserProjectsPage["userProjectList"]> {
  const data = await graphql<UserProjectsPage>(
    "SELECT_USER_PROJECTS",
    USER_PROJECTS_QUERY,
    {
      user: userId,
      pageParam: {
        display,
        sort,
        start,
        order: "desc",
      },
      isOpen: "all",
      term: "all",
    },
  )
  return data.userProjectList
}

/**
 * 한 유저의 작품 목록을 offset 페이지네이션으로 가져온다.
 * - 50개씩 페이지로 요청
 * - list가 비거나 누적이 total에 도달하면 종료
 * - 최대 maxCalls번까지만 호출 (하드 캡, 기본 6회 = 300개)
 *
 * 반환되는 total은 엔트리 API가 응답한 전체 작품 수이므로,
 * total > projects.length 인 경우 일부만 집계된 것이다.
 */
export async function fetchAllUserProjects(
  userId: string,
  opts: {
    display?: number
    maxCalls?: number
    stopWhenTotalExceeds?: number
  } = {},
): Promise<{ total: number; projects: EntryProject[] }> {
  const display = Math.min(100, Math.max(1, Math.floor(opts.display ?? 50)))
  const maxCalls = Math.min(20, Math.max(1, Math.floor(opts.maxCalls ?? 6)))

  const all: EntryProject[] = []
  const seen = new Set<string>()
  const firstPage = await fetchUserProjectsPage(userId, 0, display)
  const total = firstPage.total

  function append(list: EntryProject[]) {
    for (const p of list) {
      if (!seen.has(p.id)) {
        seen.add(p.id)
        all.push(p)
      }
    }
  }

  append(firstPage.list ?? [])

  // 상세 집계를 표시하지 않는 대형 계정은 첫 페이지에서 즉시 중단한다.
  if (
    opts.stopWhenTotalExceeds !== undefined &&
    total > opts.stopWhenTotalExceeds
  ) {
    return { total, projects: all }
  }

  const pageCount = Math.min(maxCalls, Math.ceil(total / display))
  if (pageCount <= 1) return { total, projects: all }

  // 서로 독립적인 나머지 offset 페이지를 병렬 요청해 서버리스 실행 시간을 줄인다.
  const remainingPages = await Promise.all(
    Array.from({ length: pageCount - 1 }, (_, index) =>
      fetchUserProjectsPage(userId, (index + 1) * display, display),
    ),
  )
  for (const page of remainingPages) {
    append(page.list ?? [])
  }

  return { total, projects: all }
}

/**
 * 한 유저의 "가장 최근 수정(updated) 작품" 한 건만 가져온다.
 * truncated 유저(>200)의 최근 활동을 표시하기 위한 타겟 호출.
 */
export async function fetchLatestUpdatedProject(
  userId: string,
): Promise<EntryProject | null> {
  const page = await fetchUserProjectsPage(userId, 0, 1, "updated")
  return page.list?.[0] ?? null
}
