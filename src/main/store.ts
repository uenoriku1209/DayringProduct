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

interface Bounds {
  x: number
  y: number
  width: number
  height: number
}
const boundsFile = (): string => join(app.getPath('userData'), 'window.json')

export function loadBounds(): Bounds | null {
  try {
    const b = JSON.parse(readFileSync(boundsFile(), 'utf8')) as Bounds
    if ([b.x, b.y, b.width, b.height].every((n) => Number.isFinite(n))) return b
  } catch {
    /* 初回 */
  }
  return null
}

export function saveBounds(b: Bounds): void {
  try {
    writeFileSync(boundsFile(), JSON.stringify(b), 'utf8')
  } catch {
    /* 位置の保存に失敗しても動作は続ける */
  }
}
