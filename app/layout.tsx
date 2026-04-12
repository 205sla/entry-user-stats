import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "유저 찾기 — 엔트리 유저 통계",
  description: "엔트리 프로필 링크를 붙여넣으면 작품 통계를 보여줍니다.",
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
        <footer className="border-t border-slate-200 bg-white px-6 py-6 text-center text-xs leading-relaxed text-slate-500">
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
