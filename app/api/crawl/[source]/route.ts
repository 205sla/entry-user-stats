/**
 * 크롤러 배치 실행 엔드포인트 (동적 source 지원).
 *
 * POST /api/crawl/staffpick  — 스태프 선정 작품 크롤
 * POST /api/crawl/popular    — 인기 작품 크롤
 *
 * POST 요청 1회 = 1 batch 실행:
 *   - 큐가 적으면 Entry 목록 1페이지 fetch (빠름, ~1s)
 *   - 그 외엔 큐에서 유저 최대 N명 처리 (~4~6s)
 *
 * 상태는 Firestore `ent2_crawl_state/{source}` 에 영구 저장.
 */

import { NextResponse } from "next/server"
import { FieldValue } from "firebase-admin/firestore"
import { fetchProjectList } from "@/lib/entry-api"
import { getStatsForUser } from "@/lib/stats-service"
import {
  getCrawlState,
  saveCrawlState,
  resetCrawlState,
  type CrawlState,
} from "@/lib/crawl-state"
import { isCrawlSource, type CrawlSource } from "@/lib/crawl-sources"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 10

const LIST_DISPLAY = 50
const LIST_REFILL_THRESHOLD = 10
const USERS_PER_BATCH = 2

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

function toPublic(state: CrawlState): StatePublic {
  return {
    phase: state.phase,
    listTotal: state.listTotal,
    listFetched: state.listFetched,
    queueLength: state.queue.length,
    processedCount: state.processedCount,
    seenCount: state.seenUserIds.length,
    failedCount: state.failedIds.length,
    lastError: state.lastError,
    lastBatchAt: state.lastBatchAt?.toDate?.().toISOString() ?? null,
  }
}

interface RouteContext {
  params: Promise<{ source: string }>
}

async function resolveSource(
  context: RouteContext,
): Promise<CrawlSource | NextResponse> {
  const { source } = await context.params
  if (!isCrawlSource(source)) {
    return NextResponse.json(
      { error: `unknown source: ${source}` },
      { status: 404 },
    )
  }
  return source
}

export async function POST(request: Request, context: RouteContext) {
  const sourceOrError = await resolveSource(context)
  if (sourceOrError instanceof NextResponse) return sourceOrError
  const source = sourceOrError

  let body: { action?: string } = {}
  try {
    body = await request.json()
  } catch {
    // body 없으면 step 으로 간주
  }
  const action = body.action ?? "step"

  if (action === "reset") {
    try {
      await resetCrawlState(source)
      const state = await getCrawlState(source)
      return NextResponse.json(toPublic(state))
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      return NextResponse.json({ error: msg }, { status: 500 })
    }
  }

  try {
    const state = await getCrawlState(source)

    if (state.phase === "done") {
      return NextResponse.json(toPublic(state))
    }

    const updates: Record<string, unknown> = {}
    const wasIdle = state.phase === "idle"
    if (wasIdle) {
      state.phase = "running"
      updates.phase = "running"
      updates.startedAt = FieldValue.serverTimestamp()
    }

    const shouldFetchList =
      !state.listDone && state.queue.length < LIST_REFILL_THRESHOLD

    if (shouldFetchList) {
      const result = await fetchProjectList(
        source,
        state.searchAfter,
        LIST_DISPLAY,
      )

      const seenSet = new Set(state.seenUserIds)
      const newIds: string[] = []
      for (const proj of result.list) {
        const uid = proj.user?.id
        if (!uid) continue
        if (seenSet.has(uid)) continue
        seenSet.add(uid)
        newIds.push(uid)
      }

      state.queue = [...state.queue, ...newIds]
      state.seenUserIds = [...seenSet]
      state.searchAfter = result.searchAfter
      state.listTotal = result.total
      state.listFetched = state.listFetched + result.list.length

      if (result.list.length === 0 || result.searchAfter === null) {
        state.listDone = true
      }

      updates.queue = state.queue
      updates.seenUserIds = state.seenUserIds
      updates.searchAfter = state.searchAfter
      updates.listTotal = state.listTotal
      updates.listFetched = state.listFetched
      updates.listDone = state.listDone
    } else if (state.queue.length > 0) {
      const toProcess = state.queue.slice(0, USERS_PER_BATCH)
      const remaining = state.queue.slice(USERS_PER_BATCH)

      const newFailed: string[] = []
      let succeeded = 0

      for (const userId of toProcess) {
        try {
          const res = await getStatsForUser(userId)
          if (res) {
            succeeded++
          } else {
            newFailed.push(userId)
          }
        } catch {
          newFailed.push(userId)
        }
      }

      state.queue = remaining
      state.processedCount = state.processedCount + succeeded
      if (newFailed.length > 0) {
        state.failedIds = [...state.failedIds, ...newFailed]
        updates.failedIds = state.failedIds
      }

      updates.queue = state.queue
      updates.processedCount = state.processedCount
    }

    if (state.listDone && state.queue.length === 0) {
      state.phase = "done"
      updates.phase = "done"
    }

    updates.lastError = null
    updates.lastBatchAt = FieldValue.serverTimestamp()

    await saveCrawlState(source, updates)

    return NextResponse.json({
      ...toPublic(state),
      lastBatchAt: new Date().toISOString(),
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    try {
      await saveCrawlState(source, {
        lastError: msg,
        lastBatchAt: FieldValue.serverTimestamp(),
      })
    } catch {
      // save 실패도 무시
    }
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function GET(_request: Request, context: RouteContext) {
  const sourceOrError = await resolveSource(context)
  if (sourceOrError instanceof NextResponse) return sourceOrError
  const source = sourceOrError

  try {
    const state = await getCrawlState(source)
    return NextResponse.json(toPublic(state))
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
