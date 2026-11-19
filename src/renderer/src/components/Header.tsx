import { Minus, Pin, PinOff, Settings2 } from 'lucide-react'

interface Props {
  pinned: boolean
  onPin: () => void
  onSettings: () => void
}

/** 上部 (ここをドラッグしてウィジェットを動かす) */
export function Header({ pinned, onPin, onSettings }: Props): React.JSX.Element {
  return (
    <header className="header drag">
      <div className="brand">
        <span className="brand-dot" />
        DayRing
      </div>
      <div className="header-actions no-drag">
        <button
          className={`icon-btn ${pinned ? 'on' : ''}`}
          onClick={onPin}
          title={pinned ? '常に手前に表示: オン' : '常に手前に表示: オフ'}
        >
          {pinned ? <Pin size={14} /> : <PinOff size={14} />}
        </button>
        <button className="icon-btn" onClick={onSettings} title="設定">
          <Settings2 size={14} />
        </button>
        <button
          className="icon-btn"
          onClick={() => window.api.hide()}
          title="しまう（タスクトレイのアイコン / Ctrl+Alt+D で再表示）"
        >
          <Minus size={14} />
        </button>
      </div>
    </header>
  )
}
