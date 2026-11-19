import type { Plan } from '../../../shared/types'

export const DAY = 1440

/** 予定の長さ (分)。日付をまたぐものにも対応 */
export function planLength(p: Pick<Plan, 'start' | 'end'>): number {
  const len = (p.end - p.start + DAY) % DAY
  return len === 0 ? DAY : len
}

/** minute (0〜1439) がこの予定の中か */
export function contains(p: Pick<Plan, 'start' | 'end'>, minute: number): boolean {
  return (minute - p.start + DAY) % DAY < planLength(p)
}

/** いまの予定と、その残り秒数・経過の割合 */
export function activePlan(
  plans: Plan[],
  d: Date
): { plan: Plan; remainSec: number; progress: number } | null {
  const sec = d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds()
  const minute = Math.floor(sec / 60)
  const plan = plans.find((p) => contains(p, minute))
  if (!plan) return null
  const lenSec = planLength(plan) * 60
  const elapsed = (sec - plan.start * 60 + DAY * 60) % (DAY * 60)
  return { plan, remainSec: lenSec - elapsed, progress: elapsed / lenSec }
}

/** 次に始まる予定と、開始までの秒数 */
export function nextPlan(plans: Plan[], d: Date): { plan: Plan; untilSec: number } | null {
  const sec = d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds()
  let best: { plan: Plan; untilSec: number } | null = null
  for (const p of plans) {
    const until = (p.start * 60 - sec + DAY * 60) % (DAY * 60)
    if (until === 0) continue
    if (!best || until < best.untilSec) best = { plan: p, untilSec: until }
  }
  return best
}

/** 他の予定と重なっているか */
export function overlaps(
  plans: Plan[],
  cand: Pick<Plan, 'start' | 'end'>,
  ignoreId?: string
): Plan | null {
  for (const p of plans) {
    if (p.id === ignoreId) continue
    // どちらかの開始が、もう片方の中に入っていれば重なる
    if (contains(p, cand.start) || contains(cand, p.start)) return p
  }
  return null
}

/** 開始時刻順 */
export function sortPlans(plans: Plan[]): Plan[] {
  return [...plans].sort((a, b) => a.start - b.start)
}

export const PLAN_COLORS = [
  '#ff8a65',
  '#5eead4',
  '#818cf8',
  '#facc15',
  '#f472b6',
  '#60a5fa',
  '#a3e635',
  '#c084fc'
]

/* ---------- 円グラフの座標 ---------- */

/** 分 → 角度 (0:00 が真上、時計回り。ラジアン) */
export function angleOf(minute: number): number {
  return (minute / DAY) * Math.PI * 2 - Math.PI / 2
}

export function point(cx: number, cy: number, r: number, minute: number): [number, number] {
  const a = angleOf(minute)
  return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]
}

/** 外側の半径 r1・内側の半径 r0 の、start〜end の扇形 (ドーナツの一部) の path */
export function ringPath(
  cx: number,
  cy: number,
  r0: number,
  r1: number,
  start: number,
  end: number
): string {
  let len = (end - start + DAY) % DAY
  if (len === 0) len = DAY - 0.01
  const e = start + len
  const large = len > DAY / 2 ? 1 : 0
  const [x1, y1] = point(cx, cy, r1, start)
  const [x2, y2] = point(cx, cy, r1, e)
  const [x3, y3] = point(cx, cy, r0, e)
  const [x4, y4] = point(cx, cy, r0, start)
  return [
    `M ${x1} ${y1}`,
    `A ${r1} ${r1} 0 ${large} 1 ${x2} ${y2}`,
    `L ${x3} ${y3}`,
    `A ${r0} ${r0} 0 ${large} 0 ${x4} ${y4}`,
    'Z'
  ].join(' ')
}

/** 円周上の弧 (線) の path */
export function arcPath(cx: number, cy: number, r: number, start: number, end: number): string {
  let len = (end - start + DAY) % DAY
  if (len === 0) len = DAY - 0.01
  const [x1, y1] = point(cx, cy, r, start)
  const [x2, y2] = point(cx, cy, r, start + len)
  return `M ${x1} ${y1} A ${r} ${r} 0 ${len > DAY / 2 ? 1 : 0} 1 ${x2} ${y2}`
}

/** 円グラフ上の座標 → 分 (step 分単位に丸める) */
export function minuteAt(cx: number, cy: number, x: number, y: number, step = 15): number {
  let a = Math.atan2(y - cy, x - cx) + Math.PI / 2
  if (a < 0) a += Math.PI * 2
  const m = (a / (Math.PI * 2)) * DAY
  return (Math.round(m / step) * step) % DAY
}
