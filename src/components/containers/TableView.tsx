// Vue Table — inventaire dense (design containers.md §3).
// Tri par colonnes, sélection multiple avec barre d'actions flottante, lignes animées.

import { useNavigate } from 'react-router'
import { AnimatePresence, motion } from 'framer-motion'
import { toast } from 'sonner'
import {
  AlertTriangle,
  Anchor,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronRight,
  FileText,
  MoreHorizontal,
  Pencil,
  Printer,
  Calculator,
  Ship,
  Trash2,
  Warehouse,
} from 'lucide-react'
import type { Container } from '@/lib/types'
import { docProgress } from '@/lib/store'
import { formatDateShort, formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'
import CorridorStepper from '@/components/CorridorStepper'
import StatusBadge from '@/components/StatusBadge'
import ProgressRing from '@/components/ProgressRing'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { EASE_OUT_EXPO, nextDeadline } from './utils'

export type SortKey = 'numero' | 'statut' | 'eta' | 'valeur' | 'docs'
export type SortDir = 'asc' | 'desc'

interface TableViewProps {
  containers: Container[]
  /** Colonne triée explicitement (null = tri par défaut « prochaine échéance ») */
  sortKey: SortKey | null
  sortDir: SortDir
  onSort: (key: SortKey) => void
  selection: ReadonlySet<string>
  onToggleSelect: (id: string) => void
  onToggleSelectAll: () => void
  query: string
  onClearFilters: () => void
  onEdit: (c: Container) => void
  onDelete: (ids: string[]) => void
}

function SortHeader({
  label,
  k,
  sortKey,
  sortDir,
  onSort,
  className,
}: {
  label: string
  k: SortKey
  sortKey: SortKey | null
  sortDir: SortDir
  onSort: (k: SortKey) => void
  className?: string
}) {
  const active = sortKey === k
  return (
    <th className={cn('sticky top-[144px] z-10 bg-subtle px-3 py-2.5 text-left', className)}>
      <button
        type="button"
        onClick={() => onSort(k)}
        className={cn(
          'text-overline inline-flex items-center gap-1 transition-colors',
          active ? 'text-ink-900' : 'text-ink-400 hover:text-ink-600',
        )}
      >
        {label}
        {active ? (
          sortDir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
        ) : (
          <ArrowUpDown size={12} className="opacity-60" />
        )}
      </button>
    </th>
  )
}

/** Colonne « Prochaine étape » : T1 rouge si < 48 h, sinon icône + échéance */
function NextStepCell({ c }: { c: Container }) {
  const d = nextDeadline(c)
  if (!d) return <span className="text-xs text-ink-400">—</span>
  if (d.kind === 't1') {
    const urgent = d.days <= 2
    return (
      <span className={cn('inline-flex items-center gap-1.5 text-[13px] font-medium', urgent ? 'text-[#DC2626]' : 'text-ink-600')}>
        <AlertTriangle size={14} strokeWidth={1.75} />
        T1 expire {formatDateShort(d.date)}
      </span>
    )
  }
  if (d.kind === 'embarquement') {
    return (
      <span className="inline-flex items-center gap-1.5 text-[13px] text-ink-600">
        <Ship size={14} strokeWidth={1.75} className="text-[#0EA5E9]" />
        Embarquement · {formatDateShort(d.date)}
      </span>
    )
  }
  if (d.kind === 'eta') {
    return (
      <span className="inline-flex items-center gap-1.5 text-[13px] text-ink-600">
        <Anchor size={14} strokeWidth={1.75} className="text-[#0891B2]" />
        ETA Douala · {formatDateShort(d.date)}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-[13px] text-ink-600">
      <Warehouse size={14} strokeWidth={1.75} className="text-[#15803D]" />
      Livré le {formatDateShort(d.date)}
    </span>
  )
}

export default function TableView({
  containers,
  sortKey,
  sortDir,
  onSort,
  selection,
  onToggleSelect,
  onToggleSelectAll,
  query,
  onClearFilters,
  onEdit,
  onDelete,
}: TableViewProps) {
  const navigate = useNavigate()
  const allSelected = containers.length > 0 && containers.every((c) => selection.has(c.id))

  if (containers.length === 0) {
    return (
      <div className="rounded-xl bg-white py-8 shadow-card">
        <div className="flex flex-col items-center justify-center px-6 py-6 text-center">
          <img src="/empty-state.svg" alt="" className="h-[120px] w-auto opacity-90" loading="lazy" />
          <h3 className="font-h3 mt-4 text-ink-900">
            Aucun container ne correspond à {query ? `« ${query} »` : 'ces filtres'}
          </h3>
          <p className="mt-1 max-w-sm text-[13px] leading-[18px] text-ink-600">
            Modifiez votre recherche ou réinitialisez les filtres actifs.
          </p>
          <button
            type="button"
            onClick={onClearFilters}
            className="mt-4 inline-flex h-9 items-center rounded-lg bg-sand-500 px-4 text-sm font-semibold text-white transition-colors hover:bg-sand-600"
          >
            Effacer les filtres
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="rounded-xl bg-white shadow-card">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-subtle">
              <th className="sticky top-[144px] z-10 w-10 rounded-tl-xl bg-subtle px-3 py-2.5">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={onToggleSelectAll}
                  aria-label="Tout sélectionner"
                />
              </th>
              <SortHeader label="Container" k="numero" sortKey={sortKey} sortDir={sortDir} onSort={onSort} className="w-[24%]" />
              <SortHeader label="Statut" k="statut" sortKey={sortKey} sortDir={sortDir} onSort={onSort} className="w-[17%]" />
              <th className="text-overline sticky top-[144px] z-10 w-[15%] bg-subtle px-3 py-2.5 text-left text-ink-400">Itinéraire</th>
              <SortHeader label="Docs" k="docs" sortKey={sortKey} sortDir={sortDir} onSort={onSort} className="w-[11%]" />
              <th className="text-overline sticky top-[144px] z-10 w-[15%] bg-subtle px-3 py-2.5 text-left text-ink-400">Prochaine étape</th>
              <SortHeader label="Valeur CAF" k="valeur" sortKey={sortKey} sortDir={sortDir} onSort={onSort} className="w-[10%] text-right [&>button]:flex-row-reverse" />
              <th className="sticky top-[144px] z-10 w-[4%] rounded-tr-xl bg-subtle px-3 py-2.5" />
            </tr>
          </thead>
          <tbody>
            <AnimatePresence initial={true}>
              {containers.map((c, index) => {
                const { valides, requis, pct } = docProgress(c)
                const bloquants = c.documents.filter((d) => d.bloquant && d.statut === 'manquant').length
                const livre = c.statut === 'livre'
                return (
                  <motion.tr
                    key={c.id}
                    layout="position"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: livre ? 0.65 : 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3, delay: Math.min(index * 0.04, 0.4), ease: EASE_OUT_EXPO, layout: { duration: 0.25 } }}
                    onClick={() => navigate(`/containers/${c.id}`)}
                    className="group h-14 cursor-pointer border-t border-border transition-colors duration-150 hover:bg-subtle"
                  >
                    {/* Sélection */}
                    <td className="px-3" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selection.has(c.id)}
                        onCheckedChange={() => onToggleSelect(c.id)}
                        aria-label={`Sélectionner ${c.numero}`}
                      />
                    </td>
                    {/* Container */}
                    <td className="px-3 py-2">
                      <p className="font-mono text-[13px] font-semibold text-ink-900">{c.numero}</p>
                      <p className="max-w-[260px] truncate text-xs text-ink-600">{c.contenu}</p>
                    </td>
                    {/* Statut */}
                    <td className="px-3 py-2">
                      <StatusBadge statut={c.statut} variant="outline" />
                      <CorridorStepper statut={c.statut} variant="mini" className="mt-1.5 w-[60px]" />
                    </td>
                    {/* Itinéraire */}
                    <td className="px-3 py-2">
                      <p className="text-[13px] text-ink-600">
                        {c.origine} → {c.destination}
                      </p>
                      <p className="text-xs text-ink-400">{c.compagnie.split('·')[0].trim()}</p>
                    </td>
                    {/* Documents */}
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <ProgressRing value={pct} size={32} stroke={3.5} />
                        <div>
                          <p className="text-xs font-medium text-ink-600" style={{ fontVariantNumeric: 'tabular-nums' }}>
                            {valides}/{requis}
                          </p>
                          {bloquants > 0 && (
                            <p className="flex items-center gap-1 text-[11px] font-medium text-[#E11D48]">
                              <span className="size-1.5 rounded-full bg-[#E11D48]" />
                              {bloquants} manquant{bloquants > 1 ? 's' : ''}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    {/* Prochaine étape */}
                    <td className="px-3 py-2">
                      <NextStepCell c={c} />
                    </td>
                    {/* Valeur CAF */}
                    <td className="px-3 py-2 text-right font-mono text-[13px] font-medium text-ink-900">
                      {formatNumber(c.valeurCaf)}
                    </td>
                    {/* Actions */}
                    <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <ChevronRight
                          size={16}
                          className="text-ink-400 opacity-0 transition-opacity duration-150 group-hover:opacity-100"
                        />
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              className="flex size-7 items-center justify-center rounded-md text-ink-400 hover:bg-white hover:text-ink-600"
                              aria-label={`Actions pour ${c.numero}`}
                            >
                              <MoreHorizontal size={16} />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuItem onSelect={() => navigate(`/containers/${c.id}`)} className="gap-2 text-[13px]">
                              <FileText size={14} className="text-ink-400" />
                              Voir le dossier
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => onEdit(c)} className="gap-2 text-[13px]">
                              <Pencil size={14} className="text-ink-400" />
                              Modifier
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => navigate(`/containers/${c.id}?tab=documents`)} className="gap-2 text-[13px]">
                              <FileText size={14} className="text-ink-400" />
                              Checklist documents
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => navigate(`/calculateur?container=${c.id}`)} className="gap-2 text-[13px]">
                              <Calculator size={14} className="text-ink-400" />
                              Calculer les droits
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => navigate(`/containers/${c.id}?export=1`)} className="gap-2 text-[13px]">
                              <Printer size={14} className="text-ink-400" />
                              Exporter en PDF
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onSelect={() => onDelete([c.id])}
                              className="gap-2 text-[13px] text-[#E11D48] focus:text-[#E11D48]"
                            >
                              <Trash2 size={14} />
                              Supprimer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </motion.tr>
                )
              })}
            </AnimatePresence>
          </tbody>
        </table>
        <div className="border-t border-border px-4 py-2.5 text-xs text-ink-400" style={{ fontVariantNumeric: 'tabular-nums' }}>
          1–{containers.length} sur {containers.length}
        </div>
      </div>

      {/* Barre d'actions flottante (sélection multiple) */}
      <AnimatePresence>
        {selection.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.2, ease: EASE_OUT_EXPO }}
            className="fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-full bg-navy-950 py-2.5 pr-2 pl-5 text-white shadow-overlay"
          >
            <span className="text-[13px] font-medium" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {selection.size} sélectionné{selection.size > 1 ? 's' : ''}
            </span>
            <span className="h-4 w-px bg-navy-800" />
            <button
              type="button"
              onClick={() => {
                const first = containers.find((c) => selection.has(c.id))
                if (first && selection.size === 1) {
                  navigate(`/containers/${first.id}?export=1`)
                } else {
                  toast.info('Export groupé non disponible', {
                    description: 'Ouvrez chaque dossier pour un export PDF individuel.',
                  })
                }
              }}
              className="inline-flex items-center gap-1.5 text-[13px] font-medium text-navy-100 transition-colors hover:text-white"
            >
              <Printer size={14} />
              Exporter PDF
            </button>
            <button
              type="button"
              onClick={() => onDelete([...selection])}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#E11D48] px-3 py-1.5 text-[13px] font-semibold text-white transition-colors hover:bg-[#BE123C]"
            >
              <Trash2 size={14} />
              Supprimer
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
