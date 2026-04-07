import type { AggregatedStats } from "@/lib/aggregate"

interface Props {
  totals: AggregatedStats["totals"]
}

const fmt = (n: number) => n.toLocaleString("ko-KR")

export default function StatCards({ totals }: Props) {
  const items: Array<{ label: string; value: string; accent: string }> = [
    { label: "총 조회수", value: fmt(totals.views), accent: "text-sky-600" },
    { label: "총 좋아요", value: fmt(totals.likes), accent: "text-pink-600" },
    { label: "총 댓글", value: fmt(totals.comments), accent: "text-violet-600" },
    { label: "총 사본 수", value: fmt(totals.clones), accent: "text-emerald-600" },
    {
      label: "총 사용 블록",
      value: fmt(totals.totalBlocks),
      accent: "text-orange-600",
    },
    {
      label: "총 활동 기간",
      value: totals.activityPeriod,
      accent: "text-indigo-600",
    },
  ]
  return (
    <section className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
      {items.map((it) => (
        <div
          key={it.label}
          className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100"
        >
          <div className="text-xs font-medium text-slate-500">{it.label}</div>
          <div className={`mt-2 text-2xl font-bold tabular-nums ${it.accent}`}>
            {it.value}
          </div>
        </div>
      ))}
    </section>
  )
}
