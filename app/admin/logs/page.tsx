'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AdminHeader } from '@/components/admin/admin-header'
import { Input } from '@/components/ui/input'
import { AlertTriangle, Info, XCircle, Search, RefreshCw, ServerCrash } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ErrorLog {
  id: string
  created_at: string
  level: 'error' | 'warning' | 'info'
  message: string
  stack: string | null
  context: string | null
  user_id: string | null
  metadata: Record<string, unknown>
}

const levelConfig = {
  error: {
    label: 'Erro',
    icon: XCircle,
    badge: 'bg-red-500/15 text-red-500 border-red-500/20',
    row: 'border-l-red-500',
  },
  warning: {
    label: 'Alerta',
    icon: AlertTriangle,
    badge: 'bg-amber-500/15 text-amber-500 border-amber-500/20',
    row: 'border-l-amber-500',
  },
  info: {
    label: 'Info',
    icon: Info,
    badge: 'bg-blue-500/15 text-blue-500 border-blue-500/20',
    row: 'border-l-blue-500',
  },
}

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<ErrorLog[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterLevel, setFilterLevel] = useState<'all' | 'error' | 'warning' | 'info'>('all')
  const [expanded, setExpanded] = useState<string | null>(null)

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('error_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200)
    if (data) setLogs(data as ErrorLog[])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchLogs()

    // Realtime: novos logs aparecem automaticamente
    const supabase = createClient()
    const channel = supabase
      .channel('admin-error-logs')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'error_logs' }, (payload) => {
        setLogs((prev) => [payload.new as ErrorLog, ...prev])
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [fetchLogs])

  const filtered = logs.filter((log) => {
    const matchLevel = filterLevel === 'all' || log.level === filterLevel
    const matchSearch =
      !search ||
      log.message.toLowerCase().includes(search.toLowerCase()) ||
      (log.context ?? '').toLowerCase().includes(search.toLowerCase())
    return matchLevel && matchSearch
  })

  const counts = {
    error: logs.filter((l) => l.level === 'error').length,
    warning: logs.filter((l) => l.level === 'warning').length,
    info: logs.filter((l) => l.level === 'info').length,
  }

  if (loading) {
    return (
      <>
        <AdminHeader title="Logs de Erro" subtitle="Carregando..." />
        <div className="flex-1 flex items-center justify-center bg-[hsl(var(--admin-bg))]">
          <div className="w-6 h-6 border-2 border-[hsl(var(--admin-green))] border-t-transparent rounded-full animate-spin" />
        </div>
      </>
    )
  }

  return (
    <>
      <AdminHeader title="Logs de Erro" subtitle="Monitoramento de erros do sistema em tempo real" />
      <div className="flex-1 overflow-auto bg-[hsl(var(--admin-bg))] p-5">
        {/* Resumo */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          {(['error', 'warning', 'info'] as const).map((lvl) => {
            const cfg = levelConfig[lvl]
            const Icon = cfg.icon
            return (
              <button
                key={lvl}
                type="button"
                onClick={() => setFilterLevel(filterLevel === lvl ? 'all' : lvl)}
                className={cn(
                  'flex items-center gap-3 p-4 rounded-xl border bg-[hsl(var(--admin-surface))] text-left transition-all',
                  filterLevel === lvl
                    ? 'ring-1 ring-[hsl(var(--admin-green))]/50 border-[hsl(var(--admin-green))]/30'
                    : 'border-[hsl(var(--admin-border))] hover:border-[hsl(var(--admin-border))]/80'
                )}
              >
                <div className={cn('p-2 rounded-lg', cfg.badge)}>
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[22px] font-bold text-slate-100 tabular-nums">{counts[lvl]}</p>
                  <p className="text-[11px] text-slate-500">{cfg.label}s</p>
                </div>
              </button>
            )
          })}
        </div>

        {/* Filtros */}
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input
              placeholder="Buscar por mensagem ou contexto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-10 bg-[hsl(var(--admin-surface))] border-[hsl(var(--admin-border))] text-slate-200 rounded-xl placeholder:text-slate-600"
            />
          </div>
          <button
            type="button"
            onClick={fetchLogs}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[hsl(var(--admin-border))] bg-[hsl(var(--admin-surface))] text-[12px] text-slate-400 hover:text-slate-200 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Atualizar
          </button>
          <span className="text-[11px] text-slate-600 ml-auto">{filtered.length} de {logs.length}</span>
        </div>

        {/* Lista */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-600">
            <ServerCrash className="w-12 h-12 mb-3 opacity-20" />
            <p className="text-[13px] font-medium text-slate-500">Nenhum log encontrado</p>
            <p className="text-[11px] mt-1">Os erros do sistema aparecerao aqui em tempo real</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((log) => {
              const cfg = levelConfig[log.level] ?? levelConfig.error
              const Icon = cfg.icon
              const isExpanded = expanded === log.id

              return (
                <button
                  type="button"
                  key={log.id}
                  onClick={() => setExpanded(isExpanded ? null : log.id)}
                  className={cn(
                    'w-full text-left p-4 rounded-xl border border-l-4 transition-all',
                    'bg-[hsl(var(--admin-surface))] hover:bg-[hsl(var(--admin-surface))]/80',
                    cfg.row
                  )}
                >
                  <div className="flex items-start gap-3">
                    <Icon className={cn('w-4 h-4 mt-0.5 shrink-0',
                      log.level === 'error' && 'text-red-400',
                      log.level === 'warning' && 'text-amber-400',
                      log.level === 'info' && 'text-blue-400',
                    )} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={cn('inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold border', cfg.badge)}>
                          {cfg.label}
                        </span>
                        {log.context && (
                          <span className="text-[10px] text-slate-500 font-mono bg-[hsl(var(--admin-bg))] px-1.5 py-0.5 rounded border border-[hsl(var(--admin-border))]">
                            {log.context}
                          </span>
                        )}
                        <span className="text-[10px] text-slate-600 ml-auto tabular-nums">
                          {new Date(log.created_at).toLocaleString('pt-BR')}
                        </span>
                      </div>
                      <p className="text-[12px] text-slate-200 font-medium truncate">{log.message}</p>

                      {isExpanded && (
                        <div className="mt-3 space-y-2">
                          {log.stack && (
                            <pre className="text-[11px] text-slate-400 bg-[hsl(var(--admin-bg))] rounded-lg p-3 overflow-auto max-h-40 whitespace-pre-wrap font-mono leading-relaxed border border-[hsl(var(--admin-border))]">
                              {log.stack}
                            </pre>
                          )}
                          {log.metadata && Object.keys(log.metadata).length > 0 && (
                            <pre className="text-[11px] text-slate-400 bg-[hsl(var(--admin-bg))] rounded-lg p-3 overflow-auto font-mono border border-[hsl(var(--admin-border))]">
                              {JSON.stringify(log.metadata, null, 2)}
                            </pre>
                          )}
                          {log.user_id && (
                            <p className="text-[11px] text-slate-500 font-mono">
                              User ID: {log.user_id}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
