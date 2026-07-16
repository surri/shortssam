// 한국 고교 수학 커리큘럼(2022 개정) 분류 taxonomy
export const CURRICULUM: Record<string, string[]> = {
  공통수학1: ["다항식", "방정식과 부등식", "경우의 수", "행렬"],
  공통수학2: ["도형의 방정식", "집합과 명제", "함수와 그래프"],
  대수: ["지수와 로그", "삼각함수", "수열"],
  "미적분Ⅰ": ["함수의 극한과 연속", "미분", "적분"],
  "미적분Ⅱ": ["수열의 극한", "미분법", "적분법"],
  "확률과 통계": ["경우의 수", "확률", "통계"],
  기하: ["이차곡선", "공간도형과 공간좌표", "벡터"],
}

export const CATEGORIES = Object.keys(CURRICULUM)

export const taxonomyHint = () =>
  Object.entries(CURRICULUM)
    .map(([c, subs]) => `- ${c}: ${subs.join(", ")}`)
    .join("\n")
