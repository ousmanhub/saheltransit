// Onglet Coûts douaniers — mini-calculateur embarqué (container-detail.md §4c).
// Paramètres pré-remplis depuis le dossier, liquidation live via src/lib/customs.ts.

import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { motion } from 'framer-motion'
import { ExternalLink, Save } from 'lucide-react'
import type { Container } from '@/lib/types'
import { computeCustoms, TEC_RATES } from '@/lib/customs'
import { formatFCFA, formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { flashAndReload, patchStoredContainer } from './storagePatch'
import AnimatedAmount from './AnimatedAmount'
import { EASE_OUT_EXPO } from './utils'

type RowKey = 'droits' | 'tic' | 'stats' | 'accise' | 'tva' | 'acompte'

interface CostsTabProps {
  c: Container
  /** CAF live (FOB + fret + assurance de l'onglet Marchandises) */
  caf: number
}

export default function CostsTab({ c, caf: cafProp }: CostsTabProps) {
  const navigate = useNavigate()
  const extra = c as Container & { acciseRate?: number }

  const [cafInput, setCafInput] = useState(String(cafProp))
  const [tec, setTec] = useState<number>(c.tec)
  const [tvaExoneree, setTvaExoneree] = useState(c.tvaExoneree)
  const [accise, setAccise] = useState<number>(extra.acciseRate ?? 0)
  const [flashRows, setFlashRows] = useState<ReadonlySet<RowKey>>(new Set())
  const flashTimeout = useRef<number | null>(null)

  // Synchronise le CAF quand fret/assurance changent dans l'onglet Marchandises
  useEffect(() => {
    const id = setTimeout(() => setCafInput(String(cafProp)), 0)
    return () => clearTimeout(id)
  }, [cafProp])

  const flash = (rows: RowKey[]) => {
    setFlashRows(new Set(rows))
    if (flashTimeout.current) window.clearTimeout(flashTimeout.current)
    flashTimeout.current = window.setTimeout(() => setFlashRows(new Set()), 800)
  }
  useEffect(
    () => () => {
      if (flashTimeout.current) window.clearTimeout(flashTimeout.current)
    },
    [],
  )

  const cafValue = useMemo(() => {
    const n = Number(cafInput.replace(/\s/g, '').replace(',', '.'))
    return Number.isFinite(n) && n > 0 ? Math.round(n) : 0
  }, [cafInput])

  const result = computeCustoms({ caf: cafValue, tec, acciseRate: accise / 100, tvaExoneree })
  const pctTaxes = cafValue > 0 ? (result.total / cafValue) * 100 : 0

  const rows: { key: RowKey; rubrique: string; base: number; taux: string; montant: number }[] = [
    { key: 'droits', rubrique: 'Droits de douane (TEC)', base: cafValue, taux: `${Math.round(tec * 100)} %`, montant: result.droits },
    { key: 'tic', rubrique: "Taxe d'intégration (TIC)", base: cafValue, taux: '1 %', montant: result.tic },
    { key: 'stats', rubrique: 'Frais de statistiques', base: cafValue, taux: '2 %', montant: result.stats },
    ...(accise > 0
      ? [{ key: 'accise' as RowKey, rubrique: "Droit d'accise", base: cafValue, taux: `${accise} %`, montant: result.accise }]
      : []),
    { key: 'tva', rubrique: tvaExoneree ? 'TVA (exonérée)' : 'TVA', base: result.baseTva, taux: tvaExoneree ? '0 %' : '18 %', montant: result.tva },
    { key: 'acompte', rubrique: "Acompte (avance d'impôt)", base: cafValue + result.droits, taux: '4 %', montant: result.acompte },
  ]

  const save = () => {
    patchStoredContainer(c.id, (x) => ({
      ...x,
      valeurCaf: cafValue,
      tec,
      tvaExoneree,
      acciseRate: accise,
    }))
    flashAndReload({ type: 'success', message: 'Estimation enregistrée dans le dossier' })
  }

  return (
    <div className="grid gap-6 lg:grid-cols-12">
      {/* ── Paramètres ── */}
      <div className="space-y-5 lg:col-span-5">
        <div>
          <label htmlFor="cout-caf" className="text-overline mb-1.5 block text-ink-400">
            Valeur CAF (FCFA)
          </label>
          <input
            id="cout-caf"
            inputMode="numeric"
            value={cafInput}
            onChange={(e) => {
              setCafInput(e.target.value)
              flash(['droits', 'tic', 'stats', 'accise', 'tva', 'acompte'])
            }}
            className="h-10 w-full rounded-lg border border-border bg-subtle px-3 font-mono text-sm text-ink-900 focus:border-sand-500 focus:bg-white focus:outline-none"
          />
          <p className="mt-1 text-xs text-ink-400">Pré-rempli : FOB + fret + assurance (onglet Marchandises).</p>
        </div>

        <fieldset>
          <legend className="text-overline mb-1.5 text-ink-400">Catégorie tarifaire (TEC)</legend>
          <div className="grid grid-cols-4 gap-2">
            {TEC_RATES.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => {
                  setTec(r)
                  flash(['droits', 'tva', 'acompte'])
                }}
                aria-pressed={tec === r}
                className={cn(
                  'h-10 rounded-lg border text-[13px] font-semibold transition-colors',
                  tec === r
                    ? 'border-sand-500 bg-sand-100 text-sand-700'
                    : 'border-border bg-white text-ink-600 hover:bg-subtle',
                )}
              >
                {Math.round(r * 100)} %
              </button>
            ))}
          </div>
        </fieldset>

        <label className="flex items-center justify-between gap-3 text-sm font-medium text-ink-600">
          TVA exonérée (riz, blé, lait, médicaments, engrais)
          <Switch
            checked={tvaExoneree}
            onCheckedChange={(v) => {
              setTvaExoneree(v)
              flash(['tva'])
            }}
          />
        </label>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label htmlFor="cout-accise" className="text-overline text-ink-400">
              Droit d'accise
            </label>
            <span className="font-mono text-[13px] font-semibold text-ink-900">{accise} %</span>
          </div>
          <Slider
            id="cout-accise"
            min={0}
            max={30}
            step={1}
            value={[accise]}
            onValueChange={([v]) => {
              setAccise(v)
              flash(['accise', 'tva'])
            }}
          />
          <p className="mt-1 text-xs text-ink-400">0 % par défaut — jusqu'à 30 % selon les produits.</p>
        </div>
      </div>

      {/* ── Décomposition ── */}
      <div className="lg:col-span-7">
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full">
            <thead>
              <tr className="bg-subtle">
                <th className="text-overline px-4 py-2.5 text-left text-ink-400">Rubrique</th>
                <th className="text-overline px-3 py-2.5 text-right text-ink-400">Base</th>
                <th className="text-overline px-3 py-2.5 text-right text-ink-400">Taux</th>
                <th className="text-overline px-4 py-2.5 text-right text-ink-400">Montant</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.key}
                  className={cn(
                    'border-t border-border transition-colors duration-300',
                    flashRows.has(row.key) && 'bg-sand-100',
                  )}
                >
                  <td className="px-4 py-2.5 text-[13px] text-ink-900">{row.rubrique}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs text-ink-600">{formatNumber(row.base)}</td>
                  <td className="px-3 py-2.5 text-right text-xs font-medium text-ink-600">{row.taux}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-[13px] font-semibold text-ink-900">
                    <AnimatedAmount value={row.montant} format={formatNumber} duration={350} />
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-border-strong bg-subtle">
                <td colSpan={3} className="px-4 py-3 text-sm font-bold text-ink-900">
                  Total droits et taxes
                </td>
                <td className="px-4 py-3 text-right font-mono text-sm font-bold text-ink-900">
                  <AnimatedAmount value={result.total} format={formatNumber} duration={350} />
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Encart résultat */}
        <motion.div
          key={result.coutDebarque}
          initial={{ scale: 1 }}
          animate={{ scale: [1, 1.01, 1] }}
          transition={{ duration: 0.3, ease: EASE_OUT_EXPO }}
          className="mt-4 rounded-xl bg-navy-950 p-5"
        >
          <p className="text-overline text-navy-300">Coût total débarqué</p>
          <p className="mt-1 font-sora text-2xl font-bold text-white">
            <AnimatedAmount value={result.coutDebarque} format={formatFCFA} duration={350} />
          </p>
          <p className="mt-1 text-xs text-sand-500">
            Taxes = {pctTaxes.toFixed(1).replace('.', ',')} % de la valeur CAF
          </p>
        </motion.div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={save}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-sand-500 px-4 text-[13px] font-semibold text-white transition-colors hover:bg-sand-600"
          >
            <Save size={15} />
            Enregistrer l'estimation
          </button>
          <button
            type="button"
            onClick={() => navigate(`/calculateur?container=${c.id}`)}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-white px-4 text-[13px] font-semibold text-ink-600 transition-colors hover:bg-subtle"
          >
            <ExternalLink size={15} />
            Voir dans le calculateur
          </button>
        </div>
      </div>
    </div>
  )
}
