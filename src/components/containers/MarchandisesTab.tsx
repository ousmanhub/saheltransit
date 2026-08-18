// Onglet Marchandises — fiche container (container-detail.md §4a).
// Tableau articles + totaux FOB/Fret/Assurance/CAF live + drawer d'ajout d'article.

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import type { Container } from '@/lib/types'
import { TEC_RATES } from '@/lib/customs'
import { formatFCFA, formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'
import EmptyState from '@/components/EmptyState'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { flashAndReload, patchStoredContainer } from './storagePatch'
import type { CostOverlay } from './overlays'
import AnimatedAmount from './AnimatedAmount'
import { EASE_OUT_EXPO } from './utils'

// ─── Champ montant éditable inline ───────────────────────────────────────────

function EditableAmount({
  label,
  value,
  onCommit,
}: {
  label: string
  value: number
  onCommit: (v: number) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')

  const commit = () => {
    const n = Number(draft.replace(/\s/g, '').replace(',', '.'))
    if (Number.isFinite(n) && n >= 0) onCommit(Math.round(n))
    setEditing(false)
  }

  return (
    <span className="inline-flex items-center gap-1">
      <span className="text-ink-600">{label} :</span>
      {editing ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit()
            if (e.key === 'Escape') setEditing(false)
          }}
          className="h-7 w-28 rounded-md border border-sand-500 bg-white px-2 font-mono text-[13px] text-ink-900 focus:outline-none"
          aria-label={`Modifier ${label.toLowerCase()}`}
        />
      ) : (
        <>
          <span className="font-mono text-[13px] font-medium text-ink-900">{formatNumber(value)}</span>
          <button
            type="button"
            onClick={() => {
              setDraft(String(value))
              setEditing(true)
            }}
            className="flex size-5 items-center justify-center rounded text-ink-400 hover:bg-white hover:text-sand-600"
            aria-label={`Modifier ${label.toLowerCase()}`}
          >
            <Pencil size={11} />
          </button>
        </>
      )}
    </span>
  )
}

// ─── Onglet ──────────────────────────────────────────────────────────────────

interface MarchandisesTabProps {
  c: Container
  costs: CostOverlay
  onCostsChange: (next: CostOverlay) => void
}

export default function MarchandisesTab({ c, costs, onCostsChange }: MarchandisesTabProps) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [nom, setNom] = useState('')
  const [qte, setQte] = useState('')
  const [prix, setPrix] = useState('')
  const [tec, setTec] = useState('0.10')
  const [erreur, setErreur] = useState<string | null>(null)

  const fob = c.articles.reduce((sum, a) => sum + a.valeur, 0)
  const caf = fob + costs.fret + costs.assurance

  const addArticle = (e: React.FormEvent) => {
    e.preventDefault()
    const quantite = Number(qte.replace(/\s/g, ''))
    const unitaire = Number(prix.replace(/\s/g, '').replace(',', '.'))
    if (!nom.trim() || !Number.isFinite(quantite) || quantite <= 0 || !Number.isFinite(unitaire) || unitaire <= 0) {
      setErreur('Désignation, quantité et valeur unitaire sont obligatoires.')
      return
    }
    const article = {
      id: `art-${Date.now().toString(36)}`,
      nom: nom.trim(),
      quantite: Math.round(quantite),
      valeur: Math.round(quantite * unitaire),
      categorie: `TEC ${Math.round(Number(tec) * 100)} %`,
    }
    patchStoredContainer(c.id, (x) => ({ ...x, articles: [...x.articles, article] }))
    flashAndReload({ type: 'success', message: `Article ajouté — ${article.nom}` })
  }

  const removeArticle = (articleId: string) => {
    const article = c.articles.find((a) => a.id === articleId)
    if (!article) return
    patchStoredContainer(c.id, (x) => ({ ...x, articles: x.articles.filter((a) => a.id !== articleId) }))
    flashAndReload({
      type: 'success',
      message: `Article supprimé — ${article.nom}`,
      undo: { kind: 'restore-article', containerId: c.id, article },
    })
  }

  if (c.articles.length === 0) {
    return (
      <div>
        <EmptyState
          title="Aucun article pour l'instant"
          description="Ajoutez les marchandises du dossier pour calculer la valeur FOB et estimer les droits de douane."
          action={
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-sand-500 px-4 text-sm font-semibold text-white hover:bg-sand-600"
            >
              <Plus size={16} />
              Ajouter un article
            </button>
          }
        />
        <ArticleDrawer
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
          nom={nom}
          setNom={setNom}
          qte={qte}
          setQte={setQte}
          prix={prix}
          setPrix={setPrix}
          tec={tec}
          setTec={setTec}
          erreur={erreur}
          onSubmit={addArticle}
        />
      </div>
    )
  }

  return (
    <div>
      <table className="w-full">
        <thead>
          <tr className="bg-subtle">
            <th className="text-overline rounded-tl-lg px-4 py-2.5 text-left text-ink-400">Article</th>
            <th className="text-overline px-3 py-2.5 text-right text-ink-400">Qté</th>
            <th className="text-overline px-3 py-2.5 text-right text-ink-400">Valeur unitaire</th>
            <th className="text-overline px-3 py-2.5 text-right text-ink-400">Valeur totale</th>
            <th className="text-overline px-3 py-2.5 text-left text-ink-400">Catégorie</th>
            <th className="w-10 rounded-tr-lg px-3 py-2.5" />
          </tr>
        </thead>
        <tbody>
          {c.articles.map((a, i) => (
            <motion.tr
              key={a.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: i * 0.05, ease: EASE_OUT_EXPO }}
              className="group border-t border-border"
            >
              <td className="px-4 py-3 text-sm font-medium text-ink-900">{a.nom}</td>
              <td className="px-3 py-3 text-right font-mono text-[13px] text-ink-600">{formatNumber(a.quantite)}</td>
              <td className="px-3 py-3 text-right font-mono text-[13px] text-ink-600">
                {formatNumber(Math.round(a.valeur / Math.max(a.quantite, 1)))}
              </td>
              <td className="px-3 py-3 text-right font-mono text-[13px] font-semibold text-ink-900">
                {formatNumber(a.valeur)}
              </td>
              <td className="px-3 py-3">
                <span className="inline-flex items-center rounded-full bg-sand-100 px-2 py-0.5 text-[11px] font-semibold text-sand-700">
                  {a.categorie}
                </span>
              </td>
              <td className="px-3 py-3 text-right">
                <button
                  type="button"
                  onClick={() => removeArticle(a.id)}
                  className="inline-flex size-7 items-center justify-center rounded-md text-ink-400 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-[#FFF1F2] hover:text-[#E11D48]"
                  aria-label={`Supprimer ${a.nom}`}
                >
                  <Trash2 size={14} />
                </button>
              </td>
            </motion.tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-border bg-subtle">
            <td colSpan={6} className="rounded-b-lg px-4 py-3">
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px]">
                <span className="inline-flex items-center gap-1">
                  <span className="text-ink-600">Valeur FOB :</span>
                  <span className="font-mono text-[13px] font-medium text-ink-900">{formatNumber(fob)}</span>
                </span>
                <EditableAmount label="Fret" value={costs.fret} onCommit={(fret) => onCostsChange({ ...costs, fret })} />
                <EditableAmount
                  label="Assurance"
                  value={costs.assurance}
                  onCommit={(assurance) => onCostsChange({ ...costs, assurance })}
                />
                <motion.span
                  key={caf}
                  initial={{ backgroundColor: '#FDF1DC' }}
                  animate={{ backgroundColor: 'rgba(253,241,220,0)' }}
                  transition={{ duration: 0.8 }}
                  className="ml-auto inline-flex items-center gap-1.5 rounded-md px-2 py-1"
                >
                  <span className="text-[13px] font-semibold text-ink-900">Valeur CAF :</span>
                  <AnimatedAmount
                    value={caf}
                    format={formatFCFA}
                    duration={400}
                    className="font-mono text-sm font-bold text-ink-900"
                  />
                </motion.span>
              </div>
            </td>
          </tr>
        </tfoot>
      </table>

      <div className="mt-4">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-white px-3.5 text-[13px] font-semibold text-ink-600 transition-colors hover:border-sand-500 hover:text-sand-700"
        >
          <Plus size={15} />
          Ajouter un article
        </button>
      </div>

      <ArticleDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        nom={nom}
        setNom={setNom}
        qte={qte}
        setQte={setQte}
        prix={prix}
        setPrix={setPrix}
        tec={tec}
        setTec={setTec}
        erreur={erreur}
        onSubmit={addArticle}
      />
    </div>
  )
}

// ─── Drawer d'ajout ──────────────────────────────────────────────────────────

interface ArticleDrawerProps {
  open: boolean
  onOpenChange: (o: boolean) => void
  nom: string
  setNom: (v: string) => void
  qte: string
  setQte: (v: string) => void
  prix: string
  setPrix: (v: string) => void
  tec: string
  setTec: (v: string) => void
  erreur: string | null
  onSubmit: (e: React.FormEvent) => void
}

function ArticleDrawer({ open, onOpenChange, nom, setNom, qte, setQte, prix, setPrix, tec, setTec, erreur, onSubmit }: ArticleDrawerProps) {
  return (
    <Drawer direction="right" open={open} onOpenChange={onOpenChange}>
      <DrawerContent className={cn('sm:max-w-md')}>
        <DrawerHeader>
          <DrawerTitle className="font-h3">Ajouter un article</DrawerTitle>
          <DrawerDescription>La valeur totale est calculée : quantité × valeur unitaire.</DrawerDescription>
        </DrawerHeader>
        <form onSubmit={onSubmit} className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 pb-4">
          <div className="grid gap-1.5">
            <Label htmlFor="art-nom">Désignation *</Label>
            <Input id="art-nom" value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Panneaux solaires 550 W…" autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="art-qte">Quantité *</Label>
              <Input id="art-qte" inputMode="numeric" value={qte} onChange={(e) => setQte(e.target.value)} placeholder="320" className="font-mono" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="art-prix">Valeur unitaire (FCFA) *</Label>
              <Input id="art-prix" inputMode="numeric" value={prix} onChange={(e) => setPrix(e.target.value)} placeholder="30 000" className="font-mono" />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label>Catégorie tarifaire</Label>
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
            <p className="text-xs text-ink-400">Vérifiez le tarif CEMAC auprès de votre transitaire.</p>
          </div>
          {erreur && <p className="text-[13px] font-medium text-[#E11D48]">{erreur}</p>}
          <DrawerFooter className="mt-auto px-0">
            <Button type="submit" className="bg-sand-500 text-white hover:bg-sand-600">
              Ajouter l'article
            </Button>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
          </DrawerFooter>
        </form>
      </DrawerContent>
    </Drawer>
  )
}
