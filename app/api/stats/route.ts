import { NextResponse } from "next/server"
import { getStatsForUser } from "@/lib/stats-service"
import { isValidEntryId } from "@/lib/extract-id"
import { checkRateLimit, getClientIp } from "@/lib/rate-limit"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const ip = getClientIp(request.headers)
  const rl = checkRateLimit(`ip:${ip}`)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "rate limit exceeded", retryAfter: rl.retryAfterSec },
      {
        status: 429,
        headers: {
          "Retry-After": String(rl.retryAfterSec),
          "X-RateLimit-Limit": String(rl.limit),
          "X-RateLimit-Remaining": String(rl.remaining),
          "X-RateLimit-Reset": String(Math.ceil(rl.resetAt / 1000)),
        },
      },
    )
  }

  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id")?.trim().toLowerCase() ?? ""

  if (!id || !isValidEntryId(id)) {
    return NextResponse.json(
      { error: "invalid id. expected 24-char hex ObjectId." },
      { status: 400 },
    )
  }

  try {
    const result = await getStatsForUser(id)
    if (!result) {
      return NextResponse.json({ error: "user not found" }, { status: 404 })
    }

    return NextResponse.json(
      { cached: result.cached, stats: result.stats },
      { headers: { "Cache-Control": "public, max-age=0, s-maxage=1800" } },
    )
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 502 })
  }
}
