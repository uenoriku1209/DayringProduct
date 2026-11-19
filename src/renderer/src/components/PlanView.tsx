import { useEffect, useRef, useState } from 'react'
import { Plus, Trash2, X } from 'lucide-react'
import type { Plan } from '../../../shared/types'
import { activePlan, nextPlan, overlaps, PLAN_COLORS, planLength, sortPlans } from '../lib/plans'
import { hm, humanDuration, parseHm, uid } from '../lib/time'
import { Donut } from './Donut'

interface Props {
  t: Date
  plans: Plan[]
  /** 終わった直後の予定 (真ん中に「おつかれさま」を出す) */
  finished: Plan | null
  /** 円グラフの中央にも水を溜める */
  water: boolean
  onChange: (plans: Plan[]) => void
}

interface Draft {
  id?: string
  title: string
  start: string
  end: string
  color: string
}

const pad = (n: number): string => String(n).padStart(2, '0')
/** 分 → <input type="time"> の値 (HH:MM) */
const toInput = (min: number): string => `${pad(Math.floor(min / 60) % 24)}:${pad(min % 60)}`

export function PlanView({ t, plans, finished, water, onChange }: Props): React.JSX.Element {
  const [draft, setDraft] = useState<Draft | null>(null)
  const [error, setError] = useState('')
  const editorRef = useRef<HTMLFormElement>(null)
  const editingKey = draft ? (draft.id ?? `${draft.start}-${draft.end}`) : null

  // 編集欄を開いたら、見える位置までスクロールする
  useEffect(() => {
    if (editingKey) editorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [editingKey])
  const active = activePlan(plans, t)
  const next = nextPlan(plans, t)

  /** まだ使っていない色 */
  const freeColor = (): string =>
    PLAN_COLORS.find((c) => !plans.some((p) => p.color === c)) ??
    PLAN_COLORS[plans.length % PLAN_COLORS.length]

  const openNew = (start: number, end: number): void => {
    setError('')
    setDraft({ title: '', start: toInput(start), end: toInput(end), color: freeColor() })
  }
  const openEdit = (p: Plan): void => {
    setError('')
    setDraft({
      id: p.id,
      title: p.title,
      start: toInput(p.start),
      end: toInput(p.end),
      color: p.color
    })
  }

  const save = (): void => {
    if (!draft) return
    const start = parseHm(draft.start)
    const end = parseHm(draft.end)
    if (!draft.title.trim()) return setError('予定の内容を入力してください')
    if (start === null || end === null) return setError('時刻を入力してください')
    if (start === end) return setError('開始と終了を別の時刻にしてください')
    const clash = overlaps(plans, { start, end }, draft.id)
    if (clash)
      return setError(`「${clash.title}」（${hm(clash.start)}–${hm(clash.end)}）と重なっています`)
    const plan: Plan = {
      id: draft.id ?? uid(),
      title: draft.title.trim(),
      start,
      end,
      color: draft.color
    }
    onChange(draft.id ? plans.map((p) => (p.id === draft.id ? plan : p)) : [...plans, plan])
    setDraft(null)
  }

  const remove = (id: string): void => {
    onChange(plans.filter((p) => p.id !== id))
    setDraft(null)
  }

  const startMin = draft ? parseHm(draft.start) : null
  const endMin = draft ? parseHm(draft.end) : null

  return (
    <div className="plan-view">
      <Donut
        t={t}
        plans={plans}
        active={active}
        next={next}
        finished={finished}
        water={water}
        selectedId={draft?.id ?? null}
        onSelect={openEdit}
        onCreate={openNew}
      />

      {draft ? (
        <form
          ref={editorRef}
          className="plan-editor pop-in"
          style={{ '--c': draft.color } as React.CSSProperties}
          onSubmit={(e) => {
            e.preventDefault()
            save()
          }}
        >
          <div className="editor-head">
            <span className="dot big" />
            <input
              className="input"
              autoFocus
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              placeholder="予定の内容（例: 集中して作業）"
              maxLength={40}
            />
            <button
              type="button"
              className="icon-btn"
              onClick={() => setDraft(null)}
              title="閉じる"
            >
              <X size={15} />
            </button>
          </div>
          <div className="time-row">
            <input
              type="time"
              className="input"
              step={300}
              value={draft.start}
              onChange={(e) => setDraft({ ...draft, start: e.target.value })}
            />
            <span className="muted">→</span>
            <input
              type="time"
              className="input"
              step={300}
              value={draft.end}
              onChange={(e) => setDraft({ ...draft, end: e.target.value })}
            />
            <span className="muted small dur">
              {startMin !== null && endMin !== null && startMin !== endMin
                ? humanDuration(planLength({ start: startMin, end: endMin }) * 60)
                : ''}
            </span>
          </div>
          <div className="swatches">
            {PLAN_COLORS.map((c) => (
              <button
                type="button"
                key={c}
                className={`swatch ${draft.color === c ? 'on' : ''}`}
                style={{ background: c }}
                onClick={() => setDraft({ ...draft, color: c })}
                title={c}
              />
            ))}
          </div>
          {error && <div className="form-error">{error}</div>}
          <div className="form-foot">
            {draft.id ? (
              <button type="button" className="btn ghost danger" onClick={() => remove(draft.id!)}>
                <Trash2 size={13} /> 削除
              </button>
            ) : (
              <span className="muted small">毎日この時間に表示されます</span>
            )}
            <button type="submit" className="btn primary">
              {draft.id ? '保存' : '追加'}
            </button>
          </div>
        </form>
      ) : (
        <button
          className="add-btn"
          onClick={() => {
            const h = (t.getHours() + 1) % 24
            openNew(h * 60, ((h + 1) % 24) * 60)
          }}
        >
          <Plus size={15} /> 予定を追加
          <span className="muted small">（リングのドラッグでも作れます）</span>
        </button>
      )}

      {plans.length > 0 && (
        <ul className="plan-list">
          {sortPlans(plans).map((p) => {
            const isActive = active?.plan.id === p.id
            return (
              <li key={p.id}>
                <button
                  className={`plan-row ${isActive ? 'active' : ''} ${draft?.id === p.id ? 'selected' : ''}`}
                  style={{ '--c': p.color } as React.CSSProperties}
                  onClick={() => openEdit(p)}
                >
                  <span className="bar" />
                  <span className="plan-time">
                    {hm(p.start)}–{hm(p.end)}
                  </span>
                  <span className="plan-title">{p.title}</span>
                  {isActive ? (
                    <span className="live">進行中</span>
                  ) : (
                    <span className="muted small">{humanDuration(planLength(p) * 60)}</span>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
