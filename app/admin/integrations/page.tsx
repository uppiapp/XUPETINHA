'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AdminHeader } from '@/components/admin/admin-header'
import { Input } from '@/components/ui/input'
import {
  Save, RefreshCw, AlertCircle, Check, Eye, EyeOff,
  Map, CreditCard, Smartphone, Mail, Cloud, Key,
  ShieldCheck, Zap, MessageSquare, Globe, Lock, Unlock,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface ApiKey {
  id: string
  category: string
  provider: string
  label: string
  key_name: string
  key_value: string | null
  is_active: boolean
  description: string | null
  updated_at: string
  updated_by: string | null
}

const CATEGORY_META: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  maps:    { label: 'Mapas & Localização', icon: Map,           color: 'text-blue-400'   },
  gateway: { label: 'Gateway de Pagamento', icon: CreditCard,   color: 'text-emerald-400' },
  pix:     { label: 'PIX',                  icon: Zap,          color: 'text-yellow-400' },
  sms:     { label: 'SMS',                  icon: MessageSquare, color: 'text-purple-400' },
  push:    { label: 'Push Notifications',   icon: Smartphone,   color: 'text-orange-400' },
  email:   { label: 'E-mail',               icon: Mail,          color: 'text-pink-400'   },
  auth:    { label: 'Auth & Login Social',  icon: ShieldCheck,  color: 'text-cyan-400'   },
  storage: { label: 'Armazenamento',        icon: Cloud,        color: 'text-slate-400'  },
}

const PROVIDER_LABELS: Record<string, string> = {
  google_maps: 'Google',
  paradise:    'Paradise',
  stripe:      'Stripe',
  twilio:      'Twilio',
  firebase:    'Firebase',
  resend:      'Resend',
  sendgrid:    'SendGrid',
  google:      'Google OAuth',
  aws:         'Amazon AWS',
}

function isSensitiveKey(keyName: string) {
  const lower = keyName.toLowerCase()
  return lower.includes('secret') || lower.includes('private') || lower.includes('token') || lower.includes('password')
}

function MaskedInput({
  value,
  onChange,
  isSensitive,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  isSensitive: boolean
  placeholder?: string
}) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <Input
        type={isSensitive && !show ? 'password' : 'text'}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder || 'Insira o valor...'}
        className="h-8 bg-[hsl(var(--admin-bg))] text-slate-100 text-[12px] border-[hsl(var(--admin-border))] pr-8 font-mono"
      />
      {isSensitive && (
        <button
          type="button"
          onClick={() => setShow(s => !s)}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
          tabIndex={-1}
        >
          {show ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
        </button>
      )}
    </div>
  )
}

export default function IntegrationsPage() {
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [edited, setEdited] = useState<Record<string, string>>({})
  const [activeToggle, setActiveToggle] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [activeCategory, setActiveCategory] = useState<string>('all')

  const fetchKeys = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const { data } = await supabase.from('api_keys').select('*').order('category').order('provider').order('label')
    setKeys(data || [])
    setEdited({})
    setActiveToggle({})
    setLoading(false)
  }, [])

  useEffect(() => { fetchKeys() }, [fetchKeys])

  const handleChange = (id: string, value: string) => {
    setEdited(prev => ({ ...prev, [id]: value }))
    setSaved(false)
    setError('')
  }

  const handleToggle = (id: string, current: boolean) => {
    setActiveToggle(prev => ({ ...prev, [id]: !current }))
    setSaved(false)
    setError('')
  }

  const hasChanges = Object.keys(edited).length > 0 || Object.keys(activeToggle).length > 0

  const handleSave = async () => {
    if (!hasChanges) return
    setSaving(true)
    setError('')
    const supabase = createClient()

    for (const [id, value] of Object.entries(edited)) {
      const { error: err } = await supabase
        .from('api_keys')
        .update({ key_value: value || null, updated_at: new Date().toISOString() })
        .eq('id', id)
      if (err) { setError(`Erro: ${err.message}`); setSaving(false); return }
    }

    for (const [id, isActive] of Object.entries(activeToggle)) {
      const { error: err } = await supabase
        .from('api_keys')
        .update({ is_active: isActive, updated_at: new Date().toISOString() })
        .eq('id', id)
      if (err) { setError(`Erro: ${err.message}`); setSaving(false); return }
    }

    setSaving(false)
    setSaved(true)
    fetchKeys()
    setTimeout(() => setSaved(false), 3000)
  }

  const getValue = (key: ApiKey) => edited[key.id] !== undefined ? edited[key.id] : (key.key_value || '')
  const getActive = (key: ApiKey) => activeToggle[key.id] !== undefined ? activeToggle[key.id] : key.is_active

  const categories = ['all', ...Array.from(new Set(keys.map(k => k.category)))]

  const filtered = activeCategory === 'all'
    ? keys
    : keys.filter(k => k.category === activeCategory)

  const grouped = filtered.reduce<Record<string, ApiKey[]>>((acc, k) => {
    if (!acc[k.category]) acc[k.category] = []
    acc[k.category].push(k)
    return acc
  }, {})

  const totalConfigured = keys.filter(k => k.key_value && k.key_value.trim() !== '').length
  const totalKeys = keys.length

  const headerActions = (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={fetchKeys}
        className="w-8 h-8 rounded-lg bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] flex items-center justify-center text-slate-400 hover:text-slate-200 transition-colors"
      >
        <RefreshCw className="w-3.5 h-3.5" />
      </button>
      <button
        type="button"
        onClick={handleSave}
        disabled={!hasChanges || saving}
        className={cn(
          'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all',
          hasChanges && !saving
            ? 'bg-[hsl(var(--admin-green))]/15 text-[hsl(var(--admin-green))] border border-[hsl(var(--admin-green))]/30 hover:bg-[hsl(var(--admin-green))]/25'
            : 'bg-[hsl(var(--admin-surface))] text-slate-600 border border-[hsl(var(--admin-border))] cursor-not-allowed'
        )}
      >
        {saving ? (
          <div className="w-3.5 h-3.5 border-2 border-[hsl(var(--admin-green))] border-t-transparent rounded-full animate-spin" />
        ) : saved ? (
          <Check className="w-3.5 h-3.5" />
        ) : (
          <Save className="w-3.5 h-3.5" />
        )}
        {saved ? 'Salvo!' : 'Salvar Alteracoes'}
      </button>
    </div>
  )

  return (
    <>
      <AdminHeader
        title="Integracoes & Chaves de API"
        subtitle="Gerencie todas as chaves de servicos externos da plataforma"
        actions={headerActions}
      />

      <div className="flex-1 overflow-y-auto bg-[hsl(var(--admin-bg))] p-5">
        <div className="max-w-4xl mx-auto space-y-5">

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-[hsl(var(--admin-surface))] rounded-xl border border-[hsl(var(--admin-border))] p-4">
              <p className="text-[11px] text-slate-500 mb-1">Total de Chaves</p>
              <p className="text-[22px] font-bold text-slate-100 tabular-nums">{totalKeys}</p>
            </div>
            <div className="bg-[hsl(var(--admin-surface))] rounded-xl border border-[hsl(var(--admin-border))] p-4">
              <p className="text-[11px] text-slate-500 mb-1">Configuradas</p>
              <p className="text-[22px] font-bold text-[hsl(var(--admin-green))] tabular-nums">{totalConfigured}</p>
            </div>
            <div className="bg-[hsl(var(--admin-surface))] rounded-xl border border-[hsl(var(--admin-border))] p-4">
              <p className="text-[11px] text-slate-500 mb-1">Pendentes</p>
              <p className="text-[22px] font-bold text-amber-400 tabular-nums">{totalKeys - totalConfigured}</p>
            </div>
          </div>

          {/* Category filter */}
          <div className="flex gap-2 flex-wrap">
            {categories.map(cat => {
              const meta = CATEGORY_META[cat]
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all border',
                    activeCategory === cat
                      ? 'bg-[hsl(var(--admin-green))]/15 text-[hsl(var(--admin-green))] border-[hsl(var(--admin-green))]/30'
                      : 'bg-[hsl(var(--admin-surface))] text-slate-400 border-[hsl(var(--admin-border))] hover:text-slate-200'
                  )}
                >
                  {cat === 'all' ? (
                    <><Globe className="w-3.5 h-3.5" /> Todos</>
                  ) : (
                    <>{meta && <meta.icon className={cn('w-3.5 h-3.5', meta.color)} />} {meta?.label || cat}</>
                  )}
                </button>
              )
            })}
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-[13px]">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Keys grouped by category */}
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="w-6 h-6 border-2 border-[hsl(var(--admin-green))] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(grouped).map(([category, items]) => {
                const meta = CATEGORY_META[category]
                const Icon = meta?.icon || Key
                const providerGroups = items.reduce<Record<string, ApiKey[]>>((acc, k) => {
                  if (!acc[k.provider]) acc[k.provider] = []
                  acc[k.provider].push(k)
                  return acc
                }, {})

                return (
                  <div key={category}>
                    {/* Category header */}
                    <div className="flex items-center gap-2 mb-3">
                      <Icon className={cn('w-4 h-4', meta?.color || 'text-slate-400')} />
                      <h2 className="text-[13px] font-bold text-slate-200">{meta?.label || category}</h2>
                      <div className="flex-1 h-px bg-[hsl(var(--admin-border))]" />
                      <span className="text-[10px] text-slate-600 font-mono">{items.length} chaves</span>
                    </div>

                    {/* Provider cards */}
                    <div className="space-y-2">
                      {Object.entries(providerGroups).map(([provider, providerKeys]) => (
                        <div
                          key={provider}
                          className="bg-[hsl(var(--admin-surface))] rounded-xl border border-[hsl(var(--admin-border))] overflow-hidden"
                        >
                          {/* Provider header */}
                          <div className="flex items-center justify-between px-4 py-2.5 border-b border-[hsl(var(--admin-border))]/60">
                            <span className="text-[12px] font-bold text-slate-300">
                              {PROVIDER_LABELS[provider] || provider}
                            </span>
                            <span className="text-[10px] text-slate-600 font-mono">
                              {providerKeys.filter(k => k.key_value).length}/{providerKeys.length} configuradas
                            </span>
                          </div>

                          {/* Keys */}
                          <div className="divide-y divide-[hsl(var(--admin-border))]/40">
                            {providerKeys.map(key => {
                              const value = getValue(key)
                              const isActive = getActive(key)
                              const isChanged = edited[key.id] !== undefined || activeToggle[key.id] !== undefined
                              const isFilled = value.trim() !== ''
                              const sensitive = isSensitiveKey(key.key_name)

                              return (
                                <div
                                  key={key.id}
                                  className={cn(
                                    'px-4 py-3 transition-colors',
                                    isChanged && 'bg-[hsl(var(--admin-green))]/5'
                                  )}
                                >
                                  <div className="flex items-center gap-3">
                                    {/* Status indicator */}
                                    <div className={cn(
                                      'w-1.5 h-1.5 rounded-full shrink-0',
                                      !isActive ? 'bg-slate-600' : isFilled ? 'bg-[hsl(var(--admin-green))]' : 'bg-amber-400'
                                    )} />

                                    {/* Label + key name */}
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 mb-0.5">
                                        <span className="text-[12.5px] font-semibold text-slate-200 truncate">
                                          {key.label}
                                        </span>
                                        {sensitive && (
                                          <Lock className="w-3 h-3 text-slate-600 shrink-0" />
                                        )}
                                        {isChanged && (
                                          <span className="text-[9px] bg-amber-500/10 text-amber-400 px-1.5 py-0.5 rounded font-semibold shrink-0">
                                            modificado
                                          </span>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <code className="text-[10px] text-slate-600 font-mono bg-[hsl(var(--admin-bg))] px-1.5 py-0.5 rounded">
                                          {key.key_name}
                                        </code>
                                        {key.description && (
                                          <span className="text-[10px] text-slate-600 truncate hidden md:block">
                                            {key.description}
                                          </span>
                                        )}
                                      </div>
                                    </div>

                                    {/* Active toggle */}
                                    <button
                                      type="button"
                                      onClick={() => handleToggle(key.id, isActive)}
                                      title={isActive ? 'Desativar' : 'Ativar'}
                                      className={cn(
                                        'w-7 h-7 rounded-lg flex items-center justify-center transition-colors shrink-0',
                                        isActive
                                          ? 'bg-[hsl(var(--admin-green))]/10 text-[hsl(var(--admin-green))] hover:bg-[hsl(var(--admin-green))]/20'
                                          : 'bg-[hsl(var(--admin-bg))] text-slate-600 hover:text-slate-400'
                                      )}
                                    >
                                      {isActive
                                        ? <Unlock className="w-3.5 h-3.5" />
                                        : <Lock className="w-3.5 h-3.5" />
                                      }
                                    </button>

                                    {/* Value input */}
                                    <div className="w-64 shrink-0">
                                      <MaskedInput
                                        value={value}
                                        onChange={v => handleChange(key.id, v)}
                                        isSensitive={sensitive}
                                        placeholder={isFilled ? '••••••••' : 'Nao configurada'}
                                      />
                                    </div>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}

              {Object.keys(grouped).length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-slate-600">
                  <Key className="w-10 h-10 mb-3 opacity-30" />
                  <p className="text-[14px]">Nenhuma chave encontrada</p>
                </div>
              )}
            </div>
          )}

          {/* Footer note */}
          <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/5 border border-amber-500/15 text-amber-500/70 text-[11px]">
            <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
            <p>
              As chaves marcadas com <Lock className="w-3 h-3 inline mx-0.5" /> sao sensiveis e ficam mascaradas por padrao.
              Elas sao armazenadas no banco Supabase e nunca expostas ao frontend da plataforma principal.
              Em producao, considere usar variáveis de ambiente ou um cofre de segredos (ex: Vault).
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
