import { app } from 'electron'
import { existsSync, readFileSync, renameSync, writeFileSync } from 'fs'
import { join } from 'path'
import { DEFAULT_SETTINGS, emptyData, type AppData } from '../shared/types'

const file = (): string => join(app.getPath('userData'), 'dayring.json')

/** 保存データを読み込む (壊れていたら、壊れたファイルを残して空で始める) */
export function loadData(): AppData {
  const path = file()
  if (!existsSync(path)) return emptyData()
  try {
    const raw = JSON.parse(readFileSync(path, 'utf8')) as Partial<AppData>
    return {
      version: 1,
      goals: Array.isArray(raw.goals) ? raw.goals : [],
      habits: Array.isArray(raw.habits) ? raw.habits : [],
      plans: Array.isArray(raw.plans) ? raw.plans : [],
      settings: { ...DEFAULT_SETTINGS, ...(raw.settings ?? {}) }
    }
  } catch {
    try {
      renameSync(path, path + `.broken-${Date.now()}`)
    } catch {
      /* 何もしない */
    }
    return emptyData()
  }
}

/** 一時ファイルに書いてから置き換える (書き込み中に落ちても壊れないように) */
export function saveData(data: AppData): void {
  const path = file()
  const tmp = path + '.tmp'
  writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8')
  renameSync(tmp, path)
}

export interface Bounds {
  x: number
  y: number
  width: number
  height: number
}
/** 通常表示と簡易表示それぞれの位置・大きさ */
export interface SavedBounds {
  normal?: Bounds
  compact?: Bounds
}
const boundsFile = (): string => join(app.getPath('userData'), 'window.json')

const valid = (b: unknown): b is Bounds =>
  !!b &&
  typeof b === 'object' &&
  ['x', 'y', 'width', 'height'].every((k) => Number.isFinite((b as Record<string, number>)[k]))

export function loadBounds(): SavedBounds {
  try {
    const raw = JSON.parse(readFileSync(boundsFile(), 'utf8'))
    // 以前の形式 (通常表示の位置だけ) にも対応
    if (valid(raw)) return { normal: raw }
    return {
      normal: valid(raw?.normal) ? raw.normal : undefined,
      compact: valid(raw?.compact) ? raw.compact : undefined
    }
  } catch {
    return {}
  }
}

export function saveBounds(b: SavedBounds): void {
  try {
    writeFileSync(boundsFile(), JSON.stringify(b), 'utf8')
  } catch {
    /* 位置の保存に失敗しても動作は続ける */
  }
}
