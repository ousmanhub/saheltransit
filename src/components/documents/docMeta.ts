// Helpers métier du centre des documents (design/documents.md)
// — descriptions courtes des 13 pièces, phases de la matrice, méta locales
//   (n° de référence / note interne) persistées dans localStorage.

import { useCallback, useEffect, useState } from 'react'
import type { Container, DocTypeName, DocumentItem } from '@/lib/types'
import { formatDateShort, relativeTime } from '@/lib/format'

/** Nom court d'un document (sans la parenthèse) */
export const shortDocName = (nom: string) => nom.split(' (')[0]

/** Description courte affichée sous le nom du document */
export const DOC_DESCRIPTIONS: Record<DocTypeName, string> = {
  'BESC Cameroun': 'Bordereau électronique de suivi — à obtenir au départ',
  'BESC Tchad': 'Bordereau électronique de suivi — à obtenir au départ',
  'Connaissement (B/L)': 'Titre de transport maritime émis par la compagnie',
  'Facture commerciale': 'Facture fournisseur — base de la valeur CAF',
  'Facture de fret': 'Détail du fret maritime et des surcharges',
  'Packing list': 'Détail du colisage (poids, volumes, références)',
  'Assurance cargo': 'Police d’assurance transport de la marchandise',
  'Manifeste de cargaison': 'Manifeste déposé par la compagnie à la douane de Douala',
  'Titre de transit T1 (+ acquit-à-caution)': 'Titre de transit camerounais — sortie sous 7 jours',
  'Déclaration en détail (SYDONIA)': 'Déclaration en douane tchadienne (bureau de Nguéli)',
  "Certificat d'origine": 'Atteste l’origine de la marchandise (chambre de commerce)',
  'Certificat phytosanitaire / sanitaire': 'Obligatoire pour denrées alimentaires et médicaments',
  'Quittance / bulletin de liquidation': 'Bulletin de liquidation des droits — à payer pour la mainlevée',
}

/** Condition d'exigence affichée dans la vue « Par type » */
export function docRequisLabel(nom: DocTypeName): string {
  if (nom.includes('phytosanitaire')) return 'requis : denrées & médicaments'
  if (nom.startsWith('BESC')) return 'requis : avant embarquement'
  return 'requis : toujours'
}

/** Phases de la matrice (séparateurs overline) */
export interface DocPhase {
  label: string
  docs: DocTypeName[]
}

export const DOC_PHASES: DocPhase[] = [
  {
    label: 'Avant embarquement',
    docs: [
      'BESC Cameroun',
      'BESC Tchad',
      'Facture commerciale',
      'Packing list',
      'Assurance cargo',
      "Certificat d'origine",
      'Certificat phytosanitaire / sanitaire',
    ],
  },
  {
    label: 'Transport maritime',
    docs: ['Connaissement (B/L)', 'Facture de fret', 'Manifeste de cargaison'],
  },
  {
    label: 'Transit & dédouanement',
    docs: [
      'Titre de transit T1 (+ acquit-à-caution)',
      'Déclaration en détail (SYDONIA)',
      'Quittance / bulletin de liquidation',
    ],
  },
]

/** Ligne de contexte métier de la file « À traiter » (documents.md §3) */
export function docContextLine(container: Container, doc: DocumentItem): string {
  const short = shortDocName(doc.nom)
  if (doc.statut === 'manquant') {
    if (doc.nom.startsWith('BESC') && container.embarquement) {
      return `à obtenir avant l’embarquement du ${formatDateShort(container.embarquement)}`
    }
    if (doc.nom.includes('phytosanitaire')) return 'bloque l’émission du T1 à Douala'
    if (doc.nom.startsWith('Titre de transit')) {
      const phytoKo = container.documents.some(
        (d) => d.nom.includes('phytosanitaire') && d.statut === 'manquant',
      )
      if (phytoKo) return 'émis par la douane camerounaise après phyto'
      return 'à émettre par la douane camerounaise'
    }
    if (short.startsWith('Quittance')) return 'à établir après liquidation SYDONIA'
    return 'à récupérer auprès du fournisseur ou du transitaire'
  }
  if (doc.statut === 'demande') {
    if (short.startsWith('Quittance') && container.statut === 'dedouanement') {
      return 'bulletin émis, à payer pour obtenir la mainlevée'
    }
    if (doc.nom === 'Manifeste de cargaison') {
      return `demandé à ${container.compagnie.split(' ·')[0]} ${relativeTime(doc.updatedAt)}`
    }
    return `demandé ${relativeTime(doc.updatedAt)} — en attente`
  }
  if (doc.statut === 'recu') return `reçu ${relativeTime(doc.updatedAt)} — à vérifier puis valider`
  return ''
}

// ─── Méta locales : n° de référence + note interne ──────────────────────────

export interface DocMeta {
  reference?: string
  note?: string
}

const META_KEY = 'saheltransit.docmeta.v1'

function loadMeta(): Record<string, DocMeta> {
  try {
    const raw = localStorage.getItem(META_KEY)
    if (raw) return JSON.parse(raw) as Record<string, DocMeta>
  } catch {
    // JSON corrompu → repartir à zéro
  }
  // Références de démonstration au premier chargement
  return {
    'tghu-663-210-9-doc-0': { reference: 'BESC-CM-2025-04112' },
    'fciu-901-445-2-doc-9': { reference: 'D-2025-0118' },
    'whsu-340-556-1-doc-9': { reference: 'D-2025-0141' },
  }
}

/** Hook de persistance des méta documents (référence / note interne) */
export function useDocMeta() {
  const [meta, setMeta] = useState<Record<string, DocMeta>>(loadMeta)

  useEffect(() => {
    try {
      localStorage.setItem(META_KEY, JSON.stringify(meta))
    } catch {
      // quota dépassé : ignorer silencieusement
    }
  }, [meta])

  const setDocMeta = useCallback((docId: string, patch: DocMeta) => {
    setMeta((prev) => ({ ...prev, [docId]: { ...prev[docId], ...patch } }))
  }, [])

  return { meta, setDocMeta }
}

/** Entrée plate container × document (recherche, vues) */
export interface DocEntry {
  container: Container
  doc: DocumentItem
}

export function flattenDocuments(containers: Container[]): DocEntry[] {
  return containers.flatMap((container) => container.documents.map((doc) => ({ container, doc })))
}
