'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, CheckCircle2 } from 'lucide-react'
import { haptics } from '@/lib/utils/ios-haptics'
import { iosToast } from '@/lib/utils/ios-toast'

const languages = [
  { code: 'pt-BR', label: 'Portugues (Brasil)', flag: '🇧🇷', default: true },
  { code: 'en-US', label: 'English (United States)', flag: '🇺🇸' },
  { code: 'es-ES', label: 'Espanol (Espana)', flag: '🇪🇸' },
]

export default function LanguagePage() {
  const router = useRouter()
  const [selected, setSelected] = useState('pt-BR')

  const handleSelect = (code: string) => {
    haptics.selection()
    setSelected(code)
    const lang = languages.find(l => l.code === code)
    iosToast.success(`Idioma alterado para ${lang?.label}`)
  }

  return (
    <div className="h-dvh overflow-y-auto bg-[#F2F2F7] dark:bg-black pb-10 ios-scroll">
      <header className="bg-white/80 dark:bg-black/80 ios-blur-heavy border-b border-black/[0.08] dark:border-white/[0.08] sticky top-0 z-20">
        <div className="px-5 pt-safe-offset-4 pb-4 flex items-center gap-4">
          <button type="button" onClick={() => router.back()} className="w-10 h-10 flex items-center justify-center rounded-full bg-secondary/60 ios-press">
            <ArrowLeft className="w-5 h-5" strokeWidth={2.5} />
          </button>
          <h1 className="text-[22px] font-bold text-foreground tracking-tight">Idioma</h1>
        </div>
      </header>

      <main className="px-5 py-6 max-w-lg mx-auto">
        <div className="bg-white/90 dark:bg-[#1C1C1E]/90 rounded-[20px] overflow-hidden border border-black/[0.04] dark:border-white/[0.08] shadow-sm">
          {languages.map((lang, i) => (
            <button
              key={lang.code}
              type="button"
              onClick={() => handleSelect(lang.code)}
              className={`w-full px-5 py-4 flex items-center gap-4 ios-press ${i < languages.length - 1 ? 'border-b border-black/[0.04] dark:border-white/[0.04]' : ''}`}
            >
              <span className="text-[28px]">{lang.flag}</span>
              <div className="flex-1 text-left">
                <p className="text-[17px] font-semibold text-foreground">{lang.label}</p>
                {lang.default && <p className="text-[12px] text-muted-foreground">Padrao</p>}
              </div>
              {selected === lang.code && <CheckCircle2 className="w-5 h-5 text-blue-500 flex-shrink-0" />}
            </button>
          ))}
        </div>
        <p className="text-[13px] text-muted-foreground px-1 mt-4">
          Mais idiomas serao adicionados em breve.
        </p>
      </main>
    </div>
  )
}
