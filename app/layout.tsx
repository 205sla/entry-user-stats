import type { Metadata } from "next"
import "./globals.css"
import ToolsFamilyLink from "@/components/ToolsFamilyLink"
import { SITE_ORIGIN } from "@/lib/share-url"
import { SITE_NAME, SITE_TITLE, SITE_DESCRIPTION } from "@/lib/site-metadata"

export const metadata: Metadata = {
  metadataBase: new URL(SITE_ORIGIN),
  title: {
    default: SITE_TITLE,
    template: `%s — ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    locale: "ko_KR",
    url: SITE_ORIGIN,
  },
  twitter: {
    card: "summary",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
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
