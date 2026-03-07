# UPPI - AUDITORIA COMPLETA FINAL (CODIGO vs BANCO DE DADOS)
**Data da Auditoria:** 24/02/2026
**Ultima Atualizacao:** 06/03/2026
**Versao:** 12.0
**Status do Banco:** OPERACIONAL — 80 tabelas ativas no Supabase mstnqzgsdnlsajuaezhs
**Total de Arquivos no Projeto:** 500+

**Alteracoes em 06/03/2026:**
- Tabelas CRIADAS: driver_profiles, driver_locations, rides, price_offers, notifications, wallet_transactions (via SQL manual)
- Colunas rides RENOMEADAS: origin_* → pickup_*, destination_* → dropoff_*
- Colunas ADICIONADAS: driver_locations.heading/speed/accuracy/last_updated, driver_profiles.current_lat/current_lng, rides.payment_method/cancellation_reason
- Realtime ATIVADO: rides, price_offers, notifications, driver_locations
- RLS CORRIGIDA: rides agora expoe status pending/negotiating para todos os usuarios autenticados
- Projeto Supabase: mstnqzgsdnlsajuaezhs (ativo, substituiu pjlbixnzjndezoscbhej)

---

## SUMARIO EXECUTIVO

| Item | Quantidade |
|------|------------|
| Tabelas no banco (real) | 73 (exportado do Supabase em 24/02/2026) |
| RLS Policies ativas | 98+ (em todas as tabelas) |
| RPC Functions definidas | 45 (em 16 scripts) |
| Triggers definidos | 24 (em 10 scripts) |
| Indexes definidos | 60 (em 14 scripts) |
| API Routes (arquivos) | 38 |
| Endpoints HTTP totais | 63 |
| Paginas (page.tsx) | 65 |
| Components custom | 26 |
| Components shadcn/ui | 55 |
| Hooks custom | 8 |
| Lib utilities | 18 arquivos |
| Scripts SQL | 25 + 1 JS |
| Documentacao (MD) | 9 arquivos |
| Public assets | 4 arquivos |
| Config files | 4 (next.config.mjs, tailwind.config.ts, postcss.config.mjs, components.json) |
| Middleware | 1 (middleware.ts) |
| Layouts | 3 (root, uppi, admin) |
| Client components | 4 (analytics, recording, referral, supabase) |

---

## SECAO 1: TODAS AS TABELAS SQL (73 tabelas)

### 1.1 setup-database.sql (8 tabelas base)

**Tabela 1: profiles**
- id UUID PK (ref auth.users)
- full_name TEXT
- phone TEXT UNIQUE
- avatar_url TEXT
- user_type ENUM (passenger, driver, both)
- rating DECIMAL(3,2) DEFAULT 5.0
- total_rides INTEGER DEFAULT 0
- is_admin BOOLEAN DEFAULT false
- referral_code TEXT UNIQUE
- referred_by TEXT
- created_at TIMESTAMPTZ
- updated_at TIMESTAMPTZ

**Tabela 2: driver_profiles**
- id UUID PK (ref profiles)
- license_number TEXT UNIQUE
- vehicle_type ENUM (economy, electric, premium, suv, moto)
- vehicle_brand TEXT
- vehicle_model TEXT
- vehicle_year INTEGER
- vehicle_plate TEXT UNIQUE
- vehicle_color TEXT
- is_verified BOOLEAN DEFAULT false
- is_available BOOLEAN DEFAULT false
- current_location GEOGRAPHY(POINT, 4326)
- created_at TIMESTAMPTZ
- updated_at TIMESTAMPTZ

**Tabela 3: rides**
- id UUID PK
- passenger_id UUID (ref profiles)
- driver_id UUID (ref profiles)
- vehicle_type ENUM
- pickup_lat DECIMAL, pickup_lng DECIMAL
- pickup_address TEXT
- dropoff_lat DECIMAL, dropoff_lng DECIMAL
- dropoff_address TEXT
- distance_km DECIMAL(10,2)
- estimated_duration_minutes INTEGER
- passenger_price_offer DECIMAL(10,2)
- final_price DECIMAL(10,2)
- payment_method ENUM (cash, credit_card, debit_card, pix, wallet)
- status ENUM (pending, negotiating, accepted, in_progress, completed, cancelled)
- scheduled_time TIMESTAMPTZ
- started_at, completed_at, cancelled_at TIMESTAMPTZ
- cancellation_reason TEXT
- notes TEXT
- created_at, updated_at TIMESTAMPTZ

**Tabela 4: price_offers**
- id UUID PK
- ride_id UUID (ref rides)
- driver_id UUID (ref profiles)
- offered_price DECIMAL(10,2)
- message TEXT
- status ENUM (pending, accepted, rejected, expired)
- expires_at TIMESTAMPTZ
- created_at, updated_at TIMESTAMPTZ

**Tabela 5: ratings**
- id UUID PK
- ride_id UUID (ref rides)
- reviewer_id UUID (ref profiles)
- reviewed_id UUID (ref profiles)
- rating INTEGER CHECK(1-5)
- comment TEXT
- tags TEXT[]
- created_at TIMESTAMPTZ
- UNIQUE(ride_id, reviewer_id)

**Tabela 6: favorites**
- id UUID PK
- user_id UUID (ref profiles)
- label TEXT
- address TEXT
- latitude DECIMAL, longitude DECIMAL
- created_at TIMESTAMPTZ

**Tabela 7: notifications**
- id UUID PK
- user_id UUID (ref profiles)
- title TEXT
- message TEXT
- type TEXT
- ride_id UUID
- data JSONB
- read BOOLEAN DEFAULT false
- created_at TIMESTAMPTZ

**Tabela 8: messages**
- id UUID PK
- ride_id UUID (ref rides)
- sender_id UUID (ref profiles)
- message TEXT
- created_at TIMESTAMPTZ

### 1.2 create-wallet-tables.sql (5 tabelas)

**Tabela 9: user_wallets**
- id UUID PK
- user_id UUID UNIQUE (ref profiles)
- balance DECIMAL(10,2) DEFAULT 0
- currency TEXT DEFAULT 'BRL'
- created_at, updated_at TIMESTAMPTZ

**Tabela 10: wallet_transactions**
- id UUID PK
- wallet_id UUID (ref user_wallets)
- user_id UUID (ref profiles)
- type ENUM (credit, debit, refund, cashback, withdrawal, bonus, transfer)
- amount DECIMAL(10,2)
- description TEXT
- ride_id UUID
- reference_id TEXT
- metadata JSONB
- created_at TIMESTAMPTZ

**Tabela 11: payments**
- id UUID PK
- ride_id UUID (ref rides)
- payer_id UUID (ref profiles)
- payee_id UUID (ref profiles)
- amount DECIMAL(10,2)
- payment_method ENUM
- status TEXT DEFAULT 'completed'
- created_at TIMESTAMPTZ

**Tabela 12: coupons**
- id UUID PK
- code TEXT UNIQUE
- description TEXT
- discount_type TEXT (percentage, fixed)
- discount_value DECIMAL(10,2)
- min_ride_value DECIMAL(10,2)
- max_discount DECIMAL(10,2)
- max_uses INTEGER
- current_uses INTEGER DEFAULT 0
- valid_from, valid_until TIMESTAMPTZ
- is_active BOOLEAN DEFAULT true
- created_at TIMESTAMPTZ

**Tabela 13: coupon_usage**
- id UUID PK
- coupon_id UUID (ref coupons)
- user_id UUID (ref profiles)
- ride_id UUID (ref rides)
- discount_applied DECIMAL(10,2)
- used_at TIMESTAMPTZ

### 1.3 create-social-feed.sql (5 tabelas)

**Tabela 14: social_posts**
- id UUID PK
- user_id UUID (ref profiles)
- type TEXT (savings, achievement, ride_milestone, referral)
- content TEXT
- data JSONB
- likes_count INTEGER DEFAULT 0
- comments_count INTEGER DEFAULT 0
- is_public BOOLEAN DEFAULT true
- created_at TIMESTAMPTZ

**Tabela 15: social_post_likes**
- id UUID PK
- post_id UUID (ref social_posts)
- user_id UUID (ref profiles)
- created_at TIMESTAMPTZ
- UNIQUE(post_id, user_id)

**Tabela 16: social_post_comments**
- id UUID PK
- post_id UUID (ref social_posts)
- user_id UUID (ref profiles)
- content TEXT
- created_at TIMESTAMPTZ

**Tabela 17: user_achievements**
- id UUID PK
- user_id UUID (ref profiles)
- achievement_id TEXT
- achievement_name TEXT
- achievement_description TEXT
- achievement_icon TEXT
- category TEXT (rides, savings, social, rating)
- unlocked_at TIMESTAMPTZ
- shared BOOLEAN DEFAULT false
- UNIQUE(user_id, achievement_id)

**Tabela 18: user_streaks**
- id UUID PK
- user_id UUID UNIQUE (ref profiles)
- current_streak INTEGER DEFAULT 0
- longest_streak INTEGER DEFAULT 0
- last_ride_date DATE
- updated_at TIMESTAMPTZ

### 1.4 final-features-migration.sql (3 tabelas)

**Tabela 19: emergency_contacts**
- id UUID PK
- user_id UUID (ref profiles)
- name TEXT
- phone TEXT
- relationship TEXT
- is_primary BOOLEAN DEFAULT false
- created_at TIMESTAMPTZ

**Tabela 20: emergency_alerts**
- id UUID PK
- user_id UUID (ref profiles)
- ride_id UUID (ref rides)
- alert_type TEXT (sos, accident, harassment)
- location_lat DECIMAL, location_lng DECIMAL
- status TEXT DEFAULT 'active'
- resolved_at TIMESTAMPTZ
- notes TEXT
- created_at TIMESTAMPTZ

**Tabela 21: scheduled_rides**
- id UUID PK
- user_id UUID (ref profiles)
- pickup_address TEXT
- dropoff_address TEXT
- pickup_lat DECIMAL, pickup_lng DECIMAL
- dropoff_lat DECIMAL, dropoff_lng DECIMAL
- scheduled_time TIMESTAMPTZ
- vehicle_type TEXT
- max_price DECIMAL(10,2)
- status TEXT DEFAULT 'scheduled'
- ride_id UUID
- created_at TIMESTAMPTZ

### 1.5 create-enhanced-reviews.sql (3 tabelas)

**Tabela 22: review_categories**
- id UUID PK
- name TEXT UNIQUE
- description TEXT
- icon TEXT
- applies_to TEXT (driver, passenger, both)
- is_active BOOLEAN DEFAULT true
- display_order INTEGER DEFAULT 0

**Tabela 23: review_tags**
- id UUID PK
- category_id UUID (ref review_categories)
- label TEXT
- is_positive BOOLEAN DEFAULT true
- display_order INTEGER DEFAULT 0

**Tabela 24: enhanced_reviews**
- id UUID PK
- ride_id UUID (ref rides)
- reviewer_id UUID (ref profiles)
- reviewed_id UUID (ref profiles)
- overall_rating INTEGER CHECK(1-5)
- category_ratings JSONB
- selected_tags UUID[]
- comment TEXT
- is_anonymous BOOLEAN DEFAULT false
- response TEXT
- responded_at TIMESTAMPTZ
- created_at TIMESTAMPTZ
- UNIQUE(ride_id, reviewer_id)

### 1.6 create-group-rides.sql (2 tabelas)

**Tabela 25: group_rides**
- id UUID PK
- creator_id UUID (ref profiles)
- ride_id UUID (ref rides)
- invite_code TEXT UNIQUE
- max_participants INTEGER DEFAULT 4
- split_type TEXT (equal, custom, distance)
- status TEXT DEFAULT 'active'
- created_at TIMESTAMPTZ

**Tabela 26: group_ride_participants**
- id UUID PK
- group_ride_id UUID (ref group_rides)
- user_id UUID (ref profiles)
- pickup_address TEXT
- pickup_lat DECIMAL, pickup_lng DECIMAL
- share_amount DECIMAL(10,2)
- payment_status TEXT DEFAULT 'pending'
- joined_at TIMESTAMPTZ
- UNIQUE(group_ride_id, user_id)

### 1.7 create-webhooks.sql (2 tabelas)

**Tabela 27: webhook_endpoints**
- id UUID PK
- user_id UUID (ref profiles)
- url TEXT
- events TEXT[]
- secret TEXT
- is_active BOOLEAN DEFAULT true
- description TEXT
- last_triggered_at TIMESTAMPTZ
- failure_count INTEGER DEFAULT 0
- created_at, updated_at TIMESTAMPTZ

**Tabela 28: webhook_deliveries**
- id UUID PK
- webhook_id UUID (ref webhook_endpoints)
- event_type TEXT
- payload JSONB
- response_status INTEGER
- response_body TEXT
- delivered_at TIMESTAMPTZ
- success BOOLEAN
- retry_count INTEGER DEFAULT 0
- next_retry_at TIMESTAMPTZ
- created_at TIMESTAMPTZ

### 1.8 create-sms-fallback.sql (2 tabelas)

**Tabela 29: sms_templates**
- id UUID PK
- name TEXT UNIQUE
- template TEXT
- variables TEXT[]
- is_active BOOLEAN DEFAULT true
- created_at TIMESTAMPTZ

**Tabela 30: sms_deliveries**
- id UUID PK
- user_id UUID (ref profiles)
- template_id UUID (ref sms_templates)
- phone TEXT
- message TEXT
- status TEXT DEFAULT 'pending'
- provider TEXT DEFAULT 'twilio'
- provider_message_id TEXT
- error_message TEXT
- cost DECIMAL(10,4)
- sent_at TIMESTAMPTZ
- delivered_at TIMESTAMPTZ
- created_at TIMESTAMPTZ

### 1.9 create-ride-recordings.sql (2 tabelas)

**Tabela 31: ride_recordings**
- id UUID PK
- ride_id UUID (ref rides)
- user_id UUID (ref profiles)
- storage_path TEXT
- encryption_key_hash TEXT
- duration_seconds INTEGER
- file_size_bytes BIGINT
- status TEXT DEFAULT 'recording'
- auto_delete_at TIMESTAMPTZ
- created_at TIMESTAMPTZ

**Tabela 32: recording_consents**
- id UUID PK
- ride_id UUID (ref rides)
- user_id UUID (ref profiles)
- consented BOOLEAN DEFAULT false
- consented_at TIMESTAMPTZ
- ip_address TEXT
- created_at TIMESTAMPTZ
- UNIQUE(ride_id, user_id)

### 1.10 create-support-chat.sql (2 tabelas)

**Tabela 33: support_tickets**
- id UUID PK
- user_id UUID (ref profiles)
- subject TEXT
- category TEXT
- status TEXT DEFAULT 'open'
- priority TEXT DEFAULT 'normal'
- ride_id UUID
- created_at, updated_at TIMESTAMPTZ

**Tabela 34: support_messages**
- id UUID PK
- ticket_id UUID (ref support_tickets)
- sender_id UUID
- sender_type TEXT (user, agent, system)
- message TEXT
- attachments JSONB
- created_at TIMESTAMPTZ

### 1.11 add-referral-system.sql (2 tabelas)

**Tabela 35: referrals**
- id UUID PK
- referrer_id UUID (ref profiles)
- referred_id UUID (ref profiles)
- status TEXT DEFAULT 'pending'
- referrer_bonus DECIMAL(10,2) DEFAULT 10.00
- referred_bonus DECIMAL(10,2) DEFAULT 15.00
- completed_at TIMESTAMPTZ
- created_at TIMESTAMPTZ

**Tabela 36: referral_rewards**
- id UUID PK
- referral_id UUID (ref referrals)
- user_id UUID (ref profiles)
- reward_type TEXT (bonus, discount, cashback)
- amount DECIMAL(10,2)
- status TEXT DEFAULT 'pending'
- credited_at TIMESTAMPTZ
- created_at TIMESTAMPTZ

### 1.12 create-subscriptions.sql (1 tabela)

**Tabela 37: subscriptions**
- id UUID PK
- user_id UUID (ref profiles)
- plan TEXT (basic, premium, vip)
- status TEXT DEFAULT 'active'
- price DECIMAL(10,2)
- discount_percentage INTEGER
- cashback_percentage INTEGER
- priority_support BOOLEAN DEFAULT false
- started_at TIMESTAMPTZ
- expires_at TIMESTAMPTZ
- cancelled_at TIMESTAMPTZ
- created_at TIMESTAMPTZ

### 1.13 create-bidirectional-reviews.sql (1 tabela)

**Tabela 38: driver_reviews_of_passengers**
- id UUID PK
- ride_id UUID (ref rides)
- driver_id UUID (ref profiles)
- passenger_id UUID (ref profiles)
- rating INTEGER CHECK(1-5)
- tags TEXT[]
- comment TEXT
- created_at TIMESTAMPTZ
- UNIQUE(ride_id, driver_id)

### 1.14 admin-setup.sql (1 tabela)

**Tabela 39: admin_logs**
- id UUID PK
- admin_id UUID (ref profiles)
- action TEXT
- target_type TEXT
- target_id UUID
- details JSONB
- ip_address TEXT
- created_at TIMESTAMPTZ

---

## SECAO 2: TODAS AS 98 RLS POLICIES

### setup-database.sql (19 policies)
1. profiles: Users can view own profile (SELECT)
2. profiles: Users can update own profile (UPDATE)
3. profiles: Users can insert own profile (INSERT)
4. driver_profiles: Drivers can view own profile (SELECT)
5. driver_profiles: Drivers can update own profile (UPDATE)
6. driver_profiles: Drivers can insert own profile (INSERT)
7. rides: Users can view own rides (SELECT)
8. rides: Passengers can create rides (INSERT)
9. rides: Users can update own rides (UPDATE)
10. price_offers: Users can view relevant offers (SELECT)
11. price_offers: Drivers can create offers (INSERT)
12. price_offers: Users can update offers (UPDATE)
13. ratings: Users can view own ratings (SELECT)
14. ratings: Users can create ratings (INSERT)
15. favorites: Users can view own favorites (SELECT)
16. favorites: Users can create favorites (INSERT)
17. favorites: Users can delete own favorites (DELETE)
18. notifications: Users can view own notifications (SELECT)
19. notifications: Users can update own notifications (UPDATE)

### create-wallet-tables.sql (9 policies)
20. user_wallets: Users view own wallet (SELECT)
21. user_wallets: Users create own wallet (INSERT)
22. user_wallets: Users update own wallet (UPDATE)
23. wallet_transactions: Users view own transactions (SELECT)
24. wallet_transactions: Users create transactions (INSERT)
25. payments: Users view own payments (SELECT)
26. coupons: Anyone can view active coupons (SELECT)
27. coupon_usage: Users view own usage (SELECT)
28. coupon_usage: Users can use coupons (INSERT)

### create-social-feed.sql (15 policies)
29. social_posts: Anyone can view public posts (SELECT)
30. social_posts: Users create own posts (INSERT)
31. social_posts: Users update own posts (UPDATE)
32. social_post_likes: Anyone can view likes (SELECT)
33. social_post_likes: Users create likes (INSERT)
34. social_post_likes: Users delete own likes (DELETE)
35. social_post_comments: Anyone can view comments (SELECT)
36. social_post_comments: Users create comments (INSERT)
37. social_post_comments: Users delete own comments (DELETE)
38. user_achievements: Users view own achievements (SELECT)
39. user_achievements: System inserts achievements (INSERT)
40. user_achievements: Users update own achievements (UPDATE)
41. user_streaks: Users view own streaks (SELECT)
42. user_streaks: System manages streaks (INSERT)
43. user_streaks: System updates streaks (UPDATE)

### admin-setup.sql (13 policies)
44. admin_logs: Admins view all logs (SELECT)
45. admin_logs: Admins insert logs (INSERT)
46. profiles: Admins view all profiles (SELECT)
47. profiles: Admins update all profiles (UPDATE)
48. rides: Admins view all rides (SELECT)
49. rides: Admins update all rides (UPDATE)
50. driver_profiles: Admins view all drivers (SELECT)
51. driver_profiles: Admins update all drivers (UPDATE)
52. notifications: Admins view all notifications (SELECT)
53. notifications: Admins insert notifications (INSERT)
54. coupons: Admins manage coupons (ALL)
55. subscriptions: Admins view all subscriptions (SELECT)
56. wallet_transactions: Admins view all transactions (SELECT)

### create-group-rides.sql (7 policies)
57. group_rides: Users view own/joined groups (SELECT)
58. group_rides: Users create groups (INSERT)
59. group_rides: Creators update groups (UPDATE)
60. group_rides: Creators delete groups (DELETE)
61. group_ride_participants: Users view own groups (SELECT)
62. group_ride_participants: Users join groups (INSERT)
63. group_ride_participants: Users update own participation (UPDATE)

### create-ride-recordings.sql (5 policies)
64. ride_recordings: Users view own recordings (SELECT)
65. ride_recordings: Users create recordings (INSERT)
66. ride_recordings: Users update own recordings (UPDATE)
67. recording_consents: Users view own consents (SELECT)
68. recording_consents: Users create consents (INSERT)

### create-bidirectional-reviews.sql (5 policies)
69. driver_reviews_of_passengers: Drivers view own reviews (SELECT)
70. driver_reviews_of_passengers: Passengers view own reviews (SELECT)
71. driver_reviews_of_passengers: Drivers create reviews (INSERT)
72. driver_reviews_of_passengers: Drivers update own reviews (UPDATE)
73. messages: Users view ride messages (SELECT)

### final-features-migration.sql (4 policies)
74. emergency_contacts: Users manage own contacts (SELECT/INSERT/UPDATE/DELETE)
75. emergency_alerts: Users manage own alerts (SELECT/INSERT)
76. scheduled_rides: Users manage own scheduled (SELECT/INSERT/UPDATE)
77. scheduled_rides: Users delete own scheduled (DELETE)

### create-enhanced-reviews.sql (4 policies)
78. review_categories: Anyone can view (SELECT)
79. review_tags: Anyone can view (SELECT)
80. enhanced_reviews: Users view relevant reviews (SELECT)
81. enhanced_reviews: Users create reviews (INSERT)

### create-sms-fallback.sql (4 policies)
82. sms_templates: Anyone can view active templates (SELECT)
83. sms_templates: Admins manage templates (ALL)
84. sms_deliveries: Users view own deliveries (SELECT)
85. sms_deliveries: System inserts deliveries (INSERT)

### create-subscriptions.sql (3 policies)
86. subscriptions: Users view own subscription (SELECT)
87. subscriptions: Users create subscription (INSERT)
88. subscriptions: Users update own subscription (UPDATE)

### create-support-chat.sql (3 policies)
89. support_tickets: Users view own tickets (SELECT)
90. support_tickets: Users create tickets (INSERT)
91. support_messages: Users view ticket messages (SELECT)

### create-webhooks.sql (2 policies)
92. webhook_endpoints: Users manage own webhooks (SELECT/INSERT/UPDATE/DELETE)
93. webhook_deliveries: Users view own deliveries (SELECT)

### add-vehicle-type-to-rides.sql (3 policies)
94. rides: Drivers view pending rides matching vehicle (SELECT)
95. rides: Drivers view available rides (SELECT)
96. driver_profiles: Passengers view available drivers (SELECT)

### add-referral-system.sql (2 policies)
97. referrals: Users view own referrals (SELECT)
98. referral_rewards: Users view own rewards (SELECT)

---

## SECAO 3: TODAS AS 45 RPC FUNCTIONS

### setup-database.sql (4 functions)
1. handle_new_user() - TRIGGER: Cria profile automatico ao registrar
2. update_updated_at_column() - TRIGGER: Atualiza updated_at
3. update_user_rating() - Recalcula rating medio do usuario
4. handle_ride_status_change() - TRIGGER: Processa mudanca de status da corrida

### final-features-migration.sql (3 functions)
5. get_ride_stats(user_uuid) - Retorna estatisticas de corridas do usuario
6. trigger_emergency_notification() - TRIGGER: Notifica contatos de emergencia
7. auto_activate_scheduled_rides() - Ativa corridas agendadas na hora certa

### create-analytics-functions.sql (5 functions)
8. get_admin_dashboard_stats() - Stats gerais para admin dashboard
9. get_revenue_analytics(days) - Analytics de receita por periodo
10. get_ride_analytics(days) - Analytics de corridas por periodo
11. get_user_growth_analytics(days) - Analytics de crescimento de usuarios
12. get_driver_performance(days) - Analytics de performance de motoristas

### create-webhooks.sql (4 functions)
13. trigger_webhook_on_ride_change() - TRIGGER: Dispara webhook em mudanca de ride
14. trigger_webhook_on_offer() - TRIGGER: Dispara webhook em nova oferta
15. process_webhook_delivery() - Processa entrega de webhook
16. generate_webhook_signature(payload, secret) - Gera HMAC SHA-256 signature

### create-social-feed.sql (4 functions)
17. increment_likes_count() - TRIGGER: Incrementa likes_count
18. decrement_likes_count() - TRIGGER: Decrementa likes_count
19. increment_comments_count() - TRIGGER: Incrementa comments_count
20. check_achievements(user_uuid) - Verifica e desbloqueia conquistas

### create-group-rides.sql (4 functions)
21. generate_invite_code() - Gera codigo de convite unico
22. calculate_split_amounts(group_id) - Calcula divisao de pagamento
23. process_group_payment(group_id) - Processa pagamento do grupo
24. validate_group_ride_join(group_id, user_uuid) - Valida entrada no grupo

### create-sms-fallback.sql (3 functions)
25. render_sms_template(template, vars) - Renderiza template SMS com variaveis
26. check_sms_rate_limit(phone) - Rate limit por telefone (5/hora)
27. process_sms_delivery_status() - TRIGGER: Processa status de entrega SMS

### add-referral-system.sql (3 functions)
28. generate_referral_code() - Gera codigo de referral unico
29. process_referral(referrer_code, new_user_id) - Processa indicacao
30. credit_referral_rewards(referral_uuid) - Credita bonus de referral

### create-enhanced-reviews.sql (3 functions)
31. calculate_category_averages(user_uuid) - Media por categoria de avaliacao
32. get_review_summary(user_uuid) - Resumo completo de avaliacoes
33. auto_respond_review() - TRIGGER: Resposta automatica a reviews

### create-bidirectional-reviews.sql (3 functions)
34. update_passenger_rating() - TRIGGER: Atualiza rating do passageiro
35. get_user_review_stats(user_uuid) - Stats de avaliacoes do usuario
36. get_bidirectional_reviews(ride_uuid) - Reviews bidirecionais da corrida

### create-ride-recordings.sql (2 functions)
37. schedule_recording_deletion() - TRIGGER: Agenda auto-delete em 7 dias
38. process_recording_cleanup() - Limpa gravacoes expiradas

### create-wallet-tables.sql (2 functions)
39. update_wallet_balance() - TRIGGER: Atualiza saldo da carteira
40. process_ride_payment(ride_uuid) - Processa pagamento via carteira

### create-nearby-drivers-function.sql (1 function)
41. get_nearby_drivers(lat, lng, radius_km, v_type) - Busca motoristas proximos via PostGIS

### create-leaderboard.sql (1 function)
42. get_leaderboard(category, period, lim) - Ranking por corridas/economia/rating

### create-heatmap-function.sql (2 functions)
43. get_demand_heatmap(lat, lng, radius) - Mapa de calor de demanda por grid 500m
44. get_driver_suggestions(driver_uuid) - Sugestoes inteligentes para motorista

### add-driver-verification.sql (1 function)
45. verify_driver_face(driver_uuid, confidence) - Verificacao facial do motorista

---

## SECAO 4: TODOS OS 24 TRIGGERS

### setup-database.sql (7 triggers)
1. on_auth_user_created -> handle_new_user() ON auth.users AFTER INSERT
2. update_profiles_updated_at -> update_updated_at_column() ON profiles BEFORE UPDATE
3. update_driver_profiles_updated_at -> update_updated_at_column() ON driver_profiles BEFORE UPDATE
4. update_rides_updated_at -> update_updated_at_column() ON rides BEFORE UPDATE
5. on_rating_created -> update_user_rating() ON ratings AFTER INSERT
6. on_ride_status_change -> handle_ride_status_change() ON rides AFTER UPDATE
7. update_price_offers_updated_at -> update_updated_at_column() ON price_offers BEFORE UPDATE

### create-social-feed.sql (3 triggers)
8. on_like_created -> increment_likes_count() ON social_post_likes AFTER INSERT
9. on_like_deleted -> decrement_likes_count() ON social_post_likes AFTER DELETE
10. on_comment_created -> increment_comments_count() ON social_post_comments AFTER INSERT

### create-webhooks.sql (2 triggers)
11. on_ride_change_webhook -> trigger_webhook_on_ride_change() ON rides AFTER UPDATE
12. on_offer_webhook -> trigger_webhook_on_offer() ON price_offers AFTER INSERT

### create-wallet-tables.sql (2 triggers)
13. on_wallet_transaction -> update_wallet_balance() ON wallet_transactions AFTER INSERT
14. on_ride_completed_payment -> process_ride_payment() ON rides AFTER UPDATE (status='completed')

### add-referral-system.sql (2 triggers)
15. on_referral_signup -> process_referral() ON profiles AFTER INSERT
16. on_referral_completed -> credit_referral_rewards() ON referrals AFTER UPDATE (status='completed')

### create-ride-recordings.sql (2 triggers)
17. on_recording_created -> schedule_recording_deletion() ON ride_recordings AFTER INSERT
18. on_recording_completed -> process_recording_cleanup() ON ride_recordings AFTER UPDATE

### create-group-rides.sql (2 triggers)
19. on_group_ride_created -> generate_invite_code() ON group_rides BEFORE INSERT
20. on_participant_joined -> validate_group_ride_join() ON group_ride_participants BEFORE INSERT

### create-enhanced-reviews.sql (2 triggers)
21. on_enhanced_review_created -> calculate_category_averages() ON enhanced_reviews AFTER INSERT
22. on_review_response -> auto_respond_review() ON enhanced_reviews AFTER UPDATE

### create-bidirectional-reviews.sql (1 trigger)
23. on_driver_review_created -> update_passenger_rating() ON driver_reviews_of_passengers AFTER INSERT

### create-sms-fallback.sql (1 trigger)
24. on_sms_status_update -> process_sms_delivery_status() ON sms_deliveries AFTER UPDATE

---

## SECAO 5: TODOS OS 60 INDEXES

### setup-database.sql (9 indexes)
1. idx_rides_passenger ON rides(passenger_id)
2. idx_rides_driver ON rides(driver_id)
3. idx_rides_status ON rides(status)
4. idx_rides_created ON rides(created_at DESC)
5. idx_offers_ride ON price_offers(ride_id)
6. idx_offers_driver ON price_offers(driver_id)
7. idx_ratings_reviewed ON ratings(reviewed_id)
8. idx_notifications_user ON notifications(user_id)
9. idx_driver_location ON driver_profiles USING GIST(current_location)

### create-social-feed.sql (8 indexes)
10. idx_social_posts_user ON social_posts(user_id)
11. idx_social_posts_type ON social_posts(type)
12. idx_social_posts_created ON social_posts(created_at DESC)
13. idx_social_post_likes_post ON social_post_likes(post_id)
14. idx_social_post_likes_user ON social_post_likes(user_id)
15. idx_social_post_comments_post ON social_post_comments(post_id)
16. idx_user_achievements_user ON user_achievements(user_id)
17. idx_user_achievements_category ON user_achievements(category)

### create-group-rides.sql (6 indexes)
18. idx_group_rides_creator ON group_rides(creator_id)
19. idx_group_rides_ride ON group_rides(ride_id)
20. idx_group_rides_code ON group_rides(invite_code)
21. idx_group_rides_status ON group_rides(status)
22. idx_group_participants_group ON group_ride_participants(group_ride_id)
23. idx_group_participants_user ON group_ride_participants(user_id)

### create-webhooks.sql (5 indexes)
24. idx_webhook_endpoints_user ON webhook_endpoints(user_id)
25. idx_webhook_endpoints_active ON webhook_endpoints(is_active)
26. idx_webhook_deliveries_webhook ON webhook_deliveries(webhook_id)
27. idx_webhook_deliveries_event ON webhook_deliveries(event_type)
28. idx_webhook_deliveries_created ON webhook_deliveries(created_at DESC)

### create-wallet-tables.sql (5 indexes)
29. idx_user_wallets_user ON user_wallets(user_id)
30. idx_wallet_transactions_wallet ON wallet_transactions(wallet_id)
31. idx_wallet_transactions_user ON wallet_transactions(user_id)
32. idx_wallet_transactions_type ON wallet_transactions(type)
33. idx_wallet_transactions_created ON wallet_transactions(created_at DESC)

### create-sms-fallback.sql (4 indexes)
34. idx_sms_deliveries_user ON sms_deliveries(user_id)
35. idx_sms_deliveries_phone ON sms_deliveries(phone)
36. idx_sms_deliveries_status ON sms_deliveries(status)
37. idx_sms_deliveries_created ON sms_deliveries(created_at DESC)

### create-ride-recordings.sql (4 indexes)
38. idx_recordings_ride ON ride_recordings(ride_id)
39. idx_recordings_user ON ride_recordings(user_id)
40. idx_recordings_status ON ride_recordings(status)
41. idx_recordings_auto_delete ON ride_recordings(auto_delete_at)

### add-referral-system.sql (4 indexes)
42. idx_referrals_referrer ON referrals(referrer_id)
43. idx_referrals_referred ON referrals(referred_id)
44. idx_referrals_status ON referrals(status)
45. idx_referral_rewards_user ON referral_rewards(user_id)

### final-features-migration.sql (4 indexes)
46. idx_emergency_contacts_user ON emergency_contacts(user_id)
47. idx_emergency_alerts_user ON emergency_alerts(user_id)
48. idx_emergency_alerts_ride ON emergency_alerts(ride_id)
49. idx_scheduled_rides_user ON scheduled_rides(user_id)

### create-enhanced-reviews.sql (3 indexes)
50. idx_enhanced_reviews_ride ON enhanced_reviews(ride_id)
51. idx_enhanced_reviews_reviewer ON enhanced_reviews(reviewer_id)
52. idx_enhanced_reviews_reviewed ON enhanced_reviews(reviewed_id)

### create-bidirectional-reviews.sql (3 indexes)
53. idx_driver_reviews_ride ON driver_reviews_of_passengers(ride_id)
54. idx_driver_reviews_driver ON driver_reviews_of_passengers(driver_id)
55. idx_driver_reviews_passenger ON driver_reviews_of_passengers(passenger_id)

### create-support-chat.sql (2 indexes)
56. idx_support_tickets_user ON support_tickets(user_id)
57. idx_support_messages_ticket ON support_messages(ticket_id)

### add-vehicle-type-to-rides.sql (2 indexes)
58. idx_rides_vehicle_type ON rides(vehicle_type)
59. idx_rides_status_vehicle ON rides(status, vehicle_type)

### add-driver-verification.sql (1 index)
60. idx_driver_verifications ON driver_profiles(is_verified)

---

## SECAO 6: TODAS AS 38 API ROUTES (63 ENDPOINTS HTTP)

### Corridas (Rides)
| # | Rota | Metodos | Descricao |
|---|------|---------|-----------|
| 1 | /api/rides | GET, POST | Listar/criar corridas |
| 2 | /api/rides/[id]/status | POST | Atualizar status da corrida |
| 3 | /api/rides/[id]/cancel | POST | Cancelar corrida |

### Ofertas (Price Negotiation)
| # | Rota | Metodos | Descricao |
|---|------|---------|-----------|
| 4 | /api/offers | GET, POST | Listar/criar ofertas de preco |
| 5 | /api/offers/[id]/accept | POST | Aceitar oferta |

### Avaliacoes (Reviews)
| # | Rota | Metodos | Descricao |
|---|------|---------|-----------|
| 6 | /api/reviews | GET, POST | Listar/criar avaliacoes |
| 7 | /api/ratings | GET, POST | Ratings de corridas |

### Perfil e Conta
| # | Rota | Metodos | Descricao |
|---|------|---------|-----------|
| 8 | /api/profile | GET, PUT | Ver/atualizar perfil |
| 9 | /api/stats | GET | Estatisticas do usuario |

### Motorista
| # | Rota | Metodos | Descricao |
|---|------|---------|-----------|
| 10 | /api/drivers/nearby | GET | Motoristas proximos (PostGIS) |
| 11 | /api/drivers/hot-zones | GET | Zonas quentes de demanda |
| 12 | /api/driver/documents | GET, POST | Docs do motorista |
| 13 | /api/driver/verify | POST | Verificacao facial |

### Financeiro
| # | Rota | Metodos | Descricao |
|---|------|---------|-----------|
| 14 | /api/wallet | GET, POST | Carteira e transacoes |
| 15 | /api/coupons | GET, POST | Cupons de desconto |
| 16 | /api/subscriptions | GET, POST | Club Uppi assinaturas |

### Social e Gamificacao
| # | Rota | Metodos | Descricao |
|---|------|---------|-----------|
| 17 | /api/social/posts | GET, POST | Feed social |
| 18 | /api/social/posts/[id]/like | POST, DELETE | Curtir/descurtir |
| 19 | /api/leaderboard | GET | Rankings e leaderboard |
| 20 | /api/achievements | GET | Conquistas do usuario |

### Comunicacao
| # | Rota | Metodos | Descricao |
|---|------|---------|-----------|
| 21 | /api/messages | GET, POST | Chat da corrida |
| 22 | /api/notifications | GET, POST, PUT | Notificacoes |
| 23 | /api/sms/send | POST | Enviar SMS (Twilio) |

### Seguranca
| # | Rota | Metodos | Descricao |
|---|------|---------|-----------|
| 24 | /api/emergency | GET, POST, PUT | SOS e alertas |
| 25 | /api/recordings/upload | POST | Upload gravacao criptografada |

### Localizacao e Mapas
| # | Rota | Metodos | Descricao |
|---|------|---------|-----------|
| 26 | /api/geocode | GET | Geocoding (Google Maps) |
| 27 | /api/places/autocomplete | GET | Autocomplete enderecos |
| 28 | /api/places/details | GET | Detalhes do local |
| 29 | /api/routes/alternatives | GET | Rotas alternativas |
| 30 | /api/distance | GET | Calculo de distancia |

### Outros
| # | Rota | Metodos | Descricao |
|---|------|---------|-----------|
| 31 | /api/favorites | GET, POST, DELETE | Enderecos favoritos |
| 32 | /api/referrals | GET, POST | Programa de indicacao |
| 33 | /api/group-rides | GET, POST | Corridas em grupo |
| 34 | /api/group-rides/join | POST | Entrar em grupo |
| 35 | /api/webhooks | GET, POST, DELETE | Gerenciar webhooks |
| 36 | /api/webhooks/process | GET, POST | Processar entregas |

### Admin
| # | Rota | Metodos | Descricao |
|---|------|---------|-----------|
| 37 | /api/admin/setup | POST | Setup inicial do admin |
| 38 | /api/admin/create-first | POST | Criar primeiro admin |

### APIs NAO IMPLEMENTADAS (documentadas na v7.0 mas sem codigo)
| Rota | Status |
|------|--------|
| /api/reviews/enhanced | NAO EXISTE - tabela existe no SQL mas API nao foi criada |
| /api/reviews/driver | NAO EXISTE - tabela driver_reviews_of_passengers existe mas API nao |
| /api/driver/location | NAO EXISTE - driver_profiles.current_location existe mas sem endpoint |
| /api/sms/status | NAO EXISTE - trigger process_sms_delivery_status existe mas sem webhook |
| /api/social/posts/[id]/comments | NAO EXISTE - tabela social_post_comments existe mas API nao |

---

## SECAO 7: TODAS AS 65 PAGINAS (VERIFICADAS NO CODIGO)

### Auth (9 paginas que EXISTEM)
1. / (app/page.tsx - redirect para /auth/welcome)
2. /auth/welcome - Tela inicial de boas-vindas
3. /auth/login - Login passageiro
4. /auth/sign-up - Cadastro passageiro
5. /auth/sign-up-success - Confirmacao de cadastro
6. /auth/user-type - Selecao de tipo (passageiro/motorista/ambos)
7. /auth/error - Pagina de erro de auth
8. /auth/driver/welcome - Boas-vindas motorista
9. /auth/driver/login - Login motorista
10. /auth/driver/sign-up - Cadastro motorista

### Home e Navegacao (5 paginas)
8. /uppi/home - Home principal com sugestoes IA
9. /uppi/favorites - Enderecos favoritos
10. /uppi/favorites/add - Adicionar favorito
11. /uppi/notifications - Central de notificacoes
12. /uppi/history - Historico de corridas

### Solicitar Corrida (8 paginas)
13. /uppi/request-ride - Solicitar corrida (tela principal)
14. /uppi/ride/route-input - Input de origem/destino
15. /uppi/ride/select - Selecao de veiculo
16. /uppi/ride/route-alternatives - Rotas alternativas com precos
17. /uppi/ride/searching - Buscando motoristas
18. /uppi/ride/[id]/offers - Ver ofertas recebidas
19. /uppi/ride/[id]/details - Detalhes da corrida
20. /uppi/ride/schedule - Agendar corrida

### Corrida em Andamento (4 paginas)
21. /uppi/ride/[id]/tracking - Rastrear corrida
22. /uppi/ride/[id]/chat - Chat com motorista
23. /uppi/ride/[id]/review - Avaliar corrida
24. /uppi/ride/[id]/review-enhanced - Avaliacao detalhada

### Tracking (1 pagina)
25. /uppi/tracking - Tracking ativo

### Corridas em Grupo (1 pagina)
26. /uppi/ride/group - Corridas em grupo

### Motorista (6 paginas)
27. /uppi/driver - Dashboard do motorista
28. /uppi/driver/earnings - Ganhos do motorista
29. /uppi/driver/documents - Documentos
30. /uppi/driver/register - Registro como motorista
31. /uppi/driver/verify - Verificacao do motorista
32. /uppi/driver-mode - Modo motorista

### Perfil e Configuracoes (5 paginas)
33. /uppi/profile - Perfil do usuario
34. /uppi/settings - Configuracoes gerais
35. /uppi/settings/sms - Configuracoes SMS
36. /uppi/settings/recording - Gravacao de audio

### Seguranca (3 paginas)
37. /uppi/emergency-contacts - Contatos de emergencia
38. /uppi/emergency - Tela de emergencia SOS
39. /uppi/seguranca - Central de seguranca

### Financeiro (4 paginas)
40. /uppi/wallet - Carteira digital
41. /uppi/payments - Pagamentos
42. /uppi/promotions - Promocoes e cupons
43. /uppi/club - Club Uppi (assinaturas)

### Social e Gamificacao (4 paginas)
44. /uppi/social - Feed social
45. /uppi/leaderboard - Rankings
46. /uppi/achievements - Conquistas
47. /uppi/referral - Programa de indicacao

### Suporte (2 paginas)
48. /uppi/suporte - Central de ajuda
49. /uppi/suporte/chat - Chat com suporte

### Outros (5 paginas)
50. /uppi/help - Ajuda
51. /uppi/analytics - Analytics do usuario
52. /uppi/cidade-a-cidade - Viagens intermunicipais
53. /uppi/entregas - Servico de entregas
54. /uppi/legal/privacy - Politica de privacidade
55. /uppi/legal/terms - Termos de uso

### Offline (1 pagina)
56. /offline - Pagina offline (PWA)

### Admin (8 paginas que EXISTEM)
57. /admin - Dashboard principal (auth verificada no layout via is_admin)
59. /admin/users - Gerenciar usuarios
60. /admin/rides - Gerenciar corridas
61. /admin/analytics - Analytics avancado
62. /admin/webhooks - Gerenciar webhooks
63. /admin/financeiro - Painel financeiro
64. /admin/monitor - Monitor em tempo real

### Paginas NAO IMPLEMENTADAS (documentadas na v7.0 mas sem codigo)
| Pagina | Status |
|--------|--------|
| /onboarding/* | NAO EXISTE - fluxo renomeado para /auth/* em todas as rotas |
| /uppi/explore | NAO EXISTE |
| /uppi/activity | NAO EXISTE - substituida por /uppi/history |
| /uppi/ride/vehicle-select | NAO EXISTE - substituida por /uppi/ride/select |
| /uppi/ride/price-offer | NAO EXISTE |
| /uppi/ride/confirm | NAO EXISTE |
| /uppi/ride/[id]/route-preview | NAO EXISTE - 3D preview esta no componente route-preview-3d.tsx |
| /uppi/driver/hot-zones | NAO EXISTE - dados via /api/drivers/hot-zones |
| /uppi/profile/edit | NAO EXISTE |
| /uppi/settings/emergency | NAO EXISTE - substituida por /uppi/emergency-contacts |
| /uppi/settings/privacy | NAO EXISTE |
| /uppi/settings/vehicle | NAO EXISTE |
| /uppi/subscription | NAO EXISTE - substituida por /uppi/club |
| /uppi/payment-methods | NAO EXISTE - substituida por /uppi/payments |
| /uppi/suporte/faq | NAO EXISTE |
| /uppi/group-rides | NAO EXISTE - substituida por /uppi/ride/group |
| /uppi/group-rides/create | NAO EXISTE |
| /uppi/group-rides/[id] | NAO EXISTE |
| /admin/drivers | NAO EXISTE |
| /admin/coupons | NAO EXISTE |
| /admin/notifications | NAO EXISTE |
| /admin/support | NAO EXISTE |
| /admin/settings | NAO EXISTE |
| /admin/logs | NAO EXISTE |

---

## SECAO 8: TODOS OS COMPONENTES

### 8.1 Componentes Custom (26 arquivos)
1. admin/admin-header.tsx - Header do painel admin
2. admin/admin-sidebar.tsx - Sidebar do admin
3. auto-theme.tsx - Tema automatico por horario (18h-6h escuro)
4. bottom-navigation.tsx - Navegacao inferior estilo iOS
5. facial-verification.tsx - Verificacao facial do motorista
6. google-map.tsx - Componente de mapa Google
7. hot-zones-card.tsx - Card de zonas quentes
8. ios-page-transition.tsx - Transicoes de pagina estilo iOS
9. location-tag.tsx - Tag de localizacao
10. map-fallback.tsx - Fallback quando mapa nao carrega
11. modern-map.tsx - Mapa moderno com estilos
12. nearby-drivers.tsx - Card de motoristas proximos
13. places-search.tsx - Busca de enderecos Google Places
14. pull-to-refresh.tsx - Pull-to-refresh gesture
15. referral-card.tsx - Card de indicacao
16. referral-client.tsx - Client component referral
17. ride-audio-recorder.tsx - Gravador de audio criptografado
18. route-map.tsx - Mapa com rota
19. route-preview-3d.tsx - Preview 3D (tilt, rotacao, flyover)
20. search-address.tsx - Busca de endereco
21. service-worker.tsx - Registro do service worker
22. sidebar-menu.tsx - Menu lateral
23. swipeable-list-item.tsx - Item com swipe actions
24. theme-provider.tsx - Provider de tema next-themes
25. theme-toggle.tsx - Toggle claro/escuro
26. voice-assistant-button.tsx - Botao de assistente de voz

### 8.2 Componentes shadcn/ui (55 arquivos)
accordion, alert, alert-dialog, aspect-ratio, avatar, badge, breadcrumb, button, calendar, card, carousel, chart, checkbox, collapsible, command, confetti, context-menu, dialog, drawer, dropdown-menu, expandable-tabs, form, hover-card, input, input-otp, ios-skeleton, label, location-tag, menubar, morphing-spinner, navigation-menu, pagination, popover, progress, radio-group, resizable, scroll-area, select, separator, sheet, sidebar, skeleton, slider, sonner, switch, table, tabs, textarea, toast, toaster, toggle, toggle-group, tooltip, use-mobile, use-toast

---

## SECAO 9: TODOS OS 8 HOOKS

1. **use-google-maps.ts** - Hook para carregar/usar Google Maps API
2. **use-haptic.ts** - Feedback haptico iOS (7 padroes: light, medium, heavy, success, warning, error, selection)
3. **use-mobile.tsx** - Detecta se e mobile
4. **use-places-autocomplete.ts** - Autocomplete de enderecos
5. **use-pull-to-refresh.ts** - Gesto de pull-to-refresh
6. **use-swipe-actions.ts** - Swipe left/right actions
7. **use-toast.ts** - Sistema de toasts
8. **use-voice-assistant.ts** - Reconhecimento de voz (Web Speech API pt-BR)

---

## SECAO 10: TODAS AS 18 LIB UTILITIES

### Supabase (4 arquivos)
1. **lib/supabase/client.ts** - Supabase browser client (createBrowserClient)
2. **lib/supabase/server.ts** - Supabase server client (createServerClient com cookies)
3. **lib/supabase/proxy.ts** - Middleware proxy para session management
4. **lib/supabase/admin.ts** - Supabase admin client (service role, bypassa RLS)

### Google Maps (4 arquivos)
5. **lib/google-maps/provider.tsx** - GoogleMapsProvider (carrega API com apiKey)
6. **lib/google-maps/types.ts** - Types: Location, PlaceResult, RouteInfo, DirectionsResult, Driver, ActiveRide
7. **lib/google-maps/utils.ts** - Utilidades de mapa
8. **lib/google-maps/EXAMPLES.md** - Exemplos de uso

### Utils (5 arquivos)
9. **lib/utils.ts** - cn() classnames utility
10. **lib/utils/ai-suggestions.ts** - IA de sugestoes: generateSmartSuggestions(), estimatePriceWithContext(), generatePriceAlert(), generateContextualInsights()
11. **lib/utils/rate-limit.ts** - Rate limiter sliding window: apiLimiter (1min), authLimiter (5min), offerLimiter (30s)
12. **lib/utils/ride-calculator.ts** - Haversine distance, estimatePrice(), estimateDuration(), formatCurrency(), getStatusColor(), getStatusLabel()
13. **lib/utils/fetch-retry.ts** - fetchWithRetry() com exponential backoff, timeout, retry em 408/429/500/502/503/504
14. **lib/utils/ios-toast.ts** - iosToast: success/error/info/warning/undoable/rideUpdate/promise com haptic feedback

### Outros (4 arquivos)
15. **lib/admin-auth.ts** - requireAdmin() - Protecao server-side para rotas admin
16. **lib/helpers/notifications.ts** - sendNotification(), notifyNewOffer(), notifyOfferAccepted(), notifyRideCancelled(), notifyRideStarted(), notifyRideCompleted(), notifyPaymentProcessed(), notifyPromotion()
17. **lib/types/database.ts** - TypeScript types: Profile, DriverProfile, Ride, PriceOffer, Rating, Notification, UserType, RideStatus, OfferStatus, PaymentMethod, VehicleType
18. **lib/google-maps/README.md** - Documentacao Google Maps

---

## SECAO 11: MIDDLEWARE E AUTENTICACAO

### middleware.ts
- Usa @supabase/ssr createServerClient
- Renova sessao Supabase em todas as requisicoes via updateSession()
- Permite /admin sem bloqueio (admin/layout.tsx faz verificacao is_admin)
- Permite /auth/* para nao logados

### Fluxo de Auth
1. Usuario acessa / -> redirect /auth/welcome
2. Escolhe login ou cadastro (/auth/login ou /auth/sign-up)
3. Motorista usa /auth/driver/login ou /auth/driver/sign-up
4. Supabase Auth cria sessao via email/password ou OAuth
5. Trigger handle_new_user() cria profile automatico
6. Redirect para /uppi/home apos autenticacao

### Admin Auth (dupla verificacao)
1. middleware.ts permite /admin (sem bloqueio)
2. admin/layout.tsx (client) verifica: supabase.auth.getUser() + profiles.is_admin
3. lib/admin-auth.ts requireAdmin() (server) para API routes admin

---

## SECAO 12: LAYOUTS E ESTRUTURA

### 3 Layouts
1. **app/layout.tsx** (Root) - Inter font, ThemeProvider (dark default), AutoTheme, GoogleMapsProvider, ServiceWorkerRegistration, Toaster (sonner), lang="pt-BR", overflow-hidden h-dvh
2. **app/uppi/layout.tsx** - IOSPageTransition wrapper + BottomNavigation
3. **app/admin/layout.tsx** (Client) - AdminSidebar + auth check + loading state com Shield icon

### Client Components Separados
1. app/admin/analytics/client.tsx - Charts e graficos do admin
2. app/uppi/settings/recording/client.tsx - UI de gravacao
3. components/referral-client.tsx - Logica client do referral

### Loading States (nao documentados na v7.0)
1. app/uppi/request-ride/loading.tsx - Skeleton de request-ride
2. app/uppi/ride/route-alternatives/loading.tsx - Skeleton de rotas alternativas

---

## SECAO 13: PUBLIC ASSETS

1. **public/sw.js** - Service Worker (cache-first para static, network-first para pages/API, precache de rotas, offline fallback)
2. **public/placeholder.svg** - Placeholder generico
3. **public/placeholder-logo.svg** - Placeholder logo
4. **public/images/car-referral.jpg** - Imagem do referral

---

## SECAO 13.5: ARQUIVOS DE CONFIGURACAO (nao documentados na v7.0)

| Arquivo | Descricao |
|---------|-----------|
| next.config.mjs | Configuracao Next.js 16 |
| tailwind.config.ts | Configuracao Tailwind CSS com design tokens |
| postcss.config.mjs | Configuracao PostCSS |
| components.json | Configuracao shadcn/ui |
| tsconfig.json | Configuracao TypeScript |
| package.json | Dependencias e scripts |
| vercel.json | Configuracao de deploy Vercel (se existir) |
| middleware.ts | Middleware de autenticacao e rotas |

---

## SECAO 14: DOCUMENTACAO EXISTENTE (9 arquivos MD)

1. **importanteuppi.md** - Este documento (auditoria completa)
2. **STATUS.md** - Status de implementacao
3. **IMPLEMENTATION.md** - Detalhes de implementacao
4. **PLAYSTORE.md** - Guia de publicacao Play Store (TWA/Bubblewrap/Capacitor)
5. **docs/API.md** - Documentacao completa de todas as APIs com exemplos JSON
6. **docs/DATABASE.md** - Documentacao do banco com diagrama ER, tabelas, enums, queries PostGIS
7. **docs/REALTIME-TESTING.md** - Guia de teste do sistema realtime (passageiro x motorista)
8. **lib/google-maps/EXAMPLES.md** - Exemplos de uso do Google Maps
9. **lib/google-maps/README.md** - Documentacao Google Maps

---

## SECAO 15: SCRIPTS SQL - ORDEM DE EXECUCAO

### Fase 1: Base (executar primeiro)
1. scripts/setup-database.sql (8 tabelas + enums + 4 functions + 7 triggers + 9 indexes + 19 policies)
2. scripts/add-vehicle-type-to-rides.sql (ALTER TABLE + 2 indexes + 3 policies)

### Fase 2: Features Core
3. scripts/create-wallet-tables.sql (5 tabelas + 2 functions + 2 triggers + 5 indexes + 9 policies)
4. scripts/create-subscriptions.sql (1 tabela + 3 policies)
5. scripts/final-features-migration.sql (3 tabelas + 3 functions + 4 indexes + 4 policies)

### Fase 3: Reviews e Social
6. scripts/create-bidirectional-reviews.sql (1 tabela + 3 functions + 1 trigger + 3 indexes + 5 policies)
7. scripts/create-enhanced-reviews.sql (3 tabelas + 3 functions + 2 triggers + 3 indexes + 4 policies)
8. scripts/create-social-feed.sql (5 tabelas + 4 functions + 3 triggers + 8 indexes + 15 policies)

### Fase 4: Features Avancadas
9. scripts/create-group-rides.sql (2 tabelas + 4 functions + 2 triggers + 6 indexes + 7 policies)
10. scripts/create-ride-recordings.sql (2 tabelas + 2 functions + 2 triggers + 4 indexes + 5 policies)
11. scripts/create-sms-fallback.sql (2 tabelas + 3 functions + 1 trigger + 4 indexes + 4 policies)
12. scripts/create-webhooks.sql (2 tabelas + 4 functions + 2 triggers + 5 indexes + 2 policies)

### Fase 5: Referral e Support
13. scripts/add-referral-system.sql (2 tabelas + 3 functions + 2 triggers + 4 indexes + 2 policies)
14. scripts/create-support-chat.sql (2 tabelas + 2 indexes + 3 policies)

### Fase 6: Functions Standalone
15. scripts/create-nearby-drivers-function.sql (1 function PostGIS)
16. scripts/create-heatmap-function.sql (2 functions)
17. scripts/create-leaderboard.sql (1 function)
18. scripts/create-analytics-functions.sql (5 functions admin)
19. scripts/add-driver-verification.sql (1 function + 1 index)

### Fase 7: Admin e Config
20. scripts/admin-setup.sql (1 tabela + 13 policies admin)
21. scripts/enable-realtime.sql (habilita Supabase Realtime em tabelas chave)
22. scripts/rename-comfort-to-electric.sql (ALTER TYPE vehicle_type)

### Fase 8: Seeds e Admin
23. scripts/seed-test-data.sql (dados de teste)
24. scripts/create-first-admin.sql (cria primeiro admin)
25. scripts/promote-admin.sql (promove usuario a admin)
26. scripts/create-admin.js (Node.js - cria admin via Supabase API)

---

## SECAO 16: ENUMS DO BANCO

1. **user_type**: passenger, driver, both
2. **ride_status**: pending, negotiating, accepted, in_progress, completed, cancelled
3. **offer_status**: pending, accepted, rejected, expired
4. **payment_method**: cash, credit_card, debit_card, pix, wallet
5. **vehicle_type**: economy, electric, premium, suv, moto
6. **transaction_type**: credit, debit, refund, cashback, withdrawal, bonus, transfer

---

## SECAO 17: SUPABASE REALTIME

### Tabelas com Realtime habilitado (enable-realtime.sql)
- rides (novas corridas para motoristas)
- price_offers (ofertas em tempo real)
- messages (chat em tempo real)
- notifications (notificacoes push)

### Channels usados no codigo
- `offers-{rideId}` - Passageiro escuta novas ofertas
- `chat-{rideId}` - Chat bidirecional
- `rides-{vehicleType}` - Motorista escuta corridas do seu tipo
- `notifications-{userId}` - Notificacoes do usuario

---

## SECAO 18: VARIAVEIS DE AMBIENTE (verificadas no codigo)

### Obrigatorias (via Supabase integration)
- NEXT_PUBLIC_SUPABASE_URL (usado em: client.ts, server.ts, proxy.ts, admin.ts, create-admin.js)
- NEXT_PUBLIC_SUPABASE_ANON_KEY (usado em: client.ts, server.ts, proxy.ts)
- SUPABASE_SERVICE_ROLE_KEY (usado em: admin.ts, create-admin.js)

### Google Maps
- NEXT_PUBLIC_GOOGLE_MAPS_API_KEY (usado em: provider.tsx, google-map.tsx, route-map.tsx, route-preview-3d.tsx, geocode/route.ts, routes/alternatives/route.ts, admin pages)
- GOOGLE_MAPS_API_KEY (fallback server-side, usado em: distance/route.ts, places/autocomplete/route.ts, places/details/route.ts)

### Seguranca/Cron
- CRON_SECRET (usado em: webhooks/process/route.ts, sms/send/route.ts - autenticacao de cron jobs)

### Opcionais
- STRIPE_SECRET_KEY (pagamentos reais - nao referenciado no codigo atual)

---

## SECAO 19: STACK TECNICA COMPLETA

### Frontend
- Next.js 16 (App Router, Turbopack)
- React 19.2
- TypeScript 5
- Tailwind CSS 4
- shadcn/ui (85 componentes em /ui/: 54 base + 31 iOS custom)
- next-themes (dark/light/auto)
- sonner (toasts iOS)
- lucide-react (icones)
- recharts (graficos admin)
- input-otp (verificacao SMS)

### Backend
- Supabase PostgreSQL 15+ com PostGIS
- Supabase Auth (telefone + OTP)
- Supabase Realtime (WebSockets)
- Supabase Storage (avatars, gravacoes)
- Supabase RLS (98 policies)

### APIs Externas
- Google Maps JavaScript API
- Google Places API
- Google Directions API
- Google Geocoding API
- Google Distance Matrix API
- Twilio SMS (fallback)

### Infraestrutura
- Vercel (deploy)
- Service Worker (offline/cache)
- TWA ready (Play Store)

---

## SECAO 20: FEATURES DIFERENCIADAS vs UBER/99

1. Negociacao de preco bidirecional (estilo inDrive)
2. Rotas alternativas com precos comparados
3. Zonas quentes com heatmap para motoristas
4. Preview 3D de trajetos (tilt 0-67.5, rotacao 360, flyover)
5. Assistente de voz em portugues (Web Speech API)
6. Verificacao facial de motoristas (a cada 24h)
7. Gravacao de audio criptografada AES-256-GCM (auto-delete 7 dias)
8. Corridas em grupo com split payment (igual/custom/distancia)
9. Gamificacao completa (13 conquistas, 4 categorias, leaderboard)
10. Feed social (compartilhar economia, conquistas)
11. Club Uppi (assinaturas Basic/Premium/VIP com cashback)
12. IA de sugestoes (destinos, precos, insights contextuais)
13. Programa de indicacao com bonus bilateral
14. Tema automatico por horario (18h-6h modo escuro)
15. UX iOS premium (haptic feedback, gestos, skeleton loaders, transitions)
16. Admin dashboard completo com analytics
17. Sistema de webhooks com HMAC signatures
18. SMS fallback via Twilio com templates
19. Rate limiting em todas as APIs (sliding window)
20. Sistema de SOS com GPS e notificacao de contatos

---

---

## SECAO 21: RESUMO DE DIVERGENCIAS (v7.0 -> v7.1)

### Paginas
- **28 paginas** listadas na v7.0 NAO existem no codigo (ver Secao 7 - tabela "NAO IMPLEMENTADAS")
- **17 paginas** existem no codigo mas NAO estavam documentadas (agora adicionadas)
- Fluxo de auth renomeado: /onboarding/* foi substituido por /auth/* em todo o projeto

### APIs
- **5 endpoints** listados na v7.0 NAO existem no codigo (ver Secao 6 - tabela "NAO IMPLEMENTADAS")
- **2 endpoints admin** existem mas NAO estavam documentados (/api/admin/setup, /api/admin/create-first)
- **1 endpoint** existia mas NAO estava documentado (/api/distance)
- **1 endpoint** existia mas NAO estava documentado (/api/ratings, separado de /api/reviews)

### Contagem Corrigida
- Paginas reais: **65** (nao 64 como na v7.0)
- Endpoints HTTP reais: **63** (nao 66 como na v7.0)
- Arquivos de config NAO estavam documentados (agora em Secao 13.5)

---

**FIM DA AUDITORIA - 24/02/2026**
**Versao 11.0 - 73 tabelas ativas, schema exportado diretamente do Supabase**
**Documento atualizado por varredura completa de 264 arquivos do projeto**
