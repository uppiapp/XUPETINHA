"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { RevolutLogo } from "@/components/revolut-logo"
import { ArrowLeft } from "lucide-react"
import { AppBackground } from "@/components/app-background"

export default function PhonePage() {
  const router = useRouter()
  const [step, setStep] = useState<1 | 2>(1)
  const [email, setEmail] = useState("")
  const [code, setCode] = useState(["", "", "", "", "", ""])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  const codeOk = code.every((c) => c.length === 1)

  const handleCodeChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return
    const newCode = [...code]
    newCode[index] = value
    setCode(newCode)
    if (value && index < 5) {
      document.getElementById(`code-${index + 1}`)?.focus()
    }
  }

  const handleSendCode = async () => {
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/v1/auth/email-otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Erro ao enviar código")
        return
      }
      setStep(2)
    } catch {
      setError("Erro de conexão. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyCode = async () => {
    setLoading(true)
    setError("")
    try {
      const token = code.join("")
      const res = await fetch("/api/v1/auth/email-otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Código inválido ou expirado")
        return
      }
      router.push("/home")
    } catch {
      setError("Erro de conexão. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    setCode(["", "", "", "", "", ""])
    setError("")
    await handleSendCode()
  }

  return (
    <div className="relative w-full h-full flex flex-col overflow-hidden" style={{ background: "#000" }}>
      <AppBackground />

      {/* Back button */}
      <div className="relative z-10 px-5 pt-12 pb-2">
        <button
          type="button"
          onClick={() => {
            if (step === 2) { setStep(1); setError("") }
            else router.back()
          }}
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
            <RevolutLogo className="w-4 h-4 text-black" />
          </div>
          <span className="text-sm font-medium text-white/80">Uppi</span>
        </div>
        <h1 className="text-[2rem] font-bold text-white leading-tight text-balance">
          {step === 1 ? "Seu e-mail" : "Verificar código"}
        </h1>
        <p className="mt-2 text-[15px] text-white/50 leading-relaxed">
          {step === 1
            ? "Enviaremos um código de 6 dígitos para o seu e-mail."
            : `Enviamos um código para ${email}`}
        </p>
      </div>

      {/* Form */}
      <div className="relative z-10 flex-1 px-5 flex flex-col gap-4">
        {step === 1 ? (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email-input" className="text-xs font-semibold uppercase tracking-widest text-white/40">
              Endereço de e-mail
            </label>
            <input
              id="email-input"
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError("") }}
              placeholder="seu@email.com"
              className="w-full px-4 py-[15px] rounded-2xl bg-white/5 text-white placeholder:text-white/25 text-[15px] outline-none focus:ring-1 focus:ring-white/30 transition-all"
              style={{ border: "1px solid rgba(255,255,255,0.1)" }}
            />
            {error && <p className="text-[12px] text-red-400/90">{error}</p>}
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-3">
              <label className="text-xs font-semibold uppercase tracking-widest text-white/40">
                Código de verificação
              </label>
              <div className="flex gap-2 justify-center">
                {code.map((digit, i) => (
                  <input
                    key={i}
                    id={`code-${i}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => { handleCodeChange(i, e.target.value); setError("") }}
                    onKeyDown={(e) => {
                      if (e.key === "Backspace" && !digit && i > 0) {
                        document.getElementById(`code-${i - 1}`)?.focus()
                      }
                    }}
                    className="w-12 h-16 text-center text-white text-xl font-bold rounded-2xl bg-white/5 outline-none focus:ring-2 focus:ring-white/50 transition-all"
                    style={{ border: `1px solid ${error ? "rgba(248,113,113,0.5)" : "rgba(255,255,255,0.1)"}` }}
                  />
                ))}
              </div>
              {error && <p className="text-[12px] text-red-400/90 text-center">{error}</p>}
            </div>

            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={handleResend}
                disabled={loading}
                className="text-[13px] text-white/40 hover:text-white/70 transition-colors disabled:opacity-30"
              >
                Reenviar código
              </button>
            </div>
          </>
        )}
      </div>

      {/* Bottom CTA */}
      <div className="relative z-10 px-5 pb-10 pt-6">
        <button
          type="button"
          disabled={step === 1 ? !emailOk || loading : !codeOk || loading}
          onClick={() => {
            if (step === 1) handleSendCode()
            else handleVerifyCode()
          }}
          className="w-full py-[17px] rounded-full bg-white text-black font-semibold text-[15px] tracking-wide active:scale-[0.98] transition-all duration-100 shadow-md disabled:opacity-40"
        >
          {loading ? "Processando..." : step === 1 ? "Enviar código" : "Continuar"}
        </button>
      </div>
    </div>
  )
}
