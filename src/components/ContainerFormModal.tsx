// ContainerFormModal — modale de création de container (branchée au store)
// Ouverte depuis le bouton « + Nouveau container » de la sidebar (toutes pages).

import { useState } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { useStore } from '@/lib/store'
import { TEC_RATES } from '@/lib/customs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'

interface ContainerFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function ContainerFormModal({ open, onOpenChange }: ContainerFormModalProps) {
  const { addContainer } = useStore()
  const navigate = useNavigate()

  const [numero, setNumero] = useState('')
  const [contenu, setContenu] = useState('')
  const [fournisseur, setFournisseur] = useState('')
  const [origine, setOrigine] = useState('')
  const [compagnie, setCompagnie] = useState('')
  const [valeur, setValeur] = useState('')
  const [tec, setTec] = useState<string>('0.10')
  const [tvaExoneree, setTvaExoneree] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)

  const reset = () => {
    setNumero('')
    setContenu('')
    setFournisseur('')
    setOrigine('')
    setCompagnie('')
    setValeur('')
    setTec('0.10')
    setTvaExoneree(false)
    setErreur(null)
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const caf = Number(valeur.replace(/\s/g, '').replace(',', '.'))
    if (!numero.trim() || !contenu.trim()) {
      setErreur('Le numéro de container et le contenu sont obligatoires.')
      return
    }
    if (!Number.isFinite(caf) || caf <= 0) {
      setErreur('La valeur CAF doit être un montant positif (FCFA).')
      return
    }
    const created = addContainer({
      numero: numero.trim().toUpperCase(),
      contenu: contenu.trim(),
      fournisseur: fournisseur.trim() || '—',
      origine: origine.trim() || '—',
      compagnie: compagnie.trim() || '(à confirmer)',
      valeurCaf: Math.round(caf),
      tec: Number(tec),
      tvaExoneree,
    })
    toast.success(`Container ${created.numero} créé`, {
      description: 'La checklist des 13 documents a été initialisée.',
    })
    reset()
    onOpenChange(false)
    navigate(`/containers/${created.id}`)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset()
        onOpenChange(o)
      }}
    >
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="font-h2">Nouveau container</DialogTitle>
          <DialogDescription>
            Créez un dossier d'importation — la checklist des 13 documents sera initialisée automatiquement.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="ctr-numero">Numéro de container *</Label>
              <Input
                id="ctr-numero"
                value={numero}
                onChange={(e) => setNumero(e.target.value)}
                placeholder="MSKU 000 000-0"
                className="font-mono"
                autoFocus
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="ctr-valeur">Valeur CAF (FCFA) *</Label>
              <Input
                id="ctr-valeur"
                inputMode="numeric"
                value={valeur}
                onChange={(e) => setValeur(e.target.value)}
                placeholder="18 560 000"
                className="font-mono"
              />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="ctr-contenu">Contenu (marchandises) *</Label>
            <Input
              id="ctr-contenu"
              value={contenu}
              onChange={(e) => setContenu(e.target.value)}
              placeholder="Panneaux solaires 550 W + onduleurs…"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="ctr-fournisseur">Fournisseur</Label>
              <Input id="ctr-fournisseur" value={fournisseur} onChange={(e) => setFournisseur(e.target.value)} placeholder="Tropic Solar Ltd" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="ctr-origine">Origine</Label>
              <Input id="ctr-origine" value={origine} onChange={(e) => setOrigine(e.target.value)} placeholder="Shenzhen" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="ctr-compagnie">Compagnie / transporteur</Label>
              <Input id="ctr-compagnie" value={compagnie} onChange={(e) => setCompagnie(e.target.value)} placeholder="CMA CGM · navire…" />
            </div>
            <div className="grid gap-1.5">
              <Label>Catégorie tarifaire (TEC)</Label>
              <Select value={tec} onValueChange={setTec}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TEC_RATES.map((r) => (
                    <SelectItem key={r} value={String(r)}>
                      TEC {Math.round(r * 100)} %
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-ink-600">
            <Checkbox checked={tvaExoneree} onCheckedChange={(v) => setTvaExoneree(v === true)} />
            TVA exonérée (riz, blé, lait, médicaments, engrais)
          </label>
          {erreur && <p className="text-[13px] font-medium text-[#E11D48]">{erreur}</p>}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" className="bg-sand-500 text-white hover:bg-sand-600">
              Créer le container
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
