// AnimatedAmount — count-up expo à chaque changement de valeur.

import { useEffect, useRef } from 'react'

// ─── Montant animé (count-up à chaque changement) ───────────────────────────

interface AnimatedAmountProps {
  value: number
  format: (n: number) => string
  duration?: number
  className?: string
}

/** Count-up expo sur la valeur à chaque changement (durée 350–700 ms) */
export default function AnimatedAmount({ value, format, duration = 350, className }: AnimatedAmountProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const prev = useRef<number | null>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const from = prev.current ?? 0
    prev.current = value
    if (from === value) {
      el.textContent = format(value)
      return
    }
    const start = performance.now()
    let raf = 0
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration)
      const eased = p === 1 ? 1 : 1 - Math.pow(2, -10 * p)
      el.textContent = format(from + (value - from) * eased)
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value, format, duration])
  return (
    <span ref={ref} className={className}>
      {format(value)}
    </span>
  )
}
