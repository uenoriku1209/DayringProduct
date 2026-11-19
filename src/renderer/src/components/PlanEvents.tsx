import { useEffect, useState } from 'react'
import { Play } from 'lucide-react'
import type { PlanEvent } from '../lib/usePlanEvents'
import { activePlan, planLength } from '../lib/plans'
import { clock, hm, humanDuration } from '../lib/time'
import { Rolling } from './Donut'

interface Props {
  events: PlanEvent[]
  t: Date
  onDone: (id: number) => void
}

const START_MS = 6500
const END_MS = 4800
const OUT_MS = 1000

/**
 * 下からゆっくり上っていく泡 (毎回同じ配置になるよう、番号から決める)。
 * depth が小さいほど奥 (小さく・ぼんやり・遅く)。
 */
const BUBBLES = Array.from({ length: 26 }, (_, i) => {
  const depth = ((i * 7) % 10) / 10
  return {
    left: (i * 37 + 11) % 100,
    size: 5 + depth * 22 + (i % 3) * 2,
    dur: 7.5 - depth * 2.6 + (i % 4) * 0.4,
    delay: ((i * 0.37) % 2.4) + (i % 2) * 0.3,
    sway: 6 + (i % 5) * 4,
    blur: depth < 0.3 ? 1.2 : 0,
    alpha: 0.35 + depth * 0.5
  }
})

/** シャボン玉のような泡 */
function BubbleField({ count = 26 }: { count?: number }): React.JSX.Element {
  return (
    <div className="bubble-field">
      {BUBBLES.slice(0, count).map((b, i) => (
        <span
          key={i}
          className="rise"
          style={
            {
              left: `${b.left}%`,
              animationDuration: `${b.dur}s`,
              animationDelay: `${b.delay}s`,
              '--a': b.alpha
            } as React.CSSProperties
          }
        >
          <i
            className="soap"
            style={
              {
                width: b.size,
                height: b.size,
                filter: b.blur ? `blur(${b.blur}px)` : undefined,
                animationDuration: `${2.6 + (i % 3) * 0.7}s`,
                '--sway': `${b.sway}px`
              } as React.CSSProperties
            }
          />
        </span>
      ))}
    </div>
  )
}

/**
 * 予定の開始・終了の演出 (ウィジェット全体に重ねる)。
 * まぶしい光や急な動きは使わず、泡がゆっくり上っていく落ち着いた演出にしている。
 * クリックするとすぐ閉じる。
 */
export function PlanEvents({ events, t, onDone }: Props): React.JSX.Element | null {
  const ev = events[0]
  const [phase, setPhase] = useState<'in' | 'out'>('in')

  useEffect(() => {
    if (!ev) return
    setPhase('in')
    const total = ev.kind === 'start' ? START_MS : END_MS
    const a = setTimeout(() => setPhase('out'), total - OUT_MS)
    const b = setTimeout(() => onDone(ev.id), total)
    return () => {
      clearTimeout(a)
      clearTimeout(b)
    }
  }, [ev, onDone])

  if (!ev) return null
  const p = ev.plan
  const close = (): void => {
    setPhase('out')
    setTimeout(() => onDone(ev.id), OUT_MS)
  }

  if (ev.kind === 'end')
    return (
      <div
        className={`event-overlay end ${phase}`}
        style={{ '--c': p.color } as React.CSSProperties}
        onClick={close}
        key={ev.id}
      >
        <div className="ev-backdrop" />
        <BubbleField count={16} />
        <div className="ev-stage">
          <div className="soap-orb small">
            <svg viewBox="0 0 52 52" className="check-draw">
              <path d="M15 27 l7 7 l15 -16" />
            </svg>
          </div>
          <h2 className="ev-title soft">おつかれさま</h2>
          <div className="ev-sub">
            「{p.title}」（{humanDuration(planLength(p) * 60)}）が終わりました
          </div>
        </div>
      </div>
    )

  const act = activePlan([p], t)
  return (
    <div
      className={`event-overlay start ${phase}`}
      style={{ '--c': p.color } as React.CSSProperties}
      onClick={close}
      key={ev.id}
    >
      <div className="ev-backdrop" />
      <BubbleField />
      <div className="ev-stage">
        <div className="soap-orb">
          <span className="soap-sheen" />
          <span className="soap-glint" />
          <div className="orb-core">
            <Play size={20} fill="currentColor" />
            <span>START</span>
          </div>
        </div>
        <div className="ev-time">
          {hm(p.start)} – {hm(p.end)}
        </div>
        <h2 className="ev-title soft">
          {Array.from(p.title).map((ch, i) => (
            <span key={i} style={{ animationDelay: `${0.9 + i * 0.07}s` }}>
              {ch === ' ' ? ' ' : ch}
            </span>
          ))}
        </h2>
        <div className="ev-remain">
          終了まで <Rolling text={clock(act?.remainSec ?? planLength(p) * 60)} />
        </div>
      </div>
    </div>
  )
}
