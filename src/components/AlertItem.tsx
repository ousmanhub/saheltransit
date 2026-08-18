// AlertItem — ligne d'alerte avec barre de sévérité (design.md §4.5)

import { AlertTriangle, ArrowRight, CalendarClock, CheckCircle2, FileWarning, Info } from 'lucide-react'
import { useNavigate } from 'react-router'
import type { Alert } from '@/lib/types'
import { SEVERITY_META } from '@/lib/types'
import { relativeTime } from '@/lib/format'
import { useStore } from '@/lib/store'
import { cn } from '@/lib/utils'

const SEVERITY_ICONS = {
  critique: AlertTriangle,
  importante: FileWarning,
  info: CalendarClock,
  positive: CheckCircle2,
} as const

interface AlertItemProps {
  alert: Alert
  /** Version compacte sans bouton d'action (dashboard) */
  compact?: boolean
  className?: string
}

export default function AlertItem({ alert, compact = false, className }: AlertItemProps) {
  const meta = SEVERITY_META[alert.severite]
  const Icon = alert.severite === 'info' ? Info : SEVERITY_ICONS[alert.severite]
  const navigate = useNavigate()
  const { getContainer } = useStore()
  const container = alert.containerId ? getContainer(alert.containerId) : undefined

  const open = () => {
    if (alert.containerId) navigate(`/containers/${alert.containerId}`)
  }

  return (
    <div
      role={alert.containerId ? 'button' : undefined}
      tabIndex={alert.containerId ? 0 : undefined}
      onClick={open}
      onKeyDown={(e) => e.key === 'Enter' && open()}
      className={cn(
        'group relative flex gap-3 rounded-lg py-2.5 pr-2 pl-3 transition-colors duration-150',
        alert.containerId && 'cursor-pointer hover:bg-subtle',
        className,
      )}
    >
      {/* Barre verticale 3px couleur sévérité */}
      <span className="absolute top-2 bottom-2 left-0 w-[3px] rounded-full" style={{ backgroundColor: meta.color }} />
      <span className="relative mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: meta.bg }}>
        <Icon size={16} strokeWidth={1.75} style={{ color: meta.color }} />
        {alert.severite === 'critique' && !alert.lue && (
          <span className="absolute -top-0.5 -right-0.5 flex size-2">
            <span className="absolute inline-flex size-full animate-pulse-ring-fast rounded-full" style={{ backgroundColor: meta.color }} />
            <span className="relative inline-flex size-2 rounded-full" style={{ backgroundColor: meta.color }} />
          </span>
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm leading-5 font-semibold text-ink-900">{alert.titre}</p>
        <p className="mt-0.5 line-clamp-2 text-[13px] leading-[18px] text-ink-600">{alert.description}</p>
        <p className="mt-1 flex items-center gap-2 text-xs text-ink-400">
          {container && <span className="font-mono text-[11px] font-medium">{container.numero}</span>}
          <span>{relativeTime(alert.createdAt)}</span>
        </p>
        {!compact && alert.actionLabel && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              open()
            }}
            className="mt-1.5 inline-flex items-center gap-1 text-[13px] font-medium text-sand-700 hover:text-sand-600"
          >
            {alert.actionLabel}
            <ArrowRight size={14} />
          </button>
        )}
      </div>
    </div>
  )
}
