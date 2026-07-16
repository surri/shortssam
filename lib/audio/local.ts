import fs from "node:fs"
import path from "node:path"
import { AUDIO_KEY_RE, type AudioStore } from "./index"

const DIR = process.env.AUDIO_PATH || path.join(process.cwd(), "data", "audio")

/** 로컬 오디오 캐시 — data/audio/<sha256>.wav 파일(해커톤 규모에 충분). 키 가드로 경로 탈출 차단. */
export const localAudioStore: AudioStore = {
  async get(key) {
    if (!AUDIO_KEY_RE.test(key)) return null
    try {
      return await fs.promises.readFile(path.join(DIR, key + ".wav"))
    } catch {
      return null
    }
  },

  async put(key, data) {
    if (!AUDIO_KEY_RE.test(key)) return
    await fs.promises.mkdir(DIR, { recursive: true })
    await fs.promises.writeFile(path.join(DIR, key + ".wav"), data)
  },
}
