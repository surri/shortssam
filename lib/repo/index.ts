import type { Work } from "../types"
import { localRepo } from "./local"

export type Repository = {
  saveWork(work: Work, embedding: number[]): Promise<void>
  getWork(id: string): Promise<Work | null>
  listWorks(limit?: number, category?: string): Promise<Work[]>
  findSimilar(embedding: number[], k?: number, excludeId?: string): Promise<Work[]>
}

// STORAGE=firestore → GCP, 그 외 로컬(JSON). firestore는 지연 로드(로컬에 미설치여도 OK).
export async function getRepo(): Promise<Repository> {
  if (process.env.STORAGE === "firestore") {
    const mod = await import("./firestore")
    return mod.firestoreRepo
  }
  return localRepo
}
