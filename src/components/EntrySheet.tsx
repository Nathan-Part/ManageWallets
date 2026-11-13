import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { db, generateRecurring, newId, type Recurring, type Transaction, type TxType } from '../db'
import { todayISO } from '../lib/dates'
import { centsToInput, parseAmount } from '../lib/money'
import { Sheet } from './Sheet'

export type EntryTarget =
  | { kind: 'tx'; item?: Transaction }
  | { kind: 'rule'; item?: Recurring }

/** Formulaire unique pour créer / modifier une opération ou une règle récurrente. */
export function EntrySheet({ target, onClose }: { target: EntryTarget; onClose: () => void }) {
  const { kind, item } = target
  const isRule = kind === 'rule'
  const [type, setType] = useState<TxType>(item?.type ?? 'expense')
  const [amount, setAmount] = useState(item ? centsToInput(item.amount) : '')
  const [categoryId, setCategoryId] = useState(item?.categoryId ?? '')
  const [date, setDate] = useState(item ? ('date' in item ? item.date : item.startDate) : todayISO())
  const [note, setNote] = useState(item?.note ?? '')
  const [repeat, setRepeat] = useState(false)
  const [error, setError] = useState('')

  const categories = useLiveQuery(() => db.categories.where('type').equals(type).toArray(), [type]) ?? []
  const selected = categories.find((c) => c.id === categoryId)?.id ?? categories[0]?.id

  async function save() {
    const cents = parseAmount(amount)
    if (!cents) return setError('Saisis un montant valide (ex. 12,50)')
    if (!selected) return setError('Choisis une catégorie')
    if (!date) return setError('Choisis une date')
    const base = { type, amount: cents, categoryId: selected, note: note.trim() }
    const day = Number(date.slice(8, 10))

    if (isRule) {
      if (item) await db.recurring.update(item.id, { ...base, day, startDate: date })
      else await db.recurring.add({ id: newId(), ...base, day, startDate: date, active: true })
      await generateRecurring()
    } else if (item) {
      await db.transactions.update(item.id, { ...base, date })
    } else {
      const recurringId = repeat ? newId() : undefined
      await db.transaction('rw', db.transactions, db.recurring, async () => {
        if (recurringId) {
          // lastDate = date : cette première opération est déjà créée ci-dessous.
          await db.recurring.add({ id: recurringId, ...base, day, startDate: date, lastDate: date, active: true })
        }
        await db.transactions.add({ id: newId(), ...base, date, recurringId })
      })
      if (recurringId) await generateRecurring()
    }
    onClose()
  }

  async function remove() {
    if (!item) return
    const msg = isRule
      ? 'Supprimer cette récurrence ? Les opérations déjà créées sont conservées.'
      : 'Supprimer cette opération ?'
    if (!confirm(msg)) return
    if (isRule) await db.recurring.delete(item.id)
    else await db.transactions.delete(item.id)
    onClose()
  }

  const title = isRule
    ? item ? 'Modifier la récurrence' : 'Nouvelle récurrence'
    : item ? "Modifier l'opération" : 'Nouvelle opération'

  return (
    <Sheet title={title} onClose={onClose}>
      <form className="form" onSubmit={(e) => { e.preventDefault(); void save() }}>
        <div className="segmented" role="tablist">
          {(['expense', 'income'] as const).map((t) => (
            <button key={t} type="button" role="tab" aria-selected={type === t}
              className={type === t ? 'active' : ''} onClick={() => setType(t)}>
              {t === 'expense' ? 'Dépense' : 'Revenu'}
            </button>
          ))}
        </div>

        <label className="amount-field">
          <span className="sr-only">Montant</span>
          <input inputMode="decimal" placeholder="0" autoFocus={!item} value={amount}
            onChange={(e) => { setAmount(e.target.value); setError('') }} />
          <span aria-hidden>€</span>
        </label>

        <div className="chips">
          {categories.map((c) => (
            <button key={c.id} type="button" className={`chip ${selected === c.id ? 'active' : ''}`}
              aria-pressed={selected === c.id} onClick={() => setCategoryId(c.id)}>
              <span aria-hidden>{c.icon}</span> {c.name}
            </button>
          ))}
        </div>

        <label className="field">
          <span>{isRule ? 'Première échéance (puis chaque mois ce jour-là)' : 'Date'}</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label className="field">
          <span>Note (facultatif)</span>
          <input type="text" maxLength={80} placeholder={isRule ? 'Ex. Loyer, Netflix…' : 'Ex. Boulangerie'}
            value={note} onChange={(e) => setNote(e.target.value)} />
        </label>

        {!isRule && !item && (
          <label className="check">
            <input type="checkbox" checked={repeat} onChange={(e) => setRepeat(e.target.checked)} />
            <span>Répéter chaque mois</span>
          </label>
        )}

        {error && <p className="error" role="alert">{error}</p>}
        <div className="actions">
          {item && <button type="button" className="btn danger" onClick={() => void remove()}>Supprimer</button>}
          <button type="submit" className="btn primary">Enregistrer</button>
        </div>
      </form>
    </Sheet>
  )
}
