import { Suspense, useEffect, useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Pill,
  ShieldCheck,
  UserRound,
  Users
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { cn, roleLabel } from '../lib/utils';
import type { Role } from '../types';
import Avatar from './Avatar';
import { PageSkeleton } from './Loading';
import ThemeToggle from './ThemeToggle';

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  roles: Role[];
  patientLabel?: string;
  end?: boolean;
}

const ALL_ROLES: Role[] = ['superadmin', 'medico', 'operador_ubs', 'paciente'];
const STAFF_ROLES: Role[] = ['superadmin', 'medico', 'operador_ubs'];

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Início', icon: LayoutDashboard, roles: ALL_ROLES, end: true },
  { to: '/console', label: 'Console 3D', icon: Pill, roles: STAFF_ROLES },
  { to: '/capsula', label: 'Protótipo da cápsula', icon: Pill, roles: ALL_ROLES },
  { to: '/pacientes', label: 'Pacientes', icon: Users, roles: STAFF_ROLES },
  { to: '/exames', label: 'Laudos', icon: ClipboardList, roles: ALL_ROLES, patientLabel: 'Meus Exames' },
  { to: '/admin', label: 'Administração', icon: ShieldCheck, roles: ['superadmin'] },
  { to: '/perfil', label: 'Meu Perfil', icon: UserRound, roles: ALL_ROLES }
];

const MOBILE_PATHS: Record<Role, string[]> = {
  superadmin: ['/', '/console', '/exames', '/admin', '/perfil'],
  medico: ['/', '/console', '/pacientes', '/exames', '/perfil'],
  operador_ubs: ['/', '/console', '/pacientes', '/exames', '/perfil'],
  paciente: ['/', '/exames', '/perfil']
};

export default function AppLayout() {
  const { profile, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem('insightbot-sidebar-collapsed') === 'true'
  );

  useEffect(() => {
    localStorage.setItem('insightbot-sidebar-collapsed', String(collapsed));
  }, [collapsed]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [location.pathname]);

  const navItems = useMemo(
    () => NAV_ITEMS.filter((item) => profile && item.roles.includes(profile.role)),
    [profile]
  );

  const mobileItems = useMemo(() => {
    if (!profile) return [];
    return navItems.filter((item) => MOBILE_PATHS[profile.role].includes(item.to));
  }, [navItems, profile]);

  if (!profile) return null;

  const handleLogout = async () => {
    await signOut();
    toast.info('Sessão encerrada', 'Você saiu do InSightBot com segurança.');
    navigate('/login', { replace: true });
  };

  const labelFor = (item: NavItem) =>
    profile.role === 'paciente' && item.patientLabel ? item.patientLabel : item.label;

  return (
    <div className="min-h-screen bg-app">
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-line/60 bg-surface/80 backdrop-blur-2xl transition-all duration-300 md:flex',
          collapsed ? 'w-[88px]' : 'w-[272px]'
        )}
      >
        <div className={cn('flex items-center gap-3 px-5 pb-5 pt-6', collapsed && 'justify-center px-0')}>
          <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent text-white shadow-lg shadow-primary/25">
            <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 animate-pulse rounded-full bg-accent ring-2 ring-surface" />
            <Pill className="h-5 w-5" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-base font-extrabold tracking-tight text-main">InSightBot</p>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
                EliteDevs
              </p>
            </div>
          )}
        </div>

        <div className={cn('px-4 pb-3', collapsed && 'px-3')}>
          <div
            className={cn(
              'flex items-center gap-2 rounded-xl border border-accent/20 bg-accent/10 px-3 py-2 text-[11px] font-semibold text-accent',
              collapsed && 'justify-center px-0'
            )}
            title="Sistema operacional"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
            </span>
            {!collapsed && <span>Sistema operacional</span>}
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
          {!collapsed && (
            <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-muted/70">
              Navegação
            </p>
          )}
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                title={collapsed ? labelFor(item) : undefined}
                className={({ isActive }) =>
                  cn(
                    'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors',
                    collapsed && 'justify-center px-0',
                    isActive
                      ? 'text-primary'
                      : 'text-muted hover:bg-panel hover:text-main'
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <motion.span
                        layoutId="sidebar-active"
                        className="absolute inset-0 rounded-xl bg-primary-soft/70 ring-1 ring-primary/20"
                        transition={{ type: 'spring', stiffness: 400, damping: 34 }}
                      />
                    )}
                    <Icon className="relative z-10 h-[18px] w-[18px]" />
                    {!collapsed && <span className="relative z-10">{labelFor(item)}</span>}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="space-y-3 border-t border-line/60 p-4">
          {!collapsed && <ThemeToggle />}
          {collapsed && <ThemeToggle compact />}
          <div
            className={cn(
              'flex items-center gap-2 rounded-xl border border-line/60 bg-panel/40 p-2',
              collapsed && 'justify-center border-0 bg-transparent p-0'
            )}
          >
            <NavLink to="/perfil" className="shrink-0" title={profile.full_name}>
              <Avatar src={profile.avatar_url} name={profile.full_name} size="sm" />
            </NavLink>
            {!collapsed && (
              <>
                <NavLink to="/perfil" className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold text-main">{profile.full_name}</p>
                  <p className="truncate text-[10px] font-medium text-muted">
                    {roleLabel(profile.role)}
                  </p>
                </NavLink>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-lg p-2 text-muted transition hover:bg-danger/10 hover:text-danger"
                  aria-label="Sair da conta"
                  title="Sair"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setCollapsed((value) => !value)}
          className="absolute -right-3 top-24 flex h-6 w-6 items-center justify-center rounded-full border border-line bg-surface text-muted shadow-sm transition hover:text-primary"
          aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
        >
          {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
        </button>
      </aside>

      <div className={cn('min-h-screen transition-all duration-300', collapsed ? 'md:pl-[88px]' : 'md:pl-[272px]')}>
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line/50 bg-app/80 px-4 py-3 backdrop-blur-xl sm:px-6 md:justify-end md:py-4">
          <div className="flex items-center gap-2 md:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent text-white">
              <Pill className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-extrabold leading-none tracking-tight">InSightBot</p>
              <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-widest text-muted">
                {roleLabel(profile.role)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="mr-1 hidden items-center gap-2 rounded-full border border-line/60 bg-surface/70 px-3 py-1.5 text-[11px] font-semibold text-muted lg:flex">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              {profile.health_unit ?? 'Rede InSightBot'}
            </div>
            <ThemeToggle compact />
            <NavLink to="/perfil" aria-label="Abrir perfil">
              <Avatar src={profile.avatar_url} name={profile.full_name} size="sm" />
            </NavLink>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1500px] px-4 pb-28 pt-5 sm:px-6 md:pb-12 md:pt-7">
          <Suspense fallback={<PageSkeleton />}>
            <Outlet />
          </Suspense>
        </main>
      </div>

      <nav className="safe-bottom fixed inset-x-3 bottom-3 z-40 md:hidden">
        <div className="glass flex items-center justify-around rounded-2xl px-1.5 py-2 shadow-2xl">
          {mobileItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    'relative flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl px-1 py-1.5 text-[10px] font-semibold transition-colors',
                    isActive ? 'text-primary' : 'text-muted'
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <motion.span
                        layoutId="mobile-active"
                        className="absolute inset-0 rounded-xl bg-primary/10"
                        transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                      />
                    )}
                    <motion.span whileTap={{ scale: 0.85 }} className="relative z-10">
                      <Icon className="h-5 w-5" />
                    </motion.span>
                    <span className="relative z-10 truncate">{labelFor(item).split(' ')[0]}</span>
                  </>
                )}
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
