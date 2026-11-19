import { useEffect, useState } from 'react'
import { now } from './time'

/** 1 秒ごとに更新される現在時刻 (秒の切り替わりに合わせる) */
export function useNow(): Date {
  const [t, setT] = useState(now)
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    const tick = (): void => {
      const d = now()
      setT(d)
      timer = setTimeout(tick, 1000 - d.getMilliseconds() + 5)
    }
    timer = setTimeout(tick, 1000 - now().getMilliseconds() + 5)
    return () => clearTimeout(timer)
  }, [])
  return t
}
