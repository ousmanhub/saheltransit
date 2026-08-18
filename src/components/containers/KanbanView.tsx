// Vue Kanban — 8 colonnes (une par statut du corridor), drag & drop dnd-kit.
// V1 : déplacement entre colonnes adjacentes uniquement, sinon menu « Changer de statut ».

import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core'
import { motion } from 'framer-motion'
import { CalendarClock, ChevronDown, MoreHorizontal } from 'lucide-react'
import { toast } from 'sonner'
import type { Container, ContainerStatus } from '@/lib/types'
import { CONTAINER_STATUSES, STATUS_META } from '@/lib/types'
import { docProgress, useStore } from '@/lib/store'
import { daysUntil, formatDateShort, formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'
import CorridorStepper from '@/components/CorridorStepper'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { applyStatusChange, EASE_OUT_EXPO } from './utils'

// ─── Carte kanban ────────────────────────────────────────────────────────────

function KanbanCardContent({ c, overlay = false }: { c: Container; overlay?: boolean }) {
  const meta = STATUS_META[c.statut]
  const { valides, requis } = docProgress(c)
  const manquants = c.documents.filter((d) => d.statut === 'manquant').length
  const t1Days = c.t1 ? daysUntil(c.t1.limite) : null
  const t1Urgent = t1Days !== null && t1Days <= 5

  return (
    <div
      className={cn(
        'relative rounded-xl border border-border bg-white p-3.5 shadow-card transition-shadow',
        overlay && 'scale-[1.03] rotate-[1.5deg] shadow-overlay',
        !overlay && 'cursor-grab hover:shadow-raised active:cursor-grabbing',
      )}
    >
      {/* Barre d'alerte T1 */}
      {t1Urgent && (
        <div className="absolute top-0 right-4 left-4 h-[3px] rounded-b-full bg-[#DC2626]" />
      )}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-mono text-[13px] font-semibold text-ink-900">{c.numero}</p>
          <p className="mt-0.5 truncate text-xs text-ink-600">{c.contenu}</p>
        </div>
        {!overlay && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                className="flex size-6 shrink-0 items-center justify-center rounded-md text-ink-400 hover:bg-subtle hover:text-ink-600"
                aria-label="Actions de la carte"
              >
                <MoreHorizontal size={15} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="text-xs">Changer de statut</DropdownMenuLabel>
              <StatusMenuItems c={c} />
              <DropdownMenuSeparator />
              <KanbanOpenItem c={c} />
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {t1Urgent && (
        <p className="mt-1.5 text-[11px] font-semibold text-[#DC2626]">
          T1 : J−{Math.max(t1Days, 0)}
        </p>
      )}

      <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-ink-400">
        <span className="truncate">{c.compagnie.split('·')[0].trim()}</span>
        {c.eta && (
          <span className="ml-auto inline-flex shrink-0 items-center gap-1">
            <CalendarClock size={11} />
            {formatDateShort(c.eta)}
          </span>
        )}
      </p>

      <CorridorStepper statut={c.statut} variant="mini" className="mt-2.5" />

      <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-border pt-2">
        <span
          className={cn(
            'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold',
          )}
          style={{
            backgroundColor: manquants > 0 ? '#FFF1F2' : '#ECFDF5',
            color: manquants > 0 ? '#E11D48' : '#059669',
          }}
        >
          {valides}/{requis}
        </span>
        <span className="font-mono text-xs font-medium text-ink-900">{formatNumber(c.valeurCaf)}</span>
      </div>
      <span className="sr-only">{meta.label}</span>
    </div>
  )
}

function StatusMenuItems({ c }: { c: Container }) {
  const { updateContainerStatus } = useStore()
  return (
    <>
      {CONTAINER_STATUSES.map((s) => (
        <DropdownMenuItem
          key={s}
          disabled={s === c.statut}
          onSelect={() => {
            applyStatusChange(c, s, updateContainerStatus)
          }}
          className="gap-2 text-[13px]"
        >
          <span className="size-2 rounded-full" style={{ backgroundColor: STATUS_META[s].dot }} />
          {STATUS_META[s].label}
          {s === c.statut && <ChevronDown size={12} className="ml-auto rotate-180 opacity-40" />}
        </DropdownMenuItem>
      ))}
    </>
  )
}

function KanbanOpenItem({ c }: { c: Container }) {
  const navigate = useNavigate()
  return (
    <DropdownMenuItem onSelect={() => navigate(`/containers/${c.id}`)} className="text-[13px]">
      Voir le dossier
    </DropdownMenuItem>
  )
}

function DraggableCard({ c, index }: { c: Container; index: number }) {
  const navigate = useNavigate()
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: c.id,
    data: { container: c },
  })

  return (
    <motion.div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: isDragging ? 0.35 : 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.15 + index * 0.05, ease: EASE_OUT_EXPO }}
      onDoubleClick={() => navigate(`/containers/${c.id}`)}
      style={{ touchAction: 'none' }}
      role="listitem"
      aria-label={`${c.numero} — glisser pour changer de statut, double-clic pour ouvrir`}
    >
      <KanbanCardContent c={c} />
    </motion.div>
  )
}

// ─── Colonne ─────────────────────────────────────────────────────────────────

function KanbanColumn({
  statut,
  containers,
  index,
}: {
  statut: ContainerStatus
  containers: Container[]
  index: number
}) {
  const meta = STATUS_META[statut]
  const { setNodeRef, isOver } = useDroppable({ id: statut })

  return (
    <motion.section
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35, delay: index * 0.06, ease: EASE_OUT_EXPO }}
      className="flex w-[280px] shrink-0 flex-col"
      aria-label={`Colonne ${meta.label}`}
    >
      <header className="mb-2.5 flex items-center gap-2 px-1">
        <span className="size-2 rounded-full" style={{ backgroundColor: meta.dot }} />
        <h3 className="text-[13px] font-semibold text-ink-900">{meta.label}</h3>
        <span className="ml-auto rounded-full bg-subtle px-2 py-0.5 text-[11px] font-semibold text-ink-600" style={{ fontVariantNumeric: 'tabular-nums' }}>
          {containers.length}
        </span>
      </header>
      <div
        ref={setNodeRef}
        className={cn(
          'flex min-h-[220px] flex-1 flex-col gap-2.5 rounded-xl border p-2 transition-colors duration-150',
          isOver
            ? 'border-dashed border-sand-500 bg-sand-100'
            : containers.length === 0
              ? 'border-dashed border-border bg-transparent'
              : 'border-transparent bg-subtle/50',
        )}
        role="list"
      >
        {containers.length === 0 && !isOver && (
          <p className="flex flex-1 items-center justify-center text-xs text-ink-400">Aucun</p>
        )}
        {containers.map((c, i) => (
          <DraggableCard key={c.id} c={c} index={i} />
        ))}
      </div>
    </motion.section>
  )
}

// ─── Board ───────────────────────────────────────────────────────────────────

export default function KanbanView({ containers }: { containers: Container[] }) {
  const { updateContainerStatus } = useStore()
  const [active, setActive] = useState<Container | null>(null)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  const byStatus = useMemo(() => {
    const map = new Map<ContainerStatus, Container[]>()
    for (const s of CONTAINER_STATUSES) map.set(s, [])
    for (const c of containers) map.get(c.statut)!.push(c)
    return map
  }, [containers])

  const onDragStart = (e: DragStartEvent) => {
    setActive((e.active.data.current as { container: Container }).container)
  }

  const onDragEnd = (e: DragEndEvent) => {
    const dragged = active
    setActive(null)
    if (!dragged || !e.over) return
    const target = e.over.id as ContainerStatus
    if (target === dragged.statut) return
    const from = CONTAINER_STATUSES.indexOf(dragged.statut)
    const to = CONTAINER_STATUSES.indexOf(target)
    if (Math.abs(from - to) !== 1) {
      toast.warning('Déplacement limité aux étapes voisines', {
        description: 'Glissez vers une colonne adjacente, ou utilisez « Changer de statut » sur la carte.',
      })
      return
    }
    applyStatusChange(dragged, target, updateContainerStatus)
  }

  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setActive(null)}>
      <div className="relative">
        {/* Ombres de défilement aux bords */}
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-6 bg-gradient-to-r from-app to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-6 bg-gradient-to-l from-app to-transparent" />
        <div className="flex gap-4 overflow-x-auto px-1 pt-1 pb-4">
          {CONTAINER_STATUSES.map((s, i) => (
            <KanbanColumn key={s} statut={s} containers={byStatus.get(s) ?? []} index={i} />
          ))}
        </div>
      </div>
      <DragOverlay dropAnimation={{ duration: 220, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }}>
        {active ? (
          <div className="w-[264px]">
            <KanbanCardContent c={active} overlay />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
