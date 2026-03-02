'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

interface VehicleType {
  id: string
  label: string
  description: string
  multiplier: number
  icon: string
  eta: number
  features: string[]
}

const VEHICLE_TYPES: VehicleType[] = [
  {
    id: 'economy',
    label: 'Econômico',
    description: 'Carros compactos e acessíveis',
    multiplier: 1.0,
    icon: 'economy',
    eta: 4,
    features: ['Ar-condicionado', 'Até 4 passageiros'],
  },
  {
    id: 'comfort',
    label: 'Conforto',
    description: 'Sedans e hatchbacks premium',
    multiplier: 1.35,
    icon: 'comfort',
    eta: 6,
    features: ['Ar-condicionado', 'Assentos confortáveis', 'Até 4 passageiros'],
  },
  {
    id: 'premium',
    label: 'Premium',
    description: 'Veículos de alto padrão',
    multiplier: 1.8,
    icon: 'premium',
    eta: 9,
    features: ['Veículo premium', 'Motorista profissional', 'Até 4 passageiros'],
  },
  {
    id: 'suv',
    label: 'SUV',
    description: 'SUVs espaçosos para grupos',
    multiplier: 2.1,
    icon: 'suv',
    eta: 8,
    features: ['Até 6 passageiros', 'Malas grandes', 'Ar-condicionado duplo'],
  },
  {
    id: 'moto',
    label: 'Moto',
    description: 'Rápido para zonas congestionadas',
    multiplier: 0.7,
    icon: 'moto',
    eta: 2,
    features: ['Ultra-rápido', 'Ideal para trânsito', 'Apenas 1 passageiro'],
  },
]

const BASE_PRICE_PER_KM = 2.4
const BASE_PRICE_PER_MIN = 0.35
const BASE_FARE = 5.5

function calcPrice(distanceKm: number, durationMin: number, multiplier: number) {
  const raw = BASE_FARE + distanceKm * BASE_PRICE_PER_KM + durationMin * BASE_PRICE_PER_MIN
  return Math.round(raw * multiplier * 100) / 100
}

function VehicleIcon({ type }: { type: string }) {
  const baseClass = 'w-7 h-7'
  if (type === 'moto') {
    return (
      <svg className={baseClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <circle cx="5" cy="17" r="3" />
        <circle cx="19" cy="17" r="3" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 17h2l3-9h5l2 5h2M10 8l-1 4" />
      </svg>
    )
  }
  if (type === 'suv') {
    return (
      <svg className={baseClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 11l2-4h14l2 4v4H3v-4z" />
        <circle cx="7" cy="15" r="1.5" />
        <circle cx="17" cy="15" r="1.5" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 11h18" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 7V5h10v2" />
      </svg>
    )
  }
  return (
    <svg className={baseClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
    </svg>
  )
}

export default function PriceEstimatePage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const pickup = searchParams.get('pickup') || 'Origem'
  const dropoff = searchParams.get('dropoff') || 'Destino'
  const distanceKm = parseFloat(searchParams.get('distance') || '8.5')
  const durationMin = parseFloat(searchParams.get('duration') || '22')

  const [selected, setSelected] = useState<string>('economy')
  const [paymentMethod, setPaymentMethod] = useState<string>('pix')
  const [surgeActive, setSurgeActive] = useState(false)
  const [surgeMultiplier, setSurgeMultiplier] = useState(1.0)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Simulate surge pricing based on time of day
    const hour = new Date().getHours()
    const isRushHour = (hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19)
    setSurgeActive(isRushHour)
    setSurgeMultiplier(isRushHour ? 1.3 : 1.0)
  }, [])

  const selectedVehicle = VEHICLE_TYPES.find(v => v.id === selected)!

  const getPrice = (vehicle: VehicleType) => {
    return calcPrice(distanceKm, durationMin, vehicle.multiplier * surgeMultiplier)
  }

  const paymentOptions = [
    { id: 'pix', label: 'PIX', icon: 'pix' },
    { id: 'cash', label: 'Dinheiro', icon: 'cash' },
    { id: 'credit_card', label: 'Crédito', icon: 'card' },
    { id: 'wallet', label: 'Carteira', icon: 'wallet' },
  ]

  const handleRequest = async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/onboarding/splash'); return }

      router.push(
        `/uppi/ride/searching?pickup=${encodeURIComponent(pickup)}&dropoff=${encodeURIComponent(dropoff)}&vehicle=${selected}&payment=${paymentMethod}&price=${getPrice(selectedVehicle).toFixed(2)}`
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-dvh overflow-y-auto bg-[color:var(--background)] ios-scroll pb-8">
      {/* Header */}
      <header className="bg-[color:var(--card)]/80 ios-blur border-b border-[color:var(--border)] sticky top-0 z-30">
        <div className="px-5 pt-safe-offset-4 pb-3 flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-[color:var(--muted)] ios-press"
          >
            <svg className="w-5 h-5 text-[color:var(--foreground)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-[20px] font-bold text-[color:var(--foreground)] tracking-tight">Escolher corrida</h1>
        </div>
      </header>

      <main className="px-4 py-4 max-w-lg mx-auto space-y-4">
        {/* Rota resumida */}
        <div className="bg-[color:var(--card)] rounded-[24px] p-4 border border-[color:var(--border)] animate-ios-fade-up">
          <div className="flex gap-3">
            <div className="flex flex-col items-center gap-1 pt-1">
              <div className="w-2.5 h-2.5 bg-blue-500 rounded-full" />
              <div className="w-px flex-1 bg-[color:var(--border)] min-h-[20px]" />
              <div className="w-2.5 h-2.5 bg-orange-500 rounded-full" />
            </div>
            <div className="flex-1 space-y-3 min-w-0">
              <div>
                <p className="text-[11px] font-bold text-[color:var(--muted-foreground)] uppercase tracking-widest">De</p>
                <p className="text-[13px] font-semibold text-[color:var(--foreground)] truncate">{pickup}</p>
              </div>
              <div>
                <p className="text-[11px] font-bold text-[color:var(--muted-foreground)] uppercase tracking-widest">Para</p>
                <p className="text-[13px] font-semibold text-[color:var(--foreground)] truncate">{dropoff}</p>
              </div>
            </div>
            <div className="flex flex-col items-end justify-center gap-1 shrink-0">
              <span className="text-[12px] font-bold text-[color:var(--muted-foreground)]">{distanceKm.toFixed(1)} km</span>
              <span className="text-[12px] text-[color:var(--muted-foreground)]">{Math.round(durationMin)} min</span>
            </div>
          </div>
        </div>

        {/* Surge warning */}
        {surgeActive && (
          <div className="bg-amber-50 border border-amber-200 rounded-[20px] p-3.5 flex items-start gap-3 animate-ios-fade-up">
            <svg className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <div>
              <p className="text-[13px] font-bold text-amber-700">Alta demanda agora</p>
              <p className="text-[12px] text-amber-600 mt-0.5">
                Preços {Math.round((surgeMultiplier - 1) * 100)}% maiores que o normal. Aguarde alguns minutos para economizar.
              </p>
            </div>
          </div>
        )}

        {/* Tipos de veículo */}
        <div className="space-y-2.5 animate-ios-fade-up" style={{ animationDelay: '60ms' }}>
          <p className="text-[12px] font-bold text-[color:var(--muted-foreground)] uppercase tracking-wider px-1">Tipo de veículo</p>
          {VEHICLE_TYPES.map((vehicle) => {
            const price = getPrice(vehicle)
            const isSelected = selected === vehicle.id
            return (
              <button
                key={vehicle.id}
                type="button"
                onClick={() => setSelected(vehicle.id)}
                className={cn(
                  'w-full flex items-center gap-4 p-4 rounded-[20px] border transition-all duration-200 ios-press text-left',
                  isSelected
                    ? 'bg-blue-500/8 border-blue-500 shadow-sm'
                    : 'bg-[color:var(--card)] border-[color:var(--border)]'
                )}
              >
                {/* Icon */}
                <div className={cn(
                  'w-12 h-12 rounded-[14px] flex items-center justify-center shrink-0 transition-colors',
                  isSelected ? 'bg-blue-500 text-white' : 'bg-[color:var(--muted)] text-[color:var(--muted-foreground)]'
                )}>
                  <VehicleIcon type={vehicle.icon} />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={cn('text-[15px] font-bold', isSelected ? 'text-blue-600' : 'text-[color:var(--foreground)]')}>
                      {vehicle.label}
                    </span>
                    <span className="text-[12px] text-[color:var(--muted-foreground)] flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {vehicle.eta} min
                    </span>
                  </div>
                  <p className="text-[12px] text-[color:var(--muted-foreground)] truncate">{vehicle.description}</p>
                  <div className="flex gap-1.5 mt-1.5 flex-wrap">
                    {vehicle.features.slice(0, 2).map(f => (
                      <span key={f} className="text-[10px] font-semibold text-[color:var(--muted-foreground)] bg-[color:var(--muted)] px-2 py-0.5 rounded-full">
                        {f}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Price */}
                <div className="text-right shrink-0">
                  <p className={cn('text-[18px] font-black tabular-nums tracking-tight', isSelected ? 'text-blue-600' : 'text-[color:var(--foreground)]')}>
                    R$ {price.toFixed(2)}
                  </p>
                  {surgeActive && (
                    <p className="text-[10px] text-amber-500 font-bold">x{surgeMultiplier.toFixed(1)}</p>
                  )}
                </div>
              </button>
            )
          })}
        </div>

        {/* Pagamento */}
        <div className="animate-ios-fade-up" style={{ animationDelay: '120ms' }}>
          <p className="text-[12px] font-bold text-[color:var(--muted-foreground)] uppercase tracking-wider mb-2.5 px-1">Forma de pagamento</p>
          <div className="grid grid-cols-4 gap-2">
            {paymentOptions.map(opt => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setPaymentMethod(opt.id)}
                className={cn(
                  'flex flex-col items-center gap-1.5 p-3 rounded-[16px] border transition-all duration-200 ios-press',
                  paymentMethod === opt.id
                    ? 'bg-blue-500/8 border-blue-500'
                    : 'bg-[color:var(--card)] border-[color:var(--border)]'
                )}
              >
                <div className={cn(
                  'w-8 h-8 rounded-[10px] flex items-center justify-center',
                  paymentMethod === opt.id ? 'bg-blue-500 text-white' : 'bg-[color:var(--muted)] text-[color:var(--muted-foreground)]'
                )}>
                  {opt.icon === 'pix' && (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M16.5 3.5l-4.5 4.5-4.5-4.5-2 2 4.5 4.5-4.5 4.5 2 2 4.5-4.5 4.5 4.5 2-2-4.5-4.5 4.5-4.5z" />
                    </svg>
                  )}
                  {opt.icon === 'cash' && (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  )}
                  {opt.icon === 'card' && (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                  )}
                  {opt.icon === 'wallet' && (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" />
                    </svg>
                  )}
                </div>
                <span className={cn('text-[11px] font-bold', paymentMethod === opt.id ? 'text-blue-600' : 'text-[color:var(--muted-foreground)]')}>
                  {opt.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Resumo e botão */}
        <div className="bg-[color:var(--card)] rounded-[24px] p-4 border border-[color:var(--border)] animate-ios-fade-up" style={{ animationDelay: '160ms' }}>
          <div className="space-y-2.5 mb-4">
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-[color:var(--muted-foreground)]">Tipo selecionado</span>
              <span className="text-[13px] font-bold text-[color:var(--foreground)]">{selectedVehicle.label}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-[color:var(--muted-foreground)]">Distância</span>
              <span className="text-[13px] font-bold text-[color:var(--foreground)]">{distanceKm.toFixed(1)} km</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-[color:var(--muted-foreground)]">Tempo estimado</span>
              <span className="text-[13px] font-bold text-[color:var(--foreground)]">{Math.round(durationMin)} min</span>
            </div>
            <div className="h-px bg-[color:var(--border)]" />
            <div className="flex items-center justify-between">
              <span className="text-[15px] font-black text-[color:var(--foreground)]">Estimativa</span>
              <span className="text-[20px] font-black text-blue-600 tabular-nums">
                R$ {getPrice(selectedVehicle).toFixed(2)}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleRequest}
            disabled={loading}
            className="w-full h-14 bg-blue-500 text-white font-bold text-[16px] rounded-[18px] ios-press shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Solicitar {selectedVehicle.label}
              </>
            )}
          </button>
        </div>

        {/* Disclaimer */}
        <p className="text-[11px] text-center text-[color:var(--muted-foreground)] px-4 animate-ios-fade-up" style={{ animationDelay: '200ms' }}>
          O valor final pode variar conforme trânsito e condições da corrida. A cobrança é feita ao final da viagem.
        </p>
      </main>
    </div>
  )
}
