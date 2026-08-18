// Rail latéral sticky — fiche container (container-detail.md §5).
// Récap coûts · Échéances du dossier · Infos transport.

import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, CalendarPlus, Phone } from 'lucide-react'
import { fr } from 'date-fns/locale'
import { toast } from 'sonner'
import type { Container } from '@/lib/types'
import { EVENT_TYPE_META } from '@/lib/types'
import { computeCustoms } from '@/lib/customs'
import { useStore } from '@/lib/store'
import { formatDateShort, formatNumber } from '@/lib/format'
import ProgressRing from '@/components/ProgressRing'
import { Calendar } from '@/components/ui/calendar'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { transportInfos, EASE_OUT_EXPO } from './utils'

interface SideRailProps {
  c: Container
  caf: number
  onShowCosts: () => void
}

export default function SideRail({ c, caf, onShowCosts }: SideRailProps) {
  const { events, addEvent } = useStore()
  const [addOpen, setAddOpen] = useState(false)
  const [libelle, setLibelle] = useState('')
  const [date, setDate] = useState<Date | undefined>(undefined)

  const extra = c as Container & { acciseRate?: number }
  const result = computeCustoms({ caf, tec: c.tec, acciseRate: extra.acciseRate ?? 0, tvaExoneree: c.tvaExoneree })
  const pctTaxes = caf > 0 ? Math.round((result.total / caf) * 100) : 0
  const infos = transportInfos(c)

  const echeances = useMemo(
    () =>
      events
        .filter((e) => e.containerId === c.id)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [events, c.id],
  )

  const addEcheance = () => {
    if (!date || !libelle.trim()) {
      toast.warning('Renseignez un libellé et une date.')
      return
    }
    addEvent({
      id: `evt-${Date.now().toString(36)}`,
      date: date.toISOString(),
      type: 'rdv',
      libelle: libelle.trim(),
      containerId: c.id,
    })
    toast.success('Échéance ajoutée au calendrier', { description: `${libelle.trim()} — ${formatDateShort(date)}` })
    setLibelle('')
    setDate(undefined)
    setAddOpen(false)
  }

  const cardAnim = (i: number) => ({
    initial: { opacity: 0, x: 16 },
    animate: { opacity: 1, x: 0 },
    transition: { duration: 0.35, delay: 0.2 + i * 0.1, ease: EASE_OUT_EXPO },
  })

  return (
    <div className="space-y-4 lg:sticky lg:top-20">
      {/* 5a. Récap coûts */}
      <motion.section {...cardAnim(0)} className="rounded-xl bg-white p-5 shadow-card">
        <div className="flex items-center gap-3">
          <ProgressRing value={pctTaxes} size={44} stroke={4} />
          <div>
            <p className="text-overline text-ink-400">Taxes / CAF</p>
            <p className="font-sora text-lg font-bold text-ink-900">{String(pctTaxes).replace('.', ',')} %</p>
          </div>
        </div>
        <dl className="mt-4 space-y-2 text-[13px]">
          <div className="flex items-center justify-between">
            <dt className="text-ink-600">CAF</dt>
            <dd className="font-mono font-medium text-ink-900">{formatNumber(caf)}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-ink-600">Taxes estimées</dt>
            <dd className="font-mono font-medium text-[#D97706]">{formatNumber(result.total)}</dd>
          </div>
          <div className="flex items-center justify-between border-t border-border pt-2">
            <dt className="font-semibold text-ink-900">Débarqué</dt>
            <dd className="font-mono font-bold text-ink-900">{formatNumber(result.coutDebarque)}</dd>
          </div>
        </dl>
        <button
          type="button"
          onClick={onShowCosts}
          className="mt-3 inline-flex items-center gap-1 text-[13px] font-semibold text-sand-700 hover:text-sand-600"
        >
          Détail
          <ArrowRight size={14} />
        </button>
      </motion.section>

      {/* 5b. Échéances du dossier */}
      <motion.section {...cardAnim(1)} className="rounded-xl bg-white p-5 shadow-card">
        <p className="text-overline mb-3 text-ink-400">Échéances du dossier</p>
        {echeances.length === 0 ? (
          <p className="text-[13px] text-ink-400">Aucune échéance planifiée.</p>
        ) : (
          <ul className="space-y-2">
            {echeances.map((e) => (
              <li key={e.id} className="flex items-start gap-2 text-[13px]">
                <span
                  className="mt-1.5 size-2 shrink-0 rounded-full"
                  style={{ backgroundColor: EVENT_TYPE_META[e.type].color }}
                />
                <span className="font-mono text-xs font-semibold text-ink-900">{formatDateShort(e.date)}</span>
                <span className="text-ink-600">— {e.libelle}</span>
              </li>
            ))}
          </ul>
        )}
        <Popover open={addOpen} onOpenChange={setAddOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="mt-3 inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-white px-3 text-xs font-semibold text-ink-600 transition-colors hover:bg-subtle"
            >
              <CalendarPlus size={14} />
              Ajouter une échéance
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-[300px] p-3">
            <p className="text-overline mb-2 text-ink-400">Nouvelle échéance</p>
            <Input
              value={libelle}
              onChange={(e) => setLibelle(e.target.value)}
              placeholder="Libellé (ex. RDV transitaire)"
              className="mb-2 h-9 text-[13px]"
            />
            <Calendar mode="single" selected={date} onSelect={setDate} locale={fr} className="rounded-lg border border-border" />
            <button
              type="button"
              onClick={addEcheance}
              className="mt-2 inline-flex h-9 w-full items-center justify-center rounded-lg bg-sand-500 text-[13px] font-semibold text-white hover:bg-sand-600"
            >
              Ajouter
            </button>
          </PopoverContent>
        </Popover>
      </motion.section>

      {/* 5c. Infos transport */}
      <motion.section {...cardAnim(2)} className="rounded-xl bg-white p-5 shadow-card">
        <p className="text-overline mb-3 text-ink-400">Infos transport</p>
        <dl className="space-y-3">
          {[
            { label: 'Transporteur routier', value: infos.transporteur },
            { label: 'Transitaire', value: infos.transitaire },
            { label: 'Bureau de dédouanement', value: infos.bureau },
            { label: 'Entrepôt de livraison', value: infos.entrepot },
          ].map((item) => (
            <div key={item.label}>
              <dt className="text-overline text-ink-400">{item.label}</dt>
              <dd className="mt-0.5 text-[13px] font-medium text-ink-900">{item.value}</dd>
            </div>
          ))}
          <div>
            <dt className="text-overline text-ink-400">Contact</dt>
            <dd className="mt-0.5">
              <a
                href={`tel:${infos.contact.replace(/\s/g, '')}`}
                className="inline-flex items-center gap-1.5 font-mono text-[13px] font-medium text-sand-700 hover:text-sand-600"
              >
                <Phone size={13} />
                {infos.contact}
              </a>
            </dd>
          </div>
        </dl>
      </motion.section>
    </div>
  )
}
