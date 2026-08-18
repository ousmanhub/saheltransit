// Onglet Documents — checklist documentaire interactive (container-detail.md §4b).
// 13 documents groupés par phase, DocStatusChip cliquable, filtres, T1 enrichi.

import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { addDays } from 'date-fns'
import { MoreHorizontal, Timer } from 'lucide-react'
import { toast } from 'sonner'
import type { Container, DocStatus, DocumentItem, DocTypeName } from '@/lib/types'
import { CONTAINER_STATUSES, DOC_STATUS_CYCLE, DOC_STATUS_META } from '@/lib/types'
import { docCounts, docProgress, useStore } from '@/lib/store'
import { daysUntil, formatDateShort } from '@/lib/format'
import { cn } from '@/lib/utils'
import DocStatusChip, { DocStatusIcon } from '@/components/DocStatusChip'
import ProgressRing from '@/components/ProgressRing'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { appendStoredEvent, flashAndReload, patchStoredContainer } from './storagePatch'
import { getDocMeta, setDocMeta } from './overlays'
import { DOC_DESCRIPTIONS, EASE_OUT_EXPO } from './utils'

const PHASES: { key: string; label: string; docs: DocTypeName[] }[] = [
  {
    key: 'avant',
    label: 'Avant embarquement',
    docs: ['BESC Cameroun', 'BESC Tchad', 'Facture commerciale', 'Packing list', 'Assurance cargo'],
  },
  {
    key: 'maritime',
    label: 'Transport maritime',
    docs: ['Connaissement (B/L)', 'Manifeste de cargaison', "Certificat d'origine", 'Facture de fret'],
  },
  {
    key: 'transit',
    label: 'Transit & dédouanement',
    docs: [
      'Titre de transit T1 (+ acquit-à-caution)',
      'Déclaration en détail (SYDONIA)',
      'Certificat phytosanitaire / sanitaire',
      'Quittance / bulletin de liquidation',
    ],
  },
]

type FilterKey = 'tous' | DocStatus

// ─── Ligne T1 enrichie ───────────────────────────────────────────────────────

function T1Block({ c, doc }: { c: Container; doc: DocumentItem }) {
  const [emission, setEmission] = useState('')
  const [numeroT1, setNumeroT1] = useState('')
  const [caution, setCaution] = useState('450000')

  if (doc.statut !== 'valide') return null

  if (c.t1) {
    const j = daysUntil(c.t1.limite)
    const extra = c.t1 as unknown as { numero?: string; caution?: number }
    return (
      <p className={cn('mt-1.5 flex items-center gap-1.5 text-xs font-medium', j <= 2 ? 'text-[#DC2626]' : 'text-ink-600')}>
        <Timer size={13} />
        Émis le {formatDateShort(c.t1.emission)}
        {extra.numero && <span className="font-mono"> · N° {extra.numero}</span>}
        <span> · Acquit-à-caution {(extra.caution ?? 450_000).toLocaleString('fr-FR')} FCFA</span>
        <span className="font-semibold"> · {j >= 0 ? `J−${j}` : 'expiré'}</span>
      </p>
    )
  }

  const submit = () => {
    if (!emission) {
      toast.warning("Renseignez la date d'émission du T1.")
      return
    }
    const limite = addDays(new Date(emission), 7)
    patchStoredContainer(
      c.id,
      (x) =>
        ({
          ...x,
          t1: { emission: new Date(emission).toISOString(), limite: limite.toISOString(), numero: numeroT1 || undefined, caution: Number(caution) || 450_000 },
        }) as Container,
      appendStoredEvent({
        id: `evt-t1-${c.id}`,
        date: limite.toISOString(),
        type: 't1',
        libelle: 'Date limite T1 — sortie du Cameroun',
        containerId: c.id,
      }),
    )
    flashAndReload({
      type: 'success',
      message: 'T1 enregistré — compte à rebours de 7 jours démarré',
      description: 'L’échéance a été ajoutée au calendrier.',
    })
  }

  return (
    <div className="mt-2 flex flex-wrap items-end gap-2 rounded-lg border border-dashed border-border bg-subtle/60 p-2.5">
      <div className="grid gap-1">
        <Label htmlFor={`t1-date-${doc.id}`} className="text-[11px] text-ink-400">Émis le</Label>
        <Input id={`t1-date-${doc.id}`} type="date" value={emission} onChange={(e) => setEmission(e.target.value)} className="h-8 w-[150px] bg-white text-[13px]" />
      </div>
      <div className="grid gap-1">
        <Label htmlFor={`t1-num-${doc.id}`} className="text-[11px] text-ink-400">Numéro T1</Label>
        <Input id={`t1-num-${doc.id}`} value={numeroT1} onChange={(e) => setNumeroT1(e.target.value)} placeholder="T1-2025-…" className="h-8 w-[130px] bg-white font-mono text-[13px]" />
      </div>
      <div className="grid gap-1">
        <Label htmlFor={`t1-caution-${doc.id}`} className="text-[11px] text-ink-400">Acquit-à-caution (FCFA)</Label>
        <Input id={`t1-caution-${doc.id}`} inputMode="numeric" value={caution} onChange={(e) => setCaution(e.target.value)} className="h-8 w-[130px] bg-white font-mono text-[13px]" />
      </div>
      <Button type="button" onClick={submit} className="h-8 bg-sand-500 text-[13px] text-white hover:bg-sand-600">
        Démarrer le compte à rebours
      </Button>
    </div>
  )
}

// ─── Ligne document ──────────────────────────────────────────────────────────

function DocLine({
  c,
  doc,
  index,
  onEditMeta,
}: {
  c: Container
  doc: DocumentItem
  index: number
  onEditMeta: (doc: DocumentItem, mode: 'reference' | 'note') => void
}) {
  const { updateDocStatus } = useStore()
  const docMeta = getDocMeta(doc.id)
  const stepIndex = CONTAINER_STATUSES.indexOf(c.statut)
  const bloquantActif =
    doc.bloquant === true && doc.statut === 'manquant' && stepIndex >= CONTAINER_STATUSES.indexOf('douala')

  const change = (statut: DocStatus) => {
    const { valides, requis } = docProgress(c)
    const short = doc.nom.split(' (')[0]
    updateDocStatus(c.id, doc.id, statut)
    if (statut === 'valide' && doc.statut !== 'valide') {
      toast.success(`${short} validé — ${valides + 1}/${requis} documents`)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, delay: index * 0.03, ease: EASE_OUT_EXPO }}
      className={cn(
        'relative flex items-start gap-3 py-3 pl-3',
        doc.statut === 'non_requis' && 'opacity-60',
      )}
    >
      {bloquantActif && <span className="absolute top-2 bottom-2 left-0 w-[3px] rounded-full bg-[#E11D48]" />}

      <div className="w-[118px] shrink-0 pt-0.5">
        {doc.statut === 'non_requis' ? (
          <DocStatusChip statut={doc.statut} />
        ) : (
          <DocStatusChip statut={doc.statut} onChange={change} />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm leading-5 font-semibold text-ink-900">{doc.nom}</p>
        <p className="mt-0.5 text-xs leading-4 text-ink-400">{DOC_DESCRIPTIONS[doc.nom]}</p>
        {bloquantActif && (
          <p className="mt-1 text-xs font-semibold text-[#E11D48]">Bloquant pour le dédouanement</p>
        )}
        {docMeta.reference && (
          <p className="mt-1 inline-flex rounded bg-subtle px-1.5 py-0.5 font-mono text-[11px] font-medium text-ink-600">
            {docMeta.reference}
          </p>
        )}
        {docMeta.note && <p className="mt-1 text-xs text-ink-400 italic">Note : {docMeta.note}</p>}
        {doc.nom.startsWith('Titre de transit') && <T1Block c={c} doc={doc} />}
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        <span className="hidden text-xs text-ink-400 sm:block">MAJ {formatDateShort(doc.updatedAt)}</span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex size-7 items-center justify-center rounded-md text-ink-400 hover:bg-subtle hover:text-ink-600"
              aria-label={`Actions pour ${doc.nom}`}
            >
              <MoreHorizontal size={15} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="text-[13px]">Marquer comme…</DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-44">
                {[...DOC_STATUS_CYCLE, 'non_requis' as DocStatus].map((s) => (
                  <DropdownMenuItem key={s} onSelect={() => change(s)} className="gap-2 text-[13px]">
                    <span style={{ color: DOC_STATUS_META[s].color }} className="flex">
                      <DocStatusIcon statut={s} />
                    </span>
                    {DOC_STATUS_META[s].label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuItem onSelect={() => onEditMeta(doc, 'reference')} className="text-[13px]">
              Téléverser une référence
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onEditMeta(doc, 'note')} className="text-[13px]">
              Ajouter une note
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </motion.div>
  )
}

// ─── Onglet ──────────────────────────────────────────────────────────────────

interface DocumentsChecklistProps {
  c: Container
  onExportChecklist: () => void
}

export default function DocumentsChecklist({ c, onExportChecklist }: DocumentsChecklistProps) {
  const { updateDocStatus } = useStore()
  const [filter, setFilter] = useState<FilterKey>('tous')
  const [metaDialog, setMetaDialog] = useState<{ doc: DocumentItem; mode: 'reference' | 'note' } | null>(null)
  const [metaValue, setMetaValue] = useState('')
  // Incrémenté après chaque écriture de méta (références/notes) pour re-rendre les lignes
  const [metaVersion, setMetaVersion] = useState(0)

  const { valides, requis, pct } = docProgress(c)
  const counts = docCounts(c)
  const enAttente = counts.demande

  const filteredDocs = useMemo(
    () => (doc: DocumentItem) => filter === 'tous' || doc.statut === filter,
    [filter],
  )

  const markAllDemande = () => {
    const manquants = c.documents.filter((d) => d.statut === 'manquant')
    for (const d of manquants) updateDocStatus(c.id, d.id, 'demande')
    toast.success(`${manquants.length} document${manquants.length > 1 ? 's' : ''} marqué${manquants.length > 1 ? 's' : ''} « Demandé »`)
  }

  const chips: { key: FilterKey; label: string; count: number }[] = [
    { key: 'tous', label: 'Tous', count: c.documents.length },
    { key: 'manquant', label: 'Manquants', count: counts.manquant },
    { key: 'demande', label: 'Demandés', count: counts.demande },
    { key: 'recu', label: 'Reçus', count: counts.recu },
    { key: 'valide', label: 'Validés', count: counts.valide },
  ]

  const segments: { statut: DocStatus; count: number; color: string }[] = [
    { statut: 'valide', count: counts.valide, color: '#059669' },
    { statut: 'recu', count: counts.recu, color: '#0284C7' },
    { statut: 'demande', count: counts.demande, color: '#D97706' },
    { statut: 'manquant', count: counts.manquant, color: '#E11D48' },
    { statut: 'non_requis', count: counts.non_requis, color: '#CBD5E1' },
  ]

  return (
    <div>
      {/* Header : progression + actions */}
      <div className="flex flex-wrap items-center gap-4">
        <ProgressRing value={pct} size={56} stroke={5} />
        <div className="min-w-0 flex-1">
          <p className="text-sm text-ink-900">
            <strong className="font-semibold">
              {valides} document{valides > 1 ? 's' : ''} finalisé{valides > 1 ? 's' : ''} sur {requis} requis
            </strong>
            {(counts.manquant > 0 || enAttente > 0) && (
              <span className="text-ink-600">
                {' '}
                — {counts.manquant > 0 && `${counts.manquant} manquant${counts.manquant > 1 ? 's' : ''}`}
                {counts.manquant > 0 && enAttente > 0 && ', '}
                {enAttente > 0 && `${enAttente} demandé${enAttente > 1 ? 's' : ''}`}
              </span>
            )}
          </p>
          {/* Barre segmentée par statut */}
          <div className="mt-2 flex h-2 w-full max-w-md overflow-hidden rounded-full bg-subtle">
            {segments
              .filter((s) => s.count > 0)
              .map((s) => (
                <motion.span
                  key={s.statut}
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.5, ease: EASE_OUT_EXPO }}
                  className="h-full origin-left"
                  style={{ width: `${(s.count / c.documents.length) * 100}%`, backgroundColor: s.color }}
                  title={`${DOC_STATUS_META[s.statut].label} : ${s.count}`}
                />
              ))}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={markAllDemande}
            disabled={counts.manquant === 0}
            className="inline-flex h-8 items-center rounded-lg border border-border bg-white px-3 text-xs font-semibold text-ink-600 transition-colors hover:bg-subtle disabled:opacity-40"
          >
            Tout marquer demandé
          </button>
          <button
            type="button"
            onClick={onExportChecklist}
            className="inline-flex h-8 items-center rounded-lg border border-border bg-white px-3 text-xs font-semibold text-ink-600 transition-colors hover:bg-subtle"
          >
            Exporter la checklist
          </button>
        </div>
      </div>

      {/* Filtres */}
      <div className="mt-4 flex flex-wrap gap-1.5">
        {chips.map((chip) => (
          <button
            key={chip.key}
            type="button"
            onClick={() => setFilter(chip.key)}
            className={cn(
              'inline-flex h-7 items-center gap-1 rounded-full px-3 text-xs font-medium transition-colors',
              filter === chip.key ? 'bg-navy-950 text-white' : 'bg-subtle text-ink-600 hover:bg-[#E4E8ED]',
            )}
            style={{ fontVariantNumeric: 'tabular-nums' }}
          >
            {chip.label} ({chip.count})
          </button>
        ))}
      </div>

      {/* Groupes par phase */}
      <Accordion type="multiple" defaultValue={PHASES.map((p) => p.key)} className="mt-3">
        {PHASES.map((phase) => {
          const docs = c.documents.filter((d) => phase.docs.includes(d.nom) && filteredDocs(d))
          if (docs.length === 0) return null
          const phaseValides = c.documents.filter(
            (d) => phase.docs.includes(d.nom) && d.statut === 'valide',
          ).length
          return (
            <AccordionItem key={phase.key} value={phase.key} className="border-border">
              <AccordionTrigger className="py-3 hover:no-underline">
                <span className="flex items-center gap-2">
                  <span className="text-overline text-ink-400">{phase.label}</span>
                  <span className="rounded-full bg-subtle px-2 py-0.5 text-[11px] font-semibold text-ink-600" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {phaseValides}/{phase.docs.length} validés
                  </span>
                </span>
              </AccordionTrigger>
              <AccordionContent className="pb-2">
                <div className="divide-y divide-border">
                  {docs.map((doc, i) => (
                    <DocLine
                      key={doc.id}
                      c={c}
                      doc={doc}
                      index={i}
                      onEditMeta={(d, mode) => {
                        const existing = getDocMeta(d.id)
                        setMetaValue(mode === 'reference' ? (existing.reference ?? '') : (existing.note ?? ''))
                        setMetaDialog({ doc: d, mode })
                      }}
                    />
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          )
        })}
      </Accordion>

      {/* Modale référence / note */}
      <Dialog key={metaVersion} open={metaDialog !== null} onOpenChange={(o) => !o && setMetaDialog(null)}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="font-h3">
              {metaDialog?.mode === 'reference' ? 'Téléverser une référence' : 'Ajouter une note'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-1.5">
            <Label htmlFor="doc-meta-value" className="text-[13px]">
              {metaDialog?.doc.nom}
            </Label>
            <Input
              id="doc-meta-value"
              value={metaValue}
              onChange={(e) => setMetaValue(e.target.value)}
              placeholder={metaDialog?.mode === 'reference' ? 'N° BESC : 25CM-004521' : 'Note interne…'}
              className={metaDialog?.mode === 'reference' ? 'font-mono' : ''}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setMetaDialog(null)}>
              Annuler
            </Button>
            <Button
              type="button"
              className="bg-sand-500 text-white hover:bg-sand-600"
              onClick={() => {
                if (!metaDialog) return
                const existing = getDocMeta(metaDialog.doc.id)
                setDocMeta(metaDialog.doc.id, {
                  ...existing,
                  [metaDialog.mode]: metaValue.trim() || undefined,
                })
                setMetaVersion((v) => v + 1)
                toast.success(
                  metaDialog.mode === 'reference' ? 'Référence enregistrée' : 'Note enregistrée',
                  { description: metaDialog.doc.nom.split(' (')[0] },
                )
                setMetaDialog(null)
              }}
            >
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
