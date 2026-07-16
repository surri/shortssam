import { NextResponse } from "next/server"
import { generateScript, embed, type GenResult } from "@/lib/genai"
import { MOCK_WORKS } from "@/lib/mock"
import { DEFAULT_PERSONA, PERSONAS, isPersonaId } from "@/lib/persona"
import { getRepo } from "@/lib/repo"
import { GenerateBody } from "@/lib/validation"
import { clientIp, rateLimit } from "@/lib/ratelimit"
import type { Work } from "@/lib/types"

export const runtime = "nodejs"
export const maxDuration = 120

function toWork(data: GenResult, thumb: string, persona?: string, voice?: string): Work {
  return {
    id: crypto.randomUUID().slice(0, 12),
    created_at: new Date().toISOString(),
    problem: data.problem || "",
    answer: data.answer || "",
    category: data.category || "",
    subtopic: data.subtopic || "",
    scenes: data.scenes || [],
    total_seconds: data.total_seconds || 0,
    thumb,
    persona,
    // 항상 구체값으로 — 배치 오디오 라우트의 캐시 키 결정성 + Firestore의 undefined 필드 거부 회피
    voice: voice ?? PERSONAS[isPersonaId(persona) ? persona : DEFAULT_PERSONA].voice,
  }
}

export async function POST(req: Request) {
  if (!rateLimit(clientIp(req), 20)) {
    return NextResponse.json({ error: "요청이 너무 많아요. 잠시 후 다시 시도하세요." }, { status: 429 })
  }
  const parsed = GenerateBody.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) {
    return NextResponse.json({ error: "잘못된 요청: " + parsed.error.issues[0].message }, { status: 400 })
  }
  const { image, thumb, presetKey, persona, voice } = parsed.data

  // 데모 프리셋 — Gemini 호출 없이 즉시 응답(저장·RAG에는 넣지 않음)
  if (presetKey) {
    const mock = MOCK_WORKS[presetKey]
    if (!mock) return NextResponse.json({ error: "알 수 없는 프리셋이에요" }, { status: 400 })
    return NextResponse.json(toWork(mock, "", persona, voice))
  }

  try {
    const data = await generateScript(image!, persona)
    const work = toWork(data, thumb || image!, persona, voice)
    const repo = await getRepo()
    await repo.saveWork(work, await embed(`${work.problem} ${work.category} ${work.subtopic}`))
    return NextResponse.json(work)
  } catch (e) {
    // 데모 폴백 — 발표 중 API 장애가 나도 흐름이 끊기지 않게 목데이터로 전환
    const fallback = toWork(MOCK_WORKS.quad, thumb || "", persona, voice)
    return NextResponse.json({
      ...fallback,
      notice: "AI 호출에 실패해 데모 풀이로 전환했어요 — " + String((e as Error).message ?? e),
    })
  }
}
