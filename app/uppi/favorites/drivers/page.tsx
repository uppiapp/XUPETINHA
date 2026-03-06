'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { BottomNavigation } from '@/components/bottom-navigation'

interface FavoriteDriver {
  id: string
  driver_id: string
  agreed_price: number | null
  notes: string | null
  created_at: string
  driver_profile: {
    rating: number
    total_rides: number
    vehicle_brand: string
    vehicle_model: string
    vehicle_plate: string
    trust_score: number
    is_available: boolean
  }
  profile: {
    full_name: string
    avatar_url: string | null
  }
}

export default function FavoriteDriversPage() {
  const router = useRouter()
  const [favorites, setFavorites] = useState<FavoriteDriver[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editPrice, setEditPrice] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return router.push('/login')
      const { data } = await supabase
        .from('favorite_drivers')
        .select(`
          id, driver_id, agreed_price, notes, created_at,
          driver_profile:driver_profiles!driver_id(rating, total_rides, vehicle_brand, vehicle_model, vehicle_plate, trust_score, is_available),
          profile:profiles!driver_id(full_name, avatar_url)
        `)
        .eq('passenger_id', user.id)
        .order('created_at', { ascending: false })
      if (data) setFavorites(data.map(f => ({
        ...f,
        driver_profile: Array.isArray(f.driver_profile) ? f.driver_profile[0] : f.driver_profile,
        profile: Array.isArray(f.profile) ? f.profile[0] : f.profile,
      })))
      setLoading(false)
    })
  }, [router])

  const handleRemove = async (id: string) => {
    const supabase = createClient()
    await supabase.from('favorite_drivers').delete().eq('id', id)
    setFavorites(prev => prev.filter(f => f.id !== id))
  }

  const startEdit = (f: FavoriteDriver) => {
    setEditingId(f.id)
    setEditPrice(f.agreed_price?.toString() || '')
    setEditNotes(f.notes || '')
  }

  const handleSave = async (id: string) => {
    setSaving(true)
    const supabase = createClient()
    await supabase.from('favorite_drivers').update({
      agreed_price: editPrice ? parseFloat(editPrice) : null,
      notes: editNotes || null,
    }).eq('id', id)
    setFavorites(prev => prev.map(f => f.id === id ? { ...f, agreed_price: editPrice ? parseFloat(editPrice) : null, notes: editNotes || null } : f))
    setEditingId(null)
    setSaving(false)
  }

  const handleCallNow = (f: FavoriteDriver) => {
    const params = new URLSearchParams()
    params.set('preferred_driver', f.driver_id)
    if (f.agreed_price) params.set('price', f.agreed_price.toString())
    router.push(`/uppi/ride/route-input?${params.toString()}`)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="px-5 pt-14 pb-4 flex items-center gap-3">
        <button onClick={() => router.back()} className="w-9 h-9 rounded-full bg-muted flex items-center justify-center ios-press">
          <svg className="w-4 h-4 text-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="text-[17px] font-bold text-foreground">Motoristas Favoritos</h1>
          <p className="text-[12px] text-muted-foreground">Chame diretamente com preco combinado</p>
        </div>
      </div>

      <div className="px-5 pb-28">
        {loading ? (
          <div className="flex flex-col gap-3">
            {[1, 2].map(i => (
              <div key={i} className="h-28 bg-muted rounded-[20px] animate-pulse" />
            ))}
          </div>
        ) : favorites.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <svg className="w-8 h-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
            <p className="text-[15px] font-bold text-foreground">Nenhum favorito ainda</p>
            <p className="text-[13px] text-muted-foreground text-center">Apos uma corrida, voce pode salvar o motorista como favorito e combinar um preco fixo</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {favorites.map(f => (
              <div key={f.id} className="bg-card border border-border rounded-[20px] overflow-hidden">
                {/* Status online */}
                {f.driver_profile?.is_available && (
                  <div className="bg-green-500/10 border-b border-green-500/20 px-4 py-1.5 flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-[11px] font-bold text-green-600">Online agora — disponivel</span>
                  </div>
                )}
                <div className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    {f.profile?.avatar_url ? (
                      <img src={f.profile.avatar_url} alt="" className="w-12 h-12 rounded-full object-cover" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                        <span className="text-[18px] font-bold text-muted-foreground">{f.profile?.full_name?.charAt(0) || '?'}</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-[15px] font-bold text-foreground">{f.profile?.full_name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <div className="flex items-center gap-1">
                          <svg className="w-3 h-3 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                          </svg>
                          <span className="text-[12px] font-semibold text-foreground">{f.driver_profile?.rating?.toFixed(1)}</span>
                        </div>
                        <span className="text-[12px] text-muted-foreground">{f.driver_profile?.total_rides} corridas</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {f.driver_profile?.vehicle_brand} {f.driver_profile?.vehicle_model} • {f.driver_profile?.vehicle_plate}
                      </p>
                    </div>
                    <div className="text-right">
                      {f.agreed_price ? (
                        <>
                          <p className="text-[11px] text-muted-foreground">Preco fixo</p>
                          <p className="text-[18px] font-bold text-green-600">R$ {f.agreed_price.toFixed(2)}</p>
                        </>
                      ) : (
                        <p className="text-[11px] text-muted-foreground">Sem preco fixo</p>
                      )}
                    </div>
                  </div>

                  {f.notes && editingId !== f.id && (
                    <p className="text-[12px] text-muted-foreground bg-muted/50 rounded-xl px-3 py-2 mb-3 italic">"{f.notes}"</p>
                  )}

                  {editingId === f.id && (
                    <div className="bg-muted/50 rounded-xl p-3 mb-3 flex flex-col gap-2">
                      <div>
                        <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Preco fixo combinado (R$)</label>
                        <input
                          type="number"
                          value={editPrice}
                          onChange={e => setEditPrice(e.target.value)}
                          placeholder="Ex: 25.00"
                          className="w-full mt-1 h-10 px-3 bg-background rounded-xl text-[14px] font-bold text-foreground outline-none border border-border focus:border-primary"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Observacao</label>
                        <input
                          type="text"
                          value={editNotes}
                          onChange={e => setEditNotes(e.target.value)}
                          placeholder="Ex: Pontual, musica boa..."
                          className="w-full mt-1 h-10 px-3 bg-background rounded-xl text-[14px] text-foreground outline-none border border-border focus:border-primary"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => setEditingId(null)} className="flex-1 h-9 rounded-xl bg-muted text-[13px] font-semibold text-foreground ios-press">Cancelar</button>
                        <button onClick={() => handleSave(f.id)} disabled={saving} className="flex-1 h-9 rounded-xl bg-foreground text-background text-[13px] font-bold ios-press disabled:opacity-50">
                          {saving ? 'Salvando...' : 'Salvar'}
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleCallNow(f)}
                      disabled={!f.driver_profile?.is_available}
                      className="flex-1 h-10 rounded-[12px] font-bold text-[13px] ios-press disabled:opacity-40 transition-all"
                      style={{ backgroundColor: f.driver_profile?.is_available ? '#22c55e' : 'var(--muted)', color: f.driver_profile?.is_available ? 'white' : 'var(--muted-foreground)' }}
                    >
                      {f.driver_profile?.is_available ? 'Chamar agora' : 'Offline'}
                    </button>
                    <button onClick={() => startEdit(f)} className="w-10 h-10 rounded-[12px] bg-muted flex items-center justify-center ios-press">
                      <svg className="w-4 h-4 text-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                    <button onClick={() => handleRemove(f.id)} className="w-10 h-10 rounded-[12px] bg-red-500/10 flex items-center justify-center ios-press">
                      <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <BottomNavigation />
    </div>
  )
}
