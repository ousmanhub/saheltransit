// Onglet Journal — timeline exhaustive du dossier (container-detail.md §4d).

import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import type { ActivityEntry, Container } from '@/lib/types'
import { useStore } from '@/lib/store'
import { activityTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import EmptyState from '@/components/EmptyState'
import { EASE_OUT_EXPO } from './utils'

type JournalFilter = 'tout' | 'statuts' | 'documents' | 'couts'

const FILTER_TYPES: Record<Exclude<JournalFilter, 'tout'>, string[]> = {
  statuts: ['statut', 'livraison'],
  documents: ['doc'],
  couts: ['paiement'],
}

const FILTER_CHIPS: { key: JournalFilter; label: string }[] = [
  { key: 'tout', label: 'Tout' },
  { key: 'statuts', label: 'Statuts' },
  { key: 'documents', label: 'Documents' },
  { key: 'couts', label: 'Coûts' },
]

export default function JournalTab({ c }: { c: Container }) {
  const { activity } = useStore()
  const [filter, setFilter] = useState<JournalFilter>('tout')

  const entries = useMemo(() => {
    const list: ActivityEntry[] = activity.filter((a) => a.containerId === c.id)
    // Entrées synthétiques dérivées du dossier
    list.push({
      id: `synth-create-${c.id}`,
      type: 'container',
      message: `Dossier créé — ${c.numero}`,
      containerId: c.id,
      createdAt: c.createdAt,
      couleur: '#0F2437',
    })
    if (c.livraison) {
      list.push({
        id: `synth-livraison-${c.id}`,
        type: 'livraison',
        message: `Livraison confirmée — ${c.numero}`,
        containerId: c.id,
        createdAt: c.livraison,
        couleur: '#15803D',
      })
    }
    if (c.t1) {
      list.push({
        id: `synth-t1-${c.id}`,
        type: 'doc',
        message: `Titre de transit T1 émis — validité 7 jours`,
        containerId: c.id,
        createdAt: c.t1.emission,
        couleur: '#D97706',
      })
    }
    // Déduplique par message + date (le seed contient déjà certaines entrées)
    const seen = new Set<string>()
    return list
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .filter((e) => {
        const key = `${e.message}|${e.createdAt}`
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
  }, [activity, c])

  const filtered = useMemo(() => {
    if (filter === 'tout') return entries
    return entries.filter((e) => FILTER_TYPES[filter].includes(e.type))
  }, [entries, filter])

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-1.5">
        {FILTER_CHIPS.map((chip) => (
          <button
            key={chip.key}
            type="button"
            onClick={() => setFilter(chip.key)}
            className={cn(
              'inline-flex h-7 items-center rounded-full px-3 text-xs font-medium transition-colors',
              filter === chip.key ? 'bg-navy-950 text-white' : 'bg-subtle text-ink-600 hover:bg-[#E4E8ED]',
            )}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="Aucune entrée dans le journal"
          description="Les changements de statut, documents et coûts de ce dossier apparaîtront ici."
        />
      ) : (
        <ol className="relative ml-2 border-l-2 border-border pl-6">
          {filtered.map((e, i) => (
            <motion.li
              key={e.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.25, delay: i * 0.04, ease: EASE_OUT_EXPO }}
              className="relative pb-5 last:pb-0"
            >
              <span
                className="absolute top-1 -left-[31px] size-3 rounded-full border-2 border-white"
                style={{ backgroundColor: e.couleur }}
              />
              <p className="text-sm leading-5 text-ink-900">{e.message}</p>
              <p className="mt-0.5 text-xs text-ink-400 capitalize">{activityTime(e.createdAt)}</p>
            </motion.li>
          ))}
        </ol>
      )}
    </div>
  )
}
