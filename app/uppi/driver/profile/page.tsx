'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import type { Profile, DriverProfile } from '@/lib/types/database'

const VEHICLE_LABELS: Record<string, string> = {
  economy: 'Carro Econômico', electric: 'Elétrico', premium: 'Premium',
  suv: 'SUV', moto: 'Moto',
}

export default function DriverProfilePage() {
  const router = useRouter()
  const supabase = createClient()

  const [profile, setProfile] = useState<Profile | null>(null)
  const [driverProfile, setDriverProfile] = useState<DriverProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Editable fields
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [vehicleBrand, setVehicleBrand] = useState('')
  const [vehicleModel, setVehicleModel] = useState('')
  const [vehicleColor, setVehicleColor] = useState('')
  const [vehiclePlate, setVehiclePlate] = useState('')
  const [vehicleYear, setVehicleYear] = useState('')

  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null

    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/onboarding/splash'); return }

      await loadProfile()

      // Real-time: sync profile changes (e.g. admin verification updates)
      channel = supabase
        .channel(`driver-profile-rt-${user.id}`)
        .on('postgres_changes', {
          event: 'UPDATE', schema: 'public', table: 'driver_profiles',
          filter: `id=eq.${user.id}`,
        }, () => loadProfile())
        .on('postgres_changes', {
          event: 'UPDATE', schema: 'public', table: 'profiles',
          filter: `id=eq.${user.id}`,
        }, () => loadProfile())
        .subscribe()
    }

    init()
    return () => { channel && supabase.removeChannel(channel) }
  }, [])

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/onboarding/splash'); return }

      const [{ data: prof }, { data: drvProf }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('driver_profiles').select('*').eq('id', user.id).single(),
      ])

      setProfile(prof)
      setDriverProfile(drvProf)
      setFullName(prof?.full_name || '')
      setPhone(prof?.phone || '')
      setVehicleBrand(drvProf?.vehicle_brand || '')
      setVehicleModel(drvProf?.vehicle_model || '')
      setVehicleColor(drvProf?.vehicle_color || '')
      setVehiclePlate(drvProf?.vehicle_plate || '')
      setVehicleYear(drvProf?.vehicle_year?.toString() || '')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!profile) return
    setSaving(true)
    try {
      await Promise.all([
        supabase.from('profiles').update({ full_name: fullName, phone }).eq('id', profile.id),
        supabase.from('driver_profiles').update({
          vehicle_brand: vehicleBrand,
          vehicle_model: vehicleModel,
          vehicle_color: vehicleColor,
          vehicle_plate: vehiclePlate.toUpperCase(),
          vehicle_year: vehicleYear ? parseInt(vehicleYear) : null,
        }).eq('id', profile.id),
      ])
      await loadProfile()
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="h-dvh bg-[color:var(--background)] flex items-center justify-center">
        <div className="w-8 h-8 border-[2.5px] border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

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
            <h1 className="text-[20px] font-bold text-[color:var(--foreground)] tracking-tight">Meu Perfil</h1>
          </div>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-4 h-9 bg-emerald-500 text-white text-[14px] font-bold rounded-[12px] ios-press disabled:opacity-60 flex items-center gap-1.5"
          >
            {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : null}
            Salvar
          </button>
        </div>
      </header>

      <main className="px-5 py-5 max-w-lg mx-auto space-y-5">
        {/* Avatar */}
        <div className="flex flex-col items-center gap-3 animate-ios-fade-up">
          <div className="relative">
            <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center border-4 border-[color:var(--card)] shadow-lg">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Avatar" className="w-full h-full rounded-full object-cover" />
              ) : (
                <span className="text-[36px] font-black text-emerald-700">{fullName[0] || 'M'}</span>
              )}
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center shadow-md ios-press"
            >
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="sr-only" aria-label="Selecionar foto" />
          </div>

          {/* Rating badge */}
          {driverProfile?.rating && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 rounded-full">
              <svg className="w-4 h-4 text-amber-400 fill-current" viewBox="0 0 20 20">
                <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
              </svg>
              <span className="text-[14px] font-bold text-amber-700">{driverProfile.rating.toFixed(1)}</span>
              <span className="text-[12px] text-amber-600">({driverProfile.total_rides || 0} corridas)</span>
            </div>
          )}
        </div>

        {/* Dados pessoais */}
        <div className="bg-[color:var(--card)] rounded-[24px] p-5 border border-[color:var(--border)] animate-ios-fade-up" style={{ animationDelay: '80ms' }}>
          <p className="text-[12px] font-bold text-[color:var(--muted-foreground)] uppercase tracking-wider mb-4">Dados pessoais</p>
          <div className="space-y-4">
            <div>
              <label className="block text-[13px] font-semibold text-[color:var(--muted-foreground)] mb-1.5">Nome completo</label>
              <input
                type="text"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                className="w-full h-12 px-4 bg-[color:var(--muted)] rounded-[14px] text-[15px] text-[color:var(--foreground)] outline-none focus:ring-2 focus:ring-emerald-500 transition-shadow"
                placeholder="Seu nome"
              />
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-[color:var(--muted-foreground)] mb-1.5">Telefone</label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="w-full h-12 px-4 bg-[color:var(--muted)] rounded-[14px] text-[15px] text-[color:var(--foreground)] outline-none focus:ring-2 focus:ring-emerald-500 transition-shadow"
                placeholder="+55 11 99999-9999"
              />
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-[color:var(--muted-foreground)] mb-1.5">Email</label>
              <div className="h-12 px-4 bg-[color:var(--muted)]/50 rounded-[14px] flex items-center">
                <span className="text-[15px] text-[color:var(--muted-foreground)]">{profile?.email || '—'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Veículo */}
        <div className="bg-[color:var(--card)] rounded-[24px] p-5 border border-[color:var(--border)] animate-ios-fade-up" style={{ animationDelay: '120ms' }}>
          <div className="flex items-center justify-between mb-4">
            <p className="text-[12px] font-bold text-[color:var(--muted-foreground)] uppercase tracking-wider">Veículo</p>
            {driverProfile?.vehicle_type && (
              <span className="text-[12px] font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                {VEHICLE_LABELS[driverProfile.vehicle_type] || driverProfile.vehicle_type}
              </span>
            )}
          </div>
          <div className="space-y-4">
            {[
              { label: 'Marca', value: vehicleBrand, setter: setVehicleBrand, placeholder: 'Ex: Toyota' },
              { label: 'Modelo', value: vehicleModel, setter: setVehicleModel, placeholder: 'Ex: Corolla' },
              { label: 'Cor', value: vehicleColor, setter: setVehicleColor, placeholder: 'Ex: Branco' },
              { label: 'Ano', value: vehicleYear, setter: setVehicleYear, placeholder: 'Ex: 2022', type: 'number' },
            ].map(f => (
              <div key={f.label}>
                <label className="block text-[13px] font-semibold text-[color:var(--muted-foreground)] mb-1.5">{f.label}</label>
                <input
                  type={f.type || 'text'}
                  value={f.value}
                  onChange={e => f.setter(e.target.value)}
                  className="w-full h-12 px-4 bg-[color:var(--muted)] rounded-[14px] text-[15px] text-[color:var(--foreground)] outline-none focus:ring-2 focus:ring-emerald-500 transition-shadow"
                  placeholder={f.placeholder}
                />
              </div>
            ))}
            <div>
              <label className="block text-[13px] font-semibold text-[color:var(--muted-foreground)] mb-1.5">Placa</label>
              <input
                type="text"
                value={vehiclePlate}
                onChange={e => setVehiclePlate(e.target.value.toUpperCase())}
                maxLength={8}
                className="w-full h-12 px-4 bg-[color:var(--muted)] rounded-[14px] text-[15px] font-mono font-bold text-[color:var(--foreground)] outline-none focus:ring-2 focus:ring-emerald-500 transition-shadow tracking-widest"
                placeholder="ABC-1234"
              />
            </div>
          </div>
        </div>

        {/* Links rápidos */}
        <div className="bg-[color:var(--card)] rounded-[24px] border border-[color:var(--border)] overflow-hidden animate-ios-fade-up" style={{ animationDelay: '160ms' }}>
          {[
            { label: 'Histórico de corridas', icon: '📋', route: '/uppi/driver/history' },
            { label: 'Minhas avaliações', icon: '⭐', route: '/uppi/driver/ratings' },
            { label: 'Documentos', icon: '📄', route: '/uppi/driver/documents' },
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
      </main>
    </div>
  )
}
