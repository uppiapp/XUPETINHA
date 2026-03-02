'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Image as ImageIcon, MapPin, Trophy, Car } from 'lucide-react'
import { iosToast } from '@/lib/utils/ios-toast'
import { haptics } from '@/lib/utils/ios-haptics'

const POST_TYPES = [
  { id: 'achievement', label: 'Conquista', icon: Trophy, color: 'text-amber-500', bg: 'bg-amber-500/15' },
  { id: 'ride', label: 'Corrida', icon: Car, color: 'text-blue-500', bg: 'bg-blue-500/15' },
  { id: 'tip', label: 'Dica', icon: MapPin, color: 'text-emerald-500', bg: 'bg-emerald-500/15' },
]

export default function SocialCreatePage() {
  const router = useRouter()
  const supabase = createClient()
  const [type, setType] = useState('achievement')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      iosToast.error('Adicione um titulo ao post')
      return
    }

    setLoading(true)
    haptics.impactMedium()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    const res = await fetch('/api/v1/social/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, title: title.trim(), description: description.trim() }),
    })

    setLoading(false)

    if (res.ok) {
      haptics.notificationSuccess()
      iosToast.success('Post publicado!')
      router.push('/uppi/social')
    } else {
      const err = await res.json().catch(() => ({}))
      iosToast.error(err?.error || 'Erro ao publicar post')
    }
  }

  return (
    <div className="h-dvh overflow-y-auto bg-[#F2F2F7] dark:bg-black pb-10 ios-scroll">
      <header className="bg-white/80 dark:bg-black/80 ios-blur-heavy border-b border-black/[0.08] dark:border-white/[0.08] sticky top-0 z-20">
        <div className="px-5 pt-safe-offset-4 pb-4 flex items-center gap-4">
          <button type="button" onClick={() => router.back()} className="w-10 h-10 flex items-center justify-center rounded-full bg-secondary/60 ios-press">
            <ArrowLeft className="w-5 h-5" strokeWidth={2.5} />
          </button>
          <h1 className="text-[22px] font-bold text-foreground tracking-tight flex-1">Novo Post</h1>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading || !title.trim()}
            className="h-9 px-4 bg-blue-500 text-white rounded-full font-semibold text-[15px] ios-press disabled:opacity-40"
          >
            {loading ? 'Publicando...' : 'Publicar'}
          </button>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="px-5 py-6 max-w-lg mx-auto space-y-5">
        {/* Tipo do post */}
        <div>
          <p className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wide mb-2 px-1">Tipo de post</p>
          <div className="flex gap-3">
            {POST_TYPES.map(pt => (
              <button
                key={pt.id}
                type="button"
                onClick={() => { haptics.selection(); setType(pt.id) }}
                className={`flex-1 py-3.5 rounded-[16px] flex flex-col items-center gap-2 border-2 transition-colors ios-press ${type === pt.id ? 'border-blue-500 bg-blue-500/5 dark:bg-blue-500/10' : 'border-transparent bg-white/90 dark:bg-[#1C1C1E]/90'}`}
              >
                <div className={`w-10 h-10 rounded-[12px] flex items-center justify-center ${pt.bg}`}>
                  <pt.icon className={`w-5 h-5 ${pt.color}`} />
                </div>
                <span className="text-[13px] font-semibold text-foreground">{pt.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Campos do post */}
        <div className="bg-white/90 dark:bg-[#1C1C1E]/90 rounded-[20px] overflow-hidden border border-black/[0.04] dark:border-white/[0.08] shadow-sm">
          <div className="px-5 py-4 border-b border-black/[0.04] dark:border-white/[0.04]">
            <p className="text-[12px] text-muted-foreground mb-1">Titulo *</p>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Ex: Completei 100 corridas!"
              maxLength={100}
              className="w-full bg-transparent text-[17px] font-semibold text-foreground outline-none placeholder:text-muted-foreground/30"
            />
          </div>
          <div className="px-5 py-4">
            <p className="text-[12px] text-muted-foreground mb-1">Descricao (opcional)</p>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Conte mais sobre isso..."
              maxLength={500}
              rows={4}
              className="w-full bg-transparent text-[15px] text-foreground outline-none placeholder:text-muted-foreground/30 resize-none leading-relaxed"
            />
            <p className="text-[12px] text-muted-foreground text-right mt-1">{description.length}/500</p>
          </div>
        </div>

        <p className="text-[13px] text-muted-foreground px-1">
          Seu post sera visivel para todos os usuarios do Uppi no feed social.
        </p>
      </form>
    </div>
  )
}
