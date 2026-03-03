"use client"

import { useRouter } from "next/navigation"
import { UppiLogo } from "@/components/revolut-logo"
import { ArrowLeft, Mail } from "lucide-react"
import { AppBackground } from "@/components/app-background"

export default function SignUpSuccessPage() {
  const router = useRouter()

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

      {/* Logo */}
      <div className="relative z-10 px-5 pt-6 pb-8">
        <div className="flex items-center gap-2">
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
          Conta Criada com Sucesso!
        </h1>
        <p className="text-[15px] text-white/50 leading-relaxed max-w-xs">
          Enviamos um e-mail de confirmação para você. Verifique sua caixa de entrada para ativar sua conta e começar a usar o Uppi.
        </p>
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
          onClick={() => router.push("/signup")}
          className="w-full py-[17px] rounded-full font-semibold text-[15px] tracking-wide active:scale-[0.98] transition-transform duration-100 text-white"
          style={{ backgroundColor: "rgba(255,255,255,0.1)" }}
        >
          Reenviar e-mail
        </button>

        <p className="text-center text-[11px] text-white/30 leading-relaxed pt-1">
          Não recebeu? Verifique sua pasta de spam ou tente reenviar.
        </p>
      </div>
    </div>
  )
}
