/**
 * 프로세스 메모리 기반 fixed-window rate limiter.
 *
 * 한계:
 * - Vercel 서버리스 인스턴스마다 독립 카운터 (분산 강제 X)
 * - cold start 시 카운터 초기화
 * - best-effort 보호용 — 강한 abuse 방지가 필요하면 Redis(KV) 기반으로 교체할 것
 */

interface Bucket {
  count: number
  resetAt: number
}

const WINDOW_MS = 60 * 1000 // 1분
const MAX_REQUESTS = 3 // IP 당 분당 3회
const MAX_BUCKETS = 5000 // 메모리 폭주 방지

const buckets = new Map<string, Bucket>()

function cleanupExpired(now: number): void {
  for (const [k, b] of buckets) {
    if (now >= b.resetAt) buckets.delete(k)
  }
}

export interface RateLimitResult {
  allowed: boolean
  limit: number
  remaining: number
  resetAt: number // epoch ms
  retryAfterSec: number
}

export function checkRateLimit(key: string): RateLimitResult {
  const now = Date.now()

  if (buckets.size > MAX_BUCKETS) {
    cleanupExpired(now)
  }

  let bucket = buckets.get(key)
  if (!bucket || now >= bucket.resetAt) {
    bucket = { count: 0, resetAt: now + WINDOW_MS }
    buckets.set(key, bucket)
  }

  bucket.count++

  const allowed = bucket.count <= MAX_REQUESTS
  return {
    allowed,
    limit: MAX_REQUESTS,
    remaining: Math.max(0, MAX_REQUESTS - bucket.count),
    resetAt: bucket.resetAt,
    retryAfterSec: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
  }
}

/**
 * Vercel/일반 프록시 환경에서 클라이언트 IP 추출.
 * 식별 불가 시 "unknown" — 모든 unknown 클라이언트가 한 버킷을 공유함에 주의.
 */
export function getClientIp(headers: Headers): string {
  const forwardedFor = headers.get("x-forwarded-for")
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim()
    if (first) return first
  }
  const realIp = headers.get("x-real-ip")
  if (realIp) return realIp.trim()
  return "unknown"
}
