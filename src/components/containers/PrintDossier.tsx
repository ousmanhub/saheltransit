// Export PDF — vue d'impression A4 dédiée (container-detail.md §6).
// PrintSheet : rendu encre (bordures noires fines, badges → texte), utilisé à la fois
// dans la modale d'aperçu et dans la feuille @media print (window.print()).

import { motion } from 'framer-motion'
import { Printer } from 'lucide-react'
import type { Container, DocStatus } from '@/lib/types'
import { STATUS_META } from '@/lib/types'
import { computeCustoms } from '@/lib/customs'
import { formatDate, formatDateShort, formatNumber } from '@/lib/format'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { getDocMeta, type CostOverlay } from './overlays'
import { nextDeadline } from './utils'

const DOC_PRINT_LABEL: Record<DocStatus, string> = {
  valide: '✔ Validé',
  demande: '⏳ Demandé',
  manquant: '✖ Manquant',
  recu: '◔ Reçu',
  non_requis: '— Non requis',
}

interface PrintSheetProps {
  c: Container
  costs: CostOverlay
}

/** Feuille A4 du dossier (style « encre », 11px, bordures noires fines) */
export function PrintSheet({ c, costs }: PrintSheetProps) {
  const fob = c.articles.reduce((s, a) => s + a.valeur, 0)
  const caf = fob + costs.fret + costs.assurance
  const extra = c as Container & { acciseRate?: number }
  const result = computeCustoms({ caf, tec: c.tec, acciseRate: extra.acciseRate ?? 0, tvaExoneree: c.tvaExoneree })
  const deadline = nextDeadline(c)
  const today = new Date()

  const cell = 'border border-black/70 px-2 py-1 align-top'
  const headCell = `${cell} bg-black/5 text-left font-semibold`

  return (
    <div className="print-sheet bg-white text-[11px] leading-[15px] text-black">
      {/* 1. En-tête */}
      <div className="flex items-start justify-between border-b-2 border-black pb-3">
        <div className="flex items-center gap-2.5">
          <img src="/print-logo.svg" alt="SahelTransit" className="size-9" />
          <div>
            <p className="text-[15px] font-bold">SahelTransit — Dossier d'importation</p>
            <p className="text-[10px] text-black/60">Corridor Douala → Ngaoundéré → Kousséri → Nguéli → N'Djamena</p>
          </div>
        </div>
        <div className="text-right text-[10px] text-black/60">
          <p>Édité le {formatDate(today)}</p>
          <p>Page 1/2</p>
        </div>
      </div>

      {/* 2. Bloc identité */}
      <table className="mt-3 w-full border-collapse">
        <tbody>
          <tr>
            <td className={headCell}>N° container</td>
            <td className={`${cell} font-mono text-[13px] font-bold`}>{c.numero}</td>
            <td className={headCell}>Statut actuel</td>
            <td className={cell}>{STATUS_META[c.statut].label}</td>
          </tr>
          <tr>
            <td className={headCell}>Contenu</td>
            <td className={cell} colSpan={3}>{c.contenu}</td>
          </tr>
          <tr>
            <td className={headCell}>Fournisseur</td>
            <td className={cell}>{c.fournisseur}</td>
            <td className={headCell}>Compagnie / navire</td>
            <td className={cell}>{c.compagnie}</td>
          </tr>
          <tr>
            <td className={headCell}>Itinéraire</td>
            <td className={cell}>{c.origine} → {c.destination}</td>
            <td className={headCell}>Dates clés</td>
            <td className={cell}>
              Commande : {formatDateShort(c.createdAt)}
              {c.embarquement && <> · Embarquement : {formatDateShort(c.embarquement)}</>}
              {c.eta && <> · ETA : {formatDateShort(c.eta)}</>}
              {c.livraison && <> · Livraison : {formatDateShort(c.livraison)}</>}
            </td>
          </tr>
        </tbody>
      </table>

      {/* 3. Marchandises */}
      <p className="mt-4 mb-1 text-[12px] font-bold">Marchandises</p>
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className={headCell}>Article</th>
            <th className={`${headCell} text-right`}>Qté</th>
            <th className={`${headCell} text-right`}>Valeur (FCFA)</th>
            <th className={headCell}>Catégorie</th>
          </tr>
        </thead>
        <tbody>
          {c.articles.map((a) => (
            <tr key={a.id}>
              <td className={cell}>{a.nom}</td>
              <td className={`${cell} text-right font-mono`}>{formatNumber(a.quantite)}</td>
              <td className={`${cell} text-right font-mono`}>{formatNumber(a.valeur)}</td>
              <td className={cell}>{a.categorie}</td>
            </tr>
          ))}
          <tr>
            <td className={`${cell} font-semibold`} colSpan={2}>
              Valeur FOB {formatNumber(fob)} · Fret {formatNumber(costs.fret)} · Assurance {formatNumber(costs.assurance)}
            </td>
            <td className={`${cell} text-right font-mono font-bold`}>{formatNumber(caf)}</td>
            <td className={`${cell} font-semibold`}>Valeur CAF</td>
          </tr>
        </tbody>
      </table>

      {/* 4. Checklist documents */}
      <p className="mt-4 mb-1 text-[12px] font-bold">Checklist documentaire ({c.documents.length} pièces)</p>
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className={headCell}>Document</th>
            <th className={headCell}>Statut</th>
            <th className={headCell}>Mise à jour</th>
            <th className={headCell}>N° de référence</th>
          </tr>
        </thead>
        <tbody>
          {c.documents.map((d) => (
            <tr key={d.id}>
              <td className={cell}>{d.nom}</td>
              <td className={cell}>{DOC_PRINT_LABEL[d.statut]}</td>
              <td className={cell}>{formatDateShort(d.updatedAt)}</td>
              <td className={`${cell} font-mono`}>{getDocMeta(d.id).reference ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* 5. Liquidation estimative */}
      <p className="mt-4 mb-1 text-[12px] font-bold">Liquidation estimative</p>
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className={headCell}>Rubrique</th>
            <th className={`${headCell} text-right`}>Base</th>
            <th className={`${headCell} text-right`}>Taux</th>
            <th className={`${headCell} text-right`}>Montant</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className={cell}>Droits de douane (TEC)</td>
            <td className={`${cell} text-right font-mono`}>{formatNumber(caf)}</td>
            <td className={`${cell} text-right`}>{Math.round(c.tec * 100)} %</td>
            <td className={`${cell} text-right font-mono`}>{formatNumber(result.droits)}</td>
          </tr>
          <tr>
            <td className={cell}>Taxe d'intégration (TIC)</td>
            <td className={`${cell} text-right font-mono`}>{formatNumber(caf)}</td>
            <td className={`${cell} text-right`}>1 %</td>
            <td className={`${cell} text-right font-mono`}>{formatNumber(result.tic)}</td>
          </tr>
          <tr>
            <td className={cell}>Frais de statistiques</td>
            <td className={`${cell} text-right font-mono`}>{formatNumber(caf)}</td>
            <td className={`${cell} text-right`}>2 %</td>
            <td className={`${cell} text-right font-mono`}>{formatNumber(result.stats)}</td>
          </tr>
          {result.accise > 0 && (
            <tr>
              <td className={cell}>Droit d'accise</td>
              <td className={`${cell} text-right font-mono`}>{formatNumber(caf)}</td>
              <td className={`${cell} text-right`}>{extra.acciseRate} %</td>
              <td className={`${cell} text-right font-mono`}>{formatNumber(result.accise)}</td>
            </tr>
          )}
          <tr>
            <td className={cell}>{c.tvaExoneree ? 'TVA (exonérée)' : 'TVA'}</td>
            <td className={`${cell} text-right font-mono`}>{formatNumber(result.baseTva)}</td>
            <td className={`${cell} text-right`}>{c.tvaExoneree ? '0 %' : '18 %'}</td>
            <td className={`${cell} text-right font-mono`}>{formatNumber(result.tva)}</td>
          </tr>
          <tr>
            <td className={cell}>Acompte (avance d'impôt)</td>
            <td className={`${cell} text-right font-mono`}>{formatNumber(caf + result.droits)}</td>
            <td className={`${cell} text-right`}>4 %</td>
            <td className={`${cell} text-right font-mono`}>{formatNumber(result.acompte)}</td>
          </tr>
          <tr>
            <td className={`${cell} font-bold`} colSpan={3}>Total droits et taxes</td>
            <td className={`${cell} text-right font-mono font-bold`}>{formatNumber(result.total)}</td>
          </tr>
          <tr>
            <td className={`${cell} font-bold`} colSpan={3}>Coût total débarqué</td>
            <td className={`${cell} text-right font-mono font-bold`}>{formatNumber(result.coutDebarque)}</td>
          </tr>
        </tbody>
      </table>
      <p className="mt-1 text-[10px] text-black/60 italic">Estimation indicative — taux CEMAC 2025</p>

      {/* 6. Échéances + pied de page */}
      {deadline && (
        <>
          <p className="mt-4 mb-1 text-[12px] font-bold">Échéances</p>
          <ul className="list-disc pl-5">
            {c.t1 && <li>Date limite T1 (sortie du Cameroun) : {formatDate(c.t1.limite)}</li>}
            {c.embarquement && <li>Embarquement prévu : {formatDate(c.embarquement)}</li>}
            {c.eta && <li>Arrivée estimée Port de Douala : {formatDate(c.eta)}</li>}
          </ul>
        </>
      )}
      <p className="mt-6 border-t border-black/40 pt-2 text-[10px] text-black/60">
        Édité le {today.toLocaleDateString('fr-FR')} par Mahamat Abakar — SahelTransit (démo)
      </p>
    </div>
  )
}

// ─── Modale d'aperçu avant impression ────────────────────────────────────────

interface PrintPreviewModalProps {
  open: boolean
  onOpenChange: (o: boolean) => void
  c: Container
  costs: CostOverlay
}

export default function PrintPreviewModal({ open, onOpenChange, c, costs }: PrintPreviewModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto bg-subtle print:hidden sm:max-w-[900px]">
        <DialogHeader>
          <DialogTitle className="font-h3">Aperçu du dossier — export PDF</DialogTitle>
          <DialogDescription>
            Rendu A4 du dossier <span className="font-mono">{c.numero}</span>. Utilisez « Enregistrer en PDF »
            dans la boîte de dialogue d'impression.
          </DialogDescription>
        </DialogHeader>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="mx-auto w-full max-w-[794px] shadow-overlay"
        >
          <div className="aspect-[210/297] overflow-y-auto">
            <div className="p-[38px]">
              <PrintSheet c={c} costs={costs} />
            </div>
          </div>
        </motion.div>

        <div className="mt-2 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="inline-flex h-9 items-center rounded-lg border border-border bg-white px-4 text-[13px] font-semibold text-ink-600 hover:bg-subtle"
          >
            Fermer
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-sand-500 px-4 text-[13px] font-semibold text-white transition-colors hover:bg-sand-600"
          >
            <Printer size={15} />
            Imprimer / Enregistrer en PDF
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
