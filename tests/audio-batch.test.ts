import { describe, it, expect, beforeAll, vi } from "vitest"
import os from "node:os"
import path from "node:path"
import type { Work } from "@/lib/types"

// vi.mock 팩토리는 호이스팅되므로 공유 상태는 vi.hoisted로
const h = vi.hoisted(() => ({
  works: new Map<string, unknown>(),
  synthCalls: 0,
  failFor: "",
}))

vi.mock("@/lib/genai", () => ({
  DEFAULT_TTS_VOICE: "Kore",
  DEFAULT_TTS_STYLE: "기본 톤으로",
  synthesize: async (text: string) => {
    h.synthCalls += 1
    if (h.failFor && text.includes(h.failFor)) throw new Error("TTS 실패")
    return Buffer.from("WAV:" + text)
  },
}))

vi.mock("@/lib/repo", () => ({
  getRepo: async () => ({
    getWork: async (id: string) => (h.works.get(id) as Work | undefined) ?? null,
  }),
}))

const mkWork = (id: string, narrations: string[], extra?: Partial<Work>): Work => ({
  id, created_at: "2026-07-16T00:00:00Z", problem: id, answer: "", category: "대수", subtopic: "",
  scenes: narrations.map((n) => ({ narration: n, onscreen: "o", seconds: 4 })),
  total_seconds: narrations.length * 4, thumb: "",
  persona: "star_teacher", voice: "Puck",
  ...extra,
})

const call = (id: string, ip: string) => {
  const req = new Request(`http://test/api/works/${id}/audio`, { headers: { "x-forwarded-for": ip } })
  return route.GET(req, { params: Promise.resolve({ id }) })
}

let route: typeof import("@/app/api/works/[id]/audio/route")

describe("GET /api/works/[id]/audio (배치 오디오)", () => {
  beforeAll(async () => {
    process.env.AUDIO_PATH = path.join(os.tmpdir(), `audio-batch-${process.pid}-${Math.floor(performance.now())}`)
    route = await import("@/app/api/works/[id]/audio/route")
  })

  it("장면 수·순서대로 base64 WAV 반환", async () => {
    h.works.set("w1", mkWork("w1", ["하나", "둘", "셋"]))
    const res = await call("w1", "ip-1")
    const body = await res.json()
    expect(body.audios).toHaveLength(3)
    const decoded = body.audios.map((b: string) => Buffer.from(b, "base64").toString())
    expect(decoded).toEqual(["WAV:하나", "WAV:둘", "WAV:셋"])
  })

  it("재호출은 전부 캐시 히트 — synthesize 추가 호출 없음", async () => {
    const before = h.synthCalls
    const body = await (await call("w1", "ip-2")).json()
    expect(body.audios).toHaveLength(3)
    expect(h.synthCalls).toBe(before)
  })

  it("개별 장면 실패는 해당 인덱스만 null", async () => {
    h.works.set("w2", mkWork("w2", ["좋아", "터져"]))
    h.failFor = "터져"
    const body = await (await call("w2", "ip-3")).json()
    h.failFor = ""
    expect(body.audios[0]).toBeTypeOf("string")
    expect(body.audios[1]).toBeNull()
  })

  it("voice/persona 없는 구 저장물은 기본 페르소나 보이스로 폴백", async () => {
    h.works.set("w3", mkWork("w3", ["옛날"], { persona: undefined, voice: undefined }))
    const body = await (await call("w3", "ip-4")).json()
    expect(Buffer.from(body.audios[0], "base64").toString()).toBe("WAV:옛날")
  })

  it("빈 narration은 합성 없이 null", async () => {
    h.works.set("w4", mkWork("w4", ["", "말"]))
    const body = await (await call("w4", "ip-5")).json()
    expect(body.audios).toEqual([null, expect.any(String)])
  })

  it("미존재 id는 404", async () => {
    const res = await call("없는거", "ip-6")
    expect(res.status).toBe(404)
  })
})
