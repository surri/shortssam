import { NextResponse } from "next/server"
import { generateQuiz } from "@/lib/genai"
import { MOCK_QUIZ } from "@/lib/mock"
import { QuizBody } from "@/lib/validation"
import { clientIp, rateLimit } from "@/lib/ratelimit"

export const runtime = "nodejs"
export const maxDuration = 60

export async function POST(req: Request) {
  if (!rateLimit(clientIp(req), 20)) {
    return NextResponse.json({ error: "요청이 너무 많아요. 잠시 후 다시 시도하세요." }, { status: 429 })
  }
  const parsed = QuizBody.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) {
    return NextResponse.json({ error: "잘못된 요청: " + parsed.error.issues[0].message }, { status: 400 })
  }
  const { category, subtopic, problem } = parsed.data
  const concept = subtopic ? `${category} - ${subtopic}` : category
  try {
    return NextResponse.json(await generateQuiz(concept, problem))
  } catch (e) {
    // 데모 폴백 — 퀴즈 생성 실패 시에도 학습 루프가 이어지도록
    return NextResponse.json({
      ...MOCK_QUIZ,
      notice: "AI 출제에 실패해 준비된 문제로 전환했어요 — " + String((e as Error).message ?? e),
    })
  }
}
