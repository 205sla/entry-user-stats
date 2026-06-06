"use client"

import { useMemo, useRef, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { extractEntryId } from "@/lib/extract-id"
import type { NicknameEntry } from "@/lib/nickname-index"
import { toSearchable, searchNicknames } from "@/lib/nickname-search"
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

export default function UrlForm({ nicknameIndex }: Props) {
  const router = useRouter()
  const [value, setValue] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [highlighted, setHighlighted] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  // 초성/자모 매칭을 위해 닉네임별 초성·자모를 1회만 미리 계산
  const searchable = useMemo(() => toSearchable(nicknameIndex), [nicknameIndex])

  const suggestions = useMemo(() => {
    if (looksLikeUrlOrId(value)) return []
    return searchNicknames(searchable, value, MAX_SUGGESTIONS)
  }, [searchable, value])

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
        "일치하는 닉네임이 없어요. 프로필 URL로 최초 1회 검색하면 닉네임 검색에 등록돼요.",
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

  const trimmedValue = value.trim()
  const isNicknameQuery = trimmedValue.length > 0 && !looksLikeUrlOrId(value)
  const showDropdown = open && suggestions.length > 0
  // 닉네임을 입력했지만 매칭이 없을 때: 프로필 URL 최초 1회 검색 안내
  const showEmptyHint = open && isNicknameQuery && suggestions.length === 0

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

      {showEmptyHint && (
        <div className="absolute left-0 right-0 top-[72px] z-10 mt-1 rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-lg">
          <p className="text-sm font-medium text-slate-900">
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
  )
}
