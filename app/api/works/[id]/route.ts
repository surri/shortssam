import { NextResponse } from "next/server"
import { getRepo } from "@/lib/repo"

export const runtime = "nodejs"

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const repo = await getRepo()
  const work = await repo.getWork(id)
  if (!work) return NextResponse.json({ error: "not found" }, { status: 404 })
  return NextResponse.json(work)
}
