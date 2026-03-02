# UPPI - Conexao Supabase

**Data da Conexao:** 02/03/2026
**Projeto Supabase (anterior):** pjlbixnzjndezoscbhej (supabase-amber-door)
**Projeto Supabase (atual):** nhdupekrvafpqlsbpznq
**Integration Instance:** supabase-gray-book
**URL:** https://nhdupekrvafpqlsbpznq.supabase.co
**Status:** ATIVO - schema completamente aplicado (4 migrations — 02/03/2026)

---

## Migrations Aplicadas

| # | Nome | Tabelas Criadas | Status |
|---|------|----------------|--------|
| 1 | 001_core_tables | profiles, driver_profiles, rides, price_offers, messages, ratings, favorites, notifications | Aplicada |
| 2 | 002_location_wallet_social | driver_locations, ride_tracking, ride_stops, location_history, hot_zones, user_wallets, wallet_transactions, payments, coupons, coupon_uses, user_coupons, social_posts, social_post_likes, post_comments, social_follows, user_social_stats, user_achievements, referral_achievements, leaderboard, rating_categories | Aplicada |
| 3 | 003_driver_security_support | driver_verifications, vehicles, drivers, driver_route_segments, emergency_contacts, emergency_alerts, ride_recordings, recording_consents, user_recording_preferences, group_rides, group_ride_participants, scheduled_rides, ride_offers, support_tickets, support_messages, referrals, subscriptions, promotions, sms_templates, sms_deliveries, sms_logs, webhook_endpoints, webhook_deliveries, admin_logs, error_logs, system_settings, push_subscriptions, notification_preferences, user_sms_preferences, user_onboarding | Aplicada |
| 4 | 004_routes_reviews_misc | popular_routes, driver_popular_routes, route_history, address_search_history, reviews, driver_reviews, rating_helpful_votes, rating_reports, reports, pricing_rules, avatars, users, campaigns, faqs, legal_documents + 15 RPCs | Aplicada |

---

## Resumo do Schema (verificado via supabase_list_tables em 02/03/2026)

| Metrica | Valor |
|---------|-------|
| Tabelas no schema public | **74** |
| RLS habilitado | Em todas as 74 tabelas |
| Triggers updated_at | Em todas as tabelas com updated_at |
| Trigger on_auth_user_created | Ativo (cria profile automatico no signup) |
| Realtime publicado | 8 tabelas |
| RPC Functions | 15 |
| Seed system_settings | 6 registros (tarifas) |
| Seed pricing_rules | 6 tipos de veiculo |
| Seed rating_categories | 4 categorias |

---

## Tabelas com Realtime Publicado

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.rides;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.price_offers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.driver_locations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ride_tracking;
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ride_offers;
```

---

## Variaveis de Ambiente Necessarias

| Variavel | Status | Uso |
|---------|--------|-----|
| NEXT_PUBLIC_SUPABASE_URL | Configurado via integração | Cliente browser |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Configurado via integração | Cliente browser (RLS) |
| SUPABASE_SERVICE_ROLE_KEY | Configurado via integração | Admin (bypassar RLS) |
| NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL | Opcional | Redirect apos login em dev |

---

## Clientes Supabase no Codigo

| Arquivo | Tipo | Uso |
|---------|------|-----|
| lib/supabase/client.ts | Browser client | Componentes cliente (use-auth, etc.) |
| lib/supabase/server.ts | Server client | Route handlers, Server Components |
| lib/supabase/admin.ts | Service role | Admin operations (bypass RLS) |
| proxy.ts | Middleware | Refresh token, protecao de rotas |

---

## Funcoes RPC Ativas (15)

| Funcao | Assinatura | Uso |
|--------|-----------|-----|
| find_nearby_drivers | (pickup_lat, pickup_lng, radius_km, vehicle_type_filter) | Busca motoristas proximos |
| calculate_wallet_balance | (user_id) | Saldo da carteira |
| update_user_rating | (user_id) | Recalcula rating do perfil |
| get_driver_stats | (driver_id) | Estatisticas do motorista |
| get_ride_with_details | (ride_id) | Corrida com joins |
| needs_facial_verification | (driver_id) | Verificacao facial necessaria |
| update_driver_location | (driver_id, lat, lng, heading, speed) | Upsert GPS |
| get_platform_stats | () | Estatisticas globais |
| get_user_stats | (user_id) | Estatisticas do usuario |
| get_social_feed | (user_id, limit, offset) | Feed social |
| get_leaderboard | (period, metric, limit) | Ranking |
| get_hot_zones | (lat, lng, radius) | Zonas de demanda |
| respond_to_rating | (rating_id, response) | Responder avaliacao |
| get_category_ratings | (user_id) | Ratings por categoria |
| accept_price_offer | (offer_id, ride_id) | Aceitar oferta atomicamente |

---

## Historico de Projetos Supabase

| Data | Projeto | Instance | Status |
|------|---------|----------|--------|
| 02/03/2026 | pjlbixnzjndezoscbhej | supabase-amber-door | Encerrado / Migrado |
| 02/03/2026 | nhdupekrvafpqlsbpznq | supabase-gray-book  | **ATUAL — Ativo** |

---

**Ultima atualizacao:** 02/03/2026 — Migrado para supabase-gray-book (nhdupekrvafpqlsbpznq), 4 migrations aplicadas, schema operacional
