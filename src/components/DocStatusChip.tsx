// DocStatusChip — chip de statut document, cycle cliquable + menu contextuel (design.md §4.3)
// Cycle : Manquant → Demandé → Reçu → Validé ; « Non requis » via le menu.

import { AlertCircle, Check, CheckCircle2, ChevronDown, Clock, FileCheck, MinusCircle } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import type { DocStatus } from '@/lib/types'
import { DOC_STATUS_CYCLE, DOC_STATUS_META } from '@/lib/types'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const DOC_ICONS = { AlertCircle, Clock, FileCheck, CheckCircle2, MinusCircle }

export function DocStatusIcon({ statut, size = 14 }: { statut: DocStatus; size?: number }) {
  const Icon = DOC_ICONS[DOC_STATUS_META[statut].icon]
  return <Icon size={size} strokeWidth={1.75} />
}

interface DocStatusChipProps {
  statut: DocStatus
  /** Si absent, le chip est en lecture seule */
  onChange?: (statut: DocStatus) => void
  className?: string
}

export default function DocStatusChip({ statut, onChange, className }: DocStatusChipProps) {
  const meta = DOC_STATUS_META[statut]
  const clickable = Boolean(onChange)

  const cycle = () => {
    if (!onChange) return
    const idx = DOC_STATUS_CYCLE.indexOf(statut)
    const next = DOC_STATUS_CYCLE[(idx + 1) % DOC_STATUS_CYCLE.length]
    onChange(next)
  }

  const content = (
    <>
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={statut}
          className="flex"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 24, duration: 0.18 }}
        >
          <DocStatusIcon statut={statut} />
        </motion.span>
      </AnimatePresence>
      {meta.label}
    </>
  )

  const chipClass = cn(
    'inline-flex h-[26px] items-center gap-1.5 rounded-lg text-xs font-medium whitespace-nowrap select-none',
    clickable && 'transition-shadow duration-150 hover:shadow-raised',
    className,
  )

  if (!onChange) {
    return (
      <span className={cn(chipClass, 'px-2')} style={{ backgroundColor: meta.bg, color: meta.color }}>
        {content}
      </span>
    )
  }

  // Clic sur le corps = cycle Manquant → Demandé → Reçu → Validé
  // Clic sur le chevron = menu contextuel (4 options + « Non requis »)
  return (
    <span
      className={cn(chipClass, 'pr-1 pl-2')}
      style={{ backgroundColor: meta.bg, color: meta.color }}
    >
      <button type="button" onClick={cycle} className="flex items-center gap-1.5 rounded-md" aria-label={`Statut : ${meta.label} — cliquer pour changer`}>
        {content}
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" className="flex rounded-md p-0.5 hover:bg-black/5" aria-label="Choisir un statut">
            <ChevronDown size={12} className="opacity-60" />
          </button>
        </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-44">
        {DOC_STATUS_CYCLE.map((s) => (
          <DropdownMenuItem key={s} onSelect={() => onChange(s)} className="gap-2 text-[13px]">
            <span style={{ color: DOC_STATUS_META[s].color }} className="flex">
              <DocStatusIcon statut={s} />
            </span>
            {DOC_STATUS_META[s].label}
            {s === statut && <Check size={14} className="ml-auto" />}
          </DropdownMenuItem>
        ))}
        <DropdownMenuItem onSelect={() => onChange('non_requis')} className="gap-2 text-[13px]">
          <span style={{ color: DOC_STATUS_META.non_requis.color }} className="flex">
            <DocStatusIcon statut="non_requis" />
          </span>
          Non requis
          {statut === 'non_requis' && <Check size={14} className="ml-auto" />}
        </DropdownMenuItem>
      </DropdownMenuContent>
      </DropdownMenu>
    </span>
  )
}
