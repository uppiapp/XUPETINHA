# UPPI - Schema do Banco de Dados

**Ultima Atualizacao:** 01/03/2026
**Versao:** 12.0
**Banco:** Supabase PostgreSQL 15+ com PostGIS
**Tabelas ativas (verificadas em 01/03/2026):** 11 tabelas no schema public
**Tabelas planejadas (schema alvo):** 73 tabelas (ver secao 2 para todas)
**RLS Policies ativas:** 16 (verificadas via pg_policies)
**Indexes ativos:** 17 (verificados via pg_indexes)

> **Nota importante:** O schema alvo completo (73 tabelas, 98+ RLS, 45+ RPC) esta documentado abaixo.
> O estado real do banco em 01/03/2026 possui 11 tabelas ativas. As demais serao criadas via migrations conforme funcionalidades forem ativadas.

---

## 0. Estado Real do Banco em 01/03/2026

### Tabelas existentes no schema public

| Tabela              | Colunas | RLS ativa | Notas                                    |
|---------------------|---------|-----------|------------------------------------------|
| `profiles`          | 12      | Sim (5)   | PK=id (FK auth.users), UNIQUE email      |
| `driver_profiles`   | 19      | Nao       | PK=id, GPS lat/lng, is_available, rating |
| `rides`             | 20      | Nao       | PK=id, status default 'searching'        |
| `payments`          | 12      | Sim (2)   | PK=id, status default 'pending'          |
| `notifications`     | 8       | Sim (1)   | PK=id, type default 'info'               |
| `coupons`           | 13      | Sim (2)   | PK=id, UNIQUE code, discount_type        |
| `coupon_uses`       | 6       | Nao       | UNIQUE (coupon_id, user_id)              |
| `reviews`           | 7       | Nao       | PK=id, rating inteiro 1-5                |
| `error_logs`        | 8       | Sim (3)   | PK=id, level default 'error', metadata jsonb |
| `system_settings`   | 5       | Sim (1)   | PK=key (text), 6 registros ativos        |
| `webhook_endpoints` | 11      | Sim (2)   | PK=id, secret gerado automaticamente     |

### Campos detalhados por tabela

### Campos detalhados por tabela

#### profiles
| Coluna | Tipo | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | — |
| email | text | NO | — |
| full_name | text | YES | — |
| phone | text | YES | — |
| avatar_url | text | YES | — |
| user_type | text | YES | 'passenger' |
| is_admin | boolean | NO | false |
| is_banned | boolean | NO | false |
| banned_at | timestamptz | YES | — |
| ban_reason | text | YES | — |
| created_at | timestamptz | YES | now() |
| updated_at | timestamptz | YES | now() |

#### driver_profiles
| Coluna | Tipo | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | — |
| vehicle_brand | text | YES | — |
| vehicle_model | text | YES | — |
| vehicle_plate | text | YES | — |
| vehicle_color | text | YES | — |
| vehicle_type | text | YES | 'standard' |
| vehicle_year | integer | YES | — |
| is_verified | boolean | NO | false |
| is_available | boolean | NO | false |
| current_lat | float8 | YES | — |
| current_lng | float8 | YES | — |
| total_earnings | numeric | YES | 0 |
| rating | numeric | YES | 5.0 |
| total_rides | integer | YES | 0 |
| cnh_number | text | YES | — |
| cnh_expiry | date | YES | — |
| document_url | text | YES | — |
| created_at | timestamptz | YES | now() |
| updated_at | timestamptz | YES | now() |

#### rides
| Coluna | Tipo | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| passenger_id | uuid | YES | — |
| driver_id | uuid | YES | — |
| pickup_address | text | YES | — |
| dropoff_address | text | YES | — |
| pickup_lat | float8 | YES | — |
| pickup_lng | float8 | YES | — |
| dropoff_lat | float8 | YES | — |
| dropoff_lng | float8 | YES | — |
| distance_km | numeric | YES | — |
| estimated_duration_minutes | integer | YES | — |
| passenger_price_offer | numeric | YES | — |
| final_price | numeric | YES | 0 |
| status | text | NO | 'searching' |
| payment_method | text | YES | 'pix' |
| created_at | timestamptz | YES | now() |
| started_at | timestamptz | YES | — |
| completed_at | timestamptz | YES | — |
| cancelled_at | timestamptz | YES | — |
| cancellation_reason | text | YES | — |

#### payments
| Coluna | Tipo | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| ride_id | uuid | YES | — |
| passenger_id | uuid | YES | — |
| driver_id | uuid | YES | — |
| amount | numeric | NO | 0 |
| platform_fee | numeric | YES | 0 |
| driver_earnings | numeric | YES | 0 |
| status | text | NO | 'pending' |
| payment_method | text | YES | 'pix' |
| gateway_transaction_id | text | YES | — |
| created_at | timestamptz | YES | now() |
| paid_at | timestamptz | YES | — |

#### system_settings
| Coluna | Tipo | Nullable | Default |
|--------|------|----------|---------|
| key | text | NO | — (PK) |
| value | text | NO | — |
| description | text | YES | — |
| updated_at | timestamptz | YES | now() |
| updated_by | uuid | YES | — |

#### coupons
| Coluna | Tipo | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| code | text | NO | — (UNIQUE) |
| description | text | YES | — |
| discount_type | text | NO | 'percentage' |
| discount_value | numeric | NO | — |
| min_ride_value | numeric | YES | 0 |
| max_discount | numeric | YES | — |
| max_uses | integer | YES | 100 |
| used_count | integer | YES | 0 |
| is_active | boolean | NO | true |
| expires_at | timestamptz | YES | — |
| created_by | uuid | YES | — |
| created_at | timestamptz | YES | now() |

#### webhook_endpoints
| Coluna | Tipo | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| url | text | NO | — |
| events | text[] | NO | '{}' |
| secret | text | NO | encode(gen_random_bytes(32),'hex') |
| is_active | boolean | NO | true |
| last_triggered_at | timestamptz | YES | — |
| last_status_code | integer | YES | — |
| total_deliveries | integer | YES | 0 |
| failed_deliveries | integer | YES | 0 |
| created_by | uuid | YES | — |
| created_at | timestamptz | YES | now() |

---

## 1. Enums (Tipos Customizados — schema alvo)

```sql
-- Tipo de usuario
user_type: 'passenger' | 'driver' | 'both'

-- Status da corrida
ride_status: 'pending' | 'negotiating' | 'accepted' | 'in_progress' | 'completed' | 'cancelled'

-- Status da oferta de preco
offer_status: 'pending' | 'accepted' | 'rejected' | 'expired'

-- Metodo de pagamento
payment_method: 'cash' | 'credit_card' | 'debit_card' | 'pix' | 'wallet'

-- Tipo de veiculo
vehicle_type: 'economy' | 'electric' | 'premium' | 'suv' | 'moto'

-- Tipo de transacao da carteira
transaction_type: 'credit' | 'debit' | 'refund' | 'cashback' | 'withdrawal' | 'bonus' | 'transfer'

-- Status de emergencia
emergency_status: 'active' | 'resolved' | 'false_alarm'

-- Status de suporte
support_status: 'open' | 'in_progress' | 'resolved' | 'closed'
```

---

## 2. Tabelas por Dominio (73 tabelas no total)

### 2.1 Nucleo - Usuarios e Corridas (8 tabelas)

| Tabela | Colunas Principais | Descricao |
|--------|-------------------|-----------|
| `profiles` | id, full_name, phone, avatar_url, user_type, rating, total_rides | Perfil do usuario — FK para auth.users |
| `driver_profiles` | id, license_number, vehicle_type, vehicle_brand, vehicle_model, vehicle_year, vehicle_plate, vehicle_color, is_verified, is_available, current_lat, current_lng | Dados do motorista |
| `rides` | id, passenger_id, driver_id, pickup_lat/lng/address, dropoff_lat/lng/address, distance_km, estimated_duration_minutes, passenger_price_offer, final_price, payment_method, status, scheduled_time, started_at, completed_at, cancelled_at | Corridas (ciclo completo) |
| `price_offers` | id, ride_id, driver_id, offered_price, message, status, expires_at | Lances dos motoristas |
| `messages` | id, ride_id, sender_id, receiver_id, content, is_read, read_at | Chat da corrida |
| `ratings` | id, ride_id, reviewer_id, reviewed_id, rating (1-5), comment, tags[] | Avaliacoes simples |
| `notifications` | id, user_id, title, message, type, data (jsonb), read | Notificacoes in-app |
| `favorites` | id, user_id, favorite_user_id | Motoristas/passageiros favoritos |

### 2.2 Localizacao e Rastreamento (5 tabelas)

| Tabela | Colunas Principais | Descricao |
|--------|-------------------|-----------|
| `driver_locations` | id, driver_id, latitude, longitude, heading, speed, accuracy, location (geography), is_available | Localizacao atual do motorista |
| `ride_tracking` | id, ride_id, driver_id, latitude, longitude, speed, heading, accuracy, timestamp | Historico GPS da corrida |
| `ride_stops` | id, ride_id, address, latitude, longitude, stop_order, arrival_time, departure_time | Paradas intermediarias |
| `location_history` | id, user_id, latitude, longitude, accuracy, timestamp | Historico de localizacao do usuario |
| `hot_zones` | id, name, latitude, longitude, radius, danger_level, is_active | Zonas de alta demanda |

### 2.3 Financeiro (5 tabelas)

| Tabela | Colunas Principais | Descricao |
|--------|-------------------|-----------|
| `user_wallets` | id, user_id, balance, reserved_balance | Carteira digital |
| `wallet_transactions` | id, wallet_id, type, amount, balance_before, balance_after, description, reference_id | Transacoes da carteira |
| `payments` | id, ride_id, amount, payment_method, status, transaction_id | Pagamentos de corridas |
| `coupons` | id, code (UNIQUE), description, discount_type, discount_value, min_ride_value, max_discount, usage_limit, usage_count, valid_from, valid_until, is_active | Cupons de desconto |
| `coupon_usage` | id, coupon_id, user_id, ride_id, discount_applied | Uso de cupons |
| `user_coupons` | id, user_id, coupon_id, used, used_at, ride_id | Cupons vinculados ao usuario |

### 2.4 Motorista - Documentos e Verificacao (4 tabelas)

| Tabela | Colunas Principais | Descricao |
|--------|-------------------|-----------|
| `driver_documents` | id, driver_id, document_type ('drivers_license','vehicle_registration','insurance','background_check','profile_photo','vehicle_photo'), document_url, status ('pending','approved','rejected'), rejection_reason, verified_at, expires_at | Documentos enviados |
| `driver_verifications` | id, driver_id, verification_type, status, submitted_at, reviewed_at, reviewed_by, notes, documents (jsonb) | Processo de verificacao |
| `vehicles` | id, driver_id, make, model, year, color, license_plate (UNIQUE), vehicle_type, seats, is_active | Veiculos cadastrados |
| `driver_route_segments` | id, driver_id, start_lat/lng, end_lat/lng, frequency, last_used | Segmentos de rota frequentes |

### 2.5 Social e Gamificacao (8 tabelas)

| Tabela | Colunas Principais | Descricao |
|--------|-------------------|-----------|
| `social_posts` | id, user_id, content, ride_id, image_url, likes_count, comments_count | Feed social |
| `social_post_likes` | id, post_id, user_id | Curtidas em posts |
| `social_post_comments` | id, post_id, user_id, content | Comentarios em posts |
| `social_follows` | id, follower_id, following_id | Sistema de seguir usuarios |
| `user_social_stats` | id, user_id, followers_count, following_count, posts_count, likes_received | Estatisticas sociais |
| `achievements` | id, name, description, type, icon, points, requirement_value | Catalogo de conquistas |
| `user_achievements` | id, user_id, achievement_id, unlocked_at | Conquistas desbloqueadas |
| `user_streaks` | id, user_id, current_streak, longest_streak, last_activity_date, total_active_days | Sequencias de uso |
| `leaderboard` | id, user_id, period, metric, value, rank | Ranking por periodo/metrica |

### 2.6 Avaliacoes Avancadas (5 tabelas)

| Tabela | Colunas Principais | Descricao |
|--------|-------------------|-----------|
| `enhanced_reviews` | id, ride_id, reviewer_id, reviewed_id, overall_rating (1-5), comment, is_anonymous | Avaliacoes detalhadas |
| `driver_reviews` | id, review_id, cleanliness_rating, driving_rating, punctuality_rating, communication_rating | Sub-avaliacoes do motorista |
| `review_tags` | id, review_id, tag | Tags de avaliacao |
| `rating_categories` | id, review_id, category, rating (1-5) | Categorias de avaliacao |
| `reviews` | id, ride_id, reviewer_id, reviewed_id, rating (1-5), comment | Avaliacoes simples (legado) |
| `rating_helpful_votes` | id, rating_id, user_id, is_helpful | Votos de utilidade em avaliacao |
| `rating_reports` | id, rating_id, reporter_id, reason, status | Denuncias de avaliacao |

### 2.7 Seguranca (3 tabelas)

| Tabela | Colunas Principais | Descricao |
|--------|-------------------|-----------|
| `emergency_contacts` | id, user_id, name, phone, relationship | Contatos de emergencia |
| `emergency_alerts` | id, user_id, ride_id, location_lat/lng, status, description, resolved_at, resolved_by | Alertas SOS |
| `ride_recordings` | id, ride_id, recorded_by, recording_type ('audio','video','gps_track'), file_url, duration_seconds, status, delete_at | Gravacoes de corridas |
| `recording_consents` | id, ride_id, user_id, consent_given, consent_type | Consentimentos de gravacao |
| `user_recording_preferences` | id, user_id, allow_recording, auto_delete_days, notify_when_recording | Preferencias de gravacao |

### 2.8 Corridas Especiais (3 tabelas)

| Tabela | Colunas Principais | Descricao |
|--------|-------------------|-----------|
| `group_rides` | id, organizer_id, ride_id, pickup_location/address, dropoff_location/address, max_participants (4), current_participants, price_per_person, status, departure_time | Corridas compartilhadas |
| `group_ride_participants` | id, group_ride_id, user_id, status ('pending','confirmed','cancelled') | Participantes do grupo |
| `scheduled_rides` | id, user_id, pickup_location/address, dropoff_location/address, scheduled_time, vehicle_type, status, ride_id, estimated_price, notes | Corridas agendadas |

### 2.9 Configuracoes do Usuario (5 tabelas)

| Tabela | Colunas Principais | Descricao |
|--------|-------------------|-----------|
| `user_settings` | id, user_id, notification_preferences (jsonb), privacy_settings (jsonb), language ('pt-BR'), theme ('light','dark','system'), accessibility (jsonb) | Configuracoes gerais |
| `notification_preferences` | id, user_id, push_enabled, email_enabled, sms_enabled, ride_updates, promotional, chat_messages, payment_updates, driver_arrival, trip_completed | Preferencias de notificacao |
| `user_sms_preferences` | id, user_id, ride_updates, marketing, security_alerts | Preferencias de SMS |
| `user_onboarding` | id, user_id, step, completed, data (jsonb) | Estado do onboarding |
| `fcm_tokens` | id, user_id, token (UNIQUE), device_type ('ios','android','web'), device_id, is_active, last_used_at | Tokens Firebase FCM |

### 2.10 Suporte (2 tabelas)

| Tabela | Colunas Principais | Descricao |
|--------|-------------------|-----------|
| `support_tickets` | id, user_id, subject, description, status, priority, category, assigned_to, resolved_at | Tickets de suporte |
| `support_messages` | id, ticket_id, user_id, message, is_staff | Mensagens do ticket |

### 2.11 Indicacoes (2 tabelas)

| Tabela | Colunas Principais | Descricao |
|--------|-------------------|-----------|
| `referrals` | id, referrer_id, referred_id (UNIQUE), referral_code | Programa de indicacao |
| `referral_rewards` | id, referral_id, user_id, amount, reason, awarded_at | Recompensas por indicacao |

### 2.12 Assinaturas e Promocoes (2 tabelas)

| Tabela | Colunas Principais | Descricao |
|--------|-------------------|-----------|
| `subscriptions` | id, user_id, plan_type ('free','silver','gold','platinum'), status, start_date, end_date, auto_renew, price, features (jsonb) | Club Uppi |
| `promotions` | id, title, description, discount_percentage, discount_amount, start_date, end_date, is_active, target_users (jsonb) | Promocoes |

### 2.13 Rotas e Historico (4 tabelas)

| Tabela | Colunas Principais | Descricao |
|--------|-------------------|-----------|
| `popular_routes` | id, start_address, end_address, start/end_lat/lng, usage_count, avg_price, avg_duration | Rotas mais usadas |
| `driver_popular_routes` | id, driver_id, route_id, frequency, last_used, avg_earnings | Rotas favoritas do motorista |
| `route_history` | id, user_id, ride_id, start_location (jsonb), end_location (jsonb), distance, duration | Historico de rotas |
| `address_search_history` | id, user_id, address, latitude, longitude, search_type | Historico de buscas |

### 2.14 SMS (3 tabelas)

| Tabela | Colunas Principais | Descricao |
|--------|-------------------|-----------|
| `sms_templates` | id, name (UNIQUE), content, variables (jsonb), is_active | Templates de SMS |
| `sms_deliveries` | id, user_id, phone_number, message, status, provider, provider_message_id, sent_at, delivered_at | Envios de SMS |
| `sms_logs` | id, delivery_id, status, message, metadata (jsonb) | Logs de SMS |

### 2.15 Admin e Infraestrutura (4 tabelas)

| Tabela | Colunas Principais | Descricao |
|--------|-------------------|-----------|
| `admin_logs` | id, admin_id, action, resource_type, resource_id, details (jsonb), ip_address, user_agent | Auditoria de acoes admin |
| `pricing_rules` | id, name, rule_type, vehicle_type, base_price, price_per_km, price_per_minute, min_price, multiplier, conditions (jsonb), active, priority | Regras de precificacao |
| `webhook_endpoints` | id, url, events[], is_active, secret, description | Endpoints de webhook |
| `webhook_deliveries` | id, webhook_id, event_type, payload (jsonb), status, response_code, attempts, max_attempts, next_retry_at, delivered_at | Entregas de webhook |
| `avatars` | id, user_id (UNIQUE), url, file_path, file_size, mime_type | Avatares dos usuarios |
| `spatial_ref_sys` | srid, auth_name, auth_srid, srtext, proj4text | Sistemas de referencia espacial (PostGIS) |

---

## 3. Queries PostGIS

### 3.1 Buscar motoristas proximos

```sql
-- Funcao RPC no Supabase
SELECT
  dp.id,
  p.full_name,
  p.rating,
  dp.vehicle_type,
  dp.vehicle_brand,
  dp.vehicle_model,
  dp.vehicle_color,
  dp.vehicle_plate,
  dp.current_lat,
  dp.current_lng,
  ST_Distance(
    ST_SetSRID(ST_MakePoint(dp.current_lng, dp.current_lat), 4326)::geography,
    ST_SetSRID(ST_MakePoint(:user_lng, :user_lat), 4326)::geography
  ) as distance_meters
FROM driver_profiles dp
JOIN profiles p ON p.id = dp.id
WHERE dp.is_available = true
  AND dp.is_verified = true
ORDER BY distance_meters ASC
LIMIT 20;
```

### 3.2 Atualizar localizacao do motorista

```sql
UPDATE driver_profiles
SET
  current_lat = :latitude,
  current_lng = :longitude,
  updated_at = NOW()
WHERE id = :driver_id;

INSERT INTO driver_locations (driver_id, latitude, longitude, heading, speed, is_available)
VALUES (:driver_id, :latitude, :longitude, :heading, :speed, :is_available)
ON CONFLICT (driver_id) DO UPDATE
SET latitude = EXCLUDED.latitude,
    longitude = EXCLUDED.longitude,
    heading = EXCLUDED.heading,
    speed = EXCLUDED.speed,
    last_updated = NOW();
```

---

## 4. Supabase Realtime

### Tabelas com Realtime habilitado
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE rides;
ALTER PUBLICATION supabase_realtime ADD TABLE price_offers;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
```

### Channels usados no codigo
| Channel | Tabela | Evento | Uso |
|---------|--------|--------|-----|
| `offers-{rideId}` | price_offers | INSERT | Passageiro recebe ofertas em tempo real |
| `chat-{rideId}` | messages | INSERT/UPDATE | Chat bidirecional |
| `rides-{vehicleType}` | rides | INSERT | Motorista ve novas corridas disponiveis |
| `notifications-{userId}` | notifications | INSERT | Notificacoes em tempo real |
| `admin-rides` | rides | ALL | Monitor do painel admin |

---

## 5. Fluxo Principal de Corrida

```
profiles (passenger) → rides (pending)
  → price_offers INSERT (motoristas lancam)
  → rides (negotiating)
  → price_offers (accepted) → rides (accepted)
  → ride_tracking INSERT (GPS em tempo real)
  → rides (in_progress → completed)
  → payments INSERT
  → ratings / enhanced_reviews INSERT
  → wallet_transactions INSERT (motorista recebe)
```

---

> Versao atual: 24/02/2026 — 73 tabelas documentadas (schema exportado diretamente do Supabase)
