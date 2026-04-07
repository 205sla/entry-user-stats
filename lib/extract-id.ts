/**
 * Entry 프로필 URL 또는 임의 문자열에서 24자리 hex ObjectId를 추출한다.
 * 허용 형식:
 *   - https://playentry.org/profile/56136825dadc91e1235b460d
 *   - https://playentry.org/profile/56136825dadc91e1235b460d/project?sort=created
 *   - 56136825dadc91e1235b460d (순수 ID)
 *   - playentry.org/profile/56136825dadc91e1235b460d/...
 */
const OBJECT_ID = /[a-f0-9]{24}/i

export function extractEntryId(input: string): string | null {
  if (!input) return null
  const trimmed = input.trim()
  const match = trimmed.match(OBJECT_ID)
  if (!match) return null
  return match[0].toLowerCase()
}

export function isValidEntryId(id: string): boolean {
  return /^[a-f0-9]{24}$/i.test(id)
}
