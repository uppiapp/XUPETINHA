import { createClient } from '@/lib/supabase/client'

export type NotificationType =
  | 'new_offer'
  | 'offer_accepted'
  | 'ride_started'
  | 'ride_completed'
  | 'driver_arriving'
  | 'driver_arrived'
  | 'payment_received'
  | 'new_message'

export interface NotificationData {
  type: NotificationType
  title: string
  body: string
  data?: Record<string, unknown>
  ride_id?: string
  user_id: string
  priority?: 'high' | 'normal'
}

class NotificationService {
  private supabase = createClient()

  /**
   * Envia notificação: salva na tabela notifications (Realtime) +
   * dispara FCM via /api/v1/push/send (app fechado / tela bloqueada).
   */
  async sendNotification(
    notification: NotificationData
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await this.supabase.from('notifications').insert({
        user_id:  notification.user_id,
        title:    notification.title,
        body:     notification.body,
        type:     notification.type,
        data:     notification.data ?? {},
        is_read:  false,
      })

      if (error) throw error

      // Dispara FCM — best effort, não bloqueia o fluxo principal
      await this.sendFcmPush(notification)

      return { success: true }
    } catch (error) {
      console.error('[NotificationService] sendNotification error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      }
    }
  }

  /** Busca notificações do usuário */
  async getUserNotifications(userId: string, limit = 20) {
    try {
      const { data, error } = await this.supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) throw error
      return { success: true, notifications: data }
    } catch (error) {
      console.error('[NotificationService] getUserNotifications error:', error)
      return { success: false, error: 'Falha ao carregar notificações' }
    }
  }

  /** Marca uma notificação como lida */
  async markAsRead(notificationId: string) {
    try {
      const { error } = await this.supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', notificationId)

      if (error) throw error
      return { success: true }
    } catch (error) {
      console.error('[NotificationService] markAsRead error:', error)
      return { success: false }
    }
  }

  /** Marca todas as notificações do usuário como lidas */
  async markAllAsRead(userId: string) {
    try {
      const { error } = await this.supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('is_read', false)

      if (error) throw error
      return { success: true }
    } catch (error) {
      console.error('[NotificationService] markAllAsRead error:', error)
      return { success: false }
    }
  }

  /** Retorna contagem de notificações não lidas */
  async getUnreadCount(userId: string) {
    try {
      const { count, error } = await this.supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false)

      if (error) throw error
      return { success: true, count: count ?? 0 }
    } catch (error) {
      console.error('[NotificationService] getUnreadCount error:', error)
      return { success: false, count: 0 }
    }
  }

  /**
   * Subscribe Supabase Realtime para notificações em tempo real (app aberto).
   * Retorna função de cleanup para remover o canal.
   */
  subscribeToNotifications(
    userId: string,
    callback: (notification: unknown) => void
  ): () => void {
    const channel = this.supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event:  'INSERT',
          schema: 'public',
          table:  'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => callback(payload.new)
      )
      .subscribe()

    return () => { this.supabase.removeChannel(channel) }
  }

  /** Atalho para notificar mudanças de status da corrida */
  async notifyRideStatus(
    userId: string,
    rideId: string,
    status: string,
    driverName?: string
  ) {
    const map: Record<
      string,
      { title: string; body: string; type: NotificationType }
    > = {
      driver_arriving: {
        title: 'Motorista a caminho',
        body:  `${driverName ?? 'Seu motorista'} está indo até você`,
        type:  'driver_arriving',
      },
      driver_arrived: {
        title: 'Motorista chegou!',
        body:  `${driverName ?? 'Seu motorista'} está te esperando`,
        type:  'driver_arrived',
      },
      in_progress: {
        title: 'Corrida iniciada',
        body:  'Sua corrida começou. Boa viagem!',
        type:  'ride_started',
      },
      completed: {
        title: 'Corrida finalizada',
        body:  'Avalie sua experiência',
        type:  'ride_completed',
      },
    }

    const notification = map[status]
    if (!notification) return

    return this.sendNotification({
      ...notification,
      user_id:  userId,
      ride_id:  rideId,
      priority: 'high',
    })
  }

  /**
   * Chama /api/v1/push/send para entregar o FCM ao(s) dispositivo(s)
   * do usuário — funciona com app fechado / tela bloqueada.
   */
  private async sendFcmPush(notification: NotificationData) {
    try {
      await fetch('/api/v1/push/send', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: notification.user_id,
          title:   notification.title,
          body:    notification.body,
          data: {
            type:    notification.type,
            ride_id: notification.ride_id ?? '',
            ...(notification.data ?? {}),
          },
        }),
      })
    } catch (err) {
      console.error('[NotificationService] sendFcmPush error:', err)
    }
  }
}

export const notificationService = new NotificationService()
