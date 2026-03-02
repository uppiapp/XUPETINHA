-- Cria a tabela system_settings se não existir e popula os dados padrão
CREATE TABLE IF NOT EXISTS system_settings (
  key          TEXT PRIMARY KEY,
  value        TEXT NOT NULL DEFAULT '',
  description  TEXT,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Admins leem e escrevem; usuários autenticados apenas leem
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'system_settings' AND policyname = 'admins_all'
  ) THEN
    CREATE POLICY admins_all ON system_settings
      FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'system_settings' AND policyname = 'authenticated_read'
  ) THEN
    CREATE POLICY authenticated_read ON system_settings
      FOR SELECT USING (auth.role() = 'authenticated');
  END IF;
END $$;

-- Popula configurações padrão (idempotente)
INSERT INTO system_settings (key, value, description, updated_at)
VALUES
  ('platform_fee_percent',        '15',    'Porcentagem cobrada pela plataforma em cada corrida',            now()),
  ('min_ride_price',              '5.00',  'Valor minimo que o passageiro pode ofertar',                     now()),
  ('price_per_km',                '2.50',  'Base de calculo do preco de corrida por quilometro',             now()),
  ('max_driver_search_radius_km', '15',    'Distancia maxima em km para encontrar motoristas disponiveis',   now()),
  ('app_version_min',             '1.0.0', 'Versao minima obrigatoria para uso do app',                     now()),
  ('maintenance_mode',            'false', 'Quando true, nenhum novo pedido sera aceito no app',             now())
ON CONFLICT (key) DO NOTHING;
