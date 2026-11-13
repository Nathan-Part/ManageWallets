import { useEffect, useState } from 'react'
import type { Category, Transaction } from '../db'
import { monthLabel, monthShort } from '../lib/dates'
import { formatMoney } from '../lib/money'

/** Répartition par catégorie : barres horizontales triées, une seule teinte (magnitude). */
export function CategoryBars({ txs, cats }: { txs: Transaction[]; cats: Map<string, Category> }) {
  const sums = new Map<string, number>()
  for (const t of txs) sums.set(t.categoryId, (sums.get(t.categoryId) ?? 0) + t.amount)
  const rows = [...sums].sort((a, b) => b[1] - a[1])
  const total = rows.reduce((s, [, v]) => s + v, 0)
  const max = rows[0]?.[1] ?? 0
  if (!rows.length) return <p className="empty">Rien à afficher pour ce mois.</p>
  return (
    <ul className="cat-bars">
      {rows.map(([id, value]) => {
        const c = cats.get(id)
        return (
          <li key={id}>
            <div className="cat-bars-head">
              <span><span aria-hidden>{c?.icon ?? '❔'}</span> {c?.name ?? 'Sans catégorie'}</span>
              <span className="cat-bars-value">
                {formatMoney(value)} <small>{Math.round((value / total) * 100)} %</small>
              </span>
            </div>
            <div className="bar-track"><div className="bar-fill" style={{ width: `${(value / max) * 100}%` }} /></div>
          </li>
        )
      })}
    </ul>
  )
}

export interface MonthPoint { month: string; income: number; expense: number }

const W = 320, H = 150, PAD_B = 22, PAD_T = 6, BAR = 14, GAP = 2

function bar(x: number, h: number): string {
  const base = H - PAD_B
  const r = Math.min(4, h)
  const y = base - h
  return `M${x},${base}V${y + r}Q${x},${y} ${x + r},${y}H${x + BAR - r}Q${x + BAR},${y} ${x + BAR},${y + r}V${base}Z`
}

/** Revenus vs dépenses sur plusieurs mois. Toucher un mois affiche ses valeurs. */
export function MonthlyBars({ data, selected }: { data: MonthPoint[]; selected: string }) {
  const [active, setActive] = useState(selected)
  useEffect(() => setActive(selected), [selected])
  const max = Math.max(1, ...data.flatMap((d) => [d.income, d.expense]))
  const scale = (v: number) => (v <= 0 ? 0 : Math.max(2, (v / max) * (H - PAD_B - PAD_T)))
  const slot = W / data.length
  const cur = data.find((d) => d.month === active) ?? data[data.length - 1]
  return (
    <div className="monthly">
      <div className="legend" aria-live="polite">
        <span className="legend-month">{monthLabel(cur.month)}</span>
        <span><i className="swatch income" /> Revenus <b>{formatMoney(cur.income)}</b></span>
        <span><i className="swatch expense" /> Dépenses <b>{formatMoney(cur.expense)}</b></span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Revenus et dépenses par mois">
        <line x1="0" x2={W} y1={H - PAD_B} y2={H - PAD_B} className="axis" />
        {data.map((d, i) => {
          const x = i * slot + (slot - (BAR * 2 + GAP)) / 2
          const on = d.month === cur.month
          return (
            <g key={d.month} className={`month-group ${on ? 'on' : ''}`} onClick={() => setActive(d.month)}
              onPointerEnter={(e) => e.pointerType === 'mouse' && setActive(d.month)}>
              <rect x={i * slot} y="0" width={slot} height={H} className="hit" />
              <path d={bar(x, scale(d.income))} className="series-income" />
              <path d={bar(x + BAR + GAP, scale(d.expense))} className="series-expense" />
              <text x={i * slot + slot / 2} y={H - 6} textAnchor="middle" className="tick">{monthShort(d.month)}</text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
