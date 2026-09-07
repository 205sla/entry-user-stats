"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { formatDays } from "@/lib/aggregate"
import {
  focusedRankingVisibleCount,
  RANKING_PAGE_SIZE,
} from "@/lib/ranking-navigation"
import {
  RANKING_LABELS,
  type RankingEntry,
  type RankingType,
} from "@/lib/ranking-types"

interface Props {
  type: RankingType
  entries: RankingEntry[]
  focusedUserId?: string
}

const STEP = RANKING_PAGE_SIZE

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

function numericValueFor(type: RankingType, entry: RankingEntry): number {
  switch (type) {
    case "views":
      return entry.totalViews
    case "likes":
      return entry.totalLikes
    case "comments":
      return entry.totalComments
    case "clones":
      return entry.totalClones
    case "blocks":
      return entry.totalBlocks
    case "activity":
      return entry.activityDays
    case "popular":
      return entry.popularCount
    case "staff":
      return entry.staffCount
  }
}

const rankBadgeClass = (rank: number): string => {
  if (rank === 1) return "bg-amber-100 text-amber-800 ring-amber-200"
  if (rank === 2) return "bg-slate-200 text-slate-700 ring-slate-300"
  if (rank === 3) return "bg-orange-100 text-orange-800 ring-orange-200"
  return "bg-slate-50 text-slate-500 ring-slate-200"
}

export default function RankingTable({
  type,
  entries,
  focusedUserId,
}: Props) {
  const requiredVisibleCount = focusedRankingVisibleCount(entries, focusedUserId)
  const focusedIndex = focusedUserId
    ? entries.findIndex((entry) => entry.id === focusedUserId)
    : -1
  const focusedRowRef = useRef<HTMLTableRowElement>(null)
  const [visibleCount, setVisibleCount] = useState(requiredVisibleCount)

  // 부문 전환 시 기본 20개로 리셋하되, 대상 유저가 있으면 해당 행까지 펼친다.
  useEffect(() => {
    setVisibleCount(requiredVisibleCount)
  }, [type, focusedUserId, requiredVisibleCount])

  // Suspense로 랭킹 목록이 그려진 뒤 대상 행을 화면 중앙으로 이동한다.
  useEffect(() => {
    if (focusedIndex < 0 || focusedIndex >= visibleCount) return

    const frame = window.requestAnimationFrame(() => {
      const reduceMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches
      focusedRowRef.current?.scrollIntoView({
        behavior: reduceMotion ? "auto" : "smooth",
        block: "center",
      })
    })

    return () => window.cancelAnimationFrame(frame)
  }, [focusedIndex, focusedUserId, type, visibleCount])

  if (entries.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
        <p className="text-sm text-slate-500">
          아직 등록된 유저가 없어요. 누군가 검색을 시작하면 여기에 나타납니다.
        </p>
      </div>
    )
  }

  let previousValue: number | null = null
  let previousRank = 0
  const rankedEntries = entries.map((entry, index) => {
    const value = numericValueFor(type, entry)
    const rank = previousValue === value ? previousRank : index + 1
    previousValue = value
    previousRank = rank
    return { entry, rank }
  })
  const visible = rankedEntries.slice(0, visibleCount)
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
            {visible.map(({ entry: e, rank }) => {
              const focused = e.id === focusedUserId
              return (
                <tr
                  key={e.id}
                  id={`ranking-user-${e.id}`}
                  ref={focused ? focusedRowRef : undefined}
                  aria-current={focused ? "true" : undefined}
                  className={`scroll-mt-6 transition-colors ${
                    focused
                      ? "bg-sky-50 ring-2 ring-inset ring-sky-300"
                      : "hover:bg-slate-50"
                  }`}
                >
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
                    {focused && (
                      <span className="ml-2 inline-block rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-700">
                        선택한 유저
                      </span>
                    )}
                    {e.truncated && type === "activity" && (
                      <span className="ml-2 inline-block rounded bg-emerald-50 px-1.5 py-0.5 text-xs text-emerald-700 ring-1 ring-emerald-200">
                        작품 {fmt(e.totalProjects)}개
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
