import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Kanban as KanbanIcon,
  Users,
  UserCheck,
  Bell,
  MessageSquare,
  Settings,
  ShieldCheck,
  Sun,
  Moon,
  X
} from 'lucide-react'
import { useTheme } from '../../contexts/ThemeContext'
import clsx from 'clsx'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { theme, toggleTheme } = useTheme()

  const navItems = [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { label: 'Kanban', icon: KanbanIcon, path: '/kanban' },
    { label: 'Leads', icon: Users, path: '/leads' },
    { label: 'Clientes', icon: UserCheck, path: '/clientes' },
    { label: 'Follow Up', icon: Bell, path: '/follow-up' },
    { label: 'Atendimentos', icon: MessageSquare, path: '/atendimentos' },
    { label: 'Configurações', icon: Settings, path: '/configuracoes' },
  ]

  return (
    <>
      {/* Overlay Mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden transition-opacity duration-300"
          onClick={onClose}
        />
      )}

      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-40 flex flex-col w-[240px] bg-[var(--bg-sidebar)] border-r border-[var(--sidebar-border)] text-[var(--sidebar-text)] transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Header/Brand */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--sidebar-border)]">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-[var(--accent)] text-[var(--bg-sidebar)] shadow-md shadow-amber-500/10">
              <ShieldCheck size={20} strokeWidth={2} />
            </div>
            <div>
              <h2 className="text-sm font-bold font-display tracking-tight text-white">Mestra SST</h2>
              <p className="text-[9px] font-semibold tracking-wider text-[var(--sidebar-muted)] uppercase">
                Segurança e Saúde
              </p>
            </div>
          </div>
          {/* Close button mobile */}
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/5 text-[var(--sidebar-muted)] lg:hidden"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {navItems.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onClose}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 px-4 py-3 rounded-lg text-xs font-semibold tracking-wide transition-all duration-200 border-l-4 border-transparent',
                  isActive
                    ? 'bg-[var(--sidebar-active)] text-white border-[var(--accent)] shadow-sm'
                    : 'text-[var(--sidebar-muted)] hover:text-white hover:bg-white/5'
                )
              }
            >
              <item.icon size={18} strokeWidth={1.8} className="shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Footer/Theme Switcher */}
        <div className="p-4 border-t border-[var(--sidebar-border)]">
          <button
            onClick={toggleTheme}
            className="flex items-center justify-between w-full px-4 py-2.5 rounded-lg text-xs font-bold text-[var(--sidebar-muted)] hover:text-white hover:bg-white/5 transition-all duration-200 group"
          >
            <span className="flex items-center gap-2.5">
              {theme === 'dark' ? (
                <>
                  <Sun size={18} className="text-amber-400 group-hover:rotate-45 transition-transform" />
                  <span>Modo Claro</span>
                </>
              ) : (
                <>
                  <Moon size={18} className="text-indigo-400 group-hover:-rotate-12 transition-transform" />
                  <span>Modo Escuro</span>
                </>
              )}
            </span>
          </button>
        </div>
      </aside>
    </>
  )
}
