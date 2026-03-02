'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Lock, Eye, EyeOff, CheckCircle2 } from 'lucide-react'
import { iosToast } from '@/lib/utils/ios-toast'
import { haptics } from '@/lib/utils/ios-haptics'

export default function PasswordPage() {
  const router = useRouter()
  const supabase = createClient()
  const [form, setForm] = useState({ current: '', next: '', confirm: '' })
  const [show, setShow] = useState({ current: false, next: false, confirm: false })
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.next !== form.confirm) {
      iosToast.error('As senhas novas nao coincidem')
      return
    }
    if (form.next.length < 8) {
      iosToast.error('A senha deve ter pelo menos 8 caracteres')
      return
    }
    setLoading(true)
    haptics.impactMedium()
    const { error } = await supabase.auth.updateUser({ password: form.next })
    setLoading(false)
    if (error) {
      iosToast.error('Erro ao alterar senha. Verifique a senha atual.')
    } else {
      setDone(true)
      haptics.notificationSuccess()
      setTimeout(() => router.back(), 1500)
    }
  }

  return (
    <div className="h-dvh overflow-y-auto bg-[#F2F2F7] dark:bg-black pb-10 ios-scroll">
      <header className="bg-white/80 dark:bg-black/80 ios-blur-heavy border-b border-black/[0.08] dark:border-white/[0.08] sticky top-0 z-20">
        <div className="px-5 pt-safe-offset-4 pb-4 flex items-center gap-4">
          <button type="button" onClick={() => router.back()} className="w-10 h-10 flex items-center justify-center rounded-full bg-secondary/60 ios-press">
            <ArrowLeft className="w-5 h-5" strokeWidth={2.5} />
          </button>
          <h1 className="text-[22px] font-bold text-foreground tracking-tight">Alterar Senha</h1>
        </div>
      </header>

      <main className="px-5 py-6 max-w-lg mx-auto">
        {done ? (
          <div className="flex flex-col items-center justify-center gap-4 py-20">
            <div className="w-20 h-20 bg-emerald-500/15 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-emerald-500" />
            </div>
            <p className="text-[20px] font-bold text-foreground">Senha alterada!</p>
            <p className="text-[15px] text-muted-foreground">Redirecionando...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="bg-white/90 dark:bg-[#1C1C1E]/90 rounded-[20px] overflow-hidden border border-black/[0.04] dark:border-white/[0.08] shadow-sm">
              {[
                { key: 'current', label: 'Senha atual' },
                { key: 'next', label: 'Nova senha' },
                { key: 'confirm', label: 'Confirmar nova senha' },
              ].map((field, i) => (
                <div key={field.key} className={`px-5 py-4 flex items-center gap-4 ${i < 2 ? 'border-b border-black/[0.04] dark:border-white/[0.04]' : ''}`}>
                  <Lock className="w-5 h-5 text-muted-foreground/50 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-[12px] text-muted-foreground mb-1">{field.label}</p>
                    <input
                      type={show[field.key as keyof typeof show] ? 'text' : 'password'}
                      value={form[field.key as keyof typeof form]}
                      onChange={e => setForm(prev => ({ ...prev, [field.key]: e.target.value }))}
                      placeholder="••••••••"
                      className="w-full bg-transparent text-[17px] text-foreground outline-none placeholder:text-muted-foreground/30"
                      required
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setShow(prev => ({ ...prev, [field.key]: !prev[field.key as keyof typeof show] }))}
                    className="text-muted-foreground/50 ios-press"
                  >
                    {show[field.key as keyof typeof show] ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              ))}
            </div>

            <p className="text-[13px] text-muted-foreground px-1">A senha deve ter no minimo 8 caracteres.</p>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-[54px] bg-blue-500 text-white rounded-[16px] font-semibold text-[17px] ios-press disabled:opacity-50"
            >
              {loading ? 'Salvando...' : 'Alterar Senha'}
            </button>
          </form>
        )}
      </main>
    </div>
  )
}
