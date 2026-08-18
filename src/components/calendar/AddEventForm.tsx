// AddEventForm — formulaire « + Échéance » (design/calendar.md §1)
// Libellé · type (Select) · container (Select) · date · heure optionnelle.
// Utilisé dans le mini-popover de cellule vide et depuis le bouton d'en-tête.

import { useState } from 'react'
import { format } from 'date-fns'
import type { CalendarEventType, Container } from '@/lib/types'
import { EVENT_TYPE_META } from '@/lib/types'
import { EVENT_TINTS } from '@/components/calendar/calUtils'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export interface NewEventInput {
  libelle: string
  type: CalendarEventType
  containerId?: string
  /** Date ISO (jour + heure optionnelle) */
  date: string
}

interface AddEventFormProps {
  containers: Container[]
  /** Jour pré-sélectionné (clic sur une cellule) — le champ date est alors masqué */
  fixedDate?: Date
  onSubmit: (input: NewEventInput) => void
  onCancel?: () => void
}

export default function AddEventForm({ containers, fixedDate, onSubmit, onCancel }: AddEventFormProps) {
  const [libelle, setLibelle] = useState('')
  const [type, setType] = useState<CalendarEventType>('rdv')
  const [containerId, setContainerId] = useState<string>('aucun')
  const [dateStr, setDateStr] = useState(() => format(fixedDate ?? new Date(), 'yyyy-MM-dd'))
  const [timeStr, setTimeStr] = useState('')

  const submit = () => {
    const source = fixedDate ?? new Date(`${dateStr}T12:00:00`)
    if (Number.isNaN(source.getTime())) return
    const date = new Date(source)
    if (timeStr) {
      const [h, m] = timeStr.split(':').map(Number)
      date.setHours(h || 0, m || 0, 0, 0)
    } else {
      date.setHours(12, 0, 0, 0)
    }
    onSubmit({
      libelle: libelle.trim() || EVENT_TYPE_META[type].label,
      type,
      containerId: containerId === 'aucun' ? undefined : containerId,
      date: date.toISOString(),
    })
  }

  return (
    <div className="space-y-2.5">
      <div>
        <label htmlFor="evt-libelle" className="text-overline mb-1 block text-[10px] text-ink-400">
          Libellé
        </label>
        <Input
          id="evt-libelle"
          value={libelle}
          onChange={(e) => setLibelle(e.target.value)}
          placeholder="ex. Rendez-vous transitaire"
          className="h-8 text-[13px]"
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-overline mb-1 block text-[10px] text-ink-400">Type</label>
          <Select value={type} onValueChange={(v) => setType(v as CalendarEventType)}>
            <SelectTrigger className="h-8 text-[13px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(EVENT_TYPE_META) as CalendarEventType[])
                .filter((t) => t !== 't1')
                .map((t) => (
                  <SelectItem key={t} value={t} className="text-[13px]">
                    <span className="flex items-center gap-2">
                      <span className="size-2 rounded-full" style={{ backgroundColor: EVENT_TINTS[t].dot }} />
                      {EVENT_TYPE_META[t].label}
                    </span>
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-overline mb-1 block text-[10px] text-ink-400">Heure (optionnel)</label>
          <Input type="time" value={timeStr} onChange={(e) => setTimeStr(e.target.value)} className="h-8 text-[13px]" />
        </div>
      </div>
      {!fixedDate && (
        <div>
          <label className="text-overline mb-1 block text-[10px] text-ink-400">Date</label>
          <Input type="date" value={dateStr} onChange={(e) => setDateStr(e.target.value)} className="h-8 text-[13px]" lang="fr" />
        </div>
      )}
      <div>
        <label className="text-overline mb-1 block text-[10px] text-ink-400">Container</label>
        <Select value={containerId} onValueChange={setContainerId}>
          <SelectTrigger className="h-8 text-[13px]">
            <SelectValue placeholder="Aucun" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="aucun" className="text-[13px]">Aucun container</SelectItem>
            {containers.map((c) => (
              <SelectItem key={c.id} value={c.id} className="font-mono text-[12px]">
                {c.numero}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          onClick={submit}
          className="flex h-8 flex-1 items-center justify-center rounded-lg bg-sand-500 text-xs font-semibold text-white transition-colors hover:bg-sand-600"
        >
          Ajouter l’échéance
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="h-8 rounded-lg border border-border px-3 text-xs font-semibold text-ink-600 transition-colors hover:bg-subtle"
          >
            Annuler
          </button>
        )}
      </div>
    </div>
  )
}
