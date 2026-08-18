// CentreAlertes — centre d'alertes complet (design/calendar.md §3)
// Filtres par sévérité, marquer comme lu / tout marquer, masquer (Annuler),
// régénération « Recalculer » (passe des règles métier du store), flash des
// nouvelles alertes, dispatch des actions métier.

import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { AnimatePresence, motion } from 'framer-motion'
import { toast } from 'sonner'
import {
  AlertTriangle,
  ArrowRight,
  CheckCheck,
  CheckCircle2,
  FileWarning,
  Info,
  MoreHorizontal,
  RefreshCw,
} from 'lucide-react'
import type { Alert, AlertSeverity } from '@/lib/types'
import { SEVERITY_META } from '@/lib/types'
import { useStore } from '@/lib/store'
import { relativeTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import EmptyState from '@/components/EmptyState'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const EASE_OUT_EXPO = [0.22, 1, 0.36, 1] as [number, number, number, number]

const SEVERITY_ICONS = {
  critique: AlertTriangle,
  importante: FileWarning,
  info: Info,
  positive: CheckCircle2,
} as const

type Filtre = 'toutes' | 'critique' | 'importante' | 'info'

const FILTRES: { value: Filtre; label: string }[] = [
  { value: 'toutes', label: 'Toutes' },
  { value: 'critique', label: 'Critiques' },
  { value: 'importante', label: 'Importantes' },
  { value: 'info', label: 'Infos' },
]

interface CentreAlertesProps {
  onContactTransitaire: (alert: Alert) => void
}

export default function CentreAlertes({ onContactTransitaire }: CentreAlertesProps) {
  const { alerts, containers, getContainer, markAlertRead, markAllAlertsRead, updateDocStatus } = useStore()
  const navigate = useNavigate()
  const [filtre, setFiltre] = useState<Filtre>('toutes')
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set())
  const [recalcul, setRecalcul] = useState(false)
  const [flashIds, setFlashIds] = useState<Set<string>>(new Set())
  const prevIds = useRef<Set<string>>(new Set(alerts.map((a) => a.id)))

  // Détection des nouvelles alertes (régénération après mutation) → flash rose-50
  useEffect(() => {
    const fresh = alerts.filter((a) => !prevIds.current.has(a.id)).map((a) => a.id)
    prevIds.current = new Set(alerts.map((a) => a.id))
    if (fresh.length > 0) {
      setFlashIds(new Set(fresh))
      const t = setTimeout(() => setFlashIds(new Set()), 1600)
      return () => clearTimeout(t)
    }
  }, [alerts])

  const visibles = useMemo(() => alerts.filter((a) => !hiddenIds.has(a.id)), [alerts, hiddenIds])
  const actives = visibles.length
  const listees = useMemo(
    () =>
      visibles.filter((a) => {
        if (filtre === 'toutes') return true
        if (filtre === 'info') return a.severite === 'info' || a.severite === 'positive'
        return a.severite === filtre
      }),
    [visibles, filtre],
  )
  const countFor = (f: Filtre) =>
    visibles.filter((a) => {
      if (f === 'toutes') return true
      if (f === 'info') return a.severite === 'info' || a.severite === 'positive'
      return a.severite === f
    }).length

  /** « Recalculer » : force une passe de régénération des règles métier (spinner 600ms) */
  const recalculer = () => {
    if (recalcul) return
    setRecalcul(true)
    // Mutation volontairement neutre : le store régénère les alertes auto à chaque mutation
    markAlertRead('__recalcul__')
    setTimeout(() => {
      setRecalcul(false)
      toast.success(`Alertes recalculées : ${actives} active${actives > 1 ? 's' : ''}`)
    }, 600)
  }

  const masquer = (alert: Alert) => {
    setHiddenIds((prev) => new Set(prev).add(alert.id))
    toast.success(`Alerte masquée — ${alert.titre}`, {
      action: {
        label: 'Annuler',
        onClick: () =>
          setHiddenIds((prev) => {
            const next = new Set(prev)
            next.delete(alert.id)
            return next
          }),
      },
    })
  }

  /** Dispatch de l'action principale d'une alerte */
  const runAction = (alert: Alert) => {
    const container = alert.containerId ? getContainer(alert.containerId) : undefined
    if (alert.actionLabel === 'Contacter le transitaire') {
      onContactTransitaire(alert)
      return
    }
    if (alert.actionLabel === 'Demander le BESC' && container) {
      const bescs = container.documents.filter(
        (d) => d.nom.startsWith('BESC') && d.statut !== 'valide' && d.statut !== 'non_requis',
      )
      for (const d of bescs) updateDocStatus(container.id, d.id, 'demande')
      markAlertRead(alert.id)
      toast.success(`BESC marqués comme demandés — ${container.numero}`, {
        description: 'La checklist du dossier a été mise à jour.',
      })
      return
    }
    if (alert.actionLabel === 'Calculer les droits') {
      navigate('/calculateur')
      return
    }
    // « Voir la checklist », « Ouvrir le dossier », défaut → fiche container
    if (container) navigate(`/containers/${container.id}`)
  }

  const actionLabel = (alert: Alert): string | undefined =>
    alert.actionLabel ?? (alert.containerId ? 'Ouvrir le dossier' : undefined)

  return (
    <section id="alertes" className="scroll-mt-24 overflow-hidden rounded-xl bg-white shadow-card">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-border px-4 py-3">
        <h3 className="font-h3 text-ink-900">Centre d’alertes</h3>
        <span className="rounded-full bg-subtle px-2 py-0.5 text-xs font-semibold text-ink-600">
          {actives} active{actives > 1 ? 's' : ''}
        </span>
        {/* Filtres sévérité */}
        <div className="flex items-center gap-1">
          {FILTRES.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFiltre(f.value)}
              className={cn(
                'flex h-7 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium transition-colors',
                filtre === f.value ? 'bg-navy-950 text-white' : 'text-ink-600 hover:bg-subtle',
              )}
            >
              {f.value !== 'toutes' && (
                <span
                  className="size-1.5 rounded-full"
                  style={{
                    backgroundColor:
                      filtre === f.value ? '#FFFFFF' : SEVERITY_META[f.value as AlertSeverity].color,
                  }}
                />
              )}
              {f.label}
              <span className={cn('text-[10px]', filtre === f.value ? 'text-white/70' : 'text-ink-400')}>
                {countFor(f.value)}
              </span>
            </button>
          ))}
        </div>
        {/* Actions globales */}
        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={markAllAlertsRead}
            className="flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-medium text-ink-600 transition-colors hover:bg-subtle"
          >
            <CheckCheck size={15} strokeWidth={1.75} />
            <span className="hidden sm:inline">Tout marquer comme lu</span>
          </button>
          <button
            type="button"
            onClick={recalculer}
            className="flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-medium text-ink-600 transition-colors hover:bg-subtle"
          >
            <RefreshCw size={15} strokeWidth={1.75} className={cn(recalcul && 'animate-spin')} />
            Recalculer
          </button>
        </div>
      </div>

      {/* Liste */}
      {listees.length === 0 ? (
        <EmptyState
          positive
          title="Tout est en règle"
          description={
            filtre === 'toutes'
              ? 'Aucune alerte active — les règles métier surveillent les T1, BESC, documents bloquants et ETA en continu.'
              : 'Aucune alerte dans cette catégorie.'
          }
        />
      ) : (
        <ol className="divide-y divide-border">
          <AnimatePresence initial={false}>
            {listees.map((alert, i) => {
              const meta = SEVERITY_META[alert.severite]
              const Icon = SEVERITY_ICONS[alert.severite]
              const container = alert.containerId
                ? containers.find((c) => c.id === alert.containerId)
                : undefined
              const label = actionLabel(alert)
              const isNew = flashIds.has(alert.id)
              return (
                <motion.li
                  key={alert.id}
                  layout
                  initial={{ opacity: 0, y: isNew ? -16 : 12, backgroundColor: isNew ? '#FFF1F2' : 'rgba(255,241,242,0)' }}
                  animate={{ opacity: alert.lue ? 0.6 : 1, y: 0, backgroundColor: 'rgba(255,241,242,0)' }}
                  exit={{ opacity: 0, x: 24, height: 0 }}
                  transition={{
                    duration: 0.25,
                    delay: isNew ? 0 : i * 0.07,
                    ease: EASE_OUT_EXPO,
                    backgroundColor: { duration: 1.5 },
                    layout: { duration: 0.25, ease: EASE_OUT_EXPO },
                  }}
                  className="relative flex gap-3.5 overflow-hidden py-4 pr-3 pl-4"
                >
                  {/* Barre verticale 3px couleur sévérité */}
                  <span className="absolute top-3 bottom-3 left-0 w-[3px] rounded-full" style={{ backgroundColor: meta.color }} />
                  {/* Icône cercle 40px */}
                  <span className="relative flex size-10 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: meta.bg }}>
                    <Icon size={18} strokeWidth={1.75} style={{ color: meta.color }} />
                    {alert.severite === 'critique' && !alert.lue && (
                      <span className="absolute -top-0.5 -right-0.5 flex size-2">
                        <span className="absolute size-full animate-pulse-ring-fast rounded-full" style={{ backgroundColor: meta.color }} />
                        <span className="relative size-2 rounded-full" style={{ backgroundColor: meta.color }} />
                      </span>
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="flex items-center gap-2 text-sm leading-5 font-semibold text-ink-900">
                        {alert.titre}
                        {!alert.lue && <span className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: meta.color }} />}
                      </p>
                      {/* Menu ⋯ */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            className="flex size-7 shrink-0 items-center justify-center rounded-lg text-ink-400 transition-colors hover:bg-subtle hover:text-ink-600"
                            aria-label="Options de l'alerte"
                          >
                            <MoreHorizontal size={15} strokeWidth={1.75} />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          {!alert.lue && (
                            <DropdownMenuItem onSelect={() => markAlertRead(alert.id)} className="gap-2 text-[13px]">
                              <CheckCheck size={14} />
                              Marquer comme lue
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onSelect={() => masquer(alert)} className="gap-2 text-[13px]">
                            Masquer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <p className="mt-0.5 max-w-3xl text-[13px] leading-[18px] text-ink-600">{alert.description}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                      {container && (
                        <span className="font-mono text-[11px] font-medium text-ink-600">{container.numero}</span>
                      )}
                      <span className="text-xs text-ink-400">{relativeTime(alert.createdAt)}</span>
                      {label && (
                        <button
                          type="button"
                          onClick={() => runAction(alert)}
                          className="inline-flex items-center gap-1 text-[13px] font-medium text-sand-700 transition-colors hover:text-sand-600"
                        >
                          {label}
                          <ArrowRight size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                </motion.li>
              )
            })}
          </AnimatePresence>
        </ol>
      )}
    </section>
  )
}
