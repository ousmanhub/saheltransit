// Overlays localStorage indépendants du store principal :
// - frais de fret / assurance par container (édition inline, CAF recalculé live)
// - méta-données documentaires (références « N° BESC : … », notes)
// Le store ne touche jamais ces clés : pas de rechargement nécessaire.

import type { Container } from '@/lib/types'

const COSTS_KEY = 'saheltransit.costs.v1'
const DOCMETA_KEY = 'saheltransit.docmeta.v1'

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function writeJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // quota dépassé : on ignore silencieusement
  }
}

// ─── Fret & assurance ────────────────────────────────────────────────────────

export interface CostOverlay {
  fret: number
  assurance: number
}

type CostsMap = Record<string, CostOverlay>

/** Fret + assurance persistés, ou répartition par défaut (10 % du delta CAF−FOB en assurance) */
export function getCostOverlay(c: Container, fob: number): CostOverlay {
  const map = readJson<CostsMap>(COSTS_KEY, {})
  const existing = map[c.id]
  if (existing) return existing
  const delta = Math.max(0, c.valeurCaf - fob)
  const assurance = Math.round(delta * 0.1)
  return { fret: delta - assurance, assurance }
}

export function setCostOverlay(containerId: string, overlay: CostOverlay) {
  const map = readJson<CostsMap>(COSTS_KEY, {})
  map[containerId] = overlay
  writeJson(COSTS_KEY, map)
}

// ─── Méta documentaire (références / notes) ─────────────────────────────────

export interface DocMeta {
  reference?: string
  note?: string
}

type DocMetaMap = Record<string, DocMeta>

export function getDocMeta(docId: string): DocMeta {
  return readJson<DocMetaMap>(DOCMETA_KEY, {})[docId] ?? {}
}

export function setDocMeta(docId: string, meta: DocMeta) {
  const map = readJson<DocMetaMap>(DOCMETA_KEY, {})
  map[docId] = meta
  writeJson(DOCMETA_KEY, map)
}
