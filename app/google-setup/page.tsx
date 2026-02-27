"use client"

import { useState } from "react"
import { CheckCircle2, Copy, ExternalLink, ChevronDown, ChevronUp } from "lucide-react"

const steps = [
  {
    number: "01",
    title: "Acesse o Google Cloud Console",
    content: (
      <>
        <p className="text-sm text-white/60 leading-relaxed mb-4">
          Abra o Google Cloud Console no seu navegador. Faça login com sua conta Google.
        </p>
        <a
          href="https://console.cloud.google.com"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white transition-colors"
          style={{ backgroundColor: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)" }}
        >
          <ExternalLink className="w-4 h-4" />
          console.cloud.google.com
        </a>
      </>
    ),
  },
  {
    number: "02",
    title: "Crie um novo projeto",
    content: (
      <>
        <p className="text-sm text-white/60 leading-relaxed mb-3">
          No topo da página, clique no seletor de projetos (ao lado do logo Google Cloud).
        </p>
        <ol className="space-y-2">
          {[
            'Clique em "Novo Projeto"',
            'Digite um nome, ex: "Meu App OAuth"',
            'Clique em "Criar"',
            "Aguarde alguns segundos e selecione o projeto criado",
          ].map((item, i) => (
            <li key={i} className="flex items-start gap-3 text-sm text-white/70">
              <span
                className="flex-shrink-0 w-5 h-5 rounded-full text-[11px] font-bold flex items-center justify-center mt-0.5"
                style={{ backgroundColor: "rgba(255,255,255,0.12)" }}
              >
                {i + 1}
              </span>
              {item}
            </li>
          ))}
        </ol>
      </>
    ),
  },
  {
    number: "03",
    title: "Configure a Tela de Consentimento OAuth",
    content: (
      <>
        <p className="text-sm text-white/60 leading-relaxed mb-3">
          Antes de criar as credenciais, é obrigatório configurar a tela de consentimento.
        </p>
        <ol className="space-y-2">
          {[
            'No menu lateral, vá em "APIs e serviços" → "Tela de consentimento OAuth"',
            'Selecione "Externo" e clique em "Criar"',
            'Preencha o "Nome do app" e o "E-mail para suporte"',
            'Em "Domínios autorizados", adicione seu domínio (ex: seuapp.com)',
            'Clique em "Salvar e continuar" em todas as etapas',
          ].map((item, i) => (
            <li key={i} className="flex items-start gap-3 text-sm text-white/70">
              <span
                className="flex-shrink-0 w-5 h-5 rounded-full text-[11px] font-bold flex items-center justify-center mt-0.5"
                style={{ backgroundColor: "rgba(255,255,255,0.12)" }}
              >
                {i + 1}
              </span>
              {item}
            </li>
          ))}
        </ol>
      </>
    ),
  },
  {
    number: "04",
    title: "Crie as credenciais OAuth 2.0",
    content: (
      <>
        <ol className="space-y-2 mb-4">
          {[
            'No menu lateral, clique em "Credenciais"',
            'Clique em "+ Criar credenciais" → "ID do cliente OAuth"',
            'Em "Tipo de aplicativo", selecione "Aplicativo da Web"',
            'Dê um nome, ex: "Web Client"',
          ].map((item, i) => (
            <li key={i} className="flex items-start gap-3 text-sm text-white/70">
              <span
                className="flex-shrink-0 w-5 h-5 rounded-full text-[11px] font-bold flex items-center justify-center mt-0.5"
                style={{ backgroundColor: "rgba(255,255,255,0.12)" }}
              >
                {i + 1}
              </span>
              {item}
            </li>
          ))}
        </ol>
      </>
    ),
  },
  {
    number: "05",
    title: "Adicione as URIs autorizadas",
    content: (
      <>
        <p className="text-sm text-white/60 leading-relaxed mb-4">
          Preencha os campos abaixo com as URLs do seu app. Copie e cole com atenção.
        </p>

        <div className="space-y-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-white/30 mb-2">
              Origens JavaScript autorizadas
            </p>
            <CodeLine value="http://localhost:3000" />
            <CodeLine value="https://seuapp.vercel.app" note="(substitua pela sua URL de produção)" />
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-white/30 mb-2">
              URIs de redirecionamento autorizados
            </p>
            <CodeLine value="http://localhost:3000/api/auth/google/callback" />
            <CodeLine value="https://seuapp.vercel.app/api/auth/google/callback" note="(produção)" />
          </div>
        </div>

        <p className="mt-4 text-sm text-white/50">
          Depois clique em <span className="text-white font-medium">"Criar"</span>.
        </p>
      </>
    ),
  },
  {
    number: "06",
    title: "Copie o Client ID e o Client Secret",
    content: (
      <>
        <p className="text-sm text-white/60 leading-relaxed mb-4">
          Após criar, uma janela aparece com suas credenciais. Copie os dois valores:
        </p>

        <div className="space-y-3 mb-4">
          <div
            className="rounded-xl p-3 flex items-start gap-3"
            style={{ backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
          >
            <div className="flex-1">
              <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-1">
                GOOGLE_CLIENT_ID
              </p>
              <p className="text-xs text-white/50 font-mono">
                1234567890-abcdefghijklmnop.apps.googleusercontent.com
              </p>
            </div>
          </div>
          <div
            className="rounded-xl p-3 flex items-start gap-3"
            style={{ backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
          >
            <div className="flex-1">
              <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-1">
                GOOGLE_CLIENT_SECRET
              </p>
              <p className="text-xs text-white/50 font-mono">GOCSPX-xxxxxxxxxxxxxxxxxxxxxx</p>
            </div>
          </div>
        </div>

        <div
          className="rounded-xl p-3 flex items-start gap-2"
          style={{ backgroundColor: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.2)" }}
        >
          <span className="text-yellow-400 text-sm mt-0.5">!</span>
          <p className="text-sm text-yellow-300/70">
            Guarde o <strong className="text-yellow-300">Client Secret</strong> agora — ele{" "}
            <strong className="text-yellow-300">não aparecerá novamente</strong>. Se perder, gere um novo.
          </p>
        </div>
      </>
    ),
  },
  {
    number: "07",
    title: "Adicione as variáveis no projeto v0",
    content: (
      <>
        <p className="text-sm text-white/60 leading-relaxed mb-4">
          No painel do v0, acesse a seção <strong className="text-white">Vars</strong> na barra lateral esquerda e
          adicione as duas variáveis:
        </p>
        <div className="space-y-2">
          <CodeLine value="GOOGLE_CLIENT_ID=seu-client-id-aqui" />
          <CodeLine value="GOOGLE_CLIENT_SECRET=seu-client-secret-aqui" />
        </div>
        <p className="mt-4 text-sm text-white/50">
          Pronto! O login com Google vai funcionar automaticamente após adicionar as variáveis.
        </p>
      </>
    ),
  },
]

function CodeLine({ value, note }: { value: string; note?: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex items-center gap-2 mb-2">
      <div
        className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl font-mono text-xs text-white/70"
        style={{ backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
      >
        <span className="flex-1 break-all">{value}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex-shrink-0 p-1 rounded-lg hover:bg-white/10 transition-colors"
          aria-label="Copiar"
        >
          {copied ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
          ) : (
            <Copy className="w-3.5 h-3.5 text-white/30" />
          )}
        </button>
      </div>
      {note && <span className="text-xs text-white/30 hidden sm:block">{note}</span>}
    </div>
  )
}

function StepCard({ step, index }: { step: (typeof steps)[number]; index: number }) {
  const [open, setOpen] = useState(index === 0)

  return (
    <div
      className="rounded-2xl overflow-hidden transition-all"
      style={{ border: "1px solid rgba(255,255,255,0.08)", backgroundColor: "rgba(255,255,255,0.03)" }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-4 px-5 py-4 text-left active:bg-white/5 transition-colors"
      >
        <span
          className="text-xs font-bold tracking-widest"
          style={{ color: "rgba(255,255,255,0.2)" }}
        >
          {step.number}
        </span>
        <span className="flex-1 text-sm font-semibold text-white">{step.title}</span>
        {open ? (
          <ChevronUp className="w-4 h-4 text-white/30 flex-shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-white/30 flex-shrink-0" />
        )}
      </button>

      {open && (
        <div className="px-5 pb-5">
          <div
            className="pt-4"
            style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
          >
            {step.content}
          </div>
        </div>
      )}
    </div>
  )
}

export default function GoogleSetupPage() {
  return (
    <div
      className="min-h-screen w-full font-sans"
      style={{ backgroundColor: "#0a0a0a" }}
    >
      <div className="max-w-lg mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-10">
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-6"
            style={{ backgroundColor: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.5)" }}
          >
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" aria-hidden="true">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Guia de configuração
          </div>

          <h1 className="text-3xl font-bold text-white text-balance mb-3">
            Login com Google OAuth
          </h1>
          <p className="text-[15px] leading-relaxed" style={{ color: "rgba(255,255,255,0.45)" }}>
            Siga os passos abaixo para criar suas próprias credenciais no Google Cloud Console e ativar o login com Google no seu app.
          </p>
        </div>

        {/* Steps */}
        <div className="space-y-3">
          {steps.map((step, i) => (
            <StepCard key={step.number} step={step} index={i} />
          ))}
        </div>

        {/* Footer */}
        <div
          className="mt-8 rounded-2xl p-5"
          style={{ backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
        >
          <p className="text-sm font-semibold text-white mb-1">Precisa de mais ajuda?</p>
          <p className="text-sm text-white/40 mb-3">
            Consulte a documentação oficial do Google para mais detalhes.
          </p>
          <a
            href="https://developers.google.com/identity/protocols/oauth2"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            developers.google.com/identity
          </a>
        </div>
      </div>
    </div>
  )
}
