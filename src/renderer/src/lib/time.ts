/** 現在時刻 (動作確認用に localStorage の dayring.debugOffset (ミリ秒) だけずらせる) */
export function now(): Date {
  let offset = 0
  try {
    offset = Number(localStorage.getItem('dayring.debugOffset')) || 0
  } catch {
    /* 何もしない */
  }
  return new Date(Date.now() + offset)
}

const pad = (n: number): string => String(n).padStart(2, '0')

export const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土']

/** YYYY-MM-DD (ローカル時刻) */
export function dateKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** YYYY-MM */
export function monthKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
}

export function parseDate(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(key: string, n: number): string {
  const d = parseDate(key)
  d.setDate(d.getDate() + n)
  return dateKey(d)
}

/** 2 つの日付の日数差 (b - a) */
export function diffDays(a: string, b: string): number {
  return Math.round((parseDate(b).getTime() - parseDate(a).getTime()) / 86400000)
}

/** 11/19（木） */
export function shortDate(key: string): string {
  const d = parseDate(key)
  return `${d.getMonth() + 1}/${d.getDate()}（${WEEKDAYS[d.getDay()]}）`
}

/** 0:00 からの分 → 14:05 */
export function hm(min: number): string {
  const m = ((min % 1440) + 1440) % 1440
  return `${Math.floor(m / 60)}:${pad(m % 60)}`
}

/** "14:05" → 分 */
export function parseHm(text: string): number | null {
  const m = text.match(/^(\d{1,2}):(\d{2})$/)
  if (!m) return null
  const h = Number(m[1])
  const mi = Number(m[2])
  if (h > 24 || mi > 59 || (h === 24 && mi > 0)) return null
  return (h * 60 + mi) % 1440
}

/** 秒数 → 1:23:45 / 23:45 */
export function clock(sec: number): string {
  const s = Math.max(0, Math.floor(sec))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  return h > 0 ? `${h}:${pad(m)}:${pad(s % 60)}` : `${m}:${pad(s % 60)}`
}

/** 秒数 → 1時間23分 / 23分 / 45秒 */
export function humanDuration(sec: number): string {
  const s = Math.max(0, Math.round(sec))
  if (s < 60) return `${s}秒`
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  if (h === 0) return `${m}分`
  return m === 0 ? `${h}時間` : `${h}時間${m}分`
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)
}
