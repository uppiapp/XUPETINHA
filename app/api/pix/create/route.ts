import { NextRequest, NextResponse } from 'next/server'

const PARADISE_API_KEY = process.env.PARADISE_API_KEY || ''
const PARADISE_PRODUCT_HASH = process.env.PARADISE_PRODUCT_HASH || ''

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { amount, description } = body

    if (!amount || typeof amount !== 'number') {
      return NextResponse.json({ error: 'amount (em centavos) é obrigatório' }, { status: 400 })
    }

    const res = await fetch('https://multi.paradisepags.com/api/v1/transaction.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': PARADISE_API_KEY,
      },
      body: JSON.stringify({
        product_hash: PARADISE_PRODUCT_HASH,
        amount,
        payment_method: 'pix',
        description: description || 'Corrida Xupetinha',
      }),
    })

    const data = await res.json()

    if (!res.ok || data.error) {
      return NextResponse.json(
        { error: data.message || data.error || 'Erro ao criar cobrança PIX' },
        { status: res.status || 500 }
      )
    }

    const txData = data?.data ?? data

    return NextResponse.json({
      external_id: txData.hash ?? txData.external_id ?? txData.transaction_id ?? String(amount),
      transaction_id: txData.transaction_id ?? txData.id,
      qr_code: txData.pix_qr_code ?? txData.qr_code ?? txData.qr_code_text ?? '',
      qr_code_base64: txData.pix_qr_code_base64 ?? txData.qr_code_base64 ?? null,
      expires_at: txData.expires_at ?? txData.expiration ?? null,
    })
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno ao criar PIX' }, { status: 500 })
  }
}
