import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  // Create default response
  const defaultResponse = NextResponse.next({ request })

  try {
    // Safely extract environment variables
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    // Return early if environment variables are not available
    if (!url || !key) {
      return defaultResponse
    }

    // Initialize Supabase client with environment variables
    const supabase = createServerClient(url, key, {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          const response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    })

    // Refresh session if it exists
    const {
      data: { user },
    } = await supabase.auth.getUser()

    // Protected routes - require authentication
    const protectedPaths = ['/uppi']
    const isProtectedRoute = protectedPaths.some((path) =>
      request.nextUrl.pathname.startsWith(path)
    )

    if (isProtectedRoute && !user) {
      const url = request.nextUrl.clone()
      url.pathname = '/onboarding/splash'
      return NextResponse.redirect(url)
    }

    // Auth routes - redirect to home if already logged in
    const authPaths = ['/auth/login', '/auth/signup']
    const isAuthRoute = authPaths.some((path) =>
      request.nextUrl.pathname.startsWith(path)
    )

    if (isAuthRoute && user) {
      const url = request.nextUrl.clone()
      url.pathname = '/uppi/home'
      return NextResponse.redirect(url)
    }

    return defaultResponse
  } catch {
    return defaultResponse
  }
}
