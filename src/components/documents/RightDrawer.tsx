// RightDrawer — drawer droit 480px générique (design.md §4.9)
// Slide-in 280ms ease-out-expo, backdrop navy-950/40 + blur 2px, fade 200ms.

import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'

const EASE_OUT_EXPO = [0.22, 1, 0.36, 1] as [number, number, number, number]

interface RightDrawerProps {
  open: boolean
  onClose: () => void
  title: ReactNode
  /** Sous-titre (caption) sous le titre */
  subtitle?: ReactNode
  children: ReactNode
  /** Contenu du pied (boutons d'action) */
  footer?: ReactNode
}

export default function RightDrawer({ open, onClose, title, subtitle, children, footer }: RightDrawerProps) {
  // Fermeture au clavier (Échap)
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-navy-950/40 backdrop-blur-[2px]"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: 480 }}
            animate={{ x: 0 }}
            exit={{ x: 480 }}
            transition={{ duration: 0.28, ease: EASE_OUT_EXPO }}
            className="absolute inset-y-0 right-0 flex w-full max-w-[480px] flex-col bg-white shadow-overlay"
          >
            <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-5">
              <div className="min-w-0">
                <h2 className="font-h3 text-ink-900">{title}</h2>
                {subtitle && <div className="mt-0.5 text-xs text-ink-400">{subtitle}</div>}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex size-8 shrink-0 items-center justify-center rounded-lg text-ink-400 transition-colors hover:bg-subtle hover:text-ink-600"
                aria-label="Fermer le panneau"
              >
                <X size={18} strokeWidth={1.75} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
            {footer && <div className="border-t border-border px-6 py-4">{footer}</div>}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  )
}
