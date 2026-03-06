'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

type PermissionState = 'default' | 'granted' | 'denied' | 'unsupported'

interface UsePushNotificationsReturn {
  permission: PermissionState
  isSubscribed: boolean
  isLoading: boolean
  subscribe: (fcmToken: string, platform?: 'android' | 'ios' | 'web') => Promise<boolean>
  unsubscribe: (fcmToken: string) => Promise<void>
}

/**
 * Hook para gerenciar tokens FCM do usuário.
 * Recebe o token gerado pelo SDK do Firebase/Capacitor e
 * persiste na tabela fcm_tokens do Supabase.
 */
export function usePushNotifications(): UsePushNotificationsReturn {
  const [permission, setPermission]     = useState<PermissionState>('default')
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isLoading, setIsLoading]       = useState(false)

  const supabase = createClient()

  // Verifica se o usuário já tem algum token FCM ativo
  useEffect(() => {
    if (typeof window === 'undefined') return

    if (!('Notification' in window)) {
      setPermission('unsupported')
      return
    }

    setPermission(Notification.permission as PermissionState)

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase
        .from('fcm_tokens')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .limit(1)
        .then(({ data }) => setIsSubscribed((data?.length ?? 0) > 0))
    })
  }, [])

  /**
   * Registra um token FCM (gerado pelo Firebase SDK / Capacitor Push)
   * na tabela fcm_tokens do Supabase.
   */
  const subscribe = useCallback(
    async (fcmToken: string, platform: 'android' | 'ios' | 'web' = 'android'): Promise<boolean> => {
      if (!fcmToken) return false

      setIsLoading(true)
      try {
        if ('Notification' in window) {
          const perm = await Notification.requestPermission()
          setPermission(perm as PermissionState)
          if (perm !== 'granted') return false
        }

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return false

        const { error } = await supabase
          .from('fcm_tokens')
          .upsert(
            {
              user_id:    user.id,
              token:      fcmToken,
              platform,
              is_active:  true,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'token' }
          )

        if (error) throw error

        setIsSubscribed(true)
        return true
      } catch (err) {
        console.error('[usePushNotifications] subscribe error:', err)
        return false
      } finally {
        setIsLoading(false)
      }
    },
    [supabase]
  )

  /**
   * Desativa o token FCM no Supabase.
   */
  const unsubscribe = useCallback(
    async (fcmToken: string): Promise<void> => {
      if (!fcmToken) return

      setIsLoading(true)
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        await supabase
          .from('fcm_tokens')
          .update({ is_active: false, updated_at: new Date().toISOString() })
          .eq('user_id', user.id)
          .eq('token', fcmToken)

        setIsSubscribed(false)
      } catch (err) {
        console.error('[usePushNotifications] unsubscribe error:', err)
      } finally {
        setIsLoading(false)
      }
    },
    [supabase]
  )

  return { permission, isSubscribed, isLoading, subscribe, unsubscribe }
}
