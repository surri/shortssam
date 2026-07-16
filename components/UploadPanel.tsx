import { readFile } from "@/lib/image"
import { PRESETS } from "@/lib/mock"
import { PERSONAS, type PersonaId } from "@/lib/persona"

const VOICES: [string, string][] = [
  ["Kore", "여·밝음"], ["Leda", "여"], ["Aoede", "여"],
  ["Charon", "남·차분"], ["Puck", "남·경쾌"], ["Fenrir", "남"],
]

/** 업로드/드래그/붙여넣기 + 쌤 페르소나 + 음성 선택 + 생성/데모 버튼 패널. */
export function UploadPanel({
  image, over, setOver, onImageFile, onPasteButton, voice, setVoice,
  persona, onPersona, onPreset, onGenerate, pasteKey,
}: {
  image: string | null
  over: boolean
  setOver: (v: boolean) => void
  onImageFile: (f: File) => void
  onPasteButton: () => void
  voice: string
  setVoice: (v: string) => void
  persona: PersonaId
  onPersona: (id: PersonaId) => void
  onPreset: (key: string) => void
  onGenerate: () => void
  pasteKey: string
}) {
  return (
    <div className="upload">
      <label
        className={"drop" + (over ? " over" : "")}
        onDragOver={(e) => { e.preventDefault(); setOver(true) }}
        onDragLeave={(e) => { e.preventDefault(); setOver(false) }}
        onDrop={(e) => { e.preventDefault(); setOver(false); const f = e.dataTransfer.files[0]; if (f) onImageFile(f) }}
      >
        <input type="file" accept="image/*" hidden
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onImageFile(f) }} />
        {image
          ? (/* eslint-disable-next-line @next/next/no-img-element */ <img src={image} alt="선택한 문제" />)
          : <><div className="big">➕</div><div>문제 사진 올리기<br /><span className="hint">클릭 · 드래그 · {pasteKey} · 촬영</span></div></>}
      </label>
      <button className="btn ghost" type="button" onClick={onPasteButton}>📋 클립보드 이미지 붙여넣기</button>

      <div className="persona-row">
        {(Object.keys(PERSONAS) as PersonaId[]).map((id) => (
          <button
            key={id}
            type="button"
            className={"p-btn" + (persona === id ? " active" : "")}
            onClick={() => onPersona(id)}
            title={PERSONAS[id].desc}
          >
            <span className="p-emoji">{PERSONAS[id].emoji}</span>
            <span>{PERSONAS[id].label}</span>
          </button>
        ))}
      </div>

      <div className="voice-row">
        <label htmlFor="voice-sel">🎙 음성</label>
        <select id="voice-sel" value={voice} onChange={(e) => setVoice(e.target.value)}>
          {VOICES.map(([id, label]) => <option key={id} value={id}>{id} ({label})</option>)}
        </select>
      </div>
      <button className="btn" disabled={!image} onClick={onGenerate}>숏쌤 부르기 ✨</button>

      <div className="preset-row">
        {PRESETS.map((p) => (
          <button key={p.key} type="button" onClick={() => onPreset(p.key)} title={p.hint}>{p.label}</button>
        ))}
      </div>
    </div>
  )
}

export { readFile }
