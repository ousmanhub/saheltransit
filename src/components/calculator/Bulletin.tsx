// Bulletin de liquidation — décomposition des droits et taxes (calculator.md §3)
// Tableau « bulletin officiel » (lignes 48px, montants mono à droite) avec
// recalcul en cascade animé (stagger 60 ms, flash sand-100) + encart résultat navy.

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { ArrowDownRight, Info, Printer, RotateCcw, Save } from 'lucide-react'
import type { CustomsResult } from '@/lib/customs'
import { formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { CascadeAmount } from './shared'
import { useFlash } from './useFlash'

// ─── Lignes du bulletin ──────────────────────────────────────────────────────

interface BulletinLine {
  key: string
  rubrique: string
  base: number
  /** Libellé du taux (« 10 % ») — ignoré si tauxChip */
  taux: string
  /** Chip spécial dans la colonne taux (ex. « TVA 0 % » exonérée) */
  tauxChip?: { label: string; color: string; bg: string }
  montant: number
  /** Formule affichée en tooltip Info */
  formule: string
  strong?: boolean
}

function buildLines(result: CustomsResult, tec: number, accise: number, tvaExoneree: boolean): BulletinLine[] {
  const lines: BulletinLine[] = [
    {
      key: 'droits',
      rubrique: 'Droits de douane (TEC)',
      base: result.caf,
      taux: `${Math.round(tec * 100)} %`,
      montant: result.droits,
      formule: `Droits = CAF × ${Math.round(tec * 100)} % (catégorie tarifaire TEC)`,
      strong: true,
    },
    {
      key: 'tic',
      rubrique: "Taxe d'intégration communautaire",
      base: result.caf,
      taux: '1 %',
      montant: result.tic,
      formule: 'TIC = CAF × 1 % (intégration CEMAC)',
    },
    {
      key: 'stats',
      rubrique: 'Frais de statistiques',
      base: result.caf,
      taux: '2 %',
      montant: result.stats,
      formule: 'Frais de statistiques = CAF × 2 %',
    },
  ]
  if (accise > 0) {
    lines.push({
      key: 'accise',
      rubrique: "Droits d'accise",
      base: result.caf,
      taux: `${accise} %`,
      montant: result.accise,
      formule: `Accise = CAF × ${accise} % (alcools, tabacs, produits spécifiques)`,
    })
  }
  lines.push(
    {
      key: 'tva',
      rubrique: 'TVA',
      base: result.baseTva,
      taux: '18 %',
      tauxChip: tvaExoneree ? { label: 'TVA 0 %', color: '#059669', bg: '#ECFDF5' } : undefined,
      montant: result.tva,
      formule: 'TVA = (CAF + droits + TIC + stats) × 18 %',
    },
    {
      key: 'acompte',
      rubrique: "Acompte (avance d'impôt)",
      base: result.caf + result.droits,
      taux: '4 %',
      montant: result.acompte,
      formule: 'Acompte = (CAF + droits) × 4 % — récupérable sur l’impôt',
    },
  )
  return lines
}

function BulletinRow({ line, index, generation }: { line: BulletinLine; index: number; generation: number }) {
  const delay = index * 60
  const flash = useFlash(generation, delay, 420)
  return (
    <tr className={cn('h-12 border-b border-border transition-colors duration-300', flash && 'bg-sand-100')}>
      <td className="pr-3 pl-1">
        <div className="flex items-center gap-1.5">
          <span className={cn('text-[13px]', line.strong ? 'font-semibold text-ink-900' : 'text-ink-600')}>
            {line.rubrique}
          </span>
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" className="text-ink-400 transition-colors hover:text-ink-600" aria-label={`Formule : ${line.rubrique}`}>
                <Info size={13} strokeWidth={1.75} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[260px] text-xs">
              {line.formule}
            </TooltipContent>
          </Tooltip>
        </div>
        {/* <768px : base + taux fusionnés en caption sous la rubrique */}
        <p className="mt-0.5 font-mono text-[11px] text-ink-400 md:hidden">
          Base {formatNumber(line.base)} · {line.tauxChip ? line.tauxChip.label : line.taux}
        </p>
      </td>
      <td className="hidden pr-3 text-right font-mono text-[13px] text-ink-600 md:table-cell">
        <CascadeAmount value={line.base} delay={delay} duration={350} generation={generation} />
      </td>
      <td className="hidden pr-3 text-right text-[13px] whitespace-nowrap text-ink-600 md:table-cell">
        {line.tauxChip ? (
          <span
            className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold"
            style={{ color: line.tauxChip.color, backgroundColor: line.tauxChip.bg }}
          >
            {line.tauxChip.label}
          </span>
        ) : (
          line.taux
        )}
      </td>
      <td
        className={cn(
          'pr-1 text-right font-mono text-[13px]',
          line.strong ? 'font-semibold text-ink-900' : 'font-medium text-ink-900',
        )}
      >
        <CascadeAmount value={line.montant} delay={delay} duration={350} generation={generation} />
      </td>
    </tr>
  )
}

// ─── Encart résultat navy ────────────────────────────────────────────────────

function pct(n: number): string {
  return `${n.toFixed(1).replace('.', ',')} %`
}

interface ResultPanelProps {
  result: CustomsResult
  generation: number
  linesCount: number
  containerLinked: boolean
  onSave: () => void
  onPrint: () => void
  onReset: () => void
}

function ResultPanel({ result, generation, linesCount, containerLinked, onSave, onPrint, onReset }: ResultPanelProps) {
  // L'encart s'anime après la dernière ligne du tableau
  const delay = linesCount * 60 + 60
  const pctCaf = result.coutDebarque > 0 ? (result.caf / result.coutDebarque) * 100 : 0
  const pctTaxes = 100 - pctCaf
  const ratioTaxes = result.caf > 0 ? (result.total / result.caf) * 100 : 0

  // Micro-pulse scale 1 → 1.01 → 1 à chaque recalcul (nouvelle référence = relance)
  const pulse = useMemo(
    () => ({ scale: generation === 0 ? 1 : ([1, 1.01, 1] as number[]) }),
    [generation],
  )

  return (
    <motion.div
      animate={pulse}
      transition={{ duration: 0.45, delay: delay / 1000, ease: 'easeInOut' }}
      className="mt-5 rounded-xl bg-navy-950 p-6 text-white"
    >
      <p className="text-overline text-navy-300">Coût total débarqué N'Djamena</p>
      <p className="mt-1.5 font-sora text-[32px] leading-10 font-bold tracking-[-0.02em] text-white">
        <CascadeAmount
          value={result.coutDebarque}
          delay={delay}
          duration={450}
          generation={generation}
          format={(n) => `${formatNumber(n)} FCFA`}
        />
      </p>

      {/* Jauge de répartition CAF / taxes (barre 8px) */}
      <div className="mt-4 flex h-2 overflow-hidden rounded-full bg-navy-800">
        <motion.div
          className="h-full bg-sand-500"
          initial={false}
          animate={{ width: `${pctCaf}%` }}
          transition={{ duration: 0.5, delay: delay / 1000, ease: [0.22, 1, 0.36, 1] }}
        />
        <motion.div
          className="h-full bg-[#E11D48]"
          initial={false}
          animate={{ width: `${pctTaxes}%` }}
          transition={{ duration: 0.5, delay: delay / 1000, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
        <span className="flex items-center gap-1.5 font-medium text-white">
          <span className="size-2 rounded-sm bg-sand-500" />
          CAF {pct(pctCaf)}
        </span>
        <span className="flex items-center gap-1.5 font-medium text-white">
          <span className="size-2 rounded-sm bg-[#E11D48]" />
          Taxes {pct(pctTaxes)}
        </span>
        <span className="text-sand-100/80">Taxes = {pct(ratioTaxes)} de la valeur CAF</span>
      </div>

      {/* Actions */}
      <div className="mt-5 flex flex-wrap items-center gap-2">
        {containerLinked && (
          <button
            type="button"
            onClick={onSave}
            className="flex h-9 items-center gap-2 rounded-lg bg-sand-500 px-3.5 text-[13px] font-semibold text-white transition-colors hover:bg-sand-600"
          >
            <Save size={15} strokeWidth={1.75} />
            Enregistrer sur le dossier
          </button>
        )}
        <button
          type="button"
          onClick={onPrint}
          className="flex h-9 items-center gap-2 rounded-lg border border-navy-800 px-3.5 text-[13px] font-medium text-navy-100 transition-colors hover:bg-navy-900 hover:text-white"
        >
          <Printer size={15} strokeWidth={1.75} />
          Imprimer la simulation
        </button>
        <button
          type="button"
          onClick={onReset}
          className="flex h-9 items-center gap-2 rounded-lg px-3.5 text-[13px] font-medium text-navy-300 transition-colors hover:bg-navy-900 hover:text-navy-100"
        >
          <RotateCcw size={15} strokeWidth={1.75} />
          Réinitialiser
        </button>
      </div>
    </motion.div>
  )
}

// ─── Section complète ────────────────────────────────────────────────────────

export interface BulletinProps {
  result: CustomsResult
  tec: number
  accise: number
  tvaExoneree: boolean
  /** Compteur de recalcul (cascade animée) */
  generation: number
  containerLinked: boolean
  onSave: () => void
  onPrint: () => void
  onReset: () => void
}

export default function Bulletin({
  result,
  tec,
  accise,
  tvaExoneree,
  generation,
  containerLinked,
  onSave,
  onPrint,
  onReset,
}: BulletinProps) {
  const lines = buildLines(result, tec, accise, tvaExoneree)
  const totalDelay = lines.length * 60
  const totalFlash = useFlash(generation, totalDelay, 420)

  return (
    <section className="rounded-xl bg-white p-5 shadow-card md:p-6" aria-label="Bulletin de liquidation">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="font-h3 text-ink-900">Décomposition des droits et taxes</h3>
          <p className="mt-0.5 text-xs text-ink-400">Base : valeur CAF · formules CEMAC</p>
        </div>
        <span className="hidden items-center gap-1 rounded-full bg-subtle px-2.5 py-1 text-[11px] font-medium text-ink-600 sm:flex">
          <ArrowDownRight size={12} strokeWidth={1.75} className="text-sand-500" />
          Recalcul en direct
        </span>
      </div>

      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-border-strong">
            <th className="text-overline pb-2 pl-1 text-left font-semibold text-ink-400">Rubrique</th>
            <th className="text-overline hidden pb-2 pr-3 text-right font-semibold text-ink-400 md:table-cell">
              Base de calcul
            </th>
            <th className="text-overline hidden pb-2 pr-3 text-right font-semibold text-ink-400 md:table-cell">Taux</th>
            <th className="text-overline pb-2 pr-1 text-right font-semibold text-ink-400">Montant (FCFA)</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line, i) => (
            <BulletinRow key={line.key} line={line} index={i} generation={generation} />
          ))}
          <tr className={cn('h-12 transition-colors duration-300', totalFlash && 'bg-sand-100')}>
            <td className="pr-3 pl-1 text-[13px] font-bold text-ink-900" colSpan={1}>
              Total droits et taxes
            </td>
            <td className="hidden md:table-cell" colSpan={2} />
            <td className="pr-1 text-right font-mono text-[15px] font-semibold text-ink-900">
              <CascadeAmount value={result.total} delay={totalDelay} duration={350} generation={generation} />
            </td>
          </tr>
        </tbody>
      </table>

      <ResultPanel
        result={result}
        generation={generation}
        linesCount={lines.length}
        containerLinked={containerLinked}
        onSave={onSave}
        onPrint={onPrint}
        onReset={onReset}
      />
    </section>
  )
}
