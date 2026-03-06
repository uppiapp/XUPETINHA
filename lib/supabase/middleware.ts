import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    return supabaseResponse
  }

  // Do NOT put code between createServerClient and supabase.auth.getUser()
  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        )
        supabaseResponse = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        )
      },
    },
  })

  // IMPORTANT: Do not run code between createServerClient and getUser()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Public admin routes — never redirect these (avoid infinite loop)
  const adminPublicPaths = ['/admin/login', '/admin/forgot-password']
  const isAdminPublicRoute = adminPublicPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  )

  // Protected routes - require real authentication
  const protectedPaths = ['/uppi', '/admin']
  const isProtectedRoute =
    !isAdminPublicRoute &&
    protectedPaths.some((path) =>
      request.nextUrl.pathname.startsWith(path)
    )

  if (isProtectedRoute && !user) {
    // /admin (exceto /admin/login) redireciona para a tela de login admin
    if (request.nextUrl.pathname.startsWith('/admin')) {
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = '/admin/login'
      const redirectResponse = NextResponse.redirect(redirectUrl)
      supabaseResponse.cookies.getAll().forEach(({ name, value }) => {
        redirectResponse.cookies.set(name, value)
      })
      return redirectResponse
    }

    // /uppi requires a real authenticated session — cookie bypass removed
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/onboarding/splash'
    const redirectResponse = NextResponse.redirect(redirectUrl)
    supabaseResponse.cookies.getAll().forEach(({ name, value }) => {
      redirectResponse.cookies.set(name, value)
    })
    return redirectResponse
  }

  // Auth routes - redirect to home if already logged in
  const authPaths = ['/auth/login', '/auth/signup']
  const isAuthRoute = authPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  )

  if (isAuthRoute && user) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/uppi/home'
    const redirectResponse = NextResponse.redirect(redirectUrl)
    supabaseResponse.cookies.getAll().forEach(({ name, value }) => {
      redirectResponse.cookies.set(name, value)
    })
    return redirectResponse
  }

  // IMPORTANT: return supabaseResponse to preserve cookies correctly
  return supabaseResponse
}
