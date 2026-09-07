import { NextResponse } from "next/server"
import { getNicknameIndex } from "@/lib/nickname-index"
import { searchNicknames, toSearchable } from "@/lib/nickname-search"
import { checkRateLimit, getClientIp } from "@/lib/rate-limit"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const MAX_QUERY_LENGTH = 50
const MAX_RESULTS = 8

export async function GET(request: Request) {
  const ip = getClientIp(request.headers)
  const rateLimit = checkRateLimit(`nickname-search:${ip}`, {
    maxRequests: 30,
  })
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "rate limit exceeded", retryAfter: rateLimit.retryAfterSec },
      {
        status: 429,
        headers: { "Retry-After": String(rateLimit.retryAfterSec) },
      },
    )
  }

  const query = new URL(request.url).searchParams.get("q")?.trim() ?? ""
  if (!query || query.length > MAX_QUERY_LENGTH) {
    return NextResponse.json(
      { error: `q must be between 1 and ${MAX_QUERY_LENGTH} characters` },
      { status: 400 },
    )
  }

  try {
    const index = await getNicknameIndex()
    const results = searchNicknames(toSearchable(index), query, MAX_RESULTS).map(
      ({ id, nickname, totalProjects, activityDays }) => ({
        id,
        nickname,
        totalProjects,
        activityDays,
      }),
    )

    return NextResponse.json(
      { results },
      {
        headers: {
          "Cache-Control":
            "public, max-age=0, s-maxage=300, stale-while-revalidate=600",
        },
      },
    )
  } catch (error) {
    console.error("[nickname-search] 조회 실패:", error)
    return NextResponse.json(
      { error: "nickname search is temporarily unavailable" },
      { status: 503 },
    )
  }
}
