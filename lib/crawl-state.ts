/**
 * 스태프 선정 크롤러의 Firestore 상태 관리.
 *
 * 탭을 닫거나 서버가 재시작되어도 Firestore 에 저장된 상태를 통해
 * 중단된 지점부터 재개할 수 있다.
 */

import { Timestamp } from "firebase-admin/firestore"
import { getDb } from "@/lib/firebase"

const COLLECTION = "ent2_crawl_state"
const DOC_ID = "staffpick"

export type CrawlPhase = "idle" | "running" | "done"

export interface CrawlState {
  phase: CrawlPhase
  /** Entry 가 보고한 전체 작품 수 */
  listTotal: number
  /** 지금까지 스캔한 작품 수 */
  listFetched: number
  /** 목록 페이지네이션 더 이상 진행 불가 (끝 도달) */
  listDone: boolean
  /** 다음 목록 호출에 사용할 커서 */
  searchAfter: unknown[] | null
  /** 처리 대기 유저 ID */
  queue: string[]
  /** 성공적으로 등록 완료한 유저 수 */
  processedCount: number
  /** 이미 큐에 들어갔거나 처리된 유저 (중복 방지) */
  seenUserIds: string[]
  /** 실패한 유저 ID */
  failedIds: string[]
  startedAt: Timestamp | null
  lastBatchAt: Timestamp | null
  lastError: string | null
}

const DEFAULT_STATE: CrawlState = {
  phase: "idle",
  listTotal: 0,
  listFetched: 0,
  listDone: false,
  searchAfter: null,
  queue: [],
  processedCount: 0,
  seenUserIds: [],
  failedIds: [],
  startedAt: null,
  lastBatchAt: null,
  lastError: null,
}

function ref() {
  return getDb().collection(COLLECTION).doc(DOC_ID)
}

export async function getCrawlState(): Promise<CrawlState> {
  const snap = await ref().get()
  if (!snap.exists) return { ...DEFAULT_STATE }
  const data = snap.data() as Partial<CrawlState>
  return { ...DEFAULT_STATE, ...data }
}

/**
 * Firestore 에 state 업데이트 저장 (merge).
 * FieldValue (serverTimestamp 등) 혼용 가능하도록 타입은 느슨하게.
 */
export async function saveCrawlState(
  update: Record<string, unknown>,
): Promise<void> {
  await ref().set(update, { merge: true })
}

/** 상태 초기화 (문서 삭제) */
export async function resetCrawlState(): Promise<void> {
  await ref().delete()
}
