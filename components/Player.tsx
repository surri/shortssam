import { useEffect, useState } from "react"
import { splitByAccents } from "@/lib/accent"
import { renderMathHtml } from "@/lib/math"
import { startBgm, stopBgm } from "@/lib/sound"
import type { Work } from "@/lib/types"

export const THEMES = [
  { id: "paper", label: "시험지", color: "#e8e6de" },
  { id: "blackboard", label: "칠판", color: "#1f5c40" },
  { id: "cyber", label: "네온", color: "#ff4fa3" },
  { id: "pastel", label: "파스텔", color: "#ffd9e8" },
] as const

export type ThemeId = (typeof THEMES)[number]["id"]

/**
 * 해설 숏츠 플레이어.
 * - 상단: 스토리식 진행바 + 난이도 뱃지 · 단원 · TTS 이퀄라이저
 * - 중앙: 점선 STEP 보드(현재 수식 + 페르소나 태그라인, 마지막 스텝엔 정답 공개)
 * - 하단: accentWords 컬러 강조 자막 + 재생/이동 컨트롤
 * - 우측 레일: 쌤 아바타 · 배속 · Lofi BGM · 비주얼 테마 전환
 */
export function Player({
  work, sceneIdx, theme, personaEmoji, personaTag, speed, speaking,
  onTheme, onReplay, onPrev, onNext, onSpeed, onQuiz, onNew,
}: {
  work: Work
  sceneIdx: number
  theme: ThemeId
  personaEmoji: string
  personaTag: string
  speed: number
  speaking: boolean
  onTheme: (t: ThemeId) => void
  onReplay: () => void
  onPrev: () => void
  onNext: () => void
  onSpeed: () => void
  onQuiz: () => void
  onNew: () => void
}) {
  const [bgm, setBgm] = useState(false)
  useEffect(() => {
    if (bgm) startBgm()
    else stopBgm()
    return () => stopBgm()
  }, [bgm])

  const n = work.scenes.length
  const cur = Math.min(sceneIdx, n - 1)
  const scene = work.scenes[cur]
  const isLast = cur === n - 1
  const caption = splitByAccents((scene?.narration || "").replace(/\$/g, ""), scene?.accentWords)

  return (
    <div className="player" data-theme={theme}>
      <div className="pl-scan" />

      <div className="pl-top">
        <div className="progress">
          {work.scenes.map((s, j) => (
            <div key={j} className={"seg" + (j < sceneIdx ? " done" : "")}>
              {j === sceneIdx && (
                <div className="fill" style={{ animationDuration: Math.max(2, s.seconds || 4) / speed + "s" }} />
              )}
            </div>
          ))}
        </div>
        <div className="pl-head">
          {work.category && <span className="pl-badge">{work.category}</span>}
          {work.subtopic && <span className="pl-sub">{work.subtopic}</span>}
          {speaking && (
            <span className="eq" title="쌤 음성 해설 중">
              <i /><i /><i /><i />
            </span>
          )}
        </div>
      </div>

      <div className="pl-stage">
        <div className="step-board" key={cur}>
          <div className="step-label">STEP {cur + 1} OF {n}</div>
          <div className="step-formula" dangerouslySetInnerHTML={{ __html: renderMathHtml(scene?.onscreen || "") }} />
          <div className="step-div" />
          <div className="step-tag">{personaTag}</div>
          {isLast && work.answer && (
            <div className="step-answer" dangerouslySetInnerHTML={{ __html: renderMathHtml("정답 " + work.answer) }} />
          )}
        </div>
      </div>

      <div className="rail">
        <div className="avatar" title="숏쌤">{personaEmoji}</div>
        <button type="button" className="rail-btn" onClick={onSpeed} title="재생 속도">{speed}x</button>
        <button
          type="button"
          className={"rail-btn" + (bgm ? " on" : "")}
          onClick={() => setBgm((v) => !v)}
          title={bgm ? "Lofi BGM 끄기" : "Lofi BGM 켜기"}
        >
          🎵
        </button>
        <div className="dots">
          {THEMES.map((t) => (
            <button
              key={t.id}
              type="button"
              className={"dot" + (theme === t.id ? " on" : "")}
              style={{ background: t.color }}
              onClick={() => onTheme(t.id)}
              title={"테마: " + t.label}
              aria-label={"테마 " + t.label}
            />
          ))}
        </div>
      </div>

      <div className="pl-bottom">
        <div className="caption">
          {caption.map((p, i) =>
            p.accent ? <span key={i} className="accent">{p.text}</span> : <span key={i}>{p.text}</span>,
          )}
        </div>
        <div className="pl-ctrls">
          <div className="ctrl-left">
            <button type="button" className="ctrl-play" onClick={onReplay} title="처음부터 재생">▶</button>
            <span className="speed-chip">x{speed.toFixed(2)}</span>
          </div>
          <div className="ctrl-nav">
            <button type="button" onClick={onPrev} disabled={cur === 0} aria-label="이전 스텝">‹</button>
            <button type="button" onClick={onNext} disabled={cur === n - 1} aria-label="다음 스텝">›</button>
            <button type="button" onClick={onReplay} aria-label="처음부터">↻</button>
          </div>
        </div>
        <div className="controls">
          <button type="button" onClick={onQuiz}>✏️ 유사문제</button>
          <button type="button" onClick={onNew}>＋ 새 문제</button>
        </div>
      </div>
    </div>
  )
}
