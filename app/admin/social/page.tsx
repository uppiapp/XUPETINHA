'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AdminHeader } from '@/components/admin/admin-header'
import {
  Trash2, Heart, MessageCircle, Search, Filter,
  TrendingUp, Award, MapPin, Users, AlertTriangle, RefreshCw,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface SocialPost {
  id: string
  user_id: string
  type: string
  title: string
  description: string | null
  metadata: any
  likes_count: number
  comments_count: number
  created_at: string
  profile?: { full_name: string; avatar_url: string | null } | null
}

const TYPE_LABELS: Record<string, { label: string; color: string; icon: any }> = {
  savings_shared: { label: 'Economia', color: 'bg-emerald-500/15 text-emerald-400', icon: TrendingUp },
  achievement_unlocked: { label: 'Conquista', color: 'bg-amber-500/15 text-amber-400', icon: Award },
  milestone_reached: { label: 'Marco', color: 'bg-blue-500/15 text-blue-400', icon: Award },
  ride_completed: { label: 'Corrida', color: 'bg-violet-500/15 text-violet-400', icon: MapPin },
  general: { label: 'Geral', color: 'bg-slate-500/15 text-slate-400', icon: Users },
}

function getRelativeTime(d: string) {
  const diff = Date.now() - new Date(d).getTime()
  const m = Math.floor(diff / 60000)
  const h = Math.floor(m / 60)
  const day = Math.floor(h / 24)
  if (m < 1) return 'agora'
  if (m < 60) return `${m}m`
  if (h < 24) return `${h}h`
  return `${day}d`
}

export default function AdminSocialPage() {
  const [posts, setPosts] = useState<SocialPost[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const channelRef = useRef<any>(null)

  const fetchPosts = useCallback(async () => {
    const supabase = createClient()
    let query = supabase
      .from('social_posts')
      .select('id, user_id, type, title, description, metadata, likes_count, comments_count, created_at, profile:profiles!social_posts_user_id_fkey(full_name, avatar_url)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(100)

    if (typeFilter !== 'all') query = query.eq('type', typeFilter)
    if (search.trim()) query = query.ilike('title', `%${search}%`)

    const { data, count } = await query
    setPosts((data as any) || [])
    setTotal(count || 0)
    setLastUpdated(new Date())
    setLoading(false)
  }, [search, typeFilter])

  useEffect(() => {
    fetchPosts()
    const supabase = createClient()
    channelRef.current = supabase
      .channel('admin-social-rt')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'social_posts' }, fetchPosts)
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'social_posts' }, fetchPosts)
      .subscribe()
    return () => { if (channelRef.current) supabase.removeChannel(channelRef.current) }
  }, [fetchPosts])

  const handleDelete = async (id: string) => {
    if (!confirm('Remover este post? Esta acao nao pode ser desfeita.')) return
    setDeletingId(id)
    const supabase = createClient()
    await supabase.from('social_posts').delete().eq('id', id)
    setPosts(prev => prev.filter(p => p.id !== id))
    setDeletingId(null)
  }

  const stats = {
    total,
    today: posts.filter(p => new Date(p.created_at).toDateString() === new Date().toDateString()).length,
    totalLikes: posts.reduce((s, p) => s + (p.likes_count || 0), 0),
    totalComments: posts.reduce((s, p) => s + (p.comments_count || 0), 0),
  }

  const headerActions = (
    <button
      type="button"
      onClick={fetchPosts}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] text-[12px] font-medium text-slate-400 hover:text-slate-200 transition-colors"
    >
      <RefreshCw className="w-3 h-3" />
      {lastUpdated && (
        <span className="hidden sm:inline">
          {lastUpdated.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </span>
      )}
    </button>
  )

  return (
    <>
      <AdminHeader title="Feed Social" subtitle="Moderacao de posts em tempo real" actions={headerActions} />
      <div className="flex-1 overflow-y-auto bg-[hsl(var(--admin-bg))]">
        <div className="p-5 space-y-5">

          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Total de Posts', value: stats.total, color: 'text-blue-400', bg: 'bg-blue-500/10' },
              { label: 'Hoje', value: stats.today, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
              { label: 'Total Likes', value: stats.totalLikes, color: 'text-red-400', bg: 'bg-red-500/10' },
              { label: 'Total Comentarios', value: stats.totalComments, color: 'text-violet-400', bg: 'bg-violet-500/10' },
            ].map(({ label, value, color, bg }) => (
              <div key={label} className="bg-[hsl(var(--admin-surface))] rounded-xl p-4 border border-[hsl(var(--admin-border))]">
                <p className={cn('text-[22px] font-bold tabular-nums', color)}>{value.toLocaleString('pt-BR')}</p>
                <p className="text-[11px] text-slate-500 font-medium mt-1">{label}</p>
              </div>
            ))}
          </div>

          {/* Filtros */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
              <input
                type="text"
                placeholder="Buscar por titulo..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full h-8 pl-8 pr-3 rounded-lg bg-[hsl(var(--admin-surface))] border border-[hsl(var(--admin-border))] text-[12px] text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-[hsl(var(--admin-green))]/50"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-500" />
              {['all', 'savings_shared', 'achievement_unlocked', 'ride_completed', 'general'].map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTypeFilter(t)}
                  className={cn(
                    'px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors',
                    typeFilter === t
                      ? 'bg-[hsl(var(--admin-green))]/15 text-[hsl(var(--admin-green))]'
                      : 'text-slate-500 hover:text-slate-300'
                  )}
                >
                  {t === 'all' ? 'Todos' : TYPE_LABELS[t]?.label || t}
                </button>
              ))}
            </div>
          </div>

          {/* Posts list */}
          <div className="bg-[hsl(var(--admin-surface))] rounded-xl border border-[hsl(var(--admin-border))]">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-[hsl(var(--admin-border))]">
              <h3 className="text-[13px] font-bold text-slate-200">Posts ({posts.length})</h3>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-6 h-6 border-2 border-[hsl(var(--admin-green))] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : posts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Users className="w-10 h-10 text-slate-700" />
                <p className="text-[13px] text-slate-500">Nenhum post encontrado</p>
              </div>
            ) : (
              <div className="divide-y divide-[hsl(var(--admin-border))]">
                {posts.map(post => {
                  const typeCfg = TYPE_LABELS[post.type] || TYPE_LABELS.general
                  const TypeIcon = typeCfg.icon
                  const profile = post.profile as any

                  return (
                    <div key={post.id} className="flex items-start gap-4 px-5 py-4 hover:bg-[hsl(var(--sidebar-accent))]/30 transition-colors">
                      {/* Avatar */}
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500/30 to-violet-500/30 flex items-center justify-center text-slate-200 font-bold text-[13px] shrink-0">
                        {profile?.full_name?.charAt(0)?.toUpperCase() || '?'}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                          <span className="text-[13px] font-bold text-slate-200 truncate">
                            {profile?.full_name || 'Usuário desconhecido'}
                          </span>
                          <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold', typeCfg.color)}>
                            <TypeIcon className="w-2.5 h-2.5" />
                            {typeCfg.label}
                          </span>
                          <span className="text-[11px] text-slate-600 ml-auto">{getRelativeTime(post.created_at)}</span>
                        </div>
                        <p className="text-[13px] font-semibold text-slate-300 truncate">{post.title}</p>
                        {post.description && (
                          <p className="text-[12px] text-slate-500 mt-0.5 line-clamp-1">{post.description}</p>
                        )}
                        <div className="flex items-center gap-4 mt-1.5">
                          <span className="flex items-center gap-1 text-[11px] text-slate-600">
                            <Heart className="w-3 h-3" />
                            {post.likes_count || 0}
                          </span>
                          <span className="flex items-center gap-1 text-[11px] text-slate-600">
                            <MessageCircle className="w-3 h-3" />
                            {post.comments_count || 0}
                          </span>
                        </div>
                      </div>

                      {/* Delete action */}
                      <button
                        type="button"
                        onClick={() => handleDelete(post.id)}
                        disabled={deletingId === post.id}
                        title="Remover post"
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0 disabled:opacity-40"
                      >
                        {deletingId === post.id ? (
                          <div className="w-3.5 h-3.5 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Alert section — posts with reports */}
          <div className="bg-[hsl(var(--admin-surface))] rounded-xl border border-amber-500/20 p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span className="text-[13px] font-bold text-slate-200">Posts com mais engajamento</span>
            </div>
            {posts.filter(p => p.likes_count > 10 || p.comments_count > 5).length === 0 ? (
              <p className="text-[12px] text-slate-500">Nenhum post com alto engajamento ainda.</p>
            ) : (
              <div className="space-y-2">
                {posts.filter(p => p.likes_count > 10 || p.comments_count > 5).slice(0, 5).map(post => {
                  const profile = post.profile as any
                  return (
                    <div key={post.id} className="flex items-center justify-between py-2 border-b border-[hsl(var(--admin-border))]/50 last:border-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[12px] text-slate-400 truncate">{post.title}</span>
                        <span className="text-[11px] text-slate-600 shrink-0">por {profile?.full_name || '?'}</span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="flex items-center gap-1 text-[11px] text-red-400">
                          <Heart className="w-3 h-3" />
                          {post.likes_count}
                        </span>
                        <span className="flex items-center gap-1 text-[11px] text-blue-400">
                          <MessageCircle className="w-3 h-3" />
                          {post.comments_count}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDelete(post.id)}
                          disabled={deletingId === post.id}
                          className="px-2.5 py-1 rounded-md bg-red-500/10 text-red-400 text-[10px] font-bold hover:bg-red-500/20 transition-colors disabled:opacity-40"
                        >
                          Remover
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

        </div>
      </div>
    </>
  )
}
