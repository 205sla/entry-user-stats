/** 미수집·잘못된 수치는 실제 0과 구분한다. */
export function collectedCount(value: unknown): number | null {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0
    ? value
    : null
}
