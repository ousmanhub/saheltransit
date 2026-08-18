// EventPopover — popover de détail d'un événement (design/calendar.md §1)
// Type (badge) · container (lien fiche) · description · « Ouvrir le dossier » /
// « Reporter… » (date picker). Les échéances T1 auto ne sont pas déplaçables.

import { useState } from 'react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { format } from 'date-fns'
import { ArrowRight, CalendarClock, Lock } from 'lucide-react'
import type { CalendarEvent, Container } from '@/lib/types'
import { EVENT_TYPE_META } from '@/lib/types'
import { formatFullDate } from '@/lib/format'
import { EVENT_TINTS, eventDescription } from '@/components/calendar/calUtils'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Input } from '@/components/ui/input'

interface EventPopoverProps {
  event: CalendarEvent
  container?: Container
  onReport: (event: CalendarEvent, newDateISO: string) => void
  /** Déclencheur (pill, ligne d'agenda…) */
  children: ReactNode
  side?: 'top' | 'bottom' | 'left' | 'right'
}

export default function EventPopover({ event, container, onReport, children, side = 'top' }: EventPopoverProps) {
  const [open, setOpen] = useState(false)
  const [reporting, setReporting] = useState(false)
  const [dateStr, setDateStr] = useState(() => format(new Date(event.date), 'yyyy-MM-dd'))
  const navigate = useNavigate()
  const typeMeta = EVENT_TYPE_META[event.type]
  const tint = EVENT_TINTS[event.type]
  const isT1 = event.type === 't1'

  const openDossier = () => {
    setOpen(false)
    if (container) navigate(`/containers/${container.id}`)
  }

  const confirmReport = () => {
    const prev = new Date(event.date)
    const [y, m, d] = dateStr.split('-').map(Number)
    if (!y || !m || !d) return
    const next = new Date(prev)
    next.setFullYear(y, m - 1, d)
    onReport(event, next.toISOString())
    setReporting(false)
    setOpen(false)
  }

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        if (o) {
          setReporting(false)
          setDateStr(format(new Date(event.date), 'yyyy-MM-dd'))
        }
      }}
    >
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent side={side} align="start" className="w-80 p-0">
        <div className="border-b border-border px-4 py-3">
          <span
            className="inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold"
            style={{ backgroundColor: tint.bg, color: tint.text }}
          >
            <span className="size-1.5 rounded-full" style={{ backgroundColor: tint.dot }} />
            {typeMeta.label}
          </span>
          <p className="mt-2 text-sm leading-5 font-semibold text-ink-900">{event.libelle}</p>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-400 capitalize">
            <CalendarClock size={12} strokeWidth={1.75} />
            {formatFullDate(event.date)}
            {!isT1 && (
              <span className="font-mono normal-case">· {format(new Date(event.date), 'HH:mm')}</span>
            )}
          </p>
        </div>

        <div className="px-4 py-3">
          {container && (
            <button
              type="button"
              onClick={openDossier}
              className="mb-2 flex w-full items-center justify-between rounded-lg border border-border px-3 py-2 text-left transition-colors hover:bg-subtle"
            >
              <span className="min-w-0">
                <span className="block font-mono text-xs font-semibold text-ink-900">{container.numero}</span>
                <span className="block truncate text-xs text-ink-400">{container.contenu}</span>
              </span>
              <ArrowRight size={14} strokeWidth={1.75} className="shrink-0 text-ink-400" />
            </button>
          )}
          <p className="text-[13px] leading-[18px] text-ink-600">{eventDescription(event, container)}</p>

          {isT1 && (
            <p className="mt-2 flex items-start gap-1.5 text-xs text-ink-400">
              <Lock size={12} strokeWidth={1.75} className="mt-0.5 shrink-0" />
              Échéance calculée depuis la date d’émission du T1 — non déplaçable.
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 border-t border-border px-4 py-3">
          {container && (
            <button
              type="button"
              onClick={openDossier}
              className="flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg bg-sand-500 text-xs font-semibold text-white transition-colors hover:bg-sand-600"
            >
              Ouvrir le dossier
              <ArrowRight size={13} strokeWidth={1.75} />
            </button>
          )}
          {!isT1 && !reporting && (
            <button
              type="button"
              onClick={() => setReporting(true)}
              className="flex h-8 items-center justify-center gap-1.5 rounded-lg border border-border px-3 text-xs font-semibold text-ink-600 transition-colors hover:bg-subtle"
            >
              Reporter…
            </button>
          )}
        </div>

        {!isT1 && reporting && (
          <div className="flex items-center gap-2 border-t border-border bg-subtle/50 px-4 py-3">
            <Input
              type="date"
              value={dateStr}
              onChange={(e) => setDateStr(e.target.value)}
              className="h-8 text-[13px]"
              lang="fr"
            />
            <button
              type="button"
              onClick={confirmReport}
              className="h-8 shrink-0 rounded-lg bg-sand-500 px-3 text-xs font-semibold text-white transition-colors hover:bg-sand-600"
            >
              Confirmer
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
