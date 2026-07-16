// Web Audio 신스 — 외부 파일 없이 차임 효과음과 Lofi BGM을 합성 (클라이언트 전용)
let ctx: AudioContext | null = null
let bgmTimer: ReturnType<typeof setInterval> | null = null
let active: OscillatorNode[] = []

function ensureCtx(): AudioContext | null {
  if (typeof window === "undefined") return null
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AC) return null
    ctx = new AC()
  }
  return ctx
}

/** 짧은 사인파 차임(장면 전환·정답 효과음). 실패해도 조용히 무시. */
export function playChime(freq = 587.33, duration = 0.2) {
  try {
    const c = ensureCtx()
    if (!c) return
    const osc = c.createOscillator()
    const gain = c.createGain()
    osc.type = "sine"
    osc.frequency.setValueAtTime(freq, c.currentTime)
    gain.gain.setValueAtTime(0.08, c.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration)
    osc.connect(gain)
    gain.connect(c.destination)
    osc.start()
    osc.stop(c.currentTime + duration)
  } catch {}
}

// Lofi 코드 진행 (Gmaj7 → Am7 → Fmaj7 → Gm7)
const CHORDS = [
  [196.0, 246.94, 293.66, 392.0],
  [220.0, 261.63, 329.63, 440.0],
  [174.61, 220.0, 261.63, 349.23],
  [196.0, 233.08, 291.66, 392.0],
]

/** 나레이션을 방해하지 않는 낮은 볼륨의 Lofi 배경음 시작. */
export function startBgm() {
  try {
    const c = ensureCtx()
    if (!c) return
    stopBgm()
    let step = 0
    bgmTimer = setInterval(() => {
      if (!ctx) return
      const chord = CHORDS[step % CHORDS.length]
      step += 1
      chord.forEach((freq, idx) => {
        if (!ctx) return
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = "triangle"
        osc.frequency.setValueAtTime(freq, ctx.currentTime)
        gain.gain.setValueAtTime(0, ctx.currentTime)
        gain.gain.linearRampToValueAtTime(0.02 + idx * 0.004, ctx.currentTime + 0.8)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 3.8)
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start()
        osc.stop(ctx.currentTime + 3.8)
        active = [...active, osc]
        setTimeout(() => {
          active = active.filter((o) => o !== osc)
        }, 4000)
      })
    }, 4000)
  } catch {}
}

export function stopBgm() {
  if (bgmTimer) {
    clearInterval(bgmTimer)
    bgmTimer = null
  }
  active.forEach((osc) => {
    try {
      osc.stop()
    } catch {}
  })
  active = []
}
