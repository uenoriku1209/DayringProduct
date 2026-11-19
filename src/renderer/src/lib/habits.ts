import type { Habit, HabitRule } from '../../../shared/types'
import { addDays, diffDays, parseDate, shortDate, WEEKDAYS } from './time'

/** 習慣 1 回のチェックの点数 */
export const HABIT_POINTS = 3

/** 月曜始まりの並び (曜日を選ぶボタン用) */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0]

export const INTERVALS: { every: number; label: string }[] = [
  { every: 2, label: '1日おき' },
  { every: 3, label: '2日おき' },
  { every: 4, label: '3日おき' },
  { every: 7, label: '週に1回' }
]

/** 「月・水・金」「毎日」「1日おき」など */
export function ruleText(rule: HabitRule): string {
  if (rule.kind === 'daily') return '毎日'
  if (rule.kind === 'interval')
    return INTERVALS.find((i) => i.every === rule.every)?.label ?? `${rule.every}日ごと`
  const days = WEEK_ORDER.filter((d) => rule.days.includes(d))
  if (days.length === 7) return '毎日'
  if (days.length === 5 && !days.includes(0) && !days.includes(6)) return '平日'
  if (days.length === 2 && days.includes(0) && days.includes(6)) return '土日'
  return days.map((d) => WEEKDAYS[d]).join('・')
}

/** その日がチェックの必要な日か */
export function isDue(h: Pick<Habit, 'rule' | 'start'>, key: string): boolean {
  if (key < h.start) return false
  const r = h.rule
  if (r.kind === 'daily') return true
  if (r.kind === 'weekdays') return r.days.includes(parseDate(key).getDay())
  return diffDays(h.start, key) % Math.max(1, r.every) === 0
}

/** from の日以降 (from を含む) で、次にチェックが必要な日 */
export function nextDue(h: Pick<Habit, 'rule' | 'start'>, from: string): string | null {
  for (let i = 0; i < 400; i++) {
    const k = addDays(from, i)
    if (isDue(h, k)) return k
  }
  return null
}

/**
 * 連続回数: チェックが必要な日を、今日 (まだならその前の日) からさかのぼって、
 * 続けてチェックできている回数
 */
export function streak(h: Habit, today: string): number {
  const checked = new Set(h.checks)
  let n = 0
  let key = today
  // 今日がまだなら、昨日から数える (今日のぶんで途切れたことにはしない)
  if (isDue(h, today) && !checked.has(today)) key = addDays(today, -1)
  for (let i = 0; i < 800 && key >= h.start; i++) {
    if (isDue(h, key)) {
      if (!checked.has(key)) break
      n++
    }
    key = addDays(key, -1)
  }
  return n
}

export interface DayMark {
  key: string
  due: boolean
  checked: boolean
  isToday: boolean
}

/** 直近 n 日 (古い順) の状態 */
export function recentDays(h: Habit, today: string, n = 14): DayMark[] {
  const checked = new Set(h.checks)
  return Array.from({ length: n }, (_, i) => {
    const key = addDays(today, i - n + 1)
    return { key, due: isDue(h, key), checked: checked.has(key), isToday: key === today }
  })
}

/** 「次は 11/21（金）」 */
export function nextDueText(h: Habit, today: string): string {
  const k = nextDue(h, addDays(today, 1))
  if (!k) return ''
  const d = diffDays(today, k)
  return d === 1 ? '次は明日' : `次は ${shortDate(k)}`
}
