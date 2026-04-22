import Link from "next/link"
import { notFound } from "next/navigation"
import { getCrawlState } from "@/lib/crawl-state"
import {
  CRAWL_SOURCE_CONFIG,
  isCrawlSource,
} from "@/lib/crawl-sources"
import CrawlerClient from "./CrawlerClient"

// 매번 최신 상태 로드
export const dynamic = "force-dynamic"

interface PageProps {
  params: Promise<{ source: string }>
}

export async function generateMetadata({ params }: PageProps) {
  const { source } = await params
  if (!isCrawlSource(source)) {
    return { title: "크롤러", robots: { index: false, follow: false } }
  }
  const config = CRAWL_SOURCE_CONFIG[source]
  return {
    title: `크롤러 — ${config.label}`,
    robots: { index: false, follow: false },
  }
}

interface StatePublic {
  phase: string
  listTotal: number
  listFetched: number
  queueLength: number
  processedCount: number
  seenCount: number
  failedCount: number
  lastError: string | null
  lastBatchAt: string | null
}

export default async function CrawlerPage({ params }: PageProps) {
  const { source } = await params
  if (!isCrawlSource(source)) notFound()

  const config = CRAWL_SOURCE_CONFIG[source]

  let initialState: StatePublic
  let loadError: string | null = null
  try {
    const s = await getCrawlState(source)
    initialState = {
      phase: s.phase,
      listTotal: s.listTotal,
      listFetched: s.listFetched,
      queueLength: s.queue.length,
      processedCount: s.processedCount,
      seenCount: s.seenUserIds.length,
      failedCount: s.failedIds.length,
      lastError: s.lastError,
      lastBatchAt: s.lastBatchAt?.toDate?.().toISOString() ?? null,
    }
  } catch (err) {
    loadError = err instanceof Error ? err.message : String(err)
    initialState = {
      phase: "idle",
      listTotal: 0,
      listFetched: 0,
      queueLength: 0,
      processedCount: 0,
      seenCount: 0,
      failedCount: 0,
      lastError: null,
      lastBatchAt: null,
    }
  }

  return (
    <main className="min-h-screen px-6 py-12">
      <div className="mx-auto max-w-3xl">
        <header className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {config.label} 크롤러
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            대상:{" "}
            <a
              href={config.entryUrl}
              target="_blank"
              rel="noreferrer"
              className="underline hover:text-brand-600"
            >
              엔트리 {config.label} 전체
            </a>
          </p>
          <p className="mt-1 text-xs text-slate-500">
            작품 제작자를 자동으로{" "}
            <code className="rounded bg-slate-100 px-1">ent2_users</code>{" "}
            컬렉션에 등록합니다.
          </p>
        </header>

        {loadError ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-800">
            <p className="font-semibold">상태 로드 실패</p>
            <pre className="mt-2 overflow-x-auto whitespace-pre-wrap text-xs">
              {loadError}
            </pre>
            <p className="mt-3 text-xs">
              Firebase 자격 증명이나 Firestore 접근 권한을 확인해 주세요.
            </p>
          </div>
        ) : (
          <CrawlerClient source={source} initialState={initialState} />
        )}

        <nav className="mt-12 border-t border-slate-200 pt-6">
          <Link
            href="/"
            className="text-xs text-slate-400 transition hover:text-slate-600"
          >
            ← 홈
          </Link>
        </nav>
      </div>
    </main>
  )
}
