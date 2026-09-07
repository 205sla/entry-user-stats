import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { getNicknameIndex } from "@/lib/nickname-index"
import {
  decodeFriendlyNickname,
  normalizeNickname,
} from "@/lib/share-url"

interface PageProps {
  params: Promise<{ nickname: string[] }>
}

export const revalidate = 300

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { nickname: segments } = await params
  const nickname = decodeFriendlyNickname(segments)
  return {
    title: `${nickname} 엔트리 통계`,
    description: `${nickname} 엔트리 유저 정보로 연결합니다.`,
    robots: { index: false, follow: true },
  }
}

export default async function FriendlyProfilePage({ params }: PageProps) {
  const { nickname: segments } = await params
  const nickname = decodeFriendlyNickname(segments).trim()
  const normalized = normalizeNickname(nickname)
  const match = (await getNicknameIndex()).find(
    (entry) => normalizeNickname(entry.nickname) === normalized,
  )

  if (match) redirect(`/u/${match.id}`)

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12 sm:px-6">
      <section className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
        <h1 className="break-words text-2xl font-bold text-slate-900">
          유저를 찾을 수 없어요
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          아직 &lsquo;{nickname}&rsquo; 닉네임이 등록되지 않았습니다. 엔트리
          프로필 URL로 한 번 검색하면 공유 주소가 활성화됩니다.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-700"
        >
          홈에서 검색하기
        </Link>
      </section>
    </main>
  )
}
