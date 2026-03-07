'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { iosToast } from '@/lib/utils/ios-toast'
import { createClient } from '@/lib/supabase/client'

export default function DriverLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const supabase = createClient()
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })

      if (error) {
        iosToast.error(error.message)
        return
      }

      if (data.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('user_type')
          .eq('id', data.user.id)
          .single()

        if (profile?.user_type === 'driver') {
          iosToast.success('Login realizado com sucesso!')
          router.push('/uppi/driver')
        } else {
          iosToast.error('Esta conta não é de motorista')
          await supabase.auth.signOut()
        }
      }
    } catch (error) {
      iosToast.error('Erro ao fazer login')
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    setIsLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/auth/callback?next=/uppi/driver` },
      })
      if (error) iosToast.error(error.message)
    } catch {
      iosToast.error('Erro ao fazer login com Google')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAppleLogin = async () => {
    setIsLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: { redirectTo: `${window.location.origin}/auth/callback?next=/uppi/driver` },
      })
      if (error) iosToast.error(error.message)
    } catch {
      iosToast.error('Erro ao fazer login com Apple')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-white dark:bg-black">
      {/* Header */}
      <div 
        className="flex items-center justify-between px-4"
        style={{ paddingTop: 'max(16px, calc(env(safe-area-inset-top, 0px) + 16px))' }}
      >
        <button
          onClick={() => router.back()}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-900 transition-colors active:scale-95"
        >
          <svg className="h-5 w-5 text-neutral-900 dark:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-[17px] font-semibold text-neutral-900 dark:text-white">Login Motorista</h1>
        <div className="w-10" />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 pt-8">
        <div className="mx-auto max-w-md">
          {/* Icon Badge */}
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#34C759] to-[#30D158]">
            <svg className="h-9 w-9 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
            </svg>
          </div>

          {/* Title */}
          <h2 className="mb-2 text-[28px] font-bold text-neutral-900 dark:text-white">Bem-vindo de volta</h2>
          <p className="mb-8 text-[15px] text-neutral-500 dark:text-neutral-400">
            Entre para continuar dirigindo e ganhando
          </p>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="email" className="mb-2 block text-[13px] font-medium text-neutral-700 dark:text-neutral-300">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                className="w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-4 py-3.5 text-[16px] text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:border-[#34C759] focus:outline-none focus:ring-2 focus:ring-[#34C759]/20"
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-2 block text-[13px] font-medium text-neutral-700 dark:text-neutral-300">
                Senha
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-4 py-3.5 text-[16px] text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:border-[#34C759] focus:outline-none focus:ring-2 focus:ring-[#34C759]/20"
              />
            </div>

            <div className="text-right">
              <button
                type="button"
                onClick={() => iosToast.info('Funcionalidade em breve')}
                className="text-[14px] font-medium text-[#34C759] active:opacity-70 transition-opacity"
              >
                Esqueceu a senha?
              </button>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="mt-6 w-full rounded-[14px] bg-[#34C759] py-4 text-[17px] font-semibold text-white transition-all active:scale-[0.97] disabled:opacity-50"
            >
              {isLoading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-neutral-200 dark:border-neutral-800" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white dark:bg-black px-4 text-[13px] text-neutral-400">ou continue com</span>
            </div>
          </div>

          {/* Social Login */}
          <div className="flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="flex h-14 w-14 items-center justify-center rounded-full border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 transition-colors active:scale-95 disabled:opacity-50"
            >
              <svg className="h-6 w-6" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            </button>
            <button
              type="button"
              onClick={handleAppleLogin}
              disabled={isLoading}
              className="flex h-14 w-14 items-center justify-center rounded-full border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 transition-colors active:scale-95 disabled:opacity-50"
            >
              <svg className="h-6 w-6 text-black dark:text-white" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
              </svg>
            </button>
          </div>

          {/* Sign Up Link */}
          <div className="mt-8 text-center pb-8">
            <p className="text-[14px] text-neutral-500 dark:text-neutral-400">
              Ainda não é motorista?{' '}
              <button
                onClick={() => router.push('/auth/driver/sign-up')}
                className="font-semibold text-[#34C759] active:opacity-70 transition-opacity"
              >
                Cadastre-se
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
