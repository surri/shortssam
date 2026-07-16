import { createHash } from "node:crypto"
import { DEFAULT_TTS_STYLE, DEFAULT_TTS_VOICE, synthesize } from "../genai"
import { localAudioStore } from "./local"

export type AudioStore = {
  /** 캐시 조회 — 미존재/에러는 null(=미스). */
  get(key: string): Promise<Buffer | null>
  put(key: string, data: Buffer): Promise<void>
}

/** 캐시 키 형식(sha256 hex) — 저장소 구현들이 공유하는 방어 가드(경로/오브젝트명 오염 차단). */
export const AUDIO_KEY_RE = /^[a-f0-9]{64}$/

/** AUDIO_BUCKET 설정 시 GCS(지연 로드 — 로컬에 자격증명 없어도 OK), 아니면 로컬 파일. repo의 STORAGE 스위치 패턴. */
export async function getAudioStore(): Promise<AudioStore> {
  if (process.env.AUDIO_BUCKET) {
    const mod = await import("./gcs")
    return mod.gcsAudioStore
  }
  return localAudioStore
}

/** voice/style 기본값 정규화 — 키 계산과 합성이 반드시 같은 값을 쓰도록 여기 한 곳에서만. */
const norm = (voice?: string, style?: string) => ({
  voice: voice || DEFAULT_TTS_VOICE,
  style: style || DEFAULT_TTS_STYLE,
})

/** 내용 기반 캐시 키 — sha256(text ␀ voice ␀ style) hex. 생략과 기본값 명시가 같은 키가 되도록 정규화. */
export function audioCacheKey(text: string, voice?: string, style?: string): string {
  const n = norm(voice, style)
  return createHash("sha256").update([text, n.voice, n.style].join("\u0000")).digest("hex")
}

/** 합성 + 캐시 저장(실패 무시) — 캐시 조회 없음. 미스가 이미 확정된 경로(배치 라우트)용. */
export async function synthesizeAndCache(
  store: AudioStore, key: string, text: string, voice?: string, style?: string,
): Promise<Buffer> {
  const n = norm(voice, style)
  const wav = await synthesize(text, n.voice, n.style)
  // Cloud Run은 응답 후 CPU가 회수될 수 있어 fire-and-forget 대신 응답 전에 await(200~300KB라 지연 미미)
  await store.put(key, wav).catch(() => {})
  return wav
}

/** 캐시 조회 → 미스면 합성 + 저장 → WAV Buffer. /api/tts의 진입점. */
export async function getOrSynthesize(text: string, voice?: string, style?: string): Promise<Buffer> {
  const store = await getAudioStore()
  const key = audioCacheKey(text, voice, style)
  const hit = await store.get(key).catch(() => null)
  if (hit) return hit
  return synthesizeAndCache(store, key, text, voice, style)
}
