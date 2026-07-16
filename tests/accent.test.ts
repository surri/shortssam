import { describe, it, expect } from "vitest"
import { splitByAccents } from "@/lib/accent"

describe("splitByAccents", () => {
  it("강조 단어를 accent 파트로 분리한다", () => {
    const parts = splitByAccents("정답은 이와 삼! 이것만 기억해!", ["이와 삼", "기억해"])
    expect(parts.filter((p) => p.accent).map((p) => p.text)).toEqual(["이와 삼", "기억해"])
    expect(parts.map((p) => p.text).join("")).toBe("정답은 이와 삼! 이것만 기억해!")
  })

  it("본문에 없는 단어는 무시한다", () => {
    const parts = splitByAccents("등차수열 일반항", ["없는말"])
    expect(parts).toEqual([{ text: "등차수열 일반항", accent: false }])
  })

  it("accentWords가 없으면 통짜 한 파트", () => {
    expect(splitByAccents("그냥 문장")).toEqual([{ text: "그냥 문장", accent: false }])
  })

  it("정규식 특수문자가 들어가도 안전하다", () => {
    const parts = splitByAccents("값은 (x+1) 이야", ["(x+1)"])
    expect(parts.filter((p) => p.accent).map((p) => p.text)).toEqual(["(x+1)"])
  })
})
