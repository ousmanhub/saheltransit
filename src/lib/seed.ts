// Données de démonstration SahelTransit (design.md §6)
// Toutes les dates sont calculées relativement à la date de chargement réelle
// pour que les alertes restent vivantes.

import { addDays, addHours, setHours, setMinutes } from 'date-fns'
import type {
  ActivityEntry,
  Alert,
  CalendarEvent,
  Container,
  DocStatus,
  DocumentItem,
  DocTypeName,
} from './types'
import { DOC_TYPES } from './types'

const iso = (d: Date) => d.toISOString()

function docs(
  containerId: string,
  now: Date,
  states: Array<DocStatus | [DocStatus, { bloquant?: boolean }]>,
): DocumentItem[] {
  return DOC_TYPES.map((nom, i) => {
    const entry = states[i]
    const statut: DocStatus = Array.isArray(entry) ? entry[0] : entry
    const bloquant = Array.isArray(entry) ? entry[1].bloquant : undefined
    return {
      id: `${containerId}-doc-${i}`,
      nom: nom as DocTypeName,
      statut,
      bloquant,
      updatedAt: iso(addDays(now, -(1 + ((i * 3) % 9)))),
    }
  })
}

export function buildSeedState(now: Date = new Date()) {
  const at = (dayOffset: number, h = 12, m = 0) =>
    iso(setMinutes(setHours(addDays(now, dayOffset), h), m))

  // ─── Containers (design.md §6.1) ───────────────────────────────────────────
  const containers: Container[] = [
    {
      id: 'msku-847-291-5',
      numero: 'MSKU 847 291-5',
      contenu: 'Panneaux solaires 550 W + onduleurs hybrides',
      fournisseur: 'Tropic Solar Ltd',
      origine: 'Shenzhen',
      destination: "N'Djamena",
      compagnie: 'CMA CGM · navire NABUCCO voy. 0TX7SE1MA',
      statut: 'mer',
      valeurCaf: 18_560_000,
      tec: 0.1,
      tvaExoneree: false,
      embarquement: at(-13, 9),
      eta: at(24, 8),
      createdAt: at(-30, 10),
      articles: [
        { id: 'msku-a1', nom: 'Panneaux solaires 550 W monocristallins', quantite: 320, valeur: 9_600_000, categorie: 'TEC 10 % (machines/équipements)' },
        { id: 'msku-a2', nom: 'Onduleurs hybrides 5 kVA', quantite: 40, valeur: 4_800_000, categorie: 'TEC 10 %' },
        { id: 'msku-a3', nom: 'Régulateurs MPPT 60 A', quantite: 60, valeur: 1_000_000, categorie: 'TEC 10 %' },
      ],
      documents: docs('msku-847-291-5', now, [
        'valide', 'valide', 'recu', 'valide', 'valide', 'valide', 'valide',
        'demande', 'manquant', 'manquant', 'valide', 'non_requis', 'manquant',
      ]),
    },
    {
      id: 'beau-231-774-0',
      numero: 'BEAU 231 774-0',
      contenu: 'Batteries lithium GSL 48 V + accessoires',
      fournisseur: 'GSL Energy',
      origine: 'Dubaï',
      destination: "N'Djamena",
      compagnie: 'MSC · routier Transcam Express',
      statut: 'transit',
      valeurCaf: 12_300_000,
      tec: 0.1,
      tvaExoneree: false,
      t1: { emission: at(-5, 14), limite: at(2, 23, 59) },
      localisation: 'Ngaoundéré',
      balise: 'NEXUS NEX-4471',
      createdAt: at(-24, 11),
      articles: [
        { id: 'beau-a1', nom: 'Batteries lithium GSL 48 V', quantite: 240, valeur: 9_800_000, categorie: 'TEC 10 %' },
        { id: 'beau-a2', nom: 'Accessoires et câblage (lot)', quantite: 1, valeur: 2_500_000, categorie: 'TEC 10 %' },
      ],
      documents: docs('beau-231-774-0', now, [
        'valide', 'valide', 'valide', 'valide', 'valide', 'valide', 'valide',
        'recu', 'valide', 'valide', 'demande', 'non_requis', 'manquant',
      ]),
    },
    {
      id: 'tclu-552-908-3',
      numero: 'TCLU 552 908-3',
      contenu: 'Riz parfumé 25 kg — 640 sacs',
      fournisseur: 'Siam Grain Co.',
      origine: 'Bangkok',
      destination: "N'Djamena",
      compagnie: 'Maersk',
      statut: 'douala',
      valeurCaf: 8_700_000,
      tec: 0.1,
      tvaExoneree: true,
      arrivee: at(-3, 6),
      createdAt: at(-28, 15),
      articles: [
        { id: 'tclu-a1', nom: 'Riz parfumé (sacs de 25 kg)', quantite: 640, valeur: 8_700_000, categorie: 'TEC 10 % — TVA exonérée' },
      ],
      documents: docs('tclu-552-908-3', now, [
        'valide', 'valide', 'valide', 'valide', 'valide', 'valide', 'valide',
        'recu', ['manquant', { bloquant: true }], 'valide', 'valide',
        ['manquant', { bloquant: true }], 'demande',
      ]),
    },
    {
      id: 'fciu-901-445-2',
      numero: 'FCIU 901 445-2',
      contenu: 'Électronique grand public (TV 43″, smartphones)',
      fournisseur: 'Pearl River Trading',
      origine: 'Guangzhou',
      destination: "N'Djamena",
      compagnie: 'CMA CGM · transitaire Sahel Transit SARL',
      statut: 'dedouanement',
      valeurCaf: 21_800_000,
      tec: 0.2,
      tvaExoneree: false,
      arrivee: at(-6, 7),
      localisation: 'Bureau Nguéli',
      createdAt: at(-26, 9),
      articles: [
        { id: 'fciu-a1', nom: 'Téléviseurs 43″ LED', quantite: 180, valeur: 12_600_000, categorie: 'TEC 20 %' },
        { id: 'fciu-a2', nom: 'Smartphones Android', quantite: 400, valeur: 9_200_000, categorie: 'TEC 20 %' },
      ],
      documents: docs('fciu-901-445-2', now, [
        'valide', 'valide', 'valide', 'valide', 'valide', 'valide', 'valide',
        'recu', 'valide', 'valide', 'valide', 'non_requis', 'demande',
      ]),
    },
    {
      id: 'tghu-663-210-9',
      numero: 'TGHU 663 210-9',
      contenu: 'Groupes électrogènes diesel 20–60 kVA',
      fournisseur: 'PowerMax FZE',
      origine: 'Dubaï',
      destination: "N'Djamena",
      compagnie: '(à confirmer)',
      statut: 'preparation',
      valeurCaf: 15_100_000,
      tec: 0.1,
      tvaExoneree: false,
      embarquement: at(11, 10),
      createdAt: at(-10, 11, 3),
      articles: [
        { id: 'tghu-a1', nom: 'Groupes électrogènes diesel 20 kVA', quantite: 15, valeur: 6_900_000, categorie: 'TEC 10 %' },
        { id: 'tghu-a2', nom: 'Groupes électrogènes diesel 60 kVA', quantite: 10, valeur: 8_200_000, categorie: 'TEC 10 %' },
      ],
      documents: docs('tghu-663-210-9', now, [
        ['manquant', { bloquant: true }], ['manquant', { bloquant: true }],
        'manquant', 'valide', 'recu', 'valide', 'demande', 'manquant',
        'manquant', 'manquant', 'valide', 'non_requis', 'manquant',
      ]),
    },
    {
      id: 'whsu-340-556-1',
      numero: 'WHSU 340 556-1',
      contenu: 'Médicaments génériques + matériel médical',
      fournisseur: 'MedSource',
      origine: 'Bombay',
      destination: "N'Djamena",
      compagnie: 'Air France Cargo → routier',
      statut: 'frontiere',
      valeurCaf: 9_900_000,
      tec: 0.05,
      tvaExoneree: true,
      arrivee: at(-1, 16),
      localisation: 'Nguéli',
      createdAt: at(-22, 14),
      articles: [
        { id: 'whsu-a1', nom: 'Médicaments génériques (cartons)', quantite: 850, valeur: 7_400_000, categorie: 'TEC 5 % — TVA exonérée' },
        { id: 'whsu-a2', nom: 'Matériel médical', quantite: 60, valeur: 2_500_000, categorie: 'TEC 5 % — TVA exonérée' },
      ],
      documents: docs('whsu-340-556-1', now, [
        'valide', 'valide', 'valide', 'valide', 'valide', 'valide', 'valide',
        'demande', 'manquant', 'recu', 'valide', 'valide', 'manquant',
      ]),
    },
    {
      id: 'csnu-118-302-7',
      numero: 'CSNU 118 302-7',
      contenu: 'Câbles solaires, connecteurs MC4, structures',
      fournisseur: 'Tropic Solar Ltd',
      origine: 'Shenzhen',
      destination: "N'Djamena",
      compagnie: 'CMA CGM',
      statut: 'livre',
      valeurCaf: 6_200_000,
      tec: 0.1,
      tvaExoneree: false,
      livraison: at(-17, 16, 40),
      createdAt: at(-45, 9),
      articles: [
        { id: 'csnu-a1', nom: 'Câbles solaires 6 mm² (tourets)', quantite: 120, valeur: 2_900_000, categorie: 'TEC 10 %' },
        { id: 'csnu-a2', nom: 'Connecteurs MC4 (boîtes)', quantite: 80, valeur: 1_100_000, categorie: 'TEC 10 %' },
        { id: 'csnu-a3', nom: 'Structures de fixation aluminium', quantite: 40, valeur: 2_200_000, categorie: 'TEC 10 %' },
      ],
      documents: docs('csnu-118-302-7', now, Array(13).fill('valide')),
    },
  ]

  // ─── Alertes seed (design.md §6.4) ─────────────────────────────────────────
  const alerts: Alert[] = [
    {
      id: 'auto-t1-beau-231-774-0',
      severite: 'critique',
      titre: 'T1 expire dans 2 jours',
      description:
        'Émis le 20 janv. : sortie du Cameroun obligatoire avant le 27 janv., sinon acquit-à-caution perdu.',
      containerId: 'beau-231-774-0',
      actionLabel: 'Contacter le transitaire',
      createdAt: iso(addHours(now, -3)),
      lue: false,
      source: 'auto',
    },
    {
      id: 'auto-besc-tghu-663-210-9',
      severite: 'critique',
      titre: 'BESC non validé avant embarquement',
      description:
        'Embarquement prévu le 5 févr. : BESC Cameroun + Tchad à obtenir au départ. Amende = 100 % de la valeur si absent.',
      containerId: 'tghu-663-210-9',
      actionLabel: 'Demander le BESC',
      createdAt: iso(addDays(now, -1)),
      lue: false,
      source: 'auto',
    },
    {
      id: 'auto-doc-tclu-552-908-3',
      severite: 'importante',
      titre: 'Certificat phytosanitaire manquant',
      description: "Bloque l'émission du T1 et la sortie du port de Douala.",
      containerId: 'tclu-552-908-3',
      actionLabel: 'Voir la checklist',
      createdAt: iso(addDays(now, -2)),
      lue: false,
      source: 'auto',
    },
    {
      id: 'seed-eta-msku-847-291-5',
      severite: 'info',
      titre: 'ETA Douala : 18 février',
      description: 'Anticiper le manifeste et la déclaration en détail.',
      containerId: 'msku-847-291-5',
      createdAt: iso(addDays(now, -2)),
      lue: false,
      source: 'seed',
    },
    {
      id: 'seed-fciu-complet',
      severite: 'positive',
      titre: 'Dossier FCIU complet à 92 %',
      description: 'Quittance à payer pour obtenir la mainlevée.',
      containerId: 'fciu-901-445-2',
      actionLabel: 'Calculer les droits',
      createdAt: iso(addDays(now, -2)),
      lue: false,
      source: 'seed',
    },
  ]

  // ─── Événements calendrier seed (design.md §6.5) ───────────────────────────
  const events: CalendarEvent[] = [
    { id: 'evt-t1-beau', date: at(2, 23, 59), type: 't1', libelle: 'Date limite T1 — sortie du Cameroun', containerId: 'beau-231-774-0' },
    { id: 'evt-sortie-tclu', date: at(4, 9), type: 'transit', libelle: 'Sortie du port de Douala prévue', containerId: 'tclu-552-908-3' },
    { id: 'evt-rdv-fciu', date: at(5, 10), type: 'rdv', libelle: 'Rendez-vous transitaire Sahel Transit SARL', containerId: 'fciu-901-445-2' },
    { id: 'evt-embarquement-tghu', date: at(11, 8), type: 'embarquement', libelle: 'Embarquement prévu Port de Jebel Ali', containerId: 'tghu-663-210-9' },
    { id: 'evt-eta-msku', date: at(24, 8), type: 'eta', libelle: 'Arrivée estimée Port de Douala', containerId: 'msku-847-291-5' },
    { id: 'evt-livraison-csnu', date: at(-17, 16, 40), type: 'livraison', libelle: "Livré entrepôt N'Djamena", containerId: 'csnu-118-302-7' },
  ]

  // ─── Journal d'activité seed (dashboard §6) ────────────────────────────────
  const activity: ActivityEntry[] = [
    { id: 'act-1', type: 'doc', message: 'Quittance demandée — FCIU 901 445-2', containerId: 'fciu-901-445-2', createdAt: at(0, 9, 41), couleur: '#059669' },
    { id: 'act-2', type: 'statut', message: 'Statut passé à Frontière Nguéli — WHSU 340 556-1', containerId: 'whsu-340-556-1', createdAt: at(-1, 17, 2), couleur: '#8B5CF6' },
    { id: 'act-3', type: 'alerte', message: 'Alerte T1 créée — BEAU 231 774-0', containerId: 'beau-231-774-0', createdAt: at(-1, 8, 15), couleur: '#DC2626' },
    { id: 'act-4', type: 'doc', message: 'B/L validé — MSKU 847 291-5', containerId: 'msku-847-291-5', createdAt: at(-2, 14, 27), couleur: '#0284C7' },
    { id: 'act-5', type: 'container', message: 'Container créé — TGHU 663 210-9', containerId: 'tghu-663-210-9', createdAt: at(-10, 11, 3), couleur: '#0F2437' },
    { id: 'act-6', type: 'livraison', message: 'Livraison confirmée — CSNU 118 302-7', containerId: 'csnu-118-302-7', createdAt: at(-17, 16, 40), couleur: '#15803D' },
  ]

  return { containers, alerts, events, activity }
}
