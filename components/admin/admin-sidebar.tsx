'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
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
  BarChart3,
  Webhook,
  Ticket,
  UserCog,
  AlertTriangle,
  Settings,
  MessageSquare,
  CreditCard,
  Star,
  HeadphonesIcon,
  Tag,
  Users2,
  Rss,
  Trophy,
  TrendingUp,
  Truck,
  MapPin,
  Award,
  ShieldAlert,
  UserCheck,
  Calendar,
  Crown,
  Heart,
  Mic,
  MessageCircle,
  HelpCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

const navGroups = [
  {
    label: 'Visao Geral',
    items: [
      { href: '/admin', icon: LayoutDashboard, label: 'Dashboard', exact: true },
      { href: '/admin/analytics', icon: BarChart3, label: 'Analytics' },
      { href: '/admin/monitor', icon: Radio, label: 'Monitor ao Vivo' },
      { href: '/admin/emergency', icon: ShieldAlert, label: 'Central de Emergencia' },
    ],
  },
  {
    label: 'Usuarios',
    items: [
      { href: '/admin/users', icon: Users, label: 'Passageiros' },
      { href: '/admin/drivers', icon: UserCog, label: 'Motoristas' },
      { href: '/admin/drivers/earnings', icon: TrendingUp, label: 'Ganhos Motoristas' },
      { href: '/admin/reviews', icon: Star, label: 'Avaliacoes' },
      { href: '/admin/achievements', icon: Award, label: 'Conquistas' },
      { href: '/admin/leaderboard', icon: Trophy, label: 'Leaderboard' },
      { href: '/admin/referrals', icon: UserCheck, label: 'Indicacoes' },
      { href: '/admin/subscriptions', icon: Crown, label: 'Assinaturas Club' },
      { href: '/admin/favoritos', icon: Heart, label: 'Locais Favoritos' },
    ],
  },
  {
    label: 'Corridas',
    items: [
      { href: '/admin/rides', icon: Car, label: 'Corridas' },
      { href: '/admin/agendamentos', icon: Calendar, label: 'Agendamentos' },
      { href: '/admin/group-rides', icon: Users2, label: 'Corridas em Grupo' },
      { href: '/admin/cidade-a-cidade', icon: MapPin, label: 'Cidade a Cidade' },
      { href: '/admin/entregas', icon: Truck, label: 'Entregas' },
      { href: '/admin/price-offers', icon: Tag, label: 'Ofertas de Preco' },
    ],
  },
  {
    label: 'Operacoes',
    items: [
      { href: '/admin/financeiro', icon: DollarSign, label: 'Financeiro' },
      { href: '/admin/payments', icon: CreditCard, label: 'Pagamentos' },
      { href: '/admin/cupons', icon: Ticket, label: 'Cupons' },
      { href: '/admin/messages', icon: MessageSquare, label: 'Mensagens' },
      { href: '/admin/notifications', icon: Bell, label: 'Notificacoes' },
      { href: '/admin/sms', icon: MessageCircle, label: 'SMS' },
      { href: '/admin/suporte', icon: HeadphonesIcon, label: 'Suporte' },
      { href: '/admin/social', icon: Rss, label: 'Feed Social' },
      { href: '/admin/faq', icon: HelpCircle, label: 'FAQ / Ajuda' },
    ],
  },
  {
    label: 'Sistema',
    items: [
      { href: '/admin/webhooks', icon: Webhook, label: 'Webhooks' },
      { href: '/admin/recordings', icon: Mic, label: 'Gravacoes' },
      { href: '/admin/logs', icon: AlertTriangle, label: 'Logs de Erro' },
      { href: '/admin/settings', icon: Settings, label: 'Configuracoes' },
    ],
  },
]

export function AdminSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href
    return pathname.startsWith(href)
  }

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/admin/login')
  }

  return (
    <aside
      className={cn(
        'h-screen flex flex-col shrink-0 transition-all duration-300 ease-in-out',
        'bg-[hsl(var(--sidebar-background))] border-r border-[hsl(var(--sidebar-border))]',
        collapsed ? 'w-[60px]' : 'w-[230px]'
      )}
    >
      {/* Logo */}
      <div className={cn(
        'h-[56px] flex items-center border-b border-[hsl(var(--sidebar-border))] shrink-0',
        collapsed ? 'px-0 justify-center' : 'px-4 gap-3'
      )}>
        <div className="w-8 h-8 rounded-lg bg-[hsl(var(--admin-green))]/15 border border-[hsl(var(--admin-green))]/30 flex items-center justify-center shrink-0">
          <Shield className="w-4 h-4 text-[hsl(var(--admin-green))]" />
        </div>
        {!collapsed && (
          <div className="flex flex-col min-w-0">
            <span className="text-[13px] font-bold text-slate-100 tracking-tight truncate leading-tight">Xupetinha</span>
            <span className="text-[10px] text-slate-500 font-medium leading-tight">Painel Admin</span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 overflow-y-auto space-y-5 px-2">
        {navGroups.map((group) => (
          <div key={group.label}>
            {!collapsed && (
              <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mb-1.5 px-2">
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
                    title={collapsed ? item.label : undefined}
                    className={cn(
                      'flex items-center gap-2.5 rounded-lg text-[12.5px] font-medium transition-all duration-100',
                      collapsed ? 'justify-center w-10 h-10 mx-auto' : 'px-2.5 py-2',
                      active
                        ? 'bg-[hsl(var(--admin-green))]/15 text-[hsl(var(--admin-green))]'
                        : 'text-slate-400 hover:bg-[hsl(var(--sidebar-accent))] hover:text-slate-200'
                    )}
                  >
                    <item.icon className="w-[15px] h-[15px] shrink-0" />
                    {!collapsed && <span className="truncate flex-1">{item.label}</span>}
                    {active && !collapsed && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--admin-green))] shrink-0 animate-pulse" />
                    )}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom */}
      <div className="p-2 border-t border-[hsl(var(--sidebar-border))] space-y-0.5 shrink-0">
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? 'Expandir' : 'Recolher'}
          className={cn(
            'w-full flex items-center gap-2.5 rounded-lg text-[12px] font-medium text-slate-500 hover:bg-[hsl(var(--sidebar-accent))] hover:text-slate-300 transition-all duration-100',
            collapsed ? 'justify-center w-10 h-10 mx-auto' : 'px-2.5 py-2'
          )}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <><ChevronLeft className="w-4 h-4" /><span>Recolher</span></>}
        </button>
        <button
          type="button"
          onClick={handleLogout}
          title={collapsed ? 'Sair' : undefined}
          className={cn(
            'w-full flex items-center gap-2.5 rounded-lg text-[12px] font-medium text-slate-500 hover:bg-red-500/10 hover:text-red-400 transition-all duration-100',
            collapsed ? 'justify-center w-10 h-10 mx-auto' : 'px-2.5 py-2'
          )}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!collapsed && <span>Sair</span>}
        </button>
      </div>
    </aside>
  )
}
