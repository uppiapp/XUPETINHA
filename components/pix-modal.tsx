'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Image from 'next/image'
import { Copy, Check, X, Loader2 } from 'lucide-react'
import QRCode from 'qrcode'

interface PixModalProps {
  externalId: string
  qrCodeImage: string | null
  qrCodeText: string
  amountLabel: string
  onClose: () => void
}

export function PixModal({ externalId, qrCodeImage, qrCodeText, amountLabel, onClose }: PixModalProps) {
  const [copied, setCopied] = useState(false)
  const [pollingStatus, setPollingStatus] = useState<'pending' | 'paid' | 'error'>('pending')
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!qrCodeText || !canvasRef.current) return
    QRCode.toCanvas(canvasRef.current, qrCodeText, {
      width: 220, margin: 2,
      color: { dark: '#000000', light: '#ffffff' },
    })
  }, [qrCodeText])

  const stopPolling = useCallback(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
  }, [])

  const checkStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/pix/status?hash=${encodeURIComponent(externalId)}`)
      const data = await res.json()
      if (data.status === 'paid') {
        stopPolling()
        setPollingStatus('paid')
        const currentParams = new URLSearchParams(window.location.search)
        const redirectBase = data.redirect_url ?? '/obrigado'
        const redirectUrl = new URL(redirectBase, window.location.origin)
        currentParams.forEach((value, key) => { redirectUrl.searchParams.set(key, value) })
        setTimeout(() => { window.location.href = redirectUrl.toString() }, 1500)
      }
    } catch { }
  }, [externalId, stopPolling])

  useEffect(() => {
    intervalRef.current = setInterval(checkStatus, 3000)
    return () => stopPolling()
  }, [checkStatus, stopPolling])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(qrCodeText)
      setCopied(true)
      setTimeout(() => setCopied(false), 3000)
    } catch {
      const el = document.createElement('textarea')
      el.value = qrCodeText
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
      setCopied(true)
      setTimeout(() => setCopied(false), 3000)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white" role="dialog" aria-modal="true" aria-label="Pagamento via PIX">
      <div className="flex flex-col flex-1 w-full overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#e5e5e5] flex-shrink-0">
          <div className="flex items-center gap-2">
            <Image src="/images/pix.png" alt="PIX" width={20} height={20} className="object-contain" />
            <p className="font-bold text-[#1a1a1a] text-base">Pague com PIX</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-[#f5f5f5] transition-colors" aria-label="Fechar">
            <X className="w-5 h-5 text-[#666]" />
          </button>
        </div>
        <div className="px-5 py-5 space-y-5 flex-1 overflow-y-auto">
          {pollingStatus === 'paid' ? (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <div className="w-16 h-16 rounded-full bg-[#35c65a] flex items-center justify-center">
                <Check className="w-8 h-8 text-white" strokeWidth={3} />
              </div>
              <p className="font-bold text-[#1a1a1a] text-lg text-center">Pagamento confirmado!</p>
              <p className="text-sm text-[#666] text-center">Redirecionando...</p>
            </div>
          ) : (
            <>
              <div className="bg-[#f8fdf9] border border-[#c3e6cb] rounded-xl px-4 py-3 flex items-center justify-between">
                <span className="text-sm text-[#444]">Valor a pagar</span>
                <span className="font-black text-[#35c65a] text-lg">{amountLabel}</span>
              </div>
              <div className="flex flex-col items-center gap-3">
                <div className="border border-[#e5e5e5] rounded-xl p-3 bg-white">
                  <canvas ref={canvasRef} className="block" />
                </div>
                <div className="flex items-center gap-1.5 text-xs text-[#888]">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Aguardando pagamento...</span>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-[#444] mb-2 uppercase tracking-wide">PIX Copia e Cola</p>
                <div className="flex items-center gap-2 border border-[#e5e5e5] rounded-xl overflow-hidden bg-[#fafafa]">
                  <p className="flex-1 px-3 py-3 text-xs text-[#555] break-all leading-relaxed line-clamp-2">{qrCodeText}</p>
                  <button
                    onClick={handleCopy}
                    className={`flex items-center gap-1.5 px-3 py-3 text-sm font-bold border-l border-[#e5e5e5] flex-shrink-0 transition-colors touch-manipulation ${copied ? 'bg-[#35c65a] text-white border-[#35c65a]' : 'bg-white text-[#35c65a] hover:bg-[#f0fdf4]'}`}
                    aria-label="Copiar codigo PIX"
                  >
                    {copied ? <><Check className="w-4 h-4" /><span>Copiado</span></> : <><Copy className="w-4 h-4" /><span>Copiar</span></>}
                  </button>
                </div>
              </div>
              <ol className="text-xs text-[#666] space-y-1.5 pl-4 list-decimal leading-snug">
                <li>Abra o app do seu banco e escolha a opcao PIX.</li>
                <li>Escaneie o QR Code ou cole o codigo acima.</li>
                <li>Confirme o pagamento de <strong>{amountLabel}</strong>.</li>
                <li>Esta tela se atualiza automaticamente apos o pagamento.</li>
              </ol>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
