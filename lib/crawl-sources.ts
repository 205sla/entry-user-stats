/**
 * 크롤러가 대상으로 하는 엔트리 작품 목록 종류.
 * 새 목록을 추가하려면 여기에 source 를 등록하고 graphql filter 만 넣으면 됨.
 */

export type CrawlSource = "staffpick" | "popular"

export const CRAWL_SOURCES = ["staffpick", "popular"] as const

export function isCrawlSource(v: string | undefined): v is CrawlSource {
  return !!v && (CRAWL_SOURCES as readonly string[]).includes(v)
}

export interface CrawlSourceConfig {
  /** 화면에 표시할 한글 라벨 */
  label: string
  /** Entry 원본 페이지 URL (참고 링크용) */
  entryUrl: string
  /** GraphQL pageParam.sort 값 */
  sort: string
  /** GraphQL 에 추가로 전달할 filter (staffPicked: true / ranked: true 등) */
  filter: { staffPicked?: boolean; ranked?: boolean }
}

export const CRAWL_SOURCE_CONFIG: Record<CrawlSource, CrawlSourceConfig> = {
  staffpick: {
    label: "스태프 선정",
    entryUrl:
      "https://playentry.org/project/list/staffpick?sort=staffPicked&term=all",
    sort: "staffPicked",
    filter: { staffPicked: true },
  },
  popular: {
    label: "인기 작품",
    entryUrl:
      "https://playentry.org/project/list/popular?sort=ranked&term=all",
    sort: "ranked",
    filter: { ranked: true },
  },
}
