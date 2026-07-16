"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Gallery, type Filter } from "@/components/Gallery"
import { Player, type ThemeId } from "@/components/Player"
import { QuizPanel } from "@/components/Quiz"
import { UploadPanel } from "@/components/UploadPanel"
import { blobToDataUrl, readFile, resizeImage } from "@/lib/image"
import { DEFAULT_PERSONA, PERSONAS, type PersonaId } from "@/lib/persona"
import { playChime } from "@/lib/sound"
import type { Quiz, Work } from "@/lib/types"

type Phase = "upload" | "loading" | "player"

/** STEP 보드에 표시할 페르소나별 태그라인 */
const PERSONA_TAGS: Record<PersonaId, string> = {
  star_teacher: "대치동 1등급 비법",
  snu_mentor: "서울대 시험 해킹",
  math_savior: "수학 구원 전략",
}

export default function ShortSsam() {
  const [phase, setPhase] = useState<Phase>("upload")
  const [image, setImage] = useState<string | null>(null)
  const [thumb, setThumb] = useState("")
  const [work, setWork] = useState<Work | null>(null)
  const [sceneIdx, setSceneIdx] = useState(0)
  const [loadingMsg, setLoadingMsg] = useState("")
  const [err, setErr] = useState("")
  const [persona, setPersona] = useState<PersonaId>(DEFAULT_PERSONA)
  const [voice, setVoice] = useState(PERSONAS[DEFAULT_PERSONA].voice)
  const [theme, setTheme] = useState<ThemeId>("blackboard")
  const [speed, setSpeed] = useState(1)
  const [speaking, setSpeaking] = useState(false)
  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [quizOpen, setQuizOpen] = useState(false)
  const [quizLoading, setQuizLoading] = useState(false)
  const [score, setScore] = useState(0)
  const [works, setWorks] = useState<Work[]>([])
  const [filter, setFilter] = useState<Filter>({ cat: null, sub: null })
  const [over, setOver] = useState(false)
  const [pasteKey, setPasteKey] = useState("Ctrl+V")

  const playbackRef = useRef<{ work: Work | null; audios: (string | null)[] }>({ work: null, audios: [] })
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const koVoice = useRef<SpeechSynthesisVoice | null>(null)
  const speedRef = useRef(1)

  const loadGallery = useCallback(async () => {
    try {
      setWorks(await (await fetch("/api/works?limit=60")).json())
    } catch {}
  }, [])

  useEffect(() => {
    loadGallery()
    if (/Mac|iPhone|iPad/i.test(navigator.platform + " " + navigator.userAgent)) setPasteKey("⌘V")
  }, [loadGallery])

  const choosePersona = (id: PersonaId) => {
    setPersona(id)
    setVoice(PERSONAS[id].voice)
  }

  const handleImage = useCallback(async (dataUrl: string) => {
    setErr("")
    const [full, small] = await Promise.all([resizeImage(dataUrl, 1600, 0.85), resizeImage(dataUrl, 240, 0.7)])
    setImage(full)
    setThumb(small)
  }, [])

  const onImageFile = useCallback((f: File) => { readFile(f).then(handleImage) }, [handleImage])

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const cd = e.clipboardData
      if (!cd) return
      for (const f of Array.from(cd.files || [])) {
        if (f.type.startsWith("image/")) { onImageFile(f); e.preventDefault(); return }
      }
      for (const it of Array.from(cd.items || [])) {
        if (it.kind === "file" && it.type.startsWith("image/")) {
          const f = it.getAsFile()
          if (f) { onImageFile(f); e.preventDefault(); return }
        }
      }
    }
    window.addEventListener("paste", onPaste)
    return () => window.removeEventListener("paste", onPaste)
  }, [onImageFile])

  const pasteFromClipboard = async () => {
    setErr("")
    try {
      if (!navigator.clipboard?.read) { setErr(`이 브라우저는 버튼 붙여넣기를 지원 안 해요. ${pasteKey} 를 눌러보세요.`); return }
      for (const item of await navigator.clipboard.read()) {
        const type = item.types.find((t) => t.startsWith("image/"))
        if (type) { handleImage(await blobToDataUrl(await item.getType(type))); return }
      }
      setErr("클립보드에 이미지가 없어요. (이미지를 먼저 복사하세요)")
    } catch (e) {
      setErr(`붙여넣기 실패: ${(e as Error).message} — ${pasteKey} 로도 시도해보세요`)
    }
  }

  const stopPlayback = () => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null }
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null }
    setSpeaking(false)
  }

  const changeSpeed = () => {
    const arr = [1, 1.25, 1.5, 0.75]
    const nx = arr[(arr.indexOf(speed) + 1) % arr.length]
    setSpeed(nx)
    speedRef.current = nx
    if (audioRef.current) audioRef.current.playbackRate = nx
    playChime(440, 0.08)
  }

  const speak = (text: string) => {
    try {
      if (!koVoice.current) koVoice.current = speechSynthesis.getVoices().find((v) => v.lang?.startsWith("ko")) || null
      const u = new SpeechSynthesisUtterance((text || "").replace(/\$/g, ""))
      u.lang = "ko-KR"
      u.rate = Math.min(2, 1.05 * speedRef.current)
      if (koVoice.current) u.voice = koVoice.current
      u.onstart = () => setSpeaking(true)
      u.onend = () => setSpeaking(false)
      speechSynthesis.cancel()
      speechSynthesis.speak(u)
    } catch {}
  }

  const playScene = useCallback((i: number) => {
    const { work: w, audios } = playbackRef.current
    if (!w) return
    if (i >= w.scenes.length) { setSceneIdx(w.scenes.length); setSpeaking(false); return }
    setSceneIdx(i)
    stopPlayback()
    playChime(329.63 + i * 40, 0.08)
    const sc = w.scenes[i]
    const next = () => playScene(i + 1)
    const dur = Math.max(2, sc.seconds || 4) * 1000 / speedRef.current
    const src = audios[i]
    if (src) {
      const a = new Audio(src)
      a.playbackRate = speedRef.current
      audioRef.current = a
      a.onplay = () => setSpeaking(true)
      a.onended = () => { setSpeaking(false); next() }
      a.play().catch(() => { timerRef.current = setTimeout(next, dur) })
    } else {
      speak(sc.narration)
      timerRef.current = setTimeout(next, dur)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchTTS = async (text: string, v: string): Promise<string | null> => {
    try {
      const res = await fetch("/api/tts", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, voice: v, style: PERSONAS[persona].ttsStyle }),
      })
      const data = await res.json()
      return data.error || !data.audio ? null : "data:audio/wav;base64," + data.audio
    } catch { return null }
  }

  const prepareAndPlay = async (w: Work) => {
    setPhase("loading")
    const audios: (string | null)[] = []
    for (let i = 0; i < w.scenes.length; i++) {
      setLoadingMsg(`숏쌤 나레이션 녹음 중… (${i + 1}/${w.scenes.length})`)
      audios.push(await fetchTTS(w.scenes[i].narration, voice))
    }
    playbackRef.current = { work: w, audios }
    setWork(w)
    setSceneIdx(0)
    setPhase("player")
    playChime(659.25, 0.3)
    setTimeout(() => playScene(0), 0)
  }

  const generate = async () => {
    if (!image) return
    setPhase("loading")
    setLoadingMsg("숏쌤이 문제를 읽고 푸는 중…")
    try {
      const res = await fetch("/api/generate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image, thumb, persona }),
      })
      const w = await res.json()
      if (w.error) throw new Error(w.error)
      if (!w.scenes?.length) throw new Error("대본을 만들지 못했어요")
      if (w.notice) setErr("ℹ️ " + w.notice)
      await prepareAndPlay(w)
      loadGallery()
    } catch (e) {
      setPhase("upload")
      setErr("오류: " + (e as Error).message)
    }
  }

  const runPreset = async (key: string) => {
    setErr("")
    setPhase("loading")
    setLoadingMsg("데모 문제 준비 중…")
    try {
      const res = await fetch("/api/generate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ presetKey: key, persona }),
      })
      const w = await res.json()
      if (w.error) throw new Error(w.error)
      await prepareAndPlay(w)
    } catch (e) {
      setPhase("upload")
      setErr("오류: " + (e as Error).message)
    }
  }

  const openWork = async (id: string) => {
    setPhase("loading")
    setLoadingMsg("불러오는 중…")
    try {
      const w = await (await fetch("/api/works/" + id)).json()
      if (w.error) throw new Error(w.error)
      await prepareAndPlay(w)
    } catch (e) {
      setPhase("upload")
      setErr("오류: " + (e as Error).message)
    }
  }

  const openQuiz = async () => {
    if (!work) return
    stopPlayback()
    speechSynthesis?.cancel?.()
    setQuizOpen(true)
    setQuizLoading(true)
    setQuiz(null)
    try {
      const res = await fetch("/api/quiz", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: work.category || "고교 수학",
          subtopic: work.subtopic || undefined,
          problem: work.problem || undefined,
        }),
      })
      const q = await res.json()
      if (q.error) throw new Error(q.error)
      setQuiz(q)
    } catch (e) {
      setQuizOpen(false)
      setErr("퀴즈 오류: " + (e as Error).message)
    } finally {
      setQuizLoading(false)
    }
  }

  const closeQuiz = () => { setQuizOpen(false); setQuiz(null) }

  const reset = () => {
    stopPlayback()
    speechSynthesis?.cancel?.()
    closeQuiz()
    setImage(null); setThumb(""); setWork(null); setErr(""); setPhase("upload")
  }

  useEffect(() => () => stopPlayback(), [])

  return (
    <>
      <header className="appheader">
        <h1>📸 숏쌤</h1>
        <p>
          문제를 찍으면 → 숏쌤이 1분 쇼츠로 풀어줘요 · <b>{pasteKey}</b>로 붙여넣기도 돼요
          {score > 0 && <> · <span className="score-chip">⭐ {score}점</span></>}
        </p>
      </header>

      <div className="wrap">
        <div>
          <div className="phone">
            {phase === "upload" && (
              <UploadPanel
                image={image} over={over} setOver={setOver}
                onImageFile={onImageFile} onPasteButton={pasteFromClipboard}
                voice={voice} setVoice={setVoice}
                persona={persona} onPersona={choosePersona} onPreset={runPreset}
                onGenerate={generate} pasteKey={pasteKey}
              />
            )}
            {phase === "loading" && (
              <div className="loading"><div className="spinner" /><div className="msg">{loadingMsg}</div></div>
            )}
            {phase === "player" && work && (
              <Player
                work={work} sceneIdx={sceneIdx}
                theme={theme} onTheme={setTheme}
                personaEmoji={PERSONAS[persona].emoji}
                personaTag={PERSONA_TAGS[persona]}
                speed={speed} speaking={speaking} onSpeed={changeSpeed}
                onReplay={() => playScene(0)}
                onPrev={() => playScene(Math.max(0, Math.min(sceneIdx, work.scenes.length - 1) - 1))}
                onNext={() => playScene(Math.min(work.scenes.length - 1, Math.min(sceneIdx, work.scenes.length - 1) + 1))}
                onQuiz={openQuiz} onNew={reset}
              />
            )}
            {quizOpen && (
              <QuizPanel
                key={quiz ? quiz.problem : "loading"}
                quiz={quiz} loading={quizLoading} score={score}
                onRetry={openQuiz} onClose={closeQuiz}
                onResult={(correct) => { if (correct) setScore((s) => s + 10) }}
              />
            )}
          </div>
          <div className="err">{err}</div>
        </div>

        <Gallery works={works} filter={filter} onFilter={setFilter} onOpen={openWork} />
      </div>
    </>
  )
}
