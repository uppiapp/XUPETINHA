# UPPI - Status de Funcionalidades

**Ultima Atualizacao:** 02/03/2026
**Versao:** 16.0
**Status Geral:** 100% Operacional — 73 tabelas no banco, 152 paginas, 57 rotas de API, 15 funcoes SQL RPC

---

## Resumo Geral

| Categoria | Pronto | Total | % |
|-----------|--------|-------|---|
| Paginas (total) | 152 | 152 | 100% |
| Paginas Admin | 33 | 33 | 100% |
| API route.ts | 57 | 57 | 100% |
| Tabelas no Banco | 73 | 73 | 100% |
| Funcoes SQL (RPC) | 15 | 15 | 100% |
| Realtime (tabelas) | 8 | 8 | 100% |
| Components Custom | 48 | 48 | 100% |
| Components UI | 85 | 85 | 100% |
| Services | 13 | 13 | 100% |
| Hooks | 12 | 12 | 100% |
| Documentacao | 17 | 17 | 100% |
| Versionamento API | v1 | v1 | 100% |

---

## 1. Frontend - Paginas (152 total)

### Auth (9 paginas) — /auth/
- [x] /auth/welcome
- [x] /auth/login
- [x] /auth/sign-up
- [x] /auth/sign-up-success
- [x] /auth/user-type
- [x] /auth/error
- [x] /auth/driver/welcome
- [x] /auth/driver/login
- [x] /auth/driver/sign-up

### Home e Navegacao (5)
- [x] /uppi/home — mapa + sugestoes IA + voice assistant + zonas quentes
- [x] /uppi/notifications — central de notificacoes
- [x] /uppi/history — historico de corridas
- [x] /uppi/favorites — enderecos favoritos
- [x] /uppi/favorites/add — adicionar favorito

### Fluxo de Corrida (14)
- [x] /uppi/request-ride — solicitar corrida
- [x] /uppi/ride/route-input — origem/destino + multiplas paradas
- [x] /uppi/ride/select — selecao de veiculo com precos
- [x] /uppi/ride/route-alternatives — rotas alternativas
- [x] /uppi/ride/searching — buscando motoristas
- [x] /uppi/ride/schedule — agendar corrida
- [x] /uppi/ride/group — corridas em grupo
- [x] /uppi/ride/[id]/offers — negociacao de preco (realtime countdown)
- [x] /uppi/ride/[id]/tracking — rastreamento ao vivo
- [x] /uppi/ride/[id]/chat — chat com motorista
- [x] /uppi/ride/[id]/details — detalhes da corrida
- [x] /uppi/ride/[id]/review — avaliacao simples
- [x] /uppi/ride/[id]/review-enhanced — avaliacao avancada com categorias
- [x] /uppi/tracking — rastreamento global

### Motorista (7)
- [x] /uppi/driver — painel do motorista
- [x] /uppi/driver/register — cadastro como motorista
- [x] /uppi/driver/documents — upload de documentos
- [x] /uppi/driver/verify — verificacao facial
- [x] /uppi/driver/earnings — analise de ganhos (charts)
- [x] /uppi/driver-mode — modo motorista ativo
- [x] /uppi/driver-mode/active — recebendo corridas

### Perfil e Configuracoes (8)
- [x] /uppi/profile — perfil do usuario
- [x] /uppi/settings — configuracoes gerais
- [x] /uppi/settings/sms — preferencias SMS
- [x] /uppi/settings/recording — gravacao de audio (opt-in seguranca)
- [x] /uppi/settings/2fa — autenticacao de dois fatores
- [x] /uppi/settings/emergency — config emergencia
- [x] /uppi/settings/language — idioma
- [x] /uppi/settings/password — alterar senha

### Financeiro (4)
- [x] /uppi/wallet — carteira digital
- [x] /uppi/payments — metodos de pagamento
- [x] /uppi/promotions — promocoes e cupons
- [x] /uppi/club — club Uppi (3 planos de assinatura)

### Social e Gamificacao (6)
- [x] /uppi/social — feed social
- [x] /uppi/social/create — criar post
- [x] /uppi/leaderboard — ranking (multiplas categorias)
- [x] /uppi/achievements — conquistas e badges
- [x] /uppi/referral — programa de indicacao
- [x] /uppi/analytics — estatisticas do usuario

### Seguranca (3)
- [x] /uppi/emergency — botao SOS com GPS
- [x] /uppi/emergency-contacts — contatos de emergencia
- [x] /uppi/seguranca — central de seguranca

### Servicos Extras (3)
- [x] /uppi/entregas — servico de entregas
- [x] /uppi/cidade-a-cidade — viagens intermunicipais
- [x] /uppi/ios-showcase — showcase dos componentes iOS

### Suporte e Legal (6)
- [x] /uppi/suporte — central de ajuda
- [x] /uppi/suporte/chat — chat com suporte
- [x] /uppi/help — ajuda rapida
- [x] /uppi/legal/privacy — politica de privacidade
- [x] /uppi/legal/terms — termos de uso
- [x] /uppi/privacy / /uppi/terms (aliases)

### Admin (33 paginas, 5 grupos) — /admin/

**Visao Geral (4)**
- [x] /admin — dashboard KPIs realtime + AreaChart + BarChart (queries batch, carregamento <2s)
- [x] /admin/analytics — analytics sem RPCs inexistentes, dados direto do banco
- [x] /admin/monitor — mapa ao vivo, motoristas online
- [x] /admin/emergency — Central SOS: active/acknowledged/resolved, som de alerta

**Usuarios (9)**
- [x] /admin/users — passageiros: banir, ativar, busca, filtros
- [x] /admin/drivers — motoristas: aprovar/rejeitar documentos
- [x] /admin/drivers/earnings — ganhos: BarChart semanal, top motorista
- [x] /admin/reviews — avaliacoes: distribuicao por estrela, remover abusivas
- [x] /admin/achievements — conquistas + leaderboard
- [x] /admin/leaderboard — ranking global: 4 categorias
- [x] /admin/referrals — indicacoes: historico, top indicadores
- [x] /admin/subscriptions — assinaturas Club Uppi (Realtime)
- [x] /admin/favoritos — locais favoritos: analytics de uso

**Corridas (7)**
- [x] /admin/rides — corridas: forcar status, cancelar, filtros
- [x] /admin/rides/[id] — detalhe completo da corrida
- [x] /admin/agendamentos — corridas agendadas (Realtime)
- [x] /admin/group-rides — corridas em grupo
- [x] /admin/cidade-a-cidade — viagens intermunicipais
- [x] /admin/entregas — pedidos entrega
- [x] /admin/price-offers — ofertas ao vivo (Realtime)

**Operacoes (7)**
- [x] /admin/financeiro — receita, repasses, graficos (queries batch)
- [x] /admin/payments — transacoes + carteira: aprovar/rejeitar saques
- [x] /admin/cupons — CRUD cupons: criar, editar, ativar/desativar
- [x] /admin/messages — moderacao chats (Realtime)
- [x] /admin/notifications — push broadcast + individual
- [x] /admin/suporte — tickets de suporte (Realtime)
- [x] /admin/social — feed social: moderar posts (Realtime)

**Sistema (3)**
- [x] /admin/webhooks — endpoints de integracao, secret, historico
- [x] /admin/logs — error_logs: filtro por nivel, stack trace (Realtime)
- [x] /admin/settings — system_settings: 6 parametros

### Onboarding e Outros (4)
- [x] /onboarding — tela de onboarding
- [x] /onboarding/splash — splash screen
- [x] /onboarding/create-account — criar conta
- [x] / — redirect para /auth/welcome
- [x] /offline — pagina offline (PWA)
- [x] /share — compartilhamento
- [x] /google-setup — configuracao Google Maps
- [x] /login / /signup / /phone — aliases de auth

---

## 2. Backend - API Routes (57 arquivos, 92+ handlers)

**Base URL:** /api/v1
**Middleware:** version-middleware.ts ativo
**Auth:** Supabase Auth (cookie)
**Rate Limiting:** 3 niveis (api:60/min, auth:10/5min, offer:5/30s)

- [x] /api/v1/health
- [x] /api/v1/profile — GET + PATCH
- [x] /api/v1/stats
- [x] /api/v1/rides — GET + POST (tabelas corretas: profiles, driver_profiles)
- [x] /api/v1/rides/[id]/status — PATCH
- [x] /api/v1/rides/[id]/cancel — POST
- [x] /api/v1/rides/[id]/report — POST (email Resend automatico)
- [x] /api/v1/offers — GET + POST (driver_profiles + profiles, sem tabela 'drivers')
- [x] /api/v1/offers/[id]/accept — POST
- [x] /api/v1/ratings — GET + POST (reviewed_id + reviewer_id corretos)
- [x] /api/v1/reviews — GET + POST
- [x] /api/v1/reviews/enhanced — GET + POST
- [x] /api/v1/reviews/driver — GET + POST
- [x] /api/v1/notifications — GET + POST + PATCH
- [x] /api/v1/notifications/send — POST push
- [x] /api/v1/messages — GET + POST
- [x] /api/v1/wallet — GET + POST (calculate_wallet_balance RPC)
- [x] /api/v1/coupons — GET + POST
- [x] /api/v1/subscriptions — GET + POST
- [x] /api/v1/favorites — GET + POST + DELETE
- [x] /api/v1/referrals — GET + POST
- [x] /api/v1/achievements — GET
- [x] /api/v1/leaderboard — GET
- [x] /api/v1/social/posts — GET + POST
- [x] /api/v1/social/posts/[id]/like — POST + DELETE
- [x] /api/v1/social/posts/[id]/comments — GET + POST + DELETE
- [x] /api/v1/drivers/nearby — GET (find_nearby_drivers RPC)
- [x] /api/v1/drivers/hot-zones — GET
- [x] /api/v1/driver/location — GET + PATCH (latitude/longitude corretos)
- [x] /api/v1/driver/documents — GET + POST
- [x] /api/v1/driver/verify — POST
- [x] /api/v1/group-rides — GET + POST
- [x] /api/v1/group-rides/join — POST
- [x] /api/v1/emergency — GET + POST + PUT
- [x] /api/v1/recordings/upload — POST
- [x] /api/v1/sms/send — POST
- [x] /api/v1/sms/status — GET + POST (webhook Twilio)
- [x] /api/v1/geocode — GET
- [x] /api/v1/places/autocomplete — GET
- [x] /api/v1/places/details — GET
- [x] /api/v1/routes/alternatives — GET
- [x] /api/v1/distance — GET
- [x] /api/v1/webhooks — GET + POST + DELETE
- [x] /api/v1/webhooks/process — GET + POST (cron CRON_SECRET)
- [x] /api/v1/auth/verify — POST
- [x] /api/v1/auth/email-otp/send — POST
- [x] /api/v1/auth/email-otp/verify — POST
- [x] /api/v1/push/subscribe — POST
- [x] /api/v1/push/send — POST
- [x] /api/v1/push/broadcast — POST
- [x] /api/v1/push/vapid-public-key — GET
- [x] /api/v1/admin/setup — POST
- [x] /api/v1/admin/create-first — POST
- [x] /api/admin/check — GET verificar status admin

---

## 3. Banco de Dados — Estado Real em 02/03/2026

**73 tabelas ativas** — verificadas via Supabase SQL

### Nucleo (8 tabelas)
| Tabela | Descricao |
|--------|-----------|
| profiles | Usuarios (passageiros e motoristas) — +rating, +total_rides, +preferences |
| driver_profiles | Motorista — +last_verification_at, +verification_status, +total_trips, +acceptance_rate |
| rides | Corridas — +vehicle_type, +notes, +accepted_at, +arrived_at, +has_rated |
| price_offers | Ofertas de preco dos motoristas |
| messages | Chat das corridas |
| ratings | Avaliacoes — +rating, +reviewer_id, +reviewed_id, +tags, +category_ratings |
| notifications | Notificacoes — +action_url, +image_url, +expires_at |
| favorites | Motoristas/enderecos favoritos |

### Localizacao (5 tabelas)
| Tabela | Descricao |
|--------|-----------|
| driver_locations | Posicao em tempo real (latitude/longitude) |
| ride_tracking | Historico GPS da corrida |
| ride_stops | Paradas intermediarias |
| location_history | Historico de localizacao do usuario |
| hot_zones | Zonas de alta demanda |

### Financeiro (6 tabelas)
| Tabela | Descricao |
|--------|-----------|
| user_wallets | Carteira digital — +pending_balance, +total_earned, +total_spent |
| wallet_transactions | Transacoes — +balance_after, +reference_type, +metadata |
| payments | Pagamentos de corridas |
| coupons | Cupons de desconto |
| coupon_uses | Registro de uso |
| subscriptions | Club Uppi (planos) |

### Motorista - Documentos (4 tabelas)
| Tabela | Descricao |
|--------|-----------|
| driver_documents | CNH, CRLV, foto, antecedentes |
| driver_verifications | Processo de verificacao facial |
| vehicles | Veiculos cadastrados |
| driver_route_segments | Segmentos de rota frequentes |

### Social e Gamificacao (9 tabelas)
social_posts, social_post_likes, social_post_comments, social_follows,
user_social_stats, achievements, user_achievements, user_streaks, leaderboard

### Avaliacoes Avancadas (7 tabelas)
enhanced_reviews, driver_reviews, review_tags, rating_categories (com seed),
ratings (simples), rating_helpful_votes, rating_reports

### Seguranca (5 tabelas)
emergency_contacts, emergency_alerts, ride_recordings, recording_consents,
user_recording_preferences

### Corridas Especiais (3 tabelas)
group_rides, group_ride_participants, scheduled_rides

### Configuracoes do Usuario (5 tabelas)
user_settings, notification_preferences, user_sms_preferences,
user_onboarding (+step_completed, +preferences), fcm_tokens

### Suporte (2 tabelas)
support_tickets (+assigned_to, +resolved_at), support_messages

### Indicacoes (2 tabelas)
referrals, referral_rewards

### Assinaturas e Promocoes (3 tabelas)
subscriptions, promotions, user_coupons

### Rotas e Historico (4 tabelas)
popular_routes, driver_popular_routes, route_history, address_search_history

### SMS (3 tabelas)
sms_templates, sms_deliveries, sms_logs

### Admin e Infraestrutura (7 tabelas)
admin_logs, pricing_rules, webhook_endpoints, webhook_deliveries,
error_logs, system_settings, avatars

---

## 4. Funcoes SQL (RPC) — 15 funcoes ativas

| Funcao | Descricao |
|--------|-----------|
| find_nearby_drivers(lat, lng, radius, type) | Motoristas proximos com distancia e ETA |
| calculate_wallet_balance(user_id) | Saldo atual da carteira |
| update_user_rating(user_id) | Recalcula rating medio do perfil |
| get_driver_stats(driver_id) | Estatisticas consolidadas do motorista |
| get_ride_with_details(ride_id) | Corrida com todos os joins |
| needs_facial_verification(driver_id) | Verifica se motorista precisa de re-verificacao |
| respond_to_rating(rating_id, response) | Responder a uma avaliacao |
| get_category_ratings(user_id) | Ratings agrupados por categoria |
| accept_price_offer(offer_id, ride_id) | Aceitar oferta e atualizar corrida atomicamente |
| update_driver_location(driver_id, lat, lng, heading, speed) | Atualizar GPS com upsert |
| get_platform_stats() | Estatisticas globais da plataforma |
| get_user_stats(user_id) | Estatisticas de um usuario |
| get_social_feed(user_id, limit, offset) | Feed social personalizado |
| get_leaderboard(period, metric, limit) | Ranking por periodo/metrica |
| get_hot_zones(lat, lng, radius) | Zonas de demanda proximas |

---

## 5. Realtime — 8 tabelas com publicacao ativa

| Tabela | Uso |
|--------|-----|
| rides | Monitor admin + busca de corridas do motorista |
| driver_locations | Rastreamento ao vivo |
| messages | Chat bidirecional da corrida |
| notifications | Notificacoes push in-app |
| price_offers | Leilao reverso de preco |
| support_messages | Chat do suporte |
| ride_tracking | GPS historico em tempo real |
| ride_offers | Ofertas de corrida para motoristas |

---

## 6. Componentes (133 total)

### Custom (48 em /components/*.tsx)
- [x] Mapa: google-map, modern-map, route-map, route-preview-3d, map-fallback
- [x] Localizacao: nearby-drivers, hot-zones-card, places-search, search-address, location-tag
- [x] Navegacao: bottom-navigation, sidebar-menu, go-back-button
- [x] Corrida: ride-audio-recorder, chat-interface, pix-qr-code
- [x] iOS UI: ios-page-transition, ios-confirm-dialog, pull-to-refresh, swipeable-list-item
- [x] Skeletons: driver, history, notifications, profile, social, tracking, wallet
- [x] Auth: facial-verification, voice-assistant-button, permission-onboarding
- [x] Social: referral-card, referral-client
- [x] Admin: admin-header, admin-sidebar
- [x] Providers: client-providers, fcm-provider, theme-provider, app-initializer

### UI shadcn/ui (54 em /components/ui/)
- [x] Todos os primitivos Radix UI + extras: confetti, expandable-tabs, morphing-spinner

### iOS Components (31 em /components/ui/ios-*)
- [x] 31 componentes iOS: action-sheet, alert-dialog, avatar, back-button, badge,
  bottom-sheet, button, button-group, card, chevron, chip, context-menu, date-picker,
  fab, input-enhanced, list-item, loading-screen, navigation-bar, notification-banner,
  page-transition, picker-wheel, progress, pull-refresh, search-bar, segmented-control,
  sheet, skeleton, slider, switch, tabs, toast-advanced

---

## 7. Hooks (12 em /hooks/)

- [x] use-auth.ts — sessao Supabase + perfil
- [x] use-fcm.ts — Firebase Cloud Messaging
- [x] use-geolocation.ts — geolocalizacao
- [x] use-google-maps.ts — loader Google Maps
- [x] use-haptic.ts — haptic feedback (7 padroes)
- [x] use-mobile.tsx — breakpoint 768px
- [x] use-places-autocomplete.ts — Places API
- [x] use-pull-to-refresh.ts — pull to refresh
- [x] use-swipe.ts — gestos swipe
- [x] use-swipe-actions.ts — acoes em lista
- [x] use-toast.ts — toast shadcn
- [x] use-voice-assistant.ts — Speech Recognition pt-BR

---

## 8. Services (13 em /lib/services/)

- [x] auth-service.ts — autenticacao e perfil
- [x] chat-service.ts — mensagens
- [x] favorites-service.ts — enderecos favoritos
- [x] geolocation-service.ts — geocodificacao
- [x] history-service.ts — historico de corridas
- [x] notification-service.ts — notificacoes in-app
- [x] payment-service.ts — pagamentos (tabelas corretas)
- [x] profile-service.ts — dados do perfil
- [x] realtime-service.ts — Supabase Realtime (8 tabelas)
- [x] review-service.ts — avaliacoes (rater_id/rated_id corretos)
- [x] ride-service.ts — logica de corridas (leilao reverso)
- [x] storage-service.ts — upload de arquivos
- [x] tracking-service.ts — rastreamento GPS

---

## 9. Variaveis de Ambiente

| Variavel | Status |
|---------|--------|
| NEXT_PUBLIC_SUPABASE_URL | Configurado |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Configurado |
| SUPABASE_SERVICE_ROLE_KEY | Configurado |
| NEXT_PUBLIC_GOOGLE_MAPS_API_KEY | Configurado |
| RESEND_API_KEY | Configurado (email de relatorio) |
| CRON_SECRET | Pendente (opcional — webhooks) |
| TWILIO_ACCOUNT_SID | Pendente (opcional — SMS) |
| TWILIO_AUTH_TOKEN | Pendente (opcional — SMS) |
| TWILIO_PHONE_NUMBER | Pendente (opcional — SMS) |

---

## 10. Proximos Passos

1. Deploy Vercel — redeploy apos correcao das APIs
2. Testes E2E: auth -> home -> corrida -> oferta -> pagamento -> avaliacao
3. Configurar dominio personalizado
4. TWA para Google Play Store (docs/06-deploy/PLAY-STORE.md)
5. Configurar Twilio para SMS (opcional)
6. Habilitar RLS em: driver_profiles, rides, ratings, coupon_uses, wallet_transactions

---

**Atualizado em 02/03/2026** — banco verificado via Supabase SQL, APIs corrigidas
