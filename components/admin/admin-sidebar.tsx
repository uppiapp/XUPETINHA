'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import {
  LayoutDashboard,
  Users,
  Car,
  DollarSign,
  Radio,
  Bell,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Shield,
  Activity,
  ShieldAlert,
  BarChart3,
  Webhook,
  Ticket,
  UserCog,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navGroups = [
  {
    label: 'Visao Geral',
    items: [
      { href: '/admin', icon: LayoutDashboard, label: 'Dashboard', exact: true },
      { href: '/admin/analytics', icon: BarChart3, label: 'Analytics' },
      { href: '/admin/monitor', icon: Radio, label: 'Monitor Realtime' },
    ],
  },
  {
    label: 'Gestao',
    items: [
      { href: '/admin/users', icon: Users, label: 'Usuarios' },
      { href: '/admin/drivers', icon: UserCog, label: 'Motoristas' },
      { href: '/admin/rides', icon: Car, label: 'Corridas' },
      { href: '/admin/cupons', icon: Ticket, label: 'Cupons' },
    ],
  },
  {
    label: 'Operacoes',
    items: [
      { href: '/admin/financeiro', icon: DollarSign, label: 'Financeiro' },
      { href: '/admin/notifications', icon: Bell, label: 'Notificacoes' },
    ],
  },
  {
    label: 'Sistema',
    items: [
      { href: '/admin/webhooks', icon: Webhook, label: 'Webhooks' },
      { href: '/admin/logs', icon: ShieldAlert, label: 'Logs de Erro' },
    ],
  },
]

export function AdminSidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href
    return pathname.startsWith(href)
  }

  return (
    <aside
      className={cn(
        'h-screen flex flex-col border-r border-[hsl(var(--sidebar-border))] bg-[hsl(var(--sidebar-background))] transition-all duration-300 ease-in-out shrink-0',
        collapsed ? 'w-[68px]' : 'w-[240px]'
      )}
    >
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-[hsl(var(--sidebar-border))]">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shrink-0">
            <Shield className="w-5 h-5 text-white" />
          </div>
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="text-[15px] font-bold text-[hsl(var(--sidebar-foreground))] tracking-tight truncate">Uppi Admin</span>
              <span className="text-[11px] text-[hsl(var(--sidebar-foreground))]/50 font-medium">Painel de Controle</span>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 px-2 overflow-y-auto space-y-4">
        {navGroups.map((group) => (
          <div key={group.label}>
            {!collapsed && (
              <p className="text-[10px] font-bold text-[hsl(var(--sidebar-foreground))]/35 uppercase tracking-widest mb-1.5 px-2">
                {group.label}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActive(item.href, item.exact)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13.5px] font-medium transition-all duration-150',
                      collapsed && 'justify-center px-0',
                      active
                        ? 'bg-[hsl(var(--sidebar-primary))] text-[hsl(var(--sidebar-primary-foreground))] shadow-sm'
                        : 'text-[hsl(var(--sidebar-foreground))]/65 hover:bg-[hsl(var(--sidebar-accent))] hover:text-[hsl(var(--sidebar-accent-foreground))]'
                    )}
                  >
                    <item.icon className="w-4.5 h-4.5 shrink-0 w-[18px] h-[18px]" />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                    {active && !collapsed && (
                      <Activity className="w-3 h-3 ml-auto animate-pulse text-emerald-400 shrink-0" />
                    )}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom section */}
      <div className="p-2 border-t border-[hsl(var(--sidebar-border))] space-y-0.5">
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium text-[hsl(var(--sidebar-foreground))]/50 hover:bg-[hsl(var(--sidebar-accent))] hover:text-[hsl(var(--sidebar-accent-foreground))] transition-all duration-150"
        >
          {collapsed
            ? <ChevronRight className="w-5 h-5 shrink-0 mx-auto" />
            : (
              <>
                <ChevronLeft className="w-5 h-5 shrink-0" />
                <span>Recolher</span>
              </>
            )}
        </button>
        <Link
          href="/uppi/home"
          className={cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium text-[hsl(var(--sidebar-foreground))]/50 hover:bg-red-500/10 hover:text-red-400 transition-all duration-150',
            collapsed && 'justify-center px-0'
          )}
        >
          <LogOut className="w-5 h-5 shrink-0" />
          {!collapsed && <span>Sair do Admin</span>}
        </Link>
      </div>
    </aside>
  )
}
