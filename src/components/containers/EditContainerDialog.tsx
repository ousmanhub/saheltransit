// Modale « Modifier le dossier » — édition des champs du container.
// Écrit dans l'état persisté puis recharge (le store n'expose pas d'action d'édition).

import { useState } from 'react'
import type { Container } from '@/lib/types'
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
import { flashAndReload, patchStoredContainer } from './storagePatch'

interface EditContainerDialogProps {
  container: Container | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function EditContainerDialog({ container, open, onOpenChange }: EditContainerDialogProps) {
  if (!container) return null
  // key={container.id} côté parent + contenu démonté à la fermeture : état frais à chaque ouverture
  return <EditDialogInner key={container.id} container={container} open={open} onOpenChange={onOpenChange} />
}

function EditDialogInner({ container, open, onOpenChange }: { container: Container; open: boolean; onOpenChange: (o: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="font-h2">Modifier le dossier</DialogTitle>
          <DialogDescription>
            <span className="font-mono">{container.numero}</span> — les changements sont enregistrés localement.
          </DialogDescription>
        </DialogHeader>
        {/* Le formulaire vit dans le contenu de la Dialog : démonté à la fermeture,
            il est réinitialisé à chaque ouverture. */}
        <EditForm container={container} onCancel={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  )
}

function EditForm({ container, onCancel }: { container: Container; onCancel: () => void }) {
  const [contenu, setContenu] = useState(container.contenu)
  const [fournisseur, setFournisseur] = useState(container.fournisseur)
  const [origine, setOrigine] = useState(container.origine)
  const [compagnie, setCompagnie] = useState(container.compagnie)
  const [valeur, setValeur] = useState(String(container.valeurCaf))
  const [tec, setTec] = useState(String(container.tec))
  const [tvaExoneree, setTvaExoneree] = useState(container.tvaExoneree)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const caf = Number(valeur.replace(/\s/g, '').replace(',', '.'))
    const c = container
    patchStoredContainer(c.id, (x) => ({
      ...x,
      contenu: contenu.trim() || x.contenu,
      fournisseur: fournisseur.trim() || x.fournisseur,
      origine: origine.trim() || x.origine,
      compagnie: compagnie.trim() || x.compagnie,
      valeurCaf: Number.isFinite(caf) && caf > 0 ? Math.round(caf) : x.valeurCaf,
      tec: Number(tec),
      tvaExoneree,
    }))
    flashAndReload({ type: 'success', message: `Dossier ${c.numero} mis à jour` })
  }

  return (
        <form onSubmit={submit} className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="edit-contenu">Contenu (marchandises)</Label>
            <Input id="edit-contenu" value={contenu} onChange={(e) => setContenu(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="edit-fournisseur">Fournisseur</Label>
              <Input id="edit-fournisseur" value={fournisseur} onChange={(e) => setFournisseur(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="edit-origine">Origine</Label>
              <Input id="edit-origine" value={origine} onChange={(e) => setOrigine(e.target.value)} />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="edit-compagnie">Compagnie / transporteur</Label>
            <Input id="edit-compagnie" value={compagnie} onChange={(e) => setCompagnie(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="edit-valeur">Valeur CAF (FCFA)</Label>
              <Input id="edit-valeur" inputMode="numeric" value={valeur} onChange={(e) => setValeur(e.target.value)} className="font-mono" />
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
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onCancel}>
              Annuler
            </Button>
            <Button type="submit" className="bg-sand-500 text-white hover:bg-sand-600">
              Enregistrer
            </Button>
          </DialogFooter>
        </form>
  )
}
