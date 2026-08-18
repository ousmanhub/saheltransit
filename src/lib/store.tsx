// Store global SahelTransit — React Context + persistance localStorage (clé saheltransit.v1)
// Seed au premier chargement, régénération des alertes automatiques (design.md §7)
// à chaque mutation, journal d'activité.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import type { ReactNode } from 'react'
import { differenceInDays, format } from 'date-fns'
import { fr } from 'date-fns/locale'
import type {
  ActivityEntry,
  Alert,
  AppState,
  Article,
  CalendarEvent,
  Container,
  ContainerStatus,
  DocStatus,
} from './types'
import { CONTAINER_STATUSES, DOC_STATUS_META, DOC_TYPES, STATUS_META } from './types'
import { buildSeedState } from './seed'

const STORAGE_KEY = 'saheltransit.v1'

// ─── Règles métier : alertes automatiques (design.md §7) ────────────────────

function generateAutoAlerts(containers: Container[], existing: Alert[], now = new Date()): Alert[] {
  const out: Alert[] = []
  const keep = (id: string, base: Omit<Alert, 'id' | 'createdAt' | 'lue'>) => {
    const prev = existing.find((a) => a.id === id)
    out.push({
      ...base,
      id,
      createdAt: prev?.createdAt ?? now.toISOString(),
      lue: prev?.lue ?? false,
    })
  }

  for (const c of containers) {
    if (c.statut === 'livre') continue

    // 1. T1 émis depuis ≥ 5 j → critique « expire dans J−x »
    if (c.t1) {
      const emittedDays = differenceInDays(now, new Date(c.t1.emission))
      const remaining = differenceInDays(new Date(c.t1.limite), now)
      if (emittedDays >= 5) {
        const titre =
          remaining <= 0
            ? 'T1 expiré — acquit-à-caution perdu'
            : `T1 expire dans ${remaining} jour${remaining > 1 ? 's' : ''}`
        keep(`auto-t1-${c.id}`, {
          severite: 'critique',
          titre,
          description: `Émis le ${format(new Date(c.t1.emission), 'd MMM', { locale: fr })} : sortie du Cameroun obligatoire avant le ${format(new Date(c.t1.limite), 'd MMM', { locale: fr })}, sinon acquit-à-caution perdu.`,
          containerId: c.id,
          actionLabel: 'Contacter le transitaire',
          source: 'auto',
        })
      }
    }

    // 2. Embarquement < 15 j et BESC non validé → critique
    if (c.embarquement) {
      const before = differenceInDays(new Date(c.embarquement), now)
      const bescs = c.documents.filter((d) => d.nom.startsWith('BESC'))
      const bescKo = bescs.filter((d) => d.statut !== 'valide' && d.statut !== 'non_requis')
      if (before >= 0 && before < 15 && bescKo.length > 0) {
        keep(`auto-besc-${c.id}`, {
          severite: 'critique',
          titre: 'BESC non validé avant embarquement',
          description: `Embarquement prévu le ${format(new Date(c.embarquement), 'd MMM', { locale: fr })} : BESC Cameroun + Tchad à obtenir au départ. Amende = 100 % de la valeur si absent.`,
          containerId: c.id,
          actionLabel: 'Demander le BESC',
          source: 'auto',
        })
      }
    }

    // 3. Statut ≥ « Arrivé à Douala » et document bloquant « Manquant » → importante
    const step = CONTAINER_STATUSES.indexOf(c.statut)
    if (step >= CONTAINER_STATUSES.indexOf('douala')) {
      const missing = c.documents.find((d) => d.bloquant && d.statut === 'manquant')
      if (missing) {
        keep(`auto-doc-${c.id}`, {
          severite: 'importante',
          titre: `${missing.nom.split(' (')[0]} manquant`,
          description:
            missing.nom.includes('phytosanitaire')
              ? "Bloque l'émission du T1 et la sortie du port de Douala."
              : `Document bloquant pour la poursuite du dossier (${STATUS_META[c.statut].label}).`,
          containerId: c.id,
          actionLabel: 'Voir la checklist',
          source: 'auto',
        })
      }
    }

    // 4. ETA − aujourd'hui ≤ 5 j → info
    if (c.eta && (c.statut === 'mer' || c.statut === 'preparation')) {
      const d = differenceInDays(new Date(c.eta), now)
      if (d >= 0 && d <= 5) {
        keep(`auto-eta-${c.id}`, {
          severite: 'info',
          titre: `ETA Douala : ${format(new Date(c.eta), 'd MMMM', { locale: fr })}`,
          description: 'Anticiper le manifeste et la déclaration en détail.',
          containerId: c.id,
          source: 'auto',
        })
      }
    }
  }
  return out
}

// ─── Persistance ─────────────────────────────────────────────────────────────

function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as AppState
      if (parsed && parsed.version === 1 && Array.isArray(parsed.containers)) return parsed
    }
  } catch {
    // JSON corrompu → reseed
  }
  const seed = buildSeedState(new Date())
  return { version: 1, ...seed }
}

// ─── Contexte ────────────────────────────────────────────────────────────────

export interface NewContainerInput {
  numero: string
  contenu: string
  fournisseur: string
  origine: string
  compagnie: string
  valeurCaf: number
  tec: number
  tvaExoneree: boolean
  embarquement?: string
  eta?: string
  articles?: Article[]
}

interface StoreValue extends AppState {
  lastSavedAt: string | null
  getContainer: (id: string) => Container | undefined
  updateDocStatus: (containerId: string, docId: string, statut: DocStatus) => void
  updateContainerStatus: (containerId: string, statut: ContainerStatus) => void
  addContainer: (input: NewContainerInput) => Container
  addEvent: (event: CalendarEvent) => void
  markAlertRead: (alertId: string) => void
  markAllAlertsRead: () => void
  resetData: () => void
}

const StoreContext = createContext<StoreValue | null>(null)

let idCounter = 0
const uid = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${(idCounter++).toString(36)}`

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(loadState)
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null)
  const first = useRef(true)

  // Persistance à chaque mutation (l'indicateur « Sauvegardé localement »
  // est mis à jour dans mutate(), pas ici, pour éviter un setState en cascade)
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state])

  const mutate = useCallback(
    (fn: (s: AppState) => AppState, entry?: Omit<ActivityEntry, 'id' | 'createdAt'>) => {
      setLastSavedAt(new Date().toISOString())
      setState((prev) => {
        let next = fn(prev)
        // Régénération des alertes automatiques (règles métier §7)
        const auto = generateAutoAlerts(next.containers, next.alerts)
        next = { ...next, alerts: [...auto, ...next.alerts.filter((a) => a.source !== 'auto')] }
        if (entry) {
          const e: ActivityEntry = { ...entry, id: uid('act'), createdAt: new Date().toISOString() }
          next = { ...next, activity: [e, ...next.activity].slice(0, 60) }
        }
        return next
      })
    },
    [],
  )

  const getContainer = useCallback(
    (id: string) => state.containers.find((c) => c.id === id),
    [state.containers],
  )

  const updateDocStatus = useCallback(
    (containerId: string, docId: string, statut: DocStatus) => {
      const c = state.containers.find((x) => x.id === containerId)
      const doc = c?.documents.find((d) => d.id === docId)
      if (!c || !doc) return
      const short = doc.nom.split(' (')[0]
      mutate(
        (s) => ({
          ...s,
          containers: s.containers.map((x) =>
            x.id === containerId
              ? {
                  ...x,
                  documents: x.documents.map((d) =>
                    d.id === docId ? { ...d, statut, updatedAt: new Date().toISOString() } : d,
                  ),
                }
              : x,
          ),
        }),
        {
          type: 'doc',
          message: `${short} ${DOC_STATUS_META[statut].label.toLowerCase()} — ${c.numero}`,
          containerId,
          couleur: statut === 'valide' ? '#059669' : statut === 'manquant' ? '#E11D48' : '#0284C7',
        },
      )
    },
    [state.containers, mutate],
  )

  const updateContainerStatus = useCallback(
    (containerId: string, statut: ContainerStatus) => {
      const c = state.containers.find((x) => x.id === containerId)
      if (!c) return
      mutate(
        (s) => ({
          ...s,
          containers: s.containers.map((x) => (x.id === containerId ? { ...x, statut } : x)),
        }),
        {
          type: statut === 'livre' ? 'livraison' : 'statut',
          message:
            statut === 'livre'
              ? `Livraison confirmée — ${c.numero}`
              : `Statut passé à ${STATUS_META[statut].label} — ${c.numero}`,
          containerId,
          couleur: STATUS_META[statut].color,
        },
      )
    },
    [state.containers, mutate],
  )

  const addContainer = useCallback(
    (input: NewContainerInput): Container => {
      const id = uid('ctr')
      const now = new Date().toISOString()
      const container: Container = {
        id,
        numero: input.numero,
        contenu: input.contenu,
        fournisseur: input.fournisseur,
        origine: input.origine,
        destination: "N'Djamena",
        compagnie: input.compagnie,
        statut: 'preparation',
        valeurCaf: input.valeurCaf,
        tec: input.tec,
        tvaExoneree: input.tvaExoneree,
        embarquement: input.embarquement,
        eta: input.eta,
        createdAt: now,
        articles: input.articles ?? [],
        documents: [],
      }
      // Checklist initiale : les 13 documents types à « Manquant »
      // (phyto/sanitaire « Non requis » hors denrées & médicaments)
      container.documents = buildInitialDocuments(id)
      mutate(
        (s) => ({ ...s, containers: [container, ...s.containers] }),
        { type: 'container', message: `Container créé — ${container.numero}`, containerId: id, couleur: '#0F2437' },
      )
      return container
    },
    [mutate],
  )

  const addEvent = useCallback(
    (event: CalendarEvent) => {
      mutate((s) => ({ ...s, events: [...s.events, event] }))
    },
    [mutate],
  )

  const markAlertRead = useCallback(
    (alertId: string) => {
      mutate((s) => ({ ...s, alerts: s.alerts.map((a) => (a.id === alertId ? { ...a, lue: true } : a)) }))
    },
    [mutate],
  )

  const markAllAlertsRead = useCallback(() => {
    mutate((s) => ({ ...s, alerts: s.alerts.map((a) => ({ ...a, lue: true })) }))
  }, [mutate])

  const resetData = useCallback(() => {
    const seed = buildSeedState(new Date())
    setLastSavedAt(new Date().toISOString())
    setState({ version: 1, ...seed })
  }, [])

  const value = useMemo<StoreValue>(
    () => ({
      ...state,
      lastSavedAt,
      getContainer,
      updateDocStatus,
      updateContainerStatus,
      addContainer,
      addEvent,
      markAlertRead,
      markAllAlertsRead,
      resetData,
    }),
    [state, lastSavedAt, getContainer, updateDocStatus, updateContainerStatus, addContainer, addEvent, markAlertRead, markAllAlertsRead, resetData],
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

function buildInitialDocuments(containerId: string) {
  const now = new Date().toISOString()
  return DOC_TYPES.map((nom, i) => ({
    id: `${containerId}-doc-${i}`,
    nom,
    statut: (nom.includes('phytosanitaire') ? 'non_requis' : 'manquant') as DocStatus,
    updatedAt: now,
  }))
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore doit être utilisé dans <StoreProvider>')
  return ctx
}

// ─── Sélecteurs dérivés partagés ─────────────────────────────────────────────

/** Progression documentaire : validés / pièces requises (hors « Non requis ») */
export function docProgress(c: Container): { valides: number; requis: number; pct: number } {
  const requis = c.documents.filter((d) => d.statut !== 'non_requis')
  const valides = requis.filter((d) => d.statut === 'valide').length
  return { valides, requis: requis.length, pct: requis.length ? Math.round((valides / requis.length) * 100) : 100 }
}

export function docCounts(c: Container): Record<DocStatus, number> {
  const counts: Record<DocStatus, number> = { manquant: 0, demande: 0, recu: 0, valide: 0, non_requis: 0 }
  for (const d of c.documents) counts[d.statut] += 1
  return counts
}

/** Containers actifs = non livrés */
export function activeContainers(containers: Container[]): Container[] {
  return containers.filter((c) => c.statut !== 'livre')
}

/** Compteurs globaux pour la sidebar / KPIs */
export function globalCounts(containers: Container[]) {
  let manquants = 0
  let demandes = 0
  let bloquants = 0
  let valides = 0
  let requis = 0
  for (const c of containers) {
    for (const d of c.documents) {
      if (d.statut === 'non_requis') continue
      requis += 1
      if (d.statut === 'manquant') {
        manquants += 1
        if (d.bloquant) bloquants += 1
      }
      if (d.statut === 'demande') demandes += 1
      if (d.statut === 'valide') valides += 1
    }
  }
  return { manquants, demandes, bloquants, valides, requis, enAttente: manquants + demandes }
}
