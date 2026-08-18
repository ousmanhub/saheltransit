// Vue Cartes — grille de ContainerCard enrichies (bandeau échéance < 7 j + actions rapides).

import { useNavigate } from 'react-router'
import { motion } from 'framer-motion'
import { Anchor, Calculator, Printer, Ship } from 'lucide-react'
import type { Container } from '@/lib/types'
import { formatDateWeekday } from '@/lib/format'
import { cn } from '@/lib/utils'
import ContainerCard from '@/components/ContainerCard'
import { EASE_OUT_EXPO, nextDeadline } from './utils'

function DeadlineBanner({ c }: { c: Container }) {
  const d = nextDeadline(c)
  if (!d || d.days < 0 || d.days >= 7 || c.statut === 'livre') return null

  if (d.kind === 't1') {
    return (
      <div className="flex items-center gap-2 rounded-t-xl border-b border-[#FECDD3] bg-[#FFF1F2] px-4 py-2 text-xs font-medium text-[#E11D48]">
        <span aria-hidden>⚠</span>
        Date limite T1 : {formatDateWeekday(d.date)} — {d.days} jour{d.days > 1 ? 's' : ''} restant{d.days > 1 ? 's' : ''}
      </div>
    )
  }
  if (d.kind === 'embarquement') {
    return (
      <div className="flex items-center gap-2 rounded-t-xl border-b border-[#BAE6FD] bg-[#F0F9FF] px-4 py-2 text-xs font-medium text-[#0284C7]">
        <Ship size={13} />
        Embarquement prévu : {formatDateWeekday(d.date)} — dans {d.days} j
      </div>
    )
  }
  if (d.kind === 'eta') {
    return (
      <div className="flex items-center gap-2 rounded-t-xl border-b border-[#A5F3FC] bg-[#ECFEFF] px-4 py-2 text-xs font-medium text-[#0891B2]">
        <Anchor size={13} />
        ETA Douala : {formatDateWeekday(d.date)} — dans {d.days} j
      </div>
    )
  }
  return null
}

function EnrichedCard({ c, index }: { c: Container; index: number }) {
  const navigate = useNavigate()
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.1 }}
      transition={{ duration: 0.4, delay: index * 0.07, ease: EASE_OUT_EXPO }}
      className="group relative"
    >
      <DeadlineBanner c={c} />
      <div className={cn('[&>article]:rounded-t-xl', nextDeadline(c)?.kind && nextDeadline(c)!.days >= 0 && nextDeadline(c)!.days < 7 && c.statut !== 'livre' && '[&>article]:rounded-t-none')}>
        <ContainerCard container={c} />
      </div>
      {/* Actions rapides au survol */}
      <div className="pointer-events-none absolute right-3 bottom-3 flex translate-y-1 gap-1.5 opacity-0 transition-all duration-150 group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            navigate(`/calculateur?container=${c.id}`)
          }}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-white px-2.5 text-xs font-semibold text-ink-600 shadow-raised transition-colors hover:border-sand-500 hover:text-sand-700"
        >
          <Calculator size={13} />
          Droits
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            navigate(`/containers/${c.id}?export=1`)
          }}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-white px-2.5 text-xs font-semibold text-ink-600 shadow-raised transition-colors hover:border-sand-500 hover:text-sand-700"
        >
          <Printer size={13} />
          PDF
        </button>
      </div>
    </motion.div>
  )
}

export default function CardsView({ containers }: { containers: Container[] }) {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
      {containers.map((c, i) => (
        <EnrichedCard key={c.id} c={c} index={i} />
      ))}
    </div>
  )
}
