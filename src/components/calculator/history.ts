// Historique des simulations du calculateur — localStorage (max 10 entrées)
// Clé dédiée, indépendante du store principal (saheltransit.v1).

import { computeCustoms } from '@/lib/customs'

const HISTORY_KEY = 'saheltransit.simulations.v1'
const MAX_ENTRIES = 10

/** Paramètres complets d'une simulation */
export interface SimulationParams {
  fob: number
  fret: number
  assurance: number
  /** TEC ∈ 0.05 / 0.10 / 0.15 / 0.20 */
  tec: number
  /** Taux d'accise en % (0–30) */
  accise: number
  tvaExoneree: boolean
}

export interface SimulationRecord {
  id: string
  /** Ex. « MSKU 847 291-5 » ou « Riz 640 sacs » */
  label: string
  containerId?: string
  params: SimulationParams
  /** Total droits et taxes (FCFA) */
  total: number
  /** Date ISO */
  date: string
}

/** Paramètres par défaut du simulateur (scénario MSKU du design) */
export const DEFAULT_PARAMS: SimulationParams = {
  fob: 15_400_000,
  fret: 2_850_000,
  assurance: 310_000,
  tec: 0.1,
  accise: 0,
  tvaExoneree: false,
}

export function totalOf(params: SimulationParams): number {
  return computeCustoms({
    caf: params.fob + params.fret + params.assurance,
    tec: params.tec,
    acciseRate: params.accise / 100,
    tvaExoneree: params.tvaExoneree,
  }).total
}

function uid(): string {
  return `sim-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

/** Seed initial (design calculator.md §5) : MSKU il y a 2 h, Riz hier */
function buildSeedHistory(now: Date): SimulationRecord[] {
  const msku: SimulationRecord = {
    id: 'sim-seed-msku',
    label: 'MSKU 847 291-5',
    params: { ...DEFAULT_PARAMS },
    total: totalOf(DEFAULT_PARAMS), // 7 004 544
    date: new Date(now.getTime() - 2 * 3_600_000).toISOString(),
  }
  const rizParams: SimulationParams = {
    fob: 7_160_000,
    fret: 1_400_000,
    assurance: 140_000,
    tec: 0.1,
    accise: 0,
    tvaExoneree: true,
  }
  const riz: SimulationRecord = {
    id: 'sim-seed-riz',
    label: 'Riz 640 sacs',
    params: rizParams,
    total: totalOf(rizParams), // 1 513 800
    date: new Date(now.getTime() - 26 * 3_600_000).toISOString(),
  }
  return [msku, riz]
}

export function loadSimulations(): SimulationRecord[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as SimulationRecord[]
      if (Array.isArray(parsed)) return parsed
    }
  } catch {
    // JSON corrompu → reseed
  }
  const seed = buildSeedHistory(new Date())
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(seed))
  } catch {
    // quota dépassé : non bloquant
  }
  return seed
}

/**
 * Ajoute une simulation en tête (max 10, doublons consécutifs ignorés)
 * et renvoie la liste à jour.
 */
export function saveSimulation(
  entry: Omit<SimulationRecord, 'id' | 'date'>,
  current: SimulationRecord[],
): SimulationRecord[] {
  const first = current[0]
  if (first && first.label === entry.label && JSON.stringify(first.params) === JSON.stringify(entry.params)) {
    return current
  }
  const record: SimulationRecord = { ...entry, id: uid(), date: new Date().toISOString() }
  const next = [record, ...current].slice(0, MAX_ENTRIES)
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next))
  } catch {
    // quota dépassé : non bloquant
  }
  return next
}

// ─── Estimations enregistrées sur les dossiers ──────────────────────────────
// Le store principal n'expose pas d'écriture d'estimation : on persiste ici la
// dernière estimation par container (relue par la page à chaque enregistrement).

const ESTIMATIONS_KEY = 'saheltransit.estimations.v1'

export interface DossierEstimation {
  containerId: string
  date: string
  params: SimulationParams
  totalTaxes: number
  coutDebarque: number
}

export function saveEstimation(est: DossierEstimation): void {
  try {
    const raw = localStorage.getItem(ESTIMATIONS_KEY)
    const map: Record<string, DossierEstimation> = raw ? (JSON.parse(raw) as Record<string, DossierEstimation>) : {}
    map[est.containerId] = est
    localStorage.setItem(ESTIMATIONS_KEY, JSON.stringify(map))
  } catch {
    // quota dépassé : non bloquant
  }
}

export function loadEstimation(containerId: string): DossierEstimation | null {
  try {
    const raw = localStorage.getItem(ESTIMATIONS_KEY)
    if (!raw) return null
    const map = JSON.parse(raw) as Record<string, DossierEstimation>
    return map[containerId] ?? null
  } catch {
    return null
  }
}
