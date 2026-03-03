"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { UppiLogo } from "@/components/revolut-logo"
import { ArrowLeft, Mail } from "lucide-react"
import { AppBackground } from "@/components/app-background"
import { createClient } from "@/lib/supabase/client"

export default function SignUpSuccessPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const email = searchParams.get("email") ?? ""
  const [loading, setLoading] = useState(false)
  const [resent, setResent] = useState(false)

  async function handleResend() {
    if (loading) return
    setLoading(true)

    const supabase = createClient()
    await supabase.auth.resend({
      type: "signup",
      email,
      options: {
        emailRedirectTo:
          process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ||
          `${window.location.origin}/auth/callback`,
      },
    })

    setResent(true)
    setLoading(false)
  }

  return (
    <div className="relative w-full h-full flex flex-col overflow-hidden" style={{ background: "#000" }}>
      <AppBackground />

      {/* Back button */}
      <div className="relative z-10 px-5 pt-12 pb-2">
        <button
          type="button"
          onClick={() => router.push("/login")}
          className="flex items-center justify-center w-9 h-9 rounded-full"
          style={{ backgroundColor: "rgba(255,255,255,0.08)" }}
          aria-label="Voltar"
        >
          <ArrowLeft className="w-4 h-4 text-white" />
        </button>
      </div>

      {/* Logo + title */}
      <div className="relative z-10 px-5 pt-6 pb-8">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-7 h-7 rounded-md bg-white flex items-center justify-center flex-shrink-0">
            <UppiLogo className="w-4 h-4 text-black" />
          </div>
          <span className="text-sm font-medium text-white/80">Uppi</span>
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-5 text-center">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mb-6"
          style={{ backgroundColor: "rgba(255,255,255,0.08)" }}
        >
          <Mail className="w-7 h-7 text-white" />
        </div>
        <h1 className="text-[2rem] font-bold text-white leading-tight text-balance mb-3">
          Verifique seu e-mail
        </h1>
        <p className="text-[15px] text-white/50 leading-relaxed max-w-xs">
          Enviamos um link de confirmação para{" "}
          {email ? (
            <span className="text-white/80 font-medium">{email}</span>
          ) : (
            "seu e-mail"
          )}
          . Clique no link para ativar sua conta.
        </p>

        {resent && (
          <p className="mt-4 text-[13px] text-white/40">
            E-mail reenviado com sucesso.
          </p>
        )}
      </div>

      {/* Bottom CTA */}
      <div className="relative z-10 px-5 pb-10 pt-6 flex flex-col gap-3">
        <button
          type="button"
          onClick={() => router.push("/login")}
          className="w-full py-[17px] rounded-full bg-white text-black font-semibold text-[15px] tracking-wide active:scale-[0.98] transition-transform duration-100 shadow-md"
        >
          Ir para o Login
        </button>
        <button
          type="button"
          onClick={handleResend}
          disabled={loading || resent}
          className="w-full py-[17px] rounded-full font-semibold text-[15px] tracking-wide active:scale-[0.98] transition-transform duration-100 text-white disabled:opacity-40"
          style={{ backgroundColor: "rgba(255,255,255,0.1)" }}
        >
          {loading ? "Reenviando..." : resent ? "E-mail reenviado" : "Reenviar e-mail"}
        </button>
      </div>
    </div>
  )
}
