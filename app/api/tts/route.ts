import { NextResponse } from "next/server"
import { getOrSynthesize } from "@/lib/audio"
import { TTSBody } from "@/lib/validation"
import { clientIp, rateLimit } from "@/lib/ratelimit"

export const runtime = "nodejs"
export const maxDuration = 120

export async function POST(req: Request) {
  if (!rateLimit(clientIp(req), 40)) {
    return NextResponse.json({ error: "요청이 너무 많아요. 잠시 후 다시 시도하세요." }, { status: 429 })
  }
  const parsed = TTSBody.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) {
    return NextResponse.json({ error: "잘못된 요청: " + parsed.error.issues[0].message }, { status: 400 })
  }
  try {
    // 캐시 히트면 즉시, 미스면 합성 후 저장 — 기본값 정규화는 lib/audio 한 곳에서만
    const wav = await getOrSynthesize(parsed.data.text, parsed.data.voice, parsed.data.style)
    return NextResponse.json({ audio: wav.toString("base64") })
  } catch (e) {
    return NextResponse.json({ error: String((e as Error).message ?? e) }, { status: 500 })
  }
}
