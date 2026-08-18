// Page — Centre des documents (route « /documents », design/documents.md)
// Vue transverse : synthèse documentaire, file « À traiter », matrice
// 13 documents × 7 containers, vue par type, drawer de détail.

import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, useInView } from 'framer-motion'
import { toast } from 'sonner'
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  FileCheck,
  LayoutList,
  Rows3,
  Search,
  Table2,
} from 'lucide-react'
import type { Container, DocStatus, DocumentItem } from '@/lib/types'
import { DOC_STATUS_META, DOC_TYPES } from '@/lib/types'
import { globalCounts, useStore } from '@/lib/store'
import { useIsMobile } from '@/hooks/use-mobile'
import ProgressRing from '@/components/ProgressRing'
import FileATraiter from '@/components/documents/FileATraiter'
import MatriceView from '@/components/documents/MatriceView'
import ParTypeView from '@/components/documents/ParTypeView'
import DocDetailDrawer from '@/components/documents/DocDetailDrawer'
import type { DocEntry } from '@/components/documents/docMeta'
import { flattenDocuments, shortDocName, useDocMeta } from '@/components/documents/docMeta'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const EASE_OUT_EXPO = [0.22, 1, 0.36, 1] as [number, number, number, number]

type View = 'traiter' | 'matrice' | 'type'
type Tri = 'urgence' | 'container' | 'document'

/** Valeur animée (count-up 700ms, easing expo) au premier affichage */
function CountUp({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.6 })
  useEffect(() => {
    if (!inView || !ref.current) return
    const el = ref.current
    const start = performance.now()
    let raf = 0
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / 700)
      const eased = p === 1 ? 1 : 1 - Math.pow(2, -10 * p)
      el.textContent = String(Math.round(value * eased))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [inView, value])
  return <span ref={ref}>0</span>
}

// ─── Bandeau synthèse ────────────────────────────────────────────────────────

interface SyntheseProps {
  manquants: number
  bloquants: number
  demandes: number
  recus: number
  valides: number
  requis: number
}

function Synthese({ manquants, bloquants, demandes, recus, valides, requis }: SyntheseProps) {
  const pct = requis > 0 ? Math.round((valides / requis) * 100) : 100
  const cards = [
    {
      icon: AlertCircle,
      tint: { bg: '#FFF1F2', color: '#E11D48' },
      label: 'Manquants',
      value: manquants,
      sub: `dont ${bloquants} bloquant${bloquants > 1 ? 's' : ''}`,
      subColor: bloquants > 0 ? '#E11D48' : '#9AA3AD',
      pulse: manquants > 0,
    },
    {
      icon: Clock,
      tint: { bg: '#FFFBEB', color: '#D97706' },
      label: 'Demandés',
      value: demandes,
      sub: 'en attente fournisseur/transitaire',
      subColor: '#9AA3AD',
      pulse: false,
    },
    {
      icon: FileCheck,
      tint: { bg: '#F0F9FF', color: '#0284C7' },
      label: 'Reçus à valider',
      value: recus,
      sub: 'à vérifier puis valider',
      subColor: '#9AA3AD',
      pulse: false,
    },
    {
      icon: CheckCircle2,
      tint: { bg: '#ECFDF5', color: '#059669' },
      label: 'Validés',
      value: valides,
      sub: `sur ${requis} pièces requises · ${pct} %`,
      subColor: '#9AA3AD',
      pulse: false,
      ring: true,
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      {cards.map((card, i) => (
        <motion.div
          key={card.label}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: i * 0.06, ease: EASE_OUT_EXPO }}
          className="flex items-center gap-3.5 rounded-xl bg-white p-4 shadow-card"
        >
          <span className="relative flex size-8 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: card.tint.bg }}>
            <card.icon size={16} strokeWidth={1.75} style={{ color: card.tint.color }} />
            {card.pulse && (
              <span className="absolute -top-0.5 -right-0.5 flex size-2">
                <span className="absolute size-full animate-pulse-ring-fast rounded-full bg-[#E11D48]" />
                <span className="relative size-2 rounded-full bg-[#E11D48]" />
              </span>
            )}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-overline text-[10px] text-ink-400">{card.label}</p>
            <p className="font-sora text-[22px] leading-7 font-bold text-ink-900" style={{ fontVariantNumeric: 'tabular-nums' }}>
              <CountUp value={card.value} />
            </p>
            <p className="truncate text-[11px] leading-4" style={{ color: card.subColor }}>
              {card.sub}
            </p>
          </div>
          {card.ring && <ProgressRing value={pct} size={40} stroke={4} className="hidden shrink-0 sm:inline-flex" />}
        </motion.div>
      ))}
    </div>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function Documents() {
  const { containers, updateDocStatus } = useStore()
  const { meta, setDocMeta } = useDocMeta()
  const isMobile = useIsMobile()

  const [view, setView] = useState<View>('traiter')
  const [search, setSearch] = useState('')
  const [statutFilter, setStatutFilter] = useState<'tous' | DocStatus>('tous')
  const [containerFilter, setContainerFilter] = useState<string>('tous')
  const [bloquantsOnly, setBloquantsOnly] = useState(false)
  const [tri, setTri] = useState<Tri>('urgence')
  const [drawerSel, setDrawerSel] = useState<{ containerId: string; docId: string } | null>(null)

  // Entrée du drawer re-dérivée du store (statut toujours frais après mutation)
  const drawerEntry: DocEntry | null = useMemo(() => {
    if (!drawerSel) return null
    const container = containers.find((c) => c.id === drawerSel.containerId)
    const doc = container?.documents.find((d) => d.id === drawerSel.docId)
    return container && doc ? { container, doc } : null
  }, [drawerSel, containers])

  // Dernière entrée conservée pour l'animation de sortie du drawer
  const [lastEntry, setLastEntry] = useState<DocEntry | null>(null)
  useEffect(() => {
    if (drawerEntry && drawerEntry !== lastEntry) {
      const id = setTimeout(() => setLastEntry(drawerEntry), 0)
      return () => clearTimeout(id)
    }
  }, [drawerEntry, lastEntry])

  // <768px : la matrice bascule automatiquement sur « À traiter »
  useEffect(() => {
    if (isMobile && view === 'matrice') {
      const id = setTimeout(() => setView('traiter'), 0)
      return () => clearTimeout(id)
    }
  }, [isMobile, view])

  const counts = useMemo(() => globalCounts(containers), [containers])
  const recus = useMemo(
    () => containers.reduce((acc, c) => acc + c.documents.filter((d) => d.statut === 'recu').length, 0),
    [containers],
  )

  const filtered = search.trim() !== '' || statutFilter !== 'tous' || containerFilter !== 'tous' || bloquantsOnly

  /** Prédicat de correspondance aux filtres de la barre d'outils */
  const matches = useMemo(() => {
    const q = search.trim().toLowerCase()
    return (container: Container, doc: DocumentItem): boolean => {
      if (containerFilter !== 'tous' && container.id !== containerFilter) return false
      if (statutFilter !== 'tous' && doc.statut !== statutFilter) return false
      if (bloquantsOnly && !doc.bloquant) return false
      if (q) {
        const ref = (meta[doc.id]?.reference ?? '').toLowerCase()
        const hay = `${doc.nom} ${shortDocName(doc.nom)} ${container.numero} ${ref}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    }
  }, [search, statutFilter, containerFilter, bloquantsOnly, meta])

  // File « À traiter » : manquants + demandés + reçus, filtrés et triés
  const queue = useMemo(() => {
    const entries = flattenDocuments(containers).filter(
      ({ container, doc }) =>
        (doc.statut === 'manquant' || doc.statut === 'demande' || doc.statut === 'recu') &&
        matches(container, doc),
    )
    const docOrder = (d: DocumentItem) => DOC_TYPES.indexOf(d.nom)
    const statutOrder: Record<string, number> = { dedouanement: 0, frontiere: 1, douala: 2, transit: 3, mer: 4, preparation: 5, dedouane: 6, livre: 7 }
    entries.sort((a, b) => {
      if (tri === 'urgence') {
        const bb = Number(b.doc.bloquant && b.doc.statut === 'manquant') - Number(a.doc.bloquant && a.doc.statut === 'manquant')
        if (bb !== 0) return bb
        const sc = (statutOrder[a.container.statut] ?? 9) - (statutOrder[b.container.statut] ?? 9)
        if (sc !== 0) return sc
        return docOrder(a.doc) - docOrder(b.doc)
      }
      if (tri === 'container') {
        const cc = a.container.numero.localeCompare(b.container.numero)
        return cc !== 0 ? cc : docOrder(a.doc) - docOrder(b.doc)
      }
      const dd = docOrder(a.doc) - docOrder(b.doc)
      return dd !== 0 ? dd : a.container.numero.localeCompare(b.container.numero)
    })
    return entries
  }, [containers, matches, tri])

  /** Changement de statut avec toasts métier (+ Annuler sur validation) */
  const changeStatus = (container: Container, doc: DocumentItem, next: DocStatus) => {
    const prev = doc.statut
    if (prev === next) return
    updateDocStatus(container.id, doc.id, next)
    const short = shortDocName(doc.nom)
    if (next === 'valide') {
      const leveBlocage = doc.bloquant
      toast.success(`${short} validé — ${container.numero}`, {
        description: leveBlocage
          ? doc.nom.includes('phytosanitaire')
            ? 'Blocage levé : le T1 peut maintenant être demandé'
            : 'Blocage levé : le dossier peut avancer'
          : undefined,
        action: {
          label: 'Annuler',
          onClick: () => updateDocStatus(container.id, doc.id, prev),
        },
      })
    } else {
      toast.success(`${short} marqué « ${DOC_STATUS_META[next].label.toLowerCase()} » — ${container.numero}`, {
        action: {
          label: 'Annuler',
          onClick: () => updateDocStatus(container.id, doc.id, prev),
        },
      })
    }
  }

  const openDetails = (entry: DocEntry) =>
    setDrawerSel({ containerId: entry.container.id, docId: entry.doc.id })

  const resetFilters = () => {
    setSearch('')
    setStatutFilter('tous')
    setContainerFilter('tous')
    setBloquantsOnly(false)
  }

  // Conteneurs affichés dans la matrice / vue par type
  const visibleContainers = useMemo(
    () => (containerFilter === 'tous' ? containers : containers.filter((c) => c.id === containerFilter)),
    [containers, containerFilter],
  )

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: EASE_OUT_EXPO }}
      className="space-y-5"
    >
      {/* Caption contextuel (design : « 15 documents manquants · 4 bloquants ») */}
      <p className="text-[13px] text-ink-600">
        <span className="font-semibold text-ink-900">{counts.manquants} documents manquants</span>
        {' · '}
        <span className={counts.bloquants > 0 ? 'font-semibold text-[#E11D48]' : ''}>
          {counts.bloquants} bloquant{counts.bloquants > 1 ? 's' : ''}
        </span>
        {' — régularisez les pièces sans ouvrir chaque dossier.'}
      </p>

      {/* 1. Bandeau synthèse */}
      <Synthese
        manquants={counts.manquants}
        bloquants={counts.bloquants}
        demandes={counts.demandes}
        recus={recus}
        valides={counts.valides}
        requis={counts.requis}
      />

      {/* 2. Barre d'outils sticky */}
      <div className="sticky top-16 z-20 rounded-xl bg-white p-3 shadow-card">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Recherche */}
          <div className="relative min-w-52 flex-1">
            <Search size={15} strokeWidth={1.75} className="absolute top-1/2 left-3 -translate-y-1/2 text-ink-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un document, un container…"
              className="h-9 bg-subtle pl-9 text-[13px]"
            />
          </div>

          {/* Filtre statut */}
          <Select value={statutFilter} onValueChange={(v) => setStatutFilter(v as 'tous' | DocStatus)}>
            <SelectTrigger className="h-9 w-40 text-[13px]">
              <SelectValue placeholder="Tous les statuts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="tous" className="text-[13px]">Tous les statuts</SelectItem>
              {(Object.keys(DOC_STATUS_META) as DocStatus[]).map((s) => (
                <SelectItem key={s} value={s} className="text-[13px]">
                  <span className="flex items-center gap-2">
                    <span className="size-2 rounded-full" style={{ backgroundColor: DOC_STATUS_META[s].color }} />
                    {DOC_STATUS_META[s].label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Filtre container */}
          <Select value={containerFilter} onValueChange={setContainerFilter}>
            <SelectTrigger className="h-9 w-48 text-[13px]">
              <SelectValue placeholder="Tous les containers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="tous" className="text-[13px]">Tous les containers</SelectItem>
              {containers.map((c) => (
                <SelectItem key={c.id} value={c.id} className="font-mono text-[12px]">
                  {c.numero}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Tri */}
          <Select value={tri} onValueChange={(v) => setTri(v as Tri)}>
            <SelectTrigger className="h-9 w-36 text-[13px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="urgence" className="text-[13px]">Tri : urgence</SelectItem>
              <SelectItem value="container" className="text-[13px]">Tri : container</SelectItem>
              <SelectItem value="document" className="text-[13px]">Tri : document</SelectItem>
            </SelectContent>
          </Select>

          {/* Toggle bloquants */}
          <label className="flex h-9 cursor-pointer items-center gap-2 rounded-lg px-2 text-[13px] font-medium text-ink-600">
            <Switch
              checked={bloquantsOnly}
              onCheckedChange={setBloquantsOnly}
              className="data-[state=checked]:bg-sand-500"
              aria-label="Bloquants uniquement"
            />
            Bloquants uniquement
          </label>

          {/* Compteur de résultats (flash sand-100 au changement) */}
          <motion.span
            key={`${queue.length}-${search}-${statutFilter}-${containerFilter}-${bloquantsOnly}`}
            initial={{ backgroundColor: '#FDF1DC' }}
            animate={{ backgroundColor: 'rgba(253,241,220,0)' }}
            transition={{ duration: 0.8 }}
            className="rounded-md px-2 py-1 text-xs font-medium whitespace-nowrap text-ink-600"
          >
            {queue.length} document{queue.length > 1 ? 's' : ''}
          </motion.span>

          {/* Sélecteur de vue */}
          <Tabs value={view} onValueChange={(v) => setView(v as View)} className="ml-auto">
            <TabsList className="h-9">
              <TabsTrigger value="traiter" className="gap-1.5 px-3 text-[13px]">
                <LayoutList size={14} strokeWidth={1.75} />
                À traiter
              </TabsTrigger>
              <TabsTrigger value="matrice" className="gap-1.5 px-3 text-[13px]">
                <Table2 size={14} strokeWidth={1.75} />
                Matrice
              </TabsTrigger>
              <TabsTrigger value="type" className="gap-1.5 px-3 text-[13px]">
                <Rows3 size={14} strokeWidth={1.75} />
                Par type
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* 3. Vues */}
      {view === 'traiter' && (
        <FileATraiter
          entries={queue}
          filtered={filtered}
          onStatusChange={(entry, s) => changeStatus(entry.container, entry.doc, s)}
          onOpenDetails={openDetails}
          onResetFilters={resetFilters}
        />
      )}

      {view === 'matrice' &&
        (isMobile ? (
          <div className="rounded-xl bg-white p-6 text-center shadow-card">
            <p className="font-h3 text-ink-900">La matrice nécessite un écran large</p>
            <p className="mt-1 text-[13px] text-ink-600">
              Utilisez la file « À traiter » ou la vue « Par type » sur mobile.
            </p>
            <button
              type="button"
              onClick={() => setView('traiter')}
              className="mt-4 h-9 rounded-lg bg-sand-500 px-4 text-sm font-semibold text-white transition-colors hover:bg-sand-600"
            >
              Revenir à « À traiter »
            </button>
          </div>
        ) : (
          <MatriceView containers={visibleContainers} match={matches} onStatusChange={changeStatus} />
        ))}

      {view === 'type' && (
        <ParTypeView
          containers={visibleContainers}
          match={matches}
          meta={meta}
          onStatusChange={changeStatus}
          onOpenDetails={(container, doc) => openDetails({ container, doc })}
        />
      )}

      {/* Drawer détail document */}
      <DocDetailDrawer
        entry={drawerEntry ?? lastEntry}
        open={Boolean(drawerSel && drawerEntry)}
        onClose={() => setDrawerSel(null)}
        onStatusChange={(entry, s) => changeStatus(entry.container, entry.doc, s)}
        meta={meta}
        setDocMeta={setDocMeta}
      />
    </motion.div>
  )
}
