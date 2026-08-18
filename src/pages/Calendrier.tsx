// Page — Calendrier & alertes (route « /calendrier », design/calendar.md)
// Calendrier mensuel + agenda latéral + centre d'alertes + drawer transitaire.

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { addMonths, format, startOfMonth } from 'date-fns'
import { fr } from 'date-fns/locale'
import type { Alert, CalendarEvent } from '@/lib/types'
import { useStore } from '@/lib/store'
import { daysUntil, formatDateShort } from '@/lib/format'
import MonthGrid from '@/components/calendar/MonthGrid'
import AgendaLateral from '@/components/calendar/AgendaLateral'
import CentreAlertes from '@/components/calendar/CentreAlertes'
import TransitaireDrawer from '@/components/calendar/TransitaireDrawer'
import type { NewEventInput } from '@/components/calendar/AddEventForm'

const EASE_OUT_EXPO = [0.22, 1, 0.36, 1] as [number, number, number, number]

let eventCounter = 0
const newEventId = () => `evt-user-${Date.now().toString(36)}-${(eventCounter++).toString(36)}`

export default function Calendrier() {
  const { events, containers, addEvent } = useStore()
  const location = useLocation()

  const [month, setMonth] = useState(() => startOfMonth(new Date()))
  const [direction, setDirection] = useState(0)
  /** Reports d'échéances (drag & drop / « Reporter… ») — non réglementaires */
  const [overrides, setOverrides] = useState<Record<string, string>>({})
  const [transitaireAlert, setTransitaireAlert] = useState<Alert | null>(null)
  // Dernière alerte conservée pour l'animation de sortie du drawer
  const [lastTransitaire, setLastTransitaire] = useState<Alert | null>(null)
  if (transitaireAlert && transitaireAlert !== lastTransitaire) setLastTransitaire(transitaireAlert)

  // Événements fusionnés avec les reports locaux
  const mergedEvents = useMemo<CalendarEvent[]>(
    () => events.map((e) => (overrides[e.id] ? { ...e, date: overrides[e.id] } : e)),
    [events, overrides],
  )

  const aVenir = useMemo(() => mergedEvents.filter((e) => daysUntil(e.date) >= 0).length, [mergedEvents])

  // Lien « Centre d'alertes » → scroll smooth vers #alertes
  useEffect(() => {
    if (location.hash === '#alertes') {
      const t = setTimeout(() => {
        document.getElementById('alertes')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 150)
      return () => clearTimeout(t)
    }
  }, [location.hash])

  const prevMonth = () => {
    setDirection(-1)
    setMonth((m) => addMonths(m, -1))
  }
  const nextMonth = () => {
    setDirection(1)
    setMonth((m) => addMonths(m, 1))
  }
  const goToday = () => {
    setDirection(0)
    setMonth(startOfMonth(new Date()))
  }

  /** Report d'une échéance (toast + Annuler) */
  const report = useCallback((event: CalendarEvent, newDateISO: string) => {
    setOverrides((prev) => ({ ...prev, [event.id]: newDateISO }))
    toast.success(`Échéance reportée au ${formatDateShort(newDateISO)}`, {
      description: event.libelle,
      action: {
        label: 'Annuler',
        onClick: () =>
          setOverrides((prev) => {
            const next = { ...prev }
            delete next[event.id]
            return next
          }),
      },
    })
  }, [])

  /** Drop d'une pill sur un jour (conserve l'heure d'origine) */
  const dropEvent = useCallback(
    (eventId: string, day: Date) => {
      const event = mergedEvents.find((e) => e.id === eventId)
      if (!event || event.type === 't1') return
      const prev = new Date(event.date)
      const next = new Date(day)
      next.setHours(prev.getHours(), prev.getMinutes(), 0, 0)
      if (next.getTime() === prev.getTime()) return
      report(event, next.toISOString())
    },
    [mergedEvents, report],
  )

  /** Ajout d'une échéance manuelle (persistée via le store) */
  const handleAddEvent = useCallback(
    (input: NewEventInput) => {
      addEvent({
        id: newEventId(),
        date: input.date,
        type: input.type,
        libelle: input.libelle,
        containerId: input.containerId,
      })
      toast.success(`Échéance ajoutée le ${formatDateShort(input.date)}`, { description: input.libelle })
    },
    [addEvent],
  )

  const monthLabel = format(month, 'MMMM yyyy', { locale: fr })

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: EASE_OUT_EXPO }}
      className="space-y-5"
    >
      {/* Caption contextuel (design : « Janvier 2025 · 6 événements à venir ») */}
      <p className="text-[13px] text-ink-600">
        <span className="font-semibold text-ink-900 capitalize">{monthLabel}</span>
        {' · '}
        {aVenir} événement{aVenir > 1 ? 's' : ''} à venir
      </p>

      {/* 1 + 2. Calendrier mensuel & agenda latéral */}
      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <MonthGrid
            month={month}
            direction={direction}
            events={mergedEvents}
            containers={containers}
            onPrevMonth={prevMonth}
            onNextMonth={nextMonth}
            onToday={goToday}
            onReport={report}
            onAddEvent={handleAddEvent}
            onDropEvent={dropEvent}
          />
        </div>
        <div className="lg:sticky lg:top-20 lg:col-span-4">
          <AgendaLateral events={mergedEvents} containers={containers} onReport={report} />
        </div>
      </div>

      {/* 3. Centre d'alertes (pleine largeur, ancre #alertes) */}
      <CentreAlertes onContactTransitaire={(alert) => setTransitaireAlert(alert)} />

      {/* Drawer « Contacter le transitaire » */}
      <TransitaireDrawer
        alert={transitaireAlert ?? lastTransitaire}
        open={Boolean(transitaireAlert)}
        onClose={() => setTransitaireAlert(null)}
      />
    </motion.div>
  )
}
