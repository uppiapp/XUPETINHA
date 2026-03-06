/**
 * Serviço base para interações com Supabase
 * Use este template para criar novos serviços
 */

import { createClient } from './server'

/**
 * Classe base para serviços Supabase
 */
export class SupabaseService {
  protected tableName: string

  constructor(tableName: string) {
    this.tableName = tableName
  }

  /**
   * Buscar todos os registros
   */
  async getAll(options?: { limit?: number; offset?: number }) {
    const client = await createClient()
    let query = client.from(this.tableName).select('*')

    if (options?.limit) {
      query = query.limit(options.limit)
    }
    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1)
    }

    return query
  }

  /**
   * Buscar um registro por ID
   */
  async getById(id: string) {
    const client = await createClient()
    return client
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .single()
  }

  /**
   * Buscar registros com filtro
   */
  async filter(column: string, value: any) {
    const client = await createClient()
    return client
      .from(this.tableName)
      .select('*')
      .eq(column, value)
  }

  /**
   * Criar novo registro
   */
  async create(data: any) {
    const client = await createClient()
    return client
      .from(this.tableName)
      .insert([data])
      .select()
  }

  /**
   * Atualizar registro
   */
  async update(id: string, data: any) {
    const client = await createClient()
    return client
      .from(this.tableName)
      .update(data)
      .eq('id', id)
      .select()
  }

  /**
   * Deletar registro
   */
  async delete(id: string) {
    const client = await createClient()
    return client
      .from(this.tableName)
      .delete()
      .eq('id', id)
  }

  /**
   * Contar registros
   */
  async count() {
    const client = await createClient()
    return client
      .from(this.tableName)
      .select('*', { count: 'exact', head: true })
  }
}

/**
 * Exemplo: Serviço de Rides
 */
export class RidesService extends SupabaseService {
  constructor() {
    super('rides')
  }

  /**
   * Buscar corridas do usuário
   */
  async getUserRides(userId: string) {
    const client = await createClient()
    return client
      .from('rides')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
  }

  /**
   * Buscar corridas ativas
   */
  async getActiveRides() {
    const client = await createClient()
    return client
      .from('rides')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
  }

  /**
   * Buscar corridas por status
   */
  async getRidesByStatus(status: string) {
    const client = await createClient()
    return client
      .from('rides')
      .select('*')
      .eq('status', status)
  }
}

/**
 * Exemplo: Serviço de Usuários/Profiles
 */
export class ProfilesService extends SupabaseService {
  constructor() {
    super('profiles')
  }

  /**
   * Buscar perfil do usuário
   */
  async getProfile(userId: string) {
    return this.getById(userId)
  }

  /**
   * Atualizar perfil
   */
  async updateProfile(userId: string, data: any) {
    return this.update(userId, data)
  }

  /**
   * Buscar motoristas
   */
  async getDrivers() {
    const client = await createClient()
    return client
      .from('profiles')
      .select('*')
      .eq('role', 'driver')
  }
}

/**
 * Exemplo: Serviço de Mensagens
 */
export class MessagesService extends SupabaseService {
  constructor() {
    super('messages')
  }

  /**
   * Buscar conversa entre dois usuários
   */
  async getConversation(userId1: string, userId2: string) {
    const client = await createClient()
    return client
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${userId1},receiver_id.eq.${userId2}),and(sender_id.eq.${userId2},receiver_id.eq.${userId1})`)
      .order('created_at', { ascending: true })
  }

  /**
   * Enviar mensagem
   */
  async sendMessage(senderId: string, receiverId: string, content: string) {
    return this.create({
      sender_id: senderId,
      receiver_id: receiverId,
      content,
    })
  }
}

/**
 * Exemplo de uso:
 * 
 * // Em um Server Component ou Route Handler
 * import { RidesService } from '@/lib/supabase/services'
 * 
 * const ridesService = new RidesService()
 * const rides = await ridesService.getUserRides('user-id-123')
 * console.log(rides)
 */
