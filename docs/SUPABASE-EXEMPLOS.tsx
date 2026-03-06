/**
 * Exemplo de integração Supabase em um componente
 * Este arquivo demonstra como usar o Supabase no projeto
 */

import { createClient } from '@/lib/supabase/server'

/**
 * Exemplo 1: Buscar dados no servidor
 */
export async function ExampleServerComponent() {
  const client = await createClient()

  const { data: rides, error } = await client
    .from('rides')
    .select('*')
    .limit(5)

  if (error) {
    return <div>Erro ao carregar corridas</div>
  }

  return (
    <div>
      <h1>Últimas corridas</h1>
      <pre>{JSON.stringify(rides, null, 2)}</pre>
    </div>
  )
}

/**
 * Exemplo 2: API Route para criar dados
 */
export async function exampleAPIRoute() {
  return async function POST(request: Request) {
    const client = await createClient()
    const body = await request.json()

    const { data, error } = await client
      .from('rides')
      .insert([body])
      .select()

    if (error) {
      return Response.json({ error: error.message }, { status: 400 })
    }

    return Response.json(data)
  }
}

/**
 * Exemplo 3: Componente cliente com autenticação
 */
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function ExampleClientComponent() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const client = createClient()

    client.auth.getUser().then(({ data }) => {
      setUser(data?.user || null)
      setLoading(false)
    })
  }, [])

  if (loading) return <div>Carregando...</div>
  if (!user) return <div>Não autenticado</div>

  return <div>Bem-vindo, {user.email}!</div>
}

/**
 * Exemplo 4: Usar Realtime
 */
'use client'

export function ExampleRealtimeComponent() {
  const [rides, setRides] = useState([])

  useEffect(() => {
    const client = createClient()

    // Subscribe a mudanças em tempo real
    const channel = client
      .channel('rides-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rides' },
        (payload) => {
          console.log('Nova mudança:', payload)
          if (payload.eventType === 'INSERT') {
            setRides((prev) => [payload.new, ...prev])
          }
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [])

  return (
    <div>
      <h1>Corridas em tempo real</h1>
      {rides.map((ride: any) => (
        <div key={ride.id}>{ride.id}</div>
      ))}
    </div>
  )
}
