import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET - Retorna transações e saldo da carteira
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Buscar transações
    const { data: transactions, error } = await supabase
      .from('wallet_transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) throw error

    // Calcular saldo atual via função SQL
    const { data: balanceData } = await supabase
      .rpc('calculate_wallet_balance', { p_user_id: user.id })

    const balance = balanceData ?? 0

    return NextResponse.json({
      success: true,
      transactions: transactions || [],
      balance,
    })
  } catch (error) {
    console.error('[v0] Error fetching transactions:', error)
    return NextResponse.json({ error: 'Erro ao buscar transações' }, { status: 500 })
  }
}

// POST - Adiciona transação na carteira
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { amount, type, description, reference_id, reference_type } = body

    if (!amount || Number(amount) <= 0) {
      return NextResponse.json({ error: 'Valor inválido' }, { status: 400 })
    }

    const validTypes = ['credit', 'debit', 'withdrawal', 'refund', 'bonus']
    if (!type || !validTypes.includes(type)) {
      return NextResponse.json({ error: 'Tipo inválido. Use: credit, debit, withdrawal, refund, bonus' }, { status: 400 })
    }

    // Calcular saldo atual
    const { data: currentBalance } = await supabase
      .rpc('calculate_wallet_balance', { p_user_id: user.id })

    const balanceBefore = currentBalance ?? 0
    const delta = ['credit', 'refund', 'bonus'].includes(type) ? Number(amount) : -Number(amount)
    const balanceAfter = balanceBefore + delta

    if (balanceAfter < 0) {
      return NextResponse.json({ error: 'Saldo insuficiente' }, { status: 400 })
    }

    // Criar transação
    const { data: transaction, error } = await supabase
      .from('wallet_transactions')
      .insert({
        user_id: user.id,
        amount: Number(amount),
        type,
        balance_after: balanceAfter,
        description: description || `Transação ${type}`,
        reference_id: reference_id || null,
        reference_type: reference_type || null,
        status: 'completed',
        metadata: {},
      })
      .select()
      .single()

    if (error) throw error

    // Atualizar saldo na tabela user_wallets
    await supabase
      .from('user_wallets')
      .upsert({
        user_id: user.id,
        balance: balanceAfter,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })

    // Notificação
    await supabase.from('notifications').insert({
      user_id: user.id,
      type: 'system',
      title: delta > 0 ? 'Crédito adicionado' : 'Débito realizado',
      body: `R$ ${Math.abs(Number(amount)).toFixed(2)} ${delta > 0 ? 'adicionado à' : 'debitado da'} sua carteira`,
      data: { transaction_id: transaction.id },
      is_read: false,
    })

    return NextResponse.json({
      success: true,
      transaction,
      new_balance: balanceAfter,
    })
  } catch (error) {
    console.error('[v0] Error creating transaction:', error)
    return NextResponse.json({ error: 'Erro ao processar transação' }, { status: 500 })
  }
}
