import { useRef, useState } from 'react'
import type { Plan } from '../../../shared/types'
import {
  arcPath,
  contains,
  DAY,
  minuteAt,
  overlaps,
  planLength,
  point,
  ringPath
} from '../lib/plans'
import { clock, hm, humanDuration } from '../lib/time'
import { Water } from './Water'

const SIZE = 320
const C = SIZE / 2
const R1 = 122 // 外側
const R0 = 88 // 内側
const RM = (R0 + R1) / 2

interface Props {
  t: Date
  plans: Plan[]
  selectedId: string | null
  active: { plan: Plan; remainSec: number; progress: number } | null
  next: { plan: Plan; untilSec: number } | null
  /** 終わった直後 (おつかれさま表示中) */
  finished: Plan | null
  water: boolean
  onSelect: (p: Plan) => void
  onCreate: (start: number, end: number) => void
}

/** 数字が変わったところだけ下から転がって出てくる */
export function Rolling({
  text,
  className
}: {
  text: string
  className?: string
}): React.JSX.Element {
  return (
    <span className={`rolling ${className ?? ''}`}>
      {text.split('').map((ch, i) => (
        <span key={`${i}-${ch}`} className={/\d/.test(ch) ? 'digit' : 'sep'}>
          {ch}
        </span>
      ))}
    </span>
  )
}

export function Donut(p: Props): React.JSX.Element {
  const svgRef = useRef<SVGSVGElement>(null)
  const [draft, setDraft] = useState<{ start: number; end: number } | null>(null)
  const minuteNow = p.t.getHours() * 60 + p.t.getMinutes() + p.t.getSeconds() / 60
  const nowAngle = (minuteNow / DAY) * 360

  /** マウスの位置 → SVG の座標 */
  const toSvg = (e: { clientX: number; clientY: number }): [number, number] => {
    const svg = svgRef.current!
    const pt = svg.createSVGPoint()
    pt.x = e.clientX
    pt.y = e.clientY
    const r = pt.matrixTransform(svg.getScreenCTM()!.inverse())
    return [r.x, r.y]
  }

  const onDown = (e: React.PointerEvent<SVGSVGElement>): void => {
    if (e.button !== 0) return
    const [x, y] = toSvg(e)
    const dist = Math.hypot(x - C, y - C)
    if (dist < R0 - 10 || dist > R1 + 18) return
    const m = minuteAt(C, C, x, y, 1)
    const hit = p.plans.find((pl) => contains(pl, m))
    if (hit) {
      p.onSelect(hit)
      return
    }
    // 空いているところからドラッグして、予定の時間帯を作る
    const start = minuteAt(C, C, x, y, 15)
    const svg = e.currentTarget
    svg.setPointerCapture(e.pointerId)
    let last = start
    let acc = 0
    setDraft({ start, end: start })
    const move = (ev: PointerEvent): void => {
      const [mx, my] = toSvg(ev)
      const cur = minuteAt(C, C, mx, my, 15)
      let d = cur - last
      if (d > DAY / 2) d -= DAY
      if (d < -DAY / 2) d += DAY
      acc = Math.max(-(DAY - 15), Math.min(DAY - 15, acc + d))
      last = cur
      setDraft(
        acc >= 0
          ? { start, end: (start + acc) % DAY }
          : { start: (start + acc + DAY) % DAY, end: start }
      )
    }
    const up = (): void => {
      svg.removeEventListener('pointermove', move)
      svg.removeEventListener('pointerup', up)
      svg.removeEventListener('pointercancel', up)
      setDraft(null)
      if (Math.abs(acc) >= 15) {
        const s = acc >= 0 ? start : (start + acc + DAY) % DAY
        const en = acc >= 0 ? (start + acc) % DAY : start
        p.onCreate(s, en)
      }
    }
    svg.addEventListener('pointermove', move)
    svg.addEventListener('pointerup', up)
    svg.addEventListener('pointercancel', up)
  }

  const draftBad = draft && draft.start !== draft.end ? overlaps(p.plans, draft) : null
  const a = p.active

  return (
    <div
      className={`donut ${a ? 'has-active' : ''} ${a && a.remainSec <= 300 ? 'ending' : ''}`}
      style={
        { '--now': `${nowAngle}deg`, '--pc': a?.plan.color ?? 'transparent' } as React.CSSProperties
      }
    >
      <svg
        ref={svgRef}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        onPointerDown={onDown}
        className={draft ? 'dragging' : ''}
      >
        <defs>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="5" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* 土台のリング */}
        <circle cx={C} cy={C} r={RM} className="track" strokeWidth={R1 - R0} />

        {/* 目盛り */}
        {Array.from({ length: 24 }, (_, h) => {
          const major = h % 6 === 0
          const [x1, y1] = point(C, C, R1 + 4, h * 60)
          const [x2, y2] = point(C, C, R1 + (major ? 11 : h % 3 === 0 ? 9 : 7), h * 60)
          return (
            <line
              key={h}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              className={`tick ${major ? 'major' : ''}`}
            />
          )
        })}
        {[0, 3, 6, 9, 12, 15, 18, 21].map((h) => {
          const [x, y] = point(C, C, R1 + 22, h * 60)
          return (
            <text key={h} x={x} y={y} className={`hour ${h % 6 === 0 ? 'major' : ''}`}>
              {h}
            </text>
          )
        })}

        {/* 予定 */}
        {p.plans.map((pl) => {
          const isActive = a?.plan.id === pl.id
          const len = planLength(pl)
          const mid = pl.start + len / 2
          const [lx, ly] = point(C, C, RM, mid)
          return (
            <g
              key={pl.id}
              className={`seg ${isActive ? 'active' : ''} ${p.selectedId === pl.id ? 'selected' : ''} ${
                p.finished?.id === pl.id ? 'finished' : ''
              }`}
              style={{ '--c': pl.color } as React.CSSProperties}
            >
              <path d={ringPath(C, C, R0, R1, pl.start, pl.end)} className="seg-fill" />
              {isActive && (
                <>
                  {/* 経過した部分は暗く */}
                  <path
                    d={ringPath(C, C, R0, R1, pl.start, pl.start + len * a.progress)}
                    className="seg-elapsed"
                  />
                  {/* 残りの部分を光が流れる */}
                  <path
                    d={arcPath(C, C, RM, pl.start + len * a.progress, pl.end)}
                    className="seg-flow"
                  />
                  <path
                    d={arcPath(C, C, R1 + 1, pl.start, pl.end)}
                    className="seg-edge"
                    filter="url(#glow)"
                  />
                </>
              )}
              {len >= 50 && (
                <text x={lx} y={ly} className="seg-label">
                  {pl.title.length > 5 ? pl.title.slice(0, 5) + '…' : pl.title}
                </text>
              )}
            </g>
          )
        })}

        {/* ドラッグ中の範囲 */}
        {draft && draft.start !== draft.end && (
          <g className={`draft ${draftBad ? 'bad' : ''}`}>
            <path d={ringPath(C, C, R0 - 3, R1 + 3, draft.start, draft.end)} />
          </g>
        )}

        {/* 現在時刻の針 */}
        <g
          className="hand"
          // 0:00 をまたぐときに逆回りしないよう、その瞬間だけアニメーションを切る
          style={{
            transform: `rotate(${nowAngle}deg)`,
            transition: nowAngle < 0.5 ? 'none' : undefined
          }}
        >
          <line x1={C} y1={C - R0 + 6} x2={C} y2={C - R1 - 6} />
          <circle cx={C} cy={C - R1 - 9} r={4.5} />
        </g>
      </svg>

      {/* いまの予定が進むにつれて、中央に水が溜まっていく */}
      {p.water && a && <Water className="core-water" level={a.progress} bubbles={false} />}

      {/* 時計の針の後ろに流れる光の尾 (予定の上に重ねる) */}
      <div className="comet" />

      {/* 真ん中の表示 */}
      <div className="donut-center">
        {draft && draft.start !== draft.end ? (
          <div className="center-draft">
            <div className="muted small">
              {draftBad ? `「${draftBad.title}」と重なっています` : '新しい予定'}
            </div>
            <div className="draft-time">
              {hm(draft.start)} – {hm(draft.end)}
            </div>
            <div className="muted small">{humanDuration(planLength(draft) * 60)}</div>
          </div>
        ) : p.finished ? (
          <div className="center-finished" key={`fin-${p.finished.id}`}>
            <svg viewBox="0 0 52 52" className="check-draw">
              <circle cx="26" cy="26" r="23" />
              <path d="M15 27 l7 7 l15 -16" />
            </svg>
            <div className="fin-title">おつかれさま！</div>
            <div className="muted small">{p.finished.title} が終わりました</div>
          </div>
        ) : a ? (
          <div className="center-active" key={`act-${a.plan.id}`}>
            <div className="center-label">
              <span className="dot" style={{ background: a.plan.color }} />
              {a.remainSec <= 300 ? 'まもなく終了' : 'いまの予定'}
            </div>
            <div className="center-title">{a.plan.title}</div>
            <Rolling text={clock(a.remainSec)} className="countdown" />
            <div className="muted small">
              {hm(a.plan.end)} まで・{Math.floor(a.progress * 100)}% 経過
            </div>
          </div>
        ) : p.next ? (
          <div className="center-next" key="next">
            <div className="center-label">次の予定</div>
            <div className="center-title small-title">
              <span className="dot" style={{ background: p.next.plan.color }} />
              {p.next.plan.title}
            </div>
            <div className="next-in">
              あと <Rolling text={clock(p.next.untilSec)} />
            </div>
            <div className="muted small">{hm(p.next.plan.start)} から</div>
          </div>
        ) : (
          <div className="center-empty">
            <div className="center-title small-title">予定はまだありません</div>
            <div className="muted small">
              リングをドラッグして
              <br />
              時間帯を選ぶと作れます
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
