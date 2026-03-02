'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Bell } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

interface Profile {
  full_name: string
  avatar_url: string | null
}

const CACHE_KEY = 'admin_profile_cache'
const CACHE_TTL = 5 * 60 * 1000 // 5 minutos

function getCachedProfile(): Profile | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const { data, ts } = JSON.parse(raw)
    if (Date.now() - ts > CACHE_TTL) return null
    return data
  } catch {
    return null
  }
}

function setCachedProfile(profile: Profile) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data: profile, ts: Date.now() }))
  } catch {}
}

export function AdminHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  const [profile, setProfile] = useState<Profile | null>(() => getCachedProfile())
  const [now, setNow] = useState(new Date())
  const fetchedRef = useRef(false)

  useEffect(() => {
    // Atualiza o relogio a cada minuto
    const t = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    // Ja tem cache, nao precisa buscar
    if (profile) return
    // Evita dupla chamada no StrictMode
    if (fetchedRef.current) return
    fetchedRef.current = true

    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', user.id)
        .single()
        .then(({ data }) => {
          if (data) {
            setProfile(data)
            setCachedProfile(data)
          }
        })
    })
  }, [profile])

  const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  const dateStr = now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <header className="h-16 border-b border-border bg-card/80 backdrop-blur-xl flex items-center justify-between px-6 shrink-0">
      <div className="flex flex-col">
        <h1 className="text-[18px] font-bold text-foreground tracking-tight leading-tight">{title}</h1>
        {subtitle && <p className="text-[12px] text-muted-foreground">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-4">
        {/* Relogio */}
        <div className="hidden md:flex flex-col items-end">
          <span className="text-[13px] font-semibold text-foreground tabular-nums">{timeStr}</span>
          <span className="text-[11px] text-muted-foreground capitalize">{dateStr}</span>
        </div>

        <div className="hidden md:block w-px h-8 bg-border" />

        {/* Notificacoes */}
        <button
          type="button"
          className="relative w-9 h-9 rounded-xl bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors"
          aria-label="Notificacoes"
        >
          <Bell className="w-4 h-4 text-muted-foreground" />
          <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-card" />
        </button>

        {/* Perfil */}
        <div className="flex items-center gap-2.5">
          <Avatar className="w-8 h-8 ring-2 ring-border">
            <AvatarImage src={profile?.avatar_url || undefined} />
            <AvatarFallback className="bg-blue-600 text-white text-xs font-bold">
              {profile?.full_name?.charAt(0)?.toUpperCase() || 'A'}
            </AvatarFallback>
          </Avatar>
          {profile && (
            <span className="hidden lg:block text-[13px] font-semibold text-foreground truncate max-w-[120px]">
              {profile.full_name}
            </span>
          )}
        </div>
      </div>
    </header>
  )
}
