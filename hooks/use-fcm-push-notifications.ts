'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

type Platform = 'android' | 'ios' | 'web' | 'unknown'

type FcmPermissionState = 'default' | 'granted' | 'denied' | 'unsupported'

interface UseFcmPushNotificationsReturn {
  permission: FcmPermissionState
  isRegistered: boolean
  isLoading: boolean
  platform: Platform
  register: () => Promise<boolean>
  unregister: () => Promise<void>
  updateToken: (token: string) => Promise<boolean>
}

/**
 * Detecta a plataforma atual
 */
function detectPlatform(): Platform {
  if (typeof window === 'undefined') return 'unknown'
  const ua = navigator.userAgent.toLowerCase()
  // Capacitor expoe window.Capacitor
  if ('Capacitor' in window) {
    const cap = (window as { Capacitor?: { getPlatform?: () => string } }).Capacitor
    const p = cap?.getPlatform?.()
    if (p === 'ios') return 'ios'
    if (p === 'android') return 'android'
  }
  if (/iphone|ipad|ipod/.test(ua)) return 'ios'
  if (/android/.test(ua)) return 'android'
  return 'web'
}

/**
 * Hook principal para FCM via Capacitor + PushNotifications plugin.
 * No browser (web) faz fallback para o hook VAPID existente.
 *
 * Dependencia Capacitor (nao importada estaticamente para nao quebrar SSR):
 *   @capacitor/push-notifications  (instalado no projeto mobile)
 *
 * Fluxo:
 *  1. Solicita permissao ao SO via PushNotifications.requestPermissions()
 *  2. Chama PushNotifications.register()
 *  3. Escuta 'registration' event que entrega o FCM token
 *  4. Salva o token na tabela fcm_tokens via /api/v1/push/fcm-register
 *  5. Escuta 'pushNotificationReceived' para notificacoes com app aberto
 *  6. Escuta 'pushNotificationActionPerformed' para taps no app fechado
 */
export function useFcmPushNotifications(): UseFcmPushNotificationsReturn {
  const [permission, setPermission]     = useState<FcmPermissionState>('default')
  const [isRegistered, setIsRegistered] = useState(false)
  const [isLoading, setIsLoading]       = useState(false)
  const [platform]                      = useState<Platform>(detectPlatform)
  const [currentToken, setCurrentToken] = useState<string | null>(null)

  const supabase = createClient()

  // ----------------------------------------------------------------
  // Salva o token FCM no banco via Supabase diretamente
  // ----------------------------------------------------------------
  const saveToken = useCallback(async (token: string): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return false

      const { error } = await supabase
        .from('fcm_tokens')
        .upsert(
          {
            user_id:    user.id,
            token,
            platform:   platform === 'unknown' ? 'web' : platform,
            is_active:  true,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'token' }
        )

      if (error) {
        console.error('[useFcmPushNotifications] saveToken error:', error)
        return false
      }

      // Atualiza tambem o fcm_token no perfil do usuario (campo legado)
      await supabase
        .from('profiles')
        .update({ fcm_token: token })
        .eq('id', user.id)

      setCurrentToken(token)
      setIsRegistered(true)
      return true
    } catch (err) {
      console.error('[useFcmPushNotifications] saveToken exception:', err)
      return false
    }
  }, [platform, supabase])

  // ----------------------------------------------------------------
  // Desativa o token no banco
  // ----------------------------------------------------------------
  const deactivateToken = useCallback(async (token: string) => {
    try {
      await supabase
        .from('fcm_tokens')
        .update({ is_active: false })
        .eq('token', token)
    } catch (err) {
      console.error('[useFcmPushNotifications] deactivateToken error:', err)
    }
  }, [supabase])

  // ----------------------------------------------------------------
  // Inicializacao: verifica se ja ha token armazenado
  // ----------------------------------------------------------------
  useEffect(() => {
    if (typeof window === 'undefined') return

    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('fcm_tokens')
        .select('token')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .eq('platform', platform === 'unknown' ? 'web' : platform)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single()

      if (data?.token) {
        setCurrentToken(data.token)
        setIsRegistered(true)
        setPermission('granted')
      }
    }

    init()
  }, [platform, supabase])

  // ----------------------------------------------------------------
  // Registra para push (Capacitor nativo)
  // ----------------------------------------------------------------
  const register = useCallback(async (): Promise<boolean> => {
    if (typeof window === 'undefined') return false
    setIsLoading(true)

    try {
      // Tenta importar o plugin Capacitor dinamicamente
      // (nao disponivel no browser normal, lanca excecao que e capturada)
      const { PushNotifications } = await import('@capacitor/push-notifications')

      // 1. Solicita permissao
      const permResult = await PushNotifications.requestPermissions()
      if (permResult.receive !== 'granted') {
        setPermission('denied')
        return false
      }
      setPermission('granted')

      // 2. Listeners: registra antes de chamar register()
      let tokenResolve: (token: string) => void
      const tokenPromise = new Promise<string>((resolve) => { tokenResolve = resolve })

      await PushNotifications.addListener('registration', async (token) => {
        tokenResolve(token.value)
      })

      await PushNotifications.addListener('registrationError', (err) => {
        console.error('[useFcmPushNotifications] FCM registration error:', err)
        tokenResolve('')
      })

      // Listener para notificacoes recebidas com app aberto
      await PushNotifications.addListener('pushNotificationReceived', (notification) => {
        const event = new CustomEvent('fcm-notification', { detail: notification })
        window.dispatchEvent(event)
      })

      // Listener para taps em notificacoes (app fechado/background)
      await PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
        const event = new CustomEvent('fcm-notification-tap', { detail: action })
        window.dispatchEvent(event)
      })

      // 3. Registra no FCM
      await PushNotifications.register()

      // 4. Aguarda o token (timeout de 10s)
      const token = await Promise.race([
        tokenPromise,
        new Promise<string>((_, reject) =>
          setTimeout(() => reject(new Error('FCM token timeout')), 10_000)
        ),
      ])

      if (!token) return false

      // 5. Salva no banco
      return await saveToken(token)
    } catch (err) {
      // Capacitor nao disponivel — browser/web
      if (err instanceof Error && err.message.includes('Cannot find module')) {
        // Fallback: Web Push VAPID (redireciona para o hook VAPID)
        console.warn('[useFcmPushNotifications] Capacitor nao disponivel, use usePushNotifications para VAPID')
      } else {
        console.error('[useFcmPushNotifications] register error:', err)
      }
      return false
    } finally {
      setIsLoading(false)
    }
  }, [saveToken])

  // ----------------------------------------------------------------
  // Cancela o registro
  // ----------------------------------------------------------------
  const unregister = useCallback(async (): Promise<void> => {
    setIsLoading(true)
    try {
      if (currentToken) {
        await deactivateToken(currentToken)
      }

      // Remove listeners Capacitor se disponivel
      try {
        const { PushNotifications } = await import('@capacitor/push-notifications')
        await PushNotifications.removeAllListeners()
      } catch {
        // nao disponivel no browser
      }

      setIsRegistered(false)
      setCurrentToken(null)
      setPermission('default')
    } catch (err) {
      console.error('[useFcmPushNotifications] unregister error:', err)
    } finally {
      setIsLoading(false)
    }
  }, [currentToken, deactivateToken])

  // ----------------------------------------------------------------
  // Atualiza token manualmente (util quando o FCM rotaciona o token)
  // ----------------------------------------------------------------
  const updateToken = useCallback(async (token: string): Promise<boolean> => {
    if (currentToken && currentToken !== token) {
      await deactivateToken(currentToken)
    }
    return saveToken(token)
  }, [currentToken, deactivateToken, saveToken])

  return { permission, isRegistered, isLoading, platform, register, unregister, updateToken }
}
