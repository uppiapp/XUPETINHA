'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AdminHeader } from '@/components/admin/admin-header'
import { Input } from '@/components/ui/input'
import { Settings, Save, RefreshCw, AlertCircle, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Setting {
  key: string
  value: string
  description: string | null
  updated_at: string
}

const SETTING_LABELS: Record<string, { label: string; desc: string; type: 'number' | 'text' | 'boolean'; unit?: string }> = {
  platform_fee_percent: { label: 'Taxa da Plataforma', desc: 'Porcentagem cobrada pela plataforma em cada corrida', type: 'number', unit: '%' },
  min_ride_price: { label: 'Valor Minimo de Corrida', desc: 'Valor minimo que o passageiro pode ofertar', type: 'number', unit: 'R$' },
  price_per_km: { label: 'Preco por KM', desc: 'Base de calculo do preco de corrida', type: 'number', unit: 'R$/km' },
  max_driver_search_radius_km: { label: 'Raio de Busca de Motoristas', desc: 'Distancia maxima para encontrar motoristas disponíveis', type: 'number', unit: 'km' },
  app_version_min: { label: 'Versao Minima do App', desc: 'Versao minima obrigatoria para uso do app', type: 'text' },
  maintenance_mode: { label: 'Modo de Manutencao', desc: 'Quando ativo, nenhum novo pedido sera aceito no app', type: 'boolean' },
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Setting[]>([])
  const [edited, setEdited] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const fetchSettings = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase.from('system_settings').select('*').order('key')
    setSettings(data || [])
    setEdited({})
    setLoading(false)
  }, [])

  useEffect(() => { fetchSettings() }, [fetchSettings])

  const handleChange = (key: string, value: string) => {
    setEdited(prev => ({ ...prev, [key]: value }))
    setSaved(false)
    setError('')
  }

  const hasChanges = Object.keys(edited).length > 0

  const handleSave = async () => {
    if (!hasChanges) return
    setSaving(true)
    setError('')
    const supabase = createClient()

    for (const [key, value] of Object.entries(edited)) {
      const { error: err } = await supabase
        .from('system_settings')
        .update({ value, updated_at: new Date().toISOString() })
        .eq('key', key)
      if (err) { setError(`Erro ao salvar ${key}: ${err.message}`); setSaving(false); return }
    }

    setSaving(false)
    setSaved(true)
    fetchSettings()
    setTimeout(() => setSaved(false), 3000)
  }

  const getValue = (key: string, currentValue: string) => {
    return edited[key] !== undefined ? edited[key] : currentValue
  }

  const headerActions = (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={fetchSettings}
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
      <AdminHeader title="Configuracoes do Sistema" subtitle="Parametros globais da plataforma" actions={headerActions} />
      <div className="flex-1 overflow-y-auto bg-[hsl(var(--admin-bg))] p-5">
        <div className="max-w-2xl mx-auto space-y-3">

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="w-6 h-6 border-2 border-[hsl(var(--admin-green))] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {error && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-[13px]">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}

              {settings.map(setting => {
                const meta = SETTING_LABELS[setting.key]
                const currentValue = getValue(setting.key, setting.value)
                const isChanged = edited[setting.key] !== undefined

                return (
                  <div
                    key={setting.key}
                    className={cn(
                      'bg-[hsl(var(--admin-surface))] rounded-xl border p-4 transition-colors',
                      isChanged ? 'border-[hsl(var(--admin-green))]/40' : 'border-[hsl(var(--admin-border))]'
                    )}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <h3 className="text-[13px] font-bold text-slate-200">
                            {meta?.label || setting.key}
                          </h3>
                          {meta?.unit && (
                            <span className="text-[10px] bg-[hsl(var(--admin-bg))] border border-[hsl(var(--admin-border))] text-slate-500 px-1.5 py-0.5 rounded font-mono">
                              {meta.unit}
                            </span>
                          )}
                          {isChanged && (
                            <span className="text-[10px] bg-amber-500/10 text-amber-400 px-1.5 py-0.5 rounded font-medium">modificado</span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500">{meta?.desc || setting.description || setting.key}</p>
                      </div>
                      <div className="w-36 shrink-0">
                        {meta?.type === 'boolean' ? (
                          <button
                            type="button"
                            onClick={() => handleChange(setting.key, currentValue === 'true' ? 'false' : 'true')}
                            className={cn(
                              'w-full h-9 rounded-lg text-[12px] font-bold transition-colors flex items-center justify-center gap-2',
                              currentValue === 'true'
                                ? 'bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500/25'
                                : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25'
                            )}
                          >
                            {currentValue === 'true' ? 'ATIVO' : 'INATIVO'}
                          </button>
                        ) : (
                          <Input
                            type={meta?.type === 'number' ? 'number' : 'text'}
                            value={currentValue}
                            onChange={e => handleChange(setting.key, e.target.value)}
                            className={cn(
                              'h-9 bg-[hsl(var(--admin-bg))] text-slate-100 rounded-lg text-[13px] text-right tabular-nums',
                              isChanged
                                ? 'border-[hsl(var(--admin-green))]/50 focus-visible:ring-[hsl(var(--admin-green))]/30'
                                : 'border-[hsl(var(--admin-border))]'
                            )}
                          />
                        )}
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-600 mt-2 font-mono">
                      Ultima atualizacao: {new Date(setting.updated_at).toLocaleString('pt-BR')}
                    </p>
                  </div>
                )
              })}

              {settings.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-slate-600">
                  <Settings className="w-10 h-10 mb-3 opacity-30" />
                  <p className="text-[14px]">Nenhuma configuracao encontrada</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  )
}
