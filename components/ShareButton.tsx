"use client"

import { useEffect, useState } from "react"

interface Props {
  url: string
  title: string
  label?: string
  className?: string
}

type Status = "idle" | "copied" | "error"

async function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text)
      return
    } catch {
      // 권한이 제한된 브라우저에서는 아래의 선택 영역 복사 방식으로 재시도한다.
    }
  }

  const textarea = document.createElement("textarea")
  textarea.value = text
  textarea.setAttribute("readonly", "")
  textarea.style.position = "fixed"
  textarea.style.opacity = "0"
  document.body.appendChild(textarea)
  textarea.select()
  const copied = document.execCommand("copy")
  textarea.remove()
  if (!copied) throw new Error("clipboard unavailable")
}

export default function ShareButton({
  url,
  title,
  label = "공유",
  className = "",
}: Props) {
  const [status, setStatus] = useState<Status>("idle")

  useEffect(() => {
    if (status === "idle") return
    const timer = window.setTimeout(() => setStatus("idle"), 2200)
    return () => window.clearTimeout(timer)
  }, [status])

  async function handleShare() {
    setStatus("idle")

    try {
      await copyText(url)
      setStatus("copied")
    } catch {
      setStatus("error")
    }
  }

  const buttonLabel =
    status === "copied" ? "복사됨" : status === "error" ? "복사 실패" : label

  return (
    <button
      type="button"
      onClick={handleShare}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-500/40 ${className}`}
      aria-label={`${title} ${label}`}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        className="h-4 w-4"
      >
        <rect x="8" y="8" width="11" height="11" rx="2" />
        <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
      </svg>
      <span aria-live="polite">{buttonLabel}</span>
    </button>
  )
}
