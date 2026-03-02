'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { RoutePreview3D } from '@/components/route-preview-3d'
import type { Ride } from '@/lib/types/database'

export default function RideDetailsPage() {
  const router = useRouter()
  const params = useParams()
  const supabase = createClient()
  const [ride, setRide] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState(false)
  const [show3DPreview, setShow3DPreview] = useState(false)

  useEffect(() => {
    loadRideDetails()

    // Real-time: listen for ride status changes
    const channel = supabase
      .channel(`ride-details-${params.id}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'rides',
        filter: `id=eq.${params.id}`,
      }, () => loadRideDetails())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [params.id])

  const loadRideDetails = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/onboarding/splash')
        return
      }

      const { data, error } = await supabase
        .from('rides')
        .select(`
          *,
          passenger:profiles!rides_passenger_id_fkey(id, full_name, avatar_url, phone),
          driver:profiles!rides_driver_id_fkey(id, full_name, avatar_url, phone, rating),
          driver_profile:driver_profiles(vehicle_model, vehicle_plate, vehicle_color)
        `)
        .eq('id', params.id)
        .single()

      if (error) throw error
      setRide(data)
    } catch (error) {
      console.error('[v0] Error loading ride details:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = async () => {
    if (!ride || cancelling) return

    const reason = prompt('Por que você deseja cancelar esta corrida?')
    if (!reason) return

    setCancelling(true)
    try {
      const response = await fetch(`/api/v1/rides/${ride.id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      })

      if (!response.ok) throw new Error('Failed to cancel ride')

      const { cancellationFee } = await response.json()
      
      if (cancellationFee > 0) {
        iosToast.error(`Taxa de cancelamento: R$ ${cancellationFee.toFixed(2)}`)
      } else {
        iosToast.success('Corrida cancelada')
      }

      router.push('/uppi/history')
    } catch (error) {
      console.error('[v0] Error cancelling ride:', error)
      iosToast.error('Erro ao cancelar corrida')
    } finally {
      setCancelling(false)
    }
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      accepted: 'bg-blue-100 text-blue-800',
      on_way: 'bg-purple-100 text-purple-800',
      in_progress: 'bg-green-100 text-green-800',
      completed: 'bg-gray-100 text-gray-800',
      cancelled: 'bg-red-100 text-red-800',
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  const getStatusText = (status: string) => {
    const texts: Record<string, string> = {
      pending: 'Aguardando ofertas',
      accepted: 'Corrida aceita',
      on_way: 'Motorista a caminho',
      in_progress: 'Em andamento',
      completed: 'Concluída',
      cancelled: 'Cancelada',
    }
    return texts[status] || status
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!ride) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center">
        <Card className="p-6">
          <p className="text-gray-600">Corrida não encontrada</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 pb-6">
      {/* Header */}
      <header className="bg-white border-b border-blue-200 sticky top-0 z-10">
        <div className="flex items-center gap-4 p-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="text-blue-900 hover:bg-blue-100"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Button>
          <h1 className="text-xl font-bold text-blue-900">Detalhes da Corrida</h1>
        </div>
      </header>

      <main className="p-4 space-y-4">
        {/* Status */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <span className={`px-4 py-2 rounded-full text-sm font-semibold ${getStatusColor(ride.status)}`}>
              {getStatusText(ride.status)}
            </span>
            <span className="text-sm text-gray-600">
              {new Date(ride.created_at).toLocaleDateString('pt-BR')}
            </span>
          </div>

          {/* Endereços */}
          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <div className="w-3 h-3 rounded-full bg-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Origem</p>
                <p className="font-medium text-gray-900">{ride.pickup_address}</p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                <div className="w-3 h-3 rounded-full bg-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Destino</p>
                <p className="font-medium text-gray-900">{ride.dropoff_address}</p>
              </div>
            </div>
          </div>

          {/* Valores */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-600">Preço sugerido</span>
              <span className="text-gray-900">R$ {ride.offered_price?.toFixed(2)}</span>
            </div>
            {ride.final_price && (
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Preço acordado</span>
                <span className="text-2xl font-bold text-blue-600">
                  R$ {ride.final_price.toFixed(2)}
                </span>
              </div>
            )}
          </div>
        </Card>

        {/* Informações do motorista/passageiro */}
        {ride.driver && (
          <Card className="p-6">
            <h3 className="font-bold text-gray-900 mb-4">Motorista</h3>
            <div className="flex items-center gap-4">
              <Avatar className="w-16 h-16">
                <AvatarImage src={ride.driver.avatar_url || "/placeholder.svg"} />
                <AvatarFallback>{ride.driver.full_name?.[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="font-semibold text-gray-900">{ride.driver.full_name}</p>
                <div className="flex items-center gap-1 text-sm text-gray-600">
                  <svg className="w-4 h-4 text-yellow-500 fill-current" viewBox="0 0 20 20">
                    <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                  </svg>
                  <span>{ride.driver.rating?.toFixed(1)}</span>
                </div>
                {ride.driver_profile && (
                  <p className="text-sm text-gray-600 mt-1">
                    {ride.driver_profile.vehicle_color} {ride.driver_profile.vehicle_model} • {ride.driver_profile.vehicle_plate}
                  </p>
                )}
              </div>
            </div>

            {['accepted', 'on_way', 'in_progress'].includes(ride.status) && (
              <div className="mt-4 flex gap-2">
                <Button
                  onClick={() => router.push(`/uppi/ride/${ride.id}/chat`)}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Mensagem
                </Button>
                <Button
                  onClick={() => window.location.href = `tel:${ride.driver.phone}`}
                  variant="outline"
                  className="flex-1 text-blue-600 border-blue-600 hover:bg-blue-50"
                >
                  Ligar
                </Button>
              </div>
            )}
          </Card>
        )}

        {/* Ações */}
        {['pending', 'accepted', 'on_way'].includes(ride.status) && (
          <Card className="p-6">
            <h3 className="font-bold text-gray-900 mb-4">Ações</h3>
            <div className="space-y-3">
              {ride.status === 'pending' && (
                <Button
                  onClick={() => router.push(`/uppi/ride/${ride.id}/offers`)}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Ver Ofertas
                </Button>
              )}
              
              {['accepted', 'on_way'].includes(ride.status) && (
                <Button
                  onClick={() => router.push(`/uppi/ride/${ride.id}/tracking`)}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Acompanhar Corrida
                </Button>
              )}

              <Button
                onClick={handleCancel}
                disabled={cancelling}
                variant="outline"
                className="w-full text-red-600 border-red-600 hover:bg-red-50 bg-transparent"
              >
                {cancelling ? 'Cancelando...' : 'Cancelar Corrida'}
              </Button>
            </div>
          </Card>
        )}

        {ride.status === 'completed' && !ride.rating && (
          <Card className="p-6">
            <Button
              onClick={() => router.push(`/uppi/ride/${ride.id}/review`)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              Avaliar Corrida
            </Button>
          </Card>
        )}
      </main>
    </div>
  )
}
