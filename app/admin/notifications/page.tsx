'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AdminHeader } from '@/components/admin/admin-header'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Search, Send, Users, Car, Bell, CheckCircle, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Profile {
  id: string
  full_name: string
  phone: string
  avatar_url: string | null
  user_type: string
}

type Target = 'user' | 'all_passengers' | 'all_drivers' | 'everyone'

const TARGETS = [
  { key: 'user' as Target,           icon: Search,  label: 'Usuário específico',  desc: 'Escolha uma pessoa' },
  { key: 'all_passengers' as Target, icon: Users,   label: 'Todos passageiros',   desc: 'Envia para todos' },
  { key: 'all_drivers' as Target,    icon: Car,     label: 'Todos motoristas',    desc: 'Envia para todos' },
  { key: 'everyone' as Target,       icon: Bell,    label: 'Broadcast geral',     desc: 'Toda a plataforma' },
]

const TEMPLATES = [
  { label: 'Motorista chegou',     title: 'Motorista chegou!',          body: 'Seu motorista está esperando no local.' },
  { label: 'Corrida aceita',       title: 'Corrida aceita!',            body: 'Um motorista aceitou sua corrida e está a caminho.' },
  { label: 'Promoção',             title: 'Promoção especial!',         body: 'Use o cupom UPPI10 e ganhe R$ 10 de desconto na próxima corrida.' },
  { label: 'Manutenção',           title: 'Aviso de manutenção',        body: 'O sistema ficará em manutenção das 02h às 04h. Obrigado pela compreensão.' },
  { label: 'Boas-vindas',          title: 'Bem-vindo à Uppi!',         body: 'Sua conta foi criada com sucesso. Aproveite nossas corridas!' },
]

export default function AdminNotificationsPage() {
  const [target, setTarget]         = useState<Target>('user')
  const [search, setSearch]         = useState('')
  const [users, setUsers]           = useState<Profile[]>([])
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null)
  const [title, setTitle]           = useState('')
  const [body, setBody]             = useState('')
  const [sending, setSending]       = useState(false)
  const [result, setResult]         = useState<{ ok: boolean; msg: string } | null>(null)
  const [history, setHistory]       = useState<{ title: string; target: string; at: string }[]>([])

  const fetchUsers = useCallback(async () => {
    if (search.length < 2) { setUsers([]); return }
    const supabase = createClient()
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, phone, avatar_url, user_type')
      .or(`full_name.ilike.%${search}%,phone.ilike.%${search}%`)
      .limit(10)
    setUsers(data || [])
  }, [search])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  const applyTemplate = (t: typeof TEMPLATES[0]) => {
    setTitle(t.title)
    setBody(t.body)
    setResult(null)
  }

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) return
    if (target === 'user' && !selectedUser) return

    setSending(true)
    setResult(null)

    try {
      if (target === 'user' && selectedUser) {
        // Envia para usuário específico
        const res = await fetch('/api/v1/push/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: selectedUser.id, title, body }),
        })
        const json = await res.json()
        setResult({ ok: res.ok, msg: res.ok ? `Enviado para ${selectedUser.full_name} (${json.sent ?? 0} dispositivo(s))` : json.error })
      } else {
        // Broadcast
        const res = await fetch('/api/v1/push/broadcast', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ target, title, body }),
        })
        const json = await res.json()
        setResult({ ok: res.ok, msg: res.ok ? `Enviado para ${json.sent ?? 0} dispositivo(s)` : json.error })
      }

      if (result?.ok !== false) {
        const targetLabel = TARGETS.find(t => t.key === target)?.label ?? target
        setHistory(prev => [{ title, target: targetLabel, at: new Date().toLocaleTimeString('pt-BR') }, ...prev.slice(0, 9)])
        setTitle('')
        setBody('')
      }
    } catch {
      setResult({ ok: false, msg: 'Erro de conexão' })
    } finally {
      setSending(false)
    }
  }

  const canSend = title.trim() && body.trim() && (target !== 'user' || selectedUser) && !sending

  return (
    <>
      <AdminHeader title="Notificacoes Push" subtitle="Envie mensagens para usuarios da plataforma" />
      <div className="flex-1 overflow-y-auto bg-[hsl(var(--admin-bg))] p-5">
        <div className="max-w-4xl mx-auto space-y-4">

          {/* Destino */}
          <div className="bg-[hsl(var(--admin-surface))] rounded-xl border border-[hsl(var(--admin-border))] overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[hsl(var(--admin-border))]">
              <h3 className="text-[13px] font-bold text-slate-200">1. Quem vai receber?</h3>
            </div>
            <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
              {TARGETS.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => { setTarget(t.key); setSelectedUser(null); setResult(null) }}
                  className={cn(
                    'flex flex-col items-start gap-2 p-3 rounded-xl border text-left transition-all',
                    target === t.key
                      ? 'border-[hsl(var(--admin-green))]/40 bg-[hsl(var(--admin-green))]/10 text-[hsl(var(--admin-green))]'
                      : 'border-[hsl(var(--admin-border))] bg-[hsl(var(--admin-bg))] hover:border-[hsl(var(--admin-border))]/80 text-slate-400 hover:text-slate-200'
                  )}
                >
                  <t.icon className="w-5 h-5" />
                  <div>
                    <p className="text-[12px] font-semibold leading-tight">{t.label}</p>
                    <p className="text-[10px] opacity-70 mt-0.5">{t.desc}</p>
                  </div>
                </button>
              ))}
            </div>

            {target === 'user' && (
              <div className="px-4 pb-4 space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <Input
                    placeholder="Buscar por nome ou telefone..."
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setSelectedUser(null) }}
                    className="pl-9 h-10 bg-[hsl(var(--admin-bg))] border-[hsl(var(--admin-border))] text-slate-200 rounded-xl placeholder:text-slate-600 text-[13px]"
                  />
                </div>
                {users.length > 0 && !selectedUser && (
                  <div className="border border-[hsl(var(--admin-border))] rounded-xl overflow-hidden divide-y divide-[hsl(var(--admin-border))]">
                    {users.map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => { setSelectedUser(u); setUsers([]); setSearch(u.full_name) }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[hsl(var(--admin-surface))] transition-colors text-left"
                      >
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={u.avatar_url || undefined} />
                          <AvatarFallback className="text-xs bg-blue-500/15 text-blue-400 font-bold">
                            {u.full_name?.charAt(0) || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-[13px] font-semibold text-slate-200">{u.full_name}</p>
                          <p className="text-[11px] text-slate-500">{u.user_type === 'driver' ? 'Motorista' : 'Passageiro'} · {u.phone}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {selectedUser && (
                  <div className="flex items-center gap-3 px-4 py-2.5 bg-blue-500/10 rounded-xl border border-blue-500/30">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={selectedUser.avatar_url || undefined} />
                      <AvatarFallback className="text-xs bg-blue-500 text-white font-bold">
                        {selectedUser.full_name?.charAt(0) || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-[13px] font-semibold text-slate-200">{selectedUser.full_name}</p>
                      <p className="text-[11px] text-slate-500">{selectedUser.user_type === 'driver' ? 'Motorista' : 'Passageiro'}</p>
                    </div>
                    <button type="button" onClick={() => { setSelectedUser(null); setSearch('') }} className="text-[11px] text-slate-400 hover:text-slate-200 transition-colors">
                      Trocar
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Mensagem */}
          <div className="bg-[hsl(var(--admin-surface))] rounded-xl border border-[hsl(var(--admin-border))] overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[hsl(var(--admin-border))]">
              <h3 className="text-[13px] font-bold text-slate-200">2. Mensagem</h3>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <p className="text-[11px] text-slate-500 font-medium mb-2 uppercase tracking-wide">Templates rapidos</p>
                <div className="flex flex-wrap gap-2">
                  {TEMPLATES.map((t) => (
                    <button
                      key={t.label}
                      type="button"
                      onClick={() => applyTemplate(t)}
                      className="px-3 py-1.5 rounded-lg bg-[hsl(var(--admin-bg))] border border-[hsl(var(--admin-border))] hover:border-[hsl(var(--admin-green))]/40 text-[12px] font-medium text-slate-300 hover:text-slate-100 transition-colors"
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-[11px] text-slate-500 font-medium mb-1.5 block uppercase tracking-wide">Titulo</label>
                  <Input
                    placeholder="Ex: Motorista chegou!"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    maxLength={80}
                    className="h-10 bg-[hsl(var(--admin-bg))] border-[hsl(var(--admin-border))] text-slate-200 rounded-xl placeholder:text-slate-600 text-[13px]"
                  />
                  <p className="text-[10px] text-slate-600 mt-1 text-right">{title.length}/80</p>
                </div>
                <div>
                  <label className="text-[11px] text-slate-500 font-medium mb-1.5 block uppercase tracking-wide">Corpo da mensagem</label>
                  <Textarea
                    placeholder="Ex: Seu motorista esta esperando no local."
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    maxLength={200}
                    rows={3}
                    className="bg-[hsl(var(--admin-bg))] border-[hsl(var(--admin-border))] text-slate-200 rounded-xl placeholder:text-slate-600 text-[13px] resize-none"
                  />
                  <p className="text-[10px] text-slate-600 mt-1 text-right">{body.length}/200</p>
                </div>
              </div>

              {(title || body) && (
                <div className="bg-[hsl(var(--admin-bg))] rounded-xl p-4 border border-[hsl(var(--admin-border))]">
                  <p className="text-[10px] text-slate-500 font-medium mb-2 uppercase tracking-wide">Preview</p>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shrink-0">
                      <Bell className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-[14px] font-bold text-slate-100 leading-tight">{title || 'Titulo...'}</p>
                      <p className="text-[12px] text-slate-400 mt-0.5 leading-relaxed">{body || 'Mensagem...'}</p>
                      <p className="text-[10px] text-slate-600 mt-1">Xupetinha · agora</p>
                    </div>
                  </div>
                </div>
              )}

              {result && (
                <div className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-xl text-[13px] font-medium',
                  result.ok ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                )}>
                  {result.ok ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                  {result.msg}
                </div>
              )}

              <button
                type="button"
                onClick={handleSend}
                disabled={!canSend}
                className={cn(
                  'w-full h-11 rounded-xl text-[14px] font-bold flex items-center justify-center gap-2 transition-all',
                  canSend
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-[hsl(var(--admin-bg))] border border-[hsl(var(--admin-border))] text-slate-600 cursor-not-allowed'
                )}
              >
                {sending ? (
                  <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Enviando...</>
                ) : (
                  <><Send className="w-4 h-4" /> Enviar Notificacao</>
                )}
              </button>
            </div>
          </div>

          {history.length > 0 && (
            <div className="bg-[hsl(var(--admin-surface))] rounded-xl border border-[hsl(var(--admin-border))] overflow-hidden">
              <div className="px-5 py-3.5 border-b border-[hsl(var(--admin-border))]">
                <h3 className="text-[13px] font-bold text-slate-200">Enviados nesta sessao</h3>
              </div>
              <div className="p-4 space-y-2">
                {history.map((h, i) => (
                  <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[hsl(var(--admin-bg))] border border-[hsl(var(--admin-border))]">
                    <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-semibold text-slate-200 truncate">{h.title}</p>
                      <p className="text-[10px] text-slate-500">{h.target} · {h.at}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
