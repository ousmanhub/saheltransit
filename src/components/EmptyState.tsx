// EmptyState — état vide avec illustration (design.md §4.10)

import { CheckCircle2 } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  title: string
  description?: string
  /** CTA (bouton) */
  action?: ReactNode
  /** Variante positive : dot emerald au lieu de l'illustration */
  positive?: boolean
  className?: string
}

export default function EmptyState({ title, description, action, positive = false, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-6 py-10 text-center', className)}>
      {positive ? (
        <span className="flex size-12 items-center justify-center rounded-full bg-[#ECFDF5]">
          <CheckCircle2 size={24} strokeWidth={1.75} className="text-[#059669]" />
        </span>
      ) : (
        <img src="/empty-state.svg" alt="" className="h-32 w-auto opacity-90" loading="lazy" />
      )}
      <h3 className="font-h3 mt-4 text-ink-900">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-[13px] leading-[18px] text-ink-600">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
