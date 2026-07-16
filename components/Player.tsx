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
 * 해설 숏츠 플레이어(누적 풀이 스타일).
 * - 상단: 스토리식 진행바(현재 스텝은 장면 길이에 맞춰 채워짐)
 * - 중앙: 원 문제 + 풀이 줄 누적, 현재 줄 강조
 * - 하단: accentWords 컬러 강조 자막
 * - 우측 레일: 쌤 아바타 · Lofi BGM 토글 · 비주얼 테마 전환
 */
export function Player({
  work, sceneIdx, theme, personaEmoji, onTheme, onReplay, onQuiz, onNew,
}: {
  work: Work
  sceneIdx: number
  theme: ThemeId
  personaEmoji: string
  onTheme: (t: ThemeId) => void
  onReplay: () => void
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
  const visible = Math.min(sceneIdx + 1, n)
  const scene = work.scenes[cur]
  const caption = splitByAccents((scene?.narration || "").replace(/\$/g, ""), scene?.accentWords)

  return (
    <div className="player" data-theme={theme}>
      <div className="progress">
        {work.scenes.map((s, j) => (
          <div key={j} className={"seg" + (j < sceneIdx ? " done" : "")}>
            {j === sceneIdx && (
              <div className="fill" style={{ animationDuration: Math.max(2, s.seconds || 4) + "s" }} />
            )}
          </div>
        ))}
      </div>
      <div className="cat-tag">{work.category}{work.subtopic ? " · " + work.subtopic : ""}</div>
      <div className="answer-tag" dangerouslySetInnerHTML={{ __html: renderMathHtml("정답 " + (work.answer || "")) }} />

      <div className="stage">
        {work.thumb && (
          <div className="prob-wrap">
            <span className="prob-label">문제</span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="prob-img" src={work.thumb} alt="원래 문제" />
          </div>
        )}
        <div className="badge">STEP {cur + 1} / {n}</div>
        <div className="worksheet">
          {work.scenes.slice(0, visible).map((s, i) => (
            <div
              key={i}
              className={"line" + (i === cur ? " current" : "")}
              dangerouslySetInnerHTML={{ __html: renderMathHtml(s.onscreen || "") }}
            />
          ))}
        </div>
      </div>

      <div className="rail">
        <div className="avatar" title="숏쌤">{personaEmoji}</div>
        <button
          type="button"
          className={"icon" + (bgm ? " on" : "")}
          onClick={() => setBgm((v) => !v)}
          title={bgm ? "Lofi BGM 끄기" : "Lofi BGM 켜기"}
        >
          🎵
        </button>
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

      <div className="caption">
        {caption.map((p, i) =>
          p.accent ? <span key={i} className="accent">{p.text}</span> : <span key={i}>{p.text}</span>,
        )}
      </div>
      <div className="controls">
        <button type="button" onClick={onReplay}>↻ 다시</button>
        <button type="button" onClick={onQuiz}>✏️ 유사문제</button>
        <button type="button" onClick={onNew}>＋ 새 문제</button>
      </div>
    </div>
  )
}
