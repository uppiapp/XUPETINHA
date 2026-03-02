import { NextRequest, NextResponse } from 'next/server'

const PARADISE_API_KEY = process.env.PARADISE_API_KEY || ''
const PARADISE_PRODUCT_HASH = process.env.PARADISE_PRODUCT_HASH || ''

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const hash = searchParams.get('hash')

  if (!hash) {
    return NextResponse.json({ error: 'hash is required' }, { status: 400 })
  }

  try {
    const res = await fetch(
      `https://multi.paradisepags.com/api/v1/transaction.php?hash=${encodeURIComponent(hash)}&product_hash=${encodeURIComponent(PARADISE_PRODUCT_HASH)}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': PARADISE_API_KEY,
        },
        cache: 'no-store',
      }
    )

    const data = await res.json()

    if (!res.ok) {
      return NextResponse.json({ error: data.message || 'Erro ao consultar status' }, { status: res.status })
    }

    // Normalize status to common format
    const rawStatus = data?.data?.status ?? data?.status ?? 'pending'
    const normalizedStatus =
      rawStatus === 'paid' || rawStatus === 'approved' || rawStatus === 'PAID' || rawStatus === 'APPROVED'
        ? 'paid'
        : rawStatus === 'failed' || rawStatus === 'cancelled' || rawStatus === 'CANCELLED'
        ? 'failed'
        : 'pending'

    return NextResponse.json({
      status: normalizedStatus,
      raw_status: rawStatus,
      redirect_url: data?.data?.redirect_url ?? null,
      transaction_id: data?.data?.transaction_id ?? hash,
    })
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno ao consultar status' }, { status: 500 })
  }
}
