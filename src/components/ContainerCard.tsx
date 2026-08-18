// ContainerCard — carte d'inventaire container (design.md §4.6)

import { useNavigate } from 'react-router'
import { CalendarClock } from 'lucide-react'
import type { Container } from '@/lib/types'
import { STATUS_META } from '@/lib/types'
import { docProgress } from '@/lib/store'
import { formatDateShort, formatFCFA } from '@/lib/format'
import CorridorStepper from './CorridorStepper'
import StatusBadge from './StatusBadge'

interface ContainerCardProps {
  container: Container
}

export default function ContainerCard({ container: c }: ContainerCardProps) {
  const navigate = useNavigate()
  const meta = STATUS_META[c.statut]
  const { valides, requis } = docProgress(c)
  const pct = requis ? (valides / requis) * 100 : 100

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={() => navigate(`/containers/${c.id}`)}
      onKeyDown={(e) => e.key === 'Enter' && navigate(`/containers/${c.id}`)}
      className="cursor-pointer rounded-xl border border-transparent bg-white p-5 shadow-card transition-all duration-200 ease-out-expo hover:-translate-y-0.5 hover:shadow-raised"
      style={{ ['--hover-border' as string]: `${meta.color}66` }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = `${meta.color}66`)}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'transparent')}
    >
      {/* Header : numéro mono + badge */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-mono text-sm font-semibold text-ink-900">{c.numero}</h3>
          <p className="mt-0.5 truncate text-[13px] leading-[18px] text-ink-600">{c.contenu}</p>
        </div>
        <StatusBadge statut={c.statut} />
      </div>

      {/* Méta */}
      <p className="mt-2 text-[13px] leading-[18px] text-ink-400">
        {c.origine} → {c.destination} · {c.compagnie.split('·')[0].trim()}
      </p>

      {/* Mini stepper */}
      <CorridorStepper statut={c.statut} variant="mini" className="mt-3" />

      {/* Footer : progression docs + CAF + ETA */}
      <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-3">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-subtle">
            <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: pct >= 100 ? '#059669' : '#E8930C' }} />
          </div>
          <span className="text-xs font-medium text-ink-600" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {valides}/{requis} validés
          </span>
        </div>
        <span className="font-mono text-[13px] font-medium text-ink-900">{formatFCFA(c.valeurCaf)}</span>
      </div>
      {(c.eta || c.livraison) && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-ink-400">
          <CalendarClock size={14} strokeWidth={1.75} />
          {c.statut === 'livre' && c.livraison
            ? `Livré le ${formatDateShort(c.livraison)}`
            : c.eta
              ? `ETA ${formatDateShort(c.eta)}`
              : ''}
        </p>
      )}
    </article>
  )
}
