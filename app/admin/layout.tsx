'use client'

import React, { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { AdminSidebar } from '@/components/admin/admin-sidebar'
import { Shield } from 'lucide-react'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [checked, setChecked] = useState(false)
  const [authorized, setAuthorized] = useState(false)

  const isLoginPage = pathname === '/admin/login'

  useEffect(() => {
    if (isLoginPage) {
      setChecked(true)
      setAuthorized(false)
      return
    }

    const checkAdmin = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.replace('/admin/login')
        return
      }

      // Usar API Route com service_role para ignorar RLS
      try {
        const res = await fetch('/api/admin/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: user.id }),
        })
        const data = await res.json()

        if (!data.is_admin) {
          await supabase.auth.signOut()
          router.replace('/admin/login')
          return
        }
      } catch {
        router.replace('/admin/login')
        return
      }

      setAuthorized(true)
      setChecked(true)
    }

    checkAdmin()
  }, [isLoginPage, router])

  // Login page renders without sidebar
  if (isLoginPage) {
    return <>{children}</>
  }

  // Loading state
  if (!checked) {
    return (
      <div className="h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center mx-auto mb-4">
            <Shield className="w-7 h-7 text-white" />
          </div>
          <div className="w-8 h-8 border-[3px] border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-[14px] text-muted-foreground font-medium">Verificando acesso...</p>
        </div>
      </div>
    )
  }

  if (!authorized) return null

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <AdminSidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        {children}
      </main>
    </div>
  )
}
