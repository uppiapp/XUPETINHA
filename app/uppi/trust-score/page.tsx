'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { BottomNavigation } from '@/components/bottom-navigation'

interface TrustData {
  full_name: string
  avatar_url: string | null
  trust_score: number
  trust_level: string
  total_rides: number
  rating: number
  cancellation_count: number
  punctuality_rate: number
  is_driver: boolean
  member_since: string
}

const LEVEL_CONFIG: Record<string, { label: string; color: string; bg: string; desc: string }> = {
  iniciante: { label: 'Iniciante', color: '#94a3b8', bg: '#94a3b810', desc: 'Novo no Uppi — sem historico suficiente' },
  confiavel: { label: 'Confiavel', color: '#f59e0b', bg: '#f59e0b10', desc: 'Historico positivo, poucas ocorrencias' },
  verificado: { label: 'Verificado', color: '#3b82f6', bg: '#3b82f610', desc: 'Identidade confirmada e boa reputacao' },
  elite: { label: 'Elite', color: '#22c55e', bg: '#22c55e10', desc: 'Top 10% do Uppi — excelencia comprovada' },
}

function ScoreMeter({ score }: { score: number }) {
  const color = score >= 80 ? '#22c55e' : score >= 60 ? '#3b82f6' : score >= 40 ? '#f59e0b' : '#ef4444'
  const r = 70
  const circumference = 2 * Math.PI * r
  const half = circumference / 2
  const offset = half - (score / 100) * half

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-48 h-28 overflow-hidden">
        <svg width="192" height="192" className="absolute -top-24 left-0" style={{ transform: 'rotate(180deg)' }}>
          <circle cx="96" cy="96" r={r} fill="none" stroke="var(--muted)" strokeWidth="12" strokeDasharray={`${half} ${half}`} strokeLinecap="round" />
          <circle
            cx="96" cy="96" r={r} fill="none"
            stroke={color} strokeWidth="12"
            strokeDasharray={`${half - offset} ${half + offset}`}
            strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 1.2s cubic-bezier(0.4,0,0.2,1), stroke 0.5s ease' }}
          />
        </svg>
        <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center">
          <span className="text-[42px] font-black tabular-nums" style={{ color }}>{score}</span>
          <span className="text-[12px] font-semibold text-muted-foreground -mt-1">/ 100</span>
        </div>
      </div>
    </div>
  )
}

export default function TrustScorePage() {
  const router = useRouter()
  const params = useSearchParams()
  const targetId = params.get('user_id')

  const [data, setData] = useState<TrustData | null>(null)
  const [loading, setLoading] = useState(true)
  const [isOwn, setIsOwn] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return router.push('/login')
      const id = targetId || user.id
      setIsOwn(!targetId || targetId === user.id)

      const [{ data: profile }, { data: dp }] = await Promise.all([
        supabase.from('profiles').select('full_name, avatar_url, trust_score, trust_level, user_type, created_at').eq('id', id).single(),
        supabase.from('driver_profiles').select('rating, total_rides, cancellation_count, punctuality_rate, trust_score').eq('id', id).single(),
      ])

      if (profile) {
        const isDriver = profile.user_type === 'driver'
        setData({
          full_name: profile.full_name || 'Usuario',
          avatar_url: profile.avatar_url,
          trust_score: (isDriver ? dp?.trust_score : profile.trust_score) ?? 50,
          trust_level: profile.trust_level || 'iniciante',
          total_rides: dp?.total_rides ?? 0,
          rating: dp?.rating ?? 5,
          cancellation_count: dp?.cancellation_count ?? 0,
          punctuality_rate: dp?.punctuality_rate ?? 100,
          is_driver: isDriver,
          member_since: new Date(profile.created_at).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
        })
      }
      setLoading(false)
    })
  }, [targetId, router])

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
    </div>
  )
  if (!data) return null

  const level = LEVEL_CONFIG[data.trust_level] || LEVEL_CONFIG.iniciante

  const metrics = [
    { label: 'Avaliacao media', value: data.rating.toFixed(1), icon: '★', color: '#f59e0b', show: data.is_driver },
    { label: 'Corridas realizadas', value: data.total_rides.toString(), icon: '🚗', color: '#3b82f6', show: true },
    { label: 'Cancelamentos', value: data.cancellation_count.toString(), icon: '✕', color: data.cancellation_count > 5 ? '#ef4444' : '#22c55e', show: data.is_driver },
    { label: 'Pontualidade', value: `${data.punctuality_rate.toFixed(0)}%`, icon: '⏱', color: data.punctuality_rate >= 90 ? '#22c55e' : '#f59e0b', show: data.is_driver },
  ].filter(m => m.show)

  const factors = [
    { label: 'Avaliacao positiva dos usuarios', value: Math.min(data.rating * 10, 40), max: 40, color: '#22c55e' },
    { label: 'Corridas sem incidentes', value: Math.min(data.total_rides * 0.5, 30), max: 30, color: '#3b82f6' },
    { label: 'Pontualidade', value: data.is_driver ? data.punctuality_rate * 0.2 : 20, max: 20, color: '#f59e0b' },
    { label: 'Sem cancelamentos', value: Math.max(0, 10 - data.cancellation_count), max: 10, color: '#8b5cf6' },
  ]

  return (
    <div className="min-h-screen bg-background">
      <div className="px-5 pt-14 pb-4 flex items-center gap-3">
        <button onClick={() => router.back()} className="w-9 h-9 rounded-full bg-muted flex items-center justify-center ios-press">
          <svg className="w-4 h-4 text-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="text-[17px] font-bold text-foreground">Score de Confianca</h1>
          <p className="text-[12px] text-muted-foreground">{isOwn ? 'Sua reputacao no Uppi' : `Reputacao de ${data.full_name}`}</p>
        </div>
      </div>

      <div className="px-5 pb-28 flex flex-col gap-4">
        {/* Perfil + score */}
        <div className="bg-card border border-border rounded-[24px] p-6 flex flex-col items-center gap-4">
          {data.avatar_url ? (
            <img src={data.avatar_url} alt="" className="w-16 h-16 rounded-full object-cover" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-[24px] font-bold text-primary">{data.full_name.charAt(0)}</span>
            </div>
          )}
          <div className="text-center">
            <p className="text-[17px] font-bold text-foreground">{data.full_name}</p>
            <p className="text-[12px] text-muted-foreground">Membro desde {data.member_since}</p>
          </div>

          <ScoreMeter score={Math.round(data.trust_score)} />

          {/* Badge de nivel */}
          <div className="flex items-center gap-2 px-4 py-2 rounded-full" style={{ backgroundColor: level.bg, border: `1px solid ${level.color}30` }}>
            <svg className="w-4 h-4" style={{ color: level.color }} fill="currentColor" viewBox="0 0 24 24">
              <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span className="text-[13px] font-bold" style={{ color: level.color }}>{level.label}</span>
          </div>
          <p className="text-[12px] text-muted-foreground text-center">{level.desc}</p>
        </div>

        {/* Metricas */}
        {metrics.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            {metrics.map(m => (
              <div key={m.label} className="bg-card border border-border rounded-[20px] p-4 text-center">
                <p className="text-[24px] font-black" style={{ color: m.color }}>{m.value}</p>
                <p className="text-[11px] text-muted-foreground font-semibold mt-0.5">{m.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Fatores do score */}
        <div className="bg-card border border-border rounded-[24px] p-5">
          <p className="text-[13px] font-bold text-muted-foreground uppercase tracking-wide mb-4">Como e calculado</p>
          <div className="flex flex-col gap-4">
            {factors.map(f => (
              <div key={f.label}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[13px] font-semibold text-foreground">{f.label}</span>
                  <span className="text-[13px] font-bold tabular-nums" style={{ color: f.color }}>
                    {Math.round(f.value)}/{f.max}
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${(f.value / f.max) * 100}%`, backgroundColor: f.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Proximo nivel */}
        {data.trust_level !== 'elite' && isOwn && (
          <div className="bg-card border border-border rounded-[24px] p-5">
            <p className="text-[13px] font-bold text-muted-foreground uppercase tracking-wide mb-3">Como subir de nivel</p>
            <div className="flex flex-col gap-2">
              {[
                { text: 'Complete mais corridas sem cancelamento', done: data.total_rides >= 10 },
                { text: 'Mantenha avaliacao acima de 4.5', done: data.rating >= 4.5 },
                { text: 'Verifique sua identidade em Configuracoes', done: data.trust_level !== 'iniciante' },
              ].map(item => (
                <div key={item.text} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: item.done ? '#22c55e20' : 'var(--muted)' }}>
                    {item.done ? (
                      <svg className="w-3 h-3 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <div className="w-2 h-2 rounded-full bg-muted-foreground/40" />
                    )}
                  </div>
                  <p className="text-[13px] text-foreground" style={{ textDecoration: item.done ? 'line-through' : 'none', opacity: item.done ? 0.5 : 1 }}>
                    {item.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <BottomNavigation />
    </div>
  )
}
