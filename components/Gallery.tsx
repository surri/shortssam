import { renderMathInline } from "@/lib/math"
import type { Work } from "@/lib/types"

/** 갤러리 필터: 상위(과목 category) + 하위(단원 subtopic) 2단계. */
export type Filter = { cat: string | null; sub: string | null }

/** 저장된 생성물 갤러리 + 2단계 필터. 카드/칩은 접근성을 위해 button. */
export function Gallery({
  works, filter, onFilter, onOpen,
}: {
  works: Work[]
  filter: Filter
  onFilter: (f: Filter) => void
  onOpen: (id: string) => void
}) {
  const cats = [...new Set(works.map((w) => w.category).filter(Boolean))]
  const inCat = works.filter((w) => !filter.cat || w.category === filter.cat)
  const subs = [...new Set(inCat.map((w) => w.subtopic).filter(Boolean))]
  const shown = inCat.filter((w) => !filter.sub || w.subtopic === filter.sub)

  return (
    <div className="gallery">
      <h2>📚 내 문제 라이브러리 <span className="hint">({works.length})</span></h2>

      <div className="filter-group">
        <span className="filter-label">과목</span>
        <div className="filters">
          <button type="button" className={"chip" + (filter.cat === null ? " active" : "")} onClick={() => onFilter({ cat: null, sub: null })}>전체</button>
          {cats.map((c) => (
            <button type="button" key={c} className={"chip" + (filter.cat === c ? " active" : "")} onClick={() => onFilter({ cat: c, sub: null })}>{c}</button>
          ))}
        </div>
      </div>

      {subs.length > 0 && (
        <div className="filter-group">
          <span className="filter-label">단원</span>
          <div className="filters">
            <button type="button" className={"chip sub" + (filter.sub === null ? " active" : "")} onClick={() => onFilter({ ...filter, sub: null })}>전체</button>
            {subs.map((s) => (
              <button type="button" key={s} className={"chip sub" + (filter.sub === s ? " active" : "")} onClick={() => onFilter({ ...filter, sub: s })}>{s}</button>
            ))}
          </div>
        </div>
      )}

      <div className="grid">
        {shown.length === 0 ? (
          <div className="empty">아직 없어요. 문제를 올려보세요!</div>
        ) : (
          shown.map((w) => (
            <button type="button" key={w.id} className="card" onClick={() => onOpen(w.id)} aria-label={`${w.category || "문제"} 열기`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {w.thumb ? <img src={w.thumb} alt="" /> : <div style={{ aspectRatio: "4/3" }} />}
              <div className="meta">
                <div className="c">{w.category || "미분류"}{w.subtopic ? " · " + w.subtopic : ""}</div>
                <div className="a" dangerouslySetInnerHTML={{ __html: renderMathInline(w.answer || "") }} />
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  )
}
