import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { apiLimiter, rateLimitResponse } from '@/lib/utils/rate-limit'

export async function GET(request: Request) {
  try {
    // Rate limit: 20 reads per minute
    const rlResult = apiLimiter.check(request, 20)
    if (!rlResult.success) return rateLimitResponse(rlResult)

    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category') || 'total_rides'
    const limit = parseInt(searchParams.get('limit') || '100', 10)

    // Get leaderboard data
    const { data: leaderboard, error } = await supabase.rpc('get_leaderboard', {
      limit_count: limit,
      category,
    })

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 })
    }

    // Get current user's rank
    const userRank = leaderboard?.find((entry: any) => entry.id === user.id)

    return NextResponse.json({
      leaderboard: leaderboard || [],
      userRank: userRank || null,
      category,
    })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
