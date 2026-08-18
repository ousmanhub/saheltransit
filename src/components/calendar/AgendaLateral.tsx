// AgendaLateral — agenda « À venir » (design/calendar.md §2)
// Sous-onglets 7 j / 30 j / Tout, liste chronologique groupée par jour,
// badge « J−x » rouge < 3 j (pulsant), clic → popover détail.

import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { format, isSameDay, startOfDay } from 'date-fns'
import { fr } from 'date-fns/locale'
import type { CalendarEvent, Container } from '@/lib/types'
import { daysUntil, formatTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import EmptyState from '@/components/EmptyState'
import { EVENT_TINTS } from '@/components/calendar/calUtils'
import EventPopover from '@/components/calendar/EventPopover'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

const EASE_OUT_EXPO = [0.22, 1, 0.36, 1] as [number, number, number, number]

type Horizon = '7' | '30' | 'tout'

interface DayGroup {
  day: Date
  items: { event: CalendarEvent; container?: Container }[]
}

interface AgendaLateralProps {
  events: CalendarEvent[]
  containers: Container[]
  onReport: (event: CalendarEvent, newDateISO: string) => void
}

export default function AgendaLateral({ events, containers, onReport }: AgendaLateralProps) {
  const [horizon, setHorizon] = useState<Horizon>('30')
  const containerById = useMemo(() => new Map(containers.map((c) => [c.id, c])), [containers])

  const groups = useMemo<DayGroup[]>(() => {
    const limit = horizon === 'tout' ? Number.POSITIVE_INFINITY : Number(horizon)
    const upcoming = events
      .filter((e) => {
        const d = daysUntil(e.date)
        return d >= 0 && d <= limit
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    const out: DayGroup[] = []
    for (const event of upcoming) {
      const day = startOfDay(new Date(event.date))
      const last = out[out.length - 1]
      const entry = { event, container: event.containerId ? containerById.get(event.containerId) : undefined }
      if (last && isSameDay(last.day, day)) last.items.push(entry)
      else out.push({ day, items: [entry] })
    }
    return out
  }, [events, horizon, containerById])

  return (
    <div className="overflow-hidden rounded-xl bg-white shadow-card">
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
        <h3 className="font-h3 text-ink-900">À venir</h3>
        <Tabs value={horizon} onValueChange={(v) => setHorizon(v as Horizon)}>
          <TabsList className="h-8">
            <TabsTrigger value="7" className="px-2.5 text-xs">7 j</TabsTrigger>
            <TabsTrigger value="30" className="px-2.5 text-xs">30 j</TabsTrigger>
            <TabsTrigger value="tout" className="px-2.5 text-xs">Tout</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={horizon}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {groups.length === 0 ? (
            <EmptyState
              title="Rien de prévu"
              description="Rien de prévu — profitez-en pour anticiper les BESC."
              className="py-8"
            />
          ) : (
            <ol className="max-h-[520px] overflow-y-auto px-2 py-2">
              {groups.map((group, gi) => {
                const delta = daysUntil(group.day)
                const urgent = delta >= 0 && delta < 3
                return (
                  <motion.li
                    key={format(group.day, 'yyyy-MM-dd')}
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: gi * 0.1, ease: EASE_OUT_EXPO }}
                    className="py-1.5"
                  >
                    {/* Header jour */}
                    <div className="flex items-center gap-2 px-2">
                      <p className="text-[13px] font-semibold text-ink-900 capitalize">
                        {format(group.day, 'EEEE d MMMM', { locale: fr })}
                      </p>
                      {delta === 0 ? (
                        <span className="rounded-full bg-sand-100 px-2 py-0.5 text-[10px] font-semibold text-sand-700">
                          aujourd’hui
                        </span>
                      ) : (
                        urgent && (
                          <span className="animate-soft-pulse rounded-full bg-[#FEF2F2] px-2 py-0.5 text-[10px] font-semibold text-[#DC2626]">
                            J−{delta}
                          </span>
                        )
                      )}
                    </div>
                    {/* Lignes */}
                    <div className="mt-1 space-y-0.5">
                      {group.items.map(({ event, container }, i) => {
                        const tint = EVENT_TINTS[event.type]
                        return (
                          <motion.div
                            key={event.id}
                            initial={{ opacity: 0, x: 16 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.25, delay: gi * 0.1 + i * 0.03, ease: EASE_OUT_EXPO }}
                          >
                            <EventPopover event={event} container={container} onReport={onReport} side="left">
                              <button
                                type="button"
                                className={cn(
                                  'flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors hover:bg-subtle',
                                )}
                              >
                                <span className="w-10 shrink-0 text-right font-mono text-[11px] font-medium text-ink-400">
                                  {event.type === 't1' ? '—' : formatTime(event.date)}
                                </span>
                                <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: tint.dot }} />
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate text-[13px] leading-[18px] font-semibold text-ink-900">
                                    {event.libelle}
                                  </span>
                                  {container && (
                                    <span className="block truncate font-mono text-[11px] leading-4 text-ink-400">
                                      {container.numero}
                                    </span>
                                  )}
                                </span>
                              </button>
                            </EventPopover>
                          </motion.div>
                        )
                      })}
                    </div>
                  </motion.li>
                )
              })}
            </ol>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
