"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { extractEntryId } from "@/lib/extract-id"
import type { NicknameEntry } from "@/lib/nickname-index"
import { formatDays } from "@/lib/aggregate"

interface SearchResponse {
  results: NicknameEntry[]
}

const EMPTY_RESULT: SearchResponse = { results: [] }

function looksLikeUrlOrId(input: string): boolean {
  const trimmed = input.trim()
  if (!trimmed) return false
  if (trimmed.includes("/") || trimmed.includes("playentry")) return true
  return /^[a-f0-9]{24}$/i.test(trimmed)
}

function queryKey(value: string): string {
  return value.trim().normalize("NFC").toLocaleLowerCase("ko-KR")
}

export default function UrlForm() {
  const router = useRouter()
  const [value, setValue] = useState("")
  const [searchResult, setSearchResult] = useState<SearchResponse>(EMPTY_RESULT)
  const [searchedQuery, setSearchedQuery] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [highlighted, setHighlighted] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const requestRef = useRef<AbortController | null>(null)

  const search = useCallback(async (query: string, signal: AbortSignal) => {
    const response = await fetch(
      `/api/users/search?q=${encodeURIComponent(query.trim())}`,
      { signal },
    )
    if (!response.ok) throw new Error("nickname search failed")
    return (await response.json()) as SearchResponse
  }, [])

  useEffect(() => {
    const trimmed = value.trim()
    const key = queryKey(value)
    requestRef.current?.abort()

    if (!trimmed || looksLikeUrlOrId(value)) {
      setSearchResult(EMPTY_RESULT)
      setSearchedQuery("")
      setLoading(false)
      return
    }

    const controller = new AbortController()
    requestRef.current = controller
    const timer = window.setTimeout(async () => {
      setLoading(true)
      try {
        const result = await search(trimmed, controller.signal)
        if (!controller.signal.aborted) {
          setSearchResult(result)
          setSearchedQuery(key)
          setHighlighted(0)
        }
      } catch (searchError) {
        if (searchError instanceof DOMException && searchError.name === "AbortError") {
          return
        }
        setSearchResult(EMPTY_RESULT)
        setSearchedQuery(key)
      } finally {
        if (requestRef.current === controller) setLoading(false)
      }
    }, 180)

    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [search, value])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  function navigateTo(id: string) {
    setOpen(false)
    router.push(`/u/${id}`)
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    const trimmed = value.trim()
    if (!trimmed) {
      setError("검색어를 입력해 주세요.")
      return
    }

    const id = extractEntryId(trimmed)
    if (id) {
      navigateTo(id)
      return
    }

    let current = searchResult
    const key = queryKey(trimmed)
    if (searchedQuery !== key) {
      requestRef.current?.abort()
      const controller = new AbortController()
      requestRef.current = controller
      setLoading(true)
      try {
        current = await search(trimmed, controller.signal)
        setSearchResult(current)
        setSearchedQuery(key)
      } catch {
        setError("닉네임 검색을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.")
        return
      } finally {
        if (requestRef.current === controller) setLoading(false)
      }
    }

    if (current.results.length > 0) {
      navigateTo(current.results[Math.min(highlighted, current.results.length - 1)].id)
      return
    }

    setOpen(true)
    setError(
      "일치하는 닉네임이 없어요. 프로필 URL로 최초 1회 검색하면 닉네임 검색에 등록돼요.",
    )
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || searchResult.results.length === 0) return

    if (event.key === "ArrowDown") {
      event.preventDefault()
      setHighlighted((index) => (index + 1) % searchResult.results.length)
    } else if (event.key === "ArrowUp") {
      event.preventDefault()
      setHighlighted(
        (index) =>
          (index - 1 + searchResult.results.length) % searchResult.results.length,
      )
    } else if (event.key === "Escape") {
      setOpen(false)
    }
  }

  const trimmedValue = value.trim()
  const currentQuery = queryKey(value)
  const isNicknameQuery = trimmedValue.length > 0 && !looksLikeUrlOrId(value)
  const hasCurrentResult = searchedQuery === currentQuery
  const showDropdown =
    open && hasCurrentResult && searchResult.results.length > 0
  const showEmptyHint =
    open &&
    isNicknameQuery &&
    !loading &&
    hasCurrentResult &&
    searchResult.results.length === 0

  return (
    <div ref={containerRef}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <label
          htmlFor="entry-url"
          className="block text-sm font-medium text-slate-700"
        >
          엔트리 프로필 URL 또는 닉네임
        </label>
        <div className="relative">
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              id="entry-url"
              type="text"
              value={value}
              onChange={(event) => {
                setValue(event.target.value)
                setError(null)
                setOpen(true)
                setHighlighted(0)
              }}
              onFocus={() => setOpen(true)}
              onKeyDown={handleKeyDown}
              placeholder="프로필 URL 또는 닉네임"
              className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              autoComplete="off"
              spellCheck={false}
              role="combobox"
              aria-expanded={showDropdown}
              aria-controls="nickname-suggestions"
              aria-busy={loading}
              aria-activedescendant={
                showDropdown ? `nickname-option-${highlighted}` : undefined
              }
            />
            <button
              type="submit"
              className="whitespace-nowrap rounded-lg bg-brand-600 px-5 py-3 font-medium text-white shadow-sm transition hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
            >
              {loading ? "검색 중…" : "통계 보기"}
            </button>
          </div>

          {showDropdown && (
            <ul
              id="nickname-suggestions"
              role="listbox"
              className="absolute left-0 right-0 top-full z-10 mt-1 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg"
            >
              {searchResult.results.map((entry, index) => {
                const isHighlighted = index === highlighted
                return (
                  <li
                    key={entry.id}
                    id={`nickname-option-${index}`}
                    role="option"
                    aria-selected={isHighlighted}
                    onMouseEnter={() => setHighlighted(index)}
                    onMouseDown={(event) => {
                      event.preventDefault()
                      navigateTo(entry.id)
                    }}
                    className={`cursor-pointer border-b border-slate-100 px-4 py-2.5 last:border-b-0 ${
                      isHighlighted ? "bg-brand-50" : "hover:bg-slate-50"
                    }`}
                  >
                    <div className="break-words font-medium text-slate-900">
                      {entry.nickname}
                    </div>
                    <div className="mt-0.5 text-xs text-slate-500">
                      작품 {entry.totalProjects.toLocaleString("ko-KR")}개 · 활동{" "}
                      {formatDays(entry.activityDays)}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}

          {showEmptyHint && (
            <div className="absolute left-0 right-0 top-full z-10 mt-1 rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-lg">
              <p className="break-words text-sm font-medium text-slate-900">
                &lsquo;{trimmedValue}&rsquo; 검색 결과가 없어요.
              </p>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">
                아직 등록되지 않은 유저예요. 엔트리{" "}
                <span className="font-medium text-slate-700">
                  프로필 URL로 최초 1회 검색
                </span>
                하면 닉네임으로도 찾을 수 있어요.
              </p>
            </div>
          )}
        </div>

        {error && (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
      </form>
    </div>
  )
}
