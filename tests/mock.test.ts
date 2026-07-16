import { describe, it, expect } from "vitest"
import { CATEGORIES, CURRICULUM } from "@/lib/curriculum"
import { MOCK_QUIZ, MOCK_WORKS, PRESETS } from "@/lib/mock"

describe("데모 목데이터", () => {
  it("프리셋 버튼은 모두 실제 목데이터를 가리킨다", () => {
    PRESETS.forEach((p) => expect(MOCK_WORKS[p.key]).toBeDefined())
  })

  it("목데이터는 유효한 커리큘럼 분류를 쓴다", () => {
    Object.values(MOCK_WORKS).forEach((w) => {
      expect(CATEGORIES).toContain(w.category)
      expect(CURRICULUM[w.category]).toContain(w.subtopic)
    })
  })

  it("장면 스키마가 완전하다(나레이션·onscreen·초·강조어)", () => {
    Object.values(MOCK_WORKS).forEach((w) => {
      expect(w.scenes.length).toBeGreaterThanOrEqual(3)
      w.scenes.forEach((s) => {
        expect(s.narration.length).toBeGreaterThan(0)
        expect(s.onscreen).toMatch(/\$.+\$/)
        expect(s.seconds).toBeGreaterThanOrEqual(2)
        s.accentWords?.forEach((a) => expect(s.narration).toContain(a))
      })
    })
  })

  it("폴백 퀴즈는 5지선다 + 유효한 정답 인덱스", () => {
    expect(MOCK_QUIZ.options).toHaveLength(5)
    expect(MOCK_QUIZ.correctIndex).toBeGreaterThanOrEqual(0)
    expect(MOCK_QUIZ.correctIndex).toBeLessThanOrEqual(4)
  })
})
