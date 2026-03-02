'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import type { Ride } from '@/lib/types/database'

const CANCEL_REASONS = [
  { id: 'changed_mind', label: 'Mudei de ideia', description: 'Não preciso mais da corrida' },
  { id: 'wait_too_long', label: 'Espera muito longa', description: 'O motorista está demorando' },
  { id: 'wrong_address', label: 'Endereço errado', description: 'Coloquei o endereço incorreto' },
  { id: 'found_alternative', label: 'Achei outra opção', description: 'Vou usar outro meio de transporte' },
  { id: 'driver_problem', label: 'Problema com motorista', description: 'Comportamento inadequado' },
  { id: 'other', label: 'Outro motivo', description: 'Especifique abaixo' },
]

export default function CancelRidePage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  const rideId = params.id as string

  const [ride, setRide] = useState<Ride | null>(null)
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState(false)
  const [selectedReason, setSelectedReason] = useState<string | null>(null)
  const [otherText, setOtherText] = useState('')
  const [cancellationFee, setCancellationFee] = useState(0)

  useEffect(() => {
    loadRide()

    // Real-time: detect if the other party cancelled or status changed
    const channel = supabase
      .channel(`ride-cancel-${rideId}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'rides',
        filter: `id=eq.${rideId}`,
      }, (payload) => {
        const updated = payload.new as Ride
        setRide(updated)
        if (updated.status === 'cancelled' || updated.status === 'completed') {
          router.push('/uppi/home')
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [rideId])

  const loadRide = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/onboarding/splash'); return }

      const { data } = await supabase.from('rides').select('*').eq('id', rideId).single()
      if (!data) { router.back(); return }
      setRide(data)

      // Calcular taxa de cancelamento
      // Se motorista já aceitou e está a caminho há mais de 2 min → taxa
      if (['accepted', 'driver_arrived'].includes(data.status) && data.updated_at) {
        const minutesSinceAccepted = (Date.now() - new Date(data.updated_at).getTime()) / 60000
        if (minutesSinceAccepted > 2) {
          setCancellationFee(5.00) // taxa fixa R$5
        }
      }
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = async () => {
    if (!selectedReason) return

    const reason = selectedReason === 'other'
      ? (otherText.trim() || 'Outro motivo')
      : CANCEL_REASONS.find(r => r.id === selectedReason)?.label || selectedReason

    setCancelling(true)
    try {
      const res = await fetch(`/api/v1/rides/${rideId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      })

      if (res.ok) {
        router.replace('/uppi/home')
      } else {
        const err = await res.json()
        alert(err.error || 'Erro ao cancelar corrida')
      }
    } finally {
      setCancelling(false)
    }
  }

  if (loading) {
    return (
      <div className="h-dvh bg-[color:var(--background)] flex items-center justify-center">
        <div className="w-8 h-8 border-[2.5px] border-red-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="h-dvh overflow-y-auto bg-[color:var(--background)] pb-8 ios-scroll">
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
          <h1 className="text-[20px] font-bold text-[color:var(--foreground)] tracking-tight">Cancelar Corrida</h1>
        </div>
      </header>

      <main className="px-5 py-5 max-w-lg mx-auto">
        {/* Taxa de cancelamento */}
        {cancellationFee > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-[20px] p-4 mb-5 flex gap-3 animate-ios-fade-up">
            <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <p className="text-[14px] font-bold text-amber-800">Taxa de cancelamento</p>
              <p className="text-[13px] text-amber-700 mt-0.5">
                Como o motorista já está a caminho, será cobrada uma taxa de{' '}
                <strong>R$ {cancellationFee.toFixed(2)}</strong>
              </p>
            </div>
          </div>
        )}

        {/* Rota */}
        {ride && (
          <div className="bg-[color:var(--card)] rounded-[20px] p-4 mb-5 border border-[color:var(--border)] animate-ios-fade-up">
            <div className="flex gap-3">
              <div className="flex flex-col items-center gap-1 pt-1">
                <div className="w-2.5 h-2.5 bg-blue-500 rounded-full" />
                <div className="w-px flex-1 bg-[color:var(--border)] min-h-[20px]" />
                <div className="w-2.5 h-2.5 bg-orange-500 rounded-full" />
              </div>
              <div className="flex-1 space-y-2 min-w-0">
                <p className="text-[13px] text-[color:var(--foreground)] font-medium truncate">{ride.pickup_address}</p>
                <p className="text-[13px] text-[color:var(--foreground)] font-medium truncate">{ride.dropoff_address}</p>
              </div>
            </div>
          </div>
        )}

        {/* Motivos */}
        <p className="text-[14px] font-bold text-[color:var(--foreground)] mb-3 px-1">Por que deseja cancelar?</p>
        <div className="space-y-2 mb-5">
          {CANCEL_REASONS.map((reason, i) => (
            <button
              key={reason.id}
              type="button"
              onClick={() => setSelectedReason(reason.id)}
              className={cn(
                'w-full flex items-center gap-4 p-4 rounded-[18px] border transition-all ios-press text-left animate-ios-fade-up',
                selectedReason === reason.id
                  ? 'bg-red-50 border-red-300'
                  : 'bg-[color:var(--card)] border-[color:var(--border)]'
              )}
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <div className={cn(
                'w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors',
                selectedReason === reason.id ? 'border-red-500 bg-red-500' : 'border-[color:var(--muted-foreground)]/40'
              )}>
                {selectedReason === reason.id && (
                  <div className="w-2 h-2 bg-white rounded-full" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className={cn('text-[15px] font-semibold', selectedReason === reason.id ? 'text-red-700' : 'text-[color:var(--foreground)]')}>
                  {reason.label}
                </p>
                <p className="text-[12px] text-[color:var(--muted-foreground)] mt-0.5">{reason.description}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Campo de texto para "Outro" */}
        {selectedReason === 'other' && (
          <div className="mb-5 animate-ios-fade-up">
            <textarea
              value={otherText}
              onChange={e => setOtherText(e.target.value)}
              placeholder="Descreva o motivo..."
              rows={3}
              className="w-full px-4 py-3 bg-[color:var(--muted)] rounded-[16px] text-[15px] text-[color:var(--foreground)] resize-none outline-none focus:ring-2 focus:ring-red-400"
            />
          </div>
        )}

        {/* Botões */}
        <div className="space-y-3">
          <button
            type="button"
            onClick={handleCancel}
            disabled={!selectedReason || cancelling}
            className="w-full h-[52px] bg-red-500 text-white font-bold text-[16px] rounded-[18px] ios-press disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-red-500/20"
          >
            {cancelling
              ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : cancellationFee > 0
                ? `Cancelar e pagar R$ ${cancellationFee.toFixed(2)}`
                : 'Confirmar cancelamento'
            }
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="w-full h-[44px] bg-[color:var(--muted)] text-[color:var(--foreground)] font-semibold text-[15px] rounded-[16px] ios-press"
          >
            Manter corrida
          </button>
        </div>
      </main>
    </div>
  )
}
