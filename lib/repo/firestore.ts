// GCP 저장소 — Firestore Native + 벡터검색(findNearest). 현장(@gcplab.me)에서 활성화.
// 로컬에선 import되지 않으므로 @google-cloud/firestore 미사용이어도 무방.
// 사전준비: Firestore Native DB + embedding 필드 KNN 벡터 인덱스(차원 1536, COSINE) — docs/DEPLOY-GCP.md
import { Firestore, FieldValue } from "@google-cloud/firestore"
import type { Work } from "../types"

const db = new Firestore()
const col = db.collection("works")

function strip(d: FirebaseFirestore.DocumentData, keepScenes = true): Work {
  const { embedding, ...rest } = d
  void embedding
  if (!keepScenes) rest.scenes = []
  return rest as Work
}

export const firestoreRepo = {
  async saveWork(work: Work, embedding: number[]) {
    await col.doc(work.id).set({ ...work, embedding: FieldValue.vector(embedding) })
  },

  async getWork(id: string): Promise<Work | null> {
    const snap = await col.doc(id).get()
    return snap.exists ? strip(snap.data()!) : null
  },

  async listWorks(limit = 50, category?: string): Promise<Work[]> {
    let q: FirebaseFirestore.Query = col
    if (category) q = q.where("category", "==", category)
    q = q.orderBy("created_at", "desc").limit(limit)
    const snap = await q.get()
    return snap.docs.map((d) => strip(d.data(), false))
  },

  async findSimilar(embedding: number[], k = 5, excludeId?: string): Promise<Work[]> {
    const vq = col.findNearest({
      vectorField: "embedding",
      queryVector: FieldValue.vector(embedding),
      limit: k + 1,
      distanceMeasure: "COSINE",
    })
    const snap = await vq.get()
    return snap.docs
      .filter((d) => d.id !== excludeId)
      .slice(0, k)
      .map((d) => strip(d.data(), false))
  },
}
