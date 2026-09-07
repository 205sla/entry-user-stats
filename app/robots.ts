import type { MetadataRoute } from "next"

const SITE_URL = "https://xn--ok0bx68bhtav5k.xn--oy2b95t44j.org"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: "/api/",
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
