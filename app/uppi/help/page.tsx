'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { BottomNavigation } from '@/components/bottom-navigation'
import { iosToast } from '@/lib/utils/ios-toast'
import { haptics } from '@/lib/utils/ios-haptics'
import { IOSSearchBar } from '@/components/ui/ios-search-bar'
import { IOSCard } from '@/components/ui/ios-card'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Car, CreditCard, Heart, Bell, MessageCircle, Shield, ChevronDown } from 'lucide-react'

interface Faq {
  id: string
  question: string
  answer: string
  category: string
  order_index: number
}

// FAQs estáticas como fallback caso a tabela ainda não exista
const fallbackFaqs: Faq[] = [
  { id: '1', question: 'Como funciona a negociação de preço?', answer: 'Você informa seu destino e o preço que deseja pagar. Motoristas próximos recebem sua solicitação e podem aceitar seu preço ou fazer uma contra-oferta. Você escolhe a melhor opção.', category: 'Corridas', order_index: 1 },
  { id: '2', question: 'Como sei se o motorista é confiável?', answer: 'Todos os motoristas passam por verificação de documentos. Você pode ver a avaliação, número de corridas e comentários de outros passageiros antes de aceitar.', category: 'Seguranca', order_index: 2 },
  { id: '3', question: 'Posso cancelar uma corrida?', answer: 'Sim, você pode cancelar antes do motorista chegar. Cancelamentos após o motorista iniciar o deslocamento podem ter taxa de cancelamento.', category: 'Corridas', order_index: 3 },
  { id: '4', question: 'Como funciona o pagamento?', answer: 'Você pode pagar em dinheiro, cartão de crédito/débito ou PIX. O pagamento é processado apenas após a conclusão da viagem.', category: 'Pagamentos', order_index: 4 },
  { id: '5', question: 'O que fazer em caso de emergência?', answer: 'Use o botão SOS dentro do app durante a corrida. Suas informações e localização serão compartilhadas com nosso suporte e contatos de emergência.', category: 'Seguranca', order_index: 5 },
  { id: '6', question: 'Como adicionar um método de pagamento?', answer: 'Vá em Perfil > Pagamentos e adicione seu cartão ou configure o PIX. Todos os dados são criptografados e seguros.', category: 'Pagamentos', order_index: 6 },
]

export default function HelpPage() {
  const router = useRouter()
  const supabase = createClient()
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null)
  const [showContactForm, setShowContactForm] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [faqs, setFaqs] = useState<Faq[]>(fallbackFaqs)

  useEffect(() => {
    supabase
      .from('faqs')
      .select('id, question, answer, category, order_index')
      .eq('is_active', true)
      .order('order_index', { ascending: true })
      .then(({ data }) => {
        if (data && data.length > 0) setFaqs(data as Faq[])
      })
  }, [])

  const quickActions = [
    { icon: Car, title: 'Minhas Corridas', path: '/uppi/history' },
    { icon: CreditCard, title: 'Pagamentos', path: '/uppi/profile' },
    { icon: Heart, title: 'Favoritos', path: '/uppi/favorites' },
    { icon: Bell, title: 'Notificacoes', path: '/uppi/notifications' },
  ]

  const filteredFaqs = searchQuery
    ? faqs.filter(faq =>
        faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : faqs

  return (
    <div className="h-dvh overflow-y-auto bg-gradient-to-b from-[#F2F2F7] via-[#FAFAFA] to-white dark:from-black dark:via-[#0A0A0A] dark:to-[#111111] pb-28 ios-scroll">
      {/* Animated background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-500/10 dark:bg-blue-500/20 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-indigo-500/10 dark:bg-indigo-500/20 rounded-full blur-3xl animate-pulse-slow-delayed" />
      </div>

      {/* Header */}
      <header className="relative z-10 bg-white/80 dark:bg-black/80 ios-blur-heavy border-b border-black/[0.08] dark:border-white/[0.08] sticky top-0">
        <div className="px-5 pt-safe-offset-4 pb-4">
          <div className="flex items-center gap-4 mb-4">
            <button
              type="button"
              onClick={() => {
                haptics.impactLight()
                router.back()
              }}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-secondary/60 ios-press"
            >
              <ArrowLeft className="w-5 h-5 text-foreground" strokeWidth={2.5} />
            </button>
            <div className="flex-1">
              <h1 className="text-[28px] font-bold text-foreground tracking-tight">Central de Ajuda</h1>
              <p className="text-[13px] text-muted-foreground mt-0.5">Como podemos ajudar?</p>
            </div>
          </div>

          <IOSSearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Buscar ajuda..."
          />
        </div>
      </header>

      <main className="relative z-10 px-5 py-6 max-w-2xl mx-auto space-y-6">
        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        >
          <h2 className="text-[20px] font-bold text-foreground tracking-tight mb-4 px-1">Acesso Rápido</h2>
          <div className="grid grid-cols-2 gap-4">
            {quickActions.map((action, index) => (
              <motion.button
                key={index}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                type="button"
                onClick={() => {
                  haptics.selection()
                  router.push(action.path)
                }}
                className="group bg-white/80 dark:bg-[#1C1C1E]/80 backdrop-blur-xl rounded-[20px] p-5 text-left shadow-lg border border-black/[0.04] dark:border-white/[0.08] ios-press"
              >
                <div className="w-12 h-12 bg-blue-500/10 dark:bg-blue-500/20 rounded-[16px] flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <action.icon className="w-6 h-6 text-blue-600 dark:text-blue-400" strokeWidth={2} />
                </div>
                <p className="text-[15px] font-semibold text-foreground">{action.title}</p>
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* FAQs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30, delay: 0.1 }}
        >
          <h2 className="text-[20px] font-bold text-foreground tracking-tight mb-4 px-1">
            Perguntas Frequentes
            {searchQuery && <span className="text-[15px] text-muted-foreground ml-2">({filteredFaqs.length} resultados)</span>}
          </h2>
          <div className="bg-white/80 dark:bg-[#1C1C1E]/80 backdrop-blur-xl rounded-[24px] overflow-hidden border border-black/[0.04] dark:border-white/[0.08] shadow-lg">
            <AnimatePresence>
              {filteredFaqs.map((faq, index) => (
                <motion.div
                  key={faq.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className={index < filteredFaqs.length - 1 ? 'border-b border-black/[0.04] dark:border-white/[0.04]' : ''}
                >
                  <button
                    type="button"
                    onClick={() => {
                      haptics.selection()
                      setExpandedFaq(expandedFaq === faq.id ? null : faq.id)
                    }}
                    className="w-full px-5 py-5 text-left flex items-start justify-between gap-4 ios-press"
                  >
                    <span className="text-[17px] font-semibold text-foreground leading-snug">{faq.question}</span>
                    <motion.div
                      animate={{ rotate: expandedFaq === faq.id ? 180 : 0 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                      className="flex-shrink-0 mt-1"
                    >
                      <ChevronDown className="w-5 h-5 text-muted-foreground/40" strokeWidth={2.5} />
                    </motion.div>
                  </button>
                  <AnimatePresence>
                    {expandedFaq === faq.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                        className="overflow-hidden"
                      >
                        <div className="px-5 pb-5 text-[15px] text-muted-foreground leading-relaxed">
                          {faq.answer}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Contact Support */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30, delay: 0.2 }}
          className="relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 rounded-[28px]" />
          <div className="absolute inset-0 bg-[url('/noise.png')] opacity-10 mix-blend-overlay" />

          <div className="relative p-8 text-white text-center">
            <div className="w-16 h-16 rounded-[20px] bg-white/20 backdrop-blur-sm flex items-center justify-center mx-auto mb-4">
              <MessageCircle className="w-8 h-8 text-white" strokeWidth={2} />
            </div>
            <h3 className="text-[24px] font-bold mb-2">Não encontrou?</h3>
            <p className="text-[15px] text-blue-100 mb-6 leading-relaxed">
              Nossa equipe está pronta para ajudar você
            </p>
            <button
              type="button"
              onClick={() => {
                haptics.impactMedium()
                router.push('/uppi/suporte')
              }}
              className="w-full h-[54px] bg-white text-blue-600 rounded-[16px] font-semibold text-[17px] ios-press shadow-2xl"
            >
              Falar com Suporte
            </button>
          </div>
        </motion.div>

        {/* Emergency */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30, delay: 0.3 }}
        >
          <IOSCard variant="glass" className="bg-red-500/10 dark:bg-red-500/20 border-red-500/20">
            <div className="flex items-start gap-4 p-6">
              <div className="w-12 h-12 bg-red-500 rounded-[16px] flex items-center justify-center flex-shrink-0 shadow-lg">
                <Shield className="w-6 h-6 text-white" strokeWidth={2} />
              </div>
              <div className="flex-1">
                <h3 className="text-[18px] font-bold text-red-900 dark:text-red-100 mb-2">Emergência?</h3>
                <p className="text-[15px] text-red-800 dark:text-red-200 leading-relaxed">
                  Se você está em perigo, ligue imediatamente para a polícia (190) ou use o botão SOS durante uma corrida.
                </p>
              </div>
            </div>
          </IOSCard>
        </motion.div>
      </main>

      <BottomNavigation />
    </div>
  )
}

