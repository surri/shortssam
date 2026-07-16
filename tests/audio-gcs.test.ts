import { describe, it, expect, beforeAll, vi } from "vitest"

// vi.mock 팩토리는 호이스팅되므로 공유 상태는 vi.hoisted로
const h = vi.hoisted(() => ({
  objects: new Map<string, Buffer>(),
  saveOpts: [] as unknown[],
}))

vi.mock("@google-cloud/storage", () => ({
  Storage: class {
    bucket() {
      return {
        file: (name: string) => ({
          download: async () => {
            const buf = h.objects.get(name)
            if (!buf) throw new Error("No such object")
            return [buf]
          },
          save: async (data: Buffer, opts: unknown) => {
            h.saveOpts.push(opts)
            h.objects.set(name, data)
          },
        }),
      }
    }
  },
}))

const KEY = "c".repeat(64)

describe("gcsAudioStore (GCS 오디오 캐시)", () => {
  let store: typeof import("@/lib/audio/gcs").gcsAudioStore

  beforeAll(async () => {
    process.env.AUDIO_BUCKET = "test-bucket"
    store = (await import("@/lib/audio/gcs")).gcsAudioStore
  })

  it("put → get 라운드트립, tts/ 프리픽스와 WAV 저장 옵션", async () => {
    await store.put(KEY, Buffer.from("wav-bytes"))
    expect(h.objects.has(`tts/${KEY}.wav`)).toBe(true)
    expect(h.saveOpts[0]).toMatchObject({ contentType: "audio/wav", resumable: false })
    expect((await store.get(KEY))?.toString()).toBe("wav-bytes")
  })

  it("미존재(404 등 download 에러)는 null — 캐시 미스 취급", async () => {
    expect(await store.get("d".repeat(64))).toBeNull()
  })

  it("비정상 키는 저장/조회하지 않음 — local과 동일한 방어 가드", async () => {
    await store.put("../evil", Buffer.from("x"))
    expect(h.objects.has("tts/../evil.wav")).toBe(false)
    expect(await store.get("../evil")).toBeNull()
  })
})
