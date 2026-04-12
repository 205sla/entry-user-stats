"use client"

import { useState } from "react"
import Link from "next/link"
import {
  MAX_PROJECTS,
  type AggregatedStats,
  type LatestActivity,
} from "@/lib/aggregate"
import type { RankingType, UserRankPositions } from "@/lib/ranking"
import StatCards from "./StatCards"
import FlagsPieChart from "./FlagsPieChart"
import CategoryChart from "./CategoryChart"
import TopProjectsChart, { type TopMode } from "./TopProjectsChart"
import YearBarChart from "./YearBarChart"

interface Props {
  stats: AggregatedStats
  rankPositions?: UserRankPositions
}

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime()
  if (isNaN(then)) return "-"
  const diffMs = Date.now() - then
  if (diffMs < 0) return "방금 전"
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (days === 0) return "오늘"
  if (days === 1) return "어제"
  if (days < 7) return `${days}일 전`
  if (days < 30) return `${Math.floor(days / 7)}주 전`
  if (days < 365) return `${Math.floor(days / 30)}개월 전`
  const years = Math.floor(days / 365)
  const months = Math.floor((days % 365) / 30)
  return months === 0 ? `${years}년 전` : `${years}년 ${months}개월 전`
}

function LatestActivityLine({ latest }: { latest: LatestActivity }) {
  const absolute = new Date(latest.at).toLocaleString("ko-KR")
  const rel = relativeTime(latest.at)
  return (
    <p className="mt-1 text-sm text-slate-500">
      최근 활동{" "}
      <span
        className="font-medium text-slate-700"
        title={absolute}
        suppressHydrationWarning
      >
        {rel}
      </span>
      {" · "}
      <a
        href={latest.project.url}
        target="_blank"
        rel="noreferrer"
        className="text-sky-600 hover:underline"
      >
        {latest.project.name}
      </a>
    </p>
  )
}

function UserHeader({
  user,
  latestActivity,
}: {
  user: AggregatedStats["user"]
  latestActivity: LatestActivity | null
}) {
  return (
    <header className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-slate-900">{user.nickname}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {user.role === "member" ? "일반 회원" : user.role}
            {user.created && (
              <> · 가입일 {new Date(user.created).toLocaleDateString("ko-KR")}</>
            )}
          </p>
          {latestActivity && <LatestActivityLine latest={latestActivity} />}
        </div>
        <div className="text-sm text-slate-500">
          팔로워{" "}
          <strong className="text-slate-800">
            {user.followers.toLocaleString()}
          </strong>
          <span className="mx-2">·</span>
          팔로잉{" "}
          <strong className="text-slate-800">
            {user.following.toLocaleString()}
          </strong>
        </div>
      </div>
    </header>
  )
}

const RANK_LABELS: Record<RankingType, string> = {
  views: "조회수",
  likes: "좋아요",
  comments: "댓글",
  clones: "사본",
  blocks: "사용 블록",
  activity: "활동 기간",
  popular: "인기 작품",
  staff: "스태프 선정",
}

const RANK_COLORS: Record<number, string> = {
  1: "bg-amber-100 text-amber-800 ring-amber-300",
  2: "bg-slate-200 text-slate-700 ring-slate-300",
  3: "bg-orange-100 text-orange-800 ring-orange-300",
}
const RANK_DEFAULT = "bg-slate-100 text-slate-600 ring-slate-200"

function RankingBadges({ positions }: { positions: UserRankPositions }) {
  const entries = Object.entries(positions) as [RankingType, number][]
  if (entries.length === 0) return null

  // 순위가 높은(숫자가 작은) 순으로 정렬
  entries.sort((a, b) => a[1] - b[1])

  return (
    <section className="flex flex-wrap gap-2">
      {entries.map(([type, rank]) => (
        <Link
          key={type}
          href={`/ranking?type=${type}`}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 transition hover:brightness-95 ${
            RANK_COLORS[rank] ?? RANK_DEFAULT
          }`}
        >
          <span>{RANK_LABELS[type]}</span>
          <span>{rank}위</span>
        </Link>
      ))}
    </section>
  )
}

export default function StatsView({ stats, rankPositions = {} }: Props) {
  const { user, totals, flags, categories, topByViews, topByLikes, byYear } = stats
  const [topMode, setTopMode] = useState<TopMode>("views")
  const topItems = topMode === "views" ? topByViews : topByLikes

  if (stats.truncated) {
    return (
      <div className="space-y-8">
        <UserHeader user={user} latestActivity={stats.latestActivity} />
        <RankingBadges positions={rankPositions} />

        {/* 여러 호출 없이 표시 가능한 정보 (userstatus + 1회 타겟 호출로 전부 얻음) */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
            <div className="text-xs font-medium text-slate-500">총 작품 수</div>
            <div className="mt-2 text-2xl font-bold tabular-nums text-slate-900">
              {stats.totalProjects.toLocaleString("ko-KR")}
            </div>
          </div>
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
            <div className="text-xs font-medium text-slate-500">총 활동 기간</div>
            <div className="mt-2 text-2xl font-bold tabular-nums text-indigo-600">
              {totals.activityPeriod}
            </div>
          </div>
        </section>

        <div className="rounded-2xl bg-amber-50 p-8 text-center ring-1 ring-amber-200">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-2xl">
            ⚠
          </div>
          <h2 className="text-xl font-bold text-amber-900">
            상세 통계를 표시할 수 없습니다
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-amber-800">
            이 유저는 총{" "}
            <strong className="font-bold">
              {stats.totalProjects.toLocaleString("ko-KR")}개
            </strong>
            의 작품을 보유하고 있어, 표시 한도인{" "}
            <strong className="font-bold">{MAX_PROJECTS}개</strong>를 초과합니다.
          </p>
          <p className="mx-auto mt-2 max-w-md text-xs text-amber-700">
            조회수·좋아요·카테고리 등 작품 전체 집계가 필요한 항목은 API 호출
            부담이 커져 생략합니다.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <UserHeader user={user} latestActivity={stats.latestActivity} />
      <RankingBadges positions={rankPositions} />

      <StatCards totals={totals} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">작품 분류</h2>
          <FlagsPieChart flags={flags} />
        </div>
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">
            카테고리 분석
          </h2>
          <CategoryChart items={categories} />
        </div>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">
            상위 10개 작품 · {topMode === "views" ? "조회수" : "좋아요"} 기준
          </h2>
          <div
            role="tablist"
            aria-label="정렬 기준 전환"
            className="inline-flex rounded-lg bg-slate-100 p-1 text-sm"
          >
            <button
              role="tab"
              aria-selected={topMode === "views"}
              onClick={() => setTopMode("views")}
              className={`rounded-md px-3 py-1.5 font-medium transition ${
                topMode === "views"
                  ? "bg-white text-sky-600 shadow"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              조회수
            </button>
            <button
              role="tab"
              aria-selected={topMode === "likes"}
              onClick={() => setTopMode("likes")}
              className={`rounded-md px-3 py-1.5 font-medium transition ${
                topMode === "likes"
                  ? "bg-white text-pink-600 shadow"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              좋아요
            </button>
          </div>
        </div>

        <TopProjectsChart items={topItems} mode={topMode} />
        <p className="mt-3 text-center text-xs text-slate-500">
          막대에 마우스를 올리면 썸네일과 상세 정보가 표시됩니다
        </p>
      </div>

      {byYear.length > 0 && (
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">
            연도별 제작 작품 수
          </h2>
          <YearBarChart items={byYear} />
        </div>
      )}
    </div>
  )
}
