import Dexie, { type Table } from 'dexie'
import { todayISO } from './lib/dates'
import { getCurrency, setCurrency, type Currency } from './lib/money'
import { dueDates } from './lib/recurring'

export type TxType = 'expense' | 'income'

export interface Category {
  id: string
  name: string
  icon: string
  type: TxType
}

export interface Transaction {
  id: string
  type: TxType
  /** Montant en centimes, toujours positif. */
  amount: number
  categoryId: string
  date: string
  note: string
  recurringId?: string
}

export interface Recurring {
  id: string
  type: TxType
  amount: number
  categoryId: string
  note: string
  day: number
  startDate: string
  lastDate?: string
  active: boolean
}

class WalletDB extends Dexie {
  transactions!: Table<Transaction, string>
  categories!: Table<Category, string>
  recurring!: Table<Recurring, string>

  constructor() {
    super('managewallets')
    this.version(1).stores({
      transactions: 'id, date, categoryId, recurringId',
      categories: 'id, type',
      recurring: 'id',
    })
    this.on('populate', (tx) => {
      tx.table('categories').bulkAdd(DEFAULT_CATEGORIES)
    })
  }
}

const cat = (id: string, name: string, icon: string, type: TxType): Category => ({ id, name, icon, type })

export const DEFAULT_CATEGORIES: Category[] = [
  cat('c-courses', 'Courses', '🛒', 'expense'),
  cat('c-logement', 'Logement', '🏠', 'expense'),
  cat('c-transport', 'Transport', '🚗', 'expense'),
  cat('c-restos', 'Restos & sorties', '🍽️', 'expense'),
  cat('c-abos', 'Abonnements', '📱', 'expense'),
  cat('c-sante', 'Santé', '💊', 'expense'),
  cat('c-shopping', 'Shopping', '🛍️', 'expense'),
  cat('c-loisirs', 'Loisirs', '🎮', 'expense'),
  cat('c-autre-d', 'Autre', '📦', 'expense'),
  cat('c-salaire', 'Salaire', '💼', 'income'),
  cat('c-freelance', 'Freelance', '💻', 'income'),
  cat('c-remb', 'Remboursement', '↩️', 'income'),
  cat('c-autre-r', 'Autre', '💰', 'income'),
]

export const db = new WalletDB()
export const newId = () => crypto.randomUUID()

/** Crée les opérations dues pour chaque règle récurrente. Idempotent (suivi via lastDate). */
export async function generateRecurring(today = todayISO()): Promise<void> {
  await db.transaction('rw', db.recurring, db.transactions, async () => {
    for (const rule of await db.recurring.toArray()) {
      const dates = dueDates(rule, today)
      if (!dates.length) continue
      await db.transactions.bulkAdd(
        dates.map((date) => ({
          id: newId(),
          type: rule.type,
          amount: rule.amount,
          categoryId: rule.categoryId,
          note: rule.note,
          date,
          recurringId: rule.id,
        })),
      )
      await db.recurring.update(rule.id, { lastDate: dates[dates.length - 1] })
    }
  })
}

export interface Backup {
  app: 'managewallets'
  version: 1
  exportedAt: string
  currency?: Currency
  transactions: Transaction[]
  categories: Category[]
  recurring: Recurring[]
}

export async function exportBackup(): Promise<Backup> {
  const [transactions, categories, recurring] = await Promise.all([
    db.transactions.toArray(),
    db.categories.toArray(),
    db.recurring.toArray(),
  ])
  return { app: 'managewallets', version: 1, exportedAt: new Date().toISOString(), currency: getCurrency(), transactions, categories, recurring }
}

// Limites d'une sauvegarde : un fichier piégé ne doit pas pouvoir bloquer l'app ni saturer le stockage.
export const IMPORT_LIMITS = { bytes: 10 * 1024 * 1024, transactions: 100_000, categories: 200, recurring: 200 }
/** Plus gros montant accepté : 1 milliard, en centimes. */
const MAX_CENTS = 100_000_000_000

type Rec = Record<string, unknown>
const isObj = (v: unknown): v is Rec => typeof v === 'object' && v !== null && !Array.isArray(v)
const isType = (v: unknown): v is TxType => v === 'expense' || v === 'income'
const isId = (v: unknown): v is string => typeof v === 'string' && /^[A-Za-z0-9-]{1,64}$/.test(v)
const isCents = (v: unknown): v is number => Number.isSafeInteger(v) && (v as number) > 0 && (v as number) <= MAX_CENTS
const str = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : '')

/** Date 'YYYY-MM-DD' réelle, entre 2000 et 2100 (borne aussi la génération des récurrences). */
export function isValidDate(v: unknown): v is string {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false
  const [y, m, d] = v.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  return y >= 2000 && y <= 2100 && dt.getMonth() === m - 1 && dt.getDate() === d
}

/** Garde un seul enregistrement par identifiant (sinon l'ajout groupé échouerait). */
function unique<T extends { id: string }>(list: T[], max: number): T[] {
  const seen = new Map<string, T>()
  for (const item of list) if (!seen.has(item.id)) seen.set(item.id, item)
  return [...seen.values()].slice(0, max)
}

/** Vérifie et nettoie une sauvegarde champ par champ. Les enregistrements invalides sont ignorés. */
export function sanitizeBackup(data: unknown): Pick<Backup, 'currency' | 'transactions' | 'categories' | 'recurring'> {
  if (!isObj(data) || data.app !== 'managewallets' || !Array.isArray(data.transactions)
    || !Array.isArray(data.categories) || !Array.isArray(data.recurring)) {
    throw new Error('Fichier de sauvegarde invalide')
  }
  const categories = unique(
    data.categories.filter(isObj).flatMap((c): Category[] => {
      const name = str(c.name, 30).trim()
      if (!isId(c.id) || !isType(c.type) || !name) return []
      return [{ id: c.id, name, icon: str(c.icon, 8).trim() || '🏷️', type: c.type }]
    }),
    IMPORT_LIMITS.categories,
  )
  // Chaque type garde au moins une catégorie, sinon plus rien ne pourrait être saisi.
  for (const type of ['expense', 'income'] as const) {
    if (!categories.some((c) => c.type === type)) categories.push(...DEFAULT_CATEGORIES.filter((c) => c.type === type && !categories.some((x) => x.id === c.id)))
  }
  const recurring = unique(
    data.recurring.filter(isObj).flatMap((r): Recurring[] => {
      if (!isId(r.id) || !isType(r.type) || !isCents(r.amount) || !isId(r.categoryId) || !isValidDate(r.startDate)) return []
      const day = Number(r.day)
      if (!Number.isInteger(day) || day < 1 || day > 31) return []
      return [{
        id: r.id, type: r.type, amount: r.amount, categoryId: r.categoryId, note: str(r.note, 80), day,
        startDate: r.startDate, ...(isValidDate(r.lastDate) ? { lastDate: r.lastDate } : {}), active: r.active === true,
      }]
    }),
    IMPORT_LIMITS.recurring,
  )
  const transactions = unique(
    data.transactions.filter(isObj).flatMap((t): Transaction[] => {
      if (!isId(t.id) || !isType(t.type) || !isCents(t.amount) || !isId(t.categoryId) || !isValidDate(t.date)) return []
      return [{
        id: t.id, type: t.type, amount: t.amount, categoryId: t.categoryId, note: str(t.note, 80), date: t.date,
        ...(isId(t.recurringId) ? { recurringId: t.recurringId } : {}),
      }]
    }),
    IMPORT_LIMITS.transactions,
  )
  return { currency: data.currency as Currency | undefined, transactions, categories, recurring }
}

/** Remplace toutes les données par celles de la sauvegarde (vérifiée au préalable). */
export async function importBackup(data: unknown): Promise<void> {
  const b = sanitizeBackup(data)
  await db.transaction('rw', db.transactions, db.categories, db.recurring, async () => {
    await Promise.all([db.transactions.clear(), db.categories.clear(), db.recurring.clear()])
    await db.categories.bulkAdd(b.categories)
    await db.transactions.bulkAdd(b.transactions)
    await db.recurring.bulkAdd(b.recurring)
  })
  setCurrency(b.currency)
}
