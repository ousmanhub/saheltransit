// MonthGrid — calendrier mensuel (design/calendar.md §1)
// Grille 7 colonnes lun→dim, pills colorées empilées (max 3 + « +N »),
// drag & drop des échéances (sauf T1 auto), ajout au clic sur cellule vide,
// transition de mois directionnelle, vague d'entrée, pastille jour courant.
// <768px : vue agenda (liste des jours du mois), drag désactivé.

import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  addDays,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import { fr } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import type { CalendarEvent, Container } from '@/lib/types'
import { cn } from '@/lib/utils'
import { useIsMobile } from '@/hooks/use-mobile'
import { EVENT_TINTS, LEGEND, pillLabel } from '@/components/calendar/calUtils'
import EventPopover from '@/components/calendar/EventPopover'
import type { NewEventInput } from '@/components/calendar/AddEventForm'
import AddEventForm from '@/components/calendar/AddEventForm'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

const EASE_OUT_EXPO = [0.22, 1, 0.36, 1] as [number, number, number, number]
const WEEKDAYS = ['lun', 'mar', 'mer', 'jeu', 'ven', 'sam', 'dim']
const MAX_PILLS = 3

// ─── Pill d'événement ────────────────────────────────────────────────────────

interface PillProps {
  event: CalendarEvent
  container?: Container
  onReport: (event: CalendarEvent, newDateISO: string) => void
  dragEnabled: boolean
  compact?: boolean
}

function EventPill({ event, container, onReport, dragEnabled, compact = false }: PillProps) {
  const [dragging, setDragging] = useState(false)
  const tint = EVENT_TINTS[event.type]
  const isT1 = event.type === 't1'
  const past = startOfDay(new Date(event.date)) < startOfDay(new Date())

  const pill = (
    <button
      type="button"
      draggable={dragEnabled && !isT1}
      onDragStart={(e) => {
        e.dataTransfer.setData('text/sahel-event', event.id)
        e.dataTransfer.effectAllowed = 'move'
        setDragging(true)
      }}
      onDragEnd={() => setDragging(false)}
      onClick={(e) => e.stopPropagation()}
      className={cn(
        'flex h-5 w-full items-center gap-1 rounded px-1.5 text-left text-[11px] leading-4 font-semibold whitespace-nowrap transition-shadow',
        past && 'opacity-50',
        dragging && 'scale-105 shadow-raised',
        isT1 ? 'cursor-not-allowed' : dragEnabled ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer',
      )}
      style={{ backgroundColor: tint.bg, color: tint.text }}
    >
      <span className="size-1 shrink-0 rounded-full" style={{ backgroundColor: tint.dot }} />
      <span className="truncate">{compact ? event.libelle : pillLabel(event, container)}</span>
    </button>
  )

  const content = <EventPopover event={event} container={container} onReport={onReport} side="top">{pill}</EventPopover>

  if (!isT1) return content
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="block">{content}</span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-56 text-xs">
        Échéance calculée depuis la date d’émission du T1
      </TooltipContent>
    </Tooltip>
  )
}

// ─── Cellule de jour ─────────────────────────────────────────────────────────

interface DayCellProps {
  day: Date
  month: Date
  events: { event: CalendarEvent; container?: Container }[]
  containers: Container[]
  onReport: (event: CalendarEvent, newDateISO: string) => void
  onAddEvent: (input: NewEventInput) => void
  onDropEvent: (eventId: string, day: Date) => void
  dragTarget: string | null
  setDragTarget: (day: string | null) => void
  dragEnabled: boolean
  enterDelay: number
}

function DayCell({ day, month, events, containers, onReport, onAddEvent, onDropEvent, dragTarget, setDragTarget, dragEnabled, enterDelay }: DayCellProps) {
  const [addOpen, setAddOpen] = useState(false)
  const dayKey = format(day, 'yyyy-MM-dd')
  const inMonth = isSameMonth(day, month)
  const today = isToday(day)
  const visible = events.slice(0, MAX_PILLS)
  const extra = events.slice(MAX_PILLS)
  const isTarget = dragTarget === dayKey

  return (
    <Popover open={addOpen} onOpenChange={setAddOpen}>
      <PopoverTrigger asChild>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.25, delay: enterDelay }}
          onDragOver={(e) => {
            if (e.dataTransfer.types.includes('text/sahel-event')) {
              e.preventDefault()
              e.dataTransfer.dropEffect = 'move'
              if (!isTarget) setDragTarget(dayKey)
            }
          }}
          onDragLeave={() => {
            if (isTarget) setDragTarget(null)
          }}
          onDrop={(e) => {
            e.preventDefault()
            setDragTarget(null)
            const id = e.dataTransfer.getData('text/sahel-event')
            if (id) onDropEvent(id, day)
          }}
          className={cn(
            'h-[104px] cursor-pointer overflow-hidden bg-white p-1.5 transition-colors',
            isTarget && 'bg-sand-100',
          )}
          role="button"
          aria-label={`Jour ${format(day, 'd MMMM', { locale: fr })} — cliquer pour ajouter une échéance`}
        >
          <div className="flex h-full flex-col">
            <div className="flex items-start justify-between">
              {today ? (
                <span className="relative flex size-5 items-center justify-center">
                  <span className="absolute size-full animate-pulse-ring rounded-full bg-sand-500" />
                  <span className="relative flex size-5 items-center justify-center rounded-full bg-sand-500 text-[11px] leading-4 font-semibold text-white">
                    {format(day, 'd')}
                  </span>
                </span>
              ) : (
                <span
                  className={cn(
                    'px-0.5 text-xs leading-5 font-medium',
                    inMonth ? 'text-ink-600' : 'text-ink-400/40',
                  )}
                >
                  {format(day, 'd')}
                </span>
              )}
            </div>
            <div className="mt-1 space-y-0.5" onClick={(e) => e.stopPropagation()}>
              {visible.map(({ event, container }) => (
                <EventPill key={event.id} event={event} container={container} onReport={onReport} dragEnabled={dragEnabled} />
              ))}
              {extra.length > 0 && (
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="flex h-5 w-full items-center rounded px-1.5 text-left text-[11px] leading-4 font-semibold text-ink-400 transition-colors hover:bg-subtle hover:text-ink-600"
                    >
                      +{extra.length} autre{extra.length > 1 ? 's' : ''}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent side="right" align="start" className="w-72 p-2">
                    <p className="px-1.5 pb-1.5 text-xs font-semibold text-ink-600 capitalize">
                      {format(day, 'EEEE d MMMM', { locale: fr })}
                    </p>
                    <div className="space-y-0.5">
                      {extra.map(({ event, container }) => (
                        <EventPill key={event.id} event={event} container={container} onReport={onReport} dragEnabled={false} />
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              )}
            </div>
          </div>
        </motion.div>
      </PopoverTrigger>
      <PopoverContent side="right" align="start" className="w-80 p-4">
        <p className="mb-3 text-sm font-semibold text-ink-900">
          + Échéance le {format(day, 'd MMM', { locale: fr })}
        </p>
        <AddEventForm
          containers={containers}
          fixedDate={day}
          onSubmit={(input) => {
            onAddEvent(input)
            setAddOpen(false)
          }}
          onCancel={() => setAddOpen(false)}
        />
      </PopoverContent>
    </Popover>
  )
}

// ─── Grille mensuelle ────────────────────────────────────────────────────────

interface MonthGridProps {
  month: Date
  direction: number
  events: CalendarEvent[]
  containers: Container[]
  onPrevMonth: () => void
  onNextMonth: () => void
  onToday: () => void
  onReport: (event: CalendarEvent, newDateISO: string) => void
  onAddEvent: (input: NewEventInput) => void
  /** Déplacement d'un événement par id vers un jour (drag & drop) */
  onDropEvent: (eventId: string, day: Date) => void
}

export default function MonthGrid({ month, direction, events, containers, onPrevMonth, onNextMonth, onToday, onReport, onAddEvent, onDropEvent }: MonthGridProps) {
  const isMobile = useIsMobile()
  const [dragTarget, setDragTarget] = useState<string | null>(null)
  const [addGlobalOpen, setAddGlobalOpen] = useState(false)

  const containerById = useMemo(() => new Map(containers.map((c) => [c.id, c])), [containers])

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 })
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 })
    const out: Date[] = []
    let d = start
    while (d <= end) {
      out.push(d)
      d = addDays(d, 1)
    }
    return out
  }, [month])

  const eventsOfDay = (day: Date) =>
    events
      .filter((e) => isSameDay(new Date(e.date), day))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map((event) => ({ event, container: event.containerId ? containerById.get(event.containerId) : undefined }))

  const monthLabel = format(month, 'MMMM yyyy', { locale: fr })

  return (
    <div className="overflow-hidden rounded-xl bg-white shadow-card">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-border px-4 py-3">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onPrevMonth}
            className="flex size-8 items-center justify-center rounded-lg text-ink-400 transition-colors hover:bg-subtle hover:text-ink-600"
            aria-label="Mois précédent"
          >
            <ChevronLeft size={18} strokeWidth={1.75} />
          </button>
          <h2 className="font-h2 min-w-36 text-center text-ink-900 capitalize">{monthLabel}</h2>
          <button
            type="button"
            onClick={onNextMonth}
            className="flex size-8 items-center justify-center rounded-lg text-ink-400 transition-colors hover:bg-subtle hover:text-ink-600"
            aria-label="Mois suivant"
          >
            <ChevronRight size={18} strokeWidth={1.75} />
          </button>
        </div>
        <button
          type="button"
          onClick={onToday}
          className="h-8 rounded-lg px-3 text-[13px] font-medium text-ink-600 transition-colors hover:bg-subtle"
        >
          Aujourd’hui
        </button>
        {/* Légende */}
        <div className="hidden flex-wrap items-center gap-x-3 gap-y-1 xl:flex">
          {LEGEND.map((l) => (
            <span key={l.type} className="flex items-center gap-1.5 text-xs text-ink-600">
              <span className="size-2 rounded-full" style={{ backgroundColor: EVENT_TINTS[l.type].dot }} />
              {l.label}
            </span>
          ))}
        </div>
        <Popover open={addGlobalOpen} onOpenChange={setAddGlobalOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="ml-auto flex h-8 items-center gap-1.5 rounded-lg border border-sand-500 px-3 text-[13px] font-semibold text-sand-700 transition-colors hover:bg-sand-100"
            >
              <Plus size={14} strokeWidth={2} />
              Échéance
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 p-4">
            <p className="mb-3 text-sm font-semibold text-ink-900">Nouvelle échéance</p>
            <AddEventForm
              containers={containers}
              onSubmit={(input) => {
                onAddEvent(input)
                setAddGlobalOpen(false)
              }}
              onCancel={() => setAddGlobalOpen(false)}
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Corps : grille mois (desktop) ou liste agenda (mobile) */}
      {isMobile ? (
        <MobileAgendaList month={month} events={events} containerById={containerById} onReport={onReport} />
      ) : (
        <AnimatePresence mode="wait" initial={false} custom={direction}>
          <motion.div
            key={format(month, 'yyyy-MM')}
            custom={direction}
            initial={{ opacity: 0, x: direction >= 0 ? 24 : -24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction >= 0 ? -24 : 24 }}
            transition={{ duration: 0.22, ease: EASE_OUT_EXPO }}
          >
            {/* En-têtes de jours */}
            <div className="grid grid-cols-7 gap-px border-b border-border bg-border">
              {WEEKDAYS.map((d) => (
                <div key={d} className="bg-white px-2 py-1.5">
                  <span className="text-overline text-ink-400">{d}</span>
                </div>
              ))}
            </div>
            {/* Cellules */}
            <div className="grid grid-cols-7 gap-px bg-border">
              {days.map((day, i) => (
                <DayCell
                  key={format(day, 'yyyy-MM-dd')}
                  day={day}
                  month={month}
                  events={eventsOfDay(day)}
                  containers={containers}
                  onReport={onReport}
                  onAddEvent={onAddEvent}
                  onDropEvent={onDropEvent}
                  dragTarget={dragTarget}
                  setDragTarget={setDragTarget}
                  dragEnabled={!isMobile}
                  enterDelay={i * 0.008}
                />
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  )
}

// ─── Vue agenda mobile (<768px) ──────────────────────────────────────────────

interface MobileAgendaListProps {
  month: Date
  events: CalendarEvent[]
  containerById: Map<string, Container>
  onReport: (event: CalendarEvent, newDateISO: string) => void
}

function MobileAgendaList({ month, events, containerById, onReport }: MobileAgendaListProps) {
  const daysInMonth = useMemo(() => {
    const start = startOfMonth(month)
    const end = endOfMonth(month)
    const out: Date[] = []
    let d = start
    while (d <= end) {
      out.push(d)
      d = addDays(d, 1)
    }
    return out
  }, [month])

  const withEvents = daysInMonth
    .map((day) => ({
      day,
      items: events
        .filter((e) => isSameDay(new Date(e.date), day))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    }))
    .filter((x) => x.items.length > 0)

  if (withEvents.length === 0) {
    return (
      <p className="px-4 py-8 text-center text-[13px] text-ink-400">
        Aucun événement ce mois-ci — profitez-en pour anticiper les BESC.
      </p>
    )
  }

  return (
    <div className="divide-y divide-border">
      {withEvents.map(({ day, items }) => (
        <div key={format(day, 'yyyy-MM-dd')} className="px-4 py-3">
          <p className="text-xs font-semibold text-ink-900 capitalize">
            {format(day, 'EEEE d MMMM', { locale: fr })}
            {isToday(day) && <span className="ml-2 rounded-full bg-sand-100 px-2 py-0.5 text-[10px] font-semibold text-sand-700">aujourd’hui</span>}
          </p>
          <div className="mt-1.5 space-y-1">
            {items.map((event) => (
              <EventPill
                key={event.id}
                event={event}
                container={event.containerId ? containerById.get(event.containerId) : undefined}
                onReport={onReport}
                dragEnabled={false}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

