# UPPI - Indice Completo do Projeto

**Ultima atualizacao:** 02/03/2026
**Versao:** 14.4
**Arquitetura:** Frontend + Backend + Banco (74 tabelas public / 176 total / 145 RLS policies / 20 triggers / 15 RPCs) + API (57 routes) + Auth + Realtime (8 tabelas) + Admin
**Supabase:** nhdupekrvafpqlsbpznq (supabase-gray-book) — 4 migrations — analise completa: docs/03-banco-de-dados/ANALISE-SCHEMAS-COMPLETA.md
**URL Supabase:** https://nhdupekrvafpqlsbpznq.supabase.co

---

## 1. Documentacao (docs/) — 17 documentos

```
docs/
  INDICE.md                                  <-- Voce esta aqui (mapa completo do projeto)
  AUDITORIA-PROJETO.md                       Auditoria completa: paginas, APIs, componentes, hooks
  AUDITORIA-PROJETO-v2.md                    Auditoria v2 (banco 73 tabelas, APIs corrigidas)
  CONFIGURACAO-COMPLETA.md                   Env vars, integracoes, proximos passos
  SUPABASE-CONEXAO.md                        Conexao Supabase: projeto, migrations, RPCs, variaveis
  VAPID-SETUP.md                             Setup Web Push (VAPID) para push notifications
  PAINEL-ADMIN.md                            Painel admin completo: 33 paginas

  01-frontend/
    IMPLEMENTACAO.md                         Funcionalidades, componentes React, UX

  02-backend-api/
    API-ENDPOINTS.md                         57 route.ts, 92+ handlers documentados,
                                             rate limiting, autenticacao, padrao de erros
    VERSIONAMENTO.md                         Padrao /api/v1/, middleware, headers de versao

  03-banco-de-dados/
    AUDITORIA-COMPLETA.md                    Schema alvo completo (73 tabelas, 98+ RLS, 45+ RPC)
    SCHEMA.md                                Estado real (73 tabelas ativas em 02/03/2026) +
                                             campos detalhados, RLS, indexes, funcoes SQL

  04-infraestrutura/
    GOOGLE-MAPS.md                           Setup, hooks, componentes, troubleshooting
    GOOGLE-MAPS-EXEMPLOS.md                  10 exemplos praticos: mapa, rota, autocomplete
    TESTE-REALTIME.md                        Guia de teste Supabase Realtime (passo a passo)

  05-status/
    STATUS-FUNCIONALIDADES.md                Checklist completo: 73 tabelas, 15 funcoes RPC,
                                             152 paginas, 57 APIs, 8 tabelas Realtime (02/03/2026)

  06-deploy/
    PLAY-STORE.md                            Guia de publicacao (TWA/Capacitor/FCM)

  07-design/
    DESIGN-SYSTEM-IOS.md                     Design system iOS completo, tokens, animacoes
    BUTTONS-COMPONENTS.md                    Guia de botoes e componentes visuais
```

---

## 2. Codigo-Fonte - Estrutura Completa

### 2.1 Frontend - Paginas (app/)

```
app/
  page.tsx                                   Redirect para /auth/welcome
  layout.tsx                                 Layout raiz (PWA, meta, Inter font, Sentry)
  globals.css                                Design system iOS completo
  offline/page.tsx                           Pagina offline (PWA)
  google-setup/page.tsx                      Configuracao Google Maps
  share/page.tsx                             Compartilhamento
  login/page.tsx                             Alias de auth
  signup/page.tsx                            Alias de auth
  phone/page.tsx                             Auth por telefone
  privacy/page.tsx                           Politica de privacidade
  terms/page.tsx                             Termos de uso

  auth/                                      Fluxo de autenticacao (9 paginas)
    welcome/page.tsx
    login/page.tsx
    sign-up/page.tsx
    sign-up-success/page.tsx
    user-type/page.tsx
    error/page.tsx
    callback/page.tsx
    driver/welcome/page.tsx
    driver/login/page.tsx
    driver/sign-up/page.tsx

  onboarding/                                Onboarding (3 paginas)
    page.tsx
    splash/page.tsx
    create-account/page.tsx

  uppi/                                      App principal (70+ paginas)
    layout.tsx                               Layout com BottomNavigation + SidebarMenu
    home/page.tsx                            Home com mapa, sugestoes IA, zonas quentes
    profile/page.tsx                         Perfil do usuario
    history/page.tsx                         Historico de corridas
    wallet/page.tsx                          Carteira digital
    payments/page.tsx                        Metodos de pagamento
    notifications/page.tsx                   Notificacoes
    analytics/page.tsx                       Estatisticas do usuario
    settings/page.tsx                        Configuracoes
    settings/sms/page.tsx                    Config SMS
    settings/recording/page.tsx              Gravacao de audio
    settings/2fa/page.tsx                    Dois fatores
    settings/emergency/page.tsx              Config emergencia
    settings/language/page.tsx               Idioma
    settings/password/page.tsx               Alterar senha
    favorites/page.tsx                       Enderecos favoritos
    favorites/add/page.tsx                   Adicionar favorito
    achievements/page.tsx                    Conquistas/badges
    leaderboard/page.tsx                     Ranking
    social/page.tsx                          Feed social
    social/create/page.tsx                   Criar post
    referral/page.tsx                        Indicacao de amigos
    promotions/page.tsx                      Promocoes e cupons
    club/page.tsx                            Clube de assinatura
    help/page.tsx                            Ajuda
    suporte/page.tsx                         Suporte
    suporte/chat/page.tsx                    Chat de suporte
    seguranca/page.tsx                       Seguranca
    emergency/page.tsx                       Emergencia
    emergency-contacts/page.tsx              Contatos de emergencia
    tracking/page.tsx                        Rastreamento GPS
    entregas/page.tsx                        Entregas
    cidade-a-cidade/page.tsx                 Viagens intermunicipais
    ios-showcase/page.tsx                    Showcase de componentes iOS
    legal/terms/page.tsx
    legal/privacy/page.tsx
    privacy/page.tsx
    terms/page.tsx

    ride/                                    Fluxo de corrida (14 paginas)
      route-input/page.tsx
      select/page.tsx
      route-alternatives/page.tsx
      searching/page.tsx
      schedule/page.tsx
      group/page.tsx
      [id]/tracking/page.tsx
      [id]/chat/page.tsx
      [id]/offers/page.tsx
      [id]/details/page.tsx
      [id]/payment/page.tsx
      [id]/review/page.tsx
      [id]/review-enhanced/page.tsx

    request-ride/page.tsx
    driver-mode/page.tsx
    driver-mode/active/page.tsx

    driver/                                  Area do motorista (5 paginas)
      page.tsx
      register/page.tsx
      documents/page.tsx
      verify/page.tsx
      earnings/page.tsx

  admin/                                     Painel administrativo (33 paginas)
    layout.tsx
    page.tsx                                 Dashboard KPIs + AreaChart + BarChart
    login/page.tsx
    users/page.tsx
    drivers/page.tsx
    drivers/earnings/page.tsx
    rides/page.tsx
    rides/[id]/page.tsx
    financeiro/page.tsx
    payments/page.tsx
    analytics/page.tsx
    monitor/page.tsx
    cupons/page.tsx
    notifications/page.tsx
    logs/page.tsx
    settings/page.tsx
    webhooks/page.tsx
    agendamentos/page.tsx
    group-rides/page.tsx
    cidade-a-cidade/page.tsx
    entregas/page.tsx
    price-offers/page.tsx
    messages/page.tsx
    suporte/page.tsx
    social/page.tsx
    reviews/page.tsx
    achievements/page.tsx
    leaderboard/page.tsx
    referrals/page.tsx
    subscriptions/page.tsx
    favoritos/page.tsx
    emergency/page.tsx
    emergency-contacts/page.tsx
    sms/page.tsx
    recordings/page.tsx
    promotions/page.tsx
    faq/page.tsx
    legal/page.tsx
```

### 2.2 Backend - API Routes (app/api/v1/) — 57 arquivos

```
app/api/v1/
  health/route.ts
  profile/route.ts                           GET + PATCH (profiles, sem tabela 'users')
  stats/route.ts
  rides/route.ts                             GET + POST (profiles + driver_profiles)
  rides/[id]/status/route.ts
  rides/[id]/cancel/route.ts
  rides/[id]/report/route.ts                 Email automatico via Resend
  offers/route.ts                            GET + POST (driver_profiles + profiles)
  offers/[id]/accept/route.ts
  ratings/route.ts                           GET + POST (reviewed_id/reviewer_id)
  reviews/route.ts
  reviews/enhanced/route.ts
  reviews/driver/route.ts
  notifications/route.ts
  notifications/send/route.ts
  messages/route.ts
  wallet/route.ts                            GET + POST (calculate_wallet_balance RPC)
  coupons/route.ts
  subscriptions/route.ts
  favorites/route.ts
  referrals/route.ts
  achievements/route.ts
  leaderboard/route.ts
  social/posts/route.ts
  social/posts/[id]/like/route.ts
  social/posts/[id]/comments/route.ts
  drivers/nearby/route.ts                    find_nearby_drivers RPC
  drivers/hot-zones/route.ts
  driver/location/route.ts                   latitude/longitude (nao lat/lng)
  driver/documents/route.ts
  driver/verify/route.ts
  group-rides/route.ts
  group-rides/join/route.ts
  emergency/route.ts
  recordings/upload/route.ts
  sms/send/route.ts
  sms/status/route.ts
  geocode/route.ts
  places/autocomplete/route.ts
  places/details/route.ts
  routes/alternatives/route.ts
  distance/route.ts
  webhooks/route.ts
  webhooks/process/route.ts
  auth/verify/route.ts
  auth/email-otp/send/route.ts
  auth/email-otp/verify/route.ts
  push/subscribe/route.ts
  push/send/route.ts
  push/broadcast/route.ts
  push/vapid-public-key/route.ts
  admin/setup/route.ts
  admin/create-first/route.ts

app/api/admin/check/route.ts               Verifica status de admin
```

### 2.3 Componentes (components/)

```
components/
  Custom (48):
    bottom-navigation.tsx, sidebar-menu.tsx
    google-map.tsx, modern-map.tsx, route-map.tsx, map-fallback.tsx, route-preview-3d.tsx
    places-search.tsx, search-address.tsx, nearby-drivers.tsx, hot-zones-card.tsx, location-tag.tsx
    referral-card.tsx, referral-client.tsx
    facial-verification.tsx, ride-audio-recorder.tsx, voice-assistant-button.tsx
    ios-page-transition.tsx, pull-to-refresh.tsx, swipeable-list-item.tsx
    service-worker.tsx, auto-theme.tsx, theme-provider.tsx, theme-toggle.tsx
    client-providers.tsx, fcm-provider.tsx, app-initializer.tsx
    chat-interface.tsx, pix-qr-code.tsx, empty-state.tsx, loading-overlay.tsx
    coupon-notification-modal.tsx, notification-banner.tsx, permission-onboarding.tsx
    go-back-button.tsx, uppi-logo.tsx
    skeletons: driver, history, notifications, profile, social, tracking, wallet
    admin/admin-header.tsx, admin/admin-sidebar.tsx

  UI shadcn/ui (54 em components/ui/)
  iOS Components (31 em components/ui/ios-*)
```

### 2.4 Hooks Customizados (hooks/) — 12

```
use-auth.ts                                Sessao Supabase + perfil
use-fcm.ts                                 Firebase Cloud Messaging
use-geolocation.ts                         Geolocalizacao
use-google-maps.ts                         Google Maps loader
use-haptic.ts                              Haptic feedback (7 padroes)
use-mobile.tsx                             Breakpoint 768px
use-places-autocomplete.ts                 Google Places
use-pull-to-refresh.ts                     Pull to refresh
use-swipe.ts                               Gestos swipe
use-swipe-actions.ts                       Acoes swipe em lista
use-toast.ts                               Toast shadcn
use-voice-assistant.ts                     Speech Recognition pt-BR
```

### 2.5 Bibliotecas e Utilidades (lib/)

```
lib/
  utils.ts                                   cn() - merge de classes Tailwind
  admin-auth.ts                              Autenticacao admin (requireAdmin)
  api-utils.ts                               requireAuth, getCurrentUserWithProfile,
                                             requireDriver (usa profiles/driver_profiles)

  supabase/
    client.ts                                Cliente browser
    server.ts                                Cliente server
    proxy.ts                                 Middleware de sessao (updateSession)
    database.ts                              Funcoes helper (tabelas corretas)
    types.ts                                 Tipos gerados Supabase

  google-maps/
    provider.tsx, utils.ts, types.ts, route-optimizer.ts

  types/
    database.ts                              Tipos TypeScript do dominio (atualizado v2)

  utils/
    ios-toast.ts, rate-limit.ts, ai-suggestions.ts, ride-calculator.ts,
    fetch-retry.ts, ios-animations.ts, ios-haptics.ts, haptics.ts,
    analytics.ts, deep-links.ts, init-app.ts, offline-handler.ts

  services/ (13 services)
    auth-service.ts, chat-service.ts, favorites-service.ts, geolocation-service.ts,
    history-service.ts, notification-service.ts, payment-service.ts, profile-service.ts,
    realtime-service.ts, review-service.ts (rater_id/rated_id corretos),
    ride-service.ts, storage-service.ts, tracking-service.ts

  api/
    config.ts, version-middleware.ts

  helpers/
    notifications.ts
```

### 2.6 Configuracao

```
proxy.ts                                     Supabase session + route protection
                                             (renomeado de middleware.ts — Next.js 16)
components.json                              Config shadcn/ui
next.config.mjs                              Next.js 16 (sem eslint — removido, Sentry, envs)
package.json                                 Dependencias completas
```

---

## 3. Mapeamento: Camada -> Codigo + Docs

| Camada              | Codigo                              | Documentacao                                |
|---------------------|-------------------------------------|---------------------------------------------|
| Frontend / Paginas  | app/uppi/** + app/auth/**           | docs/01-frontend/IMPLEMENTACAO.md           |
| Backend / API       | app/api/v1/**                       | docs/02-backend-api/API-ENDPOINTS.md        |
| Banco de Dados      | Supabase (externo)                  | docs/03-banco-de-dados/SCHEMA.md            |
| Schema Completo     | Supabase (externo)                  | docs/03-banco-de-dados/AUDITORIA-COMPLETA.md|
| Componentes         | components/**                       | docs/01-frontend/IMPLEMENTACAO.md           |
| Hooks               | hooks/**                            | docs/AUDITORIA-PROJETO.md                   |
| Lib / Utilidades    | lib/**                              | docs/AUDITORIA-PROJETO.md                   |
| Autenticacao        | proxy.ts + lib/supabase/            | docs/AUDITORIA-PROJETO.md                   |
| Google Maps         | lib/google-maps/** + hooks/         | docs/04-infraestrutura/GOOGLE-MAPS.md       |
| Realtime            | lib/services/realtime-service.ts    | docs/04-infraestrutura/TESTE-REALTIME.md    |
| Status              | —                                   | docs/05-status/STATUS-FUNCIONALIDADES.md    |
| Deploy              | —                                   | docs/06-deploy/PLAY-STORE.md                |

---

## 4. Tech Stack Completa

| Tecnologia           | Uso                                        | Versao    |
|----------------------|--------------------------------------------|-----------|
| Next.js              | Framework fullstack (App Router)           | 16.0.7    |
| React                | UI library                                 | 19        |
| TypeScript           | Tipagem estatica                           | 5.7.3     |
| Tailwind CSS         | Estilos utilitarios                        | 3.4.17    |
| shadcn/ui            | 54 componentes UI base + 31 iOS = 85       | latest    |
| Supabase             | Auth + PostgreSQL + Realtime + Storage     | 2.47.x    |
| Google Maps          | Mapas, rotas, geocoding, places            | latest    |
| Web Push (VAPID)     | Push notifications nativo (sem Firebase)   | web-push 3.x |
| Framer Motion        | Animacoes                                  | 11.x      |
| Recharts             | Graficos                                   | 2.15.0    |
| Sonner               | Notificacoes toast                         | 1.7.1     |
| Lucide React         | Icones                                     | latest    |
| Zod                  | Validacao de dados                         | 3.24      |
| React Hook Form      | Formularios                                | 7.54      |
| Resend               | Envio de emails transacionais              | 4.8.0     |
| Sentry               | Monitoramento de erros                     | 9.x       |
| Vercel Analytics     | Analytics de uso                           | 1.3.1     |
| canvas-confetti      | Animacao de confete/conquistas             | 1.9       |

---

## 5. Banco de Dados - Estado Real (02/03/2026)

| Categoria              | Quantidade | Observacao                                              |
|------------------------|-----------|--------------------------------------------------------------|
| Tabelas (schema public)| 74        | Criadas via 4 migrations no Supabase (02/03/2026)           |
| Tabelas (pg_catalog)   | 64        | Catalog interno do PostgreSQL                               |
| Tabelas (auth)         | 21        | Gerenciadas pelo Supabase Auth                              |
| Tabelas (storage)      | 8         | Gerenciadas pelo Supabase Storage                           |
| Tabelas (information_schema) | 4   | Views do sistema PostgreSQL                                 |
| Tabelas (realtime)     | 3         | Gerenciadas pelo Supabase Realtime                          |
| Tabelas (migrations)   | 1         | supabase_migrations                                         |
| Tabelas (vault)        | 1         | Segredos criptografados                                     |
| **Total geral**        | **176**   | Todos os schemas — verificado via SQL em 02/03/2026         |
| RLS Policies           | 98+       | Todas as 74 tabelas com RLS habilitado               |
| Funcoes SQL (RPC)      | 15        | find_nearby_drivers, calculate_wallet_balance, etc.  |
| Triggers               | 24+       | updated_at, rating, streaks, etc.                    |
| Indexes                | 60+       | Performance em busca e filtros                       |
| Realtime (publicadas)  | 8         | rides, driver_locations, messages, notifications,    |
|                        |           | price_offers, support_messages, ride_tracking,       |
|                        |           | ride_offers                                          |
| system_settings        | 6 registros | Populado via migration (001_core_tables)            |
| pricing_rules          | 6 registros | 6 tipos de veiculo                                  |
| rating_categories      | 4 registros | Direcao, Trajeto, Respeito, Comportamento           |

### Migrations aplicadas no Supabase (nhdupekrvafpqlsbpznq / supabase-gray-book)

| Migration | Conteudo | Status |
|-----------|---------|--------|
| 001_core_tables | profiles, driver_profiles, rides, price_offers, messages, ratings, favorites, notifications + trigger on_auth_user_created | Aplicada |
| 002_location_wallet_social | driver_locations, ride_tracking, ride_stops, location_history, hot_zones, user_wallets, wallet_transactions, payments, coupons, coupon_uses, user_coupons, social_posts, social_post_likes, post_comments, social_follows, user_social_stats, user_achievements, referral_achievements, leaderboard, rating_categories (seed) | Aplicada |
| 003_driver_security_support | driver_verifications, vehicles, drivers, driver_route_segments, emergency_contacts, emergency_alerts, ride_recordings, recording_consents, user_recording_preferences, group_rides, group_ride_participants, scheduled_rides, ride_offers, support_tickets, support_messages, referrals, subscriptions, promotions, sms_templates, sms_deliveries, sms_logs, webhook_endpoints, webhook_deliveries, admin_logs, error_logs, system_settings (seed), push_subscriptions, notification_preferences, user_sms_preferences, user_onboarding | Aplicada |
| 004_routes_reviews_misc_rpcs | popular_routes, driver_popular_routes, route_history, address_search_history, reviews, driver_reviews, rating_helpful_votes, rating_reports, reports, pricing_rules (seed), avatars, users, campaigns, faqs, legal_documents + 15 RPCs | Aplicada |

---

## 6. Correcoes Aplicadas (02/03/2026)

| Arquivo                        | Correcao                                                     |
|-------------------------------|--------------------------------------------------------------|
| next.config.mjs               | Removida chave `eslint` (nao suportada no Next.js 16)        |
| middleware.ts → proxy.ts      | Renomeado para convencao Next.js 16                          |
| app/api/v1/offers/route.ts    | Usa driver_profiles/profiles (nao 'drivers'/'users')         |
| app/api/v1/wallet/route.ts    | Usa calculate_wallet_balance RPC + colunas corretas          |
| app/api/v1/ratings/route.ts   | Usa reviewed_id/reviewer_id corretos                         |
| app/api/v1/rides/route.ts     | Joins corretos via profiles!passenger_id / driver_profiles   |
| app/api/v1/profile/route.ts   | Usa profiles com id (nao user_id)                            |
| app/api/v1/driver/location    | Usa latitude/longitude (nao lat/lng)                         |
| lib/supabase/database.ts      | Todas as funcoes reescritas com tabelas corretas              |
| lib/api-utils.ts              | requireDriver usa driver_profiles, nao 'drivers'             |
| lib/services/review-service.ts| Usa rater_id/rated_id (nao reviewer_id/reviewee_id)          |
| lib/types/database.ts         | Atualizado com todas as novas colunas e tipos                 |

---

**Ultima atualizacao:** 02/03/2026 — Supabase conectado (pjlbixnzjndezoscbhej), 74 tabelas public / 176 tabelas total (todos schemas), 4 migrations aplicadas, 152 paginas, 57 APIs, 15 funcoes RPC
