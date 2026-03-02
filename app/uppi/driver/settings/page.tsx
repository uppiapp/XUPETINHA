'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

interface DriverSettings {
  notifications_ride_requests: boolean
  notifications_payments: boolean
  notifications_promotions: boolean
  auto_accept: boolean
  max_distance_km: number
  preferred_payment: string
  sound_enabled: boolean
}

const defaultSettings: DriverSettings = {
  notifications_ride_requests: true,
  notifications_payments: true,
  notifications_promotions: false,
  auto_accept: false,
  max_distance_km: 10,
  preferred_payment: 'all',
  sound_enabled: true,
}

export default function DriverSettingsPage() {
  const router = useRouter()
  const supabase = createClient()

  const [settings, setSettings] = useState<DriverSettings>(defaultSettings)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null

    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/onboarding/splash'); return }

      await loadSettings()

      // Real-time: sync settings if changed from another device/admin
      channel = supabase
        .channel(`driver-settings-${user.id}`)
        .on('postgres_changes', {
          event: 'UPDATE', schema: 'public', table: 'profiles',
          filter: `id=eq.${user.id}`,
        }, () => loadSettings())
        .subscribe()
    }

    init()
    return () => { channel && supabase.removeChannel(channel) }
  }, [])

  const loadSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/onboarding/splash'); return }

      const { data } = await supabase
        .from('profiles')
        .select('preferences')
        .eq('id', user.id)
        .single()

      if (data?.preferences?.driver_settings) {
        setSettings({ ...defaultSettings, ...data.preferences.driver_settings })
      }
    } finally {
      setLoading(false)
    }
  }

  const toggle = (key: keyof DriverSettings) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase.from('profiles').select('preferences').eq('id', user.id).single()
      const prefs = data?.preferences || {}
      await supabase.from('profiles').update({
        preferences: { ...prefs, driver_settings: settings }
      }).eq('id', user.id)

      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/onboarding/splash')
  }

  if (loading) {
    return (
      <div className="h-dvh bg-[color:var(--background)] flex items-center justify-center">
        <div className="w-8 h-8 border-[2.5px] border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const ToggleRow = ({
    label, description, settingKey,
  }: { label: string; description?: string; settingKey: keyof DriverSettings }) => (
    <div className="flex items-center justify-between py-4">
      <div className="flex-1 min-w-0 pr-4">
        <p className="text-[15px] font-semibold text-[color:var(--foreground)]">{label}</p>
        {description && <p className="text-[12px] text-[color:var(--muted-foreground)] mt-0.5">{description}</p>}
      </div>
      <button
        type="button"
        onClick={() => toggle(settingKey)}
        className={cn(
          'relative w-12 h-7 rounded-full transition-colors ios-press shrink-0',
          settings[settingKey] ? 'bg-emerald-500' : 'bg-[color:var(--muted-foreground)]/30'
        )}
        aria-checked={!!settings[settingKey]}
        role="switch"
      >
        <div className={cn(
          'absolute top-[3px] w-[22px] h-[22px] bg-white rounded-full shadow transition-all',
          settings[settingKey] ? 'right-[3px]' : 'left-[3px]'
        )} />
      </button>
    </div>
  )

  return (
    <div className="h-dvh overflow-y-auto bg-[color:var(--background)] pb-8 ios-scroll">
      {/* Header */}
      <header className="bg-[color:var(--card)]/80 ios-blur border-b border-[color:var(--border)] sticky top-0 z-30">
        <div className="px-5 pt-safe-offset-4 pb-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-[color:var(--muted)] ios-press"
            >
              <svg className="w-5 h-5 text-[color:var(--foreground)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-[20px] font-bold text-[color:var(--foreground)] tracking-tight">Configurações</h1>
          </div>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className={cn(
              'px-4 h-9 font-bold text-[14px] rounded-[12px] ios-press disabled:opacity-60 transition-colors flex items-center gap-1.5',
              saved ? 'bg-emerald-100 text-emerald-700' : 'bg-emerald-500 text-white'
            )}
          >
            {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : null}
            {saved ? 'Salvo!' : 'Salvar'}
          </button>
        </div>
      </header>

      <main className="px-5 py-5 max-w-lg mx-auto space-y-4">
        {/* Notificações */}
        <div className="bg-[color:var(--card)] rounded-[24px] px-5 border border-[color:var(--border)] animate-ios-fade-up">
          <p className="text-[12px] font-bold text-[color:var(--muted-foreground)] uppercase tracking-wider pt-4 pb-2">Notificações</p>
          <div className="divide-y divide-[color:var(--border)]">
            <ToggleRow label="Novas solicitações" description="Alertas de novas corridas disponíveis" settingKey="notifications_ride_requests" />
            <ToggleRow label="Pagamentos" description="Confirmações de recebimento" settingKey="notifications_payments" />
            <ToggleRow label="Promoções" description="Ofertas e benefícios especiais" settingKey="notifications_promotions" />
          </div>
        </div>

        {/* Preferências de corrida */}
        <div className="bg-[color:var(--card)] rounded-[24px] px-5 border border-[color:var(--border)] animate-ios-fade-up" style={{ animationDelay: '60ms' }}>
          <p className="text-[12px] font-bold text-[color:var(--muted-foreground)] uppercase tracking-wider pt-4 pb-2">Corridas</p>
          <div className="divide-y divide-[color:var(--border)]">
            <ToggleRow label="Som de notificação" description="Toque ao receber nova solicitação" settingKey="sound_enabled" />
            <ToggleRow label="Aceitar automaticamente" description="Aceitar corridas pelo preço do passageiro sem confirmar" settingKey="auto_accept" />
          </div>

          {/* Distância máxima */}
          <div className="py-4 border-t border-[color:var(--border)]">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-[15px] font-semibold text-[color:var(--foreground)]">Distância máxima</p>
                <p className="text-[12px] text-[color:var(--muted-foreground)]">Raio para aceitar corridas</p>
              </div>
              <span className="text-[16px] font-bold text-emerald-600">{settings.max_distance_km} km</span>
            </div>
            <input
              type="range"
              min={1}
              max={30}
              step={1}
              value={settings.max_distance_km}
              onChange={e => setSettings(prev => ({ ...prev, max_distance_km: parseInt(e.target.value) }))}
              className="w-full accent-emerald-500"
            />
            <div className="flex justify-between text-[11px] text-[color:var(--muted-foreground)] mt-1">
              <span>1 km</span>
              <span>30 km</span>
            </div>
          </div>
        </div>

        {/* Pagamento preferido */}
        <div className="bg-[color:var(--card)] rounded-[24px] px-5 py-4 border border-[color:var(--border)] animate-ios-fade-up" style={{ animationDelay: '120ms' }}>
          <p className="text-[12px] font-bold text-[color:var(--muted-foreground)] uppercase tracking-wider mb-3">Formas de pagamento aceitas</p>
          <div className="flex flex-wrap gap-2">
            {(['all', 'cash', 'pix', 'card'] as const).map(p => (
              <button
                key={p}
                type="button"
                onClick={() => setSettings(prev => ({ ...prev, preferred_payment: p }))}
                className={cn(
                  'px-4 py-2 rounded-[12px] text-[13px] font-semibold ios-press transition-colors',
                  settings.preferred_payment === p
                    ? 'bg-emerald-500 text-white'
                    : 'bg-[color:var(--muted)] text-[color:var(--muted-foreground)]'
                )}
              >
                {p === 'all' ? 'Todos' : p === 'cash' ? 'Dinheiro' : p === 'pix' ? 'PIX' : 'Cartão'}
              </button>
            ))}
          </div>
        </div>

        {/* Navegação rápida */}
        <div className="bg-[color:var(--card)] rounded-[24px] border border-[color:var(--border)] overflow-hidden animate-ios-fade-up" style={{ animationDelay: '160ms' }}>
          {[
            { label: 'Meu Perfil', route: '/uppi/driver/profile' },
            { label: 'Documentos', route: '/uppi/driver/documents' },
            { label: 'Ganhos', route: '/uppi/driver/earnings' },
            { label: 'Carteira', route: '/uppi/driver/wallet' },
          ].map((item, i) => (
            <button
              key={item.route}
              type="button"
              onClick={() => router.push(item.route)}
              className={cn(
                'w-full flex items-center justify-between px-5 py-4 ios-press hover:bg-[color:var(--muted)]/40 transition-colors',
                i > 0 && 'border-t border-[color:var(--border)]'
              )}
            >
              <span className="text-[15px] font-semibold text-[color:var(--foreground)]">{item.label}</span>
              <svg className="w-4 h-4 text-[color:var(--muted-foreground)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ))}
        </div>

        {/* Sair */}
        <button
          type="button"
          onClick={handleSignOut}
          className="w-full h-12 bg-red-50 text-red-500 font-bold text-[15px] rounded-[18px] ios-press animate-ios-fade-up border border-red-100"
          style={{ animationDelay: '200ms' }}
        >
          Sair da conta
        </button>
      </main>
    </div>
  )
}
