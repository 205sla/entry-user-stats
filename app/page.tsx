import Link from "next/link"
import UrlForm from "@/components/UrlForm"
import { getNicknameIndex } from "@/lib/nickname-index"

// ISR: 5분마다 재검증 (nickname index 캐시와 일치)
export const revalidate = 300

export default async function HomePage() {
  const nicknameIndex = await getNicknameIndex()

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-2xl">
        <header className="mb-10 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900">
            유저 찾기<span className="text-slate-400">.</span>엔트리<span className="text-slate-400">.</span>org
          </h1>
          <p className="mt-3 text-slate-600">
            엔트리 프로필 링크 또는 닉네임으로 작품 통계를 찾아봅니다.
          </p>
        </header>

        <UrlForm nicknameIndex={nicknameIndex} />

        <div className="mt-6 text-center">
          <Link
            href="/ranking"
            className="inline-block rounded-lg border border-slate-300 bg-white px-5 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-50"
          >
            랭킹 보기
          </Link>
        </div>

        <section className="mt-12 space-y-3 text-sm text-slate-500">
          <p>
            예시:{" "}
            <code className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-700">
              https://playentry.org/profile/56136825dadc91e1235b460d
            </code>
          </p>
          <p>
            공개된 프로필 데이터만 조회합니다. 비영리·개인 열람 용도로만 사용하세요.
          </p>
          <p>
            검색한 유저는 랭킹 및 닉네임 검색 결과에 자동으로 등록됩니다.
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
