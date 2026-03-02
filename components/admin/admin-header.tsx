'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Bell, RefreshCw } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

interface Profile {
  full_name: string
  avatar_url: string | null
}

const CACHE_KEY = 'admin_profile_cache'
const CACHE_TTL = 10 * 60 * 1000

function getCachedProfile(): Profile | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const { data, ts } = JSON.parse(raw)
    if (Date.now() - ts > CACHE_TTL) return null
    return data
  } catch { return null }
}

function setCachedProfile(profile: Profile) {
  try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data: profile, ts: Date.now() })) } catch {}
}

export function AdminHeader({
  title,
  subtitle,
  actions,
}: {
  title: string
  subtitle?: string
  actions?: React.ReactNode
}) {
  const [profile, setProfile] = useState<Profile | null>(() => getCachedProfile())
  const [now, setNow] = useState(new Date())
  const fetchedRef = useRef(false)

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (profile || fetchedRef.current) return
    fetchedRef.current = true
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from('profiles').select('full_name, avatar_url').eq('id', user.id).single()
        .then(({ data }) => { if (data) { setProfile(data); setCachedProfile(data) } })
    })
  }, [profile])

  const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  const dateStr = now.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' })

  return (
    <header className="h-[56px] border-b border-[hsl(var(--admin-border))] bg-[hsl(var(--admin-surface))]/60 backdrop-blur-sm flex items-center justify-between px-5 shrink-0 gap-4">
      <div className="flex flex-col min-w-0">
        <h1 className="text-[15px] font-bold text-slate-100 tracking-tight leading-tight truncate">{title}</h1>
        {subtitle && <p className="text-[11px] text-slate-500 truncate leading-tight">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3 shrink-0">
        {actions && <div className="flex items-center gap-2">{actions}</div>}

        <div className="hidden md:flex flex-col items-end">
          <span className="text-[12px] font-semibold text-slate-300 tabular-nums leading-tight">{timeStr}</span>
          <span className="text-[10px] text-slate-600 capitalize leading-tight">{dateStr}</span>
        </div>

        <div className="w-px h-6 bg-[hsl(var(--admin-border))] hidden md:block" />

        <button
          type="button"
          className="relative w-8 h-8 rounded-lg bg-[hsl(var(--sidebar-accent))] flex items-center justify-center hover:bg-[hsl(var(--sidebar-accent))]/80 transition-colors"
          aria-label="Notificacoes"
        >
          <Bell className="w-3.5 h-3.5 text-slate-400" />
          <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-[hsl(var(--admin-green))] rounded-full" />
        </button>

        <div className="flex items-center gap-2">
          <Avatar className="w-7 h-7 ring-1 ring-[hsl(var(--admin-border))]">
            <AvatarImage src={profile?.avatar_url || undefined} />
            <AvatarFallback className="bg-[hsl(var(--admin-green))]/20 text-[hsl(var(--admin-green))] text-[10px] font-bold">
              {profile?.full_name?.charAt(0)?.toUpperCase() || 'A'}
            </AvatarFallback>
          </Avatar>
          {profile && (
            <span className="hidden lg:block text-[12px] font-semibold text-slate-300 truncate max-w-[100px]">
              {profile.full_name}
            </span>
          )}
        </div>
      </div>
    </header>
  )
}
