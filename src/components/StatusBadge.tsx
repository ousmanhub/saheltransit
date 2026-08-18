// StatusBadge — pill de statut container (design.md §4.2)

import type { ContainerStatus } from '@/lib/types'
import { STATUS_META } from '@/lib/types'
import { cn } from '@/lib/utils'

interface StatusBadgeProps {
  statut: ContainerStatus
  /** Variante « outline » pour les tableaux denses */
  variant?: 'soft' | 'outline'
  className?: string
}

export default function StatusBadge({ statut, variant = 'soft', className }: StatusBadgeProps) {
  const meta = STATUS_META[statut]
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold whitespace-nowrap',
        variant === 'outline' && 'border bg-white',
        className,
      )}
      style={
        variant === 'soft'
          ? { backgroundColor: meta.bg, color: meta.color }
          : { borderColor: `${meta.color}55`, color: meta.color }
      }
    >
      <span className="size-1.5 rounded-full" style={{ backgroundColor: meta.dot }} />
      {meta.label}
    </span>
  )
}
