import Dexie from 'dexie'
import { useEffect, useState, useSyncExternalStore } from 'react'
import { db, exportBackup } from './db'
import { todayISO } from './lib/dates'

export type Platform = 'ios' | 'android'

/**
 * Sur téléphone, l'app ne s'utilise qu'installée sur l'écran d'accueil.
 * Sur iPhone, les données d'une app installée sont séparées de celles de Safari :
 * des opérations saisies dans Safari seraient introuvables une fois l'app installée.
 * Renvoie la plateforme à laquelle il faut demander l'installation, ou null.
 */
export function installPlatform(): Platform | null {
  const ua = navigator.userAgent
  // Les iPad récents se présentent comme un Mac : on les reconnaît à l'écran tactile.
  const ios = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  const android = /Android/.test(ua) && /Mobile/.test(ua)
  const standalone =
    (navigator as Navigator & { standalone?: boolean }).standalone === true ||
    ['standalone', 'fullscreen', 'minimal-ui'].some((m) => window.matchMedia(`(display-mode: ${m})`).matches) ||
    document.referrer.startsWith('android-app://')
  const testing = new URLSearchParams(location.search).has('test')
  if (standalone || testing) return null
  return ios ? 'ios' : android ? 'android' : null
}

// Android (Chrome) : l'invite d'installation native est capturée dès le chargement du module.
interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}
let deferredPrompt: InstallPromptEvent | null = null
let installed = false
const listeners = new Set<() => void>()
const notify = () => listeners.forEach((fn) => fn())
let version = 0
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  deferredPrompt = e as InstallPromptEvent
  version++
  notify()
})
window.addEventListener('appinstalled', () => {
  deferredPrompt = null
  installed = true
  version++
  notify()
})
const subscribe = (fn: () => void) => {
  listeners.add(fn)
  return () => { listeners.delete(fn) }
}

async function promptInstall() {
  const p = deferredPrompt
  if (!p) return
  deferredPrompt = null
  await p.prompt()
  try {
    if ((await p.userChoice).outcome === 'accepted') installed = true
  } catch { /* ignoré */ }
  version++
  notify()
}

/** Exporte les données déjà saisies dans le navigateur, pour les importer dans l'app installée. */
async function exportLegacy() {
  const name = `managewallets-${todayISO()}.json`
  const file = new File([JSON.stringify(await exportBackup(), null, 2)], name, { type: 'application/json' })
  try {
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: 'Sauvegarde ManageWallets' })
      return
    }
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') return
  }
  const a = document.createElement('a')
  a.href = URL.createObjectURL(file)
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}

export function InstallScreen({ platform }: { platform: Platform }) {
  useSyncExternalStore(subscribe, () => version)
  const [hasData, setHasData] = useState(false)

  // iPhone : des données existent-elles déjà dans ce navigateur ? (sans créer la base si elle n'existe pas)
  useEffect(() => {
    if (platform !== 'ios') return
    let alive = true
    void (async () => {
      try {
        if (!(await Dexie.exists('managewallets'))) return
        const n = (await db.transactions.count()) + (await db.recurring.count())
        if (alive && n > 0) setHasData(true)
      } catch { /* stockage indisponible */ }
    })()
    return () => { alive = false }
  }, [platform])

  const ios = platform === 'ios'
  const steps = ios
    ? [
        <>Touche le bouton <strong>Partager</strong> (le carré avec une flèche) dans la barre du navigateur.</>,
        <>Choisis <strong>« Sur l'écran d'accueil »</strong>, puis <strong>Ajouter</strong>.</>,
        <>Ferme le navigateur et ouvre <strong>Wallets</strong> depuis l'icône.</>,
      ]
    : [
        <>Touche le menu <strong>⋮</strong> en haut à droite du navigateur.</>,
        <>Choisis <strong>« Installer l'application »</strong> ou <strong>« Ajouter à l'écran d'accueil »</strong>.</>,
        <>Ouvre <strong>Wallets</strong> depuis l'icône sur ton écran d'accueil.</>,
      ]

  return (
    <main className="install-gate">
      <img src={`${import.meta.env.BASE_URL}pwa-192.png`} alt="" width={80} height={80} className="install-icon" />
      <h1 className="page-title">Installe l'app</h1>
      <p className="install-lead">
        {ios
          ? "Sur iPhone, tes données sont enregistrées dans l'app installée sur ton écran d'accueil, pas dans Safari. Installe-la d'abord, puis ouvre-la depuis son icône."
          : "ManageWallets s'utilise depuis l'app installée sur ton écran d'accueil : elle s'ouvre en plein écran et marche même sans réseau."}
      </p>

      {installed ? (
        <p className="install-done">C'est installé ! Ouvre <strong>Wallets</strong> depuis l'icône sur ton écran d'accueil.</p>
      ) : (
        deferredPrompt && <button className="btn primary install-btn" onClick={() => void promptInstall()}>Installer l'app</button>
      )}

      <ol className="install-steps">
        {steps.map((s, i) => (
          <li key={i}><span className="install-num">{i + 1}</span><span>{s}</span></li>
        ))}
      </ol>
      <p className="hint no-margin">
        L'option n'apparaît pas ? Ouvre cette page dans {ios ? 'Safari' : 'Chrome'}. Si l'app est déjà installée, ouvre-la depuis son icône.
      </p>

      {hasData && (
        <div className="card pad">
          <p className="hint no-margin">
            <strong>Tu as déjà des opérations enregistrées dans ce navigateur.</strong> Exporte-les, puis dans l'app
            installée va dans <strong>Plus → Sauvegarde → Importer</strong>.
          </p>
          <div className="actions">
            <button className="btn" onClick={() => void exportLegacy()}>Exporter mes données</button>
          </div>
        </div>
      )}
    </main>
  )
}
