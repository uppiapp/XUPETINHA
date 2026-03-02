'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import type { Ride, Profile } from '@/lib/types/database'

export default function ShareRidePage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  const rideId = params.id as string

  const [ride, setRide] = useState<Ride | null>(null)
  const [driver, setDriver] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [sharing, setSharing] = useState(false)

  useEffect(() => {
    loadData()

    // Real-time: update driver info if driver changes or ride ends
    const channel = supabase
      .channel(`ride-share-${rideId}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'rides',
        filter: `id=eq.${rideId}`,
      }, () => loadData())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [rideId])

  const loadData = async () => {
    try {
      const { data: rideData } = await supabase.from('rides').select('*').eq('id', rideId).single()
      if (!rideData) { router.back(); return }
      setRide(rideData)

      if (rideData.driver_id) {
        const { data: driverData } = await supabase.from('profiles').select('full_name, avatar_url, phone').eq('id', rideData.driver_id).single()
        setDriver(driverData)
      }
    } finally {
      setLoading(false)
    }
  }

  const shareLink = `${typeof window !== 'undefined' ? window.location.origin : ''}/uppi/ride/${rideId}/tracking`

  const buildShareText = () => {
    const lines = [
      `Estou numa corrida com a Uppi!`,
      driver ? `Motorista: ${driver.full_name}` : null,
      ride?.pickup_address ? `De: ${ride.pickup_address}` : null,
      ride?.dropoff_address ? `Para: ${ride.dropoff_address}` : null,
      `Acompanhe minha viagem em tempo real:`,
      shareLink,
    ]
    return lines.filter(Boolean).join('\n')
  }

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch { /* sem permissão */ }
  }

  const handleNativeShare = async () => {
    setSharing(true)
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Minha corrida - Uppi',
          text: buildShareText(),
          url: shareLink,
        })
      } else {
        await handleCopyLink()
      }
    } catch { /* cancelado */ }
    finally { setSharing(false) }
  }

  const handleWhatsApp = () => {
    const text = encodeURIComponent(buildShareText())
    window.open(`https://wa.me/?text=${text}`, '_blank')
  }

  const handleSMS = () => {
    const text = encodeURIComponent(buildShareText())
    window.open(`sms:?body=${text}`, '_blank')
  }

  if (loading) {
    return (
      <div className="h-dvh bg-[color:var(--background)] flex items-center justify-center">
        <div className="w-8 h-8 border-[2.5px] border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="h-dvh overflow-y-auto bg-[color:var(--background)] pb-8 ios-scroll">
      {/* Header */}
      <header className="bg-[color:var(--card)]/80 ios-blur border-b border-[color:var(--border)] sticky top-0 z-30">
        <div className="px-5 pt-safe-offset-4 pb-3 flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-[color:var(--muted)] ios-press"
          >
            <svg className="w-5 h-5 text-[color:var(--foreground)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-[20px] font-bold text-[color:var(--foreground)] tracking-tight">Compartilhar viagem</h1>
        </div>
      </header>

      <main className="px-5 py-6 max-w-lg mx-auto space-y-5">
        {/* Info da corrida */}
        <div className="bg-[color:var(--card)] rounded-[24px] p-5 border border-[color:var(--border)] animate-ios-fade-up">
          <p className="text-[13px] font-bold text-[color:var(--muted-foreground)] uppercase tracking-wider mb-3">Detalhes da corrida</p>

          {driver && (
            <div className="flex items-center gap-3 mb-4 pb-4 border-b border-[color:var(--border)]">
              <div className="w-11 h-11 bg-emerald-100 rounded-full flex items-center justify-center shrink-0">
                {driver.avatar_url
                  ? <img src={driver.avatar_url} alt={driver.full_name} className="w-full h-full rounded-full object-cover" />
                  : <span className="text-[18px] font-bold text-emerald-700">{driver.full_name?.[0]}</span>
                }
              </div>
              <div>
                <p className="text-[15px] font-bold text-[color:var(--foreground)]">{driver.full_name}</p>
                <p className="text-[12px] text-[color:var(--muted-foreground)]">Motorista</p>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <div className="flex flex-col items-center gap-1 pt-1">
              <div className="w-2.5 h-2.5 bg-blue-500 rounded-full" />
              <div className="w-px flex-1 bg-[color:var(--border)] min-h-[20px]" />
              <div className="w-2.5 h-2.5 bg-orange-500 rounded-full" />
            </div>
            <div className="flex-1 space-y-2.5 min-w-0">
              <p className="text-[13px] font-medium text-[color:var(--foreground)] truncate">{ride?.pickup_address}</p>
              <p className="text-[13px] font-medium text-[color:var(--foreground)] truncate">{ride?.dropoff_address}</p>
            </div>
          </div>
        </div>

        {/* Link para copiar */}
        <div className="animate-ios-fade-up" style={{ animationDelay: '60ms' }}>
          <p className="text-[13px] font-bold text-[color:var(--muted-foreground)] uppercase tracking-wider mb-2 px-1">Link de rastreamento</p>
          <div className="flex items-center gap-2 bg-[color:var(--card)] rounded-[18px] p-3 border border-[color:var(--border)]">
            <p className="flex-1 text-[13px] text-[color:var(--muted-foreground)] truncate font-mono">{shareLink}</p>
            <button
              type="button"
              onClick={handleCopyLink}
              className={cn(
                'px-3 h-9 rounded-[12px] text-[13px] font-bold ios-press shrink-0 transition-colors',
                copied ? 'bg-emerald-500 text-white' : 'bg-[color:var(--muted)] text-[color:var(--foreground)]'
              )}
            >
              {copied ? 'Copiado!' : 'Copiar'}
            </button>
          </div>
        </div>

        {/* Opções de compartilhamento */}
        <div className="animate-ios-fade-up" style={{ animationDelay: '100ms' }}>
          <p className="text-[13px] font-bold text-[color:var(--muted-foreground)] uppercase tracking-wider mb-3 px-1">Compartilhar via</p>
          <div className="grid grid-cols-2 gap-3">
            {/* WhatsApp */}
            <button
              type="button"
              onClick={handleWhatsApp}
              className="bg-[color:var(--card)] border border-[color:var(--border)] rounded-[20px] p-4 flex flex-col items-center gap-2 ios-press hover:bg-[color:var(--muted)]/40 transition-colors"
            >
              <div className="w-12 h-12 bg-green-500 rounded-[14px] flex items-center justify-center">
                <svg className="w-7 h-7 text-white fill-current" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
              </div>
              <span className="text-[13px] font-semibold text-[color:var(--foreground)]">WhatsApp</span>
            </button>

            {/* SMS */}
            <button
              type="button"
              onClick={handleSMS}
              className="bg-[color:var(--card)] border border-[color:var(--border)] rounded-[20px] p-4 flex flex-col items-center gap-2 ios-press hover:bg-[color:var(--muted)]/40 transition-colors"
            >
              <div className="w-12 h-12 bg-blue-500 rounded-[14px] flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <span className="text-[13px] font-semibold text-[color:var(--foreground)]">SMS</span>
            </button>

            {/* Compartilhar nativo */}
            <button
              type="button"
              onClick={handleNativeShare}
              disabled={sharing}
              className="bg-[color:var(--card)] border border-[color:var(--border)] rounded-[20px] p-4 flex flex-col items-center gap-2 ios-press hover:bg-[color:var(--muted)]/40 transition-colors"
            >
              <div className="w-12 h-12 bg-[color:var(--muted)] rounded-[14px] flex items-center justify-center">
                <svg className="w-6 h-6 text-[color:var(--foreground)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
              </div>
              <span className="text-[13px] font-semibold text-[color:var(--foreground)]">Outros apps</span>
            </button>

            {/* Copiar link */}
            <button
              type="button"
              onClick={handleCopyLink}
              className="bg-[color:var(--card)] border border-[color:var(--border)] rounded-[20px] p-4 flex flex-col items-center gap-2 ios-press hover:bg-[color:var(--muted)]/40 transition-colors"
            >
              <div className={cn('w-12 h-12 rounded-[14px] flex items-center justify-center transition-colors', copied ? 'bg-emerald-500' : 'bg-[color:var(--muted)]')}>
                <svg className={cn('w-6 h-6', copied ? 'text-white' : 'text-[color:var(--foreground)]')} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  {copied
                    ? <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    : <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  }
                </svg>
              </div>
              <span className="text-[13px] font-semibold text-[color:var(--foreground)]">
                {copied ? 'Copiado!' : 'Copiar link'}
              </span>
            </button>
          </div>
        </div>

        {/* Aviso de segurança */}
        <div className="bg-blue-50 border border-blue-200 rounded-[20px] p-4 flex gap-3 animate-ios-fade-up" style={{ animationDelay: '160ms' }}>
          <svg className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <p className="text-[12px] text-blue-700 leading-relaxed">
            Apenas pessoas com o link podem ver o rastreamento da sua corrida. Compartilhe apenas com contatos de confiança.
          </p>
        </div>
      </main>
    </div>
  )
}
