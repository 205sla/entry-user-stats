import type { MetadataRoute } from "next"
import { SITE_ORIGIN } from "@/lib/share-url"
import { RANKING_TYPES } from "@/lib/ranking-types"
import { rankingPageHref } from "@/lib/ranking-navigation"

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE_ORIGIN,
      changeFrequency: "monthly",
      priority: 1.0,
    },
    ...RANKING_TYPES.map((type) => ({
      url: `${SITE_ORIGIN}${rankingPageHref(type)}`,
      changeFrequency: "hourly" as const,
      priority: 0.9,
    })),
  ]
}
