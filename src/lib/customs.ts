// Calculateur douanier — formules exactes design.md §7 (taux CEMAC 2025)

export interface CustomsInput {
  /** Valeur CAF = FOB + fret + assurance (FCFA) */
  caf: number
  /** TEC ∈ 5 %, 10 %, 15 %, 20 % */
  tec: number
  /** Taux d'accise (0–30 %, 0 par défaut) */
  acciseRate?: number
  /** TVA exonérée : riz, blé, lait, médicaments, engrais */
  tvaExoneree?: boolean
}

export interface CustomsResult {
  caf: number
  droits: number
  tic: number
  stats: number
  accise: number
  baseTva: number
  tva: number
  acompte: number
  total: number
  coutDebarque: number
}

export const TEC_RATES = [0.05, 0.1, 0.15, 0.2] as const
export const TVA_RATE = 0.18
export const TIC_RATE = 0.01
export const STATS_RATE = 0.02
export const ACOMPTE_RATE = 0.04

/**
 * Droits = CAF × TEC · TIC = CAF × 1 % · Stats = CAF × 2 %
 * Accise = CAF × taux accise
 * Base TVA = CAF + Droits + TIC + Stats (+ Accise)
 * TVA = Base TVA × 18 % (0 si exonéré)
 * Acompte = (CAF + Droits) × 4 %
 * TOTAL = Droits + TIC + Stats + Accise + TVA + Acompte
 * Coût débarqué = CAF + TOTAL
 */
export function computeCustoms(input: CustomsInput): CustomsResult {
  const { caf, tec, acciseRate = 0, tvaExoneree = false } = input
  const droits = Math.round(caf * tec)
  const tic = Math.round(caf * TIC_RATE)
  const stats = Math.round(caf * STATS_RATE)
  const accise = Math.round(caf * acciseRate)
  const baseTva = caf + droits + tic + stats + accise
  const tva = tvaExoneree ? 0 : Math.round(baseTva * TVA_RATE)
  const acompte = Math.round((caf + droits) * ACOMPTE_RATE)
  const total = droits + tic + stats + accise + tva + acompte
  return {
    caf,
    droits,
    tic,
    stats,
    accise,
    baseTva,
    tva,
    acompte,
    total,
    coutDebarque: caf + total,
  }
}
