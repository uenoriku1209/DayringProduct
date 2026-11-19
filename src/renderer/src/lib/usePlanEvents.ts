import { useCallback, useEffect, useRef, useState } from 'react'
import type { Plan } from '../../../shared/types'
import { activePlan, planLength } from './plans'
import { hm, humanDuration } from './time'

export interface PlanEvent {
  id: number
  kind: 'start' | 'end'
  plan: Plan
  /** 起きた時刻 (ミリ秒) */
  at: number
}

/** minute が x ちょうど (またはその 1 分後) か: 時刻をまたいだ瞬間だけ反応するため */
const near = (minute: number, x: number): boolean => (minute - x + 1440) % 1440 <= 1

/**
 * 予定が始まった・終わった瞬間を見つける。
 * 予定を編集・削除したことによる切り替わりや、起動直後には反応しない。
 */
export function usePlanEvents(
  plans: Plan[],
  t: Date,
  notify: boolean
): { events: PlanEvent[]; dismiss: (id: number) => void; lastEnd: PlanEvent | null } {
  const [events, setEvents] = useState<PlanEvent[]>([])
  const [lastEnd, setLastEnd] = useState<PlanEvent | null>(null)
  const prev = useRef<Plan | null | undefined>(undefined)
  const seq = useRef(0)

  useEffect(() => {
    const act = activePlan(plans, t)?.plan ?? null
    const before = prev.current
    prev.current = act
    if (before === undefined || (before?.id ?? null) === (act?.id ?? null)) return
    const minute = t.getHours() * 60 + t.getMinutes()
    const out: PlanEvent[] = []
    if (before && plans.some((p) => p.id === before.id) && near(minute, before.end))
      out.push({ id: ++seq.current, kind: 'end', plan: before, at: t.getTime() })
    if (act && near(minute, act.start)) {
      out.push({ id: ++seq.current, kind: 'start', plan: act, at: t.getTime() })
      if (notify && 'Notification' in window) {
        try {
          new Notification(`${act.title} の時間です`, {
            body: `${hm(act.start)} 〜 ${hm(act.end)}（${humanDuration(planLength(act) * 60)}）`,
            silent: false
          })
        } catch {
          /* 通知が使えない環境 */
        }
      }
    }
    if (out.length === 0) return
    setEvents((q) => [...q, ...out].slice(-4))
    const end = out.find((e) => e.kind === 'end')
    if (end) setLastEnd(end)
  }, [t, plans, notify])

  const dismiss = useCallback((id: number) => setEvents((q) => q.filter((e) => e.id !== id)), [])
  return { events, dismiss, lastEnd }
}
