// FileATraiter — vue « À traiter » du centre des documents (design/documents.md §3)
// File de travail verticale groupée par statut (Manquants / Demandés / Reçus à valider),
// headers collants, actions rapides au hover, sortie animée des lignes traitées.

import { AnimatePresence, motion } from 'framer-motion'
import { useNavigate } from 'react-router'
import { Check, ChevronRight, ExternalLink, MoreHorizontal, Receipt, Send } from 'lucide-react'
import type { DocStatus } from '@/lib/types'
import { DOC_STATUS_META } from '@/lib/types'
import { relativeTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import DocStatusChip from '@/components/DocStatusChip'
import StatusBadge from '@/components/StatusBadge'
import EmptyState from '@/components/EmptyState'
import type { DocEntry } from '@/components/documents/docMeta'
import { docContextLine, shortDocName } from '@/components/documents/docMeta'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const EASE_OUT_EXPO = [0.22, 1, 0.36, 1] as [number, number, number, number]

const GROUPS: { statut: DocStatus; titre: string; pluriel: string }[] = [
  { statut: 'manquant', titre: 'Manquants', pluriel: 'manquants' },
  { statut: 'demande', titre: 'Demandés', pluriel: 'demandés' },
  { statut: 'recu', titre: 'Reçus à valider', pluriel: 'reçus à valider' },
]

/** Action rapide selon l'état courant : Demandé → Reçu → ✓ Valider */
function nextAction(statut: DocStatus): { label: string; next: DocStatus; icon: typeof Send } | null {
  if (statut === 'manquant') return { label: 'Marquer demandé', next: 'demande', icon: Send }
  if (statut === 'demande') return { label: 'Marquer reçu', next: 'recu', icon: Receipt }
  if (statut === 'recu') return { label: 'Valider', next: 'valide', icon: Check }
  return null
}

interface RowProps {
  entry: DocEntry
  index: number
  onStatusChange: (entry: DocEntry, statut: DocStatus) => void
  onOpenDetails: (entry: DocEntry) => void
}

function QueueRow({ entry, index, onStatusChange, onOpenDetails }: RowProps) {
  const { container, doc } = entry
  const navigate = useNavigate()
  const action = nextAction(doc.statut)
  const context = docContextLine(container, doc)

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 24, height: 0, paddingTop: 0, paddingBottom: 0 }}
      transition={{
        duration: 0.25,
        delay: index * 0.04,
        ease: EASE_OUT_EXPO,
        layout: { duration: 0.25, ease: EASE_OUT_EXPO },
      }}
      className="group flex flex-wrap items-center gap-x-3 gap-y-2 overflow-hidden px-4 py-3 transition-colors hover:bg-subtle/60 sm:flex-nowrap"
    >
      <DocStatusChip statut={doc.statut} onChange={(s) => onStatusChange(entry, s)} className="shrink-0" />

      {/* Nom + contexte */}
      <div className="min-w-0 flex-1 basis-48">
        <p className="truncate text-sm leading-5 font-semibold text-ink-900">{shortDocName(doc.nom)}</p>
        <p className="truncate text-xs leading-4 text-ink-400">
          {context}
          {doc.bloquant && doc.statut === 'manquant' && (
            <span className="ml-1.5 font-semibold text-[#E11D48]">· bloquant</span>
          )}
        </p>
      </div>

      {/* Container */}
      <div className="flex shrink-0 items-center gap-2">
        <span className="font-mono text-xs font-medium text-ink-600">{container.numero}</span>
        <StatusBadge statut={container.statut} className="hidden h-5 px-2 text-[11px] xl:inline-flex" />
      </div>

      {/* Méta temps */}
      <span className="hidden w-20 shrink-0 text-right text-xs text-ink-400 md:block">
        {relativeTime(doc.updatedAt)}
      </span>

      {/* Actions rapides (hover desktop, toujours visibles mobile) */}
      <div className="flex shrink-0 items-center gap-1 opacity-100 transition-opacity duration-150 lg:opacity-0 lg:group-focus-within:opacity-100 lg:group-hover:opacity-100">
        {action && (
          <button
            type="button"
            onClick={() => onStatusChange(entry, action.next)}
            className={cn(
              'flex h-7 items-center gap-1 rounded-lg px-2 text-xs font-medium transition-colors',
              action.next === 'valide'
                ? 'text-[#059669] hover:bg-[#ECFDF5]'
                : 'text-ink-600 hover:bg-white hover:text-ink-900 hover:shadow-card',
            )}
          >
            <action.icon size={13} strokeWidth={1.75} />
            {action.label}
          </button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex size-7 items-center justify-center rounded-lg text-ink-400 transition-colors hover:bg-white hover:text-ink-600 hover:shadow-card"
              aria-label="Plus d'actions"
            >
              <MoreHorizontal size={15} strokeWidth={1.75} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem onSelect={() => onOpenDetails(entry)} className="gap-2 text-[13px]">
              <ChevronRight size={14} />
              Détails, référence &amp; note
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => navigate(`/containers/${container.id}`)}
              className="gap-2 text-[13px]"
            >
              <ExternalLink size={14} />
              Ouvrir le dossier
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </motion.div>
  )
}

interface FileATraiterProps {
  entries: DocEntry[]
  filtered: boolean
  onStatusChange: (entry: DocEntry, statut: DocStatus) => void
  onOpenDetails: (entry: DocEntry) => void
  onResetFilters: () => void
}

export default function FileATraiter({ entries, filtered, onStatusChange, onOpenDetails, onResetFilters }: FileATraiterProps) {
  const groups = GROUPS.map((g) => ({
    ...g,
    items: entries.filter((e) => e.doc.statut === g.statut),
  }))

  if (entries.length === 0) {
    return filtered ? (
      <div className="rounded-xl bg-white shadow-card">
        <EmptyState
          title="Aucun document ne correspond aux filtres"
          description="Essayez d’élargir la recherche ou de réinitialiser les filtres."
          action={
            <button
              type="button"
              onClick={onResetFilters}
              className="flex h-9 items-center rounded-lg bg-sand-500 px-4 text-sm font-semibold text-white transition-colors hover:bg-sand-600"
            >
              Réinitialiser les filtres
            </button>
          }
        />
      </div>
    ) : (
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 24 }}
        className="rounded-xl bg-white shadow-card"
      >
        <EmptyState
          positive
          title="Aucun document manquant — tout est en règle"
          description="Toutes les pièces requises sont validées sur l’ensemble des dossiers. Le centre des documents se remplira dès qu’une pièce sera attendue."
        />
      </motion.div>
    )
  }

  return (
    <div className="space-y-0">
      {groups.map((group, gi) => {
        const meta = DOC_STATUS_META[group.statut]
        return (
          <motion.section
            key={group.statut}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: gi * 0.12, ease: EASE_OUT_EXPO }}
            className={cn(
              'overflow-hidden bg-white shadow-card',
              gi === 0 ? 'rounded-t-xl' : 'border-t border-border',
              gi === groups.length - 1 && 'rounded-b-xl',
            )}
          >
            {/* Header de groupe collant */}
            <header className="sticky top-[136px] z-10 flex items-center gap-2 border-b border-border bg-white px-4 py-2.5">
              <span className="size-2 rounded-full" style={{ backgroundColor: meta.color }} />
              <h2 className="font-h3 text-ink-900">
                {group.titre}
                <span className="ml-1.5 font-sans text-[13px] font-medium text-ink-400">({group.items.length})</span>
              </h2>
            </header>

            {group.items.length > 0 && (
              <div className="divide-y divide-border">
                <AnimatePresence initial={false}>
                  {group.items.map((entry, i) => (
                    <QueueRow
                      key={entry.doc.id}
                      entry={entry}
                      index={i}
                      onStatusChange={onStatusChange}
                      onOpenDetails={onOpenDetails}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </motion.section>
        )
      })}
    </div>
  )
}
