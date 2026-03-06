'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/lib/types/database'

interface SidebarMenuProps {
  isOpen: boolean
  onClose: () => void
  profile: Profile | null
}

export function SidebarMenu({ isOpen, onClose, profile }: SidebarMenuProps) {
  const router = useRouter()
  const supabase = createClient()

  const menuItems = [
    {
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
        </svg>
      ),
      label: 'Cidade',
      href: '/uppi/home',
      highlight: true,
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      label: 'Historico de pedidos',
      href: '/uppi/history',
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
      label: 'Entregas',
      href: '/uppi/entregas',
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" />
        </svg>
      ),
      label: 'Cidade a Cidade',
      href: '/uppi/cidade-a-cidade',
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      ),
      label: 'Notificacoes',
      href: '/uppi/notifications',
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
      label: 'Seguranca',
      href: '/uppi/seguranca',
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      label: 'Configuracoes',
      href: '/uppi/settings',
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      label: 'Ajuda',
      href: '/uppi/help',
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      ),
      label: 'Suporte',
      href: '/uppi/suporte',
    },
  ]

  const handleNavigation = (href: string) => {
    onClose()
    router.push(href)
  }

  const handleDriverMode = () => {
    onClose()
    router.push('/uppi/driver')
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    // Limpar todos os dados persistidos
    document.cookie = 'onboarding_done=; path=/; max-age=0'
    sessionStorage.clear()
    localStorage.removeItem('uppi_credentials')
    localStorage.removeItem('uppi_profile')
    onClose()
    router.push('/onboarding/splash')
    router.refresh()
  }

  return (
    <>
      {/* Overlay - iOS style blur */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 ios-spring"
          onClick={onClose}
        />
      )}

      {/* Sidebar - iOS style dark glass */}
      <div
        className={`fixed top-0 left-0 h-full w-[82%] max-w-[320px] bg-neutral-950/95 ios-blur z-50 flex flex-col ios-spring ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Profile Header */}
        <button
          type="button"
          className="flex items-center gap-4 p-5 pt-safe-offset-4 border-b border-white/10 ios-press"
          onClick={() => handleNavigation('/uppi/profile')}
        >
          <div className="relative">
            <Avatar className="w-14 h-14 ring-2 ring-blue-500/80 ring-offset-2 ring-offset-neutral-950">
              <AvatarImage src={profile?.avatar_url || '/images/default-avatar.jpg'} />
              <AvatarFallback className="bg-neutral-800 text-neutral-200 text-lg font-semibold">
                {profile?.full_name?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
          </div>
          <div className="flex-1 text-left">
            <span className="text-white font-semibold text-[20px] tracking-tight">
              {profile?.full_name?.split(' ')[0] || 'Usuario'}
            </span>
          </div>
          <svg className="w-5 h-5 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* Menu Items */}
        <div className="flex-1 overflow-y-auto ios-scroll py-2">
          {menuItems.map((item) => (
            <button
              key={item.label}
              type="button"
              className={`w-full flex items-center gap-4 px-5 py-[14px] text-left ios-press ${
                item.highlight
                  ? 'bg-white/8 text-white'
                  : 'text-neutral-300'
              }`}
              onClick={() => handleNavigation(item.href)}
            >
              <span className="text-neutral-500">{item.icon}</span>
              <span className="text-[17px] font-medium tracking-tight">{item.label}</span>
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="border-t border-white/10 p-5 pb-safe-offset-4 space-y-3">
          <button
            type="button"
            className="w-full h-[52px] rounded-2xl bg-blue-500 text-white font-semibold text-[17px] tracking-tight ios-press"
            onClick={handleDriverMode}
          >
            Modo motorista
          </button>

          {/* Logout button */}
          <button
            type="button"
            className="w-full flex items-center justify-center gap-3 h-[48px] rounded-2xl bg-white/5 text-red-400 text-[15px] font-medium ios-press"
            onClick={handleLogout}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3-3l3-3m0 0l-3-3m3 3H9" />
            </svg>
            Sair da conta
          </button>

          <div className="flex items-center justify-center gap-6 mt-3">
            <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="w-9 h-9 ios-press">
              <svg viewBox="0 0 24 24" className="w-9 h-9 text-blue-400" fill="currentColor">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
            </a>
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="w-9 h-9 ios-press">
              <svg viewBox="0 0 24 24" className="w-9 h-9" fill="none">
                <defs>
                  <radialGradient id="ig" cx="30%" cy="107%" r="150%">
                    <stop offset="0%" stopColor="#fdf497" />
                    <stop offset="5%" stopColor="#fdf497" />
                    <stop offset="45%" stopColor="#fd5949" />
                    <stop offset="60%" stopColor="#d6249f" />
                    <stop offset="90%" stopColor="#285AEB" />
                  </radialGradient>
                </defs>
                <rect x="2" y="2" width="20" height="20" rx="5" fill="url(#ig)" />
                <circle cx="12" cy="12" r="4.5" stroke="white" strokeWidth="1.5" fill="none" />
                <circle cx="17.5" cy="6.5" r="1.2" fill="white" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </>
  )
}
