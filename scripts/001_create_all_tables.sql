-- ============================================
-- UPPI - Migration completa do banco de dados
-- ============================================

-- 1. driver_profiles
CREATE TABLE IF NOT EXISTS public.driver_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  vehicle_type TEXT DEFAULT 'car' CHECK (vehicle_type IN ('car', 'moto', 'van', 'truck')),
  vehicle_brand TEXT,
  vehicle_model TEXT,
  vehicle_color TEXT,
  vehicle_plate TEXT,
  vehicle_year INT,
  rating NUMERIC(3,2) DEFAULT 5.00,
  total_rides INT DEFAULT 0,
  is_verified BOOLEAN DEFAULT true, -- true para facilitar testes
  is_available BOOLEAN DEFAULT false,
  acceptance_rate NUMERIC(5,2) DEFAULT 100.00,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. driver_locations
CREATE TABLE IF NOT EXISTS public.driver_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  is_available BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(driver_id)
);

-- 3. rides
CREATE TABLE IF NOT EXISTS public.rides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  passenger_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  driver_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','negotiating','accepted','in_progress','completed','cancelled','failed')),
  vehicle_type TEXT DEFAULT 'car',
  origin_address TEXT,
  origin_lat DOUBLE PRECISION,
  origin_lng DOUBLE PRECISION,
  destination_address TEXT,
  destination_lat DOUBLE PRECISION,
  destination_lng DOUBLE PRECISION,
  passenger_price_offer NUMERIC(10,2),
  final_price NUMERIC(10,2),
  distance_km NUMERIC(10,2),
  estimated_duration_minutes INT,
  notes TEXT,
  scheduled_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancel_reason TEXT,
  passenger_rating INT CHECK (passenger_rating BETWEEN 1 AND 5),
  driver_rating INT CHECK (driver_rating BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. price_offers
CREATE TABLE IF NOT EXISTS public.price_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id UUID REFERENCES public.rides(id) ON DELETE CASCADE,
  driver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  offered_price NUMERIC(10,2) NOT NULL,
  eta_minutes INT DEFAULT 5,
  message TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected','expired')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  data JSONB DEFAULT '{}',
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. wallet_transactions (para histórico de pagamentos)
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('credit','debit','withdrawal','refund')),
  amount NUMERIC(10,2) NOT NULL,
  description TEXT,
  ride_id UUID REFERENCES public.rides(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'completed' CHECK (status IN ('pending','completed','failed')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- RLS Policies
-- ============================================

ALTER TABLE public.driver_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

-- driver_profiles: motorista vê e edita o próprio
CREATE POLICY "driver_profiles_select" ON public.driver_profiles FOR SELECT USING (true);
CREATE POLICY "driver_profiles_insert" ON public.driver_profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "driver_profiles_update" ON public.driver_profiles FOR UPDATE USING (auth.uid() = id);

-- driver_locations: motorista gerencia a própria localização, todos podem ver
CREATE POLICY "driver_locations_select" ON public.driver_locations FOR SELECT USING (true);
CREATE POLICY "driver_locations_insert" ON public.driver_locations FOR INSERT WITH CHECK (auth.uid() = driver_id);
CREATE POLICY "driver_locations_update" ON public.driver_locations FOR UPDATE USING (auth.uid() = driver_id);

-- rides: passageiro vê suas corridas, motorista vê corridas pendentes e as suas
CREATE POLICY "rides_select_passenger" ON public.rides FOR SELECT USING (auth.uid() = passenger_id OR auth.uid() = driver_id OR status IN ('pending','negotiating'));
CREATE POLICY "rides_insert" ON public.rides FOR INSERT WITH CHECK (auth.uid() = passenger_id);
CREATE POLICY "rides_update" ON public.rides FOR UPDATE USING (auth.uid() = passenger_id OR auth.uid() = driver_id);

-- price_offers: motorista vê e cria suas ofertas, passageiro vê ofertas das suas corridas
CREATE POLICY "offers_select" ON public.price_offers FOR SELECT USING (auth.uid() = driver_id OR EXISTS (SELECT 1 FROM public.rides WHERE rides.id = price_offers.ride_id AND rides.passenger_id = auth.uid()));
CREATE POLICY "offers_insert" ON public.price_offers FOR INSERT WITH CHECK (auth.uid() = driver_id);
CREATE POLICY "offers_update" ON public.price_offers FOR UPDATE USING (auth.uid() = driver_id OR EXISTS (SELECT 1 FROM public.rides WHERE rides.id = price_offers.ride_id AND rides.passenger_id = auth.uid()));

-- notifications: cada um vê as próprias
CREATE POLICY "notifications_select" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "notifications_insert" ON public.notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "notifications_update" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

-- wallet_transactions: cada um vê as próprias
CREATE POLICY "wallet_select" ON public.wallet_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "wallet_insert" ON public.wallet_transactions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================
-- Criar driver_profile para o motorista de teste
-- ============================================
INSERT INTO public.driver_profiles (id, vehicle_type, vehicle_brand, vehicle_model, vehicle_color, vehicle_plate, vehicle_year, is_verified, is_available)
SELECT 
  au.id, 'car', 'Toyota', 'Corolla', 'Prata', 'ABC-1234', 2022, true, false
FROM auth.users au
JOIN public.profiles p ON p.id = au.id
WHERE p.user_type = 'driver'
ON CONFLICT (id) DO NOTHING;
