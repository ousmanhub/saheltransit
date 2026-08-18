// Page — Fiche container / Dossier d'importation (route « /containers/:id », design/container-detail.md)
// En-tête dossier · CorridorStepper full animé · alertes liées · 4 onglets · rail sticky · export PDF.

import { useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { AnimatePresence, motion } from 'framer-motion'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  ArrowLeft,
  Calculator,
  Check,
  ChevronDown,
  Copy,
  MoreHorizontal,
  Pencil,
  Printer,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import type { Container, ContainerStatus } from '@/lib/types'
import { CONTAINER_STATUSES, STATUS_META } from '@/lib/types'
import { docCounts, docProgress, useStore } from '@/lib/store'
import { StatusIcon } from '@/components/CorridorStepper'
import StatusBadge from '@/components/StatusBadge'
import AlertItem from '@/components/AlertItem'
import EmptyState from '@/components/EmptyState'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
import CorridorTracker from '@/components/containers/CorridorTracker'
import MarchandisesTab from '@/components/containers/MarchandisesTab'
import DocumentsChecklist from '@/components/containers/DocumentsChecklist'
import CostsTab from '@/components/containers/CostsTab'
import JournalTab from '@/components/containers/JournalTab'
import SideRail from '@/components/containers/SideRail'
import EditContainerDialog from '@/components/containers/EditContainerDialog'
import PrintPreviewModal, { PrintSheet } from '@/components/containers/PrintDossier'
import { getCostOverlay, setCostOverlay, type CostOverlay } from '@/components/containers/overlays'
import { flashAndReload, removeStoredContainers } from '@/components/containers/storagePatch'
import { applyStatusChange, EASE_OUT_EXPO, origineLabel, useFlashToast } from '@/components/containers/utils'

type TabKey = 'marchandises' | 'documents' | 'couts' | 'journal'
const TAB_KEYS: TabKey[] = ['marchandises', 'documents', 'couts', 'journal']

function parseTab(raw: string | null): TabKey {
  return TAB_KEYS.includes(raw as TabKey) ? (raw as TabKey) : 'marchandises'
}

// ─── Vue principale (hooks isolés par container) ─────────────────────────────

function DetailView({ c }: { c: Container }) {
  const navigate = useNavigate()
  const { alerts, addContainer, updateContainerStatus } = useStore()
  const [searchParams, setSearchParams] = useSearchParams()
  const tabsRef = useRef<HTMLDivElement>(null)

  // Onglet piloté par l'URL (?tab=…) — liens directs depuis la liste
  const tab = parseTab(searchParams.get('tab'))
  const [printOpenLocal, setPrintOpenLocal] = useState(false)
  const printOpen = printOpenLocal || searchParams.get('export') === '1'
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [showAllAlerts, setShowAllAlerts] = useState(false)

  // Fret / assurance persistés hors-store (CAF live partagé entre onglets et rail)
  const fob = c.articles.reduce((s, a) => s + a.valeur, 0)
  const [costs, setCosts] = useState<CostOverlay>(() => getCostOverlay(c, fob))
  const onCostsChange = (next: CostOverlay) => {
    setCosts(next)
    setCostOverlay(c.id, next)
  }
  const caf = fob + costs.fret + costs.assurance

  const changeTab = (t: TabKey) => {
    const next = new URLSearchParams(searchParams)
    next.set('tab', t)
    setSearchParams(next, { replace: true })
  }

  const openPrint = () => setPrintOpenLocal(true)
  const closePrint = () => {
    setPrintOpenLocal(false)
    if (searchParams.get('export') === '1') {
      const next = new URLSearchParams(searchParams)
      next.delete('export')
      setSearchParams(next, { replace: true })
    }
  }

  const goCosts = () => {
    changeTab('couts')
    tabsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const { valides, requis } = docProgress(c)
  const counts = docCounts(c)

  const dossierAlerts = useMemo(
    () => alerts.filter((a) => a.containerId === c.id),
    [alerts, c.id],
  )
  const visibleAlerts = showAllAlerts ? dossierAlerts : dossierAlerts.slice(0, 2)

  // Méta d'en-tête
  const meta = STATUS_META[c.statut]
  const compagnieMain = c.compagnie.split('·')[0].trim()
  const navireMatch = c.compagnie.match(/navire\s+(\S+)\s+voy\.\s+(\S+)/i)
  const navireVoyage = navireMatch ? `${navireMatch[1]} / ${navireMatch[2]}` : '—'
  const etaLabel = c.eta ? format(new Date(c.eta), 'EEE d MMM yyyy', { locale: fr }) : '—'

  const duplicate = () => {
    const copy = addContainer({
      numero: `${c.numero.replace(/-\d$/, '')}-${Math.floor(Math.random() * 9) + 1}`,
      contenu: `${c.contenu} (copie)`,
      fournisseur: c.fournisseur,
      origine: c.origine,
      compagnie: c.compagnie,
      valeurCaf: c.valeurCaf,
      tec: c.tec,
      tvaExoneree: c.tvaExoneree,
      embarquement: c.embarquement,
      eta: c.eta,
      articles: c.articles.map((a) => ({ ...a, id: `${a.id}-copy-${Date.now().toString(36)}` })),
    })
    toast.success(`Dossier dupliqué — ${copy.numero}`, {
      description: 'La checklist documentaire a été réinitialisée.',
    })
    navigate(`/containers/${copy.id}`)
  }

  const confirmDelete = () => {
    removeStoredContainers([c.id])
    flashAndReload({ type: 'success', message: `Dossier supprimé — ${c.numero}` }, '/containers')
  }

  const tabBadges: Record<TabKey, React.ReactNode> = {
    marchandises: (
      <span className="rounded-full bg-subtle px-1.5 text-[11px] font-semibold text-ink-600">{c.articles.length}</span>
    ),
    documents: (
      <span className="inline-flex items-center gap-1">
        {counts.manquant > 0 && <span className="size-1.5 rounded-full bg-[#E11D48]" />}
        <span className="rounded-full bg-subtle px-1.5 text-[11px] font-semibold text-ink-600" style={{ fontVariantNumeric: 'tabular-nums' }}>
          {valides}/{requis}
        </span>
      </span>
    ),
    couts: null,
    journal: null,
  }

  return (
    <>
      <div className="space-y-4 pb-20 print:hidden md:pb-0">
        {/* ── 1. En-tête dossier ── */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: EASE_OUT_EXPO }}
          className="rounded-xl bg-white p-6 shadow-card"
        >
          <div className="flex flex-wrap items-start gap-5">
            {/* Gauche : retour + identité */}
            <div className="flex min-w-0 items-start gap-4">
              <Link
                to="/containers"
                className="mt-1 inline-flex h-8 items-center gap-1.5 rounded-lg border border-border px-2.5 text-[13px] font-medium text-ink-600 transition-colors hover:bg-subtle"
              >
                <ArrowLeft size={15} />
                Containers
              </Link>
              <span
                className="flex size-14 shrink-0 items-center justify-center rounded-xl"
                style={{ backgroundColor: meta.bg, color: meta.color }}
              >
                <StatusIcon statut={c.statut} size={24} />
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="font-mono text-2xl font-bold tracking-tight text-ink-900">{c.numero}</h1>
                  <motion.span
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.2 }}
                  >
                    <StatusBadge statut={c.statut} />
                  </motion.span>
                </div>
                <p className="mt-1 text-[13px] text-ink-600">
                  {c.contenu} · {c.fournisseur} ({c.origine})
                </p>
              </div>
            </div>

            {/* Centre : 4 méta */}
            <div className="hidden flex-1 grid-cols-4 gap-4 xl:grid">
              {[
                { label: 'Origine', value: origineLabel(c.origine) },
                { label: 'Compagnie', value: compagnieMain },
                { label: 'Navire / voyage', value: navireVoyage },
                { label: 'ETA Douala', value: etaLabel },
              ].map((m) => (
                <div key={m.label}>
                  <p className="text-overline text-ink-400">{m.label}</p>
                  <p className="mt-1 truncate text-sm font-semibold text-ink-900" title={m.value}>
                    {m.value}
                  </p>
                </div>
              ))}
            </div>

            {/* Droite : actions */}
            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={goCosts}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-white px-3.5 text-[13px] font-semibold text-ink-600 transition-colors hover:bg-subtle"
              >
                <Calculator size={15} />
                Calculer les droits
              </button>
              <button
                type="button"
                onClick={openPrint}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-sand-500 px-3.5 text-[13px] font-semibold text-white transition-colors hover:bg-sand-600"
              >
                <Printer size={15} />
                Exporter le dossier (PDF)
              </button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="flex size-9 items-center justify-center rounded-lg border border-border text-ink-400 transition-colors hover:bg-subtle hover:text-ink-600"
                    aria-label="Plus d'actions"
                  >
                    <MoreHorizontal size={16} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem onSelect={() => setEditOpen(true)} className="gap-2 text-[13px]">
                    <Pencil size={14} className="text-ink-400" />
                    Modifier
                  </DropdownMenuItem>
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger className="gap-2 text-[13px]">
                      <ChevronDown size={14} className="-rotate-90 text-ink-400" />
                      Changer de statut
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent className="w-52">
                      {CONTAINER_STATUSES.map((s: ContainerStatus) => (
                        <DropdownMenuItem
                          key={s}
                          disabled={s === c.statut}
                          onSelect={() => applyStatusChange(c, s, updateContainerStatus)}
                          className="gap-2 text-[13px]"
                        >
                          <span className="size-2 rounded-full" style={{ backgroundColor: STATUS_META[s].dot }} />
                          {STATUS_META[s].label}
                          {s === c.statut && <Check size={14} className="ml-auto" />}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                  <DropdownMenuItem onSelect={duplicate} className="gap-2 text-[13px]">
                    <Copy size={14} className="text-ink-400" />
                    Dupliquer
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onSelect={() => setDeleteOpen(true)}
                    className="gap-2 text-[13px] text-[#E11D48] focus:text-[#E11D48]"
                  >
                    <Trash2 size={14} />
                    Supprimer le dossier
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </motion.section>

        {/* ── 2. Suivi du corridor ── */}
        <CorridorTracker c={c} />

        {/* ── 3. Alertes du dossier ── */}
        {dossierAlerts.length > 0 && (
          <section aria-label="Alertes du dossier" className="space-y-2">
            {visibleAlerts.map((a, i) => (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.15 + i * 0.1, ease: EASE_OUT_EXPO }}
                className="rounded-xl bg-white shadow-card"
              >
                <AlertItem alert={a} className="px-2 py-1.5" />
              </motion.div>
            ))}
            {dossierAlerts.length > 2 && !showAllAlerts && (
              <button
                type="button"
                onClick={() => setShowAllAlerts(true)}
                className="text-xs font-semibold text-sand-700 hover:text-sand-600"
              >
                +{dossierAlerts.length - 2} autre{dossierAlerts.length - 2 > 1 ? 's' : ''} alerte{dossierAlerts.length - 2 > 1 ? 's' : ''}
              </button>
            )}
          </section>
        )}

        {/* ── 4 + 5. Onglets + rail ── */}
        <div className="grid gap-4 lg:grid-cols-12">
          <motion.section
            ref={tabsRef}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.15, ease: EASE_OUT_EXPO }}
            className="scroll-mt-24 rounded-xl bg-white p-6 shadow-card lg:col-span-8"
          >
            <Tabs value={tab} onValueChange={(v) => changeTab(v as TabKey)}>
              <TabsList className="mb-5">
                <TabsTrigger value="marchandises" className="gap-1.5">
                  Marchandises {tabBadges.marchandises}
                </TabsTrigger>
                <TabsTrigger value="documents" className="gap-1.5">
                  Documents {tabBadges.documents}
                </TabsTrigger>
                <TabsTrigger value="couts">Coûts douaniers</TabsTrigger>
                <TabsTrigger value="journal">Journal</TabsTrigger>
              </TabsList>
            </Tabs>

            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={tab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6, transition: { duration: 0.12 } }}
                transition={{ duration: 0.22, ease: EASE_OUT_EXPO }}
              >
                {tab === 'marchandises' && <MarchandisesTab c={c} costs={costs} onCostsChange={onCostsChange} />}
                {tab === 'documents' && <DocumentsChecklist c={c} onExportChecklist={openPrint} />}
                {tab === 'couts' && <CostsTab c={c} caf={caf} />}
                {tab === 'journal' && <JournalTab c={c} />}
              </motion.div>
            </AnimatePresence>
          </motion.section>

          <div className="lg:col-span-4">
            <SideRail c={c} caf={caf} onShowCosts={goCosts} />
          </div>
        </div>

        {/* Barre d'actions fixe basse (mobile) */}
        <div className="fixed inset-x-0 bottom-0 z-40 flex gap-2 border-t border-border bg-white p-3 md:hidden">
          <button
            type="button"
            onClick={goCosts}
            className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg border border-border text-[13px] font-semibold text-ink-600"
          >
            <Calculator size={15} />
            Calculer
          </button>
          <button
            type="button"
            onClick={openPrint}
            className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg bg-sand-500 text-[13px] font-semibold text-white"
          >
            <Printer size={15} />
            PDF
          </button>
        </div>

        {/* Modales */}
        <EditContainerDialog container={c} open={editOpen} onOpenChange={setEditOpen} />
        <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer le dossier ?</AlertDialogTitle>
              <AlertDialogDescription>
                <span className="font-mono">{c.numero}</span> et ses {c.documents.length} documents seront
                définitivement supprimés. Cette action est irréversible.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete} className="bg-[#E11D48] text-white hover:bg-[#BE123C]">
                Supprimer le dossier
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <PrintPreviewModal
          open={printOpen}
          onOpenChange={(o) => {
            if (!o) closePrint()
          }}
          c={c}
          costs={costs}
        />
      </div>

      {/* ── 6. Feuille d'impression A4 (visible uniquement à l'impression) ── */}
      <style>{`@page { margin: 16mm; }`}</style>
      <div className="hidden print:block">
        <PrintSheet c={c} costs={costs} />
      </div>
    </>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function ContainerDetail() {
  const { id } = useParams()
  const { getContainer } = useStore()
  const navigate = useNavigate()
  useFlashToast()
  const c = getContainer(id ?? '')

  if (!c) {
    return (
      <div className="rounded-xl bg-white shadow-card">
        <EmptyState
          title="Dossier introuvable"
          description="Ce container n'existe pas ou a été supprimé de l'inventaire."
          action={
            <button
              type="button"
              onClick={() => navigate('/containers')}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-sand-500 px-4 text-sm font-semibold text-white hover:bg-sand-600"
            >
              <ArrowLeft size={15} />
              Retour aux containers
            </button>
          }
        />
      </div>
    )
  }

  return <DetailView key={c.id} c={c} />
}
