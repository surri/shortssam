import { describe, it, expect } from "vitest"
import { renderMathHtml } from "@/lib/math"

describe("renderMathHtml", () => {
  it("$...$ 를 KaTeX로 렌더한다", () => {
    expect(renderMathHtml("$x^2$")).toContain("katex")
  })

  it("비수식 텍스트는 이스케이프한다", () => {
    const html = renderMathHtml("a < b & c")
    expect(html).toContain("&lt;")
    expect(html).toContain("&amp;")
  })

  it("HTML 태그를 활성화하지 않는다 (XSS 방지)", () => {
    const html = renderMathHtml("<img src=x onerror=alert(1)> <script>bad()</script>")
    expect(html).not.toContain("<img")
    expect(html.toLowerCase()).not.toContain("<script")
    expect(html).toContain("&lt;img")
  })

  it("여러 줄은 각각 <div>", () => {
    const html = renderMathHtml("line1\nline2")
    expect((html.match(/<div>/g) || []).length).toBeGreaterThanOrEqual(2)
  })
})
