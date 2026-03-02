# UPPI - Schema do Banco de Dados

**Ultima Atualizacao:** 02/03/2026
**Versao:** 14.0
**Banco:** Supabase PostgreSQL 15+ com PostGIS
**Tabelas totais:** 111 (todos os schemas)
**Tabelas no schema public (dominio):** 72
**Tabelas auth (Supabase):** 21
**Tabelas realtime (Supabase):** 8
**Tabelas storage (Supabase):** 8
**RLS Policies:** 98+ ativas
**Funcoes RPC:** 15 ativas
**Indexes:** 60+

---

## 0. Distribuicao de Tabelas por Schema

| Schema | Tabelas | Descricao |
|--------|---------|-----------|
| **public** | **72** | Dominio da aplicacao (perfis, corridas, pagamentos, etc.) |
| auth | 21 | Gerenciadas pelo Supabase Auth (users, sessions, tokens, etc.) |
| realtime | 8 | Gerenciadas pelo Supabase Realtime |
| storage | 8 | Gerenciadas pelo Supabase Storage (objects, buckets, etc.) |
| supabase_migrations | 1 | Controle interno de migracoes |
| vault | 1 | Segredos criptografados |
| **Total geral** | **111** | |

### Schema public — tabelas por grupo (72 total)

| Grupo | Tabelas |
|-------|---------|
| Nucleo | profiles, driver_profiles, rides, price_offers, messages, ratings, notifications, favorites |
| Localizacao | driver_locations, ride_tracking, ride_stops, location_history, hot_zones |
| Financeiro | user_wallets, wallet_transactions, payments, coupons, coupon_uses, user_coupons |
| Motorista | driver_verifications, vehicles, driver_route_segments, drivers |
| Social/Gamificacao | social_posts, social_post_likes, post_comments, social_follows, user_social_stats, leaderboard, user_achievements, referral_achievements |
| Avaliacoes | reviews, driver_reviews, rating_categories, rating_helpful_votes, rating_reports |
| Seguranca | emergency_contacts, emergency_alerts, ride_recordings, recording_consents, user_recording_preferences |
| Corridas Especiais | group_rides, group_ride_participants, scheduled_rides, ride_offers |
| Configuracoes | notification_preferences, user_sms_preferences, user_onboarding, push_subscriptions |
| Suporte | support_tickets, support_messages |
| Indicacoes | referrals |
| Assinaturas | subscriptions, promotions |
| Rotas | popular_routes, driver_popular_routes, route_history, address_search_history |
| SMS | sms_templates, sms_deliveries, sms_logs |
| Admin/Infra | admin_logs, pricing_rules, webhook_endpoints, webhook_deliveries, error_logs, system_settings, avatars, users, campaigns, faqs, legal_documents |

---

## 1. Campos Detalhados por Tabela (principais)

### profiles (15 colunas)
| Coluna | Tipo | Default | Notas |
|--------|------|---------|-------|
| id | uuid | — | PK, FK auth.users |
| email | text | — | UNIQUE |
| full_name | text | — | |
| phone | text | — | |
| avatar_url | text | — | |
| user_type | text | 'passenger' | passenger/driver/admin |
| is_admin | boolean | false | |
| is_banned | boolean | false | |
| banned_at | timestamptz | — | |
| ban_reason | text | — | |
| rating | numeric(3,2) | 5.0 | Media calculada automaticamente |
| total_rides | integer | 0 | Atualizado via update_user_rating() |
| preferences | jsonb | {...} | haptic, animations, dark_mode, language |
| created_at | timestamptz | now() | |
| updated_at | timestamptz | now() | |

### driver_profiles (27 colunas)
| Coluna | Tipo | Default | Notas |
|--------|------|---------|-------|
| id | uuid | — | PK, FK profiles |
| vehicle_brand | text | — | |
| vehicle_model | text | — | |
| vehicle_plate | text | — | |
| vehicle_color | text | — | |
| vehicle_type | text | 'standard' | economy/premium/suv/moto |
| vehicle_year | integer | — | |
| is_verified | boolean | false | |
| is_available | boolean | false | |
| current_lat | float8 | — | Posicao atual |
| current_lng | float8 | — | Posicao atual |
| total_earnings | numeric | 0 | |
| rating | numeric | 5.0 | |
| total_rides | integer | 0 | |
| cnh_number | text | — | |
| cnh_expiry | date | — | |
| document_url | text | — | |
| last_verification_at | timestamptz | — | Ultima verificacao facial |
| verification_photo_url | text | — | |
| verification_status | text | 'pending' | pending/verified/failed/expired |
| requires_verification | boolean | true | |
| verification_attempts | integer | 0 | |
| total_trips | integer | 0 | |
| acceptance_rate | numeric(5,2) | 100.0 | |
| online_hours | numeric(10,2) | 0 | |
| created_at | timestamptz | now() | |
| updated_at | timestamptz | now() | |

### rides (27 colunas)
| Coluna | Tipo | Default | Notas |
|--------|------|---------|-------|
| id | uuid | gen_random_uuid() | PK |
| passenger_id | uuid | — | FK profiles |
| driver_id | uuid | — | FK profiles |
| pickup_address | text | — | |
| dropoff_address | text | — | |
| pickup_lat | float8 | — | |
| pickup_lng | float8 | — | |
| dropoff_lat | float8 | — | |
| dropoff_lng | float8 | — | |
| distance_km | numeric | — | |
| estimated_duration_minutes | integer | — | |
| passenger_price_offer | numeric | — | |
| final_price | numeric | 0 | |
| status | text | 'searching' | searching/negotiating/accepted/in_progress/completed/cancelled |
| payment_method | text | 'pix' | cash/pix/card/wallet |
| vehicle_type | text | 'standard' | |
| notes | text | — | |
| rating_passenger | numeric(3,2) | — | |
| rating_driver | numeric(3,2) | — | |
| has_rated | boolean | false | |
| accepted_at | timestamptz | — | |
| arrived_at | timestamptz | — | |
| started_at | timestamptz | — | |
| completed_at | timestamptz | — | |
| cancelled_at | timestamptz | — | |
| cancellation_reason | text | — | |
| created_at | timestamptz | now() | |

### ratings (18 colunas)
| Coluna | Tipo | Default | Notas |
|--------|------|---------|-------|
| id | uuid | — | PK |
| ride_id | uuid | — | FK rides |
| rater_id | uuid | — | Quem avaliou |
| rated_id | uuid | — | Quem foi avaliado |
| reviewer_id | uuid | — | Alias de rater_id (compatibilidade) |
| reviewed_id | uuid | — | Alias de rated_id (compatibilidade) |
| score | integer | — | 1-5 |
| rating | integer | — | Alias de score (compatibilidade) |
| comment | text | — | |
| tags | text[] | '{}' | |
| category_ratings | jsonb | — | Ex: {"conducao": 5, "pontualidade": 4} |
| is_anonymous | boolean | false | |
| response_text | text | — | Resposta do avaliado |
| response_at | timestamptz | — | |
| is_reported | boolean | false | |
| report_reason | text | — | |
| created_at | timestamptz | now() | |

### wallet_transactions (12 colunas)
| Coluna | Tipo | Default | Notas |
|--------|------|---------|-------|
| id | uuid | — | PK |
| user_id | uuid | — | FK profiles |
| type | text | — | credit/debit/bonus/refund/withdrawal |
| amount | numeric(12,2) | — | |
| balance_after | numeric(12,2) | — | Saldo apos a transacao |
| reference_id | uuid | — | ride_id, etc. |
| reference_type | text | — | ride, withdrawal, bonus, etc. |
| description | text | — | |
| status | text | 'completed' | pending/completed/failed |
| metadata | jsonb | '{}' | Dados extras |
| created_at | timestamptz | now() | |

### user_wallets (8 colunas)
| Coluna | Tipo | Default | Notas |
|--------|------|---------|-------|
| id | uuid | — | PK |
| user_id | uuid | — | FK profiles (UNIQUE) |
| balance | numeric(12,2) | 0 | |
| reserved_balance | numeric(12,2) | 0 | |
| pending_balance | numeric(12,2) | 0 | |
| total_earned | numeric(12,2) | 0 | |
| total_spent | numeric(12,2) | 0 | |
| updated_at | timestamptz | now() | |

### notifications (11 colunas)
| Coluna | Tipo | Default | Notas |
|--------|------|---------|-------|
| id | uuid | — | PK |
| user_id | uuid | — | FK profiles |
| title | text | — | |
| message | text | — | |
| type | text | 'info' | info/warning/success/error |
| data | jsonb | — | |
| is_read | boolean | false | |
| action_url | text | — | URL de acao |
| image_url | text | — | |
| expires_at | timestamptz | — | |
| created_at | timestamptz | now() | |

### support_tickets (12 colunas)
| Coluna | Tipo | Default | Notas |
|--------|------|---------|-------|
| id | uuid | — | PK |
| user_id | uuid | — | FK profiles |
| subject | text | — | |
| description | text | — | |
| status | text | 'open' | open/in_progress/resolved/closed |
| priority | text | 'medium' | |
| category | text | — | |
| assigned_to | uuid | — | FK profiles (admin) |
| resolved_at | timestamptz | — | |
| notes | text | — | |
| created_at | timestamptz | now() | |
| updated_at | timestamptz | now() | |

### user_onboarding (11 colunas)
| Coluna | Tipo | Default | Notas |
|--------|------|---------|-------|
| id | uuid | — | PK |
| user_id | uuid | — | FK profiles |
| step | text | — | |
| completed | boolean | false | |
| data | jsonb | — | |
| step_completed | integer | 0 | |
| completed_at | timestamptz | — | |
| skipped | boolean | false | |
| preferences | jsonb | '{}' | |
| created_at | timestamptz | now() | |
| updated_at | timestamptz | now() | |

---

## 2. Enums (Tipos Customizados)

```sql
-- Tipo de usuario
user_type: 'passenger' | 'driver' | 'admin' | 'both'

-- Status da corrida
ride_status: 'searching' | 'pending' | 'negotiating' | 'accepted' | 'in_progress' | 'completed' | 'cancelled'

-- Status da oferta
offer_status: 'pending' | 'accepted' | 'rejected' | 'expired'

-- Metodo de pagamento
payment_method: 'cash' | 'credit_card' | 'debit_card' | 'pix' | 'wallet'

-- Tipo de veiculo
vehicle_type: 'economy' | 'standard' | 'electric' | 'premium' | 'suv' | 'moto'

-- Tipo de transacao
transaction_type: 'credit' | 'debit' | 'refund' | 'cashback' | 'withdrawal' | 'bonus' | 'transfer'

-- Status de verificacao do motorista
verification_status: 'pending' | 'verified' | 'failed' | 'expired'

-- Status de suporte
support_status: 'open' | 'in_progress' | 'resolved' | 'closed'
```

---

## 3. Funcoes SQL (RPC) — 15 funcoes ativas

| Funcao | Parametros | Retorno | Descricao |
|--------|-----------|---------|-----------|
| `find_nearby_drivers` | lat, lng, radius_km, vehicle_type | TABLE | Motoristas proximos com distancia e ETA |
| `calculate_wallet_balance` | user_id | numeric | Saldo atual da carteira |
| `update_user_rating` | user_id | void | Recalcula rating medio no perfil |
| `get_driver_stats` | driver_id | jsonb | Estatisticas consolidadas do motorista |
| `get_ride_with_details` | ride_id | jsonb | Corrida com todos os joins |
| `needs_facial_verification` | driver_id | boolean | Se precisa de re-verificacao facial |
| `respond_to_rating` | rating_id, response | void | Responder a uma avaliacao |
| `get_category_ratings` | user_id | jsonb | Ratings agrupados por categoria |
| `accept_price_offer` | offer_id, ride_id | void | Aceitar oferta atomicamente |
| `update_driver_location` | driver_id, lat, lng, heading, speed | void | Upsert GPS do motorista |
| `get_platform_stats` | — | jsonb | Estatisticas globais |
| `get_user_stats` | user_id | jsonb | Estatisticas de um usuario |
| `get_social_feed` | user_id, limit, offset | TABLE | Feed social personalizado |
| `get_leaderboard` | period, metric, limit | TABLE | Ranking por periodo/metrica |
| `get_hot_zones` | lat, lng, radius | TABLE | Zonas de alta demanda proximas |

---

## 4. Realtime — 8 tabelas com publicacao ativa

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE rides;
ALTER PUBLICATION supabase_realtime ADD TABLE driver_locations;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE price_offers;
ALTER PUBLICATION supabase_realtime ADD TABLE support_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE ride_tracking;
ALTER PUBLICATION supabase_realtime ADD TABLE ride_offers;
```

### Channels usados no codigo
| Channel | Tabela | Evento | Uso |
|---------|--------|--------|-----|
| `offers-{rideId}` | price_offers | INSERT | Passageiro recebe ofertas em tempo real |
| `chat-{rideId}` | messages | INSERT/UPDATE | Chat bidirecional |
| `rides-{vehicleType}` | rides | INSERT | Motorista ve novas corridas |
| `notifications-{userId}` | notifications | INSERT | Notificacoes push in-app |
| `admin-rides` | rides | ALL | Monitor do painel admin |
| `support-{ticketId}` | support_messages | INSERT | Chat de suporte |
| `tracking-{rideId}` | ride_tracking | INSERT | GPS historico em tempo real |

---

## 5. Indexes de Performance

```sql
-- rides
CREATE INDEX idx_rides_passenger_status ON rides(passenger_id, status);
CREATE INDEX idx_rides_driver_status ON rides(driver_id, status);
CREATE INDEX idx_rides_created_at ON rides(created_at DESC);

-- ratings
CREATE INDEX idx_ratings_reviewed_id ON ratings(reviewed_id);
CREATE INDEX idx_ratings_reviewer_id ON ratings(reviewer_id);
CREATE INDEX idx_ratings_category ON ratings(rated_id) WHERE category_ratings IS NOT NULL;

-- wallet
CREATE INDEX idx_wallet_tx_user_status ON wallet_transactions(user_id, status);

-- notifications
CREATE INDEX idx_notifications_user_read ON notifications(user_id, is_read);

-- driver_locations
CREATE INDEX idx_driver_locations_available ON driver_locations(is_available) WHERE is_available = true;

-- profiles
CREATE INDEX idx_profiles_user_type ON profiles(user_type);

-- driver_profiles
CREATE INDEX idx_driver_profiles_available ON driver_profiles(is_available, is_verified);

-- driver_verifications
CREATE INDEX idx_driver_verifications_created ON driver_verifications(created_at DESC);
```

---

## 6. Queries Principais

### Buscar motoristas proximos (via RPC)
```sql
SELECT * FROM find_nearby_drivers(
  pickup_lat  := -23.5505,
  pickup_lng  := -46.6333,
  radius_km   := 5,
  vehicle_type_filter := NULL
);
```

### Atualizar localizacao do motorista
```sql
-- Usar a funcao RPC
SELECT update_driver_location(
  p_driver_id := :driver_id,
  p_lat       := :latitude,
  p_lng       := :longitude,
  p_heading   := :heading,
  p_speed     := :speed
);
```

### Saldo da carteira
```sql
SELECT calculate_wallet_balance(:user_id);
```

### Estatisticas do motorista
```sql
SELECT get_driver_stats(:driver_id);
```

---

## 7. RLS Policies Ativas (principais)

```sql
-- profiles: usuario ve/edita apenas o proprio perfil
CREATE POLICY "profiles_own" ON profiles FOR ALL
  USING (auth.uid() = id);

-- profiles: admin ve todos
CREATE POLICY "profiles_admin" ON profiles FOR SELECT
  USING (EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

-- rides: passageiro ve suas corridas
CREATE POLICY "rides_passenger" ON rides FOR SELECT
  USING (passenger_id = auth.uid());

-- rides: motorista ve corridas assignadas a ele
CREATE POLICY "rides_driver" ON rides FOR SELECT
  USING (driver_id = auth.uid());

-- notifications: usuario ve apenas as proprias
CREATE POLICY "notifications_own" ON notifications FOR ALL
  USING (user_id = auth.uid());

-- ratings: insert apenas pelo rater_id ou reviewer_id
CREATE POLICY "ratings_own_insert" ON ratings FOR INSERT
  WITH CHECK (rater_id = auth.uid() OR reviewer_id = auth.uid());
```

---

## 8. Fluxo Principal de Corrida

```
profiles (passenger)
  → rides INSERT (status: 'searching')
  → Realtime: rides canal 'rides-{vehicleType}' (motoristas recebem)
  → price_offers INSERT (motoristas lancam precos)
  → Realtime: price_offers canal 'offers-{rideId}' (passageiro recebe)
  → rides UPDATE (status: 'accepted', driver_id definido)
  → ride_tracking INSERT (GPS ao vivo — canal 'tracking-{rideId}')
  → rides UPDATE (status: 'in_progress', accepted_at/arrived_at)
  → rides UPDATE (status: 'completed', completed_at)
  → payments INSERT (processamento do pagamento)
  → ratings INSERT (avaliacao mutua)
  → update_user_rating() (atualiza media do perfil)
```

---

**Atualizado em 02/03/2026** — 111 tabelas totais verificadas via Supabase SQL (72 public + 39 sistema)
