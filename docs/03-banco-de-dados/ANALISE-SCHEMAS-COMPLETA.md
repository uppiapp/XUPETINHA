# Analise Completa de Todos os Schemas — Supabase UPPI

**Data:** 02/03/2026
**Projeto:** nhdupekrvafpqlsbpznq (supabase-gray-book) — migrado de pjlbixnzjndezoscbhej (supabase-amber-door) em 02/03/2026
**Verificado via SQL:** SELECT direto no banco em 02/03/2026

---

## Resumo Executivo

| Schema | Tabelas | Descricao | Gerenciado por |
|--------|---------|-----------|----------------|
| public | 74 | Dominio da aplicacao UPPI | Nos (4 migrations) |
| pg_catalog | 64 | Sistema interno do PostgreSQL | PostgreSQL |
| auth | 21 | Autenticacao e sessoes | Supabase Auth |
| storage | 8 | Arquivos e buckets | Supabase Storage |
| information_schema | 4 | Views do sistema SQL | PostgreSQL |
| realtime | 3 | Pub/Sub em tempo real | Supabase Realtime |
| supabase_migrations | 1 | Controle de versao do banco | Supabase CLI / v0 |
| vault | 1 | Segredos criptografados | Supabase Vault |
| **TOTAL** | **176** | Verificado via SQL | |

---

## 1. Schema: public (74 tabelas — Dominio UPPI)

### Tabelas por categoria

| Categoria | Tabelas |
|-----------|---------|
| Usuarios e Perfis | profiles, driver_profiles, users, avatars, drivers |
| Corridas | rides, price_offers, ride_offers, ride_stops, ride_tracking, scheduled_rides |
| Localizacao | driver_locations, location_history, hot_zones, driver_route_segments |
| Comunicacao | messages, notifications, notification_preferences |
| Pagamentos e Carteira | user_wallets, wallet_transactions, payments, coupons, coupon_uses, user_coupons |
| Social e Gamificacao | social_posts, social_post_likes, post_comments, social_follows, user_social_stats, user_achievements, referral_achievements, leaderboard |
| Avaliacoes | ratings, rating_categories, rating_helpful_votes, rating_reports, reviews, driver_reviews, reports |
| Motorista | driver_verifications, vehicles |
| Seguranca | emergency_contacts, emergency_alerts, ride_recordings, recording_consents, user_recording_preferences |
| Corridas em Grupo | group_rides, group_ride_participants |
| Suporte | support_tickets, support_messages |
| Referrals e Assinaturas | referrals, subscriptions |
| Promocoes e Marketing | promotions, coupons, campaigns |
| SMS | sms_templates, sms_deliveries, sms_logs, user_sms_preferences |
| Webhooks | webhook_endpoints, webhook_deliveries |
| Admin e Logs | admin_logs, error_logs |
| Configuracoes | system_settings, pricing_rules |
| Push Notifications | push_subscriptions |
| Onboarding | user_onboarding |
| Rotas | popular_routes, driver_popular_routes, route_history, address_search_history |
| Legal | faqs, legal_documents |
| PostGIS (sistema) | spatial_ref_sys |

### RLS Policies (145 policies em 74 tabelas — schema public)

| Tabela | Policies | Tabela | Policies |
|--------|----------|--------|----------|
| rides | 6 | driver_profiles | 5 |
| profiles | 5 | subscriptions | 4 |
| social_posts | 4 | post_comments | 3 |
| social_post_likes | 3 | driver_verifications | 3 |
| emergency_alerts | 3 | driver_reviews | 3 |
| reports | 3 | ride_recordings | 3 |
| support_tickets | 3 | wallet_transactions | 3 |
| group_ride_participants | 3 | user_achievements | 3 |
| price_offers | 3 | ... (demais com 1-2 policies) | |

**Total: 145 RLS policies ativas — todas as 74 tabelas do schema public com RLS protegidas**

### Triggers no schema public (20 triggers)

| Trigger | Tabela | Evento | Timing |
|---------|--------|--------|--------|
| set_profiles_updated_at | profiles | UPDATE | BEFORE |
| set_driver_profiles_updated_at | driver_profiles | UPDATE | BEFORE |
| set_rides_updated_at | rides | UPDATE | BEFORE |
| set_price_offers_updated_at | price_offers | UPDATE | BEFORE |
| set_social_posts_updated_at | social_posts | UPDATE | BEFORE |
| on_post_like_insert | social_post_likes | INSERT | AFTER |
| on_post_like_delete | social_post_likes | DELETE | AFTER |
| on_post_comment_insert | post_comments | INSERT | AFTER |
| set_support_tickets_updated_at | support_tickets | UPDATE | BEFORE |
| set_system_settings_updated_at | system_settings | UPDATE | BEFORE |
| set_vehicles_updated_at | vehicles | UPDATE | BEFORE |
| set_driver_verif_updated_at | driver_verifications | UPDATE | BEFORE |
| set_legal_docs_updated_at | legal_documents | UPDATE | BEFORE |
| set_notif_prefs_updated_at | notification_preferences | UPDATE | BEFORE |
| set_popular_routes_updated_at | popular_routes | UPDATE | BEFORE |
| set_pricing_rules_updated_at | pricing_rules | UPDATE | BEFORE |
| set_rec_prefs_updated_at | user_recording_preferences | UPDATE | BEFORE |
| set_user_onboarding_updated_at | user_onboarding | UPDATE | BEFORE |
| set_user_sms_prefs_updated_at | user_sms_preferences | UPDATE | BEFORE |
| set_webhooks_updated_at | webhook_endpoints | UPDATE | BEFORE |

### Funcoes RPC do dominio (12 callable + 8 trigger/helper)

#### Callable via API (12)
| Funcao | Retorno | Descricao |
|--------|---------|-----------|
| find_nearby_drivers | record (tabular) | Motoristas proximos por lat/lng e raio |
| calculate_wallet_balance | numeric | Saldo da carteira do usuario |
| accept_price_offer | void | Aceita oferta de preco e notifica rejeicao das demais |
| get_driver_stats | jsonb | Estatisticas completas do motorista |
| get_platform_stats | jsonb | Metricas globais da plataforma |
| get_ride_with_details | jsonb | Corrida com dados do passageiro e motorista |
| get_user_stats | jsonb | Estatisticas do usuario (corridas, gasto, conquistas) |
| get_social_feed | record (tabular) | Feed social paginado |
| get_leaderboard | record (tabular) | Ranking por periodo e metrica |
| get_hot_zones | record (tabular) | Zonas de alta demanda proximas |
| get_category_ratings | jsonb | Medias de avaliacoes por categoria |
| respond_to_rating | void | Resposta a uma avaliacao recebida |
| needs_facial_verification | boolean | Verifica se motorista precisa reverificar foto |
| update_driver_location | void | Upsert de localizacao do motorista (lat/lng) |
| update_user_rating | void | Recalcula media de avaliacao do usuario |

#### Trigger helpers (5 funcs de trigger internas)
- update_updated_at_column — atualiza updated_at em todos os triggers BEFORE UPDATE
- handle_new_user — cria profile automaticamente no signup (on_auth_user_created)
- increment_post_likes — incrementa likes_count ao inserir like
- decrement_post_likes — decrementa likes_count ao deletar like
- increment_post_comments — incrementa comments_count ao inserir comentario

### Realtime Publications (8 tabelas publicadas)

| Tabela | Uso |
|--------|-----|
| rides | Atualizacoes de status da corrida em tempo real |
| messages | Chat entre passageiro e motorista |
| notifications | Notificacoes push em tempo real |
| price_offers | Ofertas de preco do motorista |
| ride_offers | Ofertas de corrida |
| ride_tracking | Localizacao do motorista durante a corrida |
| driver_locations | Posicao dos motoristas disponiveis no mapa |
| support_messages | Mensagens de suporte em tempo real |

---

## 2. Schema: auth (21 tabelas — Supabase Auth)

Gerenciado inteiramente pelo Supabase. Nao modificar diretamente.

| Tabela | Colunas | Descricao |
|--------|---------|-----------|
| users | 35 | Usuarios autenticados (email, phone, metadata, confirmado, etc.) |
| sessions | 15 | Sessoes ativas (access_token, refresh_token, user_agent, ip) |
| identities | 9 | Provedores OAuth vinculados ao usuario (google, github, etc.) |
| refresh_tokens | 9 | Tokens de refresh para renovacao de sessao |
| mfa_factors | 13 | Fatores de MFA configurados (TOTP, SMS) |
| mfa_challenges | 7 | Desafios MFA pendentes de verificacao |
| mfa_amr_claims | 5 | Claims AMR dos metodos de autenticacao usados |
| flow_state | 17 | Estado do fluxo OAuth (PKCE, etc.) |
| oauth_clients | 13 | Clientes OAuth registrados |
| oauth_authorizations | 17 | Autorizacoes OAuth ativas |
| oauth_client_states | 4 | Estado temporario de clientes OAuth |
| oauth_consents | 6 | Consentimentos OAuth do usuario |
| custom_oauth_providers | 24 | Provedores OAuth customizados |
| one_time_tokens | 7 | Tokens de uso unico (magic link, email confirm, phone OTP) |
| saml_providers | 9 | Provedores SAML para SSO enterprise |
| saml_relay_states | 8 | Estados de relay SAML |
| sso_providers | 5 | Provedores SSO configurados |
| sso_domains | 5 | Dominios associados a provedores SSO |
| instances | 5 | Instancias do servidor Auth |
| audit_log_entries | 5 | Log de auditoria de acoes de autenticacao |
| schema_migrations | 1 | Controle interno de versao do schema auth |

**Trigger critico (nosso):** on_auth_user_created em auth.users → chama public.handle_new_user() → cria registro em public.profiles automaticamente.

---

## 3. Schema: storage (8 tabelas — Supabase Storage)

Gerenciado pelo Supabase Storage. Nao modificar diretamente.

| Tabela | Colunas | Descricao |
|--------|---------|-----------|
| buckets | 11 | Buckets de armazenamento (nome, publico/privado, limites) |
| objects | 12 | Arquivos armazenados (path, bucket_id, metadata, owner) |
| s3_multipart_uploads | 9 | Uploads multipart S3 em andamento |
| s3_multipart_uploads_parts | 10 | Partes de uploads multipart |
| migrations | 4 | Controle interno de versao do storage |
| buckets_analytics | 7 | Metricas de uso dos buckets |
| buckets_vectors | 4 | Vetores de busca semantica dos buckets |
| vector_indexes | 9 | Indices vetoriais para busca por similaridade |

**Buckets criados:** Nenhum bucket ainda. Recomendacao: criar buckets para avatars, documents e recordings.

---

## 4. Schema: realtime (3 tabelas — Supabase Realtime)

Gerenciado pelo Supabase Realtime.

| Tabela | Colunas | Descricao |
|--------|---------|-----------|
| subscription | 8 | Subscricoes ativas dos clientes (entity, filters, claims, role, action_filter) |
| messages | 8 | Mensagens do canal Realtime Broadcast (topic, extension, payload, event, private) |
| schema_migrations | 2 | Controle interno de versao do schema realtime |

**Como funciona:** O cliente chama supabase.channel('rides').on('postgres_changes',...). O Supabase insere em realtime.subscription com a entity (ex: public.rides), filters e as claims JWT do usuario. O motor do Realtime filtra as mudancas via CDC e envia apenas as linhas autorizadas.

---

## 5. Schema: vault (1 tabela — Supabase Vault)

Extensao supabase_vault v0.3.1 para armazenamento seguro de segredos.

| Tabela | Colunas | Descricao |
|--------|---------|-----------|
| secrets | 8 | Segredos criptografados com AES-GCM (id, name, description, secret, key_id, nonce, created_at, updated_at) |

**Uso recomendado:** Armazenar chaves de API de terceiros (Twilio, Stripe, Google Maps, etc.) usando vault.create_secret() em vez de variaveis de ambiente.

```sql
-- Exemplo de uso do vault
SELECT vault.create_secret('minha-chave-twilio', 'TWILIO_AUTH_TOKEN', 'Token de autenticacao Twilio');
SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'TWILIO_AUTH_TOKEN';
```

---

## 6. Schema: supabase_migrations (1 tabela)

Controle de versao das migrations aplicadas pelo Supabase CLI / v0.

| Tabela | Colunas | Descricao |
|--------|---------|-----------|
| schema_migrations | 6 | version, statements (array), name, created_by, idempotency_key, rollback |

### Migrations aplicadas no projeto UPPI

| Version | Nome | Criado por | Data |
|---------|------|------------|------|
| 20260302200021 | 001_core_tables | limessoare@outlook.com | 02/03/2026 |
| 20260302200119 | 002_location_wallet_social | limessoare@outlook.com | 02/03/2026 |
| 20260302200356 | 003_driver_security_support | limessoare@outlook.com | 02/03/2026 |
| 20260302200508 | 004_routes_reviews_misc | limessoare@outlook.com | 02/03/2026 |

---

## 7. Schema: pg_catalog (64 tabelas — PostgreSQL interno)

Tabelas do sistema interno do PostgreSQL. Nunca modificar diretamente.
Exemplos: pg_class, pg_attribute, pg_index, pg_constraint, pg_trigger, pg_proc, pg_namespace, pg_type, pg_roles, pg_authid, pg_statistic, pg_am, pg_operator, etc.

---

## 8. Schema: information_schema (4 tabelas)

Views padrao SQL para introspecao do banco.
- tables, columns, routines, triggers — usadas para analise e documentacao.

---

## 9. Extensoes Instaladas (7)

| Extensao | Versao | Descricao |
|----------|--------|-----------|
| plpgsql | 1.0 | Linguagem procedural para functions e triggers |
| uuid-ossp | 1.1 | Geracao de UUIDs (gen_random_uuid) |
| postgis | 3.3.7 | Geometria e geografia espacial (ST_Distance, find_nearby_drivers) |
| pgcrypto | 1.3 | Criptografia (usado pelo vault e bcrypt) |
| pg_graphql | 1.5.11 | API GraphQL automatica sobre o schema public |
| pg_stat_statements | 1.11 | Estatisticas de performance de queries |
| supabase_vault | 0.3.1 | Armazenamento seguro de segredos criptografados |

---

## 10. Consolidado Final

| Metrica | Valor |
|---------|-------|
| Tabelas totais (todos schemas) | 176 |
| Tabelas dominio (public) | 74 |
| RLS policies ativas | 145 |
| Triggers ativos (public) | 20 |
| Funcoes RPC callable | 15 |
| Funcoes trigger/helper | 5 |
| Tabelas com Realtime | 8 |
| Migrations aplicadas | 4 |
| Extensoes instaladas | 7 |
| Schemas ativos | 8 |

---

**Gerado em 02/03/2026** — Analise via SQL direto no Supabase nhdupekrvafpqlsbpznq (supabase-gray-book)
