import type { GenResult } from "./genai"
import type { Quiz } from "./types"

/** 데모 프리셋 목록(업로드 패널 버튼용) */
export const PRESETS: { key: string; label: string; hint: string }[] = [
  { key: "quad", label: "⚡ 데모 · 이차방정식", hint: "인수분해 한 방 풀이" },
  { key: "seq", label: "⚡ 데모 · 등차수열", hint: "일반항 공식 3초 컷" },
]

/**
 * 고품질 목데이터 — API 키 문제/호출 실패 시에도 데모가 끊기지 않도록 하는 폴백.
 * 스키마는 실제 생성 결과(GenResult)와 동일.
 */
export const MOCK_WORKS: Record<string, GenResult> = {
  quad: {
    problem: "이차방정식 $x^2-5x+6=0$ 을 풀어라.",
    answer: "$x=2,\\ x=3$",
    category: "공통수학1",
    subtopic: "방정식과 부등식",
    total_seconds: 19,
    scenes: [
      {
        narration: "오늘은 이차방정식 한 방에 부수는 법! 엑스 제곱 마이너스 오 엑스 플러스 육이 영이래. 인수분해 각이지?",
        onscreen: "$x^2-5x+6=0$",
        accentWords: ["한 방에", "인수분해"],
        seconds: 5,
      },
      {
        narration: "곱해서 육, 더해서 오가 되는 두 수? 바로 이와 삼이지. 괄호로 쪼개자!",
        onscreen: "$(x-2)(x-3)=0$",
        accentWords: ["이와 삼", "쪼개자"],
        seconds: 5,
      },
      {
        narration: "곱이 영이면 둘 중 하나는 무조건 영! 그래서 엑스는 이 또는 삼.",
        onscreen: "$x=2,\\ x=3$",
        accentWords: ["무조건 영"],
        seconds: 5,
      },
      {
        narration: "정답은 이와 삼! 곱해서 상수항, 더해서 일차항 계수. 이것만 기억해!",
        onscreen: "$\\therefore\\ x=2,\\ 3$",
        accentWords: ["정답", "기억해"],
        seconds: 4,
      },
    ],
  },
  seq: {
    problem: "첫째항이 2, 공차가 3인 등차수열의 제10항을 구하시오.",
    answer: "$29$",
    category: "대수",
    subtopic: "수열",
    total_seconds: 17,
    scenes: [
      {
        narration: "등차수열 십 항, 삼 초 컷 간다! 첫째항은 이, 공차는 삼.",
        onscreen: "$a_1=2,\\ d=3$",
        accentWords: ["삼 초 컷"],
        seconds: 4,
      },
      {
        narration: "일반항 공식 소환! 에이 엔은 첫째항 더하기, 엔 마이너스 일 곱하기 공차.",
        onscreen: "$a_n=a_1+(n-1)d$",
        accentWords: ["공식 소환"],
        seconds: 5,
      },
      {
        narration: "그대로 대입하면 이 더하기 구 곱하기 삼.",
        onscreen: "$a_{10}=2+9\\times 3$",
        accentWords: ["대입"],
        seconds: 4,
      },
      {
        narration: "이십칠 더하기 이는 이십구! 정답 이십구. 공식 하나면 끝!",
        onscreen: "$a_{10}=29$",
        accentWords: ["이십구", "끝"],
        seconds: 4,
      },
    ],
  },
}

/** 퀴즈 생성 실패 시 폴백 문제 */
export const MOCK_QUIZ: Quiz = {
  problem: "이차방정식 $x^2-7x+12=0$ 의 두 근의 합은?",
  options: ["$5$", "$6$", "$7$", "$12$", "$-7$"],
  correctIndex: 2,
  explanation:
    "근과 계수의 관계에서 두 근의 합은 $-\\frac{b}{a}=7$ 입니다. 실제로 인수분해하면 $(x-3)(x-4)=0$ 이므로 두 근은 3, 4이고 합은 7입니다.",
}
