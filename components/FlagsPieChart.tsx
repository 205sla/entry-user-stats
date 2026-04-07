"use client"

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts"
import type { FlagsBreakdown } from "@/lib/aggregate"

interface Props {
  flags: FlagsBreakdown
}

/**
 * 4분류:
 *  - 스태프 선정 & 인기 작품: 보라
 *  - 스태프 선정만: 주황
 *  - 인기 작품만: 장미
 *  - 일반: 회색
 */
const COLORS: Record<string, string> = {
  "스태프 선정 & 인기 작품": "#8b5cf6",
  "스태프 선정": "#f59e0b",
  "인기 작품": "#f43f5e",
  "일반": "#cbd5e1",
}

export default function FlagsPieChart({ flags }: Props) {
  const raw = [
    { name: "스태프 선정 & 인기 작품", value: flags.both },
    { name: "스태프 선정", value: flags.staffOnly },
    { name: "인기 작품", value: flags.rankedOnly },
    { name: "일반", value: flags.normal },
  ]
  const data = raw.filter((d) => d.value > 0)

  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-slate-400">
        작품이 없습니다.
      </div>
    )
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={85}
            paddingAngle={2}
          >
            {data.map((d, i) => (
              <Cell key={i} fill={COLORS[d.name]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(v: number) => v.toLocaleString("ko-KR") + "개"}
            contentStyle={{ fontSize: 12 }}
          />
          <Legend verticalAlign="bottom" height={40} iconSize={10} wrapperStyle={{ fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
