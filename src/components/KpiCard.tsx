// KpiCard — carte KPI avec count-up (design.md §4.4)

import { useEffect, useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { TrendingDown, TrendingUp } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Line, LineChart, ResponsiveContainer } from 'recharts'
import { cn } from '@/lib/utils'

interface KpiCardProps {
  icon: LucideIcon
  /** Teinte du carré icône : { bg, color } */
  tint: { bg: string; color: string }
  label: string
  /** Valeur numérique (count-up) */
  value: number
  /** Formatage de la valeur affichée */
  format?: (n: number) => string
  subline: string
  /** Tendance : flèche + couleur de la sous-ligne */
  trend?: 'up' | 'down' | 'none'
  sublineColor?: string
  sublineIcon?: LucideIcon
  index?: number
  /** Mini sparkline (recharts) affichée à droite de la valeur */
  spark?: number[]
  sparkColor?: string
}

export default function KpiCard({
  icon: Icon,
  tint,
  label,
  value,
  format = (n) => String(Math.round(n)),
  subline,
  trend = 'none',
  sublineColor = '#9AA3AD',
  sublineIcon: SublineIcon,
  index = 0,
  spark,
  sparkColor = '#E8930C',
}: KpiCardProps) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.4 })
  const valueRef = useRef<HTMLSpanElement>(null)

  // Count-up 800 ms easing expo dès l'entrée viewport
  useEffect(() => {
    if (!inView || !valueRef.current) return
    const el = valueRef.current
    const start = performance.now()
    let raf = 0
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / 800)
      const eased = p === 1 ? 1 : 1 - Math.pow(2, -10 * p)
      el.textContent = format(value * eased)
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [inView, value, format])

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : null

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 16 }}
      animate={inView ? { opacity: 1, y: 0 } : undefined}
      transition={{ duration: 0.4, delay: index * 0.07, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -2, boxShadow: '0 4px 12px rgba(16,24,40,.08)' }}
      className="rounded-xl bg-white p-5 shadow-card transition-shadow duration-200"
    >
      <div className="flex items-start justify-between">
        <div className="flex size-10 items-center justify-center rounded-lg" style={{ backgroundColor: tint.bg }}>
          <Icon size={20} strokeWidth={1.75} style={{ color: tint.color }} />
        </div>
      </div>
      <p className="text-overline mt-4 text-ink-400">{label}</p>
      <div className="flex items-end justify-between gap-2">
        <p className="font-kpi mt-1 text-ink-900" style={{ fontVariantNumeric: 'tabular-nums' }}>
          <span ref={valueRef}>{format(0)}</span>
        </p>
        {spark && spark.length > 1 && (
          <div className="h-9 w-24 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={spark.map((v, i) => ({ i, v }))}>
                <Line type="monotone" dataKey="v" stroke={sparkColor} strokeWidth={1.75} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
      <p className={cn('mt-1.5 flex items-center gap-1 text-xs font-medium')} style={{ color: sublineColor }}>
        {SublineIcon ? <SublineIcon size={14} strokeWidth={1.75} /> : TrendIcon && <TrendIcon size={14} strokeWidth={1.75} />}
        {subline}
      </p>
    </motion.div>
  )
}
