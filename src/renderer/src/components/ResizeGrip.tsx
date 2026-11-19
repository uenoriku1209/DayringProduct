/** 右下のつまみ: ドラッグでウィジェットの大きさを変える */
export function ResizeGrip(): React.JSX.Element {
  const onDown = async (e: React.PointerEvent<HTMLDivElement>): Promise<void> => {
    if (e.button !== 0) return
    const el = e.currentTarget
    el.setPointerCapture(e.pointerId)
    const x0 = e.screenX
    const y0 = e.screenY
    const { width, height } = await window.api.getSize()
    let raf = 0
    const move = (ev: PointerEvent): void => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() =>
        window.api.resizeBy(width, height, ev.screenX - x0, ev.screenY - y0)
      )
    }
    const up = (): void => {
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerup', up)
    }
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerup', up)
  }
  return (
    <div className="resize-grip no-drag" onPointerDown={onDown} title="ドラッグで大きさを変更" />
  )
}
