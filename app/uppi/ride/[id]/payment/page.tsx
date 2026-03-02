'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { iosToast } from '@/lib/utils/ios-toast'
import { triggerHaptic } from '@/lib/utils/haptics'
import { PixQrCode } from '@/components/pix-qr-code'
import { paymentService, type PixPaymentResponse } from '@/lib/services/payment-service'
import type { Ride, Profile } from '@/lib/types/database'

export default function PaymentPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  
  const [ride, setRide] = useState<Ride | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'wallet' | null>(null)
  const [pixPayment, setPixPayment] = useState<PixPaymentResponse | null>(null)
  const [processing, setProcessing] = useState(false)
  const [walletBalance, setWalletBalance] = useState<number>(0)
  const checkIntervalRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    loadData()

    // Real-time: listen for ride payment status updates
    const channel = supabase
      .channel(`ride-payment-${params.id}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'rides',
        filter: `id=eq.${params.id}`,
      }, (payload) => {
        const updated = payload.new as Ride
        setRide(updated)
        if (updated.payment_status === 'paid') {
          iosToast.success('Pagamento confirmado!')
          triggerHaptic('heavy')
          setTimeout(() => router.push(`/uppi/ride/${params.id}/review`), 1500)
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  // Verificar pagamento PIX a cada 5 segundos
  useEffect(() => {
    if (pixPayment?.payment_id) {
      checkIntervalRef.current = setInterval(async () => {
        const status = await paymentService.checkPaymentStatus(pixPayment.payment_id!)
        
        if (status?.status === 'paid') {
          clearInterval(checkIntervalRef.current)
          handlePaymentSuccess()
        } else if (status?.status === 'expired') {
          clearInterval(checkIntervalRef.current)
          iosToast.error('Pagamento expirado')
          setPixPayment(null)
        }
      }, 5000)

      return () => {
        if (checkIntervalRef.current) {
          clearInterval(checkIntervalRef.current)
        }
      }
    }
  }, [pixPayment])

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      router.push('/auth/welcome')
      return
    }

    // Load ride
    const { data: rideData } = await supabase
      .from('rides')
      .select('*')
      .eq('id', params.id)
      .single()

    if (rideData) {
      setRide(rideData)
    }

    // Load profile
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileData) {
      setProfile(profileData)
    }

    // Load wallet balance
    const { data: walletData } = await supabase
      .from('user_wallets')
      .select('balance')
      .eq('user_id', user.id)
      .single()

    if (walletData) {
      setWalletBalance(walletData.balance)
    }

    setLoading(false)
  }

  const handlePixPayment = async () => {
    if (!ride || !profile) return

    setProcessing(true)

    try {
      const result = await paymentService.createPixPayment({
        amount: Math.round(ride.final_price * 100), // Converter para centavos
        description: `Corrida Uppi - ${ride.pickup_address} até ${ride.dropoff_address}`,
        payer_name: profile.full_name,
        payer_cpf: profile.cpf || '', // Assumindo que CPF está no perfil
        ride_id: ride.id,
      })

      if (result.success) {
        setPixPayment(result)
        triggerHaptic('medium')
      } else {
        iosToast.error(result.error || 'Erro ao gerar PIX')
      }
    } catch (error) {
      console.error('[v0] PIX error:', error)
      iosToast.error('Erro ao processar pagamento')
    } finally {
      setProcessing(false)
    }
  }

  const handleWalletPayment = async () => {
    if (!ride || !profile) return

    const amount = ride.final_price

    if (walletBalance < amount) {
      iosToast.error('Saldo insuficiente na carteira')
      return
    }

    setProcessing(true)

    try {
      const success = await paymentService.processWalletPayment(
        ride.id,
        profile.id,
        amount
      )

      if (success) {
        handlePaymentSuccess()
      } else {
        iosToast.error('Erro ao processar pagamento')
      }
    } catch (error) {
      console.error('[v0] Wallet payment error:', error)
      iosToast.error('Erro ao processar pagamento')
    } finally {
      setProcessing(false)
    }
  }

  const handlePaymentSuccess = () => {
    triggerHaptic('success')
    iosToast.success('Pagamento confirmado!')
    
    setTimeout(() => {
      router.push(`/uppi/ride/${params.id}/review`)
    }, 1500)
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!ride) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-neutral-600 dark:text-neutral-400">Corrida não encontrada</p>
      </div>
    )
  }

  // Se já mostrou PIX, mostrar o QR Code
  if (pixPayment && pixPayment.qr_code && pixPayment.qr_code_text) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 p-4">
        <div className="max-w-md mx-auto py-8">
          <Button
            variant="ghost"
            onClick={() => setPixPayment(null)}
            className="mb-4"
          >
            <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Voltar
          </Button>

          <PixQrCode
            qrCode={pixPayment.qr_code}
            qrCodeText={pixPayment.qr_code_text}
            amount={Math.round(ride.final_price * 100)}
            expiresAt={pixPayment.expires_at || ''}
            paymentId={pixPayment.payment_id || ''}
            onPaymentConfirmed={handlePaymentSuccess}
          />
        </div>
      </div>
    )
  }

  // Seleção de método de pagamento
  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 p-4">
      <div className="max-w-md mx-auto py-8">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mb-4"
          >
            <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Voltar
          </Button>
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-white">
            Pagamento
          </h1>
        </div>

        {/* Ride Summary */}
        <Card className="p-4 mb-6">
          <div className="space-y-3">
            <div>
              <div className="text-sm text-neutral-600 dark:text-neutral-400">De</div>
              <div className="font-medium text-neutral-900 dark:text-white">{ride.pickup_address}</div>
            </div>
            <div>
              <div className="text-sm text-neutral-600 dark:text-neutral-400">Para</div>
              <div className="font-medium text-neutral-900 dark:text-white">{ride.dropoff_address}</div>
            </div>
            <div className="pt-3 border-t border-neutral-200 dark:border-neutral-800">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold text-neutral-900 dark:text-white">Total</span>
                <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {formatCurrency(ride.final_price)}
                </span>
              </div>
            </div>
          </div>
        </Card>

        {/* Payment Methods */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-3">
            Escolha a forma de pagamento
          </h2>

          {/* PIX */}
          <Card
            className="p-4 cursor-pointer hover:border-blue-500 transition-colors"
            onClick={() => !processing && handlePixPayment()}
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-teal-400 to-cyan-600 rounded-xl flex items-center justify-center">
                <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5zm0 2.18l8 4V17c0 4.52-2.98 8.69-7 9.93-4.02-1.24-7-5.41-7-9.93V8.18l8-4zM12 6L6 9v8c0 3.87 2.39 7.48 6 8.74 3.61-1.26 6-4.87 6-8.74V9l-6-3z"/>
                </svg>
              </div>
              <div className="flex-1">
                <div className="font-semibold text-neutral-900 dark:text-white">PIX</div>
                <div className="text-sm text-neutral-600 dark:text-neutral-400">Pagamento instantâneo</div>
              </div>
              <svg className="w-5 h-5 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Card>

          {/* Wallet */}
          <Card
            className={`p-4 cursor-pointer hover:border-blue-500 transition-colors ${
              walletBalance < ride.final_price ? 'opacity-50' : ''
            }`}
            onClick={() => !processing && walletBalance >= ride.final_price && handleWalletPayment()}
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center">
                <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <div className="font-semibold text-neutral-900 dark:text-white">Carteira Uppi</div>
                <div className="text-sm text-neutral-600 dark:text-neutral-400">
                  Saldo: {formatCurrency(walletBalance)}
                </div>
              </div>
              <svg className="w-5 h-5 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
            {walletBalance < ride.final_price && (
              <div className="mt-2 text-xs text-red-600 dark:text-red-400">
                Saldo insuficiente
              </div>
            )}
          </Card>
        </div>

        {processing && (
          <div className="mt-6 text-center">
            <div className="inline-flex items-center gap-2 text-neutral-600 dark:text-neutral-400">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              Processando...
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
