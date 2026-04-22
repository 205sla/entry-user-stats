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
 *  - FIND_USERSTATUS_BY_USERNAME(id: ObjectId) → 닉네임/총 작품 수
 *  - SELECT_USER_PROJECTS(user, pageParam.start offset) → 전체 작품 리스트
 */

const ENTRY_ORIGIN = "https://playentry.org"
const CSRF_TTL_MS = 10 * 60 * 1000 // 10분

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
  status: {
    project: number
    projectAll: number
    follower: number
    following: number
  }
}

interface CsrfSession {
  token: string
  cookie: string
  acquiredAt: number
}

let cached: CsrfSession | null = null

async function acquireCsrf(): Promise<CsrfSession> {
  if (cached && Date.now() - cached.acquiredAt < CSRF_TTL_MS) {
    return cached
  }

  const res = await fetch(ENTRY_ORIGIN + "/", {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; Ent2Stats/1.0; +https://playentry.org/)",
      "Accept": "text/html,application/xhtml+xml",
      "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8",
    },
    cache: "no-store",
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
  opts: { display?: number; maxCalls?: number } = {},
): Promise<{ total: number; projects: EntryProject[] }> {
  const display = opts.display ?? 50
  const maxCalls = opts.maxCalls ?? 6

  const all: EntryProject[] = []
  const seen = new Set<string>()
  let total = 0
  let start = 0
  let calls = 0

  while (calls < maxCalls) {
    const data = await graphql<UserProjectsPage>(
      "SELECT_USER_PROJECTS",
      USER_PROJECTS_QUERY,
      {
        user: userId,
        pageParam: {
          display,
          sort: "created",
          start,
          order: "desc",
        },
        isOpen: "all",
        term: "all",
      },
    )
    calls++

    const page = data.userProjectList
    total = page.total
    const list = page.list ?? []
    if (list.length === 0) break

    let newCount = 0
    for (const p of list) {
      if (!seen.has(p.id)) {
        seen.add(p.id)
        all.push(p)
        newCount++
      }
    }

    // 전진하지 못하면 (중복만 옴) 종료
    if (newCount === 0) break

    start += list.length
    if (all.length >= total) break
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
  const data = await graphql<UserProjectsPage>(
    "SELECT_USER_PROJECTS",
    USER_PROJECTS_QUERY,
    {
      user: userId,
      pageParam: {
        display: 1,
        sort: "updated",
        start: 0,
        order: "desc",
      },
      isOpen: "all",
      term: "all",
    },
  )
  return data.userProjectList.list?.[0] ?? null
}

// ---------------------------------------------------------------------------
// 프로젝트 목록 (크롤러 용도) — 스태프 선정 / 인기 작품 등
// ---------------------------------------------------------------------------

import { CRAWL_SOURCE_CONFIG, type CrawlSource } from "@/lib/crawl-sources"

export interface ListProject {
  id: string
  user: {
    id: string
    nickname: string
  } | null
}

const PROJECT_LIST_QUERY = /* GraphQL */ `
  query SELECT_PROJECTS(
    $query: String
    $staffPicked: Boolean
    $ranked: Boolean
    $term: String
    $pageParam: PageParam
    $searchType: String
    $searchAfter: JSON
  ) {
    projectList(
      query: $query
      staffPicked: $staffPicked
      ranked: $ranked
      term: $term
      pageParam: $pageParam
      searchType: $searchType
      searchAfter: $searchAfter
    ) {
      total
      list {
        id
        user {
          id
          nickname
        }
      }
      searchAfter
    }
  }
`

interface ProjectListResult {
  projectList: {
    total: number
    list: ListProject[]
    searchAfter: unknown[] | null
  }
}

/**
 * Entry 의 작품 목록을 source 별로 가져온다 (scroll / searchAfter 커서 기반).
 *
 * @param source "staffpick" | "popular" — CRAWL_SOURCE_CONFIG 에 등록된 값
 * @param searchAfter 이전 응답의 searchAfter (첫 호출은 null)
 * @param display 페이지당 작품 수 (기본 50)
 */
export async function fetchProjectList(
  source: CrawlSource,
  searchAfter: unknown[] | null,
  display = 50,
): Promise<{
  total: number
  list: ListProject[]
  searchAfter: unknown[] | null
}> {
  const config = CRAWL_SOURCE_CONFIG[source]

  const variables: Record<string, unknown> = {
    query: "",
    term: "all",
    pageParam: { sort: config.sort, display },
    searchType: "scroll",
    ...config.filter, // staffPicked: true 또는 ranked: true
  }
  if (searchAfter !== null) {
    variables.searchAfter = searchAfter
  }

  const data = await graphql<ProjectListResult>(
    "SELECT_PROJECTS",
    PROJECT_LIST_QUERY,
    variables,
  )

  return {
    total: data.projectList.total,
    list: data.projectList.list ?? [],
    searchAfter: data.projectList.searchAfter ?? null,
  }
}
