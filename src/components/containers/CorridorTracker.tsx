// Suivi du corridor — fiche container (container-detail.md §2).
// Stepper full animé (ligne scaleX, pop stagger, halo) + dates + bandeau position.

import { Fragment, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Check, ChevronDown, MapPin } from 'lucide-react'
import type { Container, ContainerStatus } from '@/lib/types'
import { CONTAINER_STATUSES, STATUS_META } from '@/lib/types'
import { useStore } from '@/lib/store'
import { daysUntil, formatDateShort } from '@/lib/format'
import { cn } from '@/lib/utils'
import { StatusIcon } from '@/components/CorridorStepper'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { applyStatusChange, EASE_OUT_EXPO } from './utils'

// ─── Dates affichées sous les étapes ─────────────────────────────────────────

function stepDate(c: Container, s: ContainerStatus): string | null {
  switch (s) {
    case 'preparation':
      return c.createdAt ? `Cmd. ${formatDateShort(c.createdAt)}` : null
    case 'mer':
      return c.embarquement ? `Emb. ${formatDateShort(c.embarquement)}` : null
    case 'douala':
      return c.arrivee ? `Arr. ${formatDateShort(c.arrivee)}` : null
    case 'livre':
      return c.livraison ? `Livré ${formatDateShort(c.livraison)}` : null
    default:
      return null
  }
}

/** Date de référence de l'étape courante (pour « en cours depuis N j ») */
function currentSince(c: Container): string | null {
  switch (c.statut) {
    case 'mer':
      return c.embarquement ?? c.createdAt
    case 'douala':
      return c.arrivee ?? null
    case 'livre':
      return c.livraison ?? null
    default:
      return c.arrivee ?? c.embarquement ?? c.createdAt
  }
}

// ─── Bandeau position ────────────────────────────────────────────────────────

function PositionBanner({ c }: { c: Container }) {
  const t1Days = c.t1 ? daysUntil(c.t1.limite) : null
  const t1Elapsed = c.t1 ? Math.min(7, Math.max(0, 7 - t1Days!)) : 0

  let main: React.ReactNode
  if (c.statut === 'mer') {
    main = (
      <>
        <strong className="font-semibold text-ink-900">
          Position estimée : océan Indien — escale prévue Port Louis
        </strong>{' '}
        · Balise NEXUS active dès le transit terrestre
      </>
    )
  } else if (c.statut === 'transit' && c.localisation) {
    main = (
      <>
        <strong className="font-semibold text-ink-900">
          📍 {c.localisation}
          {c.balise && <span className="font-mono text-[13px]"> · balise {c.balise}</span>}
        </strong>
        {c.t1 && (
          <>
            {' '}
            · T1 valable jusqu'au {formatDateShort(c.t1.limite)} ({Math.max(t1Days ?? 0, 0)} j)
          </>
        )}
      </>
    )
  } else if (c.localisation) {
    main = (
      <strong className="font-semibold text-ink-900">
        📍 {c.localisation} — {STATUS_META[c.statut].label}
      </strong>
    )
  } else {
    main = (
      <strong className="font-semibold text-ink-900">
        {STATUS_META[c.statut].label} — {c.origine} → {c.destination}
      </strong>
    )
  }

  return (
    <div className="mt-6 flex flex-col gap-4 rounded-lg bg-subtle px-4 py-3 sm:flex-row sm:items-center">
      <img
        src="/corridor-map.svg"
        alt="Carte du corridor Douala → N'Djamena"
        className="w-[120px] shrink-0 rounded-md border border-border"
        loading="lazy"
      />
      <div className="min-w-0 flex-1">
        <p className="text-[13px] leading-[18px] text-ink-600">{main}</p>
        <p className="mt-1 text-xs text-ink-400">Dernière mise à jour : aujourd'hui 08:12</p>
        {c.t1 && (
          <div className="mt-2 max-w-xs">
            <div className="h-1.5 overflow-hidden rounded-full bg-white">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(t1Elapsed / 7) * 100}%` }}
                transition={{ duration: 0.6, ease: EASE_OUT_EXPO }}
                className={cn('h-full rounded-full', (t1Days ?? 99) <= 2 ? 'bg-[#DC2626]' : 'bg-sand-500')}
              />
            </div>
            <p className="mt-1 text-[11px] font-medium text-ink-400">
              Compte à rebours T1 : {t1Elapsed}/7 jours écoulés
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Tracker ─────────────────────────────────────────────────────────────────

export default function CorridorTracker({ c }: { c: Container }) {
  const { updateContainerStatus } = useStore()
  const current = CONTAINER_STATUSES.indexOf(c.statut)
  const progress = current / (CONTAINER_STATUSES.length - 1)
  const since = useMemo(() => currentSince(c), [c])
  const sinceDays = since ? Math.max(0, -daysUntil(since)) : null

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1, ease: EASE_OUT_EXPO }}
      className="rounded-xl bg-white px-8 py-6 shadow-card"
      aria-label="Suivi du corridor"
    >
      {/* Stepper horizontal (≥ md) */}
      <div className="relative hidden md:block">
        {/* Ligne de fond + progression animée */}
        <div className="absolute top-[17px] right-4 left-4 h-0.5 rounded-full bg-subtle" />
        <motion.div
          className="absolute top-[17px] left-4 h-0.5 origin-left rounded-full bg-gradient-to-r from-[#64748B] via-[#0EA5E9] to-sand-500"
          style={{ right: 'auto', width: `calc((100% - 32px) * 1)` }}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: progress }}
          transition={{ duration: 0.9, ease: EASE_OUT_EXPO }}
        />
        <ol className="relative flex items-start">
          {CONTAINER_STATUSES.map((s, i) => {
            const meta = STATUS_META[s]
            const passed = i < current
            const isCurrent = i === current
            const date = stepDate(c, s)
            const circle = (
              <motion.span
                initial={{ scale: passed ? 0.6 : 1, opacity: passed ? 0 : 1 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={
                  passed
                    ? { type: 'spring', stiffness: 260, damping: 20, delay: 0.15 + i * 0.08 }
                    : { duration: 0.2 }
                }
                className="relative flex size-9 items-center justify-center"
              >
                {isCurrent && (
                  <span className="absolute inset-0 animate-pulse-ring rounded-full" style={{ backgroundColor: meta.dot }} />
                )}
                <span
                  className="relative flex size-9 items-center justify-center rounded-full"
                  style={
                    passed
                      ? { backgroundColor: meta.dot }
                      : isCurrent
                        ? { backgroundColor: '#FFFFFF', border: `2px solid ${meta.color}` }
                        : { backgroundColor: '#EEF0F3' }
                  }
                >
                  {passed ? (
                    <Check size={16} strokeWidth={2.5} color="#FFFFFF" />
                  ) : (
                    <span style={isCurrent ? { color: meta.color } : undefined} className={cn('flex', !isCurrent && 'text-ink-400')}>
                      <StatusIcon statut={s} size={16} />
                    </span>
                  )}
                </span>
              </motion.span>
            )

            return (
              <Fragment key={s}>
                {i > 0 && <span className="mt-[17px] h-0.5 flex-1" />}
                <li className="flex w-9 shrink-0 flex-col items-center gap-1.5">
                  {passed ? (
                    <Popover>
                      <PopoverTrigger asChild>
                        <button type="button" className="rounded-full" aria-label={`Détail de l'étape ${meta.label}`}>
                          {circle}
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-64 p-3">
                        <p className="flex items-center gap-2 text-[13px] font-semibold text-ink-900">
                          <span className="size-2 rounded-full" style={{ backgroundColor: meta.dot }} />
                          {meta.label}
                        </p>
                        <dl className="mt-2 space-y-1 text-xs text-ink-600">
                          {date && (
                            <div className="flex justify-between">
                              <dt className="text-ink-400">Date</dt>
                              <dd>{date}</dd>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <dt className="text-ink-400">Validé par</dt>
                            <dd>Mahamat Abakar</dd>
                          </div>
                          <div className="flex justify-between">
                            <dt className="text-ink-400">Note</dt>
                            <dd>Étape confirmée sans réserve</dd>
                          </div>
                        </dl>
                      </PopoverContent>
                    </Popover>
                  ) : (
                    circle
                  )}
                  <span
                    className={cn('max-w-16 text-center text-[10px] leading-3 font-medium', isCurrent && 'font-semibold')}
                    style={{ color: isCurrent ? meta.color : passed ? '#4B5563' : '#9AA3AD' }}
                  >
                    {meta.label}
                  </span>
                  {passed && date && <span className="text-[10px] leading-3 text-ink-400">{date}</span>}
                  {isCurrent && sinceDays !== null && (
                    <span className="text-[10px] leading-3 font-medium text-ink-400">
                      en cours depuis {sinceDays} j
                    </span>
                  )}
                </li>
              </Fragment>
            )
          })}
        </ol>
        {/* Pastille localisation */}
        {(c.localisation || c.balise) && (
          <div
            className="mt-4 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
            style={{ backgroundColor: STATUS_META[c.statut].bg, color: STATUS_META[c.statut].color }}
          >
            <MapPin size={12} strokeWidth={2} />
            {c.localisation ?? STATUS_META[c.statut].label}
            {c.balise && <span className="font-mono text-[11px] opacity-80">· balise {c.balise}</span>}
          </div>
        )}
      </div>

      {/* Stepper vertical compact (< md) */}
      <ol className="md:hidden">
        {CONTAINER_STATUSES.map((s, i) => {
          const meta = STATUS_META[s]
          const passed = i < current
          const isCurrent = i === current
          return (
            <li key={s} className="relative flex items-center gap-3 pb-4 last:pb-0">
              {i < CONTAINER_STATUSES.length - 1 && (
                <span
                  className="absolute top-7 left-[13px] h-[calc(100%-20px)] w-0.5"
                  style={{ backgroundColor: passed ? meta.dot : '#EEF0F3' }}
                />
              )}
              <span
                className="relative flex size-7 shrink-0 items-center justify-center rounded-full"
                style={
                  passed
                    ? { backgroundColor: meta.dot }
                    : isCurrent
                      ? { backgroundColor: '#FFFFFF', border: `2px solid ${meta.color}` }
                      : { backgroundColor: '#EEF0F3' }
                }
              >
                {passed ? (
                  <Check size={13} strokeWidth={2.5} color="#FFFFFF" />
                ) : (
                  <span style={isCurrent ? { color: meta.color } : undefined} className={cn('flex', !isCurrent && 'text-ink-400')}>
                    <StatusIcon statut={s} size={13} />
                  </span>
                )}
              </span>
              <span
                className={cn('text-[13px]', isCurrent ? 'font-semibold' : 'font-medium')}
                style={{ color: isCurrent ? meta.color : passed ? '#4B5563' : '#9AA3AD' }}
              >
                {meta.label}
              </span>
              {passed && stepDate(c, s) && <span className="ml-auto text-[11px] text-ink-400">{stepDate(c, s)}</span>}
            </li>
          )
        })}
      </ol>

      {/* Bouton « Mettre à jour le statut » */}
      <div className="mt-4 flex justify-end border-t border-border pt-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-white px-3 text-[13px] font-medium text-ink-600 transition-colors hover:bg-subtle"
            >
              Mettre à jour le statut
              <ChevronDown size={14} className="text-ink-400" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="text-xs">Changer de statut</DropdownMenuLabel>
            {CONTAINER_STATUSES.map((s) => (
              <DropdownMenuItem
                key={s}
                disabled={s === c.statut}
                onSelect={() => applyStatusChange(c, s, updateContainerStatus)}
                className="gap-2 text-[13px]"
              >
                <span className="size-2 rounded-full" style={{ backgroundColor: STATUS_META[s].dot }} />
                {STATUS_META[s].label}
                {s === c.statut && <Check size={14} className="ml-auto" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <PositionBanner c={c} />
    </motion.section>
  )
}
