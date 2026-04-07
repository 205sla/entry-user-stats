import Link from "next/link"

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6">
      <h1 className="text-2xl font-bold text-slate-900">유저를 찾을 수 없습니다</h1>
      <p className="mt-2 text-slate-600">
        입력한 링크 또는 ID에 해당하는 엔트리 유저가 없습니다.
      </p>
      <Link
        href="/"
        className="mt-6 rounded-lg bg-brand-600 px-5 py-2.5 text-white transition hover:bg-brand-700"
      >
        홈으로
      </Link>
    </main>
  )
}
