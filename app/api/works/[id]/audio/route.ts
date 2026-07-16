import { NextResponse } from "next/server"
import { audioCacheKey, getAudioStore, synthesizeAndCache } from "@/lib/audio"
import { DEFAULT_PERSONA, PERSONAS, isPersonaId } from "@/lib/persona"
import { getRepo } from "@/lib/repo"
import { clientIp, rateLimit } from "@/lib/ratelimit"

export const runtime = "nodejs"
export const maxDuration = 120

// Gemini TTS 프리뷰 모델의 낮은 RPM 보호 — 동시 429로 전 장면이 폴백 모델로 밀리는 것 방지
const TTS_CONCURRENCY = 2
// TTSBody의 text 상한과 동일
const MAX_NARRATION = 2000

/** limit개씩 청크 병렬 처리(순서 보존) — 장면 최대 6개 규모라 워커 큐 없이 충분. */
async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T, i: number) => Promise<R>): Promise<R[]> {
  const out: R[] = []
  for (let start = 0; start < items.length; start += limit) {
    const part = await Promise.all(items.slice(start, start + limit).map((item, j) => fn(item, start + j)))
    out.push(...part)
  }
  return out
}

/** 저장된 숏츠의 전 장면 오디오를 1회 왕복으로 — 캐시 히트는 즉시, 미스만 합성+캐시. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  // "audio:" 프리픽스 — ratelimit 버킷이 IP 키로 전 라우트 공유라 /api/tts 사용량과 크로스토크 방지
  if (!rateLimit("audio:" + clientIp(req), 10)) {
    return NextResponse.json({ error: "요청이 너무 많아요. 잠시 후 다시 시도하세요." }, { status: 429 })
  }
  const { id } = await params
  const repo = await getRepo()
  const work = await repo.getWork(id)
  if (!work) return NextResponse.json({ error: "not found" }, { status: 404 })

  // 원본 보이스 고정 — 구 저장물(voice 없음)은 페르소나 기본 보이스로 결정적 폴백.
  // style은 영속화하지 않음 — persona.ttsStyle 문구를 바꾸면 기존 캐시가 무효화되어 첫 재생 때 재합성됨(의도된 트레이드오프)
  const p = PERSONAS[isPersonaId(work.persona) ? work.persona : DEFAULT_PERSONA]
  const voice = work.voice || p.voice
  const style = p.ttsStyle

  try {
    const store = await getAudioStore()
    const narrations = work.scenes.map((sc) => (sc.narration || "").slice(0, MAX_NARRATION))
    const keys = narrations.map((n) => (n ? audioCacheKey(n, voice, style) : null))
    // 1단계: 전 장면 캐시 병렬 조회(저장소 읽기는 TTS 쿼터와 무관)
    const cached = await Promise.all(
      keys.map((k) => (k ? store.get(k).catch(() => null) : null)),
    )
    // 2단계: 미스 장면만 제한 병렬 합성+캐시 — 개별 실패는 null(클라이언트에 speechSynthesis 폴백 있음)
    const audios = await mapLimit(cached, TTS_CONCURRENCY, async (hit, i) => {
      if (hit) return hit.toString("base64")
      const key = keys[i]
      if (!key) return null
      try {
        return (await synthesizeAndCache(store, key, narrations[i], voice, style)).toString("base64")
      } catch {
        return null
      }
    })
    return NextResponse.json({ audios })
  } catch {
    // 상세 에러는 노출하지 않음 — GCS/ADC 에러에 버킷명·권한 힌트가 담길 수 있음(클라이언트는 장면별 TTS로 폴백)
    return NextResponse.json({ error: "오디오를 불러오지 못했어요" }, { status: 500 })
  }
}
