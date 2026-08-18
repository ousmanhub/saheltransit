// Types partagés SahelTransit — couche données (localStorage, clé saheltransit.v1)

/** Les 8 étapes du corridor Douala → N'Djamena */
export type ContainerStatus =
  | 'preparation' // 1 · En préparation
  | 'mer' // 2 · En mer
  | 'douala' // 3 · Arrivé à Douala
  | 'transit' // 4 · En transit terrestre
  | 'frontiere' // 5 · Frontière Nguéli
  | 'dedouanement' // 6 · En dédouanement
  | 'dedouane' // 7 · Dédouané
  | 'livre' // 8 · Livré

export const CONTAINER_STATUSES: ContainerStatus[] = [
  'preparation',
  'mer',
  'douala',
  'transit',
  'frontiere',
  'dedouanement',
  'dedouane',
  'livre',
]

export interface StatusMeta {
  label: string
  /** Couleur principale (texte / icône) */
  color: string
  /** Fond de badge / carré teinté */
  bg: string
  /** Dot / barre de progression */
  dot: string
  /** Nom d'icône Lucide */
  icon:
    | 'ClipboardList'
    | 'Ship'
    | 'Anchor'
    | 'Truck'
    | 'Flag'
    | 'FileSearch'
    | 'Stamp'
    | 'Warehouse'
}

export const STATUS_META: Record<ContainerStatus, StatusMeta> = {
  preparation: { label: 'En préparation', color: '#64748B', bg: '#F1F5F9', dot: '#64748B', icon: 'ClipboardList' },
  mer: { label: 'En mer', color: '#0EA5E9', bg: '#E0F2FE', dot: '#0EA5E9', icon: 'Ship' },
  douala: { label: 'Arrivé à Douala', color: '#0891B2', bg: '#CFFAFE', dot: '#0891B2', icon: 'Anchor' },
  transit: { label: 'En transit terrestre', color: '#F59E0B', bg: '#FEF3C7', dot: '#F59E0B', icon: 'Truck' },
  frontiere: { label: 'Frontière Nguéli', color: '#8B5CF6', bg: '#EDE9FE', dot: '#8B5CF6', icon: 'Flag' },
  dedouanement: { label: 'En dédouanement', color: '#F97316', bg: '#FFEDD5', dot: '#F97316', icon: 'FileSearch' },
  dedouane: { label: 'Dédouané', color: '#10B981', bg: '#D1FAE5', dot: '#10B981', icon: 'Stamp' },
  livre: { label: 'Livré', color: '#15803D', bg: '#DCFCE7', dot: '#15803D', icon: 'Warehouse' },
}

/** Les 5 statuts de la checklist documentaire */
export type DocStatus = 'manquant' | 'demande' | 'recu' | 'valide' | 'non_requis'

export interface DocStatusMeta {
  label: string
  color: string
  bg: string
  icon: 'AlertCircle' | 'Clock' | 'FileCheck' | 'CheckCircle2' | 'MinusCircle'
}

export const DOC_STATUS_META: Record<DocStatus, DocStatusMeta> = {
  manquant: { label: 'Manquant', color: '#E11D48', bg: '#FFF1F2', icon: 'AlertCircle' },
  demande: { label: 'Demandé', color: '#D97706', bg: '#FFFBEB', icon: 'Clock' },
  recu: { label: 'Reçu', color: '#0284C7', bg: '#F0F9FF', icon: 'FileCheck' },
  valide: { label: 'Validé', color: '#059669', bg: '#ECFDF5', icon: 'CheckCircle2' },
  non_requis: { label: 'Non requis', color: '#94A3B8', bg: '#F8FAFC', icon: 'MinusCircle' },
}

/** Cycle cliquable de la checklist (hors « Non requis », accessible via menu) */
export const DOC_STATUS_CYCLE: DocStatus[] = ['manquant', 'demande', 'recu', 'valide']

/** Les 13 documents types du dossier d'importation */
export const DOC_TYPES = [
  'BESC Cameroun',
  'BESC Tchad',
  'Connaissement (B/L)',
  'Facture commerciale',
  'Facture de fret',
  'Packing list',
  'Assurance cargo',
  'Manifeste de cargaison',
  'Titre de transit T1 (+ acquit-à-caution)',
  'Déclaration en détail (SYDONIA)',
  "Certificat d'origine",
  'Certificat phytosanitaire / sanitaire',
  'Quittance / bulletin de liquidation',
] as const

export type DocTypeName = (typeof DOC_TYPES)[number]

export interface DocumentItem {
  id: string
  nom: DocTypeName
  statut: DocStatus
  /** Document bloquant (règles d'alertes §7) */
  bloquant?: boolean
  /** Date ISO de dernière mise à jour */
  updatedAt: string
}

export interface Article {
  id: string
  nom: string
  quantite: number
  /** Valeur en FCFA */
  valeur: number
  /** Ex. « TEC 10 % (machines/équipements) » */
  categorie: string
}

export interface T1Info {
  /** Date ISO d'émission du titre de transit */
  emission: string
  /** Date ISO limite de sortie du Cameroun */
  limite: string
}

export interface Container {
  id: string
  /** Ex. « MSKU 847 291-5 » */
  numero: string
  /** Description du contenu (marchandises) */
  contenu: string
  fournisseur: string
  /** Ex. « Shenzhen » */
  origine: string
  destination: string
  /** Compagnie maritime / transporteur, ex. « CMA CGM · navire NABUCCO voy. 0TX7SE1MA » */
  compagnie: string
  statut: ContainerStatus
  /** Valeur CAF en FCFA */
  valeurCaf: number
  /** Taux TEC applicable (0.05 / 0.10 / 0.15 / 0.20) */
  tec: number
  tvaExoneree: boolean
  /** Dates ISO clés */
  embarquement?: string
  eta?: string
  arrivee?: string
  livraison?: string
  t1?: T1Info
  /** Localisation live, ex. « Ngaoundéré » */
  localisation?: string
  /** Balise GPS, ex. « NEXUS NEX-4471 » */
  balise?: string
  createdAt: string
  articles: Article[]
  documents: DocumentItem[]
}

export type AlertSeverity = 'critique' | 'importante' | 'info' | 'positive'

export const SEVERITY_META: Record<AlertSeverity, { label: string; color: string; bg: string }> = {
  critique: { label: 'Critique', color: '#DC2626', bg: '#FEF2F2' },
  importante: { label: 'Importante', color: '#EA580C', bg: '#FFF7ED' },
  info: { label: 'Info', color: '#2563EB', bg: '#EFF6FF' },
  positive: { label: 'Positive', color: '#059669', bg: '#ECFDF5' },
}

export interface Alert {
  id: string
  severite: AlertSeverity
  titre: string
  description: string
  containerId?: string
  actionLabel?: string
  /** Date ISO de création */
  createdAt: string
  lue: boolean
  /** « auto » = régénérée par les règles métier, « seed » = fixe */
  source: 'auto' | 'seed'
}

export type CalendarEventType = 't1' | 'transit' | 'rdv' | 'embarquement' | 'eta' | 'livraison'

export const EVENT_TYPE_META: Record<CalendarEventType, { label: string; color: string }> = {
  t1: { label: 'Échéance T1', color: '#DC2626' },
  transit: { label: 'Transit', color: '#F59E0B' },
  rdv: { label: 'Rendez-vous', color: '#2563EB' },
  embarquement: { label: 'Embarquement', color: '#0EA5E9' },
  eta: { label: 'ETA', color: '#0891B2' },
  livraison: { label: 'Livraison', color: '#15803D' },
}

export interface CalendarEvent {
  id: string
  /** Date ISO */
  date: string
  type: CalendarEventType
  libelle: string
  containerId?: string
}

export type ActivityType = 'doc' | 'statut' | 'alerte' | 'container' | 'livraison' | 'paiement'

export interface ActivityEntry {
  id: string
  type: ActivityType
  message: string
  containerId?: string
  /** Date ISO */
  createdAt: string
  /** Couleur du dot timeline */
  couleur: string
}

/** État persisté dans localStorage (clé saheltransit.v1) */
export interface AppState {
  version: 1
  containers: Container[]
  alerts: Alert[]
  events: CalendarEvent[]
  activity: ActivityEntry[]
}
