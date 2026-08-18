// Formatage : FCFA, dates françaises, temps relatif

import { differenceInDays, differenceInHours, differenceInMinutes, format, isToday, isYesterday } from 'date-fns'
import { fr } from 'date-fns/locale'

const nf = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 })

/** 18 560 000 FCFA */
export function formatFCFA(n: number): string {
  return `${nf.format(Math.round(n))} FCFA`
}

/** Nombre sans suffixe : 18 560 000 */
export function formatNumber(n: number): string {
  return nf.format(Math.round(n))
}

type DateLike = string | Date
const toDate = (d: DateLike) => (typeof d === 'string' ? new Date(d) : d)

/** « 18 févr. 2025 » */
export function formatDate(d: DateLike): string {
  return format(toDate(d), 'd MMM yyyy', { locale: fr })
}

/** « 18 févr. » */
export function formatDateShort(d: DateLike): string {
  return format(toDate(d), 'd MMM', { locale: fr })
}

/** « lun. 27 janv. » */
export function formatDateWeekday(d: DateLike): string {
  return format(toDate(d), 'EEE d MMM', { locale: fr })
}

/** « samedi 25 janvier 2025 » */
export function formatFullDate(d: DateLike): string {
  return format(toDate(d), 'EEEE d MMMM yyyy', { locale: fr })
}

/** « 14:27 » */
export function formatTime(d: DateLike): string {
  return format(toDate(d), 'HH:mm')
}

/** Temps relatif abrégé : « il y a 3 h », « il y a 2 j », « à l'instant » */
export function relativeTime(d: DateLike, now: Date = new Date()): string {
  const date = toDate(d)
  const min = differenceInMinutes(now, date)
  if (min < 1) return "à l'instant"
  if (min < 60) return `il y a ${min} min`
  const h = differenceInHours(now, date)
  if (h < 24) return `il y a ${h} h`
  const j = differenceInDays(now, date)
  if (j < 30) return `il y a ${j} j`
  return formatDateShort(date)
}

/** Libellé agenda : « aujourd'hui, 09:41 » · « hier, 17:02 » · « 23 janv., 14:27 » */
export function activityTime(d: DateLike, now: Date = new Date()): string {
  const date = toDate(d)
  const time = formatTime(date)
  if (isToday(date)) return `aujourd'hui, ${time}`
  if (isYesterday(date)) return `hier, ${time}`
  void now
  return `${format(date, 'd MMM', { locale: fr })}, ${time}`
}

/** Jours restants (entier signé) jusqu'à une date */
export function daysUntil(d: DateLike, now: Date = new Date()): number {
  return differenceInDays(toDate(d), now)
}
