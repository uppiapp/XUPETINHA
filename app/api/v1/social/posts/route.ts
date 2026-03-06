import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { apiLimiter, rateLimitResponse } from '@/lib/utils/rate-limit'

export async function GET(request: Request) {
  try {
    const rlResult = apiLimiter.check(request, 30)
    if (!rlResult.success) return rateLimitResponse(rlResult)

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const limit = Number.parseInt(searchParams.get('limit') || '20', 10)
    const offset = Number.parseInt(searchParams.get('offset') || '0', 10)

    const { data, error } = await supabase.rpc('get_social_feed', {
      p_user_id: user.id,
      p_limit: limit,
      p_offset: offset
    })

    if (error) throw error

    return NextResponse.json({ posts: data })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch feed' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const rlResult = apiLimiter.check(request, 10)
    if (!rlResult.success) return rateLimitResponse(rlResult)

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { type, title, description, metadata, visibility } = body

    if (!type || !title) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('social_posts')
      .insert({
        user_id: user.id,
        type,
        title,
        description,
        metadata: metadata || {},
        visibility: visibility || 'public'
      })
      .select()
      .single()

    if (error) throw error

    // Update user stats
    await supabase.rpc('increment', {
      table_name: 'user_social_stats',
      column_name: 'posts_count',
      row_id: user.id
    })

    return NextResponse.json({ post: data })
  } catch {
    return NextResponse.json({ error: 'Failed to create post' }, { status: 500 })
  }
}
