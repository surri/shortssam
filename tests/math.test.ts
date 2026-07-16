import { describe, it, expect } from "vitest"
import { renderMathHtml, renderMathInline } from "@/lib/math"

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

  it("$ 없는 raw LaTeX(\\frac 등)도 감싸서 렌더한다", () => {
    expect(renderMathHtml("\\frac{15}{2}")).toContain("katex")
  })
})

describe("renderMathInline", () => {
  it("$...$ 수식을 인라인 KaTeX로 렌더한다", () => {
    expect(renderMathInline("$x=2$")).toContain("katex")
  })

  it("$ 없이 온 raw LaTeX(\\frac{15}{2})도 자동으로 렌더한다", () => {
    const html = renderMathInline("\\frac{15}{2}")
    expect(html).toContain("katex")
    // 실제 분수 마크업(mfrac)이 생겼는지 = 텍스트가 아니라 수식으로 렌더됨
    expect(html).toContain("mfrac")
  })

  it("명령이 없는 값(객관식 보기·정수)은 텍스트로 둔다", () => {
    expect(renderMathInline("③ -a-b")).not.toContain("katex")
    expect(renderMathInline("③ -a-b")).toContain("-a-b")
    expect(renderMathInline("29")).not.toContain("katex")
  })

  it("빈 값은 빈 문자열", () => {
    expect(renderMathInline("")).toBe("")
  })
})
