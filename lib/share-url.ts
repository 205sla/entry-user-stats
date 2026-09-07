import type { RankingType } from "@/lib/ranking-types"

/** 클립보드에 보이는 한글 주소와 메타데이터에 쓰는 ASCII 주소. */
export const PUBLIC_SITE_ORIGIN = "https://유저찾기.엔트리.org"
export const SITE_ORIGIN = "https://xn--ok0bx68bhtav5k.xn--oy2b95t44j.org"

/**
 * 한글은 읽기 좋게 유지하고, URL 경로의 의미를 바꾸는 문자만 이스케이프한다.
 * 슬래시는 catch-all 라우트가 다시 합치므로 닉네임의 일부로 보존한다.
 */
export function encodeFriendlyNickname(nickname: string): string {
  return nickname
    .trim()
    .normalize("NFC")
    .replace(/[%?#\\\s\u0000-\u001f\u007f]/gu, (char) =>
      encodeURIComponent(char),
    )
}

export function normalizeNickname(nickname: string): string {
  return nickname.trim().normalize("NFC").toLocaleLowerCase("ko-KR")
}

export function decodeFriendlyNickname(segments: string[]): string {
  return segments
    .map((segment) => {
      try {
        return decodeURIComponent(segment)
      } catch {
        return segment
      }
    })
    .join("/")
}

export function profileShareUrl(nickname: string): string {
  return `${PUBLIC_SITE_ORIGIN}/l/${encodeFriendlyNickname(nickname)}`
}

export function rankingShareUrl(type: RankingType): string {
  return type === "views"
    ? `${PUBLIC_SITE_ORIGIN}/ranking`
    : `${PUBLIC_SITE_ORIGIN}/ranking?type=${type}`
}
