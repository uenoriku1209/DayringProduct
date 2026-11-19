import { useState } from 'react'
import { Check, Flame, Moon, Pencil, Plus, Trash2 } from 'lucide-react'
import type { Habit, HabitRule } from '../../../shared/types'
import {
  HABIT_POINTS,
  INTERVALS,
  isDue,
  nextDueText,
  recentDays,
  ruleText,
  streak,
  WEEK_ORDER
} from '../lib/habits'
import { dateKey, shortDate, uid, WEEKDAYS } from '../lib/time'
import { Burst } from './GoalView'

interface Props {
  t: Date
  habits: Habit[]
  onChange: (habits: Habit[]) => void
}

function HabitForm({
  initial,
  today,
  onSave,
  onCancel
}: {
  initial?: Habit
  today: string
  onSave: (v: Pick<Habit, 'title' | 'rule' | 'start'>) => void
  onCancel: () => void
}): React.JSX.Element {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [kind, setKind] = useState<HabitRule['kind']>(initial?.rule.kind ?? 'weekdays')
  const [days, setDays] = useState<number[]>(
    initial?.rule.kind === 'weekdays' ? initial.rule.days : [1, 3, 5]
  )
  const [every, setEvery] = useState(initial?.rule.kind === 'interval' ? initial.rule.every : 2)
  const [start, setStart] = useState(initial?.start ?? today)

  const rule: HabitRule =
    kind === 'daily' ? { kind } : kind === 'weekdays' ? { kind, days } : { kind, every }
  const valid = title.trim() && start && (kind !== 'weekdays' || days.length > 0)

  return (
    <form
      className="goal-form pop-in"
      onSubmit={(e) => {
        e.preventDefault()
        if (valid) onSave({ title: title.trim(), rule, start })
      }}
    >
      <input
        className="input"
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="続けたいこと（例: 筋トレ / お菓子を食べない）"
        maxLength={60}
      />
      <div className="segmented three">
        <button
          type="button"
          className={kind === 'daily' ? 'active' : ''}
          onClick={() => setKind('daily')}
        >
          毎日
        </button>
        <button
          type="button"
          className={kind === 'weekdays' ? 'active' : ''}
          onClick={() => setKind('weekdays')}
        >
          曜日を指定
        </button>
        <button
          type="button"
          className={kind === 'interval' ? 'active' : ''}
          onClick={() => setKind('interval')}
        >
          間隔を指定
        </button>
      </div>
      {kind === 'weekdays' && (
        <div className="week-picker">
          {WEEK_ORDER.map((d) => (
            <button
              type="button"
              key={d}
              className={`wd w${d} ${days.includes(d) ? 'on' : ''}`}
              onClick={() =>
                setDays((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d]))
              }
            >
              {WEEKDAYS[d]}
            </button>
          ))}
        </div>
      )}
      {kind === 'interval' && (
        <div className="chips">
          {INTERVALS.map((i) => (
            <button
              type="button"
              key={i.every}
              className={`chip ${every === i.every ? 'active' : ''}`}
              onClick={() => setEvery(i.every)}
            >
              {i.label}
            </button>
          ))}
        </div>
      )}
      <div className="date-row">
        <span className="muted small nowrap">始める日</span>
        <input
          type="date"
          className="input"
          value={start}
          onChange={(e) => setStart(e.target.value)}
        />
      </div>
      <div className="form-foot">
        <span className="muted small">
          {ruleText(rule)}・チェック 1 回で <b className="accent-text">+{HABIT_POINTS} 点</b>
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

export function HabitView({ t, habits, onChange }: Props): React.JSX.Element {
  const today = dateKey(t)
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const [popping, setPopping] = useState<string | null>(null)

  const toggle = (h: Habit, key: string): void => {
    const on = h.checks.includes(key)
    if (!on && key === today) {
      setPopping(h.id)
      setTimeout(() => setPopping((x) => (x === h.id ? null : x)), 1300)
    }
    onChange(
      habits.map((x) =>
        x.id === h.id
          ? { ...x, checks: on ? x.checks.filter((c) => c !== key) : [...x.checks, key].sort() }
          : x
      )
    )
  }
  const remove = (h: Habit): void => {
    if (confirm(`「${h.title}」を削除しますか？（これまでのチェックの点数も消えます）`))
      onChange(habits.filter((x) => x.id !== h.id))
  }

  // 今日やるもの (未チェック → チェック済み) → お休みの順
  const order = (h: Habit): number => (isDue(h, today) ? (h.checks.includes(today) ? 1 : 0) : 2)
  const list = [...habits].sort((a, b) => order(a) - order(b))
  const dueToday = habits.filter((h) => isDue(h, today))
  const doneToday = dueToday.filter((h) => h.checks.includes(today)).length

  return (
    <div className="habit-view">
      {habits.length > 0 && (
        <div className="today-strip">
          <span>今日の習慣</span>
          <div className="mini-bar wide">
            <span
              style={{ width: `${dueToday.length ? (doneToday / dueToday.length) * 100 : 0}%` }}
            />
          </div>
          <b>
            {doneToday} / {dueToday.length}
          </b>
        </div>
      )}

      {adding ? (
        <HabitForm
          today={today}
          onCancel={() => setAdding(false)}
          onSave={(v) => {
            onChange([
              ...habits,
              { id: uid(), checks: [], createdAt: new Date().toISOString(), ...v }
            ])
            setAdding(false)
          }}
        />
      ) : (
        <button className="add-btn" onClick={() => setAdding(true)}>
          <Plus size={15} /> 習慣を追加
        </button>
      )}

      <ul className="goal-list">
        {list.map((h) => {
          if (editing === h.id)
            return (
              <li key={h.id}>
                <HabitForm
                  initial={h}
                  today={today}
                  onCancel={() => setEditing(null)}
                  onSave={(v) => {
                    onChange(habits.map((x) => (x.id === h.id ? { ...x, ...v } : x)))
                    setEditing(null)
                  }}
                />
              </li>
            )
          const due = isDue(h, today)
          const done = h.checks.includes(today)
          const st = streak(h, today)
          return (
            <li
              key={h.id}
              className={`goal habit ${due ? '' : 'rest'} ${done ? 'done-today' : ''}`}
            >
              {due ? (
                <button
                  className={`check ${done ? 'on' : ''}`}
                  onClick={() => toggle(h, today)}
                  title={done ? 'チェックを外す' : '今日の分をチェック'}
                >
                  <Check size={14} strokeWidth={3} />
                  {popping === h.id && <Burst points={HABIT_POINTS} />}
                </button>
              ) : (
                <span className="check rest-icon" title="今日はお休みの日">
                  <Moon size={12} />
                </span>
              )}
              <div className="goal-main">
                <div className="goal-title">{h.title}</div>
                <div className="goal-meta">
                  <span className="badge">{ruleText(h.rule)}</span>
                  {st > 0 && (
                    <span className="streak" title="続けてチェックできている回数">
                      <Flame size={12} /> {st}回連続
                    </span>
                  )}
                  {!due && <span>今日はお休み・{nextDueText(h, today)}</span>}
                </div>
                <div className="habit-days">
                  {recentDays(h, today).map((d) => (
                    <button
                      key={d.key}
                      className={`hd ${d.due ? 'due' : ''} ${d.checked ? 'checked' : ''} ${
                        d.isToday ? 'today' : ''
                      } ${d.due && !d.checked && !d.isToday ? 'missed' : ''}`}
                      disabled={!d.due}
                      onClick={() => toggle(h, d.key)}
                      title={`${shortDate(d.key)}${
                        d.due
                          ? d.checked
                            ? ' ✓ チェック済み（押すと外す）'
                            : ' 未チェック（押すとチェック）'
                          : ' お休み'
                      }`}
                    />
                  ))}
                </div>
              </div>
              <div className="goal-actions">
                <button className="icon-btn" title="編集" onClick={() => setEditing(h.id)}>
                  <Pencil size={13} />
                </button>
                <button className="icon-btn" title="削除" onClick={() => remove(h)}>
                  <Trash2 size={13} />
                </button>
              </div>
            </li>
          )
        })}
      </ul>

      {habits.length === 0 && !adding && (
        <div className="empty">
          「筋トレを続ける（月・水・金）」「お菓子を食べない（毎日）」のような、
          <br />
          期限のない習慣を登録できます。決めた日にチェックすると、
          <br />1 回ごとに {HABIT_POINTS} 点が月のスコアに加わります。
        </div>
      )}
    </div>
  )
}
