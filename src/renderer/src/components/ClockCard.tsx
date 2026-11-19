import type { Plan } from '../../../shared/types'
import { clock, WEEKDAYS } from '../lib/time'

interface Props {
  t: Date
  active: { plan: Plan; remainSec: number; progress: number } | null
  onShowPlan: () => void
}

const pad = (n: number): string => String(n).padStart(2, '0')

/** 日付と時刻 (ここもドラッグで移動できる) */
export function ClockCard({ t, active, onShowPlan }: Props): React.JSX.Element {
  const dayProgress = (t.getHours() * 60 + t.getMinutes()) / 1440
  return (
    <section className="clock drag">
      <div className="clock-date">
        {t.getFullYear()}年{t.getMonth() + 1}月{t.getDate()}日
        <span className={`weekday w${t.getDay()}`}>{WEEKDAYS[t.getDay()]}曜日</span>
      </div>
      <div className="clock-time">
        <span className="hh">{pad(t.getHours())}</span>
        <span className="colon">:</span>
        <span className="mm">{pad(t.getMinutes())}</span>
        <span className="ss" key={t.getSeconds()}>
          {pad(t.getSeconds())}
        </span>
      </div>
      <div className="day-bar" title={`今日の ${Math.round(dayProgress * 100)}% が経過`}>
        <span style={{ width: `${dayProgress * 100}%` }} />
      </div>
      {active && (
        <button
          className="now-chip no-drag"
          onClick={onShowPlan}
          style={{ '--c': active.plan.color } as React.CSSProperties}
        >
          <span className="dot" />
          <span className="now-title">{active.plan.title}</span>
          <span className="now-remain">あと {clock(active.remainSec)}</span>
        </button>
      )}
    </section>
  )
}
