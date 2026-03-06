import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const origin = requestUrl.origin

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error && data.user) {
      // Check if user already has a profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, user_type')
        .eq('id', data.user.id)
        .single()

      const roleFromMeta = data.user.user_metadata?.role as string | undefined

      if (!profile) {
        // Create profile respecting the role chosen at signup
        const userType = roleFromMeta === 'driver' ? 'driver' : 'passenger'
        await supabase
          .from('profiles')
          .insert({
            id: data.user.id,
            email: data.user.email,
            full_name: data.user.user_metadata?.full_name || data.user.user_metadata?.name,
            avatar_url: data.user.user_metadata?.avatar_url || data.user.user_metadata?.picture,
            user_type: userType,
            created_at: new Date().toISOString(),
          })

        if (userType === 'driver') {
          return NextResponse.redirect(`${origin}/uppi/driver/register`)
        }
        return NextResponse.redirect(`${origin}/uppi/home`)
      }

      // Existing user — redirect based on profile type
      if (profile.user_type === 'driver') {
        return NextResponse.redirect(`${origin}/driver/home`)
      }
      return NextResponse.redirect(`${origin}/uppi/home`)
    }
  }

  // Return the user to login page with error
  return NextResponse.redirect(`${origin}/auth/login?error=callback`)
}
