'use client'

import { createClient } from '@/lib/supabase/client'

export interface PixPaymentRequest {
  amount: number // em centavos (ex: 2500 = R$ 25,00)
  description: string
  payer_name: string
  payer_cpf: string
  ride_id: string
}

export interface PixPaymentResponse {
  success: boolean
  payment_id?: string
  qr_code?: string // QR Code em base64
  qr_code_text?: string // Código PIX copia e cola
  expires_at?: string
  error?: string
}

export interface PaymentStatus {
  payment_id: string
  status: 'pending' | 'paid' | 'expired' | 'cancelled'
  paid_at?: string
  amount: number
}

class PaymentService {
  private paradiseApiUrl = 'https://multi.paradisepags.com/api/v1/transaction.php'
  private get apiKey() { return process.env.PARADISE_API_KEY || process.env.NEXT_PUBLIC_GATEWAY_PARADISE_API_KEY || '' }
  private get productHash() { return process.env.PARADISE_PRODUCT_HASH || '' }

  /**
   * Cria um pagamento PIX via Paradise e retorna o QR Code
   */
  async createPixPayment(request: PixPaymentRequest): Promise<PixPaymentResponse> {
    try {
      const response = await fetch(this.paradiseApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey,
        },
        body: JSON.stringify({
          amount: request.amount,
          description: request.description || 'Pagamento PIX',
          reference: `RIDE-${request.ride_id}-${Date.now()}`,
          source: 'api_externa',
          customer: {
            name: request.payer_name,
            document: request.payer_cpf,
          },
        }),
      })

      const data = await response.json()

      if (!response.ok || data.status !== 'success') {
        return { success: false, error: data.message || 'Erro ao gerar PIX. Tente novamente.' }
      }

      const tx = data.data
      const supabase = createClient()
      await supabase.from('payments').insert({
        id: String(tx.transaction_id),
        ride_id: request.ride_id,
        amount: request.amount / 100,
        payment_method: 'pix',
        status: 'pending',
        pix_qr_code: tx.qr_code_base64,
        pix_qr_code_text: tx.qr_code,
        expires_at: tx.expires_at,
      }).throwOnError().catch(() => {})

      return {
        success: true,
        payment_id: String(tx.transaction_id),
        qr_code: tx.qr_code_base64,
        qr_code_text: tx.qr_code,
        expires_at: tx.expires_at,
      }
    } catch {
      return { success: false, error: 'Erro ao processar pagamento' }
    }
  }

  /**
   * Verifica o status de um pagamento PIX via /api/pix/status (proxy server-side)
   */
  async checkPaymentStatus(paymentId: string): Promise<PaymentStatus | null> {
    try {
      const res = await fetch(`/api/pix/status?hash=${encodeURIComponent(paymentId)}`, { cache: 'no-store' })
      const data = await res.json()

      if (data.status === 'paid') {
        const supabase = createClient()
        await supabase.from('payments').update({ status: 'completed', paid_at: new Date().toISOString() }).eq('id', paymentId)
      }

      return { payment_id: paymentId, status: data.status, amount: 0 }
    } catch {
      return null
    }
  }

  /**
   * Cancela um pagamento PIX
   */
  async cancelPayment(paymentId: string): Promise<boolean> {
    try {
      const supabase = createClient()
      await supabase.from('payments').update({ status: 'cancelled' }).eq('id', paymentId)
      return true
    } catch {
      return false
    }
  }

  /**
   * Processa pagamento em carteira digital
   */
  async processWalletPayment(rideId: string, userId: string, amount: number): Promise<boolean> {
    const supabase = createClient()

    try {
      console.log('[v0] Processing wallet payment:', { rideId, userId, amount })

      // Verificar saldo
      const { data: wallet } = await supabase
        .from('user_wallets')
        .select('balance')
        .eq('user_id', userId)
        .single()

      if (!wallet || wallet.balance < amount) {
        console.error('[v0] Insufficient balance')
        return false
      }

      // Criar transação
      const { error: txError } = await supabase.from('wallet_transactions').insert({
        user_id: userId,
        amount: -amount,
        type: 'ride_payment',
        description: `Pagamento da corrida`,
        ride_id: rideId,
      })

      if (txError) {
        console.error('[v0] Transaction error:', txError)
        return false
      }

      // Atualizar saldo
      await supabase
        .from('user_wallets')
        .update({ balance: wallet.balance - amount })
        .eq('user_id', userId)

      // Atualizar corrida
      await supabase
        .from('rides')
        .update({ payment_status: 'completed' })
        .eq('id', rideId)

      // Criar registro de pagamento
      await supabase.from('payments').insert({
        ride_id: rideId,
        amount,
        payment_method: 'wallet',
        status: 'completed',
        paid_at: new Date().toISOString(),
      })

      console.log('[v0] Wallet payment completed')
      return true
    } catch (error) {
      console.error('[v0] Wallet payment error:', error)
      return false
    }
  }
}

export const paymentService = new PaymentService()
