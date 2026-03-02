'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { realtimeService } from '@/lib/services/realtime-service'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

interface Message {
  id: string
  ride_id: string
  sender_id: string
  message: string
  created_at: string
  sender_name?: string
}

export default function ChatPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [currentUserId, setCurrentUserId] = useState('')
  const [otherUserName, setOtherUserName] = useState('')

  useEffect(() => {
    loadChat()
    subscribeToMessages()
  }, [])

  const loadChat = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      setCurrentUserId(user.id)

      // Get ride details
      const { data: ride } = await supabase
        .from('rides')
        .select('*, passenger:profiles!passenger_id(full_name), driver:profiles!driver_id(full_name)')
        .eq('id', params.id)
        .single()

      if (ride) {
        const otherName = ride.passenger_id === user.id ? ride.driver?.full_name : ride.passenger?.full_name
        setOtherUserName(otherName || 'Usuário')
      }

      // Load messages
      const { data, error } = await supabase
        .from('messages')
        .select('*, sender:profiles!sender_id(full_name)')
        .eq('ride_id', params.id)
        .order('created_at', { ascending: true })

      if (error) throw error
      setMessages(data || [])
    } catch (error) {
      console.error('[v0] Error loading chat:', error)
    } finally {
      setLoading(false)
    }
  }

  const subscribeToMessages = () => {
    console.log('[v0] Setting up realtime subscription for chat')
    
    const channelId = realtimeService.subscribeToMessages(
      params.id as string,
      (payload) => {
        if (payload.eventType === 'INSERT') {
          console.log('[v0] New message received:', payload.new)
          setMessages(prev => [...prev, payload.new as Message])
        }
      }
    )

    return () => {
      console.log('[v0] Cleaning up chat subscription')
      realtimeService.unsubscribe(channelId)
    }
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || sending) return

    setSending(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Buscar o receiver_id da corrida
      const { data: rideData } = await supabase
        .from('rides')
        .select('passenger_id, driver_id')
        .eq('id', params.id)
        .single()
      const receiverId = rideData?.passenger_id === user.id ? rideData?.driver_id : rideData?.passenger_id

      const { error } = await supabase
        .from('messages')
        .insert({
          ride_id: params.id,
          sender_id: user.id,
          receiver_id: receiverId,
          content: newMessage.trim()
        })

      if (error) throw error
      setNewMessage('')
    } catch (error) {
      console.error('[v0] Error sending message:', error)
      iosToast.error('Erro ao enviar mensagem')
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-blue-200 px-4 py-3 flex items-center gap-3">
        <Button
          onClick={() => router.back()}
          variant="ghost"
          size="icon"
          className="text-blue-700"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Button>
        <div className="flex-1">
          <h1 className="font-bold text-blue-900">{otherUserName}</h1>
          <p className="text-xs text-blue-600">Chat da corrida</p>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <svg className="w-16 h-16 text-blue-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p className="text-blue-600">Nenhuma mensagem ainda</p>
            <p className="text-sm text-blue-500 mt-1">Inicie a conversa!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_id === currentUserId
            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] ${isMe ? 'bg-blue-600 text-white' : 'bg-white text-blue-900'} rounded-2xl px-4 py-2 shadow-sm`}>
                  <p className="text-sm">{msg.message}</p>
                  <p className={`text-xs mt-1 ${isMe ? 'text-blue-200' : 'text-blue-500'}`}>
                    {new Date(msg.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Input */}
      <div className="bg-white border-t border-blue-200 p-4">
        <div className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Digite sua mensagem..."
            className="flex-1"
            disabled={sending}
          />
          <Button
            onClick={sendMessage}
            disabled={!newMessage.trim() || sending}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {sending ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
