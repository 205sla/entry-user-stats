"use client"

import { useMemo, useRef, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { extractEntryId } from "@/lib/extract-id"
import type { NicknameEntry } from "@/lib/nickname-index"
import { formatDays } from "@/lib/aggregate"

interface Props {
  /** 자동완성용 전체 닉네임 인덱스 (서버에서 ISR 5분 캐시로 전달) */
  nicknameIndex: NicknameEntry[]
}

const MAX_SUGGESTIONS = 8

/**
 * 입력 텍스트가 URL 또는 24자리 ObjectId 패턴인지 판별.
 * 이 경우 자동완성을 보여주지 않고 기존 흐름대로 처리한다.
 */
function looksLikeUrlOrId(input: string): boolean {
  const trimmed = input.trim()
  if (!trimmed) return false
  if (trimmed.includes("/") || trimmed.includes("playentry")) return true
  return /^[a-f0-9]{24}$/i.test(trimmed)
}

/**
 * 대소문자 무시 + 정확→startsWith→includes 순 우선순위로 필터링.
 * 각 그룹 내에서는 작품 수 내림차순으로 정렬.
 */
function filterByQuery(
  index: NicknameEntry[],
  query: string,
): NicknameEntry[] {
  const q = query.trim().toLowerCase()
  if (!q) return []

  const exact: NicknameEntry[] = []
  const starts: NicknameEntry[] = []
  const contains: NicknameEntry[] = []

  for (const entry of index) {
    const n = entry.nickname.toLowerCase()
    if (n === q) exact.push(entry)
    else if (n.startsWith(q)) starts.push(entry)
    else if (n.includes(q)) contains.push(entry)
  }

  const sortFn = (a: NicknameEntry, b: NicknameEntry) =>
    b.totalProjects - a.totalProjects

  exact.sort(sortFn)
  starts.sort(sortFn)
  contains.sort(sortFn)

  return [...exact, ...starts, ...contains].slice(0, MAX_SUGGESTIONS)
}

export default function UrlForm({ nicknameIndex }: Props) {
  const router = useRouter()
  const [value, setValue] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [highlighted, setHighlighted] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  const suggestions = useMemo(() => {
    if (looksLikeUrlOrId(value)) return []
    return filterByQuery(nicknameIndex, value)
  }, [nicknameIndex, value])

  // 외부 클릭으로 드롭다운 닫기
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // suggestions 바뀌면 하이라이트 초기화
  useEffect(() => {
    setHighlighted(0)
  }, [value])

  function navigateTo(id: string) {
    router.push(`/u/${id}`)
  }

  function handleSelectSuggestion(entry: NicknameEntry) {
    setOpen(false)
    navigateTo(entry.id)
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    // 1) 드롭다운 열려 있고 하이라이트된 제안 있으면 그걸 선택
    if (open && suggestions.length > 0) {
      handleSelectSuggestion(suggestions[highlighted])
      return
    }

    // 2) URL / ID 패턴이면 바로 추출
    const id = extractEntryId(value)
    if (id) {
      navigateTo(id)
      return
    }

    // 3) 닉네임 정확 일치 하나만 있으면 자동 이동
    const q = value.trim().toLowerCase()
    const exactMatches = nicknameIndex.filter(
      (e) => e.nickname.toLowerCase() === q,
    )
    if (exactMatches.length === 1) {
      navigateTo(exactMatches[0].id)
      return
    }
    if (exactMatches.length > 1) {
      // 동명이인 → 드롭다운 강제 노출로 선택 유도
      setOpen(true)
      setError(
        `"${value.trim()}" 와(과) 동일한 닉네임 ${exactMatches.length}건. 아래에서 선택해 주세요.`,
      )
      return
    }

    // 4) 매칭 없음
    if (value.trim()) {
      setError(
        "일치하는 닉네임이 없어요. 엔트리 프로필 URL 을 붙여넣어 주세요.",
      )
    } else {
      setError("검색어를 입력해 주세요.")
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || suggestions.length === 0) return

    if (e.key === "ArrowDown") {
      e.preventDefault()
      setHighlighted((i) => (i + 1) % suggestions.length)
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setHighlighted(
        (i) => (i - 1 + suggestions.length) % suggestions.length,
      )
    } else if (e.key === "Escape") {
      setOpen(false)
    }
  }

  const showDropdown = open && suggestions.length > 0

  return (
    <div ref={containerRef} className="relative">
      <form onSubmit={handleSubmit} className="space-y-3">
        <label
          htmlFor="entry-url"
          className="block text-sm font-medium text-slate-700"
        >
          엔트리 프로필 URL 또는 닉네임
        </label>
        <div className="flex gap-2">
          <input
            id="entry-url"
            type="text"
            value={value}
            onChange={(e) => {
              setValue(e.target.value)
              setError(null)
              setOpen(true)
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder="프로필 URL 또는 닉네임"
            className="flex-1 rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
            autoComplete="off"
            spellCheck={false}
            role="combobox"
            aria-expanded={showDropdown}
            aria-controls="nickname-suggestions"
            aria-activedescendant={
              showDropdown ? `nickname-option-${highlighted}` : undefined
            }
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

      {showDropdown && (
        <ul
          id="nickname-suggestions"
          role="listbox"
          className="absolute left-0 right-0 top-[72px] z-10 mt-1 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg"
        >
          {suggestions.map((entry, idx) => {
            const isHighlighted = idx === highlighted
            return (
              <li
                key={entry.id}
                id={`nickname-option-${idx}`}
                role="option"
                aria-selected={isHighlighted}
                onMouseEnter={() => setHighlighted(idx)}
                onMouseDown={(e) => {
                  // onBlur 보다 먼저 실행되게
                  e.preventDefault()
                  handleSelectSuggestion(entry)
                }}
                className={`cursor-pointer border-b border-slate-100 px-4 py-2.5 last:border-b-0 ${
                  isHighlighted ? "bg-brand-50" : "hover:bg-slate-50"
                }`}
              >
                <div className="font-medium text-slate-900">
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
    </div>
  )
}
