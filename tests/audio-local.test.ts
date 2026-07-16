import { describe, it, expect, beforeAll } from "vitest"
import os from "node:os"
import path from "node:path"

const KEY = "a".repeat(64)

describe("localAudioStore (data/audio 파일 캐시)", () => {
  let store: typeof import("@/lib/audio/local").localAudioStore

  beforeAll(async () => {
    process.env.AUDIO_PATH = path.join(os.tmpdir(), `audio-test-${process.pid}-${Math.floor(performance.now())}`)
    store = (await import("@/lib/audio/local")).localAudioStore
  })

  it("put → get 라운드트립(Buffer 동일)", async () => {
    const wav = Buffer.from("RIFF-fake-wav")
    await store.put(KEY, wav)
    const got = await store.get(KEY)
    expect(got?.equals(wav)).toBe(true)
  })

  it("미존재 키는 null", async () => {
    expect(await store.get("b".repeat(64))).toBeNull()
  })

  it("같은 키 재-put은 덮어쓰기", async () => {
    const next = Buffer.from("RIFF-new")
    await store.put(KEY, next)
    expect((await store.get(KEY))?.equals(next)).toBe(true)
  })

  it("비정상 키(경로 문자·형식 위반)는 null — 디렉터리 탈출 방어", async () => {
    expect(await store.get("../../etc/passwd")).toBeNull()
    expect(await store.get("ABC")).toBeNull()
  })
})
