import { describe, it, expect } from "vitest"
import { callModels, pcmToWav } from "@/lib/genai"

describe("callModels 폴백 체인", () => {
  it("첫 모델이 성공하면 그 결과", async () => {
    const seen: string[] = []
    const r = await callModels(async (m) => { seen.push(m); return m }, ["a", "b"])
    expect(r).toBe("a")
    expect(seen).toEqual(["a"])
  })

  it("429면 다음 모델로 즉시 점프", async () => {
    const seen: string[] = []
    const r = await callModels(async (m) => {
      seen.push(m)
      if (m === "a") throw new Error("HTTP 429 RESOURCE_EXHAUSTED")
      return m
    }, ["a", "b"])
    expect(r).toBe("b")
    expect(seen).toEqual(["a", "b"])
  })

  it("모두 실패하면 마지막 에러를 던진다", async () => {
    await expect(
      callModels(async () => { throw new Error("400 bad request") }, ["a"]),
    ).rejects.toThrow("400")
  })
})

describe("pcmToWav", () => {
  it("RIFF/WAVE 헤더(44바이트)를 붙인다", () => {
    const wav = pcmToWav(Buffer.from([1, 2, 3, 4]))
    expect(wav.subarray(0, 4).toString()).toBe("RIFF")
    expect(wav.subarray(8, 12).toString()).toBe("WAVE")
    expect(wav.length).toBe(44 + 4)
  })
})

import { parseModelJson } from "@/lib/genai"

describe("parseModelJson", () => {
  it("정상 JSON은 그대로 파싱", () => {
    expect(parseModelJson<{ a: number }>('{"a":1}')).toEqual({ a: 1 })
  })
  it("LaTeX 역슬래시로 깨진 JSON을 복구", () => {
    const broken = '{"problem":"원주율 $\\pi$ 와 $\\sqrt{2}\\cdot 3$ 의 값"}'
    const q = parseModelJson<{ problem: string }>(broken)
    expect(q.problem).toContain("\\pi")
    expect(q.problem).toContain("\\sqrt{2}")
  })
  it("마크다운 펜스를 제거", () => {
    expect(parseModelJson<{ a: number }>('```json\n{"a":2}\n```')).toEqual({ a: 2 })
  })
})

describe("parseModelJson 줄바꿈 복원", () => {
  it("복구 경로에서 줄바꿈은 살리고 LaTeX \\neq는 유지", () => {
    const broken = '{"explanation":"단계 1: $\\pi$ 사용\\n다음 줄\\n\\n$a \\neq b$"}'
    const q = parseModelJson<{ explanation: string }>(broken)
    expect(q.explanation).toContain("사용\n다음 줄")
    expect(q.explanation).toContain("\\neq")
  })
})

describe("parseModelJson \\u LaTeX 처리", () => {
  it("\\underline 같은 u-시작 LaTeX 명령도 복구", () => {
    const broken = '{"s":"$\\underline{x}$ 와 $\\upsilon$"}'
    const q = parseModelJson<{ s: string }>(broken)
    expect(q.s).toContain("\\underline{x}")
  })
  it("진짜 유니코드 이스케이프는 보존", () => {
    expect(parseModelJson<{ s: string }>('{"s":"\\u0041"}')).toEqual({ s: "A" })
  })
})
