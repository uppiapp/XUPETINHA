'use client'

import { useState, useEffect } from 'react'
import { MapPin, Car, Package, Globe, Calendar, Bell, Zap } from 'lucide-react'

export default function Page() {
  const [isLoading, setIsLoading] = useState(true)
  const [greeting, setGreeting] = useState('Boa tarde')

  useEffect(() => {
    const hour = new Date().getHours()
    if (hour < 12) setGreeting('Bom dia')
    else if (hour < 18) setGreeting('Boa tarde')
    else setGreeting('Boa noite')

    // Simulate loading
    const timer = setTimeout(() => setIsLoading(false), 2000)
    return () => clearTimeout(timer)
  }, [])

  const services = [
    { label: 'Corrida', sub: 'Mais rápido', icon: Car, color: 'from-[#1a1a2e] to-[#16213e]' },
    { label: 'Entregas', sub: 'Envios rápidos', icon: Package, color: 'from-[#FF8C00] to-[#E67E22]' },
    { label: 'Intercidade', sub: 'Viaje longe', icon: Globe, color: 'from-[#0d7377] to-[#14a3a8]' },
    { label: 'Agendar', sub: 'Para depois', icon: Calendar, color: 'from-[#6c5ce7] to-[#5f3dc4]' },
  ]

  return (
    <main className="min-h-dvh bg-[#1a1a1a] text-white overflow-y-auto">
      {/* Top Search Bar */}
      <div className="sticky top-0 z-20 bg-[#1a1a1a] border-b border-[#2a2a2a] px-4 pt-4 pb-4">
        <div className="flex items-center gap-3 bg-[#2a2a2a] rounded-lg px-4 py-3">
          <svg className="w-5 h-5 text-[#666]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <circle cx="11" cy="11" r="8" />
            <path strokeLinecap="round" d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            placeholder="Para onde?"
            className="flex-1 bg-transparent text-white placeholder-[#666] outline-none text-sm"
          />
        </div>
      </div>

      {/* Loading State with Map */}
      {isLoading && (
        <div className="h-[40vh] bg-gradient-to-b from-[#2a2a2a] to-[#1a1a1a] flex flex-col items-center justify-center">
          {/* Map placeholder with loading spinner */}
          <div className="relative w-full h-full flex items-center justify-center">
            <svg className="w-12 h-12 animate-spin text-[#007AFF]" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 translate-y-8 text-[#999]">
              <p>Carregando mapa...</p>
            </div>
          </div>

          {/* Floating Profile Button */}
          <div className="absolute bottom-20 left-4 w-10 h-10 rounded-full bg-[#2a2a2a] border-2 border-[#444] flex items-center justify-center cursor-pointer hover:border-[#555] transition">
            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="8" r="4" />
              <path d="M12 14c-4 0-6 2-6 2v6h12v-6s-2-2-6-2z" />
            </svg>
          </div>

          {/* Voice Button */}
          <div className="absolute bottom-20 right-4 w-12 h-12 rounded-full bg-[#007AFF] flex items-center justify-center cursor-pointer hover:bg-[#0066FF] transition shadow-lg">
            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
              <path d="M17 16.91c-1.48 1.45-3.47 2.33-5.7 2.33-2.23 0-4.22-.88-5.7-2.33M19 12v2a7 7 0 01-14 0v-2M12 21v-4" stroke="currentColor" strokeWidth="2" fill="none" />
            </svg>
          </div>
        </div>
      )}

      {/* Content Section */}
      {!isLoading && (
        <div className="px-4 pb-8">
          {/* Greeting Section */}
          <div className="mt-6 mb-6">
            <p className="text-[#999] text-sm mb-2">{greeting},</p>
            <h2 className="text-2xl font-bold">Usuário</h2>
          </div>

          {/* Service Cards Grid */}
          <div className="grid grid-cols-2 gap-3 mb-8">
            {services.map((service) => {
              const Icon = service.icon
              return (
                <button
                  key={service.label}
                  className={`bg-gradient-to-br ${service.color} rounded-2xl p-4 text-left hover:opacity-90 transition`}
                >
                  <Icon className="w-6 h-6 mb-3" />
                  <p className="text-sm font-semibold">{service.label}</p>
                  <p className="text-xs text-white/70">{service.sub}</p>
                </button>
              )
            })}
          </div>

          {/* Club Uppi Promo */}
          <div className="bg-gradient-to-r from-[#FF8C00] to-[#E67E22] rounded-3xl p-6 mb-4 relative overflow-hidden">
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
                <span className="text-xs font-bold bg-white/20 px-2 py-1 rounded-full">NOVO</span>
              </div>
              <h3 className="text-lg font-bold mb-1">Club Uppi</h3>
              <p className="text-sm text-white/90 mb-3">Até 15% OFF em todas as corridas</p>
              <button className="text-sm font-semibold bg-white/20 hover:bg-white/30 transition px-4 py-2 rounded-full">
                Saiba mais →
              </button>
            </div>
          </div>

          {/* Promotion Banner */}
          <div className="bg-gradient-to-r from-[#007AFF] to-[#5856D6] rounded-3xl p-6 relative overflow-hidden">
            <div className="relative z-10">
              <p className="text-xs font-semibold text-white/80 mb-2">PROMOÇÃO</p>
              <h3 className="text-lg font-bold mb-1">20% OFF na próxima</h3>
              <p className="text-xs text-white/90 mb-3">Use o código <code className="bg-white/10 px-2 py-1 rounded">UPPI20</code></p>
              <div className="flex items-center gap-2">
                <button className="text-xs font-semibold bg-white/20 hover:bg-white/30 transition px-3 py-2 rounded-full">
                  Início
                </button>
                <button className="text-xs font-semibold bg-white/20 hover:bg-white/30 transition px-3 py-2 rounded-full">
                  📋
                </button>
                <button className="text-xs font-semibold bg-white/20 hover:bg-white/30 transition px-3 py-2 rounded-full">
                  ⚙️
                </button>
                <button className="text-xs font-semibold bg-white/20 hover:bg-white/30 transition px-3 py-2 rounded-full">
                  👤
                </button>
              </div>
            </div>
          </div>

          {/* Bottom Navigation Indicator */}
          <div className="flex justify-center gap-1 mt-8 mb-4">
            <div className="w-1.5 h-1.5 bg-[#007AFF] rounded-full" />
            <div className="w-1.5 h-1.5 bg-[#2a2a2a] rounded-full" />
            <div className="w-1.5 h-1.5 bg-[#2a2a2a] rounded-full" />
          </div>
        </div>
      )}
    </main>
  )
}
