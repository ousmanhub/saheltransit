// Page — Tableau de bord (route « / », design/dashboard.md)

import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { AnimatePresence, motion, useInView } from 'framer-motion'
import {
  AlertTriangle,
  Anchor,
  Banknote,
  CalendarClock,
  ChevronRight,
  Container as ContainerIcon,
  Files,
  Flag,
  Ship,
  Timer,
  Truck,
  X,
} from 'lucide-react'
import { fr } from 'date-fns/locale'
import { isSameDay } from 'date-fns'
import type { Container } from '@/lib/types'
import { EVENT_TYPE_META, STATUS_META } from '@/lib/types'
import { activeContainers, docProgress, globalCounts, useStore } from '@/lib/store'
import { computeCustoms } from '@/lib/customs'
import {
  activityTime,
  daysUntil,
  formatDateShort,
  formatDateWeekday,
  formatFCFA,
  formatNumber,
} from '@/lib/format'
import { cn } from '@/lib/utils'
import KpiCard from '@/components/KpiCard'
import AlertItem from '@/components/AlertItem'
import CorridorStepper, { StatusIcon } from '@/components/CorridorStepper'
import StatusBadge from '@/components/StatusBadge'
import ProgressRing from '@/components/ProgressRing'
import EmptyState from '@/components/EmptyState'
import { useNewContainerModal } from '@/components/AppShell'
import { Calendar } from '@/components/ui/calendar'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

const EASE_OUT_EXPO = [0.22, 1, 0.36, 1] as [number, number, number, number]

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Tri par urgence : T1 critique → doc bloquant → dédouanement → frontière/douala/transit → mer → préparation */
function urgencyRank(c: Container): number {
  if (c.t1 && daysUntil(c.t1.limite) <= 5) return 0
  if (c.documents.some((d) => d.bloquant && d.statut === 'manquant') && c.statut !== 'preparation') return 1
  const byStatus: Record<string, number> = { dedouanement: 2, frontiere: 3, douala: 3, transit: 3, mer: 4, preparation: 5 }
  return byStatus[c.statut] ?? 6
}

/** Pastille contextuelle de la ligne (« T1 : J−2 », « phyto manquant », « 92 % », « BESC ! ») */
function contextChip(c: Container): { label: string; color: string; bg: string } | null {
  if (c.t1) {
    const d = daysUntil(c.t1.limite)
    if (d <= 5) return { label: `T1 : J−${Math.max(d, 0)}`, color: '#DC2626', bg: '#FEF2F2' }
  }
  if (c.statut === 'preparation') {
    const bescKo = c.documents.some((d) => d.nom.startsWith('BESC') && d.statut === 'manquant')
    if (bescKo) return { label: 'BESC !', color: '#DC2626', bg: '#FEF2F2' }
  }
  const bloquant = c.documents.find((d) => d.bloquant && d.statut === 'manquant')
  if (bloquant && c.statut !== 'preparation') {
    const short = bloquant.nom.includes('phytosanitaire') ? 'phyto manquant' : `${bloquant.nom.split(' (')[0]} manquant`
    return { label: short, color: '#EA580C', bg: '#FFF7ED' }
  }
  if (c.statut === 'dedouanement') {
    const { pct } = docProgress(c)
    return { label: `${pct} %`, color: '#059669', bg: '#ECFDF5' }
  }
  return null
}

/** Texte animé (count-up) pour les montants du tableau financier */
function CountUpAmount({ value, format, duration = 700 }: { value: number; format: (n: number) => string; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.6 })
  useEffect(() => {
    if (!inView || !ref.current) return
    const el = ref.current
    const start = performance.now()
    let raf = 0
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration)
      const eased = p === 1 ? 1 : 1 - Math.pow(2, -10 * p)
      el.textContent = format(value * eased)
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [inView, value, format, duration])
  return <span ref={ref}>{format(0)}</span>
}

// ─── Section 0 — Bandeau alertes critiques ───────────────────────────────────

function CriticalBanner() {
  const { alerts } = useStore()
  const [dismissed, setDismissed] = useState(false)
  const urgent = alerts.filter((a) => !a.lue && (a.severite === 'critique' || a.severite === 'importante'))
  const critiques = urgent.filter((a) => a.severite === 'critique')

  if (urgent.length === 0) return null

  const isCritique = critiques.length > 0
  const summary = urgent
    .slice(0, 2)
    .map((a) => a.titre)
    .join(' · ')

  return (
    <AnimatePresence>
      {!dismissed && (
        <motion.div
          initial={{ opacity: 0, y: -16, height: 0 }}
          animate={{ opacity: 1, y: 0, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3, delay: 0.1, ease: EASE_OUT_EXPO }}
          className="overflow-hidden"
        >
          <div
            className="flex items-center gap-3 rounded-xl border px-4 py-3"
            style={
              isCritique
                ? { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }
                : { backgroundColor: '#FDF1DC', borderColor: '#F5DFB5' }
            }
          >
            <span className="relative flex size-9 shrink-0 items-center justify-center rounded-full bg-white">
              <AlertTriangle size={20} strokeWidth={1.75} color={isCritique ? '#DC2626' : '#EA580C'} />
              {isCritique && (
                <span className="absolute -top-0.5 -right-0.5 flex size-2.5">
                  <span className="absolute size-full animate-pulse-ring-fast rounded-full bg-[#DC2626]" />
                  <span className="relative size-2.5 rounded-full bg-[#DC2626]" />
                </span>
              )}
            </span>
            <p className="min-w-0 flex-1 text-sm font-semibold text-ink-900">
              {urgent.length} alerte{urgent.length > 1 ? 's' : ''} {isCritique ? 'critique' : 'importante'}
              {urgent.length > 1 ? 's' : ''}
              <span className="font-normal text-ink-600"> — {summary}</span>
            </p>
            <Link to="/calendrier" className="shrink-0 text-sm font-semibold text-sand-700 hover:text-sand-600">
              Tout voir →
            </Link>
            <button
              type="button"
              onClick={() => setDismissed(true)}
              className="flex size-7 shrink-0 items-center justify-center rounded-lg text-ink-400 hover:bg-black/5"
              aria-label="Masquer le bandeau"
            >
              <X size={16} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ─── Section 1 — KPIs ────────────────────────────────────────────────────────

function KpiRow() {
  const { containers, events } = useStore()
  const actifs = activeContainers(containers)
  const counts = globalCounts(containers)
  const valeurTransit = actifs.reduce((s, c) => s + c.valeurCaf, 0)
  const livresCeMois = containers.filter((c) => c.statut === 'livre' && c.livraison && daysUntil(c.livraison) >= -31).length
  const upcoming = events
    .filter((e) => {
      const d = daysUntil(e.date)
      return d >= 0 && d < 7
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard
        index={0}
        icon={ContainerIcon}
        tint={{ bg: '#E0F2FE', color: '#0EA5E9' }}
        label="Containers actifs"
        value={actifs.length}
        subline={`${livresCeMois} livré${livresCeMois > 1 ? 's' : ''} ce mois-ci`}
        trend="up"
        sublineColor="#059669"
      />
      <KpiCard
        index={1}
        icon={Files}
        tint={{ bg: '#FFF1F2', color: '#E11D48' }}
        label="Documents en attente"
        value={counts.enAttente}
        subline={`${counts.manquants} manquants · dont ${counts.bloquants} bloquants`}
        sublineColor="#E11D48"
      />
      <KpiCard
        index={2}
        icon={Banknote}
        tint={{ bg: '#FEF3C7', color: '#D97706' }}
        label="Valeur en transit (CAF)"
        value={valeurTransit}
        format={(n) => formatFCFA(n)}
        subline={`${containers.length} dossiers au total`}
        sublineColor="#9AA3AD"
        spark={actifs.map((c) => c.valeurCaf / 1_000_000)}
        sparkColor="#E8930C"
      />
      <KpiCard
        index={3}
        icon={Timer}
        tint={{ bg: '#FEF2F2', color: '#DC2626' }}
        label="Échéances < 7 jours"
        value={upcoming.length}
        subline={upcoming[0] ? `prochaine : ${formatDateWeekday(upcoming[0].date)}` : 'aucune échéance proche'}
        sublineIcon={CalendarClock}
        sublineColor="#4B5563"
      />
    </div>
  )
}

// ─── Section 2 — Containers actifs ───────────────────────────────────────────

function ContainerRow({ c, index }: { c: Container; index: number }) {
  const navigate = useNavigate()
  const meta = STATUS_META[c.statut]
  const { valides, requis, pct } = docProgress(c)
  const chip = contextChip(c)

  return (
    <motion.li
      layout="position"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.3, delay: index * 0.06, ease: EASE_OUT_EXPO }}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={() => navigate(`/containers/${c.id}`)}
        onKeyDown={(e) => e.key === 'Enter' && navigate(`/containers/${c.id}`)}
        className="group flex cursor-pointer items-center gap-4 rounded-lg px-3 py-4 transition-colors duration-150 hover:bg-subtle"
      >
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: meta.bg }}>
          <span style={{ color: meta.color }} className="flex">
            <StatusIcon statut={c.statut} size={20} />
          </span>
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm font-semibold text-ink-900">{c.numero}</span>
            <StatusBadge statut={c.statut} />
            {chip && (
              <span
                className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
                style={{ backgroundColor: chip.bg, color: chip.color }}
              >
                {chip.label}
              </span>
            )}
          </div>
          <p className="mt-0.5 truncate text-[13px] leading-[18px] text-ink-600">
            {c.origine} → {c.destination} · {c.compagnie.split('·')[0].trim()}
            {c.eta ? ` · ETA ${formatDateShort(c.eta)}` : c.embarquement ? ` · embarq. ${formatDateShort(c.embarquement)}` : ''}
          </p>
          <CorridorStepper statut={c.statut} variant="mini" className="mt-2 max-w-md" />
        </div>

        <div className="hidden shrink-0 items-center gap-4 md:flex">
          <div className="flex flex-col items-center gap-0.5">
            <ProgressRing value={pct} size={36} stroke={3.5} />
            <span className="text-[11px] font-medium text-ink-400" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {valides}/{requis}
            </span>
          </div>
          <span className="w-28 text-right font-mono text-[13px] font-medium text-ink-900">{formatFCFA(c.valeurCaf)}</span>
          <ChevronRight size={18} className="text-ink-400 transition-transform duration-150 group-hover:translate-x-1" />
        </div>
        <ChevronRight size={18} className="shrink-0 text-ink-400 md:hidden" />
      </div>
    </motion.li>
  )
}

function ActiveContainers() {
  const { containers } = useStore()
  const openNew = useNewContainerModal()
  const [tab, setTab] = useState('tous')
  const actifs = useMemo(() => activeContainers(containers).sort((a, b) => urgencyRank(a) - urgencyRank(b)), [containers])

  const enRoute = actifs.filter((c) => ['mer', 'douala', 'transit', 'frontiere'].includes(c.statut))
  const aDedouaner = actifs.filter((c) => ['douala', 'frontiere', 'dedouanement'].includes(c.statut))
  const liste = tab === 'tous' ? actifs : tab === 'route' ? enRoute : aDedouaner

  return (
    <section className="rounded-xl bg-white shadow-card">
      <header className="flex flex-wrap items-center gap-3 border-b border-border px-5 pt-4 pb-0">
        <h2 className="font-h2 flex items-center gap-2 text-ink-900">
          Containers actifs
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-subtle px-1.5 text-xs font-semibold text-ink-600">
            {actifs.length}
          </span>
        </h2>
        <Tabs value={tab} onValueChange={setTab} className="ml-auto">
          <TabsList className="h-9">
            <TabsTrigger value="tous" className="text-[13px]">Tous ({actifs.length})</TabsTrigger>
            <TabsTrigger value="route" className="text-[13px]">En route ({enRoute.length})</TabsTrigger>
            <TabsTrigger value="dedouanement" className="text-[13px]">À dédouaner ({aDedouaner.length})</TabsTrigger>
          </TabsList>
        </Tabs>
        <Link to="/containers" className="mb-1 text-[13px] font-semibold text-sand-700 hover:text-sand-600">
          Voir tout →
        </Link>
      </header>

      {liste.length === 0 ? (
        <EmptyState
          title="Aucun container en cours"
          description="Créez votre premier dossier d'importation pour suivre le corridor Douala → N'Djamena."
          action={
            <button
              type="button"
              onClick={openNew}
              className="rounded-lg bg-sand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-sand-600"
            >
              + Nouveau container
            </button>
          }
        />
      ) : (
        <AnimatePresence mode="wait" initial={false}>
          <motion.ul key={tab} className="divide-y divide-border px-2 py-1" initial={false}>
            {liste.map((c, i) => (
              <ContainerRow key={c.id} c={c} index={i} />
            ))}
          </motion.ul>
        </AnimatePresence>
      )}
    </section>
  )
}
// ─── Section 3 — Colonne latérale ────────────────────────────────────────────

function AlertsCard() {
  const { alerts } = useStore()
  const visible = alerts.filter((a) => !a.lue).slice(0, 4)

  return (
    <motion.section
      initial={{ opacity: 0, x: 16 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.35, ease: EASE_OUT_EXPO }}
      className="rounded-xl bg-white shadow-card"
    >
      <header className="flex items-center gap-2 border-b border-border px-5 py-4">
        <h3 className="font-h3 text-ink-900">Alertes</h3>
        {visible.length > 0 && (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#E11D48] px-1.5 text-[11px] font-semibold text-white">
            {visible.length}
          </span>
        )}
        <Link to="/calendrier" className="ml-auto text-[13px] font-semibold text-sand-700 hover:text-sand-600">
          Centre d'alertes →
        </Link>
      </header>
      <div className="p-2">
        {visible.length === 0 ? (
          <EmptyState positive title="Tout est en règle" description="Aucune alerte en cours sur vos dossiers." className="py-6" />
        ) : (
          visible.map((a, i) => (
            <motion.div
              key={a.id}
              initial={{ opacity: 0, x: 16 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.35, delay: i * 0.08, ease: EASE_OUT_EXPO }}
            >
              <AlertItem alert={a} compact />
            </motion.div>
          ))
        )}
      </div>
    </motion.section>
  )
}

function DeadlinesCard() {
  const { events, getContainer } = useStore()
  const prochaines = events
    .filter((e) => daysUntil(e.date) >= 0)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 4)

  return (
    <motion.section
      initial={{ opacity: 0, x: 16 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.35, delay: 0.15, ease: EASE_OUT_EXPO }}
      className="rounded-xl bg-white p-5 shadow-card"
    >
      <h3 className="font-h3 text-ink-900">Prochaines échéances</h3>
      <ul className="mt-3 space-y-2.5">
        {prochaines.map((e, i) => {
          const d = new Date(e.date)
          const reste = daysUntil(e.date)
          const urgent = reste <= 2
          const c = e.containerId ? getContainer(e.containerId) : undefined
          return (
            <motion.li
              key={e.id}
              initial={{ opacity: 0, x: 16 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.35, delay: 0.15 + i * 0.08, ease: EASE_OUT_EXPO }}
              className="flex items-center gap-3"
            >
              <span
                className={cn(
                  'flex size-11 shrink-0 flex-col items-center justify-center rounded-lg',
                  urgent ? 'animate-soft-pulse' : '',
                )}
                style={{ backgroundColor: urgent ? '#FEF2F2' : '#EEF0F3' }}
              >
                <span
                  className="font-sora text-xl leading-5 font-bold"
                  style={{ color: urgent ? '#DC2626' : '#111827', fontVariantNumeric: 'tabular-nums' }}
                >
                  {String(d.getDate()).padStart(2, '0')}
                </span>
                <span
                  className="text-[10px] leading-3 font-semibold tracking-wide uppercase"
                  style={{ color: urgent ? '#DC2626' : '#9AA3AD' }}
                >
                  {d.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '')}
                </span>
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm leading-5 font-semibold text-ink-900">{e.libelle}</p>
                {c && <p className="truncate font-mono text-xs text-ink-400">{c.numero}</p>}
              </div>
            </motion.li>
          )
        })}
        {prochaines.length === 0 && (
          <li className="py-2 text-[13px] text-ink-400">Aucune échéance à venir.</li>
        )}
      </ul>
    </motion.section>
  )
}

function MiniCalendarCard() {
  const { events, getContainer } = useStore()
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const navigate = useNavigate()

  const modifiers = useMemo(() => {
    const byType: Record<string, Date[]> = {}
    for (const e of events) {
      byType[e.type] = [...(byType[e.type] ?? []), new Date(e.date)]
    }
    return byType
  }, [events])

  const modifiersClassNames = useMemo(() => {
    const out: Record<string, string> = {}
    for (const type of Object.keys(modifiers)) out[type] = `cal-dot cal-dot-${type}`
    return out
  }, [modifiers])

  const dayEvents = selectedDay ? events.filter((e) => isSameDay(new Date(e.date), selectedDay)) : []

  return (
    <motion.section
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.3, delay: 0.3 }}
      className="rounded-xl bg-white p-4 shadow-card"
    >
      <Calendar
        mode="single"
        locale={fr}
        weekStartsOn={1}
        selected={selectedDay ?? undefined}
        onDayClick={(day) => setSelectedDay((prev) => (prev && isSameDay(prev, day) ? null : day))}
        modifiers={modifiers}
        modifiersClassNames={modifiersClassNames}
        className="mx-auto"
        classNames={{
          today: 'rounded-full bg-sand-500 text-white font-semibold',
        }}
      />
      <AnimatePresence>
        {selectedDay && dayEvents.length > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 260, damping: 24 }}
            className="mt-2 rounded-lg border border-border bg-subtle/60 p-3"
          >
            <p className="text-overline mb-1.5 text-ink-400">
              {selectedDay.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
            <ul className="space-y-1.5">
              {dayEvents.map((e) => {
                const c = e.containerId ? getContainer(e.containerId) : undefined
                return (
                  <li key={e.id} className="flex items-center gap-2 text-[13px]">
                    <span className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: EVENT_TYPE_META[e.type].color }} />
                    <span className="min-w-0 flex-1 truncate font-medium text-ink-900">{e.libelle}</span>
                    {c && <span className="font-mono text-[11px] text-ink-400">{c.numero}</span>}
                  </li>
                )
              })}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
      <button
        type="button"
        onClick={() => navigate('/calendrier')}
        className="mt-3 w-full rounded-lg border border-border py-2 text-[13px] font-semibold text-ink-600 transition-colors hover:bg-subtle"
      >
        Ouvrir le calendrier →
      </button>
    </motion.section>
  )
}

// ─── Section 4 — Corridor ────────────────────────────────────────────────────

/** Positions (en % du viewBox 800×480) des villes-étapes + point offshore */
const MAP_POSITIONS: Record<string, { x: number; y: number }> = {
  offshore: { x: 11.2, y: 72.9 },
  douala: { x: 24.4, y: 60 },
  ngaoundere: { x: 49.8, y: 46.2 },
  kousseri: { x: 73.8, y: 33.3 },
  ngueli: { x: 81, y: 27.5 },
  ndjamena: { x: 89, y: 22.9 },
}

function mapPosition(c: Container): { x: number; y: number } {
  if (c.statut === 'mer' || c.statut === 'preparation') return MAP_POSITIONS.offshore
  if (c.statut === 'douala') return MAP_POSITIONS.douala
  if (c.statut === 'transit') {
    const loc = (c.localisation ?? '').toLowerCase()
    if (loc.includes('kouss')) return MAP_POSITIONS.kousseri
    return MAP_POSITIONS.ngaoundere
  }
  if (c.statut === 'frontiere' || c.statut === 'dedouanement') return MAP_POSITIONS.ngueli
  return MAP_POSITIONS.ndjamena
}

const MARKER_ICONS = { mer: Ship, douala: Anchor, transit: Truck, frontiere: Flag } as const

function CorridorWidget() {
  const { containers } = useStore()
  const enRoute = activeContainers(containers).filter((c) => c.statut !== 'preparation')
  const navigate = useNavigate()
  const mapRef = useRef<HTMLDivElement>(null)
  const inView = useInView(mapRef, { once: true, amount: 0.3 })

  return (
    <motion.section
      ref={mapRef}
      initial={{ opacity: 0, y: 16 }}
      animate={inView ? { opacity: 1, y: 0 } : undefined}
      transition={{ duration: 0.4, ease: EASE_OUT_EXPO }}
      className="rounded-xl bg-white shadow-card"
    >
      <header className="flex items-center gap-3 border-b border-border px-5 py-4">
        <h3 className="font-h3 text-ink-900">Corridor Douala → N'Djamena</h3>
        <span className="text-xs text-ink-400">
          ~1 700 km · {enRoute.length} container{enRoute.length > 1 ? 's' : ''} en route
        </span>
      </header>
      <div className="grid gap-4 p-5 lg:grid-cols-12">
        {/* Carte avec marqueurs live */}
        <div className="relative overflow-hidden rounded-xl lg:col-span-7">
          <img src="/corridor-map.svg" alt="Carte du corridor Douala → N'Djamena" className="h-auto w-full" />
          {enRoute.map((c, i) => {
            const pos = mapPosition(c)
            const meta = STATUS_META[c.statut]
            const Icon = MARKER_ICONS[c.statut as keyof typeof MARKER_ICONS] ?? Truck
            const isLive = c.statut === 'transit'
            return (
              <motion.button
                key={c.id}
                type="button"
                onClick={() => navigate(`/containers/${c.id}`)}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={inView ? { scale: 1, opacity: 1 } : undefined}
                transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.9 + i * 0.15 }}
                className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                title={`${c.numero} — ${meta.label}`}
              >
                <motion.span
                  animate={isLive ? { x: [0, 14, 0], y: [0, -5, 0] } : undefined}
                  transition={isLive ? { duration: 6, repeat: Infinity, ease: 'easeInOut' } : undefined}
                  className="relative flex size-7 items-center justify-center rounded-full border-2 border-white shadow-raised"
                  style={{ backgroundColor: meta.dot }}
                >
                  <Icon size={13} color="#FFFFFF" strokeWidth={2} />
                  {isLive && (
                    <span className="absolute inset-0 -z-10 animate-pulse-ring rounded-full" style={{ backgroundColor: meta.dot }} />
                  )}
                </motion.span>
              </motion.button>
            )
          })}
        </div>

        {/* Positions live */}
        <div className="lg:col-span-5">
          <p className="text-overline mb-2 text-ink-400">Positions en direct</p>
          <ul className="space-y-1">
            {enRoute.map((c, i) => {
              const meta = STATUS_META[c.statut]
              return (
                <motion.li
                  key={c.id}
                  initial={{ opacity: 0, x: 12 }}
                  animate={inView ? { opacity: 1, x: 0 } : undefined}
                  transition={{ duration: 0.3, delay: 1 + i * 0.12, ease: EASE_OUT_EXPO }}
                >
                  <button
                    type="button"
                    onClick={() => navigate(`/containers/${c.id}`)}
                    className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-subtle"
                  >
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: meta.bg }}>
                      <span style={{ color: meta.color }} className="flex">
                        <StatusIcon statut={c.statut} size={14} />
                      </span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-mono text-[13px] font-semibold text-ink-900">{c.numero}</span>
                      <span className="block truncate text-xs text-ink-400">
                        {c.statut === 'mer'
                          ? `En mer · ETA ${c.eta ? formatDateShort(c.eta) : '—'}`
                          : `${c.localisation ?? meta.label}${c.balise ? ` · balise ${c.balise}` : ''} · il y a 2 h`}
                      </span>
                    </span>
                    <ChevronRight size={16} className="shrink-0 text-ink-400" />
                  </button>
                </motion.li>
              )
            })}
          </ul>
          <p className="mt-3 text-xs text-ink-400">
            Positions indicatives (démo) — balise GPS NEXUS en transit terrestre
          </p>
        </div>
      </div>
    </motion.section>
  )
}
// ─── Section 5 — Aperçu financier ────────────────────────────────────────────

function FinancialOverview() {
  const { containers } = useStore()
  const navigate = useNavigate()

  const rows = useMemo(
    () =>
      containers
        .filter((c) => c.statut !== 'preparation' && c.statut !== 'livre')
        .map((c) => ({ c, r: computeCustoms({ caf: c.valeurCaf, tec: c.tec, tvaExoneree: c.tvaExoneree }) }))
        .sort((a, b) => b.c.valeurCaf - a.c.valeurCaf),
    [containers],
  )
  const totalTaxes = rows.reduce((s, { r }) => s + r.total, 0)

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.4, ease: EASE_OUT_EXPO }}
      className="rounded-xl bg-white shadow-card"
    >
      <header className="flex items-center gap-3 border-b border-border px-5 py-4">
        <h3 className="font-h3 text-ink-900">Coûts douaniers estimés</h3>
        <Link to="/calculateur" className="ml-auto text-[13px] font-semibold text-sand-700 hover:text-sand-600">
          Ouvrir le calculateur →
        </Link>
      </header>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-subtle text-left">
              <th className="text-overline px-5 py-2.5 font-semibold text-ink-400">Container</th>
              <th className="text-overline px-3 py-2.5 text-right font-semibold text-ink-400">CAF</th>
              <th className="text-overline px-3 py-2.5 text-right font-semibold text-ink-400">Droits estimés</th>
              <th className="text-overline px-3 py-2.5 text-right font-semibold text-ink-400">TVA</th>
              <th className="text-overline px-5 py-2.5 text-right font-semibold text-ink-400">Total taxes</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ c, r }, i) => (
              <motion.tr
                key={c.id}
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
                onClick={() => navigate(`/containers/${c.id}`)}
                className="cursor-pointer border-t border-border transition-colors hover:bg-subtle"
              >
                <td className="px-5 py-3">
                  <span className="font-mono text-[13px] font-semibold text-ink-900">{c.numero}</span>
                  {c.tvaExoneree && <span className="ml-2 text-xs text-ink-400">(exon. TVA)</span>}
                </td>
                <td className="px-3 py-3 text-right font-mono text-[13px] text-ink-600">{formatNumber(r.caf)}</td>
                <td className="px-3 py-3 text-right font-mono text-[13px] text-ink-600">{formatNumber(r.droits)}</td>
                <td className="px-3 py-3 text-right font-mono text-[13px] text-ink-600">{formatNumber(r.tva)}</td>
                <td className="px-5 py-3 text-right font-mono text-[13px] font-semibold text-ink-900">
                  <CountUpAmount value={r.total} format={formatNumber} />
                </td>
              </motion.tr>
            ))}
          </tbody>
          <tfoot>
            <motion.tr
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.4 }}
              className="border-t border-border-strong"
            >
              <td colSpan={5} className="px-5 py-3 text-right text-sm font-semibold text-ink-900">
                Total taxes provisionnées : <span className="font-mono">{formatFCFA(totalTaxes)}</span>
              </td>
            </motion.tr>
          </tfoot>
        </table>
      </div>
      <p className="px-5 pb-4 text-xs text-ink-400">
        Estimation indicative — taux CEMAC 2025, hors accises et frais de transitaire
      </p>
    </motion.section>
  )
}

// ─── Section 6 — Activité récente ────────────────────────────────────────────

function RecentActivity() {
  const { activity, getContainer } = useStore()
  const navigate = useNavigate()
  const entries = [...activity].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.4, delay: 0.1, ease: EASE_OUT_EXPO }}
      className="rounded-xl bg-white p-5 shadow-card"
    >
      <h3 className="font-h3 text-ink-900">Activité récente</h3>
      <ol className="relative mt-4 max-h-[360px] space-y-4 overflow-y-auto pr-1 pl-4">
        <span className="absolute top-1 bottom-1 left-[3px] w-px bg-border" aria-hidden />
        {entries.map((e, i) => {
          const c = e.containerId ? getContainer(e.containerId) : undefined
          return (
            <motion.li
              key={e.id}
              initial={{ opacity: 0, x: -8 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, delay: i * 0.06, ease: EASE_OUT_EXPO }}
              className="relative"
            >
              <span
                className="absolute top-1.5 -left-4 size-2 rounded-full ring-2 ring-white"
                style={{ backgroundColor: e.couleur }}
              />
              <button
                type="button"
                onClick={() => c && navigate(`/containers/${c.id}`)}
                className={cn('block w-full text-left', c && 'cursor-pointer')}
              >
                <p className="text-[13px] leading-[18px] font-medium text-ink-900">{e.message}</p>
                <p className="mt-0.5 text-xs text-ink-400">{activityTime(e.createdAt)}</p>
              </button>
            </motion.li>
          )
        })}
      </ol>
    </motion.section>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function Dashboard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: EASE_OUT_EXPO }}
      className="space-y-6"
    >
      <CriticalBanner />
      <KpiRow />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="space-y-6 xl:col-span-8">
          <ActiveContainers />
          <CorridorWidget />
        </div>
        <div className="space-y-6 xl:col-span-4">
          <AlertsCard />
          <DeadlinesCard />
          <MiniCalendarCard />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="xl:col-span-7">
          <FinancialOverview />
        </div>
        <div className="xl:col-span-5">
          <RecentActivity />
        </div>
      </div>
    </motion.div>
  )
}
