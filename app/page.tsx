import UrlForm from "@/components/UrlForm"

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-2xl">
        <header className="mb-10 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900">
            유저 찾기
          </h1>
          <p className="mt-3 text-slate-600">
            엔트리 프로필 링크를 붙여넣으면 작품 통계를 보여줍니다.
          </p>
        </header>

        <UrlForm />

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
