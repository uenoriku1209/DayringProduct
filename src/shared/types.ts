/** 目標 (期間つき)。achievedAt は達成した日 (YYYY-MM-DD) */
export interface Goal {
  id: string
  title: string
  /** 期間 (YYYY-MM-DD) */
  start: string
  end: string
  achievedAt?: string
  createdAt: string
}

/** 1 日の予定。start / end は 0:00 からの分 (end < start なら日付をまたぐ) */
export interface Plan {
  id: string
  title: string
  start: number
  end: number
  color: string
}

/** 習慣のチェックが必要な日の決め方 */
export type HabitRule =
  | { kind: 'daily' }
  /** 曜日指定 (0 = 日曜 〜 6 = 土曜) */
  | { kind: 'weekdays'; days: number[] }
  /** every 日ごと (2 = 1 日おき)。start の日から数える */
  | { kind: 'interval'; every: number }

/** 期限のない習慣 (筋トレを続ける、お菓子を食べない など) */
export interface Habit {
  id: string
  title: string
  rule: HabitRule
  /** 始めた日 (YYYY-MM-DD)。この日より前はチェック不要 */
  start: string
  /** チェックした日 (YYYY-MM-DD) */
  checks: string[]
  createdAt: string
}

export interface Settings {
  /** 常に手前に表示 */
  alwaysOnTop: boolean
  /** PC の起動時に自動で起動 */
  autoLaunch: boolean
  theme: 'dark' | 'light'
  /** 予定の開始時に Windows の通知も出す */
  notify: boolean
  /** 背景の不透明度 (0.55〜1) */
  opacity: number
  /** 時間の経過で水が溜まっていく演出 */
  water: boolean
  /** 簡易表示 (日付・時刻・いまの予定だけの小さな表示) */
  compact: boolean
}

export interface AppData {
  version: 1
  goals: Goal[]
  habits: Habit[]
  plans: Plan[]
  settings: Settings
}

export const DEFAULT_SETTINGS: Settings = {
  alwaysOnTop: false,
  autoLaunch: false,
  theme: 'dark',
  notify: true,
  opacity: 0.92,
  water: true,
  compact: false
}

export function emptyData(): AppData {
  return { version: 1, goals: [], habits: [], plans: [], settings: { ...DEFAULT_SETTINGS } }
}

/** preload で公開する API */
export interface WidgetApi {
  loadData(): Promise<AppData>
  saveData(data: AppData): Promise<void>
  /** ウィンドウをトレイにしまう */
  hide(): void
  quit(): void
  setAlwaysOnTop(on: boolean): void
  setAutoLaunch(on: boolean): void
  /** 簡易表示の切り替え (ウィンドウの大きさも変わる) */
  setCompact(on: boolean): void
  resetPosition(): void
  /** 右下のつまみで大きさを変える (開始時の大きさからの差分) */
  resizeBy(startW: number, startH: number, dw: number, dh: number): void
  getSize(): Promise<{ width: number; height: number }>
  /** トレイのメニューで設定が変わったとき */
  onSettingsChanged(cb: (s: Partial<Settings>) => void): () => void
}
