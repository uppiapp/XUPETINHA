'use client'

import { useState } from 'react'
import { PixPayment } from '@/components/pix-payment'
import { Loader2, ShieldCheck } from 'lucide-react'

interface FormData {
  amount: string
  description: string
  name: string
  email: string
  document: string
  phone: string
  apiKey: string
}

interface TransactionResult {
  transaction_id: number
  id: string
  qr_code: string
  qr_code_base64: string
  amount: number
  expires_at: string
}

export function PixCheckout() {
  const [step, setStep] = useState<'form' | 'payment'>('form')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [transaction, setTransaction] = useState<TransactionResult | null>(null)
  const [form, setForm] = useState<FormData>({
    amount: '', description: '', name: '', email: '', document: '', phone: '', apiKey: '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
    setError(null)
  }

  const formatDoc = (v: string) => v.replace(/\D/g, '')
  const formatPhone = (v: string) => v.replace(/\D/g, '')
  const formatAmount = (v: string) => {
    const n = parseFloat(v.replace(',', '.'))
    if (isNaN(n)) return 0
    return Math.round(n * 100)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const amountCents = formatAmount(form.amount)
    if (amountCents < 100) {
      setError('O valor minimo e R$ 1,00.')
      setLoading(false)
      return
    }
    try {
      const res = await fetch('https://multi.paradisepags.com/api/v1/transaction.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': form.apiKey },
        body: JSON.stringify({
          amount: amountCents,
          description: form.description || 'Pagamento PIX',
          reference: `REF-${Date.now()}`,
          source: 'api_externa',
          customer: {
            name: form.name,
            email: form.email,
            document: formatDoc(form.document),
            phone: formatPhone(form.phone),
          },
        }),
      })
      const data = await res.json()
      if (!res.ok || data.status !== 'success') {
        throw new Error(data.message || 'Erro ao criar transacao. Verifique os dados e tente novamente.')
      }
      setTransaction(data.data)
      setStep('payment')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro inesperado.')
    } finally {
      setLoading(false)
    }
  }

  const checkStatus = async (): Promise<'approved' | 'pending' | 'failed'> => {
    if (!transaction) return 'pending'
    try {
      const res = await fetch(`/api/pix/status?hash=${encodeURIComponent(String(transaction.transaction_id))}`)
      const data = await res.json()
      if (data.status === 'paid' || data.status === 'approved') return 'approved'
      if (data.status === 'failed' || data.status === 'cancelled') return 'failed'
    } catch { }
    return 'pending'
  }

  const inputClass = 'w-full rounded-xl border border-[var(--pix-border)] bg-[var(--pix-card)] px-4 py-3 text-sm text-[var(--pix-fg)] placeholder:text-[var(--pix-muted)] outline-none focus:ring-2 focus:ring-[var(--pix-accent)]/30 focus:border-[var(--pix-accent)] transition-all'

  if (step === 'payment' && transaction) {
    return (
      <div className="min-h-screen bg-[var(--pix-bg)] flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-[var(--pix-card)] rounded-2xl shadow-xl p-6 border border-[var(--pix-border)]">
          <PixPayment
            qrCode={transaction.qr_code}
            qrCodeBase64={transaction.qr_code_base64}
            amount={transaction.amount}
            expiresAt={transaction.expires_at}
            transactionId={transaction.transaction_id}
            onCheckStatus={checkStatus}
          />
          <button
            onClick={() => { setStep('form'); setTransaction(null) }}
            className="mt-4 w-full text-xs text-[var(--pix-muted)] hover:text-[var(--pix-fg)] transition-colors"
          >
            Voltar ao formulario
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--pix-bg)] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-[var(--pix-card)] border border-[var(--pix-border)] rounded-full px-4 py-2 mb-4 shadow-sm">
            <ShieldCheck className="w-4 h-4 text-[var(--pix-accent)]" />
            <span className="text-xs font-semibold text-[var(--pix-muted)]">Paradise Pagamentos</span>
          </div>
          <h1 className="text-2xl font-bold text-[var(--pix-fg)] tracking-tight">Gerar cobranca PIX</h1>
          <p className="text-sm text-[var(--pix-muted)] mt-1">Preencha os dados para gerar o QR Code</p>
        </div>
        <form onSubmit={handleSubmit} className="bg-[var(--pix-card)] rounded-2xl shadow-xl border border-[var(--pix-border)] p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs font-semibold text-[var(--pix-muted)] uppercase tracking-wide mb-1.5 block">Valor (R$)</label>
              <input name="amount" value={form.amount} onChange={handleChange} required placeholder="Ex: 49,90" className={inputClass} />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-semibold text-[var(--pix-muted)] uppercase tracking-wide mb-1.5 block">Descricao</label>
              <input name="description" value={form.description} onChange={handleChange} placeholder="Servico / produto" className={inputClass} />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-semibold text-[var(--pix-muted)] uppercase tracking-wide mb-1.5 block">Nome completo</label>
              <input name="name" value={form.name} onChange={handleChange} required placeholder="Nome do pagador" className={inputClass} />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-semibold text-[var(--pix-muted)] uppercase tracking-wide mb-1.5 block">E-mail</label>
              <input name="email" type="email" value={form.email} onChange={handleChange} required placeholder="email@exemplo.com" className={inputClass} />
            </div>
            <div>
              <label className="text-xs font-semibold text-[var(--pix-muted)] uppercase tracking-wide mb-1.5 block">CPF/CNPJ</label>
              <input name="document" value={form.document} onChange={handleChange} required placeholder="000.000.000-00" className={inputClass} />
            </div>
            <div>
              <label className="text-xs font-semibold text-[var(--pix-muted)] uppercase tracking-wide mb-1.5 block">Telefone</label>
              <input name="phone" value={form.phone} onChange={handleChange} placeholder="(11) 99999-9999" className={inputClass} />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-semibold text-[var(--pix-muted)] uppercase tracking-wide mb-1.5 block">API Key</label>
              <input name="apiKey" value={form.apiKey} onChange={handleChange} required placeholder="Sua chave de API" type="password" className={inputClass} />
            </div>
          </div>
          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 rounded-xl py-3.5 font-semibold text-sm bg-[var(--pix-accent)] hover:bg-[var(--pix-accent-hover)] text-white transition-all active:scale-[0.98] disabled:opacity-60 disabled:pointer-events-none"
          >
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Gerando QR Code...</> : 'Gerar QR Code PIX'}
          </button>
        </form>
      </div>
    </div>
  )
}
