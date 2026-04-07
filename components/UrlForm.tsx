"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { extractEntryId } from "@/lib/extract-id"

export default function UrlForm() {
  const router = useRouter()
  const [value, setValue] = useState("")
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const id = extractEntryId(value)
    if (!id) {
      setError("URL에서 24자리 ID를 찾을 수 없습니다.")
      return
    }
    router.push(`/u/${id}`)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <label htmlFor="entry-url" className="block text-sm font-medium text-slate-700">
        엔트리 프로필 URL 또는 ID
      </label>
      <div className="flex gap-2">
        <input
          id="entry-url"
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="https://playentry.org/profile/..."
          className="flex-1 rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
          autoComplete="off"
          spellCheck={false}
        />
        <button
          type="submit"
          className="rounded-lg bg-brand-600 px-5 py-3 font-medium text-white shadow-sm transition hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
        >
          통계 보기
        </button>
      </div>
      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </form>
  )
}
