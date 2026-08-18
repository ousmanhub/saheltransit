// TransitaireDrawer — drawer « Contacter le transitaire » (design/calendar.md §Drawer)
// Fiche Sahel Transit SARL — Douala, boutons tel:/Mail, modèle de message
// pré-rempli, copie presse-papiers avec morph Copy → Check.

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { toast } from 'sonner'
import { Building2, Check, Copy, Mail, Phone, User } from 'lucide-react'
import { format } from 'date-fns'
import type { Alert } from '@/lib/types'
import { useStore } from '@/lib/store'
import RightDrawer from '@/components/documents/RightDrawer'
import { Textarea } from '@/components/ui/textarea'

interface TransitaireDrawerProps {
  alert: Alert | null
  open: boolean
  onClose: () => void
}

/** Message pré-rempli selon l'alerte / le container */
function buildMessage(alert: Alert | null, container: ReturnType<ReturnType<typeof useStore>['getContainer']>): string {
  if (!alert) return ''
  if (container?.t1) {
    const emission = format(new Date(container.t1.emission), 'dd/MM')
    const limite = format(new Date(container.t1.limite), 'dd/MM')
    return `Bonjour, le T1 du container ${container.numero} (émis le ${emission}) expire le ${limite}. Merci de confirmer la position du camion et la date de franchissement de Kousséri.`
  }
  if (container) {
    return `Bonjour, pouvez-vous me donner un point d'avancement sur le dossier du container ${container.numero} ? Merci.`
  }
  return 'Bonjour, pouvez-vous me donner un point sur mes dossiers en cours ? Merci.'
}

export default function TransitaireDrawer({ alert, open, onClose }: TransitaireDrawerProps) {
  const { getContainer } = useStore()
  const container = alert?.containerId ? getContainer(alert.containerId) : undefined

  // Brouillon du message + état « copié », réinitialisés au changement d'alerte
  // (ajustement d'état pendant le rendu — pattern React officiel)
  const [draft, setDraft] = useState<{ key: string; message: string; copied: boolean }>({
    key: '',
    message: '',
    copied: false,
  })
  const draftKey = alert ? `${alert.id}:${container?.t1?.emission ?? ''}` : ''
  if (draft.key !== draftKey) {
    setDraft({ key: draftKey, message: buildMessage(alert, container), copied: false })
  }
  const message = draft.message
  const copied = draft.copied
  const setMessage = (value: string) => setDraft((d) => ({ ...d, message: value }))
  const setCopied = (value: boolean) => setDraft((d) => ({ ...d, copied: value }))

  const copier = async () => {
    try {
      await navigator.clipboard.writeText(message)
    } catch {
      // Fallback si l'API presse-papiers est indisponible
      const ta = document.createElement('textarea')
      ta.value = message
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
    setCopied(true)
    toast.success('Copié')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <RightDrawer
      open={open}
      onClose={onClose}
      title="Contacter le transitaire"
      subtitle={container ? `Dossier ${container.numero}` : undefined}
      footer={
        <button
          type="button"
          onClick={copier}
          className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-sand-500 text-sm font-semibold text-white transition-colors hover:bg-sand-600"
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={copied ? 'check' : 'copy'}
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.6, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex"
            >
              {copied ? <Check size={16} strokeWidth={2} /> : <Copy size={16} strokeWidth={1.75} />}
            </motion.span>
          </AnimatePresence>
          {copied ? 'Message copié' : 'Copier le message'}
        </button>
      }
    >
      <div className="space-y-6">
        {/* Fiche transitaire */}
        <div className="rounded-xl border border-border p-4">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-lg bg-navy-950">
              <Building2 size={18} strokeWidth={1.75} className="text-sand-500" />
            </span>
            <div>
              <p className="text-sm font-semibold text-ink-900">Sahel Transit SARL — Douala</p>
              <p className="text-xs text-ink-400">Transitaire agréé en douane · corridor Douala → N’Djamena</p>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2.5 border-t border-border pt-3">
            <span className="flex size-8 items-center justify-center rounded-full bg-subtle">
              <User size={14} strokeWidth={1.75} className="text-ink-600" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-ink-900">Alain Mbarga</p>
              <p className="font-mono text-xs text-ink-600">+237 6 99 00 00 00</p>
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <a
              href="tel:+237699000000"
              className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-border text-[13px] font-semibold text-ink-900 transition-colors hover:bg-subtle"
            >
              <Phone size={15} strokeWidth={1.75} />
              Appeler
            </a>
            <a
              href={`mailto:operations@saheltransit.cm?subject=${encodeURIComponent(
                container ? `Dossier ${container.numero}` : 'Suivi de dossiers',
              )}&body=${encodeURIComponent(message)}`}
              className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-border text-[13px] font-semibold text-ink-900 transition-colors hover:bg-subtle"
            >
              <Mail size={15} strokeWidth={1.75} />
              Écrire
            </a>
          </div>
        </div>

        {/* Contexte T1 */}
        {container?.t1 && (
          <div className="rounded-xl bg-[#FEF2F2] p-4">
            <p className="text-[13px] font-semibold text-[#B91C1C]">Échéance T1 en cours</p>
            <p className="mt-1 text-[13px] leading-[18px] text-[#7F1D1D]">
              Émis le {format(new Date(container.t1.emission), 'dd/MM')} — sortie du Cameroun obligatoire avant le{' '}
              {format(new Date(container.t1.limite), 'dd/MM')}. Dépassement = acquit-à-caution perdu (450 000 FCFA) et
              immobilisation du container.
            </p>
          </div>
        )}

        {/* Modèle de message */}
        <div>
          <label htmlFor="msg-transitaire" className="text-overline mb-2 block text-ink-400">
            Modèle de message
          </label>
          <Textarea
            id="msg-transitaire"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={5}
            className="text-[13px] leading-relaxed"
          />
          <p className="mt-1 text-xs text-ink-400">
            Le message est pré-rempli avec les dates du T1 — ajustez-le avant envoi.
          </p>
        </div>
      </div>
    </RightDrawer>
  )
}
