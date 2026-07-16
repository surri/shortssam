import katex from "katex"
import DOMPurify from "isomorphic-dompurify"

const esc = (t: string) =>
  t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")

/**
 * onscreen 텍스트를 안전한 HTML로 렌더한다.
 * - `$...$` 구간만 KaTeX(displayMode, throwOnError:false, 기본 trust:false)로 렌더
 * - 그 외 텍스트는 HTML 이스케이프, 줄바꿈은 <div>
 * - 최종 결과를 DOMPurify로 살균(스크립트/이벤트 핸들러 제거)해 XSS 방지
 */
export function renderMathHtml(s: string): string {
  const html = (s || "")
    .split("\n")
    .map((line) => {
      let out = ""
      let last = 0
      const re = /\$([^$]+)\$/g
      let m: RegExpExecArray | null
      while ((m = re.exec(line))) {
        out += esc(line.slice(last, m.index))
        try {
          out += katex.renderToString(m[1], { displayMode: true, throwOnError: false })
        } catch {
          out += esc(m[0])
        }
        last = re.lastIndex
      }
      out += esc(line.slice(last))
      return `<div>${out}</div>`
    })
    .join("")
  return DOMPurify.sanitize(html)
}
