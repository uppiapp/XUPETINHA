"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { UppiLogo } from "@/components/revolut-logo"
import { Eye, EyeOff, ArrowLeft, Check, Phone } from "lucide-react"
import { AppBackground } from "@/components/app-background"
import { createClient } from "@/lib/supabase/client"

const requirements = [
  { label: "Mínimo 8 caracteres", test: (p: string) => p.length >= 8 },
  { label: "Uma letra maiúscula", test: (p: string) => /[A-Z]/.test(p) },
  { label: "Um número", test: (p: string) => /[0-9]/.test(p) },
]

export default function SignupPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState<"passenger" | "driver" | "">("")
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const passwordOk = requirements.every((r) => r.test(password))
  const step1Ok = role !== ""
  const step2Ok = name.trim().length > 0 && email.includes("@")
  const step3Ok = passwordOk

  async function handleGoogleSignup() {
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
  }

  async function handleCreateAccount() {
    if (!step3Ok) return
    setLoading(true)
    setError("")

    const supabase = createClient()
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo:
          process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ||
          `${window.location.origin}/auth/callback`,
        data: {
          full_name: name,
          role,
        },
      },
    })

    if (signUpError) {
      setError(
        signUpError.message.includes("already registered") || signUpError.message.includes("already been registered")
          ? "Este e-mail já está cadastrado. Tente fazer login."
          : "Ocorreu um erro ao criar a conta. Tente novamente."
      )
      setLoading(false)
      return
    }

    if (role === "driver") {
      router.push(`/auth/sign-up-success?email=${encodeURIComponent(email)}&role=driver`)
    } else {
      router.push(`/auth/sign-up-success?email=${encodeURIComponent(email)}`)
    }
  }

  return (
    <div className="relative w-full h-full flex flex-col overflow-hidden" style={{ background: "#000" }}>
      <AppBackground />

      {/* Back button */}
      <div className="relative z-10 px-5 pt-12 pb-2">
        <button
          type="button"
          onClick={() => (step > 1 ? setStep(step - 1) : router.back())}
          className="flex items-center justify-center w-9 h-9 rounded-full"
          style={{ backgroundColor: "rgba(255,255,255,0.08)" }}
          aria-label="Voltar"
        >
          <ArrowLeft className="w-4 h-4 text-white" />
        </button>
      </div>

      {/* Step indicator */}
      <div className="relative z-10 px-5 pt-2">
        <div className="flex gap-[5px]">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className="flex-1 h-[2px] rounded-full overflow-hidden"
              style={{ backgroundColor: "rgba(255,255,255,0.2)" }}
            >
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: s <= step ? "100%" : "0%",
                  backgroundColor: "white",
                }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Logo + title */}
      <div className="relative z-10 px-5 pt-6 pb-8">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-7 h-7 rounded-md bg-white flex items-center justify-center flex-shrink-0">
            <UppiLogo className="w-4 h-4 text-black" />
          </div>
          <span className="text-sm font-medium text-white/80">Uppi</span>
        </div>
        <h1 className="text-[2rem] font-bold text-white leading-tight text-balance">
          {step === 1 ? "Como você vai usar?" : step === 2 ? "Crie sua conta" : "Crie sua senha"}
        </h1>
        <p className="mt-2 text-[15px] text-white/50 leading-relaxed">
          {step === 1
            ? "Passo 1 de 3 — Escolha seu perfil."
            : step === 2
            ? "Passo 2 de 3 — Suas informações básicas."
            : "Passo 3 de 3 — Escolha uma senha segura."}
        </p>
      </div>

      {/* Social signup — só no passo 2 */}
      {step === 2 && (
        <div className="relative z-10 px-5 flex flex-col gap-3 mb-2">
          <button
            type="button"
            onClick={handleGoogleSignup}
            className="w-full flex items-center justify-center gap-3 py-[15px] rounded-2xl font-semibold text-[15px] text-white active:scale-[0.98] transition-transform duration-100"
            style={{ backgroundColor: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5 flex-shrink-0" aria-hidden="true">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Cadastrar com Google
          </button>
          <button
            type="button"
            onClick={() => router.push("/phone")}
            className="w-full flex items-center justify-center gap-3 py-[15px] rounded-2xl font-semibold text-[15px] text-white active:scale-[0.98] transition-transform duration-100"
            style={{ backgroundColor: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}
          >
            <Phone className="w-5 h-5 text-white/80" />
            Cadastrar com Telefone
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 py-1">
            <div className="flex-1 h-px" style={{ backgroundColor: "rgba(255,255,255,0.1)" }} />
            <span className="text-[12px] font-medium text-white/35 uppercase tracking-widest">ou</span>
            <div className="flex-1 h-px" style={{ backgroundColor: "rgba(255,255,255,0.1)" }} />
          </div>
        </div>
      )}

      {/* Form */}
      <div className="relative z-10 flex-1 px-5 flex flex-col gap-4">

        {/* Error message */}
        {error && (
          <div
            className="px-4 py-3 rounded-2xl text-[13px] text-red-400"
            style={{ backgroundColor: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}
          >
            {error}
          </div>
        )}

        {step === 1 ? (
          <>
            {/* Role selection */}
            <div className="flex flex-col gap-3">
              {[
                {
                  value: "passenger" as const,
                  label: "Passageiro",
                  description: "Solicite corridas e viaje com conforto.",
                  icon: (
                    <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  ),
                },
                {
                  value: "driver" as const,
                  label: "Motorista",
                  description: "Ganhe dinheiro oferecendo corridas.",
                  icon: (
                    <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  ),
                },
              ].map((option) => {
                const selected = role === option.value
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setRole(option.value)}
                    className="w-full flex items-center gap-4 px-5 py-5 rounded-2xl text-left active:scale-[0.98] transition-all duration-100"
                    style={{
                      backgroundColor: selected ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.05)",
                      border: selected ? "1.5px solid rgba(255,255,255,0.5)" : "1px solid rgba(255,255,255,0.1)",
                    }}
                  >
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: selected ? "white" : "rgba(255,255,255,0.08)", color: selected ? "black" : "rgba(255,255,255,0.6)" }}
                    >
                      {option.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[17px] font-semibold text-white">{option.label}</p>
                      <p className="text-[13px] text-white/45 mt-0.5">{option.description}</p>
                    </div>
                    <div
                      className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all"
                      style={{
                        borderColor: selected ? "white" : "rgba(255,255,255,0.25)",
                        backgroundColor: selected ? "white" : "transparent",
                      }}
                    >
                      {selected && <Check className="w-3 h-3 text-black" strokeWidth={3} />}
                    </div>
                  </button>
                )
              })}
            </div>
          </>
        ) : step === 2 ? (
          <>
            {/* Name */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-widest text-white/40">
                Nome completo
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Seu nome"
                autoComplete="name"
                className="w-full px-4 py-[15px] rounded-2xl bg-white/5 text-white placeholder:text-white/25 text-[15px] outline-none focus:ring-1 focus:ring-white/30 transition-all"
                style={{ border: "1px solid rgba(255,255,255,0.1)" }}
              />
            </div>

            {/* Email */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-widest text-white/40">
                E-mail
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                autoComplete="email"
                className="w-full px-4 py-[15px] rounded-2xl bg-white/5 text-white placeholder:text-white/25 text-[15px] outline-none focus:ring-1 focus:ring-white/30 transition-all"
                style={{ border: "1px solid rgba(255,255,255,0.1)" }}
              />
            </div>
          </>
        ) : (
          <>
            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-widest text-white/40">
                Senha
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  className="w-full px-4 py-[15px] pr-12 rounded-2xl bg-white/5 text-white placeholder:text-white/25 text-[15px] outline-none focus:ring-1 focus:ring-white/30 transition-all"
                  style={{ border: "1px solid rgba(255,255,255,0.1)" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Password requirements */}
            <div className="flex flex-col gap-2 pt-1">
              {requirements.map((r) => {
                const ok = r.test(password)
                return (
                  <div key={r.label} className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-200"
                      style={{ backgroundColor: ok ? "white" : "rgba(255,255,255,0.1)" }}
                    >
                      {ok && <Check className="w-2.5 h-2.5 text-black" strokeWidth={3} />}
                    </div>
                    <span
                      className="text-[13px] transition-colors duration-200"
                      style={{ color: ok ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.35)" }}
                    >
                      {r.label}
                    </span>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* Bottom CTA */}
      <div className="relative z-10 px-5 pb-10 pt-6 flex flex-col gap-3">
        <button
          type="button"
          disabled={
            (step === 1 && !step1Ok) ||
            (step === 2 && !step2Ok) ||
            (step === 3 && (!step3Ok || loading))
          }
          onClick={() => {
            if (step === 1 && step1Ok) {
              setError("")
              setStep(2)
            } else if (step === 2 && step2Ok) {
              setError("")
              setStep(3)
            } else if (step === 3) {
              handleCreateAccount()
            }
          }}
          className="w-full py-[17px] rounded-full font-semibold text-[15px] tracking-wide active:scale-[0.98] transition-all duration-100 shadow-md disabled:opacity-30"
          style={{ backgroundColor: "white", color: "black" }}
        >
          {step < 3 ? "Continuar" : loading ? "Criando conta..." : "Criar conta"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/login")}
          className="w-full py-[17px] rounded-full font-semibold text-[15px] tracking-wide active:scale-[0.98] transition-transform duration-100 text-white"
          style={{ backgroundColor: "rgba(255,255,255,0.1)" }}
        >
          Já tenho conta
        </button>

        {/* Links legais */}
        <p className="text-center text-[11px] text-white/30 leading-relaxed pt-1">
          Ao criar uma conta, você concorda com os nossos{" "}
          <Link href="/terms" className="text-white/50 underline underline-offset-2 hover:text-white/70 transition-colors">
            Termos de Uso
          </Link>{" "}
          e{" "}
          <Link href="/privacy" className="text-white/50 underline underline-offset-2 hover:text-white/70 transition-colors">
            Política de Privacidade
          </Link>
          .
        </p>
      </div>
    </div>
  )
}
