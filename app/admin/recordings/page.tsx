'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AdminHeader } from '@/components/admin/admin-header'
import { Mic, MicOff, Shield, Download, Trash2, Play, User, Car, Clock, HardDrive, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Recording {
  id: string
  ride_id: string
  recorded_by: string
  storage_path: string
  duration_seconds: number
  file_size_bytes: number
  created_at: string
  ride?: {
    pickup_address: string
    dropoff_address: string
    passenger?: { full_name: string }
    driver?: { full_name: string }
  }
  recorder?: { full_name: string; email: string }
}

interface RecordingPreference {
  user_id: string
  enabled: boolean
  auto_record: boolean
  profiles?: { full_name: string; email: string }
}

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function AdminRecordingsPage() {
  const supabase = createClient()
  const [recordings, setRecordings] = useState<Recording[]>([])
  const [preferences, setPreferences] = useState<RecordingPreference[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'recordings' | 'preferences'>('recordings')
  const [selected, setSelected] = useState<Recording | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  const kpis = {
    total: recordings.length,
    totalDuration: recordings.reduce((a, r) => a + r.duration_seconds, 0),
    totalSize: recordings.reduce((a, r) => a + r.file_size_bytes, 0),
    usersEnabled: preferences.filter(p => p.enabled).length,
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [recRes, prefRes] = await Promise.all([
        supabase
          .from('ride_recordings')
          .select(`
            id, ride_id, recorded_by, storage_path,
            duration_seconds, file_size_bytes, created_at,
            ride:rides(pickup_address, dropoff_address,
              passenger:profiles!passenger_id(full_name),
              driver:profiles!driver_id(full_name)
            ),
            recorder:profiles!recorded_by(full_name, email)
          `)
          .order('created_at', { ascending: false })
          .limit(100),
        supabase
          .from('user_recording_preferences')
          .select('user_id, enabled, auto_record, profiles(full_name, email)')
          .order('enabled', { ascending: false })
          .limit(200),
      ])
      setRecordings((recRes.data as any[]) || [])
      setPreferences((prefRes.data as any[]) || [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleDelete = async (rec: Recording) => {
    if (!confirm(`Apagar gravacao de ${formatDuration(rec.duration_seconds)}? Esta acao nao pode ser desfeita.`)) return
    setDeleting(rec.id)
    try {
      await supabase.storage.from('ride-recordings').remove([rec.storage_path])
      await supabase.from('ride_recordings').delete().eq('id', rec.id)
      setRecordings(prev => prev.filter(r => r.id !== rec.id))
      if (selected?.id === rec.id) setSelected(null)
    } finally {
      setDeleting(null)
    }
  }

  const togglePreference = async (userId: string, current: boolean) => {
    await supabase
      .from('user_recording_preferences')
      .update({ enabled: !current })
      .eq('user_id', userId)
    setPreferences(prev => prev.map(p => p.user_id === userId ? { ...p, enabled: !current } : p))
  }

  return (
    <div className="flex flex-col h-screen bg-[#0A0A0A] text-white overflow-hidden">
      <AdminHeader />
      <div className="flex-1 overflow-y-auto p-6 space-y-6">

        {/* Title */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Gravacoes de Corridas</h1>
            <p className="text-sm text-zinc-400 mt-1">Audio criptografado AES-256 — acesso somente admin</p>
          </div>
          <button onClick={load} className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm transition-colors">
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
            Atualizar
          </button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: Mic, label: 'Total de Gravacoes', value: kpis.total, color: 'text-violet-400' },
            { icon: Clock, label: 'Duracao Total', value: formatDuration(kpis.totalDuration), color: 'text-blue-400' },
            { icon: HardDrive, label: 'Espaco Usado', value: formatBytes(kpis.totalSize), color: 'text-amber-400' },
            { icon: User, label: 'Usuarios com Gravacao', value: `${kpis.usersEnabled} ativos`, color: 'text-emerald-400' },
          ].map((k, i) => (
            <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <k.icon className={cn('w-5 h-5 mb-2', k.color)} />
              <p className="text-xs text-zinc-500 mb-1">{k.label}</p>
              <p className="text-xl font-bold text-white">{loading ? '—' : k.value}</p>
            </div>
          ))}
        </div>

        {/* Security notice */}
        <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
          <Shield className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-300">Dados Sensiveis</p>
            <p className="text-xs text-amber-400/80 mt-0.5">
              Gravacoes sao criptografadas com AES-256-GCM. O acesso e restrito a administradores e requer
              justificativa legal. Logs de acesso sao registrados automaticamente.
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-zinc-800 pb-0">
          {(['recordings', 'preferences'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px',
                tab === t ? 'border-violet-500 text-violet-400' : 'border-transparent text-zinc-500 hover:text-zinc-300'
              )}
            >
              {t === 'recordings' ? `Gravacoes (${recordings.length})` : `Preferencias (${preferences.length})`}
            </button>
          ))}
        </div>

        {tab === 'recordings' && (
          <div className="flex gap-6">
            {/* List */}
            <div className="flex-1 space-y-3">
              {loading ? (
                <div className="text-center py-12 text-zinc-600">Carregando...</div>
              ) : recordings.length === 0 ? (
                <div className="text-center py-12">
                  <MicOff className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
                  <p className="text-zinc-500">Nenhuma gravacao encontrada</p>
                </div>
              ) : recordings.map(rec => {
                const recAs = rec as any
                const p = recAs.ride?.passenger?.full_name || 'Passageiro'
                const d = recAs.ride?.driver?.full_name || 'Motorista'
                return (
                  <button
                    key={rec.id}
                    onClick={() => setSelected(rec === selected ? null : rec)}
                    className={cn(
                      'w-full text-left bg-zinc-900 border rounded-xl p-4 transition-colors',
                      selected?.id === rec.id ? 'border-violet-500' : 'border-zinc-800 hover:border-zinc-700'
                    )}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Mic className="w-4 h-4 text-violet-400" />
                        <span className="text-sm font-medium text-white">
                          {formatDuration(rec.duration_seconds)}
                        </span>
                        <span className="text-xs text-zinc-500">{formatBytes(rec.file_size_bytes)}</span>
                      </div>
                      <span className="text-xs text-zinc-500">
                        {new Date(rec.created_at).toLocaleString('pt-BR')}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-zinc-400">
                      <span className="flex items-center gap-1"><User className="w-3 h-3" />{p}</span>
                      <span className="flex items-center gap-1"><Car className="w-3 h-3" />{d}</span>
                    </div>
                    {recAs.ride?.pickup_address && (
                      <p className="text-xs text-zinc-600 mt-1 truncate">
                        {recAs.ride.pickup_address} → {recAs.ride.dropoff_address}
                      </p>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Detail panel */}
            {selected && (
              <div className="w-80 bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4 h-fit">
                <h3 className="text-sm font-semibold text-white">Detalhes da Gravacao</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Duracao</span>
                    <span className="text-white">{formatDuration(selected.duration_seconds)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Tamanho</span>
                    <span className="text-white">{formatBytes(selected.file_size_bytes)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Criada em</span>
                    <span className="text-white text-xs">{new Date(selected.created_at).toLocaleString('pt-BR')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Corrida</span>
                    <span className="text-white font-mono text-xs">{selected.ride_id.slice(0, 8)}...</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-emerald-500/10 rounded-lg px-3 py-2">
                  <Shield className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs text-emerald-400">Criptografado AES-256</span>
                </div>
                <div className="space-y-2">
                  <button className="w-full flex items-center justify-center gap-2 py-2 bg-violet-600 hover:bg-violet-500 rounded-lg text-sm font-medium transition-colors">
                    <Play className="w-4 h-4" /> Ouvir (requer chave)
                  </button>
                  <button className="w-full flex items-center justify-center gap-2 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm transition-colors">
                    <Download className="w-4 h-4" /> Baixar arquivo
                  </button>
                  <button
                    onClick={() => handleDelete(selected)}
                    disabled={deleting === selected.id}
                    className="w-full flex items-center justify-center gap-2 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-sm transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                    {deleting === selected.id ? 'Apagando...' : 'Apagar gravacao'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'preferences' && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Usuario</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Email</th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Gravacao Ativa</th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Auto Gravar</th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-zinc-500 uppercase">Acao</th>
                </tr>
              </thead>
              <tbody>
                {preferences.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-8 text-zinc-600">Nenhuma preferencia configurada</td></tr>
                ) : preferences.map(pref => {
                  const prefAs = pref as any
                  return (
                    <tr key={pref.user_id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                      <td className="px-4 py-3 font-medium text-white">{prefAs.profiles?.full_name || '—'}</td>
                      <td className="px-4 py-3 text-zinc-400">{prefAs.profiles?.email || '—'}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', pref.enabled ? 'bg-emerald-500/15 text-emerald-400' : 'bg-zinc-700 text-zinc-400')}>
                          {pref.enabled ? 'Ativa' : 'Inativa'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', pref.auto_record ? 'bg-blue-500/15 text-blue-400' : 'bg-zinc-700 text-zinc-400')}>
                          {pref.auto_record ? 'Sim' : 'Nao'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => togglePreference(pref.user_id, pref.enabled)}
                          className={cn(
                            'px-3 py-1 rounded-lg text-xs font-medium transition-colors',
                            pref.enabled ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                          )}
                        >
                          {pref.enabled ? 'Desativar' : 'Ativar'}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
