// AppShell — layout unique de l'application (design.md §3)
// Sidebar 248px navy-950 réductible à 76px + Topbar 64px + <Outlet/>.

import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router'
import {
  Bell,
  Calculator,
  CalendarDays,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  Container,
  Files,
  LayoutDashboard,
  Plus,
  Search,
  Ship,
} from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { Toaster } from 'sonner'
import { useStore, activeContainers, globalCounts } from '@/lib/store'
import { daysUntil, formatFullDate, relativeTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import AlertItem from './AlertItem'
import ContainerFormModal from './ContainerFormModal'

// Contexte permettant à n'importe quelle page d'ouvrir la modale de création
const NewContainerContext = createContext<() => void>(() => undefined)
export const useNewContainerModal = () => useContext(NewContainerContext)

// ─── Sidebar ─────────────────────────────────────────────────────────────────

interface NavItemDef {
  to: string
  label: string
  icon: typeof LayoutDashboard
  badge?: { value: number; color: string; bg: string }
}

function SidebarNavItem({ item, collapsed }: { item: NavItemDef; collapsed: boolean }) {
  const link = (
    <NavLink
      to={item.to}
      end={item.to === '/'}
      className={({ isActive }) =>
        cn(
          'group relative flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors duration-150',
          isActive ? 'bg-navy-800 text-white' : 'text-navy-300 hover:bg-navy-900 hover:text-navy-100',
          collapsed && 'justify-center px-0',
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive && <span className="absolute top-2 bottom-2 left-0 w-[3px] rounded-full bg-sand-500" />}
          <item.icon size={18} strokeWidth={1.75} className="shrink-0" />
          {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
          {!collapsed && item.badge && item.badge.value > 0 && (
            <span
              className="flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold"
              style={{ backgroundColor: item.badge.bg, color: item.badge.color }}
            >
              {item.badge.value}
            </span>
          )}
          {collapsed && item.badge && item.badge.value > 0 && (
            <span
              className="absolute top-1 right-1 size-2 rounded-full"
              style={{ backgroundColor: item.badge.color }}
            />
          )}
        </>
      )}
    </NavLink>
  )
  if (!collapsed) return link
  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right" className="text-xs">
        {item.label}
        {item.badge && item.badge.value > 0 ? ` · ${item.badge.value}` : ''}
      </TooltipContent>
    </Tooltip>
  )
}

// ─── Command palette (⌘K) ────────────────────────────────────────────────────

function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { containers } = useStore()
  const navigate = useNavigate()
  const openNew = useNewContainerModal()

  const allDocs = useMemo(
    () =>
      containers.flatMap((c) =>
        c.documents
          .filter((d) => d.statut === 'manquant' || d.statut === 'demande')
          .map((d) => ({ container: c, doc: d })),
      ),
    [containers],
  )

  const go = (path: string) => {
    onOpenChange(false)
    navigate(path)
  }

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Rechercher un container, un document, un fournisseur…" />
      <CommandList>
        <CommandEmpty>Aucun résultat pour cette recherche.</CommandEmpty>
        <CommandGroup heading="Containers">
          {containers.map((c) => (
            <CommandItem
              key={c.id}
              value={`${c.numero} ${c.contenu} ${c.fournisseur} ${c.origine}`}
              onSelect={() => go(`/containers/${c.id}`)}
              className="gap-2"
            >
              <Container size={16} className="text-ink-400" />
              <span className="font-mono text-[13px] font-medium">{c.numero}</span>
              <span className="truncate text-[13px] text-ink-600">— {c.contenu}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Documents en attente">
          {allDocs.slice(0, 8).map(({ container: c, doc }) => (
            <CommandItem
              key={doc.id}
              value={`${doc.nom} ${c.numero}`}
              onSelect={() => go(`/containers/${c.id}`)}
              className="gap-2"
            >
              <Files size={16} className="text-ink-400" />
              <span className="truncate text-[13px]">{doc.nom.split(' (')[0]}</span>
              <span className="ml-auto font-mono text-[11px] text-ink-400">{c.numero}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Actions">
          <CommandItem
            value="nouveau container créer"
            onSelect={() => {
              onOpenChange(false)
              openNew()
            }}
            className="gap-2"
          >
            <Plus size={16} className="text-ink-400" />
            <span className="text-[13px]">Nouveau container</span>
          </CommandItem>
          <CommandItem value="calculateur douanier" onSelect={() => go('/calculateur')} className="gap-2">
            <Calculator size={16} className="text-ink-400" />
            <span className="text-[13px]">Ouvrir le calculateur douanier</span>
          </CommandItem>
          <CommandItem value="calendrier échéances" onSelect={() => go('/calendrier')} className="gap-2">
            <CalendarDays size={16} className="text-ink-400" />
            <span className="text-[13px]">Voir le calendrier des échéances</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}

// ─── AppShell ────────────────────────────────────────────────────────────────

import { useAuth } from '@/lib/auth'

export default function AppShell() {
  const { logout } = useAuth()
  const { containers, alerts, events, lastSavedAt, markAllAlertsRead } = useStore()
  const [collapsed, setCollapsed] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const location = useLocation()

  // Réduction automatique entre 1024 et 1279px (design.md §8)
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px) and (max-width: 1279px)')
    const apply = () => setCollapsed(mq.matches)
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])

  // Raccourci ⌘K / Ctrl+K
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen((o) => !o)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const counts = useMemo(() => globalCounts(containers), [containers])
  const actifs = useMemo(() => activeContainers(containers), [containers])
  const critiques = alerts.filter((a) => !a.lue && a.severite === 'critique').length
  const unread = alerts.filter((a) => !a.lue).length
  const echeance48 = events.some((e) => {
    const d = daysUntil(e.date)
    return d >= 0 && d <= 2 && e.type === 't1'
  })

  // Titre de page / fil d'Ariane selon la route
  const { titre, breadcrumb } = useMemo(() => {
    const p = location.pathname
    if (p === '/') return { titre: 'Tableau de bord' }
    if (p === '/containers') return { titre: 'Containers' }
    if (p.startsWith('/containers/')) {
      const id = p.split('/')[2]
      const c = containers.find((x) => x.id === id)
      return { titre: c ? c.numero : 'Container', breadcrumb: ['Containers', c ? c.numero : id] }
    }
    if (p === '/documents') return { titre: 'Documents' }
    if (p === '/calendrier') return { titre: 'Calendrier' }
    if (p === '/calculateur') return { titre: 'Calculateur douanier' }
    if (p === '/maritime') return { titre: 'Suivi maritime' }
    return { titre: 'SahelTransit' }
  }, [location.pathname, containers])

  const sections: { label: string; items: NavItemDef[] }[] = [
    {
      label: 'Pilotage',
      items: [{ to: '/', label: 'Tableau de bord', icon: LayoutDashboard }],
    },
    {
      label: 'Zones maritime',
      items: [
        {
          to: '/maritime',
          label: 'Maritime',
          icon: Ship,
        },
      ],
    },
    {
      label: 'Opérations',
      items: [
        {
          to: '/containers',
          label: 'Containers',
          icon: Container,
          badge: { value: actifs.length, color: '#C7D5E2', bg: '#17334C' },
        },
        {
          to: '/documents',
          label: 'Documents',
          icon: Files,
          badge: { value: counts.manquants, color: '#FFFFFF', bg: '#E11D48' },
        },
        {
          to: '/calendrier',
          label: 'Calendrier',
          icon: CalendarDays,
          badge: echeance48 ? { value: 1, color: '#FFFFFF', bg: '#DC2626' } : undefined,
        },
      ],
    },
    {
      label: 'Outils',
      items: [{ to: '/calculateur', label: 'Calculateur douanier', icon: Calculator }],
    },
  ]

  return (
    <NewContainerContext.Provider value={() => setModalOpen(true)}>
      <TooltipProvider delayDuration={200}>
        <div className="min-h-[100dvh] bg-app">
          {/* ── Sidebar ── */}
          <aside
            className={cn(
              'fixed inset-y-0 left-0 z-40 flex flex-col bg-navy-950 transition-[width] duration-200 ease-out-expo',
              collapsed ? 'w-[76px]' : 'w-[248px]',
            )}
          >
            {/* Header logo */}
            <div className={cn('flex h-16 items-center gap-2.5 border-b border-navy-800 px-4', collapsed && 'justify-center px-0')}>
              <img src="/logo.svg" alt="SahelTransit" className="size-8 shrink-0" />
              {!collapsed && <span className="font-sora text-[17px] font-bold text-white">SahelTransit</span>}
            </div>

            {/* Bouton « + Nouveau container » */}
            <div className={cn('px-3 pt-4', collapsed && 'px-2.5')}>
              {collapsed ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => setModalOpen(true)}
                      className="flex h-10 w-full items-center justify-center rounded-lg bg-sand-500 text-white transition-colors hover:bg-sand-600"
                      aria-label="Nouveau container"
                    >
                      <Plus size={18} />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="text-xs">Nouveau container</TooltipContent>
                </Tooltip>
              ) : (
                <button
                  type="button"
                  onClick={() => setModalOpen(true)}
                  className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-sand-500 text-sm font-semibold text-white transition-colors hover:bg-sand-600"
                >
                  <Plus size={18} />
                  Nouveau container
                </button>
              )}
            </div>

            {/* Navigation */}
            <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-5">
              {sections.map((section) => (
                <div key={section.label}>
                  {!collapsed && (
                    <p className="text-overline mb-1.5 px-3 text-navy-300/60">{section.label}</p>
                  )}
                  <div className="space-y-0.5">
                    {section.items.map((item) => (
                      <SidebarNavItem key={item.to} item={item} collapsed={collapsed} />
                    ))}
                  </div>
                </div>
              ))}
            </nav>

            {/* Footer : mini centre d'alertes + carte utilisateur + réduction */}
            <div className={cn('border-t border-navy-800 bg-navy-900 p-3', collapsed && 'p-2')}>
              {!collapsed ? (
                <Link
                  to="/calendrier"
                  className="mb-3 flex items-center gap-2.5 rounded-lg bg-navy-800/60 px-3 py-2.5 transition-colors hover:bg-navy-800"
                >
                  <span className="relative flex size-2">
                    {critiques > 0 && (
                      <span className="absolute inline-flex size-full animate-pulse-ring-fast rounded-full bg-[#DC2626]" />
                    )}
                    <span
                      className={cn('relative inline-flex size-2 rounded-full', critiques > 0 ? 'bg-[#DC2626]' : 'bg-[#059669]')}
                    />
                  </span>
                  <span className="flex-1 text-xs font-medium text-navy-100">
                    {critiques > 0 ? `${critiques} alerte${critiques > 1 ? 's' : ''} critique${critiques > 1 ? 's' : ''}` : 'Aucune alerte critique'}
                  </span>
                  <ChevronLeft size={14} className="rotate-180 text-navy-300" />
                </Link>
              ) : (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link
                      to="/calendrier"
                      className="mb-2 flex h-9 items-center justify-center rounded-lg bg-navy-800/60 transition-colors hover:bg-navy-800"
                      aria-label="Centre d'alertes"
                    >
                      <span className={cn('size-2 rounded-full', critiques > 0 ? 'animate-soft-pulse bg-[#DC2626]' : 'bg-[#059669]')} />
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="text-xs">
                    {critiques > 0 ? `${critiques} alertes critiques` : 'Aucune alerte critique'}
                  </TooltipContent>
                </Tooltip>
              )}

              <div className={cn('flex items-center gap-2.5 px-1 py-1.5', collapsed && 'justify-center px-0')}>
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-sand-500 text-xs font-bold text-white">
                  MA
                </span>
                {!collapsed && (
                  <div className="min-w-0">
                    <p className="truncate text-[13px] leading-4 font-semibold text-white">Mahamat Abakar</p>
                    <p className="truncate text-[11px] leading-4 text-navy-300">NÉGOCE &amp; IMPORT — N'Djamena</p>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => setCollapsed((c) => !c)}
                className="mt-2 flex h-8 w-full items-center justify-center rounded-lg text-navy-300 transition-colors hover:bg-navy-800 hover:text-navy-100"
                aria-label={collapsed ? 'Déplier la barre latérale' : 'Réduire la barre latérale'}
              >
                {collapsed ? <ChevronsRight size={16} /> : <ChevronsLeft size={16} />}
              </button>
            </div>
          </aside>

          {/* ── Colonne principale ── */}
          <div className={cn('flex min-h-[100dvh] flex-col transition-[padding] duration-200 ease-out-expo', collapsed ? 'pl-[76px]' : 'pl-[248px]')}>
            {/* Topbar */}
            <header className="topbar sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border bg-white px-6">
              <div className="min-w-0 flex-1">
                {breadcrumb ? (
                  <p className="flex items-center gap-1.5 text-sm">
                    <Link to="/containers" className="text-ink-400 hover:text-ink-600">
                      {breadcrumb[0]}
                    </Link>
                    <span className="text-ink-400">/</span>
                    <span className="truncate font-mono font-semibold text-ink-900">{breadcrumb[1]}</span>
                  </p>
                ) : (
                  <h1 className="truncate font-sora text-[17px] font-bold text-ink-900">{titre}</h1>
                )}
                <p className="text-xs text-ink-400 capitalize">{formatFullDate(new Date())}</p>
              </div>

              {/* Indicateur de persistance */}
              <AnimatePresence>
                {lastSavedAt && (
                  <motion.span
                    key={lastSavedAt}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="hidden items-center gap-1.5 text-xs text-ink-400 md:flex"
                  >
                    <span className="size-1.5 rounded-full bg-[#059669]" />
                    Sauvegardé localement · {relativeTime(lastSavedAt)}
                  </motion.span>
                )}
              </AnimatePresence>

              {/* Recherche globale */}
              <button
                type="button"
                onClick={() => setPaletteOpen(true)}
                className="hidden h-9 w-[360px] items-center gap-2 rounded-lg bg-subtle px-3 text-left text-[13px] text-ink-400 transition-colors hover:bg-[#E4E8ED] lg:flex"
              >
                <Search size={16} strokeWidth={1.75} />
                <span className="flex-1 truncate">Rechercher un container, un document, un fournisseur…</span>
                <kbd className="rounded border border-border bg-white px-1.5 py-0.5 font-mono text-[10px] font-medium text-ink-400">
                  ⌘K
                </kbd>
              </button>
              <button
                type="button"
                onClick={() => setPaletteOpen(true)}
                className="flex size-9 items-center justify-center rounded-lg text-ink-400 hover:bg-subtle lg:hidden"
                aria-label="Rechercher"
              >
                <Search size={18} strokeWidth={1.75} />
              </button>

              {/* Sélecteur de période (décoratif V1) */}
              <span className="hidden rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-ink-600 xl:block">
                Tout
              </span>

              {/* Cloche alertes */}
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="relative flex size-9 items-center justify-center rounded-lg text-ink-400 transition-colors hover:bg-subtle hover:text-ink-600"
                    aria-label={`Alertes (${unread} non lues)`}
                  >
                    <Bell size={18} strokeWidth={1.75} />
                    {unread > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#DC2626] px-1 text-[10px] font-bold text-white">
                        {unread}
                      </span>
                    )}
                  </button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-[380px] p-0">
                  <div className="flex items-center justify-between border-b border-border px-4 py-3">
                    <p className="font-h3 text-ink-900">Alertes</p>
                    <button
                      type="button"
                      onClick={markAllAlertsRead}
                      className="text-xs font-medium text-sand-700 hover:text-sand-600"
                    >
                      Tout marquer comme lu
                    </button>
                  </div>
                  <div className="max-h-[420px] overflow-y-auto p-2">
                    {alerts.map((a) => (
                      <div key={a.id} className={cn(a.lue && 'opacity-55')}>
                        <AlertItem alert={a} />
                      </div>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>

              {/* Avatar + Déconnexion */}
              <button
                type="button"
                onClick={() => { logout(); window.location.href = '/login' }}
                className="flex size-8 items-center justify-center rounded-full bg-sand-500 text-xs font-bold text-white hover:bg-sand-600"
                title="Se déconnecter"
              >
                MA
              </button>
            </header>

            {/* Contenu */}
            <main className="flex-1 px-6 py-6 xl:px-8 xl:py-8">
              <div className="mx-auto max-w-[1520px]">
                <Outlet />
              </div>
            </main>
          </div>

          <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
          <ContainerFormModal open={modalOpen} onOpenChange={setModalOpen} />
          <Toaster position="bottom-right" richColors closeButton />
        </div>
      </TooltipProvider>
    </NewContainerContext.Provider>
  )
}
