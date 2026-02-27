import Link from "next/link"
import { RevolutLogo } from "@/components/revolut-logo"

export const metadata = {
  title: "Política de Privacidade — Uppi",
  description: "Saiba como coletamos, usamos e protegemos seus dados no Uppi.",
}

const sections = [
  {
    title: "1. Quais dados coletamos",
    content: `Coletamos apenas os dados necessários para o funcionamento do aplicativo. Isso inclui informações de uso do app (páginas visitadas, tempo de sessão), dados técnicos do dispositivo (sistema operacional, versão do app) e, caso você crie uma conta, seu nome e endereço de e-mail.`,
  },
  {
    title: "2. Como usamos seus dados",
    content: `Usamos seus dados exclusivamente para melhorar a experiência do aplicativo, corrigir erros técnicos e personalizar o conteúdo exibido. Não vendemos, alugamos nem compartilhamos suas informações pessoais com terceiros para fins comerciais.`,
  },
  {
    title: "3. Armazenamento e segurança",
    content: `Seus dados são armazenados com segurança usando criptografia em trânsito (HTTPS/TLS) e em repouso. Aplicamos boas práticas de segurança para proteger suas informações contra acesso não autorizado, alteração ou divulgação.`,
  },
  {
    title: "4. Cookies e tecnologias similares",
    content: `Utilizamos cookies de sessão essenciais para o funcionamento do aplicativo. Não utilizamos cookies de rastreamento de terceiros ou publicidade. Você pode desativar cookies nas configurações do seu navegador, mas isso pode afetar o funcionamento de algumas funcionalidades.`,
  },
  {
    title: "5. Compartilhamento de dados",
    content: `Não compartilhamos seus dados pessoais com terceiros, exceto quando exigido por lei ou ordem judicial. Podemos usar serviços de infraestrutura como Vercel para hospedagem, que possuem suas próprias políticas de privacidade e estão em conformidade com o RGPD e a LGPD.`,
  },
  {
    title: "6. Seus direitos",
    content: `Nos termos da Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018), você tem direito a: acessar seus dados pessoais, corrigir dados incompletos ou incorretos, solicitar a exclusão dos seus dados, revogar o consentimento a qualquer momento e solicitar informações sobre o compartilhamento dos seus dados.`,
  },
  {
    title: "7. Retenção de dados",
    content: `Mantemos seus dados apenas pelo tempo necessário para as finalidades descritas nesta política ou conforme exigido por lei. Após esse período, os dados são excluídos ou anonimizados de forma segura.`,
  },
  {
    title: "8. Menores de idade",
    content: `Este aplicativo não é direcionado a menores de 18 anos. Não coletamos intencionalmente dados de crianças ou adolescentes. Se você acredita que coletamos dados de um menor de forma inadvertida, entre em contato conosco para que possamos excluí-los imediatamente.`,
  },
  {
    title: "9. Alterações nesta política",
    content: `Podemos atualizar esta Política de Privacidade periodicamente. Notificaremos sobre mudanças significativas através do próprio aplicativo. A data da última atualização está indicada no rodapé desta página. O uso contínuo do aplicativo após as alterações implica aceitação da nova política.`,
  },
  {
    title: "10. Contato",
    content: `Para exercer seus direitos, tirar dúvidas ou reportar alguma preocupação sobre privacidade, entre em contato pelo e-mail: privacidade@uppi.app. Respondemos todas as solicitações em até 15 dias úteis.`,
  },
]

export default function PrivacyPage() {
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
            Política de Privacidade
          </h1>
          <p className="text-muted-foreground leading-relaxed">
            Esta política descreve como o <strong className="text-foreground">Uppi</strong> coleta, usa e protege suas informações pessoais. Ao usar o aplicativo, você concorda com os termos descritos abaixo.
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
          <p>Última atualização: 25 de fevereiro de 2026</p>
          <p>Versão: 1.0.0</p>
          <p>Em conformidade com a LGPD (Lei nº 13.709/2018) e o RGPD (Regulamento UE 2016/679).</p>        </div>

        {/* Back button */}
        <div className="mt-10">
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
