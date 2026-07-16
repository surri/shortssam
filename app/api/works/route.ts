import { NextResponse } from "next/server"
import { getRepo } from "@/lib/repo"
import { WorksQuery } from "@/lib/validation"

export const runtime = "nodejs"

export async function GET(req: Request) {
  const q = WorksQuery.safeParse(Object.fromEntries(new URL(req.url).searchParams))
  if (!q.success) {
    return NextResponse.json({ error: "잘못된 쿼리: " + q.error.issues[0].message }, { status: 400 })
  }
  try {
    const repo = await getRepo()
    return NextResponse.json(await repo.listWorks(q.data.limit, q.data.category))
  } catch (e) {
    return NextResponse.json({ error: String((e as Error).message ?? e) }, { status: 500 })
  }
}
