"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts"
import type { CategoryStat } from "@/lib/aggregate"

interface Props {
  items: CategoryStat[]
}

const COLORS = [
  "#16a34a", "#0ea5e9", "#f59e0b", "#ec4899",
  "#8b5cf6", "#14b8a6", "#f97316", "#64748b",
  "#a855f7", "#06b6d4", "#eab308",
]

export default function CategoryChart({ items }: Props) {
  if (items.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-slate-400">
        카테고리 정보가 없습니다.
      </div>
    )
  }

  const data = items.map((c) => ({
    label: c.label,
    count: c.count,
    views: c.views,
    likes: c.likes,
  }))

  // 가로 막대차트 — 카테고리명이 잘 보이도록
  return (
    <div style={{ height: Math.max(220, data.length * 44) }} className="w-full">
      <ResponsiveContainer>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 8, right: 24, left: 8, bottom: 8 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fontSize: 11, fill: "#64748b" }}
            allowDecimals={false}
          />
          <YAxis
            type="category"
            dataKey="label"
            tick={{ fontSize: 12, fill: "#475569" }}
            width={72}
          />
          <Tooltip
            formatter={(v: number, name) => {
              if (name === "count") return [`${v.toLocaleString("ko-KR")}개`, "작품 수"]
              return v.toLocaleString("ko-KR")
            }}
            labelFormatter={(label) => `카테고리: ${label}`}
            contentStyle={{ fontSize: 12 }}
          />
          <Bar dataKey="count" radius={[0, 4, 4, 0]}>
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
