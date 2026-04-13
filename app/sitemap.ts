import type { MetadataRoute } from "next"
import { RANKING_TYPES } from "@/lib/ranking-types"

const SITE_URL = "https://xn--ok0bx68bhtav5k.xn--oy2b95t44j.org"

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/ranking`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.9,
    },
  ]

  const rankingTabs: MetadataRoute.Sitemap = RANKING_TYPES.filter(
    (t) => t !== "views",
  ).map((type) => ({
    url: `${SITE_URL}/ranking?type=${type}`,
    lastModified: now,
    changeFrequency: "hourly" as const,
    priority: 0.7,
  }))

  return [...staticPages, ...rankingTabs]
}
