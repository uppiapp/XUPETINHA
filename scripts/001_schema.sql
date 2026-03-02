-- ============================================================
-- UPPI - Schema Completo
-- ============================================================

-- Extensoes
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ENUMs
DO $$ BEGIN
  CREATE TYPE user_type AS ENUM ('passenger', 'driver', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE ride_status AS ENUM ('pending', 'negotiating', 'accepted', 'driver_arrived', 'in_progress', 'completed', 'cancelled', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE offer_status AS ENUM ('pending', 'accepted', 'rejected', 'expired');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE payment_method AS ENUM ('cash', 'credit_card', 'debit_card', 'pix', 'wallet');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE vehicle_type AS ENUM ('economy', 'electric', 'premium', 'suv', 'moto');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE transaction_type AS ENUM ('credit', 'debit', 'withdrawal', 'refund', 'bonus');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE transaction_status AS ENUM ('pending', 'completed', 'failed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE verification_status AS ENUM ('pending', 'approved', 'rejected', 'expired');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE support_status AS ENUM ('open', 'in_progress', 'resolved', 'closed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE support_priority AS ENUM ('low', 'medium', 'high', 'urgent');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE support_category AS ENUM ('general', 'payment', 'driver', 'safety', 'technical', 'other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- PROFILES
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  email text,
  full_name text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  avatar_url text,
  user_type user_type NOT NULL DEFAULT 'passenger',
  is_admin boolean NOT NULL DEFAULT false,
  is_banned boolean NOT NULL DEFAULT false,
  banned_at timestamptz,
  ban_reason text,
  preferences jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- DRIVER PROFILES
-- ============================================================
CREATE TABLE IF NOT EXISTS driver_profiles (
  id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  vehicle_brand text NOT NULL DEFAULT '',
  vehicle_model text NOT NULL DEFAULT '',
  vehicle_plate text NOT NULL DEFAULT '',
  vehicle_color text NOT NULL DEFAULT '',
  vehicle_type vehicle_type NOT NULL DEFAULT 'economy',
  vehicle_year integer,
  is_verified boolean NOT NULL DEFAULT false,
  is_available boolean NOT NULL DEFAULT false,
  current_lat double precision,
  current_lng double precision,
  total_earnings numeric(10,2) NOT NULL DEFAULT 0,
  rating numeric(3,2),
  total_rides integer NOT NULL DEFAULT 0,
  acceptance_rate numeric(5,2) NOT NULL DEFAULT 0,
  completion_rate numeric(5,2) NOT NULL DEFAULT 0,
  cnh_number text,
  cnh_expiry date,
  document_url text,
  last_verification_at timestamptz,
  verification_photo_url text,
  verification_status verification_status NOT NULL DEFAULT 'pending',
  requires_verification boolean NOT NULL DEFAULT false,
  verification_attempts integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- RIDES
-- ============================================================
CREATE TABLE IF NOT EXISTS rides (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  passenger_id uuid NOT NULL REFERENCES profiles(id),
  driver_id uuid REFERENCES profiles(id),
  vehicle_type vehicle_type DEFAULT 'economy',
  pickup_lat double precision,
  pickup_lng double precision,
  pickup_address text NOT NULL DEFAULT '',
  dropoff_lat double precision,
  dropoff_lng double precision,
  dropoff_address text NOT NULL DEFAULT '',
  distance_km numeric(8,2),
  estimated_duration_minutes integer,
  passenger_price_offer numeric(10,2),
  final_price numeric(10,2),
  payment_method payment_method DEFAULT 'cash',
  status ride_status NOT NULL DEFAULT 'pending',
  scheduled_time timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  cancellation_reason text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- PRICE OFFERS (unificado - era price_offers e ride_offers)
-- ============================================================
CREATE TABLE IF NOT EXISTS price_offers (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  ride_id uuid NOT NULL REFERENCES rides(id) ON DELETE CASCADE,
  driver_id uuid NOT NULL REFERENCES profiles(id),
  offered_price numeric(10,2) NOT NULL,
  message text,
  status offer_status NOT NULL DEFAULT 'pending',
  eta_minutes integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- DRIVER LOCATIONS (realtime GPS)
-- ============================================================
CREATE TABLE IF NOT EXISTS driver_locations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  heading numeric(5,2),
  speed numeric(6,2),
  accuracy numeric(6,2),
  is_available boolean NOT NULL DEFAULT false,
  last_updated timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(driver_id)
);

-- ============================================================
-- RIDE TRACKING
-- ============================================================
CREATE TABLE IF NOT EXISTS ride_tracking (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  ride_id uuid NOT NULL REFERENCES rides(id) ON DELETE CASCADE,
  driver_id uuid NOT NULL REFERENCES profiles(id),
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  speed numeric(6,2),
  heading numeric(5,2),
  accuracy numeric(6,2),
  timestamp timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- RATINGS
-- ============================================================
CREATE TABLE IF NOT EXISTS ratings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  ride_id uuid NOT NULL REFERENCES rides(id) ON DELETE CASCADE,
  rater_id uuid NOT NULL REFERENCES profiles(id),
  rated_id uuid NOT NULL REFERENCES profiles(id),
  score integer NOT NULL CHECK (score BETWEEN 1 AND 5),
  comment text,
  category_ratings jsonb DEFAULT '{}',
  is_anonymous boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(ride_id, rater_id)
);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'info',
  data jsonb DEFAULT '{}',
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- MESSAGES (chat na corrida)
-- ============================================================
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  ride_id uuid NOT NULL REFERENCES rides(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES profiles(id),
  content text NOT NULL,
  type text NOT NULL DEFAULT 'text',
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- USER WALLETS
-- ============================================================
CREATE TABLE IF NOT EXISTS user_wallets (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  balance numeric(10,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- WALLET TRANSACTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES profiles(id),
  type transaction_type NOT NULL,
  amount numeric(10,2) NOT NULL,
  description text,
  ride_id uuid REFERENCES rides(id),
  status transaction_status NOT NULL DEFAULT 'pending',
  reference_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- FAVORITES
-- ============================================================
CREATE TABLE IF NOT EXISTS favorites (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  label text NOT NULL,
  address text NOT NULL,
  lat double precision,
  lng double precision,
  icon text DEFAULT 'home',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- COUPONS
-- ============================================================
CREATE TABLE IF NOT EXISTS coupons (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  code text NOT NULL UNIQUE,
  description text,
  discount_type text NOT NULL DEFAULT 'percentage',
  discount_value numeric(10,2) NOT NULL,
  min_ride_value numeric(10,2),
  max_discount numeric(10,2),
  usage_limit integer,
  usage_count integer NOT NULL DEFAULT 0,
  valid_from timestamptz NOT NULL DEFAULT now(),
  valid_until timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_coupons (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  coupon_id uuid NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  used boolean NOT NULL DEFAULT false,
  used_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- EMERGENCY
-- ============================================================
CREATE TABLE IF NOT EXISTS emergency_contacts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  phone text NOT NULL,
  relationship text,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS emergency_alerts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES profiles(id),
  ride_id uuid REFERENCES rides(id),
  type text NOT NULL DEFAULT 'sos',
  status text NOT NULL DEFAULT 'active',
  lat double precision,
  lng double precision,
  notes text,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- SUPPORT
-- ============================================================
CREATE TABLE IF NOT EXISTS support_tickets (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES profiles(id),
  ride_id uuid REFERENCES rides(id),
  subject text NOT NULL,
  category support_category NOT NULL DEFAULT 'general',
  status support_status NOT NULL DEFAULT 'open',
  priority support_priority NOT NULL DEFAULT 'medium',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS support_messages (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id uuid NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES profiles(id),
  content text NOT NULL,
  is_admin boolean NOT NULL DEFAULT false,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- PUSH SUBSCRIPTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE,
  auth_key text,
  p256dh_key text,
  device_type text DEFAULT 'web',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- NOTIFICATION PREFERENCES
-- ============================================================
CREATE TABLE IF NOT EXISTS notification_preferences (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  push_enabled boolean NOT NULL DEFAULT true,
  email_enabled boolean NOT NULL DEFAULT true,
  sms_enabled boolean NOT NULL DEFAULT false,
  ride_updates boolean NOT NULL DEFAULT true,
  promotional boolean NOT NULL DEFAULT false,
  chat_messages boolean NOT NULL DEFAULT true,
  payment_updates boolean NOT NULL DEFAULT true,
  driver_arrival boolean NOT NULL DEFAULT true,
  trip_completed boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- SOCIAL
-- ============================================================
CREATE TABLE IF NOT EXISTS social_posts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  type text NOT NULL DEFAULT 'text',
  image_url text,
  ride_id uuid REFERENCES rides(id),
  likes_count integer NOT NULL DEFAULT 0,
  comments_count integer NOT NULL DEFAULT 0,
  is_pinned boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS post_comments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id uuid NOT NULL REFERENCES social_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id),
  parent_id uuid REFERENCES post_comments(id),
  content text NOT NULL,
  likes_count integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- ACHIEVEMENTS + LEADERBOARD
-- ============================================================
CREATE TABLE IF NOT EXISTS user_achievements (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  achievement text NOT NULL,
  title text NOT NULL,
  description text,
  icon text,
  points integer NOT NULL DEFAULT 0,
  unlocked_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS leaderboard (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES profiles(id),
  user_type text NOT NULL DEFAULT 'passenger',
  period text NOT NULL DEFAULT 'weekly',
  score integer NOT NULL DEFAULT 0,
  rank integer,
  rides_count integer,
  rating_avg numeric(3,2),
  period_start timestamptz,
  period_end timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- HOT ZONES
-- ============================================================
CREATE TABLE IF NOT EXISTS hot_zones (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  radius integer NOT NULL DEFAULT 500,
  danger_level text NOT NULL DEFAULT 'low',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- POPULAR ROUTES
-- ============================================================
CREATE TABLE IF NOT EXISTS popular_routes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  start_address text NOT NULL,
  end_address text NOT NULL,
  start_latitude double precision NOT NULL,
  start_longitude double precision NOT NULL,
  end_latitude double precision NOT NULL,
  end_longitude double precision NOT NULL,
  usage_count integer NOT NULL DEFAULT 0,
  avg_price numeric(10,2),
  avg_duration integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- REFERRALS
-- ============================================================
CREATE TABLE IF NOT EXISTS referrals (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  referrer_id uuid NOT NULL REFERENCES profiles(id),
  referred_id uuid REFERENCES profiles(id),
  code text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending',
  reward_amount numeric(10,2),
  reward_paid boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

-- ============================================================
-- PRICING RULES
-- ============================================================
CREATE TABLE IF NOT EXISTS pricing_rules (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  rule_type text NOT NULL,
  base_price numeric(10,2),
  price_per_km numeric(8,4),
  price_per_minute numeric(8,4),
  min_price numeric(10,2),
  multiplier numeric(5,2) DEFAULT 1.0,
  conditions jsonb DEFAULT '{}',
  active boolean NOT NULL DEFAULT true,
  priority integer NOT NULL DEFAULT 0,
  valid_from timestamptz,
  valid_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- ADDRESS SEARCH HISTORY
-- ============================================================
CREATE TABLE IF NOT EXISTS address_search_history (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  address text NOT NULL,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  search_type text DEFAULT 'origin',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- DRIVER VERIFICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS driver_verifications (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id uuid NOT NULL REFERENCES profiles(id),
  verification_type text NOT NULL DEFAULT 'facial',
  status verification_status NOT NULL DEFAULT 'pending',
  submitted_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES profiles(id),
  notes text,
  documents jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- REPORTS
-- ============================================================
CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id uuid NOT NULL REFERENCES profiles(id),
  reported_user_id uuid REFERENCES profiles(id),
  ride_id uuid REFERENCES rides(id),
  reason text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'pending',
  reviewed_by uuid REFERENCES profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- SCHEDULED RIDES
-- ============================================================
CREATE TABLE IF NOT EXISTS scheduled_rides (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  passenger_id uuid NOT NULL REFERENCES profiles(id),
  origin_address text NOT NULL,
  origin_lat double precision,
  origin_lng double precision,
  dest_address text NOT NULL,
  dest_lat double precision,
  dest_lng double precision,
  scheduled_at timestamptz NOT NULL,
  estimated_price numeric(10,2),
  status text NOT NULL DEFAULT 'pending',
  ride_id uuid REFERENCES rides(id),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- GROUP RIDES
-- ============================================================
CREATE TABLE IF NOT EXISTS group_rides (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organizer_id uuid NOT NULL REFERENCES profiles(id),
  ride_id uuid REFERENCES rides(id),
  name text,
  max_passengers integer NOT NULL DEFAULT 4,
  share_code text UNIQUE,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS group_ride_participants (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_ride_id uuid NOT NULL REFERENCES group_rides(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id),
  status text NOT NULL DEFAULT 'joined',
  joined_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_rides_passenger_id ON rides(passenger_id);
CREATE INDEX IF NOT EXISTS idx_rides_driver_id ON rides(driver_id);
CREATE INDEX IF NOT EXISTS idx_rides_status ON rides(status);
CREATE INDEX IF NOT EXISTS idx_rides_created_at ON rides(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_price_offers_ride_id ON price_offers(ride_id);
CREATE INDEX IF NOT EXISTS idx_price_offers_driver_id ON price_offers(driver_id);
CREATE INDEX IF NOT EXISTS idx_price_offers_status ON price_offers(status);
CREATE INDEX IF NOT EXISTS idx_driver_locations_driver_id ON driver_locations(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_locations_available ON driver_locations(is_available) WHERE is_available = true;
CREATE INDEX IF NOT EXISTS idx_ride_tracking_ride_id ON ride_tracking(ride_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_messages_ride_id ON messages(ride_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_id ON wallet_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_driver_profiles_available ON driver_profiles(is_available) WHERE is_available = true;
CREATE INDEX IF NOT EXISTS idx_driver_profiles_verified ON driver_profiles(is_verified) WHERE is_verified = true;

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ 
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['profiles','driver_profiles','rides','price_offers','driver_locations','user_wallets','notification_preferences','support_tickets','popular_routes','pricing_rules','driver_verifications','social_posts']
  LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS trg_%I_updated_at ON %I;
      CREATE TRIGGER trg_%I_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at();
    ', t, t, t, t);
  END LOOP;
END $$;

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE rides ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ride_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;

-- Profiles: proprio usuario le/edita; todos podem ver basico
DROP POLICY IF EXISTS "profiles_select" ON profiles;
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "profiles_insert" ON profiles;
CREATE POLICY "profiles_insert" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "profiles_update" ON profiles;
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Driver profiles: publicos para leitura
DROP POLICY IF EXISTS "driver_profiles_select" ON driver_profiles;
CREATE POLICY "driver_profiles_select" ON driver_profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "driver_profiles_insert" ON driver_profiles;
CREATE POLICY "driver_profiles_insert" ON driver_profiles FOR INSERT WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "driver_profiles_update" ON driver_profiles;
CREATE POLICY "driver_profiles_update" ON driver_profiles FOR UPDATE USING (auth.uid() = id);

-- Rides: passageiro e motorista da corrida
DROP POLICY IF EXISTS "rides_select" ON rides;
CREATE POLICY "rides_select" ON rides FOR SELECT USING (
  auth.uid() = passenger_id OR auth.uid() = driver_id
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);
DROP POLICY IF EXISTS "rides_insert" ON rides;
CREATE POLICY "rides_insert" ON rides FOR INSERT WITH CHECK (auth.uid() = passenger_id);
DROP POLICY IF EXISTS "rides_update" ON rides;
CREATE POLICY "rides_update" ON rides FOR UPDATE USING (
  auth.uid() = passenger_id OR auth.uid() = driver_id
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);

-- Price offers: motoristas podem criar; passageiro e motorista da corrida podem ver
DROP POLICY IF EXISTS "price_offers_select" ON price_offers;
CREATE POLICY "price_offers_select" ON price_offers FOR SELECT USING (
  auth.uid() = driver_id
  OR EXISTS (SELECT 1 FROM rides WHERE id = price_offers.ride_id AND passenger_id = auth.uid())
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);
DROP POLICY IF EXISTS "price_offers_insert" ON price_offers;
CREATE POLICY "price_offers_insert" ON price_offers FOR INSERT WITH CHECK (auth.uid() = driver_id);
DROP POLICY IF EXISTS "price_offers_update" ON price_offers;
CREATE POLICY "price_offers_update" ON price_offers FOR UPDATE USING (
  auth.uid() = driver_id
  OR EXISTS (SELECT 1 FROM rides WHERE id = price_offers.ride_id AND passenger_id = auth.uid())
);

-- Driver locations: motorista atualiza; todos podem ler (para mapa)
DROP POLICY IF EXISTS "driver_locations_select" ON driver_locations;
CREATE POLICY "driver_locations_select" ON driver_locations FOR SELECT USING (true);
DROP POLICY IF EXISTS "driver_locations_upsert" ON driver_locations;
CREATE POLICY "driver_locations_upsert" ON driver_locations FOR INSERT WITH CHECK (auth.uid() = driver_id);
DROP POLICY IF EXISTS "driver_locations_update" ON driver_locations;
CREATE POLICY "driver_locations_update" ON driver_locations FOR UPDATE USING (auth.uid() = driver_id);

-- Ride tracking: motorista insere; passageiro e motorista da corrida leem
DROP POLICY IF EXISTS "ride_tracking_select" ON ride_tracking;
CREATE POLICY "ride_tracking_select" ON ride_tracking FOR SELECT USING (
  auth.uid() = driver_id
  OR EXISTS (SELECT 1 FROM rides WHERE id = ride_tracking.ride_id AND passenger_id = auth.uid())
);
DROP POLICY IF EXISTS "ride_tracking_insert" ON ride_tracking;
CREATE POLICY "ride_tracking_insert" ON ride_tracking FOR INSERT WITH CHECK (auth.uid() = driver_id);

-- Notifications: proprio usuario
DROP POLICY IF EXISTS "notifications_select" ON notifications;
CREATE POLICY "notifications_select" ON notifications FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "notifications_insert" ON notifications;
CREATE POLICY "notifications_insert" ON notifications FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "notifications_update" ON notifications;
CREATE POLICY "notifications_update" ON notifications FOR UPDATE USING (auth.uid() = user_id);

-- Messages: sender e participantes da corrida
DROP POLICY IF EXISTS "messages_select" ON messages;
CREATE POLICY "messages_select" ON messages FOR SELECT USING (
  auth.uid() = sender_id
  OR EXISTS (
    SELECT 1 FROM rides WHERE id = messages.ride_id 
    AND (passenger_id = auth.uid() OR driver_id = auth.uid())
  )
);
DROP POLICY IF EXISTS "messages_insert" ON messages;
CREATE POLICY "messages_insert" ON messages FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- Wallets
DROP POLICY IF EXISTS "wallets_select" ON user_wallets;
CREATE POLICY "wallets_select" ON user_wallets FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "wallets_insert" ON user_wallets;
CREATE POLICY "wallets_insert" ON user_wallets FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Transactions
DROP POLICY IF EXISTS "transactions_select" ON wallet_transactions;
CREATE POLICY "transactions_select" ON wallet_transactions FOR SELECT USING (auth.uid() = user_id);

-- Favorites
DROP POLICY IF EXISTS "favorites_all" ON favorites;
CREATE POLICY "favorites_all" ON favorites USING (auth.uid() = user_id);

-- Ratings
DROP POLICY IF EXISTS "ratings_select" ON ratings;
CREATE POLICY "ratings_select" ON ratings FOR SELECT USING (true);
DROP POLICY IF EXISTS "ratings_insert" ON ratings;
CREATE POLICY "ratings_insert" ON ratings FOR INSERT WITH CHECK (auth.uid() = rater_id);

-- ============================================================
-- REALTIME
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE rides;
ALTER PUBLICATION supabase_realtime ADD TABLE price_offers;
ALTER PUBLICATION supabase_realtime ADD TABLE driver_locations;
ALTER PUBLICATION supabase_realtime ADD TABLE ride_tracking;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- ============================================================
-- SEED: pricing rules padrao
-- ============================================================
INSERT INTO pricing_rules (name, rule_type, base_price, price_per_km, price_per_minute, min_price, multiplier, active, priority)
VALUES
  ('Economy Base', 'economy', 5.00, 1.80, 0.30, 8.00, 1.0, true, 1),
  ('Premium Base', 'premium', 10.00, 3.50, 0.60, 15.00, 1.0, true, 1),
  ('SUV Base', 'suv', 12.00, 4.00, 0.70, 18.00, 1.0, true, 1),
  ('Moto Base', 'moto', 3.00, 1.20, 0.20, 5.00, 1.0, true, 1),
  ('Electric Base', 'electric', 7.00, 2.00, 0.35, 10.00, 1.0, true, 1),
  ('Surge 1.5x', 'surge', NULL, NULL, NULL, NULL, 1.5, false, 10),
  ('Surge 2x', 'surge', NULL, NULL, NULL, NULL, 2.0, false, 20)
ON CONFLICT DO NOTHING;

-- SEED: zonas quentes exemplo
INSERT INTO hot_zones (name, latitude, longitude, radius, danger_level, is_active)
VALUES
  ('Centro SP', -23.5505, -46.6333, 1000, 'high', true),
  ('Paulista', -23.5617, -46.6559, 800, 'medium', true),
  ('Aeroporto GRU', -23.4323, -46.4731, 2000, 'low', true),
  ('Vila Madalena', -23.5557, -46.6903, 600, 'medium', true),
  ('Brooklin', -23.6026, -46.6974, 700, 'low', true)
ON CONFLICT DO NOTHING;
