import { useEffect, useState } from 'react'
import { generateRecurring } from './db'
import { EntrySheet, type EntryTarget } from './components/EntrySheet'
import { monthOf, todayISO } from './lib/dates'
import { Home } from './pages/Home'
import { More } from './pages/More'
import { Stats } from './pages/Stats'
import { Transactions } from './pages/Transactions'

type Tab = 'home' | 'list' | 'stats' | 'more'

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'home', label: 'Accueil', icon: 'M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z' },
  { key: 'list', label: 'Opérations', icon: 'M4 6h16M4 12h16M4 18h10' },
  { key: 'stats', label: 'Stats', icon: 'M5 20V10M12 20V4M19 20v-7' },
  { key: 'more', label: 'Plus', icon: 'M5 12h.01M12 12h.01M19 12h.01' },
]

export default function App() {
  const [tab, setTab] = useState<Tab>('home')
  const [month, setMonth] = useState(() => monthOf(todayISO()))
  const [entry, setEntry] = useState<EntryTarget | null>(null)

  useEffect(() => {
    const run = () => document.visibilityState === 'visible' && void generateRecurring()
    run()
    document.addEventListener('visibilitychange', run)
    return () => document.removeEventListener('visibilitychange', run)
  }, [])

  const add = () => setEntry({ kind: 'tx' })
  const navBtn = ({ key, label, icon }: (typeof TABS)[number]) => (
    <button key={key} className={tab === key ? 'active' : ''} aria-current={tab === key ? 'page' : undefined}
      onClick={() => { setTab(key); window.scrollTo(0, 0) }}>
      <svg viewBox="0 0 24 24" aria-hidden><path d={icon} /></svg>
      <span>{label}</span>
    </button>
  )

  return (
    <>
      <main className="page">
        {tab === 'home' && (
          <Home month={month} setMonth={setMonth} onAdd={add} onSeeAll={() => setTab('list')}
            onEdit={(item) => setEntry({ kind: 'tx', item })} />
        )}
        {tab === 'list' && <Transactions month={month} setMonth={setMonth} onEdit={(item) => setEntry({ kind: 'tx', item })} />}
        {tab === 'stats' && <Stats month={month} setMonth={setMonth} />}
        {tab === 'more' && <More onEditRule={(item) => setEntry({ kind: 'rule', item })} />}
      </main>

      <nav className="tabbar" aria-label="Navigation principale">
        {TABS.slice(0, 2).map(navBtn)}
        <button className="fab" aria-label="Ajouter une opération" onClick={add}>
          <svg viewBox="0 0 24 24" aria-hidden><path d="M12 5v14M5 12h14" /></svg>
        </button>
        {TABS.slice(2).map(navBtn)}
      </nav>

      {entry && <EntrySheet target={entry} onClose={() => setEntry(null)} />}
    </>
  )
}
