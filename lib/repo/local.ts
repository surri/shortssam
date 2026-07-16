import fs from "node:fs"
import path from "node:path"
import type { Work } from "../types"

type Stored = Work & { embedding: number[] }

const FILE = process.env.DB_PATH || path.join(process.cwd(), "data", "works.json")

function load(): Stored[] {
  try {
    return JSON.parse(fs.readFileSync(FILE, "utf8"))
  } catch {
    return []
  }
}

function persist(all: Stored[]) {
  fs.mkdirSync(path.dirname(FILE), { recursive: true })
  fs.writeFileSync(FILE, JSON.stringify(all))
}

function cosine(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    na += a[i] * a[i]
    nb += b[i] * b[i]
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-9)
}

/** 저장용 레코드에서 embedding(및 선택적으로 scenes) 제거한 공개용 Work 반환(불변). */
function strip(w: Stored, keepScenes = true): Work {
  const { embedding, scenes, ...rest } = w
  void embedding
  return keepScenes ? { ...rest, scenes } : { ...rest, scenes: [] }
}

/** 로컬 저장소 — JSON 파일 + numpy 없이 JS 코사인(해커톤 규모에 충분). 모든 연산 불변. */
export const localRepo = {
  /** work + 임베딩 저장(같은 id면 교체, 아니면 앞에 추가). */
  async saveWork(work: Work, embedding: number[]) {
    const all = load()
    const rec: Stored = { ...work, embedding }
    const next = all.some((w) => w.id === work.id)
      ? all.map((w) => (w.id === work.id ? rec : w))
      : [rec, ...all]
    persist(next)
  },

  /** 단건(scenes 포함) 조회. */
  async getWork(id: string): Promise<Work | null> {
    const w = load().find((w) => w.id === id)
    return w ? strip(w) : null
  },

  /** 최신순 목록(scenes 제외 — 갤러리용). */
  async listWorks(limit = 50, category?: string): Promise<Work[]> {
    return load()
      .filter((w) => !category || w.category === category)
      .toSorted((a, b) => (a.created_at < b.created_at ? 1 : -1))
      .slice(0, limit)
      .map((w) => strip(w, false))
  },

  /** 임베딩 코사인 유사도 상위 k개(자기 자신 제외). */
  async findSimilar(embedding: number[], k = 5, excludeId?: string): Promise<Work[]> {
    return load()
      .filter((w) => w.id !== excludeId)
      .map((w) => ({ w, s: cosine(embedding, w.embedding) }))
      .toSorted((a, b) => b.s - a.s)
      .slice(0, k)
      .map(({ w, s }) => ({ ...strip(w, false), similarity: Math.round(s * 1000) / 1000 }))
  },
}
