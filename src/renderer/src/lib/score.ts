import type { Goal, Habit } from '../../../shared/types'
import { HABIT_POINTS } from './habits'
import { diffDays, monthKey, parseDate } from './time'

/** 1 つの目標の点数: 基本 10 点 + 期間 1 週間ごとに 5 点 (最大 +30) */
export function goalPoints(g: Pick<Goal, 'start' | 'end'>): number {
  const days = Math.max(1, diffDays(g.start, g.end) + 1)
  return 10 + Math.min(30, Math.floor(days / 7) * 5)
}

export interface MonthScore {
  /** YYYY-MM */
  month: string
  score: number
  /** 達成した目標の数 */
  count: number
  /** 習慣のチェック回数 */
  habitCount: number
}

/**
 * 月ごとのスコア (月が変わると 0 から)
 * = その月に達成した目標の点数 + その月の習慣のチェック × HABIT_POINTS
 */
export function monthlyScores(goals: Goal[], habits: Habit[] = []): Map<string, MonthScore> {
  const map = new Map<string, MonthScore>()
  const get = (key: string): MonthScore => {
    let cur = map.get(key)
    if (!cur) {
      cur = { month: key, score: 0, count: 0, habitCount: 0 }
      map.set(key, cur)
    }
    return cur
  }
  for (const g of goals) {
    if (!g.achievedAt) continue
    const cur = get(monthKey(parseDate(g.achievedAt)))
    cur.score += goalPoints(g)
    cur.count += 1
  }
  for (const h of habits) {
    for (const day of h.checks) {
      const cur = get(monthKey(parseDate(day)))
      cur.score += HABIT_POINTS
      cur.habitCount += 1
    }
  }
  return map
}

/** 指定した年の 12 か月分 */
export function yearScores(goals: Goal[], habits: Habit[], year: number): MonthScore[] {
  const map = monthlyScores(goals, habits)
  return Array.from({ length: 12 }, (_, i) => {
    const key = `${year}-${String(i + 1).padStart(2, '0')}`
    return map.get(key) ?? { month: key, score: 0, count: 0, habitCount: 0 }
  })
}

export interface Rank {
  name: string
  /** この点数から */
  min: number
  color: string
}

export const RANKS: Rank[] = [
  { name: 'スタート', min: 0, color: '#94a3b8' },
  { name: 'ブロンズ', min: 1, color: '#d08a5b' },
  { name: 'シルバー', min: 40, color: '#cbd5e1' },
  { name: 'ゴールド', min: 90, color: '#facc15' },
  { name: 'プラチナ', min: 160, color: '#5eead4' },
  { name: 'ダイヤ', min: 250, color: '#a5b4fc' }
]

export function rankOf(score: number): { rank: Rank; next: Rank | null; index: number } {
  let index = 0
  RANKS.forEach((r, i) => {
    if (score >= r.min) index = i
  })
  return { rank: RANKS[index], next: RANKS[index + 1] ?? null, index }
}

const COMMENTS: string[][] = [
  [
    '今月はここから。まずは「今日だけ」の小さな目標を 1 つ立ててみよう。',
    'スタートラインに立てています。最初の 1 つが一番大事。',
    '目標を書くだけでも前進です。気軽に 1 つどうぞ。'
  ],
  [
    'いいスタート！ 1 つ達成するたびに、確実に積み上がっています。',
    '小さな達成が習慣を作ります。この調子で次の 1 つへ。',
    '動き出せています。次は 1 週間の目標にも挑戦してみては？'
  ],
  [
    'シルバー到達！ 続ける力が身についてきました。',
    'ペースができてきましたね。無理のない範囲で積み重ねましょう。',
    '着実です。少し長めの目標を混ぜると、さらに伸びます。'
  ],
  [
    'ゴールド！ 今月はかなり充実しています。',
    '目標を立てて、やり切る。そのサイクルが回っています。',
    'すばらしいペース。達成した自分をしっかりほめてあげてください。'
  ],
  [
    'プラチナ！ 計画力と実行力がそろっています。',
    'ここまで来たら上位の常連。休むことも計画に入れていきましょう。',
    'この 1 か月の積み重ねは、確かな自信になります。'
  ],
  [
    'ダイヤモンド級！ 今月のあなたは本当に止まりませんね。',
    '最高ランク到達。この経験は来月以降の大きな財産です。',
    '圧巻の達成数。たまには思い切り休むのも目標にどうぞ。'
  ]
]

/** スコアに応じた一言 (同じ日は同じ言葉になるよう、日付で選ぶ) */
export function commentFor(score: number, prevScore: number, day: Date): string {
  const { index } = rankOf(score)
  const list = COMMENTS[index]
  const seed = day.getFullYear() * 400 + day.getMonth() * 31 + day.getDate()
  let text = list[seed % list.length]
  if (score > 0 && prevScore > 0 && score > prevScore)
    text += ` 先月を ${score - prevScore} 点上回っています！`
  else if (score === 0 && prevScore > 0)
    text += ` 先月は ${prevScore} 点。今月も積み上げていきましょう。`
  return text
}
