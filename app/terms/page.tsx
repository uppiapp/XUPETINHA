import Link from "next/link"
import { RevolutLogo } from "@/components/revolut-logo"

export const metadata = {
  title: "Termos de Uso — Uppi",
  description: "Leia os termos e condições de uso do Uppi.",
}

const sections = [
  {
    title: "1. Aceitação dos termos",
    content: `Ao acessar ou usar o Uppi, você concorda com estes Termos de Uso e com nossa Política de Privacidade. Se você não concordar com qualquer parte destes termos, não deverá usar o aplicativo. O uso contínuo do aplicativo após alterações nos termos implica aceitação das mudanças.`,
  },
  {
    title: "2. Descrição do serviço",
    content: `O Uppi é um aplicativo de mobilidade urbana que conecta passageiros e motoristas, permitindo solicitar corridas, negociar preços e avaliar viagens. O serviço é fornecido "como está" e pode estar sujeito a alterações, suspensões ou descontinuações a qualquer momento, com ou sem aviso prévio.`,
  },
  {
    title: "3. Elegibilidade",
    content: `Para usar o Revolut Business, você deve ter pelo menos 18 anos de idade, ter capacidade legal para celebrar contratos vinculativos, e não estar proibido de usar o serviço por qualquer lei aplicável. Ao usar o aplicativo, você declara e garante que atende a todos esses requisitos.`,
  },
  {
    title: "4. Conta do usuário",
    content: `Você é responsável por manter a confidencialidade das suas credenciais de acesso e por todas as atividades realizadas na sua conta. Notifique-nos imediatamente sobre qualquer uso não autorizado. Reservamo-nos o direito de encerrar contas que violem estes termos ou que estejam inativas por longos períodos.`,
  },
  {
    title: "5. Uso aceitável",
    content: `Você concorda em usar o serviço apenas para fins legais e de acordo com estes termos. É proibido usar o aplicativo para: realizar transações fraudulentas, tentar acessar sistemas não autorizados, distribuir malware ou vírus, ou qualquer atividade que viole leis locais, nacionais ou internacionais.`,
  },
  {
    title: "6. Propriedade intelectual",
    content: `Todo o conteúdo, design, código e funcionalidades do Uppi são de propriedade exclusiva dos seus criadores e estão protegidos por leis de direitos autorais. Você não tem permissão para copiar, modificar, distribuir, vender ou arrendar qualquer parte do serviço sem autorização expressa por escrito.`,
  },
  {
    title: "7. Limitação de responsabilidade",
    content: `Na extensão máxima permitida por lei, o Uppi não será responsável por danos indiretos, incidentais, especiais, consequenciais ou punitivos, incluindo perda de lucros, dados ou boa vontade, decorrentes do uso ou impossibilidade de uso do serviço.`,
  },
  {
    title: "8. Isenção de garantias",
    content: `O serviço é fornecido "como está" e "conforme disponível", sem garantias de qualquer tipo, expressas ou implícitas. Não garantimos que o serviço será ininterrupto, seguro, livre de erros, ou que os resultados obtidos serão precisos ou confiáveis.`,
  },
  {
    title: "9. Rescisão",
    content: `Podemos encerrar ou suspender seu acesso ao serviço imediatamente, sem aviso prévio ou responsabilidade, por qualquer motivo, incluindo violação destes termos. Após a rescisão, seu direito de usar o serviço cessará imediatamente.`,
  },
  {
    title: "10. Lei aplicável",
    content: `Estes termos são regidos pelas leis da República Federativa do Brasil, especialmente o Código de Defesa do Consumidor (Lei nº 8.078/1990) e o Marco Civil da Internet (Lei nº 12.965/2014). Qualquer disputa será resolvida no foro da comarca de São Paulo, SP.`,
  },
  {
    title: "11. Contato",
    content: `Para dúvidas sobre estes Termos de Uso, entre em contato pelo e-mail: termos@uppi.app. Respondemos todas as solicitações em até 15 dias úteis.`,
  },
]

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground font-sans">

      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="max-w-2xl mx-auto px-5 py-4 flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center flex-shrink-0">
              <RevolutLogo className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
              Uppi
            </span>
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-5 py-10">

        {/* Hero */}
        <div className="mb-10">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
            Documento legal
          </p>
          <h1 className="text-3xl font-bold text-foreground text-balance leading-tight mb-4">
            Termos de Uso
          </h1>
          <p className="text-muted-foreground leading-relaxed">
            Leia com atenção antes de usar o <strong className="text-foreground">Uppi</strong>. Ao criar uma conta ou usar o aplicativo, você concorda com os termos e condições descritos abaixo.
          </p>
        </div>

        {/* Divider */}
        <div className="h-px bg-border mb-10" />

        {/* Sections */}
        <div className="flex flex-col gap-8">
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="text-base font-semibold text-foreground mb-2">
                {section.title}
              </h2>
              <p className="text-muted-foreground leading-relaxed text-[15px]">
                {section.content}
              </p>
            </section>
          ))}
        </div>

        {/* Divider */}
        <div className="h-px bg-border my-10" />

        {/* Footer info */}
        <div className="flex flex-col gap-2 text-xs text-muted-foreground">
          <p>Última atualização: 27 de fevereiro de 2026</p>
          <p>Versão: 1.0.0</p>
          <p>Em conformidade com o CDC (Lei nº 8.078/1990) e o Marco Civil da Internet (Lei nº 12.965/2014).</p>
        </div>

        {/* Links legais */}
        <div className="mt-6 flex items-center gap-4 text-xs text-muted-foreground">
          <Link href="/privacy" className="hover:text-foreground transition-colors underline underline-offset-2">
            Política de Privacidade
          </Link>
          <span>·</span>
          <Link href="/terms" className="text-foreground font-medium">
            Termos de Uso
          </Link>
        </div>

        {/* Back button */}
        <div className="mt-8">
          <Link
            href="/"
            className="inline-flex items-center justify-center w-full py-4 rounded-full bg-primary text-primary-foreground font-semibold text-[15px] tracking-wide hover:opacity-90 transition-opacity"
          >
            Voltar ao aplicativo
          </Link>
        </div>
      </main>
    </div>
  )
}
