// Helpers partagés des pages Containers / Fiche container.

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import type { Container, ContainerStatus, DocTypeName } from '@/lib/types'
import { STATUS_META } from '@/lib/types'
import { daysUntil } from '@/lib/format'
import { consumeFlashToast } from './storagePatch'

/** Garde-fou dédouanement + toast de confirmation (partagé kanban / fiche) */
export function applyStatusChange(
  c: Container,
  target: ContainerStatus,
  update: (id: string, s: ContainerStatus) => void,
) {
  const manquants = c.documents.filter((d) => d.statut === 'manquant').length
  if (target === 'dedouanement' && manquants > 0) {
    toast.warning(
      `${manquants} document${manquants > 1 ? 's' : ''} manquant${manquants > 1 ? 's' : ''} — dédouanement bloqué`,
      { description: 'Le statut est mis à jour, mais la checklist reste incomplète.' },
    )
  } else {
    toast.success(`Statut mis à jour : ${STATUS_META[target].label}`, {
      description: c.numero,
    })
  }
  update(c.id, target)
}

export const EASE_OUT_EXPO = [0.22, 1, 0.36, 1] as [number, number, number, number]

/** Affiche le flash toast enregistré avant un rechargement éventuel */
export function useFlashToast() {
  useEffect(() => {
    const t = window.setTimeout(() => consumeFlashToast(), 350)
    return () => window.clearTimeout(t)
  }, [])
}

/** Media query « < 768px » (bascule mobile forcée en vue cartes) */
export function useIsMobile(): boolean {
  const [mobile, setMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches,
  )
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    const apply = () => setMobile(mq.matches)
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])
  return mobile
}

// ─── Échéances ───────────────────────────────────────────────────────────────

export interface NextDeadline {
  kind: 't1' | 'eta' | 'embarquement' | 'livraison'
  date: string
  days: number
}

/** Prochaine échéance future d'un container (T1 > embarquement > ETA), livraison pour les livrés */
export function nextDeadline(c: Container, now = new Date()): NextDeadline | null {
  const candidates: NextDeadline[] = []
  if (c.t1) candidates.push({ kind: 't1', date: c.t1.limite, days: daysUntil(c.t1.limite, now) })
  if (c.embarquement)
    candidates.push({ kind: 'embarquement', date: c.embarquement, days: daysUntil(c.embarquement, now) })
  if (c.eta) candidates.push({ kind: 'eta', date: c.eta, days: daysUntil(c.eta, now) })
  const future = candidates.filter((d) => d.days >= 0).sort((a, b) => a.days - b.days)
  if (future.length > 0) return future[0]
  if (c.livraison) return { kind: 'livraison', date: c.livraison, days: daysUntil(c.livraison, now) }
  const past = candidates.sort((a, b) => b.days - a.days)
  return past[0] ?? null
}

/** Tri par défaut de la vue table : prochaine échéance la plus proche (livrés en dernier) */
export function deadlineSortKey(c: Container, now = new Date()): number {
  const d = nextDeadline(c, now)
  if (!d) return Number.MAX_SAFE_INTEGER
  if (c.statut === 'livre') return Number.MAX_SAFE_INTEGER - 1
  return d.days
}

// ─── Libellés d'origine / transport ─────────────────────────────────────────

const COUNTRY_BY_ORIGINE: Record<string, string> = {
  shenzhen: 'Chine',
  guangzhou: 'Chine',
  dubaï: 'Émirats arabes unis',
  bangkok: 'Thaïlande',
  bombay: 'Inde',
}

const FLAG_BY_COUNTRY: Record<string, string> = {
  Chine: '🇨🇳',
  'Émirats arabes unis': '🇦🇪',
  Thaïlande: '🇹🇭',
  Inde: '🇮🇳',
}

/** « Shenzhen, Chine 🇨🇳 » */
export function origineLabel(origine: string): string {
  const country = COUNTRY_BY_ORIGINE[origine.trim().toLowerCase()]
  if (!country) return origine
  return `${origine}, ${country} ${FLAG_BY_COUNTRY[country] ?? ''}`.trim()
}

export interface TransportInfos {
  transporteur: string
  transitaire: string
  contact: string
  bureau: string
  entrepot: string
}

const TRANSPORT_BY_ID: Record<string, Partial<TransportInfos>> = {
  'beau-231-774-0': { transporteur: 'Transcam Express' },
  'fciu-901-445-2': { transporteur: '(à attribuer)', transitaire: 'Sahel Transit SARL — Douala' },
  'whsu-340-556-1': { transporteur: 'Sahel Logistics' },
  'msku-847-291-5': { transporteur: '(à attribuer à l’arrivée)' },
}

/** Infos transport du rail latéral (dérivées du dossier, valeurs démo design §5c) */
export function transportInfos(c: Container): TransportInfos {
  const routier = c.compagnie.match(/routier\s+(.+)/i)?.[1]?.trim()
  const transitaire = c.compagnie.match(/transitaire\s+(.+)/i)?.[1]?.trim()
  const overrides = TRANSPORT_BY_ID[c.id] ?? {}
  return {
    transporteur: overrides.transporteur ?? routier ?? '(à confirmer)',
    transitaire: overrides.transitaire ?? transitaire ?? 'Sahel Transit SARL — Douala',
    contact: '+237 6 99 00 00 00',
    bureau: 'Nguéli',
    entrepot: "Zone industrielle Farcha, N'Djamena",
  }
}

// ─── Descriptions documentaires (design §4b) ────────────────────────────────

export const DOC_DESCRIPTIONS: Record<DocTypeName, string> = {
  'BESC Cameroun':
    'Bordereau électronique de suivi — obligatoire avant départ, amende 100 % si absent',
  'BESC Tchad': 'Bordereau électronique de suivi tchadien — à obtenir avant l’embarquement',
  'Connaissement (B/L)': 'Titre de transport maritime émis par la compagnie — original requis',
  'Facture commerciale': 'Facture du fournisseur — base de la valeur en douane',
  'Facture de fret': 'Justificatif du fret maritime — composante de la valeur CAF',
  'Packing list': 'Liste de colisage détaillée (poids, volumes, références)',
  'Assurance cargo': 'Police d’assurance des marchandises — composante de la valeur CAF',
  'Manifeste de cargaison': 'Manifeste de débarquement déposé au port de Douala',
  'Titre de transit T1 (+ acquit-à-caution)':
    'Titre de transit CEMAC — 7 jours pour sortir du Cameroun, caution 450 000 FCFA',
  'Déclaration en détail (SYDONIA)': 'Déclaration en douane tchadienne déposée au bureau de Nguéli',
  "Certificat d'origine": 'Atteste l’origine des marchandises — chambre de commerce',
  'Certificat phytosanitaire / sanitaire':
    'Obligatoire pour denrées alimentaires et médicaments — bloque l’émission du T1',
  'Quittance / bulletin de liquidation': 'Bulletin de liquidation des droits et taxes — mainlevée',
}

