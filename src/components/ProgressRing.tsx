// ProgressRing — anneau SVG de complétion documentaire (design.md §4.7)

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

interface ProgressRingProps {
  /** Pourcentage 0–100 */
  value: number
  size?: number
  stroke?: number
  className?: string
}

export default function ProgressRing({ value, size = 44, stroke = 4, className }: ProgressRingProps) {
  const [displayed, setDisplayed] = useState(0)
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r

  // Tween 600 ms au changement
  useEffect(() => {
    const from = displayed
    const to = Math.max(0, Math.min(100, value))
    if (from === to) return
    const start = performance.now()
    let raf = 0
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / 600)
      const eased = 1 - Math.pow(1 - p, 3)
      setDisplayed(from + (to - from) * eased)
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  const offset = c - (displayed / 100) * c
  const color = displayed >= 100 ? '#059669' : displayed >= 70 ? '#E8930C' : '#E11D48'

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#EEF0F3" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
        />
      </svg>
      <span className="absolute text-[10px] leading-none font-semibold text-ink-600" style={{ fontVariantNumeric: 'tabular-nums' }}>
        {Math.round(displayed)}%
      </span>
    </div>
  )
}
