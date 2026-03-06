'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { BottomNavigation } from '@/components/bottom-navigation'

interface FamilyMember {
  id: string
  member_id: string | null
  member_name: string
  member_phone: string | null
  can_cancel: boolean
  created_at: string
  active_ride?: {
    id: string
    status: string
    pickup_address: string
    dropoff_address: string
    driver_name: string
    updated_at: string
  } | null
}

export default function FamilyPage() {
  const router = useRouter()
  const [members, setMembers] = useState<FamilyMember[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [addEmail, setAddEmail] = useState('')
  const [addName, setAddName] = useState('')
  const [addPhone, setAddPhone] = useState('')
  const [addCancel, setAddCancel] = useState(true)
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { loadMembers() }, [])

  const loadMembers = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return router.push('/login')

    const { data } = await supabase
      .from('family_members')
      .select('id, member_id, member_name, member_phone, can_cancel, created_at')
      .eq('guardian_id', user.id)
      .order('created_at', { ascending: false })

    if (data) {
      const withRides = await Promise.all(data.map(async m => {
        if (!m.member_id) return { ...m, active_ride: null }
        const { data: ride } = await supabase
          .from('rides')
          .select(`
            id, status, pickup_address, dropoff_address, updated_at,
            driver:profiles!driver_id(full_name)
          `)
          .eq('passenger_id', m.member_id)
          .in('status', ['accepted', 'in_progress'])
          .order('created_at', { ascending: false })
          .limit(1)
          .single()
        const r = ride as any
        return {
          ...m,
          active_ride: ride ? {
            id: r.id,
            status: r.status,
            pickup_address: r.pickup_address,
            dropoff_address: r.dropoff_address,
            driver_name: Array.isArray(r.driver) ? r.driver[0]?.full_name : r.driver?.full_name || 'Motorista',
            updated_at: r.updated_at,
          } : null,
        }
      }))
      setMembers(withRides)
    }
    setLoading(false)
  }

  const handleAdd = async () => {
    setError('')
    if (!addName.trim()) { setError('Informe o nome'); return }
    setAdding(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    let memberId: string | null = null
    if (addEmail.trim()) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', addEmail.trim().toLowerCase())
        .single()
      if (profile) memberId = profile.id
    }

    const { error: err } = await supabase.from('family_members').insert({
      guardian_id: user.id,
      member_id: memberId,
      member_name: addName.trim(),
      member_phone: addPhone.trim() || null,
      can_cancel: addCancel,
    })

    if (err) {
      setError('Erro ao adicionar. Verifique se ja nao existe.')
    } else {
      setShowAdd(false)
      setAddEmail(''); setAddName(''); setAddPhone('')
      loadMembers()
    }
    setAdding(false)
  }

  const handleRemove = async (id: string) => {
    const supabase = createClient()
    await supabase.from('family_members').delete().eq('id', id)
    setMembers(prev => prev.filter(m => m.id !== id))
  }

  const handleCancelRide = async (rideId: string) => {
    await fetch(`/api/v1/rides/${rideId}/cancel`, { method: 'POST', body: JSON.stringify({ reason: 'Cancelado pelo responsavel familiar' }) })
    loadMembers()
  }

  const statusLabel: Record<string, string> = { accepted: 'Motorista a caminho', in_progress: 'Em viagem' }
  const statusColor: Record<string, string> = { accepted: '#f59e0b', in_progress: '#22c55e' }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="px-5 pt-14 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="w-9 h-9 rounded-full bg-muted flex items-center justify-center ios-press">
            <svg className="w-4 h-4 text-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-[17px] font-bold text-foreground">Modo Familia</h1>
            <p className="text-[12px] text-muted-foreground">Monitore as corridas dos seus</p>
          </div>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-foreground text-background text-[13px] font-bold ios-press"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Adicionar
        </button>
      </div>

      {/* Informativo */}
      <div className="mx-5 mb-4 bg-blue-500/10 border border-blue-500/20 rounded-[18px] p-4 flex gap-3">
        <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
        <p className="text-[12px] text-blue-700 dark:text-blue-300 leading-relaxed">
          Voce sera notificado quando um familiar iniciar uma corrida e pode acompanhar em tempo real e cancelar se necessario.
        </p>
      </div>

      {/* Modal adicionar */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-end">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowAdd(false)} />
          <div className="relative w-full bg-card rounded-t-[28px] p-6 pb-10 flex flex-col gap-4">
            <div className="w-10 h-1 bg-muted rounded-full mx-auto mb-2" />
            <h2 className="text-[17px] font-bold text-foreground">Adicionar familiar</h2>
            {error && <p className="text-[13px] text-red-500 bg-red-500/10 px-3 py-2 rounded-xl">{error}</p>}
            {[
              { label: 'Nome *', value: addName, setter: setAddName, placeholder: 'Ex: Maria (minha mae)', type: 'text' },
              { label: 'Email no Uppi (opcional)', value: addEmail, setter: setAddEmail, placeholder: 'email@exemplo.com', type: 'email' },
              { label: 'Telefone (opcional)', value: addPhone, setter: setAddPhone, placeholder: '+55 11 99999-9999', type: 'tel' },
            ].map(f => (
              <div key={f.label}>
                <label className="block text-[12px] font-bold text-muted-foreground uppercase tracking-wide mb-1.5">{f.label}</label>
                <input
                  type={f.type}
                  value={f.value}
                  onChange={e => f.setter(e.target.value)}
                  placeholder={f.placeholder}
                  className="w-full h-12 px-4 bg-muted rounded-[14px] text-[15px] text-foreground outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            ))}
            <button
              type="button"
              onClick={() => setAddCancel(p => !p)}
              className="flex items-center justify-between px-4 py-3 rounded-[14px] bg-muted ios-press"
            >
              <div>
                <p className="text-[14px] font-bold text-foreground text-left">Permitir cancelar corridas</p>
                <p className="text-[12px] text-muted-foreground text-left">Voce pode cancelar as corridas deste familiar</p>
              </div>
              <div className="w-11 h-6 rounded-full relative transition-all" style={{ backgroundColor: addCancel ? 'var(--primary)' : 'var(--muted-foreground)40' }}>
                <div className="absolute top-[2px] w-5 h-5 bg-white rounded-full shadow transition-all" style={{ left: addCancel ? '22px' : '2px' }} />
              </div>
            </button>
            <button
              onClick={handleAdd}
              disabled={adding}
              className="w-full h-12 rounded-full bg-foreground text-background font-bold text-[15px] ios-press disabled:opacity-50"
            >
              {adding ? 'Adicionando...' : 'Adicionar familiar'}
            </button>
          </div>
        </div>
      )}

      <div className="px-5 pb-28 flex flex-col gap-3">
        {loading ? (
          [1, 2].map(i => <div key={i} className="h-24 bg-muted rounded-[20px] animate-pulse" />)
        ) : members.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <svg className="w-8 h-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <p className="text-[15px] font-bold text-foreground">Nenhum familiar ainda</p>
            <p className="text-[13px] text-muted-foreground text-center">Adicione filhos, pais ou qualquer pessoa que voce queira monitorar</p>
          </div>
        ) : members.map(m => (
          <div key={m.id} className="bg-card border border-border rounded-[20px] overflow-hidden">
            {m.active_ride && (
              <div className="px-4 py-2 flex items-center gap-2" style={{ backgroundColor: `${statusColor[m.active_ride.status]}15` }}>
                <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: statusColor[m.active_ride.status] }} />
                <span className="text-[12px] font-bold" style={{ color: statusColor[m.active_ride.status] }}>
                  {statusLabel[m.active_ride.status]}
                </span>
              </div>
            )}
            <div className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-[17px] font-bold text-primary">{m.member_name.charAt(0)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-bold text-foreground">{m.member_name}</p>
                  {m.member_phone && <p className="text-[12px] text-muted-foreground">{m.member_phone}</p>}
                  {!m.member_id && <p className="text-[11px] text-orange-500 font-semibold mt-0.5">Usuario nao encontrado no Uppi</p>}
                </div>
                <button onClick={() => handleRemove(m.id)} className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center ios-press flex-shrink-0">
                  <svg className="w-3.5 h-3.5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {m.active_ride && (
                <div className="mt-3 bg-muted/50 rounded-[14px] p-3">
                  <div className="flex flex-col gap-1 mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                      <p className="text-[12px] text-foreground truncate">{m.active_ride.pickup_address}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
                      <p className="text-[12px] text-foreground truncate">{m.active_ride.dropoff_address}</p>
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground mb-2">Motorista: {m.active_ride.driver_name}</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => router.push(`/uppi/ride/${m.active_ride!.id}/tracking`)}
                      className="flex-1 h-9 rounded-xl bg-foreground text-background text-[12px] font-bold ios-press"
                    >
                      Ver no mapa
                    </button>
                    {m.can_cancel && (
                      <button
                        onClick={() => handleCancelRide(m.active_ride!.id)}
                        className="flex-1 h-9 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-[12px] font-bold ios-press"
                      >
                        Cancelar corrida
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <BottomNavigation />
    </div>
  )
}
