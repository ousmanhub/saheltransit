// MatriceView — vue « Matrice » 13 documents × 7 containers (design/documents.md §4)
// Dots 14px colorés par statut, cascade diagonale à l'entrée, cycle au clic,
// menu contextuel au clic droit, tooltip détaillé, header cliquable vers la fiche.

import { useState } from 'react'
import { useNavigate } from 'react-router'
import { motion } from 'framer-motion'
import { Check } from 'lucide-react'
import type { Container, DocStatus, DocTypeName, DocumentItem } from '@/lib/types'
import { DOC_STATUS_CYCLE, DOC_STATUS_META } from '@/lib/types'
import { relativeTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import StatusBadge from '@/components/StatusBadge'
import { DocStatusIcon } from '@/components/DocStatusChip'
import { DOC_PHASES, shortDocName } from '@/components/documents/docMeta'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface CellProps {
  container: Container
  doc: DocumentItem
  /** Index global de ligne (cascade diagonale) */
  row: number
  col: number
  dimmed: boolean
  onStatusChange: (container: Container, doc: DocumentItem, statut: DocStatus) => void
}

function MatrixCell({ container, doc, row, col, dimmed, onStatusChange }: CellProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const meta = DOC_STATUS_META[doc.statut]

  const cycle = () => {
    const idx = DOC_STATUS_CYCLE.indexOf(doc.statut)
    const next = DOC_STATUS_CYCLE[(idx + 1) % DOC_STATUS_CYCLE.length]
    onStatusChange(container, doc, next)
  }

  const dot = (
    <motion.span
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 22, delay: row * 0.03 + col * 0.015 }}
      className={cn('flex size-7 items-center justify-center', dimmed && 'opacity-25')}
    >
      <motion.span
        key={doc.statut}
        initial={{ scale: 1.3 }}
        animate={{ scale: 1, backgroundColor: meta.color }}
        transition={{ duration: 0.2 }}
        className="size-3.5 rounded-full"
        style={{ backgroundColor: meta.color }}
      />
    </motion.span>
  )

  return (
    <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              onClick={cycle}
              onContextMenu={(e) => {
                e.preventDefault()
                setMenuOpen(true)
              }}
              className="flex w-full items-center justify-center rounded-md focus-visible:outline-2"
              aria-label={`${shortDocName(doc.nom)} — ${container.numero} : ${meta.label}. Clic : statut suivant, clic droit : menu.`}
            >
              {dot}
            </button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-64 text-xs">
          {shortDocName(doc.nom)} — <span className="font-mono">{container.numero}</span> : {meta.label} (
          {relativeTime(doc.updatedAt)})
        </TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="center" className="w-44">
        {DOC_STATUS_CYCLE.map((s) => (
          <DropdownMenuItem
            key={s}
            onSelect={() => onStatusChange(container, doc, s)}
            className="gap-2 text-[13px]"
          >
            <span style={{ color: DOC_STATUS_META[s].color }} className="flex">
              <DocStatusIcon statut={s} />
            </span>
            {DOC_STATUS_META[s].label}
            {s === doc.statut && <Check size={14} className="ml-auto" />}
          </DropdownMenuItem>
        ))}
        <DropdownMenuItem onSelect={() => onStatusChange(container, doc, 'non_requis')} className="gap-2 text-[13px]">
          <span style={{ color: DOC_STATUS_META.non_requis.color }} className="flex">
            <DocStatusIcon statut="non_requis" />
          </span>
          Non requis
          {doc.statut === 'non_requis' && <Check size={14} className="ml-auto" />}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

interface MatriceViewProps {
  containers: Container[]
  /** Prédicat de mise en évidence (filtres de la barre d'outils) */
  match: (container: Container, doc: DocumentItem) => boolean
  onStatusChange: (container: Container, doc: DocumentItem, statut: DocStatus) => void
}

export default function MatriceView({ containers, match, onStatusChange }: MatriceViewProps) {
  const navigate = useNavigate()
  // Index de départ de chaque phase (cascade diagonale continue)
  const phaseStarts: number[] = []
  DOC_PHASES.reduce((acc, p, i) => {
    phaseStarts[i] = acc
    return acc + p.docs.length
  }, 0)

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="overflow-hidden rounded-xl bg-white shadow-card"
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] border-collapse">
          <thead>
            <tr className="border-b border-border">
              <th className="bg-subtle px-4 py-2.5 text-left align-bottom">
                <span className="text-overline text-ink-400">Document</span>
              </th>
              {containers.map((c) => (
                <th key={c.id} className="bg-subtle px-1.5 py-2 align-bottom">
                  <button
                    type="button"
                    onClick={() => navigate(`/containers/${c.id}`)}
                    className="group flex w-full flex-col items-center gap-1.5 rounded-md px-1 py-0.5"
                    title={`Ouvrir le dossier ${c.numero}`}
                  >
                    <span className="font-mono text-[11px] font-semibold whitespace-nowrap text-ink-600 group-hover:text-ink-900">
                      {c.numero.replace(' ', '\u00A0')}
                    </span>
                    <StatusBadge statut={c.statut} className="h-5 px-1.5 text-[10px]" />
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {DOC_PHASES.map((phase, pi) => (
              <PhaseRows
                key={phase.label}
                label={phase.label}
                docs={phase.docs}
                containers={containers}
                match={match}
                onStatusChange={onStatusChange}
                startRow={phaseStarts[pi]}
              />
            ))}
          </tbody>
        </table>
      </div>
      {/* Légende */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-border px-4 py-3">
        {(Object.keys(DOC_STATUS_META) as DocStatus[]).map((s) => (
          <span key={s} className="flex items-center gap-1.5 text-xs text-ink-600">
            <span className="size-2.5 rounded-full" style={{ backgroundColor: DOC_STATUS_META[s].color }} />
            {DOC_STATUS_META[s].label}
          </span>
        ))}
        <span className="ml-auto text-xs text-ink-400">
          Clic : statut suivant · clic droit : choisir le statut
        </span>
      </div>
    </motion.div>
  )
}

interface PhaseRowsProps {
  label: string
  docs: DocTypeName[]
  containers: Container[]
  match: (container: Container, doc: DocumentItem) => boolean
  onStatusChange: (container: Container, doc: DocumentItem, statut: DocStatus) => void
  startRow: number
}

function PhaseRows({ label, docs, containers, match, onStatusChange, startRow }: PhaseRowsProps) {
  return (
    <>
      <tr>
        <td colSpan={containers.length + 1} className="bg-subtle px-4 py-1.5">
          <span className="text-overline text-ink-400">{label}</span>
        </td>
      </tr>
      {docs.map((nom, i) => {
        const row = startRow + i
        return (
          <tr key={nom} className="border-b border-border transition-colors last:border-0 hover:bg-subtle/70">
            <td className="px-4 py-1">
              <p className="text-[13px] leading-8 font-medium whitespace-nowrap text-ink-900">{shortDocName(nom)}</p>
            </td>
            {containers.map((c, col) => {
              const doc = c.documents.find((d) => d.nom === nom)
              if (!doc) return <td key={c.id} className="px-1.5 py-1" />
              return (
                <td key={c.id} className="px-1.5 py-1">
                  <MatrixCell
                    container={c}
                    doc={doc}
                    row={row}
                    col={col}
                    dimmed={!match(c, doc)}
                    onStatusChange={onStatusChange}
                  />
                </td>
              )
            })}
          </tr>
        )
      })}
    </>
  )
}
