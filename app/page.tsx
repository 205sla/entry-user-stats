import Link from "next/link"
import UrlForm from "@/components/UrlForm"
import { SITE_ORIGIN } from "@/lib/share-url"
import { rankingPageHref } from "@/lib/ranking-navigation"
import { RANKING_LABELS, RANKING_TYPES } from "@/lib/ranking-types"
import {
  publicPageMetadata,
  SITE_NAME,
  SITE_TITLE,
  SITE_DESCRIPTION,
} from "@/lib/site-metadata"

export const metadata = publicPageMetadata(SITE_TITLE, SITE_DESCRIPTION, "/")

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE_NAME,
  alternateName: ["유저찾기.엔트리.org", "엔트리 유저 찾기"],
  url: SITE_ORIGIN,
  inLanguage: "ko-KR",
  description: SITE_DESCRIPTION,
}

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-16 sm:px-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="w-full max-w-2xl">
        <header className="mb-10 text-center">
          <h1 className="whitespace-nowrap text-[clamp(1.5rem,7.5vw,2.25rem)] font-bold tracking-tight text-slate-900">
            유저 찾기<span className="text-slate-400">.</span>엔트리<span className="text-slate-400">.</span>org
          </h1>
          <p className="mt-3 text-slate-600">
            엔트리 닉네임이나 프로필 링크로 유저를 찾고, 작품 통계와 랭킹을 확인하세요.
          </p>
        </header>

        <UrlForm />

        <div className="mt-6 text-center">
          <Link
            href="/ranking"
            className="inline-block rounded-lg border border-slate-300 bg-white px-5 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-50"
          >
            랭킹 보기
          </Link>
        </div>

        <section className="mt-10 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          <h2 className="text-base font-semibold text-slate-900">엔트리 유저 랭킹</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            검색된 유저의 공개 정보를 바탕으로 10개 부문의 순위를 보여줍니다.
            팔로워·팔로잉 랭킹은 작품 수와 관계없이 참여할 수 있습니다.
          </p>
          <nav aria-label="부문별 랭킹" className="mt-4 flex flex-wrap gap-2">
            {RANKING_TYPES.map((type) => (
              <Link
                key={type}
                href={rankingPageHref(type)}
                className="rounded-full bg-slate-100 px-3 py-1.5 text-sm text-slate-700 transition hover:bg-brand-50 hover:text-brand-700"
              >
                {RANKING_LABELS[type]}
              </Link>
            ))}
          </nav>
        </section>

        <section className="mt-12 space-y-3 text-sm text-slate-500">
          <p>
            예시:{" "}
            <code className="break-all rounded bg-slate-100 px-1.5 py-0.5 text-slate-700">
              https://playentry.org/profile/56136825dadc91e1235b460d
            </code>
          </p>
          <p>
            공개된 프로필 데이터만 조회합니다. 비영리·개인 열람 용도로만 사용하세요.
          </p>
          <p>
            검색한 유저는 랭킹 및 닉네임 검색 결과에 자동으로 등록됩니다.
          </p>
          <p>
            닉네임 검색은 등록된 유저를 대상으로 초성·한/영 키보드 오타도 찾아줍니다.
            처음 찾는 유저는 프로필 링크로 검색해 주세요.
          </p>
        </section>

        <p className="mt-8 text-center text-xs text-slate-400">
          원작:{" "}
          <a
            href="https://github.com/gnlow/Ent2ml"
            target="_blank"
            rel="noreferrer"
            className="underline hover:text-slate-600"
          >
            gnlow/Ent2ml
          </a>{" "}
          · 본 프로젝트는 위 작품을 참고해 Next.js로 재구성한 비공식 클론입니다.
        </p>
      </div>
    </main>
  )
}
