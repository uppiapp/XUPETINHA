'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AdminHeader } from '@/components/admin/admin-header'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Search, MessageSquare, User, Car, Trash2, Eye, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Message {
  id: string
  ride_id: string
  sender_id: string
  message: string
  created_at: string
  sender?: { full_name: string; user_type: string } | null
}

interface Conversation {
  ride_id: string
  last_message: string
  last_at: string
  message_count: number
  passenger_name: string
  driver_name: string
  messages: Message[]
}

export default function AdminMessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const fetchMessages = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('messages')
      .select('*, sender:profiles!messages_sender_id_fkey(full_name, user_type)')
      .order('created_at', { ascending: false })
      .limit(500)

    if (!data) { setLoading(false); return }

    // Group by ride_id
    const grouped: Record<string, Message[]> = {}
    for (const msg of data) {
      if (!grouped[msg.ride_id]) grouped[msg.ride_id] = []
      grouped[msg.ride_id].push(msg)
    }

    // For each group, fetch ride participants
    const rideIds = Object.keys(grouped)
    const { data: rides } = await supabase
      .from('rides')
      .select('id, passenger:profiles!rides_passenger_id_fkey(full_name), driver:profiles!rides_driver_id_fkey(full_name)')
      .in('id', rideIds)

    const rideMap: Record<string, { passenger_name: string; driver_name: string }> = {}
    for (const r of rides || []) {
      rideMap[r.id] = {
        passenger_name: (r.passenger as any)?.full_name || 'Passageiro',
        driver_name: (r.driver as any)?.full_name || 'Motorista',
      }
    }

    const convs: Conversation[] = rideIds.map((rideId) => {
      const msgs = grouped[rideId].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      return {
        ride_id: rideId,
        last_message: msgs[msgs.length - 1]?.message || '',
        last_at: msgs[msgs.length - 1]?.created_at || '',
        message_count: msgs.length,
        passenger_name: rideMap[rideId]?.passenger_name || 'Passageiro',
        driver_name: rideMap[rideId]?.driver_name || 'Motorista',
        messages: msgs,
      }
    }).sort((a, b) => new Date(b.last_at).getTime() - new Date(a.last_at).getTime())

    setConversations(convs)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchMessages()
    const supabase = createClient()
    const channel = supabase
      .channel('admin-messages-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => fetchMessages())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetchMessages])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [selected, conversations])

  const deleteMessage = async (msgId: string) => {
    setDeleting(msgId)
    const supabase = createClient()
    await supabase.from('messages').delete().eq('id', msgId)
    await fetchMessages()
    setDeleting(null)
  }

  const filtered = conversations.filter((c) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      c.passenger_name.toLowerCase().includes(q) ||
      c.driver_name.toLowerCase().includes(q) ||
      c.ride_id.includes(q) ||
      c.last_message.toLowerCase().includes(q)
    )
  })

  const selectedConv = conversations.find((c) => c.ride_id === selected)

  if (loading) {
    return (
      <>
        <AdminHeader title="Mensagens" subtitle="Carregando..." />
        <div className="flex-1 flex items-center justify-center bg-[hsl(var(--admin-bg))]">
          <div className="w-6 h-6 border-2 border-[hsl(var(--admin-green))] border-t-transparent rounded-full animate-spin" />
        </div>
      </>
    )
  }

  return (
    <>
      <AdminHeader
        title="Mensagens"
        subtitle={`${conversations.length} conversas · ${conversations.reduce((s, c) => s + c.message_count, 0)} mensagens`}
      />
      <div className="flex-1 overflow-hidden flex bg-[hsl(var(--admin-bg))]">
        {/* Left: conversation list */}
        <div className="w-[320px] shrink-0 flex flex-col border-r border-[hsl(var(--admin-border))]">
          <div className="p-3 border-b border-[hsl(var(--admin-border))]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
              <Input
                placeholder="Buscar conversa..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-9 rounded-xl bg-[hsl(var(--admin-surface))] border-[hsl(var(--admin-border))] text-slate-200 placeholder:text-slate-600 text-[12px]"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-slate-600">
                <MessageSquare className="w-8 h-8 mb-2 opacity-30" />
                <p className="text-[13px]">Nenhuma conversa</p>
              </div>
            )}
            {filtered.map((conv) => (
              <button
                key={conv.ride_id}
                type="button"
                onClick={() => setSelected(conv.ride_id === selected ? null : conv.ride_id)}
                className={cn(
                  'w-full text-left px-4 py-3 border-b border-[hsl(var(--admin-border))] transition-colors hover:bg-[hsl(var(--admin-surface))]/60',
                  selected === conv.ride_id && 'bg-[hsl(var(--admin-surface))] border-l-2 border-l-[hsl(var(--admin-green))]'
                )}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className="flex items-center gap-1 text-[11px] text-slate-300 font-semibold">
                    <User className="w-3 h-3 text-blue-400" />
                    <span className="truncate max-w-[80px]">{conv.passenger_name}</span>
                    <span className="text-slate-600 mx-1">+</span>
                    <Car className="w-3 h-3 text-emerald-400" />
                    <span className="truncate max-w-[80px]">{conv.driver_name}</span>
                  </div>
                  <Badge className="ml-auto bg-[hsl(var(--admin-surface))] text-slate-400 text-[10px] border border-[hsl(var(--admin-border))] px-1.5 py-0">
                    {conv.message_count}
                  </Badge>
                </div>
                <p className="text-[12px] text-slate-400 truncate">{conv.last_message}</p>
                <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-600">
                  <Clock className="w-3 h-3" />
                  {new Date(conv.last_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Right: messages */}
        <div className="flex-1 flex flex-col min-w-0">
          {!selectedConv ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-600">
              <MessageSquare className="w-12 h-12 mb-3 opacity-20" />
              <p className="text-[14px] font-medium">Selecione uma conversa</p>
              <p className="text-[12px] mt-1 opacity-60">Clique em uma conversa para ver as mensagens</p>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="p-4 border-b border-[hsl(var(--admin-border))] bg-[hsl(var(--admin-surface))]/40 flex items-center gap-3 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-blue-500/15 flex items-center justify-center">
                    <User className="w-4 h-4 text-blue-400" />
                  </div>
                  <span className="text-[13px] font-semibold text-slate-200">{selectedConv.passenger_name}</span>
                </div>
                <span className="text-slate-600 text-sm">↔</span>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/15 flex items-center justify-center">
                    <Car className="w-4 h-4 text-emerald-400" />
                  </div>
                  <span className="text-[13px] font-semibold text-slate-200">{selectedConv.driver_name}</span>
                </div>
                <div className="ml-auto flex items-center gap-2">
                  <span className="text-[11px] text-slate-500 font-mono truncate max-w-[200px]">
                    Corrida: {selectedConv.ride_id.slice(0, 8)}...
                  </span>
                  <Eye className="w-4 h-4 text-slate-500" />
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {selectedConv.messages.map((msg) => {
                  const isPassenger = (msg.sender as any)?.user_type === 'passenger'
                  return (
                    <div key={msg.id} className={cn('flex gap-3', isPassenger ? 'justify-start' : 'justify-end')}>
                      {isPassenger && (
                        <div className="w-7 h-7 rounded-full bg-blue-500/15 flex items-center justify-center shrink-0 mt-0.5">
                          <User className="w-3.5 h-3.5 text-blue-400" />
                        </div>
                      )}
                      <div className={cn(
                        'max-w-[65%] rounded-2xl px-3.5 py-2.5 group relative',
                        isPassenger
                          ? 'bg-[hsl(var(--admin-surface))] text-slate-200 rounded-tl-sm'
                          : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-200 rounded-tr-sm'
                      )}>
                        <div className="flex items-start gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-semibold mb-0.5 opacity-60">
                              {(msg.sender as any)?.full_name || 'Desconhecido'}
                            </p>
                            <p className="text-[13px] leading-relaxed break-words">{msg.message}</p>
                            <p className="text-[10px] opacity-40 mt-1 tabular-nums">
                              {new Date(msg.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => deleteMessage(msg.id)}
                            disabled={deleting === msg.id}
                            className="opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 rounded-lg bg-red-500/10 hover:bg-red-500/20 flex items-center justify-center shrink-0 mt-0.5"
                            title="Deletar mensagem"
                          >
                            {deleting === msg.id
                              ? <div className="w-3 h-3 border border-red-400 border-t-transparent rounded-full animate-spin" />
                              : <Trash2 className="w-3 h-3 text-red-400" />}
                          </button>
                        </div>
                      </div>
                      {!isPassenger && (
                        <div className="w-7 h-7 rounded-full bg-emerald-500/15 flex items-center justify-center shrink-0 mt-0.5">
                          <Car className="w-3.5 h-3.5 text-emerald-400" />
                        </div>
                      )}
                    </div>
                  )
                })}
                <div ref={messagesEndRef} />
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}
