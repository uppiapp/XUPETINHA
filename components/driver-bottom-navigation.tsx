'use client'

import { usePathname, useRouter } from 'next/navigation'
import { Home, Clock, Wallet, User } from 'lucide-react'
import { ExpandableTabs } from '@/components/ui/expandable-tabs'
import type { TabItem } from '@/components/ui/expandable-tabs'
import { triggerHaptic } from '@/hooks/use-haptic'

const tabs: TabItem[] = [
  { title: 'Início', icon: Home },
  { title: 'Histórico', icon: Clock },
  { type: 'separator' },
  { title: 'Carteira', icon: Wallet },
  { title: 'Perfil', icon: User },
]

const tabRoutes = [
  '/uppi/driver',
  '/uppi/driver/history',
  null,
  '/uppi/driver/wallet',
  '/uppi/driver/profile',
]

const driverRoutes = [
  '/uppi/driver',
  '/uppi/driver/history',
  '/uppi/driver/wallet',
  '/uppi/driver/profile',
  '/uppi/driver/earnings',
  '/uppi/driver/schedule',
  '/uppi/driver/settings',
]

function getActiveIndex(pathname: string | null): number | null {
  if (!pathname) return null
  for (let i = 0; i < tabRoutes.length; i++) {
    const route = tabRoutes[i]
    if (route && (pathname === route || pathname.startsWith(`${route}/`))) {
      return i
    }
  }
  return null
}

export function DriverBottomNavigation() {
  const pathname = usePathname()
  const router = useRouter()

  // Mostrar somente nas rotas do motorista
  const isDriverRoute = driverRoutes.some(r => pathname === r || pathname?.startsWith(`${r}/`))
  if (!isDriverRoute) return null

  const activeIndex = getActiveIndex(pathname)

  const handleChange = (index: number | null) => {
    if (index !== null && tabRoutes[index]) {
      triggerHaptic('selection')
      router.push(tabRoutes[index] as string)
    }
  }

  return (
    <nav
      aria-label="Navegação do motorista"
      role="navigation"
      className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pb-[max(env(safe-area-inset-bottom),0.75rem)] pointer-events-none"
    >
      <div className="pointer-events-auto">
        <ExpandableTabs
          tabs={tabs}
          activeIndex={activeIndex}
          activeColor="text-emerald-500"
          onChange={handleChange}
          className="border-[0.5px] border-black/[0.08] dark:border-white/[0.1] bg-white/80 dark:bg-black/80 ios-blur-heavy shadow-[0_0_0_0.5px_rgba(0,0,0,0.04),0_2px_16px_rgba(0,0,0,0.12),0_8px_32px_rgba(0,0,0,0.08)] dark:shadow-[0_0_0_0.5px_rgba(255,255,255,0.06),0_2px_20px_rgba(0,0,0,0.6),0_8px_40px_rgba(0,0,0,0.5)]"
        />
      </div>
    </nav>
  )
}
