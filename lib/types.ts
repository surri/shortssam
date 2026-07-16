export type Scene = {
  narration: string
  onscreen: string
  seconds: number
  /** 자막에서 컬러 강조할 단어(caption 텍스트에 실제 등장하는 1~3개) */
  accentWords?: string[]
  /** 화면 자막(표시 전용). 수식은 $LaTeX$로 표기해 KaTeX 렌더. 없으면 narration으로 폴백 */
  caption?: string
}

export type Work = {
  id: string
  created_at: string
  problem: string
  answer: string
  category: string
  subtopic: string
  scenes: Scene[]
  total_seconds: number
  thumb: string
  similarity?: number
  /** 생성 당시 선택한 쌤 페르소나 id */
  persona?: string
  /** 생성 당시 TTS 보이스 — 라이브러리 재생을 원본 음성으로 고정(캐시 히트 보장) */
  voice?: string
  /** 데모 폴백 등 사용자에게 보여줄 안내(저장 안 됨, 응답 전용) */
  notice?: string
}

export type Quiz = {
  problem: string
  options: string[]
  correctIndex: number
  explanation: string
  notice?: string
}
