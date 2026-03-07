'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { HomeSkeleton } from '@/components/ui/ios-skeleton'
import type { Profile } from '@/lib/types/database'
import { GoogleMap } from '@/components/google-map'
import type { GoogleMapHandle } from '@/components/google-map'
import { NearbyDrivers } from '@/components/nearby-drivers'
import { CouponNotificationModal, useCouponNotification } from '@/components/coupon-notification-modal'
import { triggerHaptic } from '@/hooks/use-haptic'
import { PermissionOnboarding } from '@/components/permission-onboarding'
import { Car, Package, Globe, Calendar, Bell, CalendarDays, ChevronRight, Mic, Plus, Gift, Home, Map, Settings, User } from 'lucide-react'

export default function HomePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [greeting, setGreeting] = useState('')
  const [nearbyDriversCount, setNearbyDriversCount] = useState(0)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [mapInstance, setMapInstance] = useState<any>(null)
  const [mapLoaded, setMapLoaded] = useState(false)
  const mapRef = useRef<GoogleMapHandle>(null)
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const { notification: couponNotification, showNotification: showCouponModal, closeNotification: closeCouponModal } = useCouponNotification()

  const quickServices = [
    { label: 'Corrida', sub: 'Mais rapido', icon: Car, bgColor: 'bg-[#1a1a2e]', href: '/uppi/ride/route-input' },
    { label: 'Entregas', sub: 'Envie pacotes', icon: Package, bgColor: 'bg-[#e8751a]', href: '/uppi/entregas' },
    { label: 'Intercidade', sub: 'Viaje longe', icon: Globe, bgColor: 'bg-[#0d7377]', href: '/uppi/cidade-a-cidade' },
    { label: 'Agendar', sub: 'Para depois', icon: Calendar, bgColor: 'bg-[#6c5ce7]', href: '/uppi/ride/route-input' },
  ]

  const handleLocationFound = useCallback((lat: number, lng: number) => {
    sessionStorage.setItem('userLocation', JSON.stringify({ lat, lng }))
    setUserLocation({ lat, lng })
  }, [])

  const handleMapReady = useCallback((instance: any) => {
    setMapInstance(instance)
    setMapLoaded(true)
  }, [])

  useEffect(() => {
    const hour = new Date().getHours()
    if (hour < 12) setGreeting('Bom dia,')
    else if (hour < 18) setGreeting('Boa tarde,')
    else setGreeting('Boa noite,')
  }, [])

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        
        if (user) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single()
          
          if (profileData) {
            setProfile(profileData)
          }
        } else {
          const localProfile = sessionStorage.getItem('userProfile') || localStorage.getItem('uppi_profile')
          if (localProfile) {
            const localData = JSON.parse(localProfile)
            setProfile({
              id: 'local', full_name: localData.name, phone: localData.phone || '', user_type: localData.user_type || 'passenger',
              avatar_url: '/images/default-avatar.jpg', rating: 5.0, total_rides: 0,
              created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
            })
            const hasSeenWelcome = sessionStorage.getItem('uppi_welcome_shown')
            if (!hasSeenWelcome) {
              sessionStorage.setItem('uppi_welcome_shown', 'true')
              setTimeout(() => {
                showCouponModal({
                  id: 'welcome',
                  userName: localData.name?.split(' ')[0] || 'Usuario',
                  title: 'Corrida gratis',
                  description: 'Na sua primeira corrida',
                  type: 'freeride',
                  icon: '🚗',
                })
              }, 1500)
            }
          } else {
            setProfile({
              id: 'guest', full_name: 'Usuario', phone: '', user_type: 'passenger',
              avatar_url: '/images/default-avatar.jpg', rating: 5.0, total_rides: 0,
              created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
            })
          }
        }
      } catch (error) {
        console.log('[v0] Error loading profile:', error)
      } finally {
        setLoading(false)
      }
    }
    loadProfile()
  }, [supabase, showCouponModal])

  if (loading) {
    return <HomeSkeleton />
  }

  const firstName = profile?.full_name?.split(' ')[0] || 'Usuario'

  return (
    <main className="h-dvh flex flex-col relative overflow-hidden bg-[#0d0d0d]" aria-label="Tela principal do Uppi">
      {/* Map Area - Upper Half */}
      <div className="relative flex-1 min-h-[50vh]" role="region" aria-label="Mapa de localizacao">
        {/* Search Bar - Fixed at top */}
        <div className="absolute top-0 left-0 right-0 z-20 px-4 pt-[calc(env(safe-area-inset-top)+0.75rem)]">
          <button
            type="button"
            aria-label="Buscar destino"
            className="w-full flex items-center gap-3 bg-[#1c1c1e] rounded-full px-4 py-3"
            onClick={() => { triggerHaptic('impact'); router.push('/uppi/ride/route-input') }}
          >
            <svg className="w-5 h-5 text-[#8E8E93]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <circle cx="11" cy="11" r="8" />
              <path strokeLinecap="round" d="m21 21-4.35-4.35" />
            </svg>
            <span className="flex-1 text-[#8E8E93] text-base text-left">Para onde?</span>
          </button>
        </div>

        {/* Google Map */}
        <GoogleMap 
          ref={mapRef} 
          onLocationFound={handleLocationFound} 
          onMapReady={handleMapReady}
          className="w-full h-full" 
        />

        {/* Loading Overlay - shown while map is loading */}
        {!mapLoaded && (
          <div className="absolute inset-0 bg-[#0d0d0d] flex items-center justify-center z-10">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-3 border-[#007AFF] border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-[#8E8E93]">Carregando mapa...</span>
            </div>
          </div>
        )}

        {/* Nearby Drivers Layer */}
        {userLocation && mapInstance && (
          <NearbyDrivers
            userLat={userLocation.lat}
            userLng={userLocation.lng}
            mapInstance={mapInstance}
            onDriversUpdate={setNearbyDriversCount}
          />
        )}

        {/* Facebook Icon - Left side */}
        <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10">
          <button 
            type="button"
            className="w-10 h-10 rounded-full bg-[#1877F2] flex items-center justify-center shadow-lg"
            onClick={() => { triggerHaptic('impact') }}
          >
            <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.989C18.343 21.129 22 16.99 22 12c0-5.523-4.477-10-10-10z"/>
            </svg>
          </button>
        </div>

        {/* Right side buttons - Mic and Plus */}
        <div className="absolute right-4 bottom-16 z-10 flex flex-col gap-3">
          <button 
            type="button"
            className="w-12 h-12 rounded-full bg-[#007AFF] flex items-center justify-center shadow-lg"
            onClick={() => { triggerHaptic('impact') }}
          >
            <Mic className="w-5 h-5 text-white" />
          </button>
          <button 
            type="button"
            className="w-10 h-10 rounded-full bg-[#007AFF] flex items-center justify-center shadow-lg"
            onClick={() => { triggerHaptic('impact'); router.push('/uppi/ride/route-input') }}
          >
            <Plus className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Handle indicator */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10">
          <div className="w-10 h-1 bg-[#3a3a3c] rounded-full" />
        </div>
      </div>

      {/* Bottom Sheet - Lower section */}
      <div className="bg-[#0d0d0d] rounded-t-3xl -mt-4 relative z-20 pb-24">
        {/* Header with greeting */}
        <div className="px-5 pt-5 pb-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[#8E8E93] text-sm">{greeting}</p>
              <h1 className="text-white text-2xl font-bold mt-0.5">{firstName}</h1>
            </div>
            <div className="flex items-center gap-3">
              <button 
                type="button"
                className="relative"
                onClick={() => { triggerHaptic('selection'); router.push('/uppi/notifications') }}
              >
                <Bell className="w-6 h-6 text-white" />
                <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#FF9500] rounded-full" />
              </button>
              <button 
                type="button"
                className="w-10 h-10 rounded-xl bg-[#007AFF] flex items-center justify-center"
                onClick={() => { triggerHaptic('selection'); router.push('/uppi/history') }}
              >
                <CalendarDays className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>
        </div>

        {/* Quick Services */}
        <div className="px-5 pb-4">
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
            {quickServices.map((service) => (
              <button
                key={service.label}
                type="button"
                className="flex-shrink-0 flex flex-col items-center"
                onClick={() => { triggerHaptic('selection'); router.push(service.href) }}
              >
                <div className={`w-16 h-16 ${service.bgColor} rounded-2xl flex items-center justify-center mb-2`}>
                  <service.icon className="w-7 h-7 text-white" />
                </div>
                <span className="text-white text-xs font-medium">{service.label}</span>
                <span className="text-[#8E8E93] text-[10px]">{service.sub}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Club Uppi Card */}
        <div className="px-5 pb-3">
          <button
            type="button"
            className="w-full bg-gradient-to-r from-[#1a1a2e] to-[#2d2d44] rounded-2xl p-4 flex items-center justify-between"
            onClick={() => { triggerHaptic('selection'); router.push('/uppi/club') }}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#FFD700]/20 rounded-xl flex items-center justify-center">
                <Gift className="w-5 h-5 text-[#FFD700]" />
              </div>
              <div className="text-left">
                <div className="flex items-center gap-2">
                  <span className="text-white font-semibold">Club Uppi</span>
                  <span className="bg-[#FF9500] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">NOVO</span>
                </div>
                <p className="text-[#8E8E93] text-xs mt-0.5">Ate 15% OFF em todas as corridas</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-[#8E8E93]" />
          </button>
        </div>

        {/* Promotion Card */}
        <div className="px-5 pb-3">
          <button
            type="button"
            className="w-full bg-gradient-to-r from-[#6c5ce7] to-[#8b7cf7] rounded-2xl p-4 flex items-center justify-between overflow-hidden relative"
            onClick={() => { triggerHaptic('selection'); router.push('/uppi/promotions') }}
          >
            <div className="text-left z-10">
              <p className="text-white/70 text-[10px] font-medium uppercase tracking-wider">PROMOCAO</p>
              <h3 className="text-white font-bold text-lg mt-1">20% OFF na proxima</h3>
              <p className="text-white/80 text-xs mt-0.5">Use o codigo UPPI20</p>
            </div>
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center z-10">
              <Gift className="w-6 h-6 text-white" />
            </div>
            {/* Decorative circles */}
            <div className="absolute -right-10 -top-10 w-32 h-32 bg-white/10 rounded-full" />
            <div className="absolute -right-5 -bottom-10 w-24 h-24 bg-white/5 rounded-full" />
          </button>
        </div>
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#1c1c1e]/95 backdrop-blur-xl border-t border-white/5 pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-around py-2">
          <button 
            type="button"
            className="flex flex-col items-center gap-1 px-6 py-2"
            onClick={() => { triggerHaptic('selection') }}
          >
            <div className="w-10 h-8 bg-[#007AFF]/20 rounded-full flex items-center justify-center">
              <Home className="w-5 h-5 text-[#007AFF]" />
            </div>
            <span className="text-[#007AFF] text-[10px] font-medium">Inicio</span>
          </button>
          <button 
            type="button"
            className="flex flex-col items-center gap-1 px-6 py-2"
            onClick={() => { triggerHaptic('selection'); router.push('/uppi/history') }}
          >
            <Map className="w-5 h-5 text-[#8E8E93]" />
            <span className="text-[#8E8E93] text-[10px]">Viagens</span>
          </button>
          <button 
            type="button"
            className="flex flex-col items-center gap-1 px-6 py-2"
            onClick={() => { triggerHaptic('selection'); router.push('/uppi/settings') }}
          >
            <Settings className="w-5 h-5 text-[#8E8E93]" />
            <span className="text-[#8E8E93] text-[10px]">Config</span>
          </button>
          <button 
            type="button"
            className="flex flex-col items-center gap-1 px-6 py-2"
            onClick={() => { triggerHaptic('selection'); router.push('/uppi/profile') }}
          >
            <User className="w-5 h-5 text-[#8E8E93]" />
            <span className="text-[#8E8E93] text-[10px]">Perfil</span>
          </button>
        </div>
      </nav>

      {/* Coupon Modal */}
      <CouponNotificationModal
        notification={couponNotification}
        onClose={closeCouponModal}
        onAccept={() => {
          closeCouponModal()
          router.push('/uppi/wallet')
        }}
      />
      
      <PermissionOnboarding />
    </main>
  )
}
