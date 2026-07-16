import { useState } from "react"
import { renderMathHtml } from "@/lib/math"
import { playChime } from "@/lib/sound"
import type { Quiz } from "@/lib/types"

/**
 * 5지선다 유사문제 트레이닝 오버레이.
 * 부모에서 key={quiz.problem}로 마운트해 새 문제마다 선택 상태가 리셋되게 한다.
 */
export function QuizPanel({
  quiz, loading, score, onRetry, onClose, onResult,
}: {
  quiz: Quiz | null
  loading: boolean
  score: number
  onRetry: () => void
  onClose: () => void
  onResult: (correct: boolean) => void
}) {
  const [sel, setSel] = useState<number | null>(null)
  const [checked, setChecked] = useState(false)

  const check = () => {
    if (sel === null || !quiz) return
    setChecked(true)
    const correct = sel === quiz.correctIndex
    playChime(correct ? 880 : 220, 0.35)
    onResult(correct)
  }

  const optClass = (idx: number) => {
    if (!checked) return "q-opt" + (sel === idx ? " sel" : "")
    if (quiz && idx === quiz.correctIndex) return "q-opt correct"
    if (idx === sel) return "q-opt wrong"
    return "q-opt"
  }

  return (
    <div className="quiz">
      <div className="q-head">
        <span>✏️ 유사문제 트레이닝</span>
        <span className="score-chip">⭐ {score}점</span>
      </div>

      {loading && (
        <div className="loading" style={{ position: "static", background: "none" }}>
          <div className="spinner" /><div className="msg">숏쌤이 유사문제 출제 중…</div>
        </div>
      )}

      {!loading && quiz && (
        <>
          {quiz.notice && <div className="q-notice">ℹ️ {quiz.notice}</div>}
          <div className="q-problem" dangerouslySetInnerHTML={{ __html: renderMathHtml(quiz.problem) }} />
          {quiz.options.map((opt, idx) => (
            <button
              key={idx}
              type="button"
              className={optClass(idx)}
              disabled={checked}
              onClick={() => setSel(idx)}
            >
              <span dangerouslySetInnerHTML={{ __html: renderMathHtml(`(${idx + 1}) ${opt}`) }} />
            </button>
          ))}

          {checked && (
            <>
              <div className={"q-verdict " + (sel === quiz.correctIndex ? "ok" : "no")}>
                {sel === quiz.correctIndex ? "🎉 정답! (+10점)" : "😢 오답… 해설을 확인해보세요"}
              </div>
              <div className="q-explain" dangerouslySetInnerHTML={{ __html: renderMathHtml(quiz.explanation) }} />
            </>
          )}

          <div className="q-actions">
            {!checked
              ? <button type="button" className="primary" disabled={sel === null} onClick={check}>채점하기</button>
              : <button type="button" className="primary" onClick={onRetry}>🔄 새 유사문제</button>}
            <button type="button" onClick={onClose}>닫기</button>
          </div>
        </>
      )}
    </div>
  )
}
