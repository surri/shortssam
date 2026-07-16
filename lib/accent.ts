export type CaptionPart = { text: string; accent: boolean }

/** 나레이션을 accentWords 기준으로 분해(자막 컬러 강조 렌더링용). 본문에 없는 단어는 무시. */
export function splitByAccents(text: string, words: string[] = []): CaptionPart[] {
  const valid = [...new Set(words)].filter((w) => w && text.includes(w))
  if (valid.length === 0) return [{ text, accent: false }]
  const escaped = valid.map((w) => w.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&"))
  const re = new RegExp(`(${escaped.join("|")})`, "g")
  return text
    .split(re)
    .filter((p) => p !== "")
    .map((p) => ({ text: p, accent: valid.includes(p) }))
}
