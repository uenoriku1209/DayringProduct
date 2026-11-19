import { useMemo, useState } from 'react'
import { Check, CalendarPlus, Pencil, Plus, Trash2, Undo2 } from 'lucide-react'
import type { Goal, Habit } from '../../../shared/types'
import { HabitView } from './HabitView'
import { goalPoints, monthlyScores, rankOf } from '../lib/score'
import { addDays, dateKey, diffDays, monthKey, parseDate, shortDate, uid } from '../lib/time'

interface Props {
  t: Date
  goals: Goal[]
  habits: Habit[]
  onChange: (goals: Goal[]) => void
  onHabits: (habits: Habit[]) => void
}

const PRESETS: { label: string; days: number }[] = [
  { label: '今日', days: 1 },
  { label: '3日', days: 3 },
  { label: '1週間', days: 7 },
  { label: '2週間', days: 14 },
  { label: '1か月', days: 30 }
]

/** 達成したときの「+15」と光の粒 */
export function Burst({ points }: { points: number }): React.JSX.Element {
  return (
    <span className="burst" aria-hidden>
      {Array.from({ length: 10 }, (_, i) => (
        <i key={i} style={{ '--a': `${i * 36}deg` } as React.CSSProperties} />
      ))}
      <b>+{points}</b>
    </span>
  )
}

function GoalForm({
  initial,
  today,
  onSave,
  onCancel
}: {
  initial?: Goal
  today: string
  onSave: (g: Pick<Goal, 'title' | 'start' | 'end'>) => void
  onCancel: () => void
}): React.JSX.Element {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [start, setStart] = useState(initial?.start ?? today)
  const [end, setEnd] = useState(initial?.end ?? addDays(today, 6))
  const days = diffDays(start, end) + 1
  const valid = title.trim() && start && end && days >= 1

  return (
    <form
      className="goal-form pop-in"
      onSubmit={(e) => {
        e.preventDefault()
        if (valid) onSave({ title: title.trim(), start, end })
      }}
    >
      <input
        className="input"
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="目標（例: 毎日 30 分英語を勉強する）"
        maxLength={80}
      />
      <div className="chips">
        {PRESETS.map((p) => (
          <button
            type="button"
            key={p.label}
            className={`chip ${days === p.days && start === today ? 'active' : ''}`}
            onClick={() => {
              setStart(today)
              setEnd(addDays(today, p.days - 1))
            }}
          >
            {p.label}
          </button>
        ))}
      </div>
      <div className="date-row">
        <input
          type="date"
          className="input"
          value={start}
          onChange={(e) => setStart(e.target.value)}
        />
        <span className="muted">〜</span>
        <input
          type="date"
          className="input"
          value={end}
          min={start}
          onChange={(e) => setEnd(e.target.value)}
        />
      </div>
      <div className="form-foot">
        <span className="muted small">
          {days >= 1 ? (
            <>
              {days} 日間・達成で <b className="accent-text">+{goalPoints({ start, end })} 点</b>
            </>
          ) : (
            '終わりの日を開始日以降にしてください'
          )}
        </span>
        <div className="row gap">
          <button type="button" className="btn ghost" onClick={onCancel}>
            キャンセル
          </button>
          <button type="submit" className="btn primary" disabled={!valid}>
            {initial ? '保存' : '追加'}
          </button>
        </div>
      </div>
    </form>
  )
}

export function GoalView({ t, goals, habits, onChange, onHabits }: Props): React.JSX.Element {
  const today = dateKey(t)
  const thisMonth = monthKey(t)
  const [mode, setMode] = useState<'goal' | 'habit'>(() =>
    localStorage.getItem('dayring.goalMode') === 'habit' ? 'habit' : 'goal'
  )
  const switchMode = (m: 'goal' | 'habit'): void => {
    setMode(m)
    localStorage.setItem('dayring.goalMode', m)
  }
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  /** 達成アニメーション中 (少し待ってから「達成済み」へ移す) */
  const [celebrating, setCelebrating] = useState<Set<string>>(new Set())

  const score = monthlyScores(goals, habits).get(thisMonth)?.score ?? 0
  const { rank, next } = rankOf(score)

  const groups = useMemo(() => {
    const active: Goal[] = []
    const upcoming: Goal[] = []
    const expired: Goal[] = []
    const done: Goal[] = []
    for (const g of goals) {
      if (g.achievedAt && !celebrating.has(g.id)) {
        if (monthKey(parseDate(g.achievedAt)) === thisMonth) done.push(g)
      } else if (g.start > today) upcoming.push(g)
      else if (g.end < today && !g.achievedAt) expired.push(g)
      else active.push(g)
    }
    active.sort((a, b) => a.end.localeCompare(b.end))
    upcoming.sort((a, b) => a.start.localeCompare(b.start))
    done.sort((a, b) => (b.achievedAt ?? '').localeCompare(a.achievedAt ?? ''))
    return { active, upcoming, expired, done }
  }, [goals, today, thisMonth, celebrating])

  const achieve = (g: Goal): void => {
    setCelebrating((s) => new Set(s).add(g.id))
    onChange(goals.map((x) => (x.id === g.id ? { ...x, achievedAt: today } : x)))
    setTimeout(
      () =>
        setCelebrating((s) => {
          const n = new Set(s)
          n.delete(g.id)
          return n
        }),
      1400
    )
  }
  const undo = (g: Goal): void =>
    onChange(goals.map((x) => (x.id === g.id ? { ...x, achievedAt: undefined } : x)))
  const remove = (g: Goal): void => {
    if (confirm(`「${g.title}」を削除しますか？`)) onChange(goals.filter((x) => x.id !== g.id))
  }

  const row = (g: Goal, kind: 'active' | 'upcoming' | 'expired' | 'done'): React.JSX.Element => {
    if (editing === g.id)
      return (
        <li key={g.id}>
          <GoalForm
            initial={g}
            today={today}
            onCancel={() => setEditing(null)}
            onSave={(v) => {
              onChange(goals.map((x) => (x.id === g.id ? { ...x, ...v } : x)))
              setEditing(null)
            }}
          />
        </li>
      )
    const left = diffDays(today, g.end)
    const isCelebrating = celebrating.has(g.id)
    const pts = goalPoints(g)
    return (
      <li key={g.id} className={`goal ${kind} ${isCelebrating ? 'celebrate' : ''}`}>
        {kind === 'active' && (
          <button
            className={`check ${g.achievedAt ? 'on' : ''}`}
            onClick={() => (g.achievedAt ? undo(g) : achieve(g))}
            title="達成したらチェック"
          >
            <Check size={14} strokeWidth={3} />
            {isCelebrating && <Burst points={pts} />}
          </button>
        )}
        {kind === 'done' && (
          <span className="check on static">
            <Check size={14} strokeWidth={3} />
          </span>
        )}
        {(kind === 'upcoming' || kind === 'expired') && <span className={`check ghost ${kind}`} />}
        <div className="goal-main">
          <div className="goal-title">{g.title}</div>
          <div className="goal-meta">
            {shortDate(g.start)} 〜 {shortDate(g.end)}
            {kind === 'active' && !isCelebrating && (
              <span className={`badge ${left === 0 ? 'warn' : ''}`}>
                {left === 0 ? '今日まで' : `残り ${left + 1} 日`}
              </span>
            )}
            {kind === 'upcoming' && (
              <span className="badge">{diffDays(today, g.start)} 日後から</span>
            )}
            {kind === 'expired' && <span className="badge danger">期限切れ</span>}
            {kind === 'done' && (
              <span className="badge ok">
                +{pts} 点・{shortDate(g.achievedAt!)}
              </span>
            )}
            {kind !== 'done' && kind !== 'expired' && <span className="pts">{pts} 点</span>}
          </div>
        </div>
        <div className="goal-actions">
          {kind === 'expired' && (
            <button
              className="icon-btn"
              title="期間を今日から 1 週間延ばす"
              onClick={() =>
                onChange(goals.map((x) => (x.id === g.id ? { ...x, end: addDays(today, 6) } : x)))
              }
            >
              <CalendarPlus size={14} />
            </button>
          )}
          {kind === 'done' ? (
            <button className="icon-btn" title="達成を取り消す" onClick={() => undo(g)}>
              <Undo2 size={14} />
            </button>
          ) : (
            <button className="icon-btn" title="編集" onClick={() => setEditing(g.id)}>
              <Pencil size={13} />
            </button>
          )}
          <button className="icon-btn" title="削除" onClick={() => remove(g)}>
            <Trash2 size={13} />
          </button>
        </div>
      </li>
    )
  }

  const section = (title: string, list: Goal[], kind: Parameters<typeof row>[1]): React.ReactNode =>
    list.length > 0 && (
      <div className="goal-section">
        <h3>
          {title} <span className="count">{list.length}</span>
        </h3>
        <ul className="goal-list">{list.map((g) => row(g, kind))}</ul>
      </div>
    )

  return (
    <div className="goal-view">
      <div className="score-strip" style={{ '--rc': rank.color } as React.CSSProperties}>
        <div>
          <div className="muted small">{t.getMonth() + 1}月のスコア</div>
          <div className="score-num">
            {score}
            <small>点</small>
          </div>
        </div>
        <div className="score-right">
          <span className="rank-chip">{rank.name}</span>
          {next && (
            <div className="next-rank">
              <div className="mini-bar">
                <span
                  style={{
                    width: `${Math.min(100, ((score - rank.min) / (next.min - rank.min)) * 100)}%`
                  }}
                />
              </div>
              <span className="muted small">
                {next.name}まであと {next.min - score} 点
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="segmented">
        <button className={mode === 'goal' ? 'active' : ''} onClick={() => switchMode('goal')}>
          期間つきの目標
        </button>
        <button className={mode === 'habit' ? 'active' : ''} onClick={() => switchMode('habit')}>
          習慣（無期限）
        </button>
      </div>

      {mode === 'habit' ? (
        <HabitView t={t} habits={habits} onChange={onHabits} />
      ) : (
        <>
          {adding ? (
            <GoalForm
              today={today}
              onCancel={() => setAdding(false)}
              onSave={(v) => {
                onChange([...goals, { id: uid(), createdAt: new Date().toISOString(), ...v }])
                setAdding(false)
              }}
            />
          ) : (
            <button className="add-btn" onClick={() => setAdding(true)}>
              <Plus size={15} /> 目標を追加
            </button>
          )}

          {section('進行中', groups.active, 'active')}
          {section('これから', groups.upcoming, 'upcoming')}
          {section('期限切れ（未達成）', groups.expired, 'expired')}
          {section(`${t.getMonth() + 1}月に達成`, groups.done, 'done')}

          {goals.length === 0 && !adding && (
            <div className="empty">
              期間を決めて目標を立てると、達成するたびにスコアが貯まります。
              <br />
              スコアは毎月 1 日に 0 からスタートし、月ごとの記録は「成長」で見られます。
            </div>
          )}
        </>
      )}
    </div>
  )
}
