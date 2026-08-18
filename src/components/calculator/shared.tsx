// Calculateur douanier — primitives partagées de la page /calculateur
// (count-up en cascade, flash sand-100, champ montant avec stepper long-press)

import { useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent, ReactNode } from 'react'
import { Minus, Plus } from 'lucide-react'
import { formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useFlash } from './useFlash'

export const EASE_OUT_EXPO = [0.22, 1, 0.36, 1] as [number, number, number, number]

/** Easing expo identique aux count-up du dashboard */
function easeExpo(p: number): number {
  return p === 1 ? 1 : 1 - Math.pow(2, -10 * p)
}

// ─── CascadeAmount ───────────────────────────────────────────────────────────
// Count-up retardé : à chaque changement de `generation` (ou de `value`),
// le montant attend `delay` ms puis tweene depuis sa valeur affichée.

interface CascadeAmountProps {
  value: number
  /** Retard avant démarrage du tween (ms) — cascade haut → bas */
  delay?: number
  /** Durée du tween (ms) */
  duration?: number
  /** Compteur de recalcul : force la relance de l'animation */
  generation: number
  format?: (n: number) => string
  className?: string
}

export function CascadeAmount({
  value,
  delay = 0,
  duration = 350,
  generation,
  format = formatNumber,
  className,
}: CascadeAmountProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const displayed = useRef(0)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    let raf = 0
    const timeout = window.setTimeout(() => {
      const from = displayed.current
      if (from === value) {
        el.textContent = format(value)
        return
      }
      const start = performance.now()
      const tick = (t: number) => {
        const p = Math.min(1, (t - start) / duration)
        const current = Math.round(from + (value - from) * easeExpo(p))
        displayed.current = current
        el.textContent = format(current)
        if (p < 1) raf = requestAnimationFrame(tick)
      }
      raf = requestAnimationFrame(tick)
    }, delay)
    return () => {
      window.clearTimeout(timeout)
      cancelAnimationFrame(raf)
    }
    // generation force la relance même si value est inchangée
  }, [value, generation, delay, duration, format])

  // Enfants constants : le count-up pilote textContent sans que React n'y touche
  // (même pattern que le count-up des KpiCard du dashboard).
  return (
    <span ref={ref} className={className} style={{ fontVariantNumeric: 'tabular-nums' }}>
      {format(0)}
    </span>
  )
}

// ─── MoneyField ──────────────────────────────────────────────────────────────
// Input mono avec suffixe « FCFA » + stepper ±step (long-press accélère).
// Affiche le nombre formaté (espaces fr) hors édition, les chiffres bruts en édition.

interface MoneyFieldProps {
  id: string
  label: string
  value: number
  onChange: (n: number) => void
  /** Pas du stepper (défaut 100 000) */
  step?: number
  caption?: ReactNode
  /** Action secondaire à droite du label (ex. « 2 % auto ») */
  action?: ReactNode
  /** Flash séquentiel au chargement d'un container */
  flashGeneration?: number
  flashDelay?: number
}

export function MoneyField({
  id,
  label,
  value,
  onChange,
  step = 100_000,
  caption,
  action,
  flashGeneration = 0,
  flashDelay = 0,
}: MoneyFieldProps) {
  // null = pas en édition → affichage formaté
  const [text, setText] = useState<string | null>(null)
  const flash = useFlash(flashGeneration, flashDelay, 500)

  // Stepper long-press : maintien → répétition, le pas croît avec la durée
  const holdRef = useRef<{ startedAt: number; interval: number | null; timeout: number | null }>({
    startedAt: 0,
    interval: null,
    timeout: null,
  })

  const stopHold = () => {
    const h = holdRef.current
    if (h.timeout !== null) window.clearTimeout(h.timeout)
    if (h.interval !== null) window.clearInterval(h.interval)
    holdRef.current = { startedAt: 0, interval: null, timeout: null }
  }

  useEffect(() => {
    return () => stopHold()
  }, [])

  const applyStep = (dir: 1 | -1, multiplier: number) => {
    onChange(Math.max(0, value + dir * step * multiplier))
  }

  const startHold = (dir: 1 | -1) => (e: ReactPointerEvent<HTMLButtonElement>) => {
    e.preventDefault()
    // eslint-disable-next-line react-hooks/refs
    stopHold()
    applyStep(dir, 1)
    const startedAt = performance.now()
    let interval: number | null = null
    const timeout = window.setTimeout(() => {
      interval = window.setInterval(() => {
        const held = performance.now() - startedAt
        // Accélération : ×1 puis ×2 (0,8 s), ×5 (1,6 s), ×10 (2,4 s)
        const mult = held > 2400 ? 10 : held > 1600 ? 5 : held > 800 ? 2 : 1
        applyStep(dir, mult)
      }, 90)
    }, 400)
    // eslint-disable-next-line react-hooks/refs
    holdRef.current = { startedAt, interval, timeout }
  }

  return (
    <div className="grid gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={id} className="text-[13px] font-medium text-ink-600">
          {label}
        </label>
        {action}
      </div>
      <div
        className={cn(
          'flex items-stretch overflow-hidden rounded-lg border border-border bg-white transition-colors duration-300 focus-within:border-border-strong',
          flash && 'border-sand-500 bg-sand-100',
        )}
      >
        <div className="relative flex-1">
          <input
            id={id}
            inputMode="numeric"
            autoComplete="off"
            className="h-10 w-full bg-transparent pr-14 pl-3 font-mono text-[13px] font-medium text-ink-900 outline-none"
            value={text ?? formatNumber(value)}
            onFocus={() => setText(String(value))}
            onChange={(e) => {
              const digits = e.target.value.replace(/[^\d]/g, '')
              setText(digits)
              onChange(digits === '' ? 0 : Math.min(999_999_999_999, parseInt(digits, 10)))
            }}
            onBlur={() => setText(null)}
          />
          <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[11px] font-medium text-ink-400">
            FCFA
          </span>
        </div>
        <div className="flex shrink-0 border-l border-border">
          <button
            type="button"
            aria-label={`Diminuer de ${formatNumber(step)} FCFA`}
            className="flex w-9 items-center justify-center text-ink-400 transition-colors select-none hover:bg-subtle hover:text-ink-600 active:bg-sand-100 active:text-sand-700"
            onPointerDown={startHold(-1)}
            onPointerUp={stopHold}
            onPointerLeave={stopHold}
            onContextMenu={(e) => e.preventDefault()}
          >
            <Minus size={14} strokeWidth={2} />
          </button>
          <button
            type="button"
            aria-label={`Augmenter de ${formatNumber(step)} FCFA`}
            className="flex w-9 items-center justify-center border-l border-border text-ink-400 transition-colors select-none hover:bg-subtle hover:text-ink-600 active:bg-sand-100 active:text-sand-700"
            onPointerDown={startHold(1)}
            onPointerUp={stopHold}
            onPointerLeave={stopHold}
            onContextMenu={(e) => e.preventDefault()}
          >
            <Plus size={14} strokeWidth={2} />
          </button>
        </div>
      </div>
      {caption && <p className="text-xs text-ink-400">{caption}</p>}
    </div>
  )
}
