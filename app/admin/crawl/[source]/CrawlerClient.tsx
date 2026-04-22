"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type { CrawlSource } from "@/lib/crawl-sources"

const POLL_INTERVAL_MS = 5000

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

interface Props {
  source: CrawlSource
  initialState: StatePublic
}

async function callStep(
  source: CrawlSource,
  action: "step" | "reset",
): Promise<StatePublic> {
  const res = await fetch(`/api/crawl/${source}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action }),
    cache: "no-store",
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`HTTP ${res.status}: ${text}`)
  }
  return res.json()
}

const fmt = (n: number) => n.toLocaleString("ko-KR")

function formatTime(iso: string | null): string {
  if (!iso) return "-"
  const d = new Date(iso)
  if (isNaN(d.getTime())) return "-"
  return d.toLocaleTimeString("ko-KR")
}

export default function CrawlerClient({ source, initialState }: Props) {
  const [state, setState] = useState<StatePublic>(initialState)
  const [running, setRunning] = useState(initialState.phase !== "done")
  const [error, setError] = useState<string | null>(null)
  const inflightRef = useRef(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const step = useCallback(async () => {
    if (inflightRef.current) return
    inflightRef.current = true
    try {
      const next = await callStep(source, "step")
      setState(next)
      setError(null)
      if (next.phase === "done") {
        setRunning(false)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(msg)
    } finally {
      inflightRef.current = false
    }
  }, [source])

  useEffect(() => {
    if (!running) return
    if (state.phase === "done") return

    step()
    timerRef.current = setInterval(step, POLL_INTERVAL_MS)

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [running, state.phase, step])

  async function handleReset() {
    if (!confirm("정말 처음부터 다시 시작할까요? 현재 상태가 삭제됩니다.")) return
    try {
      const fresh = await callStep(source, "reset")
      setState(fresh)
      setError(null)
      setRunning(true)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(msg)
    }
  }

  function togglePause() {
    setRunning((r) => !r)
  }

  const listPct =
    state.listTotal > 0
      ? Math.min(100, (state.listFetched / state.listTotal) * 100)
      : 0
  const userPct =
    state.seenCount > 0
      ? Math.min(100, (state.processedCount / state.seenCount) * 100)
      : 0

  const isDone = state.phase === "done"

  return (
    <div className="space-y-6">
      {isDone ? (
        <section className="rounded-2xl bg-emerald-50 p-6 ring-1 ring-emerald-200">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-white text-xl">
              ✓
            </div>
            <div>
              <h2 className="text-lg font-bold text-emerald-900">크롤 완료</h2>
              <p className="text-sm text-emerald-800">
                모든 작품을 스캔하고 유저 등록을 마쳤어요.
              </p>
            </div>
          </div>
        </section>
      ) : (
        <section
          className={`rounded-2xl p-5 ring-1 ${
            running
              ? "bg-sky-50 ring-sky-200"
              : "bg-slate-50 ring-slate-200"
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`h-3 w-3 rounded-full ${
                running ? "animate-pulse bg-sky-500" : "bg-slate-400"
              }`}
            />
            <p className="text-sm font-medium">
              {running ? "진행 중..." : "일시정지"}
            </p>
            <span className="ml-auto text-xs text-slate-500">
              최근 batch: {formatTime(state.lastBatchAt)}
            </span>
          </div>
        </section>
      )}

      <section className="space-y-4 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
        <div>
          <div className="mb-1.5 flex items-baseline justify-between text-sm">
            <span className="font-medium text-slate-700">목록 스캔</span>
            <span className="tabular-nums text-slate-500">
              {fmt(state.listFetched)} / {fmt(state.listTotal)}
              <span className="ml-2 text-xs">({listPct.toFixed(1)}%)</span>
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full bg-sky-500 transition-all"
              style={{ width: `${listPct}%` }}
            />
          </div>
        </div>

        <div>
          <div className="mb-1.5 flex items-baseline justify-between text-sm">
            <span className="font-medium text-slate-700">유저 처리</span>
            <span className="tabular-nums text-slate-500">
              {fmt(state.processedCount)} / {fmt(state.seenCount)}
              <span className="ml-2 text-xs">({userPct.toFixed(1)}%)</span>
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full bg-emerald-500 transition-all"
              style={{ width: `${userPct}%` }}
            />
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-3 pt-2 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-xs text-slate-500">큐 대기</dt>
            <dd className="font-semibold tabular-nums text-slate-900">
              {fmt(state.queueLength)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">등록 완료</dt>
            <dd className="font-semibold tabular-nums text-emerald-600">
              {fmt(state.processedCount)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">실패</dt>
            <dd className="font-semibold tabular-nums text-rose-600">
              {fmt(state.failedCount)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">상태</dt>
            <dd className="font-semibold text-slate-900">{state.phase}</dd>
          </div>
        </dl>
      </section>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          <strong>에러:</strong> {error}
        </div>
      )}

      {state.lastError && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <strong>마지막 배치 에러:</strong> {state.lastError}
        </div>
      )}

      <div className="flex gap-3">
        {!isDone && (
          <button
            type="button"
            onClick={togglePause}
            className="rounded-lg border border-slate-300 bg-white px-5 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            {running ? "⏸ Pause" : "▶ Resume"}
          </button>
        )}
        <button
          type="button"
          onClick={handleReset}
          className="rounded-lg border border-rose-200 bg-white px-5 py-2 text-sm font-medium text-rose-700 shadow-sm transition hover:bg-rose-50"
        >
          🔄 Reset (처음부터)
        </button>
      </div>

      <p className="text-xs leading-relaxed text-slate-500">
        탭을 닫아도 상태는 Firestore 에 저장되고, 다시 이 페이지를 열면 이어서
        진행됩니다. 5초마다 한 batch 씩 실행됩니다.
      </p>
    </div>
  )
}
