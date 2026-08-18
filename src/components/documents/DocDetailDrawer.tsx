// DocDetailDrawer — drawer « Détail document » (design/documents.md §Drawer)
// Nom + DocStatusChip grand · container lié (carte cliquable) · historique ·
// n° de référence (mono) · note interne · ouverture du dossier complet.

import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { ArrowRight, Clock, History } from 'lucide-react'
import type { DocStatus } from '@/lib/types'
import { DOC_STATUS_META } from '@/lib/types'
import { useStore } from '@/lib/store'
import { formatDate, formatDateShort, relativeTime } from '@/lib/format'
import StatusBadge from '@/components/StatusBadge'
import DocStatusChip from '@/components/DocStatusChip'
import RightDrawer from '@/components/documents/RightDrawer'
import type { DocEntry, DocMeta } from '@/components/documents/docMeta'
import { shortDocName } from '@/components/documents/docMeta'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

interface DocDetailDrawerProps {
  entry: DocEntry | null
  open: boolean
  onClose: () => void
  onStatusChange: (entry: DocEntry, statut: DocStatus) => void
  meta: Record<string, DocMeta>
  setDocMeta: (docId: string, patch: DocMeta) => void
}

export default function DocDetailDrawer({ entry, open, onClose, onStatusChange, meta, setDocMeta }: DocDetailDrawerProps) {
  const navigate = useNavigate()
  const { activity } = useStore()
  const docId = entry?.doc.id
  const saved = (docId && meta[docId]) || {}

  // Champs référence / note, réinitialisés au changement de document
  // (ajustement d'état pendant le rendu — pattern React officiel)
  const [fields, setFields] = useState<{ key: string; reference: string; note: string }>({
    key: '',
    reference: '',
    note: '',
  })
  const fieldKey = docId ?? ''
  if (fields.key !== fieldKey) {
    setFields({ key: fieldKey, reference: saved.reference ?? '', note: saved.note ?? '' })
  }
  const reference = fields.reference
  const note = fields.note
  const setReference = (value: string) => setFields((f) => ({ ...f, reference: value }))
  const setNote = (value: string) => setFields((f) => ({ ...f, note: value }))

  // Historique : journal d'activité filtré sur ce document + dernière mise à jour
  const historique = useMemo(() => {
    if (!entry) return [] as { label: string; detail: string }[]
    const short = shortDocName(entry.doc.nom)
    const items: { label: string; detail: string }[] = []
    const entries = activity.filter(
      (a) => a.type === 'doc' && a.containerId === entry.container.id && a.message.startsWith(short),
    )
    for (const a of entries.slice(0, 4)) {
      items.push({ label: a.message.replace(` — ${entry.container.numero}`, ''), detail: relativeTime(a.createdAt) })
    }
    items.push({
      label: `Statut actuel : ${DOC_STATUS_META[entry.doc.statut].label}`,
      detail: `${formatDate(entry.doc.updatedAt)} · ${relativeTime(entry.doc.updatedAt)}`,
    })
    return items
  }, [entry, activity])

  const container = entry?.container
  const doc = entry?.doc

  return (
    <RightDrawer
      open={open}
      onClose={onClose}
      title={doc ? shortDocName(doc.nom) : ''}
      subtitle={doc && doc.nom.includes('(') ? doc.nom : undefined}
      footer={
        container && (
          <button
            type="button"
            onClick={() => {
              onClose()
              navigate(`/containers/${container.id}`)
            }}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-sand-500 text-sm font-semibold text-white transition-colors hover:bg-sand-600"
          >
            Ouvrir le dossier complet
            <ArrowRight size={16} strokeWidth={1.75} />
          </button>
        )
      }
    >
      {entry && doc && container && (
        <div className="space-y-6">
          {/* Statut — chip grand cliquable */}
          <div>
            <p className="text-overline mb-2 text-ink-400">Statut de la pièce</p>
            <DocStatusChip
              statut={doc.statut}
              onChange={(s) => onStatusChange(entry, s)}
              className="h-8 px-3 text-[13px]"
            />
            {doc.bloquant && doc.statut !== 'valide' && (
              <p className="mt-2 text-xs font-medium text-[#E11D48]">
                Document bloquant — requis pour la poursuite du dossier.
              </p>
            )}
          </div>

          {/* Container lié — carte cliquable */}
          <div>
            <p className="text-overline mb-2 text-ink-400">Container</p>
            <button
              type="button"
              onClick={() => {
                onClose()
                navigate(`/containers/${container.id}`)
              }}
              className="group w-full rounded-xl border border-border p-3.5 text-left transition-all duration-200 hover:border-border-strong hover:shadow-raised"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[13px] font-semibold text-ink-900">{container.numero}</span>
                <StatusBadge statut={container.statut} />
              </div>
              <p className="mt-1.5 truncate text-[13px] text-ink-600">{container.contenu}</p>
              <p className="mt-0.5 text-xs text-ink-400">
                {container.origine} → {container.destination} · {container.compagnie}
              </p>
            </button>
          </div>

          {/* Historique du document */}
          <div>
            <p className="text-overline mb-2 flex items-center gap-1.5 text-ink-400">
              <History size={13} strokeWidth={1.75} />
              Historique
            </p>
            <ol className="space-y-2.5">
              {historique.map((h, i) => (
                <li key={i} className="flex items-start gap-2.5 text-[13px]">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-border-strong" />
                  <div className="min-w-0 flex-1">
                    <p className="leading-[18px] text-ink-900 capitalize">{h.label}</p>
                    <p className="flex items-center gap-1 text-xs text-ink-400">
                      <Clock size={11} strokeWidth={1.75} />
                      {h.detail}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          {/* N° de référence */}
          <div>
            <label htmlFor="doc-reference" className="text-overline mb-2 block text-ink-400">
              N° de référence
            </label>
            <Input
              id="doc-reference"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              onBlur={() => setDocMeta(doc.id, { reference: reference.trim() || undefined })}
              placeholder="ex. BESC-CM-2025-04112"
              className="font-mono text-[13px]"
            />
            <p className="mt-1 text-xs text-ink-400">
              Référence officielle de la pièce (BESC, déclaration SYDONIA, quittance…).
            </p>
          </div>

          {/* Note interne */}
          <div>
            <label htmlFor="doc-note" className="text-overline mb-2 block text-ink-400">
              Note interne
            </label>
            <Textarea
              id="doc-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onBlur={() => setDocMeta(doc.id, { note: note.trim() || undefined })}
              placeholder="Relance fournisseur, contact transitaire, particularités de la pièce…"
              rows={4}
              className="text-[13px]"
            />
            {saved.note && note.trim() === '' && (
              <p className="mt-1 text-xs text-ink-400">La note sera effacée à la fermeture du champ.</p>
            )}
          </div>

          {/* Méta */}
          <p className="border-t border-border pt-4 text-xs text-ink-400">
            Dernière mise à jour : {formatDateShort(doc.updatedAt)} ({relativeTime(doc.updatedAt)})
          </p>
        </div>
      )}
    </RightDrawer>
  )
}
