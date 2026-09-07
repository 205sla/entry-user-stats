import type { MetadataRoute } from "next"

const SITE_URL = "https://xn--ok0bx68bhtav5k.xn--oy2b95t44j.org"

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE_URL,
      changeFrequency: "monthly",
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/ranking`,
      changeFrequency: "hourly",
      priority: 0.9,
    },
  ]
}
