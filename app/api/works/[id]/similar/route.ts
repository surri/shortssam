import { NextResponse } from "next/server"
import { embed } from "@/lib/genai"
import { getRepo } from "@/lib/repo"
import { SimilarQuery } from "@/lib/validation"
import { clientIp, rateLimit } from "@/lib/ratelimit"

export const runtime = "nodejs"
export const maxDuration = 60

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!rateLimit(clientIp(req), 40)) {
    return NextResponse.json({ error: "요청이 너무 많아요." }, { status: 429 })
  }
  const q = SimilarQuery.safeParse(Object.fromEntries(new URL(req.url).searchParams))
  if (!q.success) {
    return NextResponse.json({ error: "잘못된 쿼리: " + q.error.issues[0].message }, { status: 400 })
  }
  try {
    const { id } = await params
    const repo = await getRepo()
    const work = await repo.getWork(id)
    if (!work) return NextResponse.json({ error: "not found" }, { status: 404 })
    const vec = await embed(`${work.problem} ${work.category} ${work.subtopic}`)
    return NextResponse.json(await repo.findSimilar(vec, q.data.k, id))
  } catch (e) {
    return NextResponse.json({ error: String((e as Error).message ?? e) }, { status: 500 })
  }
}
