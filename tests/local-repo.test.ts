import { describe, it, expect, beforeAll } from "vitest"
import os from "node:os"
import path from "node:path"
import type { Work } from "@/lib/types"

const mkWork = (id: string, created: string): Work => ({
  id, created_at: created, problem: id, answer: "", category: "대수", subtopic: "",
  scenes: [{ narration: "n", onscreen: "o", seconds: 4 }], total_seconds: 4, thumb: "",
})

describe("localRepo (JSON + 코사인)", () => {
  let repo: typeof import("@/lib/repo/local").localRepo

  beforeAll(async () => {
    process.env.DB_PATH = path.join(os.tmpdir(), `works-test-${process.pid}-${Math.floor(performance.now())}.json`)
    repo = (await import("@/lib/repo/local")).localRepo
  })

  it("저장 후 단건 조회(scenes 포함)", async () => {
    await repo.saveWork(mkWork("a", "2026-01-01T00:00:00Z"), [1, 0, 0])
    const w = await repo.getWork("a")
    expect(w?.problem).toBe("a")
    expect(w?.scenes.length).toBe(1)
  })

  it("목록은 최신순, scenes 제외", async () => {
    await repo.saveWork(mkWork("b", "2026-02-01T00:00:00Z"), [0, 1, 0])
    const list = await repo.listWorks()
    expect(list[0].id).toBe("b")
    expect(list[0].scenes.length).toBe(0)
  })

  it("같은 id 저장은 교체(중복 아님)", async () => {
    await repo.saveWork(mkWork("a", "2026-03-01T00:00:00Z"), [1, 0, 0])
    const list = await repo.listWorks()
    expect(list.filter((w) => w.id === "a").length).toBe(1)
  })

  it("findSimilar: 자기 제외 + 유사도 숫자", async () => {
    const sim = await repo.findSimilar([1, 0, 0], 5, "a")
    expect(sim.find((s) => s.id === "a")).toBeUndefined()
    expect(sim[0].id).toBe("b")
    expect(typeof sim[0].similarity).toBe("number")
  })
})
