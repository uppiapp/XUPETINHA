'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Shield, Smartphone, CheckCircle2, Mail } from 'lucide-react'
import { iosToast } from '@/lib/utils/ios-toast'
import { haptics } from '@/lib/utils/ios-haptics'

export default function TwoFactorPage() {
  const router = useRouter()
  const [method, setMethod] = useState<'sms' | 'email'>('sms')
  const [enabled, setEnabled] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleToggle = async () => {
    setLoading(true)
    haptics.impactMedium()
    await new Promise(r => setTimeout(r, 800))
    setEnabled(prev => !prev)
    setLoading(false)
    iosToast.success(enabled ? 'Verificacao em 2 etapas desativada' : 'Verificacao em 2 etapas ativada')
    haptics.notificationSuccess()
  }

  return (
    <div className="h-dvh overflow-y-auto bg-[#F2F2F7] dark:bg-black pb-10 ios-scroll">
      <header className="bg-white/80 dark:bg-black/80 ios-blur-heavy border-b border-black/[0.08] dark:border-white/[0.08] sticky top-0 z-20">
        <div className="px-5 pt-safe-offset-4 pb-4 flex items-center gap-4">
          <button type="button" onClick={() => router.back()} className="w-10 h-10 flex items-center justify-center rounded-full bg-secondary/60 ios-press">
            <ArrowLeft className="w-5 h-5" strokeWidth={2.5} />
          </button>
          <h1 className="text-[22px] font-bold text-foreground tracking-tight">Verificacao em 2 Etapas</h1>
        </div>
      </header>

      <main className="px-5 py-6 max-w-lg mx-auto space-y-5">
        {/* Status card */}
        <div className="bg-white/90 dark:bg-[#1C1C1E]/90 rounded-[20px] p-6 border border-black/[0.04] dark:border-white/[0.08] shadow-sm text-center">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${enabled ? 'bg-emerald-500/15' : 'bg-slate-100 dark:bg-white/5'}`}>
            <Shield className={`w-10 h-10 ${enabled ? 'text-emerald-500' : 'text-muted-foreground/50'}`} />
          </div>
          <p className="text-[20px] font-bold text-foreground mb-1">
            {enabled ? 'Ativada' : 'Desativada'}
          </p>
          <p className="text-[14px] text-muted-foreground">
            {enabled ? 'Sua conta esta protegida com verificacao em 2 etapas.' : 'Adicione uma camada extra de seguranca a sua conta.'}
          </p>
        </div>

        {/* Method selection */}
        <div>
          <p className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wide mb-2 px-1">Metodo de verificacao</p>
          <div className="bg-white/90 dark:bg-[#1C1C1E]/90 rounded-[20px] overflow-hidden border border-black/[0.04] dark:border-white/[0.08] shadow-sm">
            {[
              { id: 'sms', label: 'SMS', desc: 'Codigo enviado por mensagem de texto', icon: Smartphone },
              { id: 'email', label: 'Email', desc: 'Codigo enviado para seu email', icon: Mail },
            ].map((m, i) => (
              <button
                key={m.id}
                type="button"
                onClick={() => { haptics.selection(); setMethod(m.id as 'sms' | 'email') }}
                className={`w-full px-5 py-4 flex items-center gap-4 ios-press ${i === 0 ? 'border-b border-black/[0.04] dark:border-white/[0.04]' : ''}`}
              >
                <div className={`w-10 h-10 rounded-[12px] flex items-center justify-center ${method === m.id ? 'bg-blue-500/15' : 'bg-secondary/40'}`}>
                  <m.icon className={`w-5 h-5 ${method === m.id ? 'text-blue-500' : 'text-muted-foreground/50'}`} />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-[17px] font-semibold text-foreground">{m.label}</p>
                  <p className="text-[13px] text-muted-foreground">{m.desc}</p>
                </div>
                {method === m.id && <CheckCircle2 className="w-5 h-5 text-blue-500 flex-shrink-0" />}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          disabled={loading}
          onClick={handleToggle}
          className={`w-full h-[54px] rounded-[16px] font-semibold text-[17px] ios-press disabled:opacity-50 ${enabled ? 'bg-red-500/15 text-red-500' : 'bg-blue-500 text-white'}`}
        >
          {loading ? 'Aguarde...' : enabled ? 'Desativar 2FA' : 'Ativar Verificacao em 2 Etapas'}
        </button>
      </main>
    </div>
  )
}
