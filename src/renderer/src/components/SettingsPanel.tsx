import { useEffect } from 'react'
import { Moon, Power, RotateCcw, Shrink, Sun, X } from 'lucide-react'
import type { Settings } from '../../../shared/types'

interface Props {
  settings: Settings
  onChange: (patch: Partial<Settings>) => void
  onClose: () => void
}

function Toggle({
  label,
  hint,
  on,
  onChange
}: {
  label: string
  hint?: string
  on: boolean
  onChange: (v: boolean) => void
}): React.JSX.Element {
  return (
    <label className="toggle-row">
      <span>
        {label}
        {hint && <small>{hint}</small>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        className={`switch ${on ? 'on' : ''}`}
        onClick={() => onChange(!on)}
      >
        <span />
      </button>
    </label>
  )
}

export function SettingsPanel({ settings: s, onChange, onClose }: Props): React.JSX.Element {
  const op = s.opacity
  // Esc でも閉じる
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <h2>設定</h2>
          <button className="icon-btn" onClick={onClose} title="閉じる">
            <X size={15} />
          </button>
        </div>

        <div className="setting-group">
          <div className="setting-label">テーマ</div>
          <div className="segmented">
            <button
              className={s.theme === 'dark' ? 'active' : ''}
              onClick={() => onChange({ theme: 'dark' })}
            >
              <Moon size={14} /> ダーク
            </button>
            <button
              className={s.theme === 'light' ? 'active' : ''}
              onClick={() => onChange({ theme: 'light' })}
            >
              <Sun size={14} /> ライト
            </button>
          </div>
        </div>

        <div className="setting-group">
          <div className="setting-label">
            背景の濃さ（100% で後ろのウィンドウが透けない）
            <span className="muted">{Math.round(op * 100)}%</span>
          </div>
          <input
            type="range"
            min={55}
            max={100}
            value={Math.round(op * 100)}
            onChange={(e) => onChange({ opacity: Number(e.target.value) / 100 })}
          />
        </div>

        <div className="setting-group">
          <Toggle
            label="常に手前に表示"
            hint="ほかのウィンドウの上に浮かせます"
            on={s.alwaysOnTop}
            onChange={(v) => onChange({ alwaysOnTop: v })}
          />
          <Toggle
            label="PC の起動時に自動で起動"
            hint=".exe でインストールした場合に有効です"
            on={s.autoLaunch}
            onChange={(v) => onChange({ autoLaunch: v })}
          />
          <Toggle
            label="水が溜まっていく演出"
            hint="1 日の経過と予定の進み具合を、背景の水位でそっと表します"
            on={s.water}
            onChange={(v) => onChange({ water: v })}
          />
          <Toggle
            label="予定の開始を Windows でも通知"
            hint="ウィジェットをしまっていても気づけます"
            on={s.notify}
            onChange={(v) => onChange({ notify: v })}
          />
        </div>

        <div className="setting-group">
          <p className="muted small">
            上部をドラッグで移動、右下の角で大きさを変更できます。Ctrl+Alt+D
            でいつでも表示・非表示を切り替えられます。
          </p>
          <div className="row gap wrap">
            <button
              className="btn"
              onClick={() => {
                onClose()
                onChange({ compact: true })
              }}
            >
              <Shrink size={14} /> 簡易表示にする
            </button>
            <button className="btn" onClick={() => window.api.resetPosition()}>
              <RotateCcw size={14} /> 位置を右上に戻す
            </button>
            <button className="btn danger" onClick={() => window.api.quit()}>
              <Power size={14} /> 終了
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
