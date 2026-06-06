/**
 * 닉네임 검색/자동완성 매칭 로직 (es-hangul 기반).
 *
 * 일반 부분일치에 더해 한글 특화 매칭을 지원한다:
 *  - **초성 검색**: "ㅎㄱ" → "한국". 쿼리가 자음(초성)으로만 이뤄졌을 때 동작.
 *  - **자모 부분매칭**: "한ㄱ"(조합 중) → "한국". 자모로 분해해 부분일치.
 *  - **영문모드 오타 교정**: "gksrnr" → "한국". 완성형 한글로만 변환될 때만 적용.
 *
 * 매칭 우선순위(tier, 낮을수록 우선):
 *  0 정확 · 1 접두 · 2 부분 · 3 초성접두 · 4 초성부분 · 5 자모부분
 *  (영문모드 변환으로 매칭된 건 +10 → 직접 매칭보다 항상 후순위)
 * 동일 tier 안에서는 작품 수 내림차순.
 *
 * 성능: 닉네임별 초성/자모는 `toSearchable` 로 1회만 미리 계산하고,
 * 타이핑마다는 미리 계산된 문자열에 startsWith/includes 만 수행한다.
 */

import { getChoseong, disassemble, convertQwertyToHangul } from "es-hangul"
import type { NicknameEntry } from "@/lib/nickname-index"

export interface SearchableEntry extends NicknameEntry {
  /** 소문자 닉네임 (대소문자 무시 매칭용) */
  _lower: string
  /** 초성 문자열, 예: "한국" → "ㅎㄱ" */
  _choseong: string
  /** 자모 분해 문자열, 예: "한국" → "ㅎㅏㄴㄱㅜㄱ" */
  _jamo: string
}

/** 닉네임 인덱스에 초성/자모를 미리 계산해 붙인다 (1회). */
export function toSearchable(entries: NicknameEntry[]): SearchableEntry[] {
  return entries.map((e) => {
    const lower = e.nickname.toLowerCase()
    return {
      ...e,
      _lower: lower,
      _choseong: getChoseong(e.nickname),
      _jamo: disassemble(lower),
    }
  })
}

const TIER = {
  EXACT: 0,
  PREFIX: 1,
  SUBSTRING: 2,
  CHOSEONG_PREFIX: 3,
  CHOSEONG_SUBSTRING: 4,
  JAMO: 5,
} as const

/** 영문모드 변환으로 매칭된 항목에 더하는 패널티 (직접 매칭보다 뒤로) */
const QWERTY_PENALTY = 10

interface QueryCtx {
  lower: string
  choseong: string
  /** 쿼리가 자음(초성)으로만 구성됐는가 → 초성 검색 활성화 */
  choseongOnly: boolean
  jamo: string
}

/** 한글 호환 자음(초성)으로만 이뤄졌는지 */
function isChoseongOnly(s: string): boolean {
  return /^[ㄱ-ㅎ]+$/.test(s)
}

/** 완성형 한글(가-힣)로만 이뤄졌는지 */
function isCompleteHangul(s: string): boolean {
  return s.length > 0 && /^[가-힣]+$/.test(s)
}

function buildQueryCtx(raw: string): QueryCtx | null {
  const lower = raw.trim().toLowerCase()
  if (!lower) return null
  return {
    lower,
    choseong: getChoseong(lower),
    choseongOnly: isChoseongOnly(lower),
    jamo: disassemble(lower),
  }
}

/** 한 항목이 쿼리에 매칭되는 tier (낮을수록 우선, 미매칭은 Infinity). */
function tierFor(e: SearchableEntry, q: QueryCtx): number {
  if (e._lower === q.lower) return TIER.EXACT
  if (e._lower.startsWith(q.lower)) return TIER.PREFIX
  if (e._lower.includes(q.lower)) return TIER.SUBSTRING

  // 초성 검색: 쿼리가 자음만일 때 (예: "ㅎㄱ")
  if (q.choseongOnly && q.choseong) {
    if (e._choseong.startsWith(q.choseong)) return TIER.CHOSEONG_PREFIX
    if (e._choseong.includes(q.choseong)) return TIER.CHOSEONG_SUBSTRING
  }

  // 자모 부분매칭: 조합 중인 글자 등 (예: "한ㄱ" → "한국")
  // 단일 자모(자음 1개 등)는 너무 느슨하므로 길이 2 이상에서만.
  if (q.jamo.length >= 2 && e._jamo.includes(q.jamo)) return TIER.JAMO

  return Infinity
}

/**
 * 닉네임 인덱스에서 쿼리에 맞는 항목을 우선순위·작품수 순으로 반환.
 * @param entries `toSearchable` 로 전처리된 배열
 * @param raw 사용자가 입력한 원본 문자열
 * @param limit 최대 반환 개수
 */
export function searchNicknames(
  entries: SearchableEntry[],
  raw: string,
  limit = 8,
): SearchableEntry[] {
  const q = buildQueryCtx(raw)
  if (!q) return []

  // 영문모드로 한글을 입력한 경우 보정 (예: "gksrnr" → "한국").
  // 변환 결과가 완성형 한글일 때만 채택 (영어 단어 오변환 방지).
  let alt: QueryCtx | null = null
  const trimmed = raw.trim()
  if (/^[a-zA-Z]+$/.test(trimmed)) {
    const converted = convertQwertyToHangul(trimmed)
    if (isCompleteHangul(converted)) alt = buildQueryCtx(converted)
  }

  const scored: { entry: SearchableEntry; tier: number }[] = []
  for (const e of entries) {
    let tier = tierFor(e, q)
    if (alt) {
      const altTier = tierFor(e, alt)
      if (altTier !== Infinity) tier = Math.min(tier, altTier + QWERTY_PENALTY)
    }
    if (tier !== Infinity) scored.push({ entry: e, tier })
  }

  scored.sort(
    (a, b) =>
      a.tier - b.tier ||
      b.entry.totalProjects - a.entry.totalProjects ||
      a.entry.nickname.localeCompare(b.entry.nickname, "ko"),
  )

  return scored.slice(0, limit).map((s) => s.entry)
}
