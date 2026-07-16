import { describe, it, expect } from "vitest"
import { CATEGORIES, CURRICULUM, taxonomyHint } from "@/lib/curriculum"

describe("curriculum", () => {
  it("주요 과목을 포함한다", () => {
    expect(CATEGORIES).toContain("기하")
    expect(CATEGORIES).toContain("확률과 통계")
    expect(CATEGORIES.length).toBeGreaterThanOrEqual(7)
  })

  it("기하는 벡터 세부단원을 가진다", () => {
    expect(CURRICULUM["기하"]).toContain("벡터")
  })

  it("taxonomyHint는 카테고리마다 한 줄", () => {
    const h = taxonomyHint()
    expect(h).toContain("- 기하:")
    expect(h.split("\n").length).toBe(CATEGORIES.length)
  })
})
