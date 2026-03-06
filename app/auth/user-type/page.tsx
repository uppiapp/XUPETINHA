'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { iosToast } from '@/lib/utils/ios-toast'
import { motion, useMotionValue, useTransform, AnimatePresence } from 'framer-motion'
import { SwipeTutorial } from '@/components/swipe-tutorial'
import { Car, DollarSign, MapPin, Clock, Users, TrendingUp, Gauge } from 'lucide-react'

const USER_TYPES = [
  {
    id: 'passenger',
    title: 'Passageiro',
    description: 'Solicite corridas com conforto e segurança',
    icon: MapPin,
    gradient: 'from-[#007AFF] via-[#0A84FF] to-[#5AC8FA]',
    bgGradient: 'from-blue-500/10 via-cyan-500/5 to-transparent',
    accentColor: '#007AFF',
    features: [
      { icon: MapPin, text: 'Vá para qualquer lugar', color: 'text-blue-500' },
      { icon: DollarSign, text: 'Preços transparentes', color: 'text-blue-500' },
      { icon: Users, text: 'Motoristas verificados', color: 'text-blue-500' }
    ],
    redirectTo: '/uppi/home'
  },
  {
    id: 'driver',
    title: 'Motorista',
    description: 'Ganhe dinheiro com seu próprio veículo',
    icon: Gauge,
    gradient: 'from-[#34C759] via-[#30D158] to-[#32D74B]',
    bgGradient: 'from-green-500/10 via-emerald-500/5 to-transparent',
    accentColor: '#34C759',
    features: [
      { icon: DollarSign, text: 'Defina seus preços', color: 'text-green-500' },
      { icon: Clock, text: 'Trabalhe quando quiser', color: 'text-green-500' },
      { icon: TrendingUp, text: 'Maximize seus ganhos', color: 'text-green-500' }
    ],
    redirectTo: '/auth/driver/welcome'
  }
]

export default function UserTypePage() {
  const router = useRouter()
  const [selectedType, setSelectedType] = useState<'passenger' | 'driver' | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [dragStartX, setDragStartX] = useState(0)
  const x = useMotionValue(0)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Check if user already has a type selected
    const checkUserType = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('user_type')
          .eq('id', user.id)
          .single()
        
        if (profile?.user_type === 'passenger') {
          router.push('/uppi/home')
        } else if (profile?.user_type === 'driver') {
          router.push('/auth/driver/welcome')
        }
      }
    }
    
    checkUserType()
  }, [router])

  const handleConfirm = async () => {
    if (!selectedType) {
      iosToast.error('Selecione uma opção')
      return
    }

    setIsLoading(true)
    
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        iosToast.error('Usuário não autenticado')
        router.push('/auth/login')
        return
      }

      const { error } = await supabase
        .from('profiles')
        .update({ user_type: selectedType })
        .eq('id', user.id)

      if (error) throw error

      const selectedUserType = USER_TYPES.find(t => t.id === selectedType)
      iosToast.success(`Bem-vindo como ${selectedType === 'driver' ? 'motorista' : 'passageiro'}!`)
      
      // Redirect to the correct page based on user type
      if (selectedUserType) {
        router.push(selectedUserType.redirectTo)
      }
    } catch (error: any) {
      console.error('[v0] Error updating user type:', error)
      iosToast.error('Erro ao salvar preferência')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSwipe = (direction: 'left' | 'right') => {
    if (direction === 'left' && currentIndex < USER_TYPES.length - 1) {
      setCurrentIndex(currentIndex + 1)
      setSelectedType(USER_TYPES[currentIndex + 1].id as 'passenger' | 'driver')
    } else if (direction === 'right' && currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
      setSelectedType(USER_TYPES[currentIndex - 1].id as 'passenger' | 'driver')
    }
  }

  const handleDragEnd = (_: any, info: any) => {
    const threshold = 50
    if (info.offset.x < -threshold) {
      handleSwipe('left')
    } else if (info.offset.x > threshold) {
      handleSwipe('right')
    }
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-gradient-to-br from-white via-blue-50/30 to-purple-50/30 dark:from-black dark:via-blue-950/20 dark:to-purple-950/20">
      {/* Swipe Tutorial */}
      <SwipeTutorial />
      
      {/* Animated Background Blobs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 90, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear"
          }}
          className="absolute -top-20 -right-20 h-96 w-96 rounded-full bg-gradient-to-br from-blue-400/20 to-purple-400/20 blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
            rotate: [0, -90, 0],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "linear"
          }}
          className="absolute -bottom-20 -left-20 h-96 w-96 rounded-full bg-gradient-to-br from-green-400/20 to-blue-400/20 blur-3xl"
        />
      </div>

      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 px-6"
        style={{ paddingTop: 'max(24px, calc(env(safe-area-inset-top, 0px) + 24px))' }}
      >
        <motion.h1 
          className="text-[34px] font-bold text-neutral-900 dark:text-white mb-2"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          Como você quer usar o app?
        </motion.h1>
        <motion.p 
          className="text-[17px] text-neutral-500 dark:text-neutral-400"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          Deslize para explorar as opções
        </motion.p>
      </motion.div>

      {/* Cards Container */}
      <div className="relative flex-1 overflow-hidden" ref={containerRef}>
        <div className="absolute inset-0 flex items-center justify-center px-6 py-12">
          <AnimatePresence mode="wait">
            {USER_TYPES.map((type, index) => (
              <motion.div
                key={type.id}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.2}
                onDragEnd={handleDragEnd}
                initial={{ 
                  opacity: 0, 
                  scale: 0.8,
                  x: index === 0 ? 0 : 400
                }}
                animate={{ 
                  opacity: currentIndex === index ? 1 : 0,
                  scale: currentIndex === index ? 1 : 0.8,
                  x: currentIndex === index ? 0 : (index < currentIndex ? -400 : 400),
                  zIndex: currentIndex === index ? 10 : 0,
                }}
                exit={{ 
                  opacity: 0,
                  scale: 0.8,
                  x: index < currentIndex ? -400 : 400
                }}
                transition={{ 
                  type: "spring",
                  stiffness: 300,
                  damping: 30
                }}
                onClick={() => setSelectedType(type.id as 'passenger' | 'driver')}
                className={`absolute max-w-md w-full cursor-pointer ${currentIndex === index ? '' : 'pointer-events-none'}`}
              >
                {/* iOS Style Card */}
                <motion.div
                  whileTap={{ scale: 0.97 }}
                  className="relative overflow-hidden rounded-[40px] bg-white/90 dark:bg-[#1C1C1E]/90 backdrop-blur-2xl shadow-2xl border border-black/[0.08] dark:border-white/[0.08]"
                  style={{
                    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05)'
                  }}
                >
                  {/* Gradient Header */}
                  <div className={`relative h-48 bg-gradient-to-br ${type.gradient} overflow-hidden`}>
                    {/* Animated Pattern */}
                    <div className="absolute inset-0 opacity-20">
                      <motion.div
                        animate={{
                          backgroundPosition: ['0% 0%', '100% 100%'],
                        }}
                        transition={{
                          duration: 20,
                          repeat: Infinity,
                          ease: "linear"
                        }}
                        className="absolute inset-0"
                        style={{
                          backgroundImage: 'radial-gradient(circle at 20% 50%, white 2px, transparent 2px), radial-gradient(circle at 80% 50%, white 2px, transparent 2px)',
                          backgroundSize: '50px 50px'
                        }}
                      />
                    </div>
                    
                    {/* Icon */}
                    <div className="relative h-full flex items-center justify-center">
                      <motion.div
                        animate={{
                          y: selectedType === type.id ? [-5, 0, -5] : 0,
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: "easeInOut"
                        }}
                        className="w-24 h-24 rounded-[28px] bg-white/20 backdrop-blur-xl flex items-center justify-center shadow-2xl border border-white/30"
                      >
                        <type.icon className="w-14 h-14 text-white" strokeWidth={1.5} />
                      </motion.div>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="relative p-8">
                    {/* Title & Description */}
                    <div className="mb-6">
                      <h2 className="text-[28px] font-bold text-foreground mb-2 tracking-tight">
                        {type.title}
                      </h2>
                      <p className="text-[15px] text-[#8E8E93] leading-relaxed">
                        {type.description}
                      </p>
                    </div>

                    {/* Features */}
                    <div className="space-y-4">
                      {type.features.map((feature, idx) => {
                        const FeatureIcon = feature.icon
                        return (
                          <motion.div
                            key={idx}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.4 + idx * 0.1 }}
                            className="flex items-center gap-4 p-4 rounded-[20px] bg-gradient-to-r from-[#F2F2F7]/80 to-transparent dark:from-white/[0.03]"
                          >
                            <div className={`flex-shrink-0 w-11 h-11 rounded-[14px] bg-gradient-to-br ${type.bgGradient} flex items-center justify-center`}>
                              <FeatureIcon className={`w-5 h-5 ${feature.color}`} strokeWidth={2.5} />
                            </div>
                            <span className="text-[15px] font-medium text-foreground">
                              {feature.text}
                            </span>
                          </motion.div>
                        )
                      })}
                    </div>

                    {/* Selected Badge */}
                    <AnimatePresence>
                      {selectedType === type.id && (
                        <motion.div
                          initial={{ scale: 0, opacity: 0, rotate: -180 }}
                          animate={{ scale: 1, opacity: 1, rotate: 0 }}
                          exit={{ scale: 0, opacity: 0, rotate: 180 }}
                          className="absolute top-8 right-8"
                        >
                          <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${type.gradient} flex items-center justify-center shadow-xl`}>
                            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Pagination Dots */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="relative z-10 flex items-center justify-center gap-2 pb-6"
      >
        {USER_TYPES.map((type, index) => (
          <motion.button
            key={type.id}
            onClick={() => {
              setCurrentIndex(index)
              setSelectedType(type.id as 'passenger' | 'driver')
            }}
            className="relative h-2.5 overflow-hidden rounded-full transition-all"
            animate={{
              width: currentIndex === index ? 32 : 8,
              opacity: currentIndex === index ? 1 : 0.4
            }}
          >
            <div className={`h-full w-full rounded-full bg-gradient-to-r ${type.gradient}`} />
          </motion.button>
        ))}
      </motion.div>

      {/* Continue Button */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="relative z-10 px-6"
        style={{ paddingBottom: 'max(24px, calc(env(safe-area-inset-bottom, 0px) + 24px))' }}
      >
        <motion.button
          onClick={handleConfirm}
          disabled={!selectedType || isLoading}
          whileTap={{ scale: 0.97 }}
          className={`w-full rounded-[16px] py-4 text-[17px] font-semibold text-white shadow-lg transition-all disabled:opacity-40 disabled:scale-100 ${
            selectedType 
              ? `bg-gradient-to-r ${USER_TYPES.find(t => t.id === selectedType)?.gradient}`
              : 'bg-neutral-400'
          }`}
          animate={{
            boxShadow: selectedType 
              ? '0 10px 40px rgba(0,122,255,0.3)' 
              : '0 10px 40px rgba(0,0,0,0.1)'
          }}
        >
          {isLoading ? 'Salvando...' : 'Continuar'}
        </motion.button>

        {/* Skip Button */}
        <motion.button
          onClick={() => router.push('/uppi/home')}
          className="mt-4 w-full py-3 text-[15px] font-medium text-neutral-500 dark:text-neutral-400 active:opacity-70"
          whileTap={{ scale: 0.97 }}
        >
          Pular por enquanto
        </motion.button>
      </motion.div>
    </div>
  )
}
