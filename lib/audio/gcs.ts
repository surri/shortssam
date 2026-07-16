import { Storage } from "@google-cloud/storage"
import { AUDIO_KEY_RE, type AudioStore } from "./index"

// 로컬에선 import되지 않음(getAudioStore가 AUDIO_BUCKET 설정 시에만 지연 로드).
// 사전준비: GCS 버킷 + 서비스계정 roles/storage.objectAdmin — docs/DEPLOY-GCP.md 참고.
const bucket = new Storage().bucket(process.env.AUDIO_BUCKET as string)

const objectPath = (key: string) => `tts/${key}.wav`

/** GCS 오디오 캐시 — Cloud Run 서비스계정(ADC) 키리스 인증. local과 동일한 키 가드로 방어 수준 통일. */
export const gcsAudioStore: AudioStore = {
  async get(key) {
    if (!AUDIO_KEY_RE.test(key)) return null
    try {
      const [data] = await bucket.file(objectPath(key)).download()
      return data
    } catch {
      // 404 포함 모든 에러는 캐시 미스로 취급(합성 폴백)
      return null
    }
  },

  async put(key, data) {
    if (!AUDIO_KEY_RE.test(key)) return
    // 200~300KB 단건이라 non-resumable 단일 요청이 빠름
    await bucket.file(objectPath(key)).save(data, { contentType: "audio/wav", resumable: false })
  },
}
