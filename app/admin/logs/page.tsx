'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AdminHeader } from '@/components/admin/admin-header'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { AlertTriangle, Info, XCircle, Search, RefreshCw, Loader2, ServerCrash } from 'lucide-react'
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
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      </>
    )
  }

  return (
    <>
      <AdminHeader title="Logs de Erro" subtitle="Monitoramento proprio de erros do sistema" />

      <div className="flex-1 overflow-auto p-6">
        {/* Resumo */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {(['error', 'warning', 'info'] as const).map((lvl) => {
            const cfg = levelConfig[lvl]
            const Icon = cfg.icon
            return (
              <button
                key={lvl}
                type="button"
                onClick={() => setFilterLevel(filterLevel === lvl ? 'all' : lvl)}
                className={cn(
                  'flex items-center gap-3 p-4 rounded-xl border bg-card text-left transition-all hover:ring-1',
                  filterLevel === lvl ? 'ring-2 ring-offset-1' : 'ring-0',
                  lvl === 'error' && 'hover:ring-red-500/40 ring-red-500/60',
                  lvl === 'warning' && 'hover:ring-amber-500/40 ring-amber-500/60',
                  lvl === 'info' && 'hover:ring-blue-500/40 ring-blue-500/60',
                )}
              >
                <div className={cn('p-2 rounded-lg', cfg.badge)}>
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{counts[lvl]}</p>
                  <p className="text-xs text-muted-foreground">{cfg.label}s</p>
                </div>
              </button>
            )
          })}
        </div>

        {/* Filtros */}
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por mensagem ou tela..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <button
            type="button"
            onClick={fetchLogs}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-card text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Atualizar
          </button>
          <span className="text-xs text-muted-foreground ml-auto">
            {filtered.length} de {logs.length} registros
          </span>
        </div>

        {/* Tabela */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
            <ServerCrash className="w-12 h-12 mb-3 opacity-20" />
            <p className="text-sm font-medium">Nenhum log encontrado</p>
            <p className="text-xs mt-1">Os erros do sistema aparecerão aqui em tempo real</p>
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
                    'w-full text-left p-4 rounded-xl border bg-card border-l-4 transition-all hover:bg-secondary/50',
                    cfg.row
                  )}
                >
                  <div className="flex items-start gap-3">
                    <Icon className={cn('w-4 h-4 mt-0.5 shrink-0',
                      log.level === 'error' && 'text-red-500',
                      log.level === 'warning' && 'text-amber-500',
                      log.level === 'info' && 'text-blue-500',
                    )} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Badge className={cn('text-[10px] font-bold border', cfg.badge)}>
                          {cfg.label}
                        </Badge>
                        {log.context && (
                          <span className="text-[11px] text-muted-foreground font-mono bg-secondary px-1.5 py-0.5 rounded">
                            {log.context}
                          </span>
                        )}
                        <span className="text-[11px] text-muted-foreground ml-auto">
                          {new Date(log.created_at).toLocaleString('pt-BR')}
                        </span>
                      </div>
                      <p className="text-sm text-foreground font-medium truncate">{log.message}</p>

                      {isExpanded && (
                        <div className="mt-3 space-y-2">
                          {log.stack && (
                            <pre className="text-[11px] text-muted-foreground bg-secondary/70 rounded-lg p-3 overflow-auto max-h-40 whitespace-pre-wrap font-mono leading-relaxed">
                              {log.stack}
                            </pre>
                          )}
                          {log.metadata && Object.keys(log.metadata).length > 0 && (
                            <pre className="text-[11px] text-muted-foreground bg-secondary/70 rounded-lg p-3 overflow-auto font-mono">
                              {JSON.stringify(log.metadata, null, 2)}
                            </pre>
                          )}
                          {log.user_id && (
                            <p className="text-[11px] text-muted-foreground">
                              <span className="font-semibold">User ID:</span> {log.user_id}
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
