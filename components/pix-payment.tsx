'use client'

import { useState, useEffect, useRef } from 'react'
import { CheckCircle, Copy, Clock, RefreshCw, AlertCircle, Loader2 } from 'lucide-react'

interface PixPaymentProps {
  qrCode: string
  qrCodeBase64: string
  amount: number
  expiresAt: string
  transactionId: number | string
  onCheckStatus?: () => Promise<'approved' | 'pending' | 'failed'>
}

export function PixPayment({ qrCode, qrCodeBase64, amount, expiresAt, transactionId, onCheckStatus }: PixPaymentProps) {
  const [copied, setCopied] = useState(false)
  const [status, setStatus] = useState<'pending' | 'approved' | 'failed' | 'expired'>('pending')
  const [timeLeft, setTimeLeft] = useState<number | null>(null)
  const [checking, setChecking] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const pollRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const expires = new Date(expiresAt).getTime()
    const update = () => {
      const now = Date.now()
      const diff = Math.floor((expires - now) / 1000)
      if (diff <= 0) {
        setTimeLeft(0)
        if (status === 'pending') setStatus('expired')
        if (intervalRef.current) clearInterval(intervalRef.current)
      } else {
        setTimeLeft(diff)
      }
    }
    update()
    intervalRef.current = setInterval(update, 1000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [expiresAt, status])

  useEffect(() => {
    if (!onCheckStatus || status !== 'pending') return
    pollRef.current = setInterval(async () => {
      const s = await onCheckStatus()
      if (s !== 'pending') {
        setStatus(s)
        if (pollRef.current) clearInterval(pollRef.current)
      }
    }, 5000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [onCheckStatus, status])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(qrCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 3000)
    } catch {
      const el = document.createElement('textarea')
      el.value = qrCode
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
      setCopied(true)
      setTimeout(() => setCopied(false), 3000)
    }
  }

  const handleManualCheck = async () => {
    if (!onCheckStatus || checking) return
    setChecking(true)
    const s = await onCheckStatus()
    if (s !== 'pending') setStatus(s)
    setChecking(false)
  }

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0')
    const s = (secs % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  const formatAmount = (cents: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100)

  if (status === 'approved') {
    return (
      <div className="flex flex-col items-center gap-6 py-8 px-4">
        <div className="w-20 h-20 rounded-full bg-[var(--pix-success-bg)] flex items-center justify-center">
          <CheckCircle className="w-10 h-10 text-[var(--pix-success)]" strokeWidth={1.5} />
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-[var(--pix-fg)] mb-1">Pagamento confirmado!</p>
          <p className="text-[var(--pix-muted)] text-sm">Seu pagamento de {formatAmount(amount)} foi recebido com sucesso.</p>
        </div>
        <div className="w-full rounded-xl bg-[var(--pix-success-bg)] border border-[var(--pix-success)]/30 px-5 py-4 text-center">
          <p className="text-xs text-[var(--pix-muted)] mb-0.5">ID da transacao</p>
          <p className="font-mono font-semibold text-[var(--pix-fg)] text-sm">#{transactionId}</p>
        </div>
      </div>
    )
  }

  if (status === 'failed' || status === 'expired') {
    return (
      <div className="flex flex-col items-center gap-6 py-8 px-4">
        <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center">
          <AlertCircle className="w-10 h-10 text-red-500" strokeWidth={1.5} />
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-[var(--pix-fg)] mb-1">
            {status === 'expired' ? 'QR Code expirado' : 'Pagamento recusado'}
          </p>
          <p className="text-[var(--pix-muted)] text-sm">
            {status === 'expired'
              ? 'O tempo para pagamento expirou. Gere uma nova cobranca.'
              : 'Ocorreu um erro no processamento. Tente novamente.'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="text-center">
        <p className="text-xs uppercase tracking-widest font-semibold text-[var(--pix-muted)] mb-1">Valor a pagar</p>
        <p className="text-4xl font-bold text-[var(--pix-fg)] tracking-tight">{formatAmount(amount)}</p>
      </div>
      <div className="flex flex-col items-center gap-3">
        <div className="relative rounded-2xl overflow-hidden border-2 border-[var(--pix-border)] bg-white p-3 shadow-sm">
          {qrCodeBase64 ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qrCodeBase64} alt="QR Code PIX" width={220} height={220} className="w-[220px] h-[220px] object-contain" />
          ) : (
            <div className="w-[220px] h-[220px] flex items-center justify-center text-[var(--pix-muted)]">
              <span className="text-xs">QR Code indisponivel</span>
            </div>
          )}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center shadow border border-[var(--pix-border)]">
              <PixIcon />
            </div>
          </div>
        </div>
        {timeLeft !== null && timeLeft > 0 && (
          <div className="flex items-center gap-1.5 text-[var(--pix-muted)]">
            <Clock className="w-3.5 h-3.5" />
            <span className="text-xs font-mono">
              Expira em <span className={`font-semibold ${timeLeft < 120 ? 'text-red-500' : 'text-[var(--pix-fg)]'}`}>{formatTime(timeLeft)}</span>
            </span>
          </div>
        )}
      </div>
      <div className="rounded-xl bg-[var(--pix-surface)] border border-[var(--pix-border)] px-4 py-3">
        <p className="text-xs font-semibold text-[var(--pix-fg)] mb-2">Como pagar:</p>
        <ol className="space-y-1.5 text-xs text-[var(--pix-muted)] leading-relaxed list-none">
          {['Abra o app do seu banco ou carteira digital.','Escolha a opcao "Pagar com PIX".','Escaneie o QR Code ou use o codigo copia e cola.','Confirme o pagamento e pronto!'].map((step, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="flex-shrink-0 w-4 h-4 rounded-full bg-[var(--pix-accent)]/10 text-[var(--pix-accent)] font-bold text-[10px] flex items-center justify-center mt-0.5">{i + 1}</span>
              {step}
            </li>
          ))}
        </ol>
      </div>
      <div className="flex flex-col gap-3">
        <div className="rounded-xl border border-[var(--pix-border)] bg-[var(--pix-surface)] px-4 py-3 overflow-hidden">
          <p className="text-[10px] uppercase tracking-widest text-[var(--pix-muted)] mb-1 font-semibold">Codigo PIX copia e cola</p>
          <p className="font-mono text-[11px] text-[var(--pix-fg)] break-all leading-relaxed line-clamp-3 select-all">{qrCode}</p>
        </div>
        <button
          onClick={handleCopy}
          className={`w-full flex items-center justify-center gap-2 rounded-xl py-3.5 font-semibold text-sm transition-all duration-200 ${copied ? 'bg-[var(--pix-success)] text-white' : 'bg-[var(--pix-accent)] hover:bg-[var(--pix-accent-hover)] text-white active:scale-[0.98]'}`}
        >
          {copied ? <><CheckCircle className="w-4 h-4" />Codigo copiado!</> : <><Copy className="w-4 h-4" />Copiar codigo PIX</>}
        </button>
      </div>
      <div className="flex items-center justify-between rounded-xl border border-[var(--pix-border)] bg-[var(--pix-surface)] px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--pix-accent)] opacity-60" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[var(--pix-accent)]" />
          </span>
          <span className="text-xs text-[var(--pix-muted)]">Aguardando pagamento...</span>
        </div>
        {onCheckStatus && (
          <button onClick={handleManualCheck} disabled={checking} className="flex items-center gap-1.5 text-xs text-[var(--pix-accent)] font-semibold hover:underline disabled:opacity-50">
            {checking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            Verificar
          </button>
        )}
      </div>
      <p className="text-center text-[10px] text-[var(--pix-muted)]">
        ID da transacao: <span className="font-mono font-medium text-[var(--pix-fg)]">#{transactionId}</span>
      </p>
    </div>
  )
}

function PixIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M11.63 35.64a6.78 6.78 0 0 0 4.8 1.99h.01l6.45-6.45a2.58 2.58 0 0 1 3.64 0l6.48 6.48a6.78 6.78 0 0 0 4.8 1.99h1.28L30.68 30.5a6.15 6.15 0 0 0-8.68-.35l-.35.35-7.68 7.68-.04-.54Z" fill="#32BCAD"/>
      <path d="M37.81 12.36a6.78 6.78 0 0 0-4.8 1.99l-6.48 6.48a2.58 2.58 0 0 1-3.64 0l-6.45-6.45a6.78 6.78 0 0 0-4.8-1.99l-.01-.01 7.68 7.68a6.15 6.15 0 0 0 8.68.35l.35-.35 7.68-7.68.47-.47-.68.45Z" fill="#32BCAD"/>
      <path d="M39.5 30.7l-4.1-4.1a3.6 3.6 0 0 1 0-5.08l4.1-4.1a6.42 6.42 0 0 0 0 9.08l.43.43-.43-.23ZM8.5 17.3l4.1 4.1a3.6 3.6 0 0 1 0 5.08l-4.1 4.1a6.42 6.42 0 0 0 0-9.08l-.43-.43.43.23Z" fill="#32BCAD"/>
    </svg>
  )
}
