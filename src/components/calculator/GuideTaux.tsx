// Guide pédagogique des taux — 3 accordéons-cartes (calculator.md §4)
// TEC CEMAC · taxes additionnelles du Tchad · pièges du corridor.

import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { EASE_OUT_EXPO } from './shared'

function RateLine({ taux, children }: { taux: string; children: ReactNode }) {
  return (
    <li className="flex items-start gap-2.5">
      <span className="mt-px inline-flex min-w-11 shrink-0 items-center justify-center rounded-md bg-sand-100 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-sand-700">
        {taux}
      </span>
      <span className="text-[13px] leading-5 text-ink-600">{children}</span>
    </li>
  )
}

function PitfallLine({ color, children }: { color: string; children: ReactNode }) {
  return (
    <li className="flex items-start gap-2.5">
      <span className="mt-[7px] size-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
      <span className="text-[13px] leading-5 text-ink-600">{children}</span>
    </li>
  )
}

interface GuideCard {
  value: string
  title: string
  content: ReactNode
}

const CARDS: GuideCard[] = [
  {
    value: 'tec',
    title: 'Les 4 catégories du TEC CEMAC',
    content: (
      <div className="grid gap-3">
        <ul className="grid gap-2.5">
          <RateLine taux="5 %">Biens essentiels : médicaments, engrais, livres</RateLine>
          <RateLine taux="10 %">Intrants &amp; équipements : riz, équipements solaires, machines</RateLine>
          <RateLine taux="15 %">Biens intermédiaires : pièces détachées, produits intermédiaires</RateLine>
          <RateLine taux="20 %">Biens de consommation : électronique grand public, textile fini</RateLine>
        </ul>
        <p className="rounded-lg bg-subtle px-3 py-2 text-xs leading-4 text-ink-600">
          Vérifier la position tarifaire exacte (SH10) auprès de votre transitaire agréé
        </p>
      </div>
    ),
  },
  {
    value: 'taxes',
    title: 'Les taxes additionnelles du Tchad',
    content: (
      <ul className="grid gap-2.5">
        <RateLine taux="1 %">TIC — taxe d'intégration communautaire (CEMAC), base CAF</RateLine>
        <RateLine taux="2 %">Frais de statistiques, base CAF</RateLine>
        <RateLine taux="4 %">Acompte sur (CAF + droits) — avance récupérable sur l'impôt</RateLine>
        <RateLine taux="18 %">TVA — exonérations : riz, blé, lait, médicaments, engrais</RateLine>
        <RateLine taux="5–30 %">Accises — alcools, tabacs, produits spécifiques</RateLine>
      </ul>
    ),
  },
  {
    value: 'pieges',
    title: 'Les pièges du corridor',
    content: (
      <ul className="grid gap-2.5">
        <PitfallLine color="#DC2626">
          <strong className="font-semibold text-ink-900">BESC absent</strong> = amende de 100 % de la CAF
        </PitfallLine>
        <PitfallLine color="#DC2626">
          <strong className="font-semibold text-ink-900">T1 &gt; 7 jours</strong> = acquit-à-caution perdu
        </PitfallLine>
        <PitfallLine color="#EA580C">
          <strong className="font-semibold text-ink-900">Phyto oublié</strong> = immobilisation au port
          (surestaries ~45 000 FCFA/jour)
        </PitfallLine>
        <PitfallLine color="#2563EB">
          <strong className="font-semibold text-ink-900">Astuce</strong> : grouper les demandes de BESC
          par fournisseur
        </PitfallLine>
      </ul>
    ),
  },
]

export default function GuideTaux() {
  return (
    <section aria-label="Guide des taux">
      <div className="grid gap-4 lg:grid-cols-3">
        {CARDS.map((card, i) => (
          <motion.div
            key={card.value}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.4, delay: i * 0.1, ease: EASE_OUT_EXPO }}
            className="rounded-xl bg-white px-5 py-2 shadow-card"
          >
            <Accordion type="single" collapsible defaultValue={i === 0 ? card.value : undefined}>
              <AccordionItem value={card.value} className="border-b-0">
                <AccordionTrigger className="py-4 hover:no-underline">
                  <span className="font-h3 text-left text-ink-900">{card.title}</span>
                </AccordionTrigger>
                <AccordionContent className="pb-5">{card.content}</AccordionContent>
              </AccordionItem>
            </Accordion>
          </motion.div>
        ))}
      </div>
    </section>
  )
}
