/** 波の形 (横 1200 に 2 周期。幅 200% にして半分ずらすと、つなぎ目なく流れる) */
const WAVE = (() => {
  const pts: string[] = []
  for (let x = 0; x <= 1200; x += 20) {
    const y = 14 + Math.sin((x / 600) * Math.PI * 2) * 6
    pts.push(`${x},${y.toFixed(1)}`)
  }
  return `M0,40 L${pts.join(' L')} L1200,40 Z`
})()

/** 水の中をゆっくり上る小さな泡 (位置などは固定) */
const BUBBLES = [
  { left: 12, size: 4, dur: 13, delay: 0 },
  { left: 34, size: 3, dur: 17, delay: 5 },
  { left: 58, size: 5, dur: 15, delay: 9 },
  { left: 81, size: 3, dur: 19, delay: 2.5 }
]

interface Props {
  /** 水位 (0〜1) */
  level: number
  className?: string
  /** 泡を出すか */
  bubbles?: boolean
}

/**
 * 時間の経過とともに、下から水が溜まっていく控えめな演出。
 * 色は CSS の --wc (水の色) で決める。操作のじゃまにならないよう、クリックは下へ通す。
 */
export function Water({ level, className, bubbles = true }: Props): React.JSX.Element {
  const lv = Math.max(0, Math.min(1, level))
  return (
    <div className={`water ${className ?? ''}`} aria-hidden>
      <div className="water-body" style={{ height: `${lv * 100}%` }}>
        <svg className="wave w1" viewBox="0 0 1200 40" preserveAspectRatio="none">
          <path d={WAVE} />
        </svg>
        <svg className="wave w2" viewBox="0 0 1200 40" preserveAspectRatio="none">
          <path d={WAVE} />
        </svg>
        {bubbles &&
          BUBBLES.map((b, i) => (
            <i
              key={i}
              className="water-bubble"
              style={{
                left: `${b.left}%`,
                width: b.size,
                height: b.size,
                animationDuration: `${b.dur}s`,
                animationDelay: `${b.delay}s`
              }}
            />
          ))}
      </div>
    </div>
  )
}
