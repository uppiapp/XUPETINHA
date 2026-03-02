'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AdminHeader } from '@/components/admin/admin-header'
import { FileText, Shield, Save, RefreshCw, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type DocType = 'terms' | 'privacy'

const DEFAULT_TERMS = `# Termos de Uso — Uppi

## 1. Aceitação dos Termos
Ao acessar e usar o aplicativo Uppi, você concorda em cumprir e estar vinculado aos seguintes termos e condições de uso.

## 2. Descrição do Serviço
O Uppi é uma plataforma que conecta passageiros e motoristas para serviços de transporte. Permitimos que passageiros proponham preços e motoristas façam ofertas, promovendo transparência e negociação justa.

## 3. Cadastro e Conta
Para usar o Uppi, você deve criar uma conta fornecendo informações precisas e atualizadas. Você é responsável por manter a confidencialidade de sua conta e senha.

## 4. Uso do Serviço
- Você deve ter pelo menos 18 anos para usar o serviço
- Motoristas devem possuir CNH válida e documentação do veículo em dia
- É proibido usar o serviço para atividades ilegais ou fraudulentas
- Você deve tratar todos os usuários com respeito e cortesia

## 5. Pagamentos e Tarifas
Os preços são negociados entre passageiros e motoristas. O Uppi cobra uma taxa de serviço sobre cada corrida concluída.

## 6. Segurança
Implementamos medidas de segurança, incluindo verificação de motoristas, sistema de avaliações e botão de emergência.

## 7. Limitação de Responsabilidade
O Uppi atua como intermediário entre passageiros e motoristas.

## 8. Contato
suporte@uppi.app`

const DEFAULT_PRIVACY = `# Política de Privacidade — Uppi

## 1. Dados Coletados
Coletamos: nome, email, telefone, localização GPS durante corridas, dados do veículo (motoristas), histórico de corridas e pagamentos.

## 2. Uso dos Dados
Os dados são usados para: prestação do serviço, segurança, melhoria da plataforma e comunicações relacionadas ao serviço.

## 3. Compartilhamento
Compartilhamos dados apenas com: motoristas/passageiros da mesma corrida, processadores de pagamento e autoridades quando exigido por lei.

## 4. Segurança
Utilizamos criptografia TLS/SSL, armazenamento seguro no Supabase com Row Level Security (RLS) e acesso restrito por autenticação.

## 5. Retenção
Mantemos dados ativos enquanto a conta estiver ativa. Dados de corridas são retidos por 5 anos para fins legais.

## 6. Seus Direitos
Você pode: acessar seus dados, solicitar correção, exclusão da conta e portabilidade dos dados. Contato: privacidade@uppi.app

## 7. Cookies
Usamos cookies essenciais para autenticação e preferências do usuário.

## 8. Contato
privacidade@uppi.app`

export default function AdminLegalPage() {
  const [activeTab, setActiveTab] = useState<DocType>('terms')
  const [content, setContent] = useState({ terms: DEFAULT_TERMS, privacy: DEFAULT_PRIVACY })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Record<DocType, string | null>>({ terms: null, privacy: null })

  const fetchDocs = async () => {
    setLoading(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('legal_documents')
      .select('type, content, version, updated_at')

    if (data && data.length > 0) {
      const map: Record<string, string> = {}
      const dates: Record<string, string> = {}
      data.forEach(row => {
        map[row.type] = row.content
        dates[row.type] = row.updated_at
      })
      setContent(prev => ({
        terms: map.terms || prev.terms,
        privacy: map.privacy || prev.privacy,
      }))
      setLastUpdated({ terms: dates.terms || null, privacy: dates.privacy || null })
    }
    setLoading(false)
  }

  const handleSave = async () => {
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    await supabase
      .from('legal_documents')
      .upsert(
        { type: activeTab, content: content[activeTab], updated_by: user?.id, updated_at: new Date().toISOString() },
        { onConflict: 'type' }
      )

    setLastUpdated(prev => ({ ...prev, [activeTab]: new Date().toISOString() }))
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  useEffect(() => { fetchDocs() }, [])

  const tabs: { key: DocType; label: string; icon: any }[] = [
    { key: 'terms', label: 'Termos de Uso', icon: FileText },
    { key: 'privacy', label: 'Politica de Privacidade', icon: Shield },
  ]

  const headerActions = (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={fetchDocs}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] text-[12px] font-medium text-slate-400 hover:text-slate-200 transition-colors"
      >
        <RefreshCw className="w-3 h-3" />
        Recarregar
      </button>
      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className={cn(
          'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors',
          saved
            ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-400'
            : 'bg-[hsl(var(--admin-green))]/20 border border-[hsl(var(--admin-green))]/30 text-[hsl(var(--admin-green))] hover:bg-[hsl(var(--admin-green))]/30'
        )}
      >
        {saved ? <CheckCircle2 className="w-3 h-3" /> : <Save className="w-3 h-3" />}
        {saving ? 'Salvando...' : saved ? 'Salvo' : 'Salvar'}
      </button>
    </div>
  )

  if (loading) {
    return (
      <>
        <AdminHeader title="Documentos Legais" subtitle="Carregando..." />
        <div className="flex-1 flex items-center justify-center bg-[hsl(var(--admin-bg))]">
          <div className="w-6 h-6 border-2 border-[hsl(var(--admin-green))] border-t-transparent rounded-full animate-spin" />
        </div>
      </>
    )
  }

  return (
    <>
      <AdminHeader
        title="Documentos Legais"
        subtitle="Termos de uso e politica de privacidade"
        actions={headerActions}
      />
      <div className="flex-1 overflow-y-auto bg-[hsl(var(--admin-bg))]">
        <div className="p-5 space-y-5">

          {/* Tabs */}
          <div className="flex items-center gap-1 bg-[hsl(var(--admin-surface))] rounded-xl p-1 border border-[hsl(var(--admin-border))] w-fit">
            {tabs.map(t => (
              <button
                key={t.key}
                type="button"
                onClick={() => setActiveTab(t.key)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-medium transition-all',
                  activeTab === t.key
                    ? 'bg-[hsl(var(--admin-green))]/20 text-[hsl(var(--admin-green))] shadow-sm'
                    : 'text-slate-500 hover:text-slate-300'
                )}
              >
                <t.icon className="w-3.5 h-3.5" />
                {t.label}
              </button>
            ))}
          </div>

          {/* Info */}
          {lastUpdated[activeTab] && (
            <p className="text-[12px] text-slate-600">
              Ultima atualizacao: {new Date(lastUpdated[activeTab]!).toLocaleDateString('pt-BR', {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit'
              })}
            </p>
          )}

          {/* Editor */}
          <div className="bg-[hsl(var(--admin-surface))] rounded-xl border border-[hsl(var(--admin-border))] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-[hsl(var(--admin-border))]">
              <h3 className="text-[13px] font-bold text-slate-200">
                {activeTab === 'terms' ? 'Termos de Uso' : 'Politica de Privacidade'}
              </h3>
              <span className="text-[11px] text-slate-600">Markdown suportado</span>
            </div>
            <textarea
              value={content[activeTab]}
              onChange={e => setContent(prev => ({ ...prev, [activeTab]: e.target.value }))}
              className="w-full h-[500px] p-5 bg-transparent text-[13px] text-slate-300 font-mono leading-relaxed resize-none outline-none placeholder:text-slate-700"
              placeholder="Digite o conteudo do documento..."
              spellCheck={false}
            />
          </div>

          {/* Preview */}
          <div className="bg-[hsl(var(--admin-surface))] rounded-xl border border-[hsl(var(--admin-border))] overflow-hidden">
            <div className="flex items-center px-5 py-3 border-b border-[hsl(var(--admin-border))]">
              <h3 className="text-[13px] font-bold text-slate-200">Preview (como aparece no app)</h3>
            </div>
            <div className="p-5 prose prose-sm prose-invert max-w-none">
              {content[activeTab].split('\n').map((line, i) => {
                if (line.startsWith('# ')) return <h1 key={i} className="text-xl font-bold text-slate-100 mb-3 mt-0">{line.slice(2)}</h1>
                if (line.startsWith('## ')) return <h2 key={i} className="text-base font-bold text-slate-200 mt-5 mb-2">{line.slice(3)}</h2>
                if (line.startsWith('- ')) return <li key={i} className="text-slate-400 text-[13px] ml-4">{line.slice(2)}</li>
                if (line.trim() === '') return <div key={i} className="h-2" />
                return <p key={i} className="text-slate-400 text-[13px] leading-relaxed">{line}</p>
              })}
            </div>
          </div>

        </div>
      </div>
    </>
  )
}
