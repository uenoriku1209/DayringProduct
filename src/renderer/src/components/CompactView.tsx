import { Expand, Minus } from 'lucide-react'
import type { Plan } from '../../../shared/types'
import { clock, hm, WEEKDAYS } from '../lib/time'

interface Props {
  t: Date
  active: { plan: Plan; remainSec: number; progress: number } | null
  next: { plan: Plan; untilSec: number } | null
  onExpand: () => void
}

const pad = (n: number): string => String(n).padStart(2, '0')

/**
 * 簡易表示: 日付・時刻・いまの予定だけ。
 * 全体をドラッグで移動、ダブルクリックで通常表示に戻る。
 * 小さくするほど、日付 → 秒 → 予定の残り時間 の順に省く。
 */
export function CompactView({ t, active, next, onExpand }: Props): React.JSX.Element {
  return (
    <div className="compact drag" onDoubleClick={onExpand} title="ダブルクリックで通常表示">
      <div className="c-clock">
        <div className="c-time">
          {pad(t.getHours())}
          <span className="c-colon">:</span>
          {pad(t.getMinutes())}
          <span className="c-ss">{pad(t.getSeconds())}</span>
        </div>
        <div className="c-date">
          {t.getMonth() + 1}/{t.getDate()}（{WEEKDAYS[t.getDay()]}）
        </div>
      </div>

      <div className="c-plan-area">
        {active ? (
          <div className="c-plan" style={{ '--c': active.plan.color } as React.CSSProperties}>
            <div className="c-plan-row">
              <span className="dot" />
              <span className="c-title">{active.plan.title}</span>
            </div>
            <div className="c-remain">
              あと {clock(active.remainSec)}
              <span className="c-until">〜{hm(active.plan.end)}</span>
            </div>
            <div className="c-bar">
              <span style={{ width: `${active.progress * 100}%` }} />
            </div>
          </div>
        ) : next ? (
          <div className="c-plan next" style={{ '--c': next.plan.color } as React.CSSProperties}>
            <div className="c-plan-row">
              <span className="dot" />
              <span className="c-title">{next.plan.title}</span>
            </div>
            <div className="c-remain">{hm(next.plan.start)} から</div>
          </div>
        ) : (
          <div className="c-plan empty">予定なし</div>
        )}
      </div>

      <div className="c-actions no-drag">
        <button className="icon-btn" onClick={onExpand} title="通常表示に戻す">
          <Expand size={13} />
        </button>
        <button
          className="icon-btn"
          onClick={() => window.api.hide()}
          title="しまう（タスクトレイ / Ctrl+Alt+D で再表示）"
        >
          <Minus size={13} />
        </button>
      </div>
    </div>
  )
}
