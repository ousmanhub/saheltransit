// CorridorStepper — composant signature (design.md §4.1)
// Deux variantes : « full » (fiche container) et « mini » (cartes / listes).

import { Fragment } from 'react'
import {
  Anchor,
  Check,
  ClipboardList,
  FileSearch,
  Flag,
  MapPin,
  Ship,
  Stamp,
  Truck,
  Warehouse,
} from 'lucide-react'
import type { ContainerStatus } from '@/lib/types'
import { CONTAINER_STATUSES, STATUS_META } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

const STATUS_ICONS = { ClipboardList, Ship, Anchor, Truck, Flag, FileSearch, Stamp, Warehouse }

export function StatusIcon({ statut, size = 18, className }: { statut: ContainerStatus; size?: number; className?: string }) {
  const Icon = STATUS_ICONS[STATUS_META[statut].icon]
  return <Icon size={size} strokeWidth={1.75} className={className} />
}

interface CorridorStepperProps {
  statut: ContainerStatus
  variant?: 'full' | 'mini'
  /** Pastille de localisation sous l'étape courante (variante full) */
  localisation?: string
  balise?: string
  className?: string
}

export default function CorridorStepper({ statut, variant = 'full', localisation, balise, className }: CorridorStepperProps) {
  const current = CONTAINER_STATUSES.indexOf(statut)

  if (variant === 'mini') {
    return (
      <TooltipProvider delayDuration={150}>
        <div className={cn('flex w-full items-center gap-[3px]', className)} role="img" aria-label={`Étape ${current + 1} sur 8 : ${STATUS_META[statut].label}`}>
          {CONTAINER_STATUSES.map((s, i) => {
            const meta = STATUS_META[s]
            const passed = i < current
            const isCurrent = i === current
            return (
              <Tooltip key={s}>
                <TooltipTrigger asChild>
                  <span
                    className={cn('relative h-1 flex-1 overflow-hidden rounded-full', !passed && !isCurrent && 'bg-subtle')}
                    style={passed || isCurrent ? { backgroundColor: passed ? meta.dot : meta.dot } : undefined}
                  >
                    {isCurrent && <span className="stepper-shimmer absolute inset-0 animate-shimmer" />}
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  {i + 1} · {meta.label}
                </TooltipContent>
              </Tooltip>
            )
          })}
        </div>
      </TooltipProvider>
    )
  }

  // Variante « full » : cercles 36px + labels + halo pulsant sur l'étape courante
  return (
    <div className={cn('w-full', className)}>
      <ol className="flex items-start">
        {CONTAINER_STATUSES.map((s, i) => {
          const meta = STATUS_META[s]
          const passed = i < current
          const isCurrent = i === current
          return (
            <Fragment key={s}>
              {i > 0 && (
                <span
                  className="mt-[17px] h-0.5 flex-1 rounded-full"
                  style={{ backgroundColor: i <= current ? STATUS_META[CONTAINER_STATUSES[i - 1]].dot : '#EEF0F3' }}
                />
              )}
              <li className="flex w-9 shrink-0 flex-col items-center gap-1.5">
                <span className="relative flex size-9 items-center justify-center">
                  {isCurrent && (
                    <span
                      className="absolute inset-0 animate-pulse-ring rounded-full"
                      style={{ backgroundColor: meta.dot }}
                    />
                  )}
                  <span
                    className={cn('relative flex size-9 items-center justify-center rounded-full')}
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
                    ) : isCurrent ? (
                      <span style={{ color: meta.color }} className="flex">
                        <StatusIcon statut={s} size={16} />
                      </span>
                    ) : (
                      <StatusIcon statut={s} size={16} className="text-ink-400" />
                    )}
                  </span>
                </span>
                <span
                  className={cn('max-w-16 text-center text-[10px] leading-3 font-medium', isCurrent ? 'font-semibold' : '')}
                  style={{ color: isCurrent ? meta.color : passed ? '#4B5563' : '#9AA3AD' }}
                >
                  {meta.label}
                </span>
              </li>
            </Fragment>
          )
        })}
      </ol>
      {(localisation || balise) && (
        <div
          className="mt-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
          style={{ backgroundColor: STATUS_META[statut].bg, color: STATUS_META[statut].color }}
        >
          <MapPin size={12} strokeWidth={2} />
          {localisation}
          {balise && <span className="font-mono text-[11px] opacity-80">· balise {balise}</span>}
        </div>
      )}
    </div>
  )
}
