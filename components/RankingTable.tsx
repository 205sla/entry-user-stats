"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { formatDays } from "@/lib/aggregate"
import {
  RANKING_LABELS,
  type RankingEntry,
  type RankingType,
} from "@/lib/ranking-types"

interface Props {
  type: RankingType
  entries: RankingEntry[]
}

const INITIAL_COUNT = 20
const STEP = 20

const fmt = (n: number) => n.toLocaleString("ko-KR")

function valueFor(type: RankingType, e: RankingEntry): string {
  switch (type) {
    case "views":
      return fmt(e.totalViews)
    case "likes":
      return fmt(e.totalLikes)
    case "comments":
      return fmt(e.totalComments)
    case "clones":
      return fmt(e.totalClones)
    case "blocks":
      return fmt(e.totalBlocks)
    case "activity":
      return formatDays(e.activityDays)
    case "popular":
      return `${fmt(e.popularCount)}개`
    case "staff":
      return `${fmt(e.staffCount)}개`
  }
}

const rankBadgeClass = (rank: number): string => {
  if (rank === 1) return "bg-amber-100 text-amber-800 ring-amber-200"
  if (rank === 2) return "bg-slate-200 text-slate-700 ring-slate-300"
  if (rank === 3) return "bg-orange-100 text-orange-800 ring-orange-200"
  return "bg-slate-50 text-slate-500 ring-slate-200"
}

export default function RankingTable({ type, entries }: Props) {
  const [visibleCount, setVisibleCount] = useState(INITIAL_COUNT)

  // 부문(탭) 전환 시 초기 20개로 리셋
  useEffect(() => {
    setVisibleCount(INITIAL_COUNT)
  }, [type])

  if (entries.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
        <p className="text-sm text-slate-500">
          아직 등록된 유저가 없어요. 누군가 검색을 시작하면 여기에 나타납니다.
        </p>
      </div>
    )
  }

  const visible = entries.slice(0, visibleCount)
  const canShowMore = visibleCount < entries.length
  const nextIncrement = Math.min(STEP, entries.length - visibleCount)

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3 text-left">순위</th>
              <th className="px-4 py-3 text-left">닉네임</th>
              <th className="px-4 py-3 text-right">{RANKING_LABELS[type]}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {visible.map((e, i) => {
              const rank = i + 1
              return (
                <tr key={e.id} className="transition hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ring-1 ${rankBadgeClass(
                        rank,
                      )}`}
                    >
                      {rank}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/u/${e.id}`}
                      className="font-medium text-slate-900 transition hover:text-brand-600 hover:underline"
                    >
                      {e.nickname}
                    </Link>
                    {e.truncated && type === "activity" && (
                      <span className="ml-2 inline-block rounded bg-emerald-50 px-1.5 py-0.5 text-xs text-emerald-700 ring-1 ring-emerald-200">
                        200+
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-bold tabular-nums text-slate-900">
                    {valueFor(type, e)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {canShowMore && (
        <div className="flex items-center justify-center">
          <button
            type="button"
            onClick={() => setVisibleCount((c) => c + STEP)}
            className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-5 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-50"
          >
            <span>{nextIncrement}명 더 보기</span>
            <span className="text-xs text-slate-400">
              {visibleCount} / {entries.length}
            </span>
          </button>
        </div>
      )}
    </div>
  )
}
