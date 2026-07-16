import { useEffect, useRef, useState } from "react"
import { splitByAccents } from "@/lib/accent"
import { renderMathHtml, renderMathInline } from "@/lib/math"
import { startBgm, stopBgm } from "@/lib/sound"
import type { Work } from "@/lib/types"

/**
 * 해설 숏츠 플레이어(칠판 테마 고정).
 * - 상단: 진행바 + 원본 문제 미니(클릭 시 프리뷰) + 난이도/단원 + TTS 이퀄라이저
 * - 중앙: STEP 보드 — 이전 스텝들을 함께 쌓아 흐름을 보여주고 현재 스텝을 강조
 * - 하단: accentWords 컬러 강조 자막 + 재생/이동 컨트롤
 * - 우측 레일: 쌤 아바타 · 배속 · Lofi BGM
 */
export function Player({
  work, sceneIdx, personaEmoji, personaTag, speed, speaking,
  onReplay, onPrev, onNext, onSpeed, onNew,
}: {
  work: Work
  sceneIdx: number
  personaEmoji: string
  personaTag: string
  speed: number
  speaking: boolean
  onReplay: () => void
  onPrev: () => void
  onNext: () => void
  onSpeed: () => void
  onNew: () => void
}) {
  const [bgm, setBgm] = useState(false)
  const [preview, setPreview] = useState(false)
  const nowRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (bgm) startBgm()
    else stopBgm()
    return () => stopBgm()
  }, [bgm])

  const n = work.scenes.length
  const cur = Math.min(sceneIdx, n - 1)
  const scene = work.scenes[cur]
  const isLast = cur === n - 1
  // 자막: caption(표시용, $LaTeX$ 포함) 우선, 없으면 narration으로 폴백
  const capSource = scene?.caption ?? scene?.narration ?? ""
  const hasProblem = Boolean(work.thumb || work.problem)

  // 스텝이 바뀔 때 현재 줄이 항상 보이도록 스크롤
  useEffect(() => {
    nowRef.current?.scrollIntoView({ block: "nearest" })
  }, [cur])

  return (
    <div className="player" data-theme="blackboard">
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
          {hasProblem && (
            <button type="button" className="prob-mini" onClick={() => setPreview(true)} title="원본 문제 보기">
              {work.thumb
                ? (/* eslint-disable-next-line @next/next/no-img-element */ <img src={work.thumb} alt="원본 문제" />)
                : <span className="prob-mini-ico">📄</span>}
              <span>문제</span>
            </button>
          )}
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
        <div className="step-board">
          <div className="step-label">STEP {cur + 1} OF {n}</div>
          <div className="step-stack">
            {work.scenes.slice(0, cur + 1).map((s, i) => {
              const isNow = i === cur
              return (
                <div
                  key={i}
                  ref={isNow ? nowRef : undefined}
                  className={"step-line" + (isNow ? " now" : " past")}
                  dangerouslySetInnerHTML={{ __html: renderMathHtml(s.onscreen || "") }}
                />
              )
            })}
          </div>
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
      </div>

      <div className="pl-bottom">
        <div className="caption">
          {capSource
            .split(/(\$[^$]+\$)/g)
            .filter(Boolean)
            .flatMap((part, i) =>
              /^\$[^$]+\$$/.test(part)
                ? [<span key={"m" + i} className="cap-math" dangerouslySetInnerHTML={{ __html: renderMathInline(part) }} />]
                : splitByAccents(part, scene?.accentWords).map((p, j) =>
                    p.accent
                      ? <span key={"a" + i + "-" + j} className="accent">{p.text}</span>
                      : <span key={"t" + i + "-" + j}>{p.text}</span>,
                  ),
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
          <button type="button" onClick={onNew}>＋ 새 문제</button>
        </div>
      </div>

      {preview && (
        <div className="prob-preview" onClick={() => setPreview(false)}>
          <div className="prob-preview-card" onClick={(e) => e.stopPropagation()}>
            <div className="pp-head">
              <span>원본 문제</span>
              <button type="button" onClick={() => setPreview(false)} aria-label="닫기">✕</button>
            </div>
            {work.thumb && (/* eslint-disable-next-line @next/next/no-img-element */ <img className="pp-img" src={work.thumb} alt="원본 문제" />)}
            {work.problem && (
              <div className="pp-text" dangerouslySetInnerHTML={{ __html: renderMathHtml(work.problem) }} />
            )}
          </div>
        </div>
      )}
    </div>
  )
}
