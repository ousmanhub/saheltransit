// Helpers du calendrier (design/calendar.md) — teintes des pills, descriptions.

import type { CalendarEvent, CalendarEventType, Container } from '@/lib/types'

/** Teintes des pills d'événements : fond type-100, texte type-700, dot */
export const EVENT_TINTS: Record<CalendarEventType, { bg: string; text: string; dot: string }> = {
  t1: { bg: '#FEF2F2', text: '#B91C1C', dot: '#DC2626' },
  transit: { bg: '#FEF3C7', text: '#B45309', dot: '#F59E0B' },
  rdv: { bg: '#EFF6FF', text: '#1D4ED8', dot: '#2563EB' },
  embarquement: { bg: '#E0F2FE', text: '#0369A1', dot: '#0EA5E9' },
  eta: { bg: '#CFFAFE', text: '#0E7490', dot: '#0891B2' },
  livraison: { bg: '#DCFCE7', text: '#166534', dot: '#15803D' },
}

/** Légende du calendrier (calendar.md §1) */
export const LEGEND: { type: CalendarEventType; label: string }[] = [
  { type: 't1', label: 'Échéance réglementaire' },
  { type: 'transit', label: 'Transit' },
  { type: 'rdv', label: 'Rendez-vous' },
  { type: 'eta', label: 'ETA maritime' },
  { type: 'livraison', label: 'Livraison' },
]

/** Description affichée dans le popover de détail d'un événement */
export function eventDescription(e: CalendarEvent, container?: Container): string {
  switch (e.type) {
    case 't1':
      return 'Sortie du Cameroun obligatoire sous 7 j — acquit-à-caution 450 000 FCFA en jeu.'
    case 'transit':
      return container?.localisation
        ? `Transit terrestre en cours — position : ${container.localisation}.`
        : 'Sortie du port de Douala et début du transit terrestre vers Ngaoundéré.'
    case 'rdv':
      return 'Point d’avancement du dossier avec Sahel Transit SARL (Douala / Nguéli).'
    case 'embarquement':
      return 'Embarquement prévu — vérifier le BESC Cameroun et le BESC Tchad avant le départ.'
    case 'eta':
      return 'Arrivée estimée au port de Douala — anticiper le manifeste et la déclaration en détail.'
    case 'livraison':
      return 'Livraison à l’entrepôt de N’Djamena.'
  }
}

/** Libellé court de pill : « Limite T1 · BEAU 231 774-0 » */
export function pillLabel(e: CalendarEvent, container?: Container): string {
  const num = container ? container.numero : ''
  switch (e.type) {
    case 't1':
      return `Limite T1 · ${num}`
    case 'transit':
      return `Sortie Douala · ${num}`
    case 'rdv':
      return `RDV transitaire · ${num}`
    case 'embarquement':
      return `Embarquement Jebel Ali · ${num}`
    case 'eta':
      return `ETA Douala · ${num}`
    case 'livraison':
      return `Livré · ${num}`
  }
}
