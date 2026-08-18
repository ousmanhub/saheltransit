// Page — Containers (route « /containers », design/containers.md)
// Inventaire complet : 3 vues (table dense / kanban 8 colonnes / cartes),
// recherche instantanée, filtres + chips actifs, sélecteur de vue segmenté.

import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Columns3,
  LayoutGrid,
  Plus,
  Search,
  SlidersHorizontal,
  Table2,
  X,
} from 'lucide-react'
import type { DateRange } from 'react-day-picker'
import { fr } from 'date-fns/locale'
import type { Container, ContainerStatus } from '@/lib/types'
import { CONTAINER_STATUSES, STATUS_META } from '@/lib/types'
import { activeContainers, docProgress, useStore } from '@/lib/store'
import { formatDateShort, formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useNewContainerModal } from '@/components/AppShell'
import { Calendar } from '@/components/ui/calendar'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import TableView from '@/components/containers/TableView'
import type { SortKey, SortDir } from '@/components/containers/TableView'
import KanbanView from '@/components/containers/KanbanView'
import CardsView from '@/components/containers/CardsView'
import EditContainerDialog from '@/components/containers/EditContainerDialog'
import { flashAndReload, removeStoredContainers } from '@/components/containers/storagePatch'
import { EASE_OUT_EXPO, deadlineSortKey, useFlashToast, useIsMobile } from '@/components/containers/utils'

type ViewMode = 'table' | 'kanban' | 'cartes'

/** Filtre corridor : regroupement d'étapes (design §1) */
const CORRIDOR_FILTERS = [
  { key: 'mer', label: 'En mer', statuts: ['mer'] as ContainerStatus[] },
  { key: 'douala', label: 'Douala', statuts: ['douala'] as ContainerStatus[] },
  { key: 'route', label: 'Route', statuts: ['transit'] as ContainerStatus[] },
  { key: 'frontiere', label: 'Frontière', statuts: ['frontiere'] as ContainerStatus[] },
  { key: 'dedouanement', label: 'Dédouanement', statuts: ['dedouanement', 'dedouane'] as ContainerStatus[] },
  { key: 'livre', label: 'Livré', statuts: ['livre'] as ContainerStatus[] },
] as const

interface Chip {
  id: string
  label: string
  onRemove: () => void
}

export default function Containers() {
  const { containers } = useStore()
  const openNew = useNewContainerModal()
  const isMobile = useIsMobile()
  useFlashToast()

  // ─── État des filtres ──────────────────────────────────────────────────────
  const [query, setQuery] = useState('')
  const [statut, setStatut] = useState<ContainerStatus | 'all'>('all')
  const [corridor, setCorridor] = useState<string>('all')
  const [etaRange, setEtaRange] = useState<DateRange | undefined>(undefined)
  const [valMin, setValMin] = useState('')
  const [valMax, setValMax] = useState('')
  const [docsIncomplets, setDocsIncomplets] = useState(false)
  const [view, setView] = useState<ViewMode>('table')
  const [sortKey, setSortKey] = useState<SortKey | 'deadline'>('deadline')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [selection, setSelection] = useState<ReadonlySet<string>>(new Set())
  const [editTarget, setEditTarget] = useState<Container | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteIds, setDeleteIds] = useState<string[] | null>(null)

  const actifs = useMemo(() => activeContainers(containers), [containers])

  // ─── Filtrage ──────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const min = valMin.trim() ? Number(valMin.replace(/\s/g, '')) : null
    const max = valMax.trim() ? Number(valMax.replace(/\s/g, '')) : null
    return containers.filter((c) => {
      if (q) {
        const haystack = `${c.numero} ${c.contenu} ${c.fournisseur} ${c.compagnie} ${c.origine}`.toLowerCase()
        if (!haystack.includes(q)) return false
      }
      if (statut !== 'all' && c.statut !== statut) return false
      if (corridor !== 'all') {
        const f = CORRIDOR_FILTERS.find((x) => x.key === corridor)
        if (f && !f.statuts.includes(c.statut)) return false
      }
      if (etaRange?.from || etaRange?.to) {
        if (!c.eta) return false
        const t = new Date(c.eta).getTime()
        if (etaRange.from && t < etaRange.from.getTime()) return false
        if (etaRange.to && t > etaRange.to.getTime() + 86_399_999) return false
      }
      if (min !== null && Number.isFinite(min) && c.valeurCaf < min) return false
      if (max !== null && Number.isFinite(max) && c.valeurCaf > max) return false
      if (docsIncomplets && docProgress(c).valides >= docProgress(c).requis) return false
      return true
    })
  }, [containers, query, statut, corridor, etaRange, valMin, valMax, docsIncomplets])

  // ─── Tri ───────────────────────────────────────────────────────────────────
  const sorted = useMemo(() => {
    const arr = [...filtered]
    const dir = sortDir === 'asc' ? 1 : -1
    switch (sortKey) {
      case 'deadline':
        arr.sort((a, b) => deadlineSortKey(a) - deadlineSortKey(b))
        break
      case 'numero':
        arr.sort((a, b) => dir * a.numero.localeCompare(b.numero))
        break
      case 'statut':
        arr.sort((a, b) => dir * (CONTAINER_STATUSES.indexOf(a.statut) - CONTAINER_STATUSES.indexOf(b.statut)))
        break
      case 'eta': {
        const ts = (c: Container) => (c.eta ? new Date(c.eta).getTime() : Number.MAX_SAFE_INTEGER)
        arr.sort((a, b) => dir * (ts(a) - ts(b)))
        break
      }
      case 'valeur':
        arr.sort((a, b) => dir * (a.valeurCaf - b.valeurCaf))
        break
      case 'docs':
        arr.sort((a, b) => dir * (docProgress(a).pct - docProgress(b).pct))
        break
    }
    return arr
  }, [filtered, sortKey, sortDir])

  const onSort = (k: SortKey) => {
    if (sortKey === k) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSortKey(k)
      setSortDir('asc')
    }
  }

  // ─── Chips de filtres actifs ───────────────────────────────────────────────
  const clearAll = () => {
    setQuery('')
    setStatut('all')
    setCorridor('all')
    setEtaRange(undefined)
    setValMin('')
    setValMax('')
    setDocsIncomplets(false)
  }

  const chips: Chip[] = []
  if (statut !== 'all') chips.push({ id: 'statut', label: `Statut : ${STATUS_META[statut].label}`, onRemove: () => setStatut('all') })
  if (corridor !== 'all') {
    const f = CORRIDOR_FILTERS.find((x) => x.key === corridor)
    if (f) chips.push({ id: 'corridor', label: `Étape : ${f.label}`, onRemove: () => setCorridor('all') })
  }
  if (etaRange?.from) {
    chips.push({
      id: 'periode',
      label: `ETA : ${formatDateShort(etaRange.from)}${etaRange.to ? ` → ${formatDateShort(etaRange.to)}` : ''}`,
      onRemove: () => setEtaRange(undefined),
    })
  }
  if (valMin.trim()) chips.push({ id: 'min', label: `Valeur ≥ ${formatNumber(Number(valMin.replace(/\s/g, '')))}`, onRemove: () => setValMin('') })
  if (valMax.trim()) chips.push({ id: 'max', label: `Valeur ≤ ${formatNumber(Number(valMax.replace(/\s/g, '')))}`, onRemove: () => setValMax('') })
  if (docsIncomplets) chips.push({ id: 'docs', label: 'Documents incomplets', onRemove: () => setDocsIncomplets(false) })

  const advancedCount = (etaRange?.from ? 1 : 0) + (valMin.trim() ? 1 : 0) + (valMax.trim() ? 1 : 0) + (docsIncomplets ? 1 : 0)

  // ─── Sélection / actions ───────────────────────────────────────────────────
  const toggleSelect = (id: string) => {
    setSelection((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }
  const toggleSelectAll = () => {
    setSelection((prev) => (sorted.every((c) => prev.has(c.id)) ? new Set() : new Set(sorted.map((c) => c.id))))
  }

  const confirmDelete = () => {
    if (!deleteIds || deleteIds.length === 0) return
    const numeros = containers.filter((c) => deleteIds.includes(c.id)).map((c) => c.numero)
    removeStoredContainers(deleteIds)
    flashAndReload({
      type: 'success',
      message:
        deleteIds.length === 1
          ? `Dossier supprimé — ${numeros[0]}`
          : `${deleteIds.length} dossiers supprimés`,
    })
  }

  const viewButtons: { key: ViewMode; label: string; icon: typeof Table2 }[] = [
    { key: 'table', label: 'Vue table', icon: Table2 },
    { key: 'kanban', label: 'Vue kanban', icon: Columns3 },
    { key: 'cartes', label: 'Vue cartes', icon: LayoutGrid },
  ]

  return (
    <div className="space-y-4">
      {/* Caption de page (le titre « Containers » est dans la topbar) */}
      <p className="text-[13px] text-ink-400" style={{ fontVariantNumeric: 'tabular-nums' }}>
        {containers.length} dossiers · {actifs.length} actifs
      </p>

      {/* ── Barre d'outils ── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.05, ease: EASE_OUT_EXPO }}
        className="sticky top-20 z-30 flex flex-wrap items-center gap-2.5 rounded-xl bg-white px-4 py-3 shadow-card"
      >
        {/* Recherche locale */}
        <div className="relative w-full sm:w-[280px]">
          <Search size={15} strokeWidth={1.75} className="absolute top-1/2 left-3 -translate-y-1/2 text-ink-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="N° container, fournisseur, article…"
            className="h-9 w-full rounded-lg border border-transparent bg-subtle pr-3 pl-9 text-[13px] text-ink-900 placeholder:text-ink-400 focus:border-sand-500 focus:bg-white focus:outline-none"
            aria-label="Rechercher un container"
          />
        </div>

        {/* Filtre statut */}
        <Select value={statut} onValueChange={(v) => setStatut(v as ContainerStatus | 'all')}>
          <SelectTrigger className="h-9 w-auto min-w-[150px] gap-2 border-border bg-white text-[13px]">
            <SelectValue placeholder="Tous les statuts" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            {CONTAINER_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                <span className="flex items-center gap-2">
                  <span className="size-2 rounded-full" style={{ backgroundColor: STATUS_META[s].dot }} />
                  {STATUS_META[s].label}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Filtre corridor */}
        <Select value={corridor} onValueChange={setCorridor}>
          <SelectTrigger className="h-9 w-auto min-w-[140px] gap-2 border-border bg-white text-[13px]">
            <SelectValue placeholder="Toutes les étapes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les étapes</SelectItem>
            {CORRIDOR_FILTERS.map((f) => (
              <SelectItem key={f.key} value={f.key}>
                {f.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Filtres avancés */}
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={cn(
                'relative inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-[13px] font-medium transition-colors',
                advancedCount > 0
                  ? 'border-sand-500 bg-sand-100 text-sand-700'
                  : 'border-border bg-white text-ink-600 hover:bg-subtle',
              )}
            >
              <SlidersHorizontal size={15} strokeWidth={1.75} />
              Filtres
              {advancedCount > 0 && (
                <span className="flex size-4 items-center justify-center rounded-full bg-sand-500 text-[10px] font-bold text-white">
                  {advancedCount}
                </span>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-[340px] p-4">
            <p className="text-overline mb-2 text-ink-400">Période (ETA du… au…)</p>
            <Calendar
              mode="range"
              selected={etaRange}
              onSelect={setEtaRange}
              numberOfMonths={1}
              locale={fr}
              className="rounded-lg border border-border"
            />
            <p className="text-overline mt-4 mb-2 text-ink-400">Valeur CAF (FCFA)</p>
            <div className="grid grid-cols-2 gap-2">
              <Input inputMode="numeric" placeholder="Min" value={valMin} onChange={(e) => setValMin(e.target.value)} className="h-9 font-mono text-[13px]" />
              <Input inputMode="numeric" placeholder="Max" value={valMax} onChange={(e) => setValMax(e.target.value)} className="h-9 font-mono text-[13px]" />
            </div>
            <label className="mt-4 flex items-center justify-between gap-3 text-[13px] font-medium text-ink-600">
              Documents incomplets uniquement
              <Switch checked={docsIncomplets} onCheckedChange={setDocsIncomplets} />
            </label>
          </PopoverContent>
        </Popover>

        <span className="mx-1 hidden h-5 w-px bg-border sm:block" />

        {/* Sélecteur de vue segmenté */}
        <div className="flex items-center rounded-lg bg-subtle p-0.5" role="tablist" aria-label="Mode d'affichage">
          {viewButtons.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={view === key}
              title={label}
              onClick={() => setView(key)}
              className={cn(
                'flex size-8 items-center justify-center rounded-md transition-colors duration-150',
                view === key ? 'bg-navy-950 text-white' : 'text-ink-400 hover:text-ink-600',
              )}
            >
              <Icon size={15} strokeWidth={1.75} />
            </button>
          ))}
        </div>

        {/* Compteur de résultats (flash sand-100 au changement) */}
        <motion.span
          key={sorted.length}
          initial={{ backgroundColor: '#FDF1DC' }}
          animate={{ backgroundColor: 'rgba(253,241,220,0)' }}
          transition={{ duration: 0.6 }}
          className="rounded-md px-2 py-1 text-xs font-medium text-ink-600"
          style={{ fontVariantNumeric: 'tabular-nums' }}
        >
          {sorted.length} résultat{sorted.length > 1 ? 's' : ''}
        </motion.span>

        {/* CTA */}
        <button
          type="button"
          onClick={openNew}
          className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-lg bg-sand-500 px-3.5 text-[13px] font-semibold text-white transition-colors hover:bg-sand-600"
        >
          <Plus size={16} />
          Nouveau container
        </button>
      </motion.div>

      {/* ── Chips de filtres actifs ── */}
      <AnimatePresence initial={false}>
        {chips.length > 0 && (
          <motion.div layout className="flex flex-wrap items-center gap-2">
            <AnimatePresence initial={false}>
              {chips.map((chip, i) => (
                <motion.span
                  key={chip.id}
                  layout
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.15 } }}
                  transition={{ type: 'spring', stiffness: 260, damping: 24, delay: i * 0.04 }}
                  className="inline-flex h-7 items-center gap-1.5 rounded-full border border-border bg-white pr-1.5 pl-3 text-xs font-medium text-ink-600"
                >
                  {chip.label}
                  <button
                    type="button"
                    onClick={chip.onRemove}
                    className="flex size-4 items-center justify-center rounded-full text-ink-400 hover:bg-subtle hover:text-ink-600"
                    aria-label={`Retirer le filtre ${chip.label}`}
                  >
                    <X size={11} />
                  </button>
                </motion.span>
              ))}
            </AnimatePresence>
            <button
              type="button"
              onClick={clearAll}
              className="text-xs font-semibold text-sand-700 hover:text-sand-600"
            >
              Tout effacer
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Vues ── */}
      {isMobile ? (
        <>
          <p className="text-xs text-ink-400 italic">Vue table disponible sur écran large.</p>
          <CardsView containers={sorted} />
        </>
      ) : view === 'table' ? (
        <TableView
          containers={sorted}
          sortKey={sortKey === 'deadline' ? null : sortKey}
          sortDir={sortDir}
          onSort={onSort}
          selection={selection}
          onToggleSelect={toggleSelect}
          onToggleSelectAll={toggleSelectAll}
          query={query.trim()}
          onClearFilters={clearAll}
          onEdit={(c) => {
            setEditTarget(c)
            setEditOpen(true)
          }}
          onDelete={setDeleteIds}
        />
      ) : view === 'kanban' ? (
        <KanbanView containers={sorted} />
      ) : (
        <CardsView containers={sorted} />
      )}

      {/* ── Modales ── */}
      <EditContainerDialog container={editTarget} open={editOpen} onOpenChange={setEditOpen} />

      <AlertDialog open={deleteIds !== null} onOpenChange={(o) => !o && setDeleteIds(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteIds && deleteIds.length > 1 ? `Supprimer ${deleteIds.length} dossiers ?` : 'Supprimer le dossier ?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteIds && deleteIds.length > 1
                ? 'Les dossiers sélectionnés, leurs documents et leurs échéances seront définitivement supprimés.'
                : `${containers.find((c) => c.id === deleteIds?.[0])?.numero ?? 'Ce dossier'} et ses documents seront définitivement supprimés.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-[#E11D48] text-white hover:bg-[#BE123C]">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
