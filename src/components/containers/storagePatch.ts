// Patchs localStorage hors-store (clé saheltransit.v1) + flash toasts post-reload.
// Le store (src/lib/store.tsx) n'expose pas d'actions d'édition/suppression de dossier :
// ces helpers écrivent directement l'état persisté puis rechargent la page pour
// réhydrater le store proprement. Les champs additionnels (fret, acciseRate…)
// survivent aux mutations du store grâce au spread `{ ...x }`.

import { toast } from 'sonner'
import type { AppState, Article, Container, CalendarEvent } from '@/lib/types'

const STORAGE_KEY = 'saheltransit.v1'
const FLASH_KEY = 'saheltransit.flash'

// ─── Lecture / écriture de l'état persisté ───────────────────────────────────

export function readStoredState(): AppState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as AppState
    if (parsed && parsed.version === 1 && Array.isArray(parsed.containers)) return parsed
    return null
  } catch {
    return null
  }
}

function writeStoredState(state: AppState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

/** Applique un patch à un container précis (+ patch global optionnel) */
export function patchStoredContainer(
  containerId: string,
  patch: (c: Container) => Container,
  extra?: (s: AppState) => AppState,
): boolean {
  const state = readStoredState()
  if (!state) return false
  let next: AppState = {
    ...state,
    containers: state.containers.map((c) => (c.id === containerId ? patch(c) : c)),
  }
  if (extra) next = extra(next)
  writeStoredState(next)
  return true
}

/** Suppression définitive de dossiers (containers + alertes/événements/activité liés) */
export function removeStoredContainers(ids: string[]): boolean {
  const state = readStoredState()
  if (!state) return false
  const next: AppState = {
    ...state,
    containers: state.containers.filter((c) => !ids.includes(c.id)),
    alerts: state.alerts.filter((a) => !a.containerId || !ids.includes(a.containerId)),
    events: state.events.filter((e) => !e.containerId || !ids.includes(e.containerId)),
    activity: state.activity.filter((a) => !a.containerId || !ids.includes(a.containerId)),
  }
  writeStoredState(next)
  return true
}

// ─── Flash toast post-reload ─────────────────────────────────────────────────

export interface UndoDescriptor {
  kind: 'restore-article'
  containerId: string
  article: Article
}

export interface FlashMessage {
  type: 'success' | 'info' | 'warning' | 'error'
  message: string
  description?: string
  undo?: UndoDescriptor
}

/** Enregistre un toast à afficher après le rechargement, puis recharge la page */
export function flashAndReload(flash: FlashMessage, url?: string) {
  try {
    sessionStorage.setItem(FLASH_KEY, JSON.stringify(flash))
  } catch {
    // sessionStorage indisponible : on recharge quand même
  }
  if (url) window.location.href = url
  else window.location.reload()
}

function applyUndo(undo: UndoDescriptor) {
  if (undo.kind === 'restore-article') {
    patchStoredContainer(undo.containerId, (c) => ({ ...c, articles: [...c.articles, undo.article] }))
    flashAndReload({ type: 'success', message: `Article restauré — ${undo.article.nom}` })
  }
}

/** À appeler au montage d'une page : consomme le flash éventuel */
export function consumeFlashToast() {
  let flash: FlashMessage | null = null
  try {
    const raw = sessionStorage.getItem(FLASH_KEY)
    if (raw) {
      flash = JSON.parse(raw) as FlashMessage
      sessionStorage.removeItem(FLASH_KEY)
    }
  } catch {
    return
  }
  if (!flash) return
  const options = {
    description: flash.description,
    action: flash.undo
      ? { label: 'Annuler', onClick: () => applyUndo(flash!.undo!) }
      : undefined,
  }
  const fn = toast[flash.type] ?? toast.info
  fn(flash.message, options)
}

// ─── Événements liés (T1) ────────────────────────────────────────────────────

/** Ajoute un événement calendrier à l'état persisté (utilisé avec patchStoredContainer) */
export function appendStoredEvent(event: CalendarEvent) {
  return (s: AppState): AppState => ({ ...s, events: [...s.events, event] })
}
