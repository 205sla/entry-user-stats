export default function Loading() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
      <p className="mt-4 text-slate-600">엔트리에서 작품 데이터를 모으는 중…</p>
    </main>
  )
}
