import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, MessageCircleHeart, Trophy } from 'lucide-react'
import type { Goal, Habit } from '../../../shared/types'
import { HABIT_POINTS } from '../lib/habits'
import { commentFor, monthlyScores, RANKS, rankOf, yearScores } from '../lib/score'
import { monthKey } from '../lib/time'

interface Props {
  t: Date
  goals: Goal[]
  habits: Habit[]
}

/** 0 から目標の数まで数え上げる */
function useCountUp(target: number, ms = 900): number {
  const [v, setV] = useState(0)
  const from = useRef(0)
  useEffect(() => {
    const start = performance.now()
    const a = from.current
    let raf = 0
    const step = (now: number): void => {
      const p = Math.min(1, (now - start) / ms)
      const eased = 1 - Math.pow(1 - p, 3)
      const val = Math.round(a + (target - a) * eased)
      setV(val)
      if (p < 1) raf = requestAnimationFrame(step)
      else from.current = target
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [target, ms])
  return v
}

export function GrowthView({ t, goals, habits }: Props): React.JSX.Element {
  const [year, setYear] = useState(t.getFullYear())
  const [hover, setHover] = useState<number | null>(null)

  const map = monthlyScores(goals, habits)
  const thisKey = monthKey(t)
  const prevDate = new Date(t.getFullYear(), t.getMonth() - 1, 1)
  const score = map.get(thisKey)?.score ?? 0
  const count = map.get(thisKey)?.count ?? 0
  const habitCount = map.get(thisKey)?.habitCount ?? 0
  const prevScore = map.get(monthKey(prevDate))?.score ?? 0
  const { rank, next, index } = rankOf(score)
  const shown = useCountUp(score)

  const months = yearScores(goals, habits, year)
  const max = Math.max(60, ...months.map((m) => m.score))
  const total = months.reduce((n, m) => n + m.score, 0)
  const totalCount = months.reduce((n, m) => n + m.count, 0)
  const totalHabit = months.reduce((n, m) => n + m.habitCount, 0)
  const best = months.reduce((b, m) => (m.score > b.score ? m : b), months[0])
  const years = [...map.keys()].map((k) => Number(k.slice(0, 4)))
  const minYear = Math.min(t.getFullYear(), ...years)

  // グラフの大きさ
  const W = 320
  const H = 150
  const padL = 8
  const padB = 22
  const bw = (W - padL * 2) / 12
  const cumMax = Math.max(1, total)
  // 今年は今月まで (先の月には線を伸ばさない)
  const lastIndex = year === t.getFullYear() ? t.getMonth() : year < t.getFullYear() ? 11 : -1
  const cumPts = months.slice(0, lastIndex + 1).map((_, i) => {
    const cum = months.slice(0, i + 1).reduce((n, m) => n + m.score, 0)
    return [padL + bw * i + bw / 2, H - padB - (cum / cumMax) * (H - padB - 18)] as const
  })

  return (
    <div className="growth-view">
      <div className="hero" style={{ '--rc': rank.color } as React.CSSProperties}>
        <div className="hero-top">
          <div>
            <div className="muted small">
              {t.getFullYear()}年{t.getMonth() + 1}月のスコア
            </div>
            <div className="hero-score">
              {shown}
              <small>点</small>
            </div>
            <div className="muted small">
              目標 {count} 件・習慣 {habitCount} 回
              {prevScore > 0 && (
                <span className={score >= prevScore ? 'up' : 'down'}>
                  {' '}
                  ・先月比 {score >= prevScore ? '+' : ''}
                  {score - prevScore}
                </span>
              )}
            </div>
          </div>
          <div className="medal" title={`ランク: ${rank.name}`}>
            <Trophy size={26} />
            <span>{rank.name}</span>
          </div>
        </div>

        <div className="rank-track">
          {RANKS.slice(1).map((r, i) => (
            <span
              key={r.name}
              className={i + 1 <= index ? 'lit' : ''}
              style={{ '--c': r.color } as React.CSSProperties}
              title={`${r.name}: ${r.min} 点〜`}
            />
          ))}
        </div>
        <div className="muted small">
          {next ? `${next.name}まであと ${next.min - score} 点` : '最高ランクです！'}
        </div>

        <div className="bubble">
          <MessageCircleHeart size={16} />
          <p>{commentFor(score, prevScore, t)}</p>
        </div>
      </div>

      <div className="chart-card">
        <div className="chart-head">
          <h3>年間の推移</h3>
          <div className="year-nav">
            <button
              className="icon-btn"
              disabled={year <= minYear}
              onClick={() => setYear(year - 1)}
              title="前の年"
            >
              <ChevronLeft size={15} />
            </button>
            <span>{year}年</span>
            <button
              className="icon-btn"
              disabled={year >= t.getFullYear()}
              onClick={() => setYear(year + 1)}
              title="次の年"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="year-chart"
          key={year}
          onMouseLeave={() => setHover(null)}
        >
          {[0.25, 0.5, 0.75].map((f) => (
            <line
              key={f}
              x1={padL}
              x2={W - padL}
              y1={H - padB - f * (H - padB - 18)}
              y2={H - padB - f * (H - padB - 18)}
              className="grid"
            />
          ))}
          {months.map((m, i) => {
            const h = (m.score / max) * (H - padB - 18)
            const isNow = m.month === thisKey
            const x = padL + bw * i + bw * 0.18
            return (
              <g key={m.month} onMouseEnter={() => setHover(i)}>
                <rect x={padL + bw * i} y={0} width={bw} height={H} fill="transparent" />
                <rect
                  className={`bar ${isNow ? 'now' : ''} ${hover === i ? 'hover' : ''}`}
                  x={x}
                  y={H - padB - h}
                  width={bw * 0.64}
                  height={Math.max(h, m.score > 0 ? 2 : 0)}
                  rx={4}
                  style={{ animationDelay: `${i * 45}ms` }}
                />
                <text
                  x={padL + bw * i + bw / 2}
                  y={H - 6}
                  className={`mlabel ${isNow ? 'now' : ''}`}
                >
                  {i + 1}
                </text>
              </g>
            )
          })}
          {total > 0 && cumPts.length > 0 && (
            <polyline className="cum" points={cumPts.map((p) => p.join(',')).join(' ')} />
          )}
          {hover !== null && (
            <g
              className="tip"
              transform={`translate(${Math.min(W - 100, Math.max(4, padL + bw * hover - 30))}, 4)`}
            >
              <rect width={96} height={30} rx={8} />
              <text x={48} y={13}>
                {hover + 1}月 {months[hover].score} 点
              </text>
              <text x={48} y={25} className="sub">
                目標 {months[hover].count}・習慣 {months[hover].habitCount}
              </text>
            </g>
          )}
        </svg>
        <div className="legend muted small">
          <span>
            <i className="lg-bar" /> 月のスコア
          </span>
          <span>
            <i className="lg-line" /> 年間の累計
          </span>
        </div>
        <div className="stats four">
          <div>
            <b>{total}</b>
            <span>年間合計</span>
          </div>
          <div>
            <b>{totalCount}</b>
            <span>目標の達成</span>
          </div>
          <div>
            <b>{totalHabit}</b>
            <span>習慣のチェック</span>
          </div>
          <div>
            <b>{best.score > 0 ? `${Number(best.month.slice(5))}月` : '—'}</b>
            <span>最高の月</span>
          </div>
        </div>
      </div>

      <p className="muted small rule">
        点数のしくみ: 目標 1 つで 10 点 ＋ 期間 1 週間ごとに 5 点（最大 +30）、習慣のチェック 1 回で{' '}
        {HABIT_POINTS} 点。スコアは毎月 1 日に 0 から始まり、その月の記録として残ります。
      </p>
    </div>
  )
}
