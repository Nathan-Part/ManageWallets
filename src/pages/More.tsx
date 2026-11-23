import { useLiveQuery } from 'dexie-react-hooks'
import { useRef, useState } from 'react'
import { IMPORT_LIMITS, db, exportBackup, importBackup, newId, type Category, type Recurring, type TxType } from '../db'
import { Sheet } from '../components/Sheet'
import { useCategories } from '../hooks'
import { todayISO } from '../lib/dates'
import { CURRENCIES, formatMoney, getCurrency, setCurrency } from '../lib/money'

export function More({ onEditRule }: { onEditRule: (rule?: Recurring) => void }) {
  const rules = useLiveQuery(() => db.recurring.toArray(), []) ?? []
  const cats = useCategories()
  const [catEdit, setCatEdit] = useState<{ item?: Category; type: TxType } | null>(null)
  const [message, setMessage] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  async function doExport() {
    const blob = new Blob([JSON.stringify(await exportBackup(), null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `managewallets-${todayISO()}.json`
    a.click()
    // Révoquer tout de suite peut annuler le téléchargement sur certains navigateurs.
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  }

  async function doImport(file: File) {
    if (file.size > IMPORT_LIMITS.bytes) return setMessage('Fichier trop volumineux pour une sauvegarde ManageWallets')
    if (!confirm('Importer cette sauvegarde ? Toutes les données actuelles seront remplacées.')) return
    try {
      await importBackup(JSON.parse(await file.text()))
      setMessage('Sauvegarde importée ✓')
    } catch (e) {
      setMessage(e instanceof SyntaxError ? 'Fichier de sauvegarde invalide' : e instanceof Error ? e.message : 'Import impossible')
    }
  }

  const monthly = rules.filter((r) => r.active)
    .reduce((s, r) => s + (r.type === 'income' ? r.amount : -r.amount), 0)

  return (
    <>
      <h1 className="page-title">Plus</h1>

      <div className="section-head"><h2>Devise</h2></div>
      <div className="segmented">
        {CURRENCIES.map((c) => (
          <button key={c.code} className={getCurrency() === c.code ? 'active' : ''}
            aria-pressed={getCurrency() === c.code} onClick={() => setCurrency(c.code)}>
            {c.symbol} {c.label}
          </button>
        ))}
      </div>
      <p className="hint">Change uniquement le symbole affiché, sans conversion des montants.</p>

      <div className="section-head">
        <h2>Opérations récurrentes</h2>
        <button className="link" onClick={() => onEditRule()}>+ Ajouter</button>
      </div>
      {rules.length ? (
        <>
          <div className="card list">
            {rules.map((r) => {
              const c = cats.get(r.categoryId)
              return (
                <div className="row" key={r.id}>
                  <button className="row-btn" onClick={() => onEditRule(r)}>
                    <span className={`row-icon ${r.type}`} aria-hidden>{c?.icon ?? '❔'}</span>
                    <span className="row-main">
                      <span className="row-title">{r.note || c?.name || 'Sans catégorie'}</span>
                      <span className="row-sub">{r.active ? 'Mensuel' : 'En pause'} · le {r.day}</span>
                    </span>
                    <span className={`amount ${r.type}`}>{r.type === 'income' ? '+' : '−'}{formatMoney(r.amount)}</span>
                  </button>
                  <label className="switch" title={r.active ? 'Mettre en pause' : 'Réactiver'}>
                    <input type="checkbox" checked={r.active} aria-label="Active"
                      onChange={(e) => {
                        // À la réactivation, on repart d'aujourd'hui : pas de rattrapage des mois en pause.
                        const patch = e.target.checked ? { active: true, lastDate: todayISO() } : { active: false }
                        void db.recurring.update(r.id, patch)
                      }} />
                    <span />
                  </label>
                </div>
              )
            })}
          </div>
          <p className="hint">Solde récurrent : {monthly < 0 ? '−' : '+'}{formatMoney(Math.abs(monthly))} / mois</p>
        </>
      ) : (
        <p className="hint">Salaire, loyer, abonnements… ajoutés automatiquement chaque mois.</p>
      )}

      {(['expense', 'income'] as const).map((type) => (
        <section key={type}>
          <div className="section-head">
            <h2>Catégories de {type === 'expense' ? 'dépenses' : 'revenus'}</h2>
            <button className="link" onClick={() => setCatEdit({ type })}>+ Ajouter</button>
          </div>
          <div className="chips">
            {[...cats.values()].filter((c) => c.type === type).map((c) => (
              <button key={c.id} className="chip" onClick={() => setCatEdit({ item: c, type })}>
                <span aria-hidden>{c.icon}</span> {c.name}
              </button>
            ))}
          </div>
        </section>
      ))}

      <div className="section-head"><h2>Sauvegarde</h2></div>
      <div className="card pad">
        <p className="hint no-margin">
          Tes données restent uniquement sur cet appareil. Exporte régulièrement une sauvegarde pour ne rien perdre
          (changement de téléphone, nettoyage du navigateur…).
        </p>
        <div className="actions">
          <button className="btn" onClick={() => void doExport()}>Exporter</button>
          <button className="btn" onClick={() => fileRef.current?.click()}>Importer</button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden
            onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void doImport(f) }} />
        </div>
        {message && <p className="hint no-margin" role="status">{message}</p>}
      </div>

      {catEdit && <CategorySheet {...catEdit} onClose={() => setCatEdit(null)} />}
    </>
  )
}

function CategorySheet({ item, type, onClose }: { item?: Category; type: TxType; onClose: () => void }) {
  const [name, setName] = useState(item?.name ?? '')
  const [icon, setIcon] = useState(item?.icon ?? '🏷️')
  const [error, setError] = useState('')

  async function save() {
    const n = name.trim()
    if (!n) return setError('Donne un nom à la catégorie')
    const i = icon.trim() || '🏷️'
    if (item) await db.categories.update(item.id, { name: n, icon: i })
    else await db.categories.add({ id: newId(), name: n, icon: i, type })
    onClose()
  }

  async function remove() {
    if (!item) return
    const used = (await db.transactions.where('categoryId').equals(item.id).count())
      + (await db.recurring.filter((r) => r.categoryId === item.id).count())
    if (used) return setError(`Impossible : catégorie utilisée par ${used} opération(s). Change-les d'abord de catégorie.`)
    if ((await db.categories.where('type').equals(type).count()) <= 1) return setError('Garde au moins une catégorie.')
    await db.categories.delete(item.id)
    onClose()
  }

  return (
    <Sheet title={item ? 'Modifier la catégorie' : 'Nouvelle catégorie'} onClose={onClose}>
      <form className="form" onSubmit={(e) => { e.preventDefault(); void save() }}>
        <div className="field-row">
          <label className="field icon-field">
            <span>Icône</span>
            <input value={icon} maxLength={4} onChange={(e) => setIcon(e.target.value)} />
          </label>
          <label className="field grow">
            <span>Nom</span>
            <input value={name} maxLength={30} autoFocus={!item} onChange={(e) => { setName(e.target.value); setError('') }} />
          </label>
        </div>
        {error && <p className="error" role="alert">{error}</p>}
        <div className="actions">
          {item && <button type="button" className="btn danger" onClick={() => void remove()}>Supprimer</button>}
          <button type="submit" className="btn primary">Enregistrer</button>
        </div>
      </form>
    </Sheet>
  )
}
