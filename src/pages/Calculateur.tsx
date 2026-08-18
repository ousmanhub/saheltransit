// Page — Calculateur douanier (route « /calculateur », design/calculator.md)
// Simulateur autonome de droits et taxes CEMAC : saisie FOB + fret + assurance = CAF,
// TEC 5/10/15/20 %, accise 0–30 %, exonération TVA — bulletin de liquidation avec
// recalcul en cascade animé, encart résultat navy, impression A4, historique localStorage.

import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, Container as ContainerIcon, History, Unlink } from 'lucide-react'
import { toast } from 'sonner'
import type { Container } from '@/lib/types'
import { useStore } from '@/lib/store'
import { computeCustoms } from '@/lib/customs'
import { formatFCFA, formatNumber, relativeTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import StatusBadge from '@/components/StatusBadge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import Bulletin from '@/components/calculator/Bulletin'
import GuideTaux from '@/components/calculator/GuideTaux'
import PrintSheet from '@/components/calculator/PrintSheet'
import { CascadeAmount, EASE_OUT_EXPO, MoneyField } from '@/components/calculator/shared'
import { useFlash } from '@/components/calculator/useFlash'
import {
  DEFAULT_PARAMS,
  loadSimulations,
  saveEstimation,
  saveSimulation,
} from '@/components/calculator/history'
import type { SimulationParams, SimulationRecord } from '@/components/calculator/history'

const round10k = (n: number) => Math.round(n / 10_000) * 10_000

/** Catégories du Tarif Extérieur Commun CEMAC (design §2.5) */
const TEC_OPTIONS: { value: number; label: string; hint: string }[] = [
  { value: 0.05, label: 'Biens essentiels', hint: 'médicaments, engrais' },
  { value: 0.1, label: 'Intrants & équipements', hint: 'solaire, riz' },
  { value: 0.15, label: 'Intermédiaires', hint: 'pièces détachées' },
  { value: 0.2, label: 'Biens de consommation', hint: 'électronique' },
]

/** Bloc de formulaire animé à l'entrée (stagger 60 ms, translateY 10px + fade) */
function FieldBlock({ index, children }: { index: number; children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.05 + index * 0.06, ease: EASE_OUT_EXPO }}
    >
      {children}
    </motion.div>
  )
}

export default function Calculateur() {
  const { containers, getContainer } = useStore()
  const [searchParams, setSearchParams] = useSearchParams()

  // ── Paramètres de la simulation ──
  const [fob, setFob] = useState(DEFAULT_PARAMS.fob)
  const [fret, setFret] = useState(DEFAULT_PARAMS.fret)
  const [assurance, setAssurance] = useState(DEFAULT_PARAMS.assurance)
  const [tec, setTec] = useState(DEFAULT_PARAMS.tec)
  const [accise, setAccise] = useState(DEFAULT_PARAMS.accise)
  const [tvaExoneree, setTvaExoneree] = useState(DEFAULT_PARAMS.tvaExoneree)

  // ── Container lié (pré-remplissage) ──
  const [containerId, setContainerId] = useState<string | null>(null)
  const container: Container | undefined = containerId ? getContainer(containerId) : undefined

  // ── Animations : génération de recalcul (cascade) + flash des champs ──
  const [generation, setGeneration] = useState(0)
  const [flashGen, setFlashGen] = useState(0)

  // ── Historique des simulations (localStorage) ──
  const [history, setHistory] = useState<SimulationRecord[]>(() => loadSimulations())

  const bulletinRef = useRef<HTMLDivElement>(null)

  const caf = fob + fret + assurance
  const result = useMemo(
    () => computeCustoms({ caf, tec, acciseRate: accise / 100, tvaExoneree }),
    [caf, tec, accise, tvaExoneree],
  )
  const params: SimulationParams = useMemo(
    () => ({ fob, fret, assurance, tec, accise, tvaExoneree }),
    [fob, fret, assurance, tec, accise, tvaExoneree],
  )

  // Toute modification de paramètre → recalcul en cascade (stagger 60 ms)
  useEffect(() => {
    const id = setTimeout(() => setGeneration((g) => g + 1), 0)
    return () => clearTimeout(id)
  }, [fob, fret, assurance, tec, accise, tvaExoneree])

  // Pré-remplissage depuis un container (split CAF selon les proportions du scénario de référence)
  const prefillFromContainer = (c: Container, flash: boolean) => {
    const cafV = c.valeurCaf
    const fretV = round10k(cafV * (2_850_000 / 18_560_000))
    const assuranceV = round10k(cafV * (310_000 / 18_560_000))
    setFob(cafV - fretV - assuranceV)
    setFret(fretV)
    setAssurance(assuranceV)
    setTec(c.tec)
    setTvaExoneree(c.tvaExoneree)
    setAccise(0)
    setContainerId(c.id)
    setSearchParams({ container: c.id }, { replace: true })
    if (flash) setFlashGen((g) => g + 1)
  }

  // Chargement initial via ?container= (id ou numéro, ex. « MSKU 847 291-5 »)
  const initialised = useRef(false)
  useEffect(() => {
    if (initialised.current) return
    initialised.current = true
    const param = searchParams.get('container')
    if (!param) return
    const c = containers.find((x) => x.id === param || x.numero === param)
    if (c) {
      const id = setTimeout(() => prefillFromContainer(c, true), 0)
      return () => clearTimeout(id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const detach = () => {
    setContainerId(null)
    setSearchParams({}, { replace: true })
  }

  const reset = () => {
    setFob(DEFAULT_PARAMS.fob)
    setFret(DEFAULT_PARAMS.fret)
    setAssurance(DEFAULT_PARAMS.assurance)
    setTec(DEFAULT_PARAMS.tec)
    setAccise(DEFAULT_PARAMS.accise)
    setTvaExoneree(DEFAULT_PARAMS.tvaExoneree)
    detach()
  }

  // « Enregistrer sur le dossier » : estimation persistée + historique + toast
  const save = () => {
    if (!container) return
    saveEstimation({
      containerId: container.id,
      date: new Date().toISOString(),
      params,
      totalTaxes: result.total,
      coutDebarque: result.coutDebarque,
    })
    setHistory((h) =>
      saveSimulation({ label: container.numero, containerId: container.id, params, total: result.total }, h),
    )
    toast.success(`Estimation enregistrée sur le dossier ${container.numero}`, {
      description: `Droits et taxes : ${formatFCFA(result.total)} · coût débarqué ${formatFCFA(result.coutDebarque)}`,
    })
  }

  const print = () => {
    setHistory((h) =>
      saveSimulation(
        { label: container ? container.numero : 'Simulation libre', containerId: container?.id, params, total: result.total },
        h,
      ),
    )
    // Laisser le state se propager avant l'ouverture de la boîte d'impression
    window.setTimeout(() => window.print(), 50)
  }

  // Clic sur une chip d'historique → re-remplissage animé (comme section 1)
  const restore = (rec: SimulationRecord) => {
    setFob(rec.params.fob)
    setFret(rec.params.fret)
    setAssurance(rec.params.assurance)
    setTec(rec.params.tec)
    setAccise(rec.params.accise)
    setTvaExoneree(rec.params.tvaExoneree)
    const linked = rec.containerId ? getContainer(rec.containerId) : undefined
    if (linked) {
      setContainerId(linked.id)
      setSearchParams({ container: linked.id }, { replace: true })
    } else {
      setContainerId(null)
      setSearchParams({}, { replace: true })
    }
    setFlashGen((g) => g + 1)
  }

  const cafFlash = useFlash(flashGen, 240, 500)

  return (
    <>
      <div className="calc-screen grid gap-6 pb-20 lg:pb-0">
      {/* Feuille de style impression (A4) — complète les règles globales de index.css */}
      <style>{`
        @page { size: A4; margin: 14mm; }
        @media print {
          .calc-screen { display: none !important; }
          .calc-print { display: block !important; }
          main { padding: 0 !important; }
          div[class*="pl-["] { padding-left: 0 !important; }
        }
      `}</style>

      {/* Caption topbar (le titre « Calculateur douanier » est rendu par l'AppShell) */}
      <p className="-mb-3 text-xs text-ink-400">Tarif Extérieur Commun CEMAC · TVA 18 % · Tchad</p>

      {/* ── Section 1 — Bandeau contexte container ── */}
      <AnimatePresence mode="wait" initial={false}>
        {container ? (
          <motion.div
            key={`linked-${container.id}`}
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25, ease: EASE_OUT_EXPO }}
            className="flex flex-wrap items-center gap-3 rounded-xl bg-navy-950 px-5 py-4 text-white"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-navy-800">
              <ContainerIcon size={18} strokeWidth={1.75} className="text-sand-500" />
            </span>
            <p className="min-w-0 flex-1 text-sm leading-5">
              <strong className="font-semibold">
                Simulation liée au dossier <span className="font-mono">{container.numero}</span>
              </strong>
              <span className="text-navy-100">
                {' '}
                — {container.contenu} · CAF {formatFCFA(container.valeurCaf)}
              </span>
            </p>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={detach}
                className="flex h-8 items-center gap-1.5 rounded-lg border border-navy-800 px-3 text-xs font-medium text-navy-100 transition-colors hover:bg-navy-900 hover:text-white"
              >
                <Unlink size={13} strokeWidth={1.75} />
                Détacher
              </button>
              <Link
                to={`/containers/${container.id}`}
                className="flex h-8 items-center rounded-lg px-2 text-[13px] font-medium text-sand-500 transition-colors hover:text-white"
              >
                Ouvrir le dossier →
              </Link>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="free"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25, ease: EASE_OUT_EXPO }}
            className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-white px-5 py-4 shadow-card"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-subtle">
              <ContainerIcon size={18} strokeWidth={1.75} className="text-ink-400" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-ink-900">Simulation autonome</p>
              <p className="text-xs text-ink-400">Chargez un dossier pour pré-remplir valeur, TEC et régime TVA</p>
            </div>
            <Select
              onValueChange={(id) => {
                const c = getContainer(id)
                if (c) prefillFromContainer(c, true)
              }}
            >
              <SelectTrigger className="w-full border-border bg-white text-[13px] sm:w-[320px]">
                <SelectValue placeholder="Charger un container existant…" />
              </SelectTrigger>
              <SelectContent>
                {containers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    <span className="flex items-center gap-2">
                      <span className="font-mono text-xs font-medium">{c.numero}</span>
                      <StatusBadge statut={c.statut} className="h-5 px-2 text-[10px]" />
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Sections 2 + 3 — Paramètres / Bulletin ── */}
      <div className="grid items-start gap-6 lg:grid-cols-12">
        {/* Section 2 — Paramètres (5/12) */}
        <section className="rounded-xl bg-white p-5 shadow-card md:p-6 lg:col-span-5" aria-label="Paramètres">
          <h3 className="font-h3 mb-5 text-ink-900">Paramètres</h3>
          <div className="grid gap-5">
            <FieldBlock index={0}>
              <MoneyField
                id="calc-fob"
                label="Valeur des marchandises (FOB)"
                value={fob}
                onChange={setFob}
                flashGeneration={flashGen}
                flashDelay={0}
              />
            </FieldBlock>

            <FieldBlock index={1}>
              <MoneyField
                id="calc-fret"
                label="Fret maritime + transport terrestre"
                value={fret}
                onChange={setFret}
                caption="Douala → N'Djamena ≈ 1 700 km, compter 1 500–2 500 FCFA/km/container"
                flashGeneration={flashGen}
                flashDelay={80}
              />
            </FieldBlock>

            <FieldBlock index={2}>
              <MoneyField
                id="calc-assurance"
                label="Assurance cargo"
                value={assurance}
                onChange={setAssurance}
                caption="≈ 2 % de la valeur FOB"
                action={
                  <button
                    type="button"
                    onClick={() => setAssurance(round10k(fob * 0.02))}
                    className="rounded-md px-1.5 py-0.5 text-xs font-semibold text-sand-700 transition-colors hover:bg-sand-100"
                  >
                    2 % auto
                  </button>
                }
                flashGeneration={flashGen}
                flashDelay={160}
              />
            </FieldBlock>

            {/* Récap CAF live */}
            <FieldBlock index={3}>
              <div
                className={cn(
                  'flex items-center justify-between gap-3 rounded-lg bg-subtle px-4 py-3 transition-colors duration-300',
                  cafFlash && 'bg-sand-100',
                )}
              >
                <div>
                  <p className="text-[13px] font-semibold text-ink-600">Valeur CAF</p>
                  <p className="text-[11px] text-ink-400">FOB + fret + assurance — base de liquidation</p>
                </div>
                <p className="font-sora text-[18px] font-semibold text-ink-900">
                  <CascadeAmount
                    value={caf}
                    delay={0}
                    duration={300}
                    generation={generation}
                    format={(n) => `${formatNumber(n)} FCFA`}
                  />
                </p>
              </div>
            </FieldBlock>

            {/* Catégorie tarifaire TEC */}
            <FieldBlock index={4}>
              <fieldset>
                <legend className="mb-2 text-[13px] font-medium text-ink-600">Catégorie tarifaire (TEC)</legend>
                <div className="grid grid-cols-2 gap-3">
                  {TEC_OPTIONS.map((opt) => {
                    const selected = tec === opt.value
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => setTec(opt.value)}
                        className={cn(
                          'relative rounded-lg border-2 p-3 text-left transition-all duration-200',
                          selected
                            ? 'border-sand-500 bg-sand-100'
                            : 'border-border bg-white hover:border-border-strong hover:bg-subtle/50',
                        )}
                      >
                        <AnimatePresence>
                          {selected && (
                            <motion.span
                              initial={{ scale: 0.6, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              exit={{ scale: 0.6, opacity: 0 }}
                              transition={{ type: 'spring', stiffness: 260, damping: 24 }}
                              className="absolute top-2 right-2 flex size-5 items-center justify-center rounded-full bg-sand-500 text-white"
                            >
                              <Check size={12} strokeWidth={2.5} />
                            </motion.span>
                          )}
                        </AnimatePresence>
                        <p className={cn('font-sora text-[20px] leading-6 font-bold', selected ? 'text-sand-700' : 'text-ink-900')}>
                          {Math.round(opt.value * 100)} %
                        </p>
                        <p className="mt-1 text-[13px] leading-4 font-semibold text-ink-900">{opt.label}</p>
                        <p className="text-[11px] leading-4 text-ink-400">{opt.hint}</p>
                      </button>
                    )
                  })}
                </div>
              </fieldset>
            </FieldBlock>

            {/* Exonération TVA */}
            <FieldBlock index={5}>
              <div className="flex items-center justify-between gap-3 rounded-lg border border-border px-3.5 py-3">
                <div>
                  <label htmlFor="calc-tva" className="text-[13px] font-medium text-ink-900">
                    Exonération TVA
                  </label>
                  <p className="text-xs text-ink-400">Riz, blé, lait, médicaments, engrais</p>
                </div>
                <Switch
                  id="calc-tva"
                  checked={tvaExoneree}
                  onCheckedChange={setTvaExoneree}
                  className="data-[state=checked]:bg-sand-500"
                />
              </div>
            </FieldBlock>

            {/* Droits d'accise */}
            <FieldBlock index={6}>
              <div className="grid gap-1.5">
                <div className="flex items-center justify-between gap-2">
                  <label htmlFor="calc-accise" className="text-[13px] font-medium text-ink-600">
                    Droits d'accise
                  </label>
                  <div className="relative">
                    <input
                      id="calc-accise"
                      type="number"
                      min={0}
                      max={30}
                      value={accise}
                      onChange={(e) => {
                        const v = parseInt(e.target.value, 10)
                        setAccise(Number.isNaN(v) ? 0 : Math.min(30, Math.max(0, v)))
                      }}
                      className="h-8 w-16 rounded-lg border border-border pr-6 pl-2 text-right font-mono text-[13px] font-medium text-ink-900 outline-none focus:border-border-strong"
                    />
                    <span className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-[11px] text-ink-400">%</span>
                  </div>
                </div>
                {/* Tooltip de valeur au-dessus du thumb */}
                <div className="group relative px-1 pt-5">
                  <div
                    className="pointer-events-none absolute top-0 -translate-x-1/2 rounded-md bg-navy-950 px-1.5 py-0.5 font-mono text-[11px] font-medium text-white opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
                    style={{ left: `calc(${(accise / 30) * 100}% + ${8 - (accise / 30) * 16}px)` }}
                  >
                    {accise} %
                  </div>
                  <Slider
                    value={[accise]}
                    onValueChange={([v]) => setAccise(v)}
                    min={0}
                    max={30}
                    step={1}
                    aria-label="Taux d'accise"
                    className="[&_[data-slot=slider-range]]:bg-sand-500 [&_[data-slot=slider-thumb]]:border-sand-500 [&_[data-slot=slider-track]]:bg-subtle"
                  />
                  <div className="mt-1 flex justify-between text-[10px] font-medium text-ink-400">
                    <span>0 %</span>
                    <span>30 %</span>
                  </div>
                </div>
                <p className="text-xs text-ink-400">Alcools, tabacs, produits spécifiques — laisser 0 si non concerné</p>
              </div>
            </FieldBlock>
          </div>
        </section>

        {/* Section 3 — Bulletin de liquidation (7/12) */}
        <div ref={bulletinRef} className="scroll-mt-20 lg:col-span-7">
          <Bulletin
            result={result}
            tec={tec}
            accise={accise}
            tvaExoneree={tvaExoneree}
            generation={generation}
            containerLinked={!!container}
            onSave={save}
            onPrint={print}
            onReset={reset}
          />
        </div>
      </div>

      {/* ── Section 4 — Guide des taux ── */}
      <GuideTaux />

      {/* ── Section 5 — Historique des simulations ── */}
      {history.length > 0 && (
        <section
          aria-label="Historique des simulations"
          className="rounded-xl border border-border bg-white px-5 py-4 shadow-card"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1.5 pr-1 text-xs font-medium text-ink-400">
              <History size={14} strokeWidth={1.75} />
              Dernières simulations :
            </span>
            {history.map((rec, i) => (
              <motion.button
                key={rec.id}
                type="button"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.25, delay: i * 0.04 }}
                onClick={() => restore(rec)}
                title="Recharger ces paramètres"
                className="flex items-center gap-1.5 rounded-full border border-border bg-subtle/60 px-3 py-1.5 text-xs font-medium text-ink-600 transition-colors hover:border-sand-500 hover:bg-sand-100 hover:text-sand-700"
              >
                <span className="max-w-[140px] truncate">{rec.label}</span>
                <span aria-hidden>→</span>
                <span className="font-mono">{formatNumber(rec.total)}</span>
                <span className="text-ink-400">({relativeTime(rec.date)})</span>
              </motion.button>
            ))}
          </div>
        </section>
      )}

      {/* ── Barre résultat sticky <1024px ── */}
      <div className="no-print fixed inset-x-0 bottom-0 z-50 border-t border-navy-800 bg-navy-950 px-5 py-3 text-white lg:hidden">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold tracking-[0.08em] text-navy-300 uppercase">Coût total débarqué</p>
            <p className="truncate font-sora text-lg leading-6 font-bold text-white">
              <CascadeAmount
                value={result.coutDebarque}
                delay={0}
                duration={450}
                generation={generation}
                format={(n) => `${formatNumber(n)} FCFA`}
              />
            </p>
          </div>
          <button
            type="button"
            onClick={() => bulletinRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-sand-500 px-4 text-[13px] font-semibold text-white transition-colors hover:bg-sand-600"
          >
            Détail
          </button>
        </div>
      </div>

      </div>

      {/* ── Vue impression A4 (visible uniquement en @media print, hors .calc-screen) ── */}
      <PrintSheet params={params} result={result} container={container} editionDate={new Date()} />
    </>
  )
}
