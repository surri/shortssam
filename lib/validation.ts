import { z } from "zod"

const PERSONA_IDS = ["star_teacher", "snu_mentor", "math_savior"] as const

/** Gemini TTS 보이스명 형식(GenerateBody·TTSBody 공용) */
const VOICE_RE = /^[A-Za-z]{2,20}$/

/** POST /api/generate 요청 본문 — 이미지 업로드 또는 데모 프리셋 중 하나 필수 */
export const GenerateBody = z
  .object({
    image: z.string().min(16).refine((s) => s.startsWith("data:image/"), "이미지 data URL이 필요합니다").optional(),
    thumb: z.string().startsWith("data:image/").optional(),
    presetKey: z.string().max(20).optional(),
    persona: z.enum(PERSONA_IDS).optional(),
    voice: z.string().regex(VOICE_RE).optional(),
  })
  .refine((b) => b.image || b.presetKey, { message: "이미지 또는 프리셋이 필요합니다" })

/** POST /api/tts 요청 본문 */
export const TTSBody = z.object({
  text: z.string().min(1).max(2000),
  voice: z.string().regex(VOICE_RE).optional(),
  style: z.string().max(120).optional(),
})

/** POST /api/quiz 요청 본문 */
export const QuizBody = z.object({
  category: z.string().min(1).max(60),
  subtopic: z.string().max(60).optional(),
  problem: z.string().max(2000).optional(),
})

/** GET /api/works 쿼리 */
export const WorksQuery = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(60),
  category: z.string().max(60).optional(),
})

/** GET /api/works/[id]/similar 쿼리 */
export const SimilarQuery = z.object({
  k: z.coerce.number().int().min(1).max(20).default(5),
})
