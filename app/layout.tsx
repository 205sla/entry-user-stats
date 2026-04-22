import type { Metadata } from "next"
import "./globals.css"
import ToolsFamilyLink from "@/components/ToolsFamilyLink"

const SITE_URL = "https://xn--ok0bx68bhtav5k.xn--oy2b95t44j.org"
const SITE_NAME = "유저 찾기.엔트리.org"
const DESCRIPTION = "엔트리 프로필 링크를 붙여넣으면 작품 통계를 보여줍니다."

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — 엔트리 유저 통계`,
    template: `%s — ${SITE_NAME}`,
  },
  description: DESCRIPTION,
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: `${SITE_NAME} — 엔트리 유저 통계`,
    description: DESCRIPTION,
    locale: "ko_KR",
    url: SITE_URL,
  },
  twitter: {
    card: "summary",
    title: `${SITE_NAME} — 엔트리 유저 통계`,
    description: DESCRIPTION,
  },
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
  },
}

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE_NAME,
  url: SITE_URL,
  description: DESCRIPTION,
  potentialAction: {
    "@type": "SearchAction",
    target: `${SITE_URL}/u/{search_term_string}`,
    "query-input": "required name=search_term_string",
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="min-h-screen font-sans">
        {children}
        <footer className="border-t border-slate-200 bg-white px-6 py-8 text-center text-xs leading-relaxed text-slate-500">
          <div className="mb-6 flex justify-center">
            <ToolsFamilyLink />
          </div>
          <p>
            이 페이지는{" "}
            <a
              href="https://playentry.org"
              target="_blank"
              rel="noreferrer"
              className="underline hover:text-slate-700"
            >
              엔트리(playentry.org)
            </a>{" "}
            공식 서비스가 아니며, 엔트리와 아무런 제휴·연관이 없습니다.
          </p>
          <p className="mt-1">
            공개된 프로필 정보만 조회하는 비공식 통계 도구이며, 비영리·개인
            열람 용도로만 사용하세요.
          </p>
        </footer>
      </body>
    </html>
  )
}
