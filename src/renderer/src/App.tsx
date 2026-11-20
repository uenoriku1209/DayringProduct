import { useCallback, useEffect, useRef, useState } from 'react'
import { CalendarClock, Target, TrendingUp } from 'lucide-react'
import type { AppData, Settings } from '../../shared/types'
import { useNow } from './lib/useNow'
import { activePlan, nextPlan } from './lib/plans'
import { usePlanEvents } from './lib/usePlanEvents'
import { Header } from './components/Header'
import { ClockCard } from './components/ClockCard'
import { PlanView } from './components/PlanView'
import { GoalView } from './components/GoalView'
import { GrowthView } from './components/GrowthView'
import { SettingsPanel } from './components/SettingsPanel'
import { ResizeGrip } from './components/ResizeGrip'
import { PlanEvents } from './components/PlanEvents'
import { Water } from './components/Water'
import { CompactView } from './components/CompactView'

type Tab = 'plan' | 'goal' | 'growth'

const TABS: { id: Tab; label: string; icon: typeof Target }[] = [
  { id: 'plan', label: '予定', icon: CalendarClock },
  { id: 'goal', label: '目標', icon: Target },
  { id: 'growth', label: '成長', icon: TrendingUp }
]

export default function App(): React.JSX.Element {
  const [data, setData] = useState<AppData | null>(null)
  const [tab, setTab] = useState<Tab>(() => {
    const t = localStorage.getItem('dayring.tab')
    return t === 'goal' || t === 'growth' ? t : 'plan'
  })
  const [settingsOpen, setSettingsOpen] = useState(false)
  const t = useNow()
  const { events, dismiss, lastEnd } = usePlanEvents(
    data?.plans ?? [],
    t,
    data?.settings.notify ?? false
  )

  useEffect(() => {
    window.api.loadData().then(setData)
    return window.api.onSettingsChanged((s) =>
      setData((d) => (d ? { ...d, settings: { ...d.settings, ...s } } : d))
    )
  }, [])

  // 変更は少し待ってからまとめて保存する
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const update = useCallback((fn: (d: AppData) => AppData) => {
    setData((d) => {
      if (!d) return d
      const next = fn(d)
      clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => window.api.saveData(next), 300)
      return next
    })
  }, [])

  const setSettings = (patch: Partial<Settings>): void => {
    update((d) => ({ ...d, settings: { ...d.settings, ...patch } }))
    if (patch.alwaysOnTop !== undefined) window.api.setAlwaysOnTop(patch.alwaysOnTop)
    if (patch.autoLaunch !== undefined) window.api.setAutoLaunch(patch.autoLaunch)
    if (patch.compact !== undefined) window.api.setCompact(patch.compact)
  }

  useEffect(() => {
    localStorage.setItem('dayring.tab', tab)
  }, [tab])

  if (!data) return <div className="widget loading" />

  const s = data.settings
  const op = s.opacity
  const active = activePlan(data.plans, t)

  const water = s.water && (
    <Water
      className="day-water"
      level={(t.getHours() * 3600 + t.getMinutes() * 60 + t.getSeconds()) / 86400}
      bubbles={!s.compact}
    />
  )

  // 簡易表示: 日付・時刻・いまの予定だけ
  if (s.compact)
    return (
      <div
        className="widget compact-mode"
        data-theme={s.theme}
        style={{ '--op': op } as React.CSSProperties}
      >
        {water}
        <CompactView
          t={t}
          active={active}
          next={nextPlan(data.plans, t)}
          onExpand={() => setSettings({ compact: false })}
        />
        <PlanEvents events={events} t={t} onDone={dismiss} />
        <ResizeGrip />
      </div>
    )

  return (
    <div className="widget" data-theme={s.theme} style={{ '--op': op } as React.CSSProperties}>
      {/* 1 日の経過とともに、下から静かに水が溜まっていく */}
      {water}
      <Header
        pinned={s.alwaysOnTop}
        onPin={() => setSettings({ alwaysOnTop: !s.alwaysOnTop })}
        onCompact={() => {
          setSettingsOpen(false)
          setSettings({ compact: true })
        }}
        onSettings={() => setSettingsOpen(true)}
      />
      <ClockCard t={t} active={active} onShowPlan={() => setTab('plan')} />

      <nav className="tabs">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>
            <Icon size={15} /> {label}
          </button>
        ))}
        <span
          className="tab-ink"
          style={{ '--i': TABS.findIndex((x) => x.id === tab) } as React.CSSProperties}
        />
      </nav>

      <main className="content" key={tab}>
        {tab === 'plan' && (
          <PlanView
            t={t}
            plans={data.plans}
            water={s.water}
            finished={lastEnd && t.getTime() - lastEnd.at < 7000 && !active ? lastEnd.plan : null}
            onChange={(plans) => update((d) => ({ ...d, plans }))}
          />
        )}
        {tab === 'goal' && (
          <GoalView
            t={t}
            goals={data.goals}
            habits={data.habits}
            onChange={(goals) => update((d) => ({ ...d, goals }))}
            onHabits={(habits) => update((d) => ({ ...d, habits }))}
          />
        )}
        {tab === 'growth' && <GrowthView t={t} goals={data.goals} habits={data.habits} />}
      </main>

      <PlanEvents events={events} t={t} onDone={dismiss} />

      {settingsOpen && (
        <SettingsPanel settings={s} onChange={setSettings} onClose={() => setSettingsOpen(false)} />
      )}
      <ResizeGrip />
    </div>
  )
}
