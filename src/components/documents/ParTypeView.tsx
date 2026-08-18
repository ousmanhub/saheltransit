// ParTypeView — vue « Par type » : 13 accordéons, un par document type
// (design/documents.md §5). Un seul ouvert à la fois, ouverture 250ms.

import { useState } from 'react'
import { useNavigate } from 'react-router'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, ChevronRight, ExternalLink, MoreHorizontal } from 'lucide-react'
import type { Container, DocStatus, DocTypeName, DocumentItem } from '@/lib/types'
import { DOC_STATUS_META, DOC_TYPES } from '@/lib/types'
import { relativeTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import DocStatusChip, { DocStatusIcon } from '@/components/DocStatusChip'
import StatusBadge from '@/components/StatusBadge'
import type { DocMeta } from '@/components/documents/docMeta'
import { docRequisLabel, shortDocName } from '@/components/documents/docMeta'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const EASE_STANDARD = [0.4, 0, 0.2, 1] as [number, number, number, number]
const WORST_ORDER: DocStatus[] = ['manquant', 'demande', 'recu', 'valide', 'non_requis']
const PLURALS: Record<DocStatus, string> = {
  manquant: 'manquants',
  demande: 'demandés',
  recu: 'reçus',
  valide: 'validés',
  non_requis: 'non requis',
}

/** Pire état agrégé du document sur les containers affichés */
function worstStatus(docs: DocumentItem[]): { statut: DocStatus; count: number } {
  for (const s of WORST_ORDER) {
    const count = docs.filter((d) => d.statut === s).length
    if (count > 0) return { statut: s, count }
  }
  return { statut: 'non_requis', count: 0 }
}

interface ParTypeViewProps {
  containers: Container[]
  match: (container: Container, doc: DocumentItem) => boolean
  meta: Record<string, DocMeta>
  onStatusChange: (container: Container, doc: DocumentItem, statut: DocStatus) => void
  onOpenDetails: (container: Container, doc: DocumentItem) => void
}

export default function ParTypeView({ containers, match, meta, onStatusChange, onOpenDetails }: ParTypeViewProps) {
  const [openDoc, setOpenDoc] = useState<DocTypeName | null>(null)
  const navigate = useNavigate()

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="overflow-hidden rounded-xl bg-white shadow-card"
    >
      {DOC_TYPES.map((nom, idx) => {
        const docs = containers
          .map((c) => ({ container: c, doc: c.documents.find((d) => d.nom === nom)! }))
          .filter((x) => Boolean(x.doc))
        const agg = worstStatus(docs.map((x) => x.doc))
        const aggMeta = DOC_STATUS_META[agg.statut]
        const isOpen = openDoc === nom

        return (
          <div key={nom} className={cn(idx > 0 && 'border-t border-border')}>
            {/* Header accordéon */}
            <button
              type="button"
              onClick={() => setOpenDoc(isOpen ? null : nom)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-subtle/60"
              aria-expanded={isOpen}
            >
              <span
                className="inline-flex h-[26px] shrink-0 items-center gap-1.5 rounded-lg px-2 text-xs font-medium whitespace-nowrap"
                style={{ backgroundColor: aggMeta.bg, color: aggMeta.color }}
              >
                <DocStatusIcon statut={agg.statut} />
                {agg.count > 0 ? `${agg.count} ${PLURALS[agg.statut]}` : '—'}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm leading-5 font-semibold text-ink-900">{shortDocName(nom)}</span>
                <span className="block truncate text-xs leading-4 text-ink-400">{docRequisLabel(nom)}</span>
              </span>
              {/* Mini-barres 7 segments (un par container) */}
              <span className="hidden w-28 shrink-0 items-center gap-[3px] sm:flex">
                {docs.map(({ container, doc }) => (
                  <span
                    key={container.id}
                    className="h-1 flex-1 rounded-full"
                    style={{ backgroundColor: DOC_STATUS_META[doc.statut].color }}
                    title={`${container.numero} : ${DOC_STATUS_META[doc.statut].label}`}
                  />
                ))}
              </span>
              <ChevronDown
                size={16}
                strokeWidth={1.75}
                className={cn('shrink-0 text-ink-400 transition-transform duration-200', isOpen && 'rotate-180')}
              />
            </button>

            {/* Contenu : les containers pour ce document */}
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: EASE_STANDARD }}
                  className="overflow-hidden"
                >
                  <div className="divide-y divide-border border-t border-border bg-subtle/30">
                    {docs.map(({ container, doc }, i) => {
                      const reference = meta[doc.id]?.reference
                      return (
                        <motion.div
                          key={container.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2, delay: i * 0.04 }}
                          className={cn(
                            'group flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5 sm:flex-nowrap',
                            !match(container, doc) && 'opacity-40',
                          )}
                        >
                          <div className="flex min-w-0 flex-1 basis-44 items-center gap-2">
                            <span className="truncate font-mono text-xs font-semibold text-ink-900">
                              {container.numero}
                            </span>
                            <StatusBadge statut={container.statut} className="hidden h-5 px-2 text-[11px] lg:inline-flex" />
                          </div>
                          <DocStatusChip
                            statut={doc.statut}
                            onChange={(s) => onStatusChange(container, doc, s)}
                            className="shrink-0"
                          />
                          <span className="hidden w-20 shrink-0 text-xs text-ink-400 md:block">
                            {relativeTime(doc.updatedAt)}
                          </span>
                          <span className="hidden min-w-0 flex-1 truncate font-mono text-xs text-ink-400 lg:block">
                            {reference ?? ''}
                          </span>
                          <div className="flex shrink-0 items-center gap-1 opacity-100 transition-opacity lg:opacity-0 lg:group-focus-within:opacity-100 lg:group-hover:opacity-100">
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
                                <DropdownMenuItem onSelect={() => onOpenDetails(container, doc)} className="gap-2 text-[13px]">
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
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )
      })}
    </motion.div>
  )
}
