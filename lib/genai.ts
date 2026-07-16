import { GoogleGenAI } from "@google/genai"
import { CATEGORIES, taxonomyHint } from "./curriculum"
import { PERSONAS, type PersonaId } from "./persona"
import type { Quiz, Scene } from "./types"

// gemini-3.5-flash(AI Studio 기본)를 선두에 — 미지원 환경이면 체인이 자동 폴백
const GEN_CHAIN = ["gemini-3.5-flash", "gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-2.0-flash"]
// 신규 키에서 2.5 TTS는 무음 응답 → 3.1 우선, 빈 오디오도 폴백 처리(synthesize 참고)
const TTS_CHAIN = [process.env.TTS_MODEL || "gemini-3.1-flash-tts-preview", "gemini-2.5-flash-preview-tts", "gemini-2.5-pro-preview-tts"]
export const EMBED_MODEL = "gemini-embedding-001"
export const EMBED_DIM = 1536

let _ai: GoogleGenAI | null = null
// 로컬: GEMINI_API_KEY / GCP: GOOGLE_GENAI_USE_VERTEXAI=true → Vertex(서비스계정)
export function ai(): GoogleGenAI {
  if (_ai) return _ai
  if (process.env.GOOGLE_GENAI_USE_VERTEXAI === "true") {
    _ai = new GoogleGenAI({
      vertexai: true,
      project: process.env.GOOGLE_CLOUD_PROJECT,
      location: process.env.GOOGLE_CLOUD_LOCATION || "us-central1",
    })
  } else {
    _ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
  }
  return _ai
}

/** 폴백 체인: 429는 다음 모델로 즉시, 503/500은 짧게 재시도. (테스트를 위해 export) */
export async function callModels<T>(fn: (model: string) => Promise<T>, models: string[]): Promise<T> {
  let last: unknown
  for (const model of models) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        return await fn(model)
      } catch (e) {
        last = e
        const s = String((e as Error)?.message ?? e)
        if (s.includes("429") || s.includes("RESOURCE_EXHAUSTED")) break
        if (s.includes("503") || s.includes("500") || s.includes("UNAVAILABLE")) {
          await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)))
          continue
        }
        break
      }
    }
  }
  throw last
}

/**
 * 깨진 모델 JSON의 이스케이프 복구 — 문자열을 왼쪽부터 걸으며 이스케이프 "쌍"을 소비한다.
 * 유효(\\ \" \/ \uXXXX)는 그대로 두고, 무효(\l, \p, \f …)만 리터럴 역슬래시로 승격.
 * 정규식 치환은 \\le처럼 이미 올바른 쌍의 두 번째 역슬래시를 다시 이스케이프해 JSON을 깨뜨린다.
 */
function repairJsonEscapes(t: string): string {
  let out = ""
  for (let i = 0; i < t.length; i++) {
    const c = t[i]
    if (c !== "\\") { out += c; continue }
    const n = t[i + 1]
    const validPair = n === "\\" || n === '"' || n === "/" ||
      (n === "u" && /^[0-9a-fA-F]{4}$/.test(t.slice(i + 2, i + 6)))
    if (validPair) { out += c + n; i++ }
    else out += "\\\\"
  }
  return out
}

/** 모델 JSON 파싱 — LaTeX 역슬래시(\pi, \sqrt, \\le 등)가 JSON 이스케이프를 깨면 복구 후 재시도. (테스트를 위해 export) */
export function parseModelJson<T>(text: string): T {
  const t = (text || "").trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "")
  try {
    return JSON.parse(t)
  } catch {
    const obj = JSON.parse(repairJsonEscapes(t))
    // 승격 과정에서 리터럴 "\n"이 된 줄바꿈을 복원(단, \neq 같은 LaTeX 명령은 유지)
    return JSON.parse(JSON.stringify(obj).replace(/\\\\n(?![a-zA-Z])/g, "\\n"))
  }
}

const PROMPT = String.raw`이 이미지는 수학 문제입니다.
(1) 문제를 정확히 읽고 (2) 단계적으로 풀고 (3) 유튜브 숏츠용 짧은 설명 대본을 만들고 (4) 한국 고교 수학 커리큘럼으로 분류하세요.

형식 규칙(매우 중요 — 두 필드 형식이 다름):
- narration: 소리 내어 읽을 순수 한국어 구어체 한 문장. LaTeX·수식기호 절대 금지, 수식은 말로 풀어쓰기.
  예) "3^{1/2}"(X) -> "3의 2분의 1제곱"(O), "x^2"(X) -> "엑스 제곱"(O), "sqrt(2)"(X) -> "루트 2"(O).
- narration 말투: {tone}. 이 말투를 모든 장면에 일관되게 입히세요.
- accentWords: 해당 장면 narration에 실제로 등장하는 표현 중 자막에서 컬러로 강조할 짧은 단어/구 1~3개.
- onscreen: 이 단계의 풀이를 "한 줄"로. 장면들의 onscreen을 위에서 아래로 쌓으면 하나의 완결된 풀이 과정이 되도록, 앞 줄에 이어서 다음 줄을 적으세요(공책에 풀이를 한 줄씩 써 내려가듯). 실제 수식 줄 위주(키워드 나열 금지). LaTeX는 $로 감싸기. 예) "$x^2 - 5x + 6 = 0$" -> "$(x-2)(x-3) = 0$" -> "$x = 2,\ x = 3$". 첫 장면 onscreen은 문제 식 그대로, 마지막 장면은 정답 줄. 한 줄만, 영어 설명어 금지.
- category: 아래 목록의 값 중 하나로만.
- subtopic: 해당 category의 세부 단원.

커리큘럼:
{tax}

4~6개 장면, 전체 25초 이내(도입->풀이 단계->정답). JSON만 출력:
{"problem":"...","answer":"...","category":"...","subtopic":"...","scenes":[{"narration":"...","onscreen":"...","accentWords":["강조어"],"seconds":4}],"total_seconds":20}`

export type GenResult = {
  problem: string
  answer: string
  category: string
  subtopic: string
  scenes: Scene[]
  total_seconds: number
}

/** 문제 이미지(data URL) → 풀이·커리큘럼 분류·누적 대본 JSON. 모델 폴백 체인 사용. */
export async function generateScript(imageDataUrl: string, persona?: PersonaId): Promise<GenResult> {
  const [header, b64] = imageDataUrl.includes(",") ? imageDataUrl.split(",", 2) : ["", imageDataUrl]
  const mime = header.startsWith("data:") ? header.slice(5).split(";")[0] || "image/png" : "image/png"
  const tone = persona ? PERSONAS[persona].tone : "밝고 친근한 선생님의 말투"
  const prompt = PROMPT.replace("{tax}", taxonomyHint()).replace("{tone}", tone)
  const res = await callModels(
    (model) =>
      ai().models.generateContent({
        model,
        contents: [{ role: "user", parts: [{ text: prompt }, { inlineData: { mimeType: mime, data: b64 } }] }],
        config: { responseMimeType: "application/json", temperature: 0.4 },
      }),
    GEN_CHAIN,
  )
  const data = parseModelJson<GenResult>(res.text || "{}")
  if (!CATEGORIES.includes(data.category)) data.category = data.category || "미분류"
  return data
}

/** PCM(L16 mono) → WAV 컨테이너. (테스트를 위해 export) */
export function pcmToWav(pcm: Buffer, rate = 24000): Buffer {
  const h = Buffer.alloc(44)
  h.write("RIFF", 0); h.writeUInt32LE(36 + pcm.length, 4); h.write("WAVE", 8)
  h.write("fmt ", 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22)
  h.writeUInt32LE(rate, 24); h.writeUInt32LE(rate * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34)
  h.write("data", 36); h.writeUInt32LE(pcm.length, 40)
  return Buffer.concat([h, pcm])
}

/** 텍스트 → WAV(Buffer) 나레이션. 지정 음성·낭독 스타일로 합성. 빈 오디오 응답도 다음 모델로 폴백. */
export async function synthesize(text: string, voice = "Kore", style = "밝고 친근한 톤으로"): Promise<Buffer> {
  const b64 = await callModels(async (model) => {
    const res = await ai().models.generateContent({
      model,
      contents: `다음 문장을 ${style} 읽어줘: ${text}`,
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } },
      },
    })
    const data = res.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data
    if (!data) throw new Error("no audio in TTS response")
    return data
  }, TTS_CHAIN)
  return pcmToWav(Buffer.from(b64, "base64"))
}

const QUIZ_PROMPT = `당신은 한국 고교 수학 출제위원입니다. 다음 개념을 검증하는 5지선다 객관식 연습 문제를 1개 새로 출제하고 풀이를 쓰세요.
개념: {concept}
참고(방금 학습한 문제 — 난이도를 비슷하게): {problem}

규칙: 수식은 $로 감싼 LaTeX. explanation은 단계적이고 명쾌하게. JSON만 출력:
{"problem":"...","options":["...","...","...","...","..."],"correctIndex":0,"explanation":"..."}`

/** 개념·참고문제 → 5지선다 유사 연습 문제. 형식이 어긋나면 throw(라우트에서 목데이터 폴백). */
export async function generateQuiz(concept: string, problem?: string): Promise<Quiz> {
  const prompt = QUIZ_PROMPT.replace("{concept}", concept).replace("{problem}", (problem || "없음").slice(0, 500))
  const res = await callModels(
    (model) =>
      ai().models.generateContent({
        model,
        contents: prompt,
        config: { responseMimeType: "application/json", temperature: 0.7 },
      }),
    GEN_CHAIN,
  )
  const q = parseModelJson<Quiz>(res.text || "{}")
  const valid =
    typeof q.problem === "string" && Array.isArray(q.options) && q.options.length === 5 &&
    Number.isInteger(q.correctIndex) && q.correctIndex >= 0 && q.correctIndex <= 4 &&
    typeof q.explanation === "string"
  if (!valid) throw new Error("퀴즈 형식 오류")
  return { problem: q.problem, options: q.options.map(String), correctIndex: q.correctIndex, explanation: q.explanation }
}

/** 텍스트 임베딩(EMBED_DIM 차원) — RAG 유사도 검색용. */
export async function embed(text: string): Promise<number[]> {
  const res = await ai().models.embedContent({
    model: EMBED_MODEL,
    contents: text || " ",
    config: { outputDimensionality: EMBED_DIM },
  })
  return (res.embeddings?.[0]?.values as number[]) || []
}
