import type { Metadata } from "next"
import "./globals.css"
// KaTeX CSS는 public/ 로 벤더링(katex 0.17의 exports가 dist CSS 서브패스를 막음)

export const metadata: Metadata = {
  title: "숏쌤 · 문제 찍으면 1분 쇼츠 과외",
  description: "문제를 찍으면 숏쌤이 1분 쇼츠로 풀어줘요",
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>
        <link rel="stylesheet" href="/katex.min.css" />
        {children}
      </body>
    </html>
  )
}
