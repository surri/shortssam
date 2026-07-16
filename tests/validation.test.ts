import { describe, it, expect } from "vitest"
import { GenerateBody, TTSBody, WorksQuery, SimilarQuery } from "@/lib/validation"

const dataUrl = "data:image/png;base64," + "A".repeat(20)

describe("validation", () => {
  it("GenerateBody: 이미지 data URL만 허용", () => {
    expect(GenerateBody.safeParse({ image: dataUrl }).success).toBe(true)
    expect(GenerateBody.safeParse({ image: "http://x/y.png" }).success).toBe(false)
    expect(GenerateBody.safeParse({}).success).toBe(false)
  })

  it("GenerateBody: voice는 보이스명 형식만 허용(생략 가능)", () => {
    expect(GenerateBody.safeParse({ image: dataUrl, voice: "Puck" }).success).toBe(true)
    expect(GenerateBody.safeParse({ image: dataUrl }).success).toBe(true)
    expect(GenerateBody.safeParse({ image: dataUrl, voice: "Kore!" }).success).toBe(false)
    expect(GenerateBody.safeParse({ image: dataUrl, voice: "" }).success).toBe(false)
  })

  it("TTSBody: 빈 텍스트/이상한 음성 거부", () => {
    expect(TTSBody.safeParse({ text: "안녕", voice: "Kore" }).success).toBe(true)
    expect(TTSBody.safeParse({ text: "" }).success).toBe(false)
    expect(TTSBody.safeParse({ text: "x", voice: "Kore; rm -rf" }).success).toBe(false)
  })

  it("WorksQuery/SimilarQuery: 기본값과 범위 제한", () => {
    expect(WorksQuery.parse({}).limit).toBe(60)
    expect(WorksQuery.safeParse({ limit: "9999" }).success).toBe(false)
    expect(SimilarQuery.parse({}).k).toBe(5)
    expect(SimilarQuery.safeParse({ k: "0" }).success).toBe(false)
  })
})
