'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, TrendingUp, MapPin, Clock, Target, ChevronRight } from 'lucide-react'
import { iosToast } from '@/lib/utils/ios-toast'
import { EmptyState } from '@/components/empty-state'

interface DayEarning {
  day: string
  label: string
  amount: number
  rides: number
}

interface HourSlot {
  hour: number
  label: string
  demand: 'low' | 'medium' | 'high' | 'peak'
  avgPrice: number
}

interface HotZone {
  name: string
  demand: 'high' | 'peak'
  distance: string
}

export default function DriverEarningsPage() {
  const router = useRouter()
  const supabase = createClient()

  const [weekEarnings, setWeekEarnings] = useState<DayEarning[]>([])
  const [totalWeek, setTotalWeek] = useState(0)
  const [totalRidesWeek, setTotalRidesWeek] = useState(0)
  const [avgPerRide, setAvgPerRide] = useState(0)
  const [dailyGoal, setDailyGoal] = useState(200)
  const [todayEarnings, setTodayEarnings] = useState(0)
  const [hourlyDemand, setHourlyDemand] = useState<HourSlot[]>([])
  const [hotZones, setHotZones] = useState<HotZone[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/onboarding/splash'); return }

      const now = new Date()
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

      const { data: rides } = await supabase
        .from('rides')
        .select('final_price, completed_at, status')
        .eq('driver_id', user.id)
        .eq('status', 'completed')
        .gte('completed_at', weekAgo.toISOString())
        .order('completed_at', { ascending: true })

      const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab']
      const days: DayEarning[] = []
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
        const dayKey = d.toISOString().split('T')[0]
        const dayRides = rides?.filter(r => r.completed_at?.startsWith(dayKey)) || []
        const amount = dayRides.reduce((s, r) => s + (r.final_price || 0), 0)
        days.push({ day: dayKey, label: dayNames[d.getDay()], amount, rides: dayRides.length })
      }

      setWeekEarnings(days)
      const total = days.reduce((s, d) => s + d.amount, 0)
      const totalR = days.reduce((s, d) => s + d.rides, 0)
      setTotalWeek(total)
      setTotalRidesWeek(totalR)
      setAvgPerRide(totalR > 0 ? total / totalR : 0)
      setTodayEarnings(days[days.length - 1]?.amount || 0)

      const slots: HourSlot[] = []
      for (let h = 6; h <= 23; h++) {
        let demand: HourSlot['demand'] = 'low'
        let avgPrice = 15
        if ((h >= 7 && h <= 9) || (h >= 17 && h <= 19)) { demand = 'peak'; avgPrice = 28 }
        else if ((h >= 11 && h <= 13) || (h >= 21 && h <= 23)) { demand = 'high'; avgPrice = 22 }
        else if (h >= 10 && h <= 16) { demand = 'medium'; avgPrice = 18 }
        slots.push({ hour: h, label: `${h}:00`, demand, avgPrice })
      }
      setHourlyDemand(slots)

      // Hot zones reais do banco
      const { data: zones } = await supabase
        .from('hot_zones')
        .select('name, danger_level, latitude, longitude')
        .eq('is_active', true)
        .order('danger_level', { ascending: false })
        .limit(6)

      if (zones && zones.length > 0) {
        // Calcular distância aproximada caso tenha geolocalização
        let userLat: number | null = null
        let userLng: number | null = null
        try {
          const pos = await new Promise<GeolocationPosition>((res, rej) =>
            navigator.geolocation.getCurrentPosition(res, rej, { timeout: 3000 })
          )
          userLat = pos.coords.latitude
          userLng = pos.coords.longitude
        } catch { /* sem GPS, ok */ }

        setHotZones(zones.map(z => {
          let distance = '—'
          if (userLat !== null && userLng !== null) {
            const R = 6371
            const dLat = (z.latitude - userLat) * Math.PI / 180
            const dLng = (z.longitude - userLng) * Math.PI / 180
            const a = Math.sin(dLat / 2) ** 2 + Math.cos(userLat * Math.PI / 180) * Math.cos(z.latitude * Math.PI / 180) * Math.sin(dLng / 2) ** 2
            const km = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
            distance = `${km.toFixed(1)} km`
          }
          return {
            name: z.name,
            demand: (z.danger_level === 'high' ? 'peak' : z.danger_level === 'medium' ? 'high' : 'high') as 'high' | 'peak',
            distance,
          }
        }))
      } else {
        // fallback
        setHotZones([
          { name: 'Centro / Av. Paulista', demand: 'peak', distance: '—' },
          { name: 'Aeroporto Congonhas', demand: 'high', distance: '—' },
        ])
      }
    } catch (error) {
      console.error('Error loading earnings:', error)
    } finally {
      setLoading(false)
    }
  }

  const maxDayAmount = Math.max(...weekEarnings.map(d => d.amount), 1)
  const goalProgress = Math.min((todayEarnings / dailyGoal) * 100, 100)

  const getDemandColor = (demand: string) => {
    switch (demand) {
      case 'peak': return 'bg-red-500'
      case 'high': return 'bg-amber-500'
      case 'medium': return 'bg-blue-400'
      default: return 'bg-neutral-300 dark:bg-neutral-600'
    }
  }

  const getDemandLabel = (demand: string) => {
    switch (demand) {
      case 'peak': return 'Pico'
      case 'high': return 'Alta'
      case 'medium': return 'Media'
      default: return 'Baixa'
    }
  }

  if (loading) {
    return (
      <div className="h-dvh bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-[2.5px] border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="h-dvh overflow-y-auto bg-background pb-8 ios-scroll">
      {/* Header */}
      <header className="bg-card/80 ios-blur border-b border-border/40 sticky top-0 z-30">
        <div className="px-5 pt-safe-offset-4 pb-3 flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-secondary ios-press"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" strokeWidth={2.5} />
          </button>
          <h1 className="text-[20px] font-bold text-foreground tracking-tight">Seus Ganhos</h1>
        </div>
      </header>

      <main className="px-5 py-5 max-w-lg mx-auto">
        {/* Weekly Total Card */}
        <div className="bg-emerald-500 rounded-[24px] p-5 mb-5 shadow-lg shadow-emerald-500/20 animate-ios-fade-up">
          <p className="text-[13px] font-semibold text-white/70 uppercase tracking-wider">Total da semana</p>
          <p className="text-[36px] font-black text-white tracking-tight leading-none mt-1">
            R$ {totalWeek.toFixed(2)}
          </p>
          <div className="flex items-center gap-4 mt-3">
            <div className="flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-white/70" strokeWidth={2.5} />
              <span className="text-[13px] text-white/80 font-semibold">{totalRidesWeek} corridas</span>
            </div>
            <span className="text-white/40">{'|'}</span>
            <span className="text-[13px] text-white/80 font-semibold">
              Media R$ {avgPerRide.toFixed(2)}/corrida
            </span>
          </div>
        </div>

        {/* Daily Goal */}
        <div className="bg-card rounded-[20px] p-5 mb-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.3)] animate-ios-fade-up" style={{ animationDelay: '80ms' }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <Target className="w-5 h-5 text-blue-500" strokeWidth={2.5} />
              <span className="text-[15px] font-bold text-foreground">Meta diaria</span>
            </div>
            <span className="text-[15px] font-bold text-foreground">
              R$ {todayEarnings.toFixed(0)} / R$ {dailyGoal}
            </span>
          </div>
          <div className="h-3 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{
                width: `${goalProgress}%`,
                background: goalProgress >= 100
                  ? 'linear-gradient(90deg, #10b981, #22c55e)'
                  : goalProgress >= 60
                    ? 'linear-gradient(90deg, #3b82f6, #6366f1)'
                    : 'linear-gradient(90deg, #f59e0b, #f97316)',
              }}
            />
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-[12px] text-muted-foreground">{goalProgress.toFixed(0)}% concluido</span>
            {goalProgress < 100 ? (
              <span className="text-[12px] text-muted-foreground">
                Faltam R$ {(dailyGoal - todayEarnings).toFixed(0)}
              </span>
            ) : (
              <span className="text-[12px] font-bold text-emerald-500">Meta atingida!</span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
            <span className="text-[12px] text-muted-foreground shrink-0">Ajustar meta:</span>
            {[100, 150, 200, 300].map(val => (
              <button
                key={val}
                type="button"
                onClick={() => setDailyGoal(val)}
                className={`px-3 py-1.5 rounded-lg text-[12px] font-bold ios-press transition-colors ${
                  dailyGoal === val ? 'bg-blue-500 text-white' : 'bg-secondary text-muted-foreground'
                }`}
              >
                R${val}
              </button>
            ))}
          </div>
        </div>

        {/* Weekly Chart */}
        <div className="bg-card rounded-[20px] p-5 mb-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.3)] animate-ios-fade-up" style={{ animationDelay: '160ms' }}>
          <p className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider mb-4">Ganhos por dia</p>
          <div className="flex items-end gap-2 h-32">
            {weekEarnings.map((day, i) => {
              const height = maxDayAmount > 0 ? (day.amount / maxDayAmount) * 100 : 0
              const isToday = i === weekEarnings.length - 1
              return (
                <div key={day.day} className="flex-1 flex flex-col items-center gap-1.5">
                  <span className="text-[11px] font-bold text-foreground">
                    {day.amount > 0 ? `R$${day.amount.toFixed(0)}` : '-'}
                  </span>
                  <div className="w-full flex justify-center">
                    <div
                      className={`w-full max-w-[32px] rounded-lg transition-all duration-500 ${
                        isToday
                          ? 'bg-emerald-500 shadow-sm shadow-emerald-500/30'
                          : day.amount > 0
                            ? 'bg-blue-400/80 dark:bg-blue-500/60'
                            : 'bg-secondary'
                      }`}
                      style={{ height: `${Math.max(height, 8)}%` }}
                    />
                  </div>
                  <span className={`text-[11px] font-semibold ${isToday ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}>
                    {day.label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Hourly Demand Heatmap */}
        <div className="bg-card rounded-[20px] p-5 mb-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.3)] animate-ios-fade-up" style={{ animationDelay: '240ms' }}>
          <div className="flex items-center gap-2.5 mb-1">
            <Clock className="w-5 h-5 text-blue-500" strokeWidth={2.5} />
            <span className="text-[15px] font-bold text-foreground">Previsao de demanda</span>
          </div>
          <p className="text-[12px] text-muted-foreground mb-4">Melhores horarios para ganhar mais</p>

          <div className="flex items-center gap-3 mb-3">
            {(['low', 'medium', 'high', 'peak'] as const).map(d => (
              <div key={d} className="flex items-center gap-1.5">
                <div className={`w-3 h-3 rounded-sm ${getDemandColor(d)}`} />
                <span className="text-[11px] text-muted-foreground">{getDemandLabel(d)}</span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-9 gap-1">
            {hourlyDemand.map(slot => {
              const isNow = new Date().getHours() === slot.hour
              return (
                <div key={slot.hour} className="flex flex-col items-center gap-1">
                  <div
                    className={`w-full aspect-square rounded-lg ${getDemandColor(slot.demand)} ${
                      isNow ? 'ring-2 ring-foreground ring-offset-1 ring-offset-background' : ''
                    } transition-all`}
                    title={`${slot.label} - ${getDemandLabel(slot.demand)} - ~R$${slot.avgPrice}`}
                  />
                  <span className={`text-[9px] ${isNow ? 'font-bold text-foreground' : 'text-muted-foreground'}`}>
                    {slot.hour}h
                  </span>
                </div>
              )
            })}
          </div>

          <div className="mt-3 pt-3 border-t border-border">
            <p className="text-[12px] text-muted-foreground">
              Horarios de pico: 7-9h e 17-19h (media R$28/corrida)
            </p>
          </div>
        </div>

        {/* Hot Zones */}
        <div className="bg-card rounded-[20px] p-5 mb-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.3)] animate-ios-fade-up" style={{ animationDelay: '320ms' }}>
          <div className="flex items-center gap-2.5 mb-1">
            <MapPin className="w-5 h-5 text-red-500" strokeWidth={2.5} />
            <span className="text-[15px] font-bold text-foreground">Zonas quentes agora</span>
          </div>
          <p className="text-[12px] text-muted-foreground mb-4">Regioes com mais demanda perto de voce</p>

          <div className="flex flex-col gap-2">
            {hotZones.map((zone) => (
              <button
                key={zone.name}
                type="button"
                className="flex items-center gap-3.5 px-4 py-3 bg-secondary/50 rounded-2xl ios-press"
              >
                <div className={`w-3 h-3 rounded-full shrink-0 ${zone.demand === 'peak' ? 'bg-red-500 animate-pulse' : 'bg-amber-500'}`} />
                <div className="flex-1 text-left min-w-0">
                  <p className="text-[14px] font-semibold text-foreground truncate">{zone.name}</p>
                  <p className="text-[12px] text-muted-foreground">{zone.distance} de distancia</p>
                </div>
                <span className={`text-[11px] font-bold px-2 py-1 rounded-md shrink-0 ${
                  zone.demand === 'peak'
                    ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                    : 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                }`}>
                  {getDemandLabel(zone.demand)}
                </span>
                <ChevronRight className="w-4 h-4 text-muted-foreground/40 shrink-0" strokeWidth={2.5} />
              </button>
            ))}
          </div>
        </div>

        {/* Withdraw button */}
        <button
          type="button"
          onClick={() => router.push('/uppi/wallet')}
          className="w-full h-[52px] bg-emerald-500 text-white font-bold text-[16px] rounded-2xl ios-press shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
          Sacar Ganhos
        </button>
      </main>
    </div>
  )
}
