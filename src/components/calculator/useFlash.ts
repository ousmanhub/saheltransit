// Hook de flash temporisé — renvoie true pendant une courte fenêtre après
// chaque changement de `generation` (+ delay). Utilisé pour le flash sand-100
// des lignes du bulletin et le re-remplissage séquentiel des champs (stagger 80 ms).

import { useEffect, useState } from 'react'

export function useFlash(generation: number, delay = 0, hold = 450): boolean {
  const [flash, setFlash] = useState(false)
  useEffect(() => {
    if (generation === 0) return
    const t0 = window.setTimeout(() => setFlash(false), 0)
    const t1 = window.setTimeout(() => setFlash(true), delay)
    const t2 = window.setTimeout(() => setFlash(false), delay + hold)
    return () => {
      window.clearTimeout(t0)
      window.clearTimeout(t1)
      window.clearTimeout(t2)
    }
  }, [generation, delay, hold])
  return flash
}
