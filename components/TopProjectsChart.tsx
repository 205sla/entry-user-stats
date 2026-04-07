"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import type { ProjectCard } from "@/lib/aggregate"

export type TopMode = "views" | "likes"

interface Props {
  items: ProjectCard[]
  mode: TopMode
}

interface Datum {
  name: string
  fullName: string
  thumb: string | null
  categoryLabel: string
  staffPicked: boolean
  ranked: boolean
  value: number
}

interface TooltipPayloadEntry {
  value?: number
  payload?: Datum
}

interface TooltipProps {
  active?: boolean
  payload?: TooltipPayloadEntry[]
}

const truncate = (s: string, n: number) =>
  s.length > n ? s.slice(0, n) + "…" : s

function makeTooltip(metricLabel: string) {
  return function CustomTooltip({ active, payload }: TooltipProps) {
    if (!active || !payload?.length) return null
    const d = payload[0].payload
    if (!d) return null
    return (
      <div className="max-w-[220px] rounded-lg bg-white p-3 shadow-lg ring-1 ring-slate-200">
        {d.thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={d.thumb}
            alt={d.fullName}
            className="mb-2 h-24 w-full rounded object-cover"
          />
        ) : (
          <div className="mb-2 flex h-24 w-full items-center justify-center rounded bg-slate-100 text-xs text-slate-400">
            no image
          </div>
        )}
        <div className="line-clamp-2 text-sm font-semibold text-slate-900">
          {d.fullName}
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-1">
          {d.staffPicked && (
            <span className="rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
              스태프
            </span>
          )}
          {d.ranked && (
            <span className="rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
              인기
            </span>
          )}
          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">
            {d.categoryLabel}
          </span>
        </div>
        <div className="mt-2 flex items-baseline justify-between text-sm tabular-nums">
          <span className="text-slate-500">{metricLabel}</span>
          <strong className="text-slate-900">
            {(d.value ?? 0).toLocaleString("ko-KR")}
          </strong>
        </div>
      </div>
    )
  }
}

export default function TopProjectsChart({ items, mode }: Props) {
  if (items.length === 0) {
    return (
      <div className="flex h-72 items-center justify-center text-sm text-slate-400">
        작품이 없습니다.
      </div>
    )
  }

  const metricLabel = mode === "views" ? "조회수" : "좋아요"
  const barColor = mode === "views" ? "#0ea5e9" : "#ec4899"

  const data: Datum[] = items.map((p) => ({
    name: truncate(p.name, 12),
    fullName: p.name,
    thumb: p.thumb,
    categoryLabel: p.categoryLabel,
    staffPicked: p.staffPicked,
    ranked: p.ranked,
    value: mode === "views" ? p.visit : p.likeCnt,
  }))

  const TooltipContent = makeTooltip(metricLabel)

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 40 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="name"
            interval={0}
            angle={-30}
            textAnchor="end"
            height={60}
            tick={{ fontSize: 11, fill: "#64748b" }}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#64748b" }}
            tickFormatter={(v) => v.toLocaleString("ko-KR")}
          />
          <Tooltip
            content={<TooltipContent />}
            cursor={{ fill: "rgba(148,163,184,0.15)" }}
          />
          <Bar dataKey="value" name={metricLabel} fill={barColor} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
