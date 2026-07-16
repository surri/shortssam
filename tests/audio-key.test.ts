import { describe, it, expect } from "vitest"
import { audioCacheKey } from "@/lib/audio"
import { DEFAULT_TTS_STYLE } from "@/lib/genai"

describe("audioCacheKey (내용 기반 캐시 키)", () => {
  it("동일 입력은 동일 키, 필드 하나만 달라도 다른 키", () => {
    const k = audioCacheKey("엑스 제곱", "Kore", "밝게")
    expect(audioCacheKey("엑스 제곱", "Kore", "밝게")).toBe(k)
    expect(audioCacheKey("엑스 세제곱", "Kore", "밝게")).not.toBe(k)
    expect(audioCacheKey("엑스 제곱", "Puck", "밝게")).not.toBe(k)
    expect(audioCacheKey("엑스 제곱", "Kore", "차분하게")).not.toBe(k)
  })

  it("생략과 기본값 명시는 같은 키 — /api/tts와 배치 라우트의 히트 보장", () => {
    expect(audioCacheKey("안녕")).toBe(audioCacheKey("안녕", "Kore", DEFAULT_TTS_STYLE))
    expect(audioCacheKey("안녕", undefined, "밝게")).toBe(audioCacheKey("안녕", "Kore", "밝게"))
    expect(audioCacheKey("안녕", "Puck")).toBe(audioCacheKey("안녕", "Puck", DEFAULT_TTS_STYLE))
  })

  it("sha256 hex 형식(파일명/오브젝트명 안전)", () => {
    expect(audioCacheKey("x", "Kore", "s")).toMatch(/^[a-f0-9]{64}$/)
  })

  it("필드 경계 우회 불가", () => {
    expect(audioCacheKey("ab", "cd", "e")).not.toBe(audioCacheKey("a", "bcd", "e"))
    expect(audioCacheKey("a", "bc", "de")).not.toBe(audioCacheKey("a", "bcd", "e"))
  })
})
