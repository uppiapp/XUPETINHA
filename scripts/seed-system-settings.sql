-- Popula configurações padrão do sistema (idempotente via ON CONFLICT)
INSERT INTO system_settings (key, value, description, updated_at)
VALUES
  ('platform_fee_percent',          '15',    'Porcentagem cobrada pela plataforma em cada corrida',                       now()),
  ('min_ride_price',                '5.00',  'Valor minimo que o passageiro pode ofertar',                                now()),
  ('price_per_km',                  '2.50',  'Base de calculo do preco de corrida por quilometro',                        now()),
  ('max_driver_search_radius_km',   '15',    'Distancia maxima em km para encontrar motoristas disponiveis',              now()),
  ('app_version_min',               '1.0.0', 'Versao minima obrigatoria para uso do app',                                now()),
  ('maintenance_mode',              'false', 'Quando true, nenhum novo pedido sera aceito no app',                       now())
ON CONFLICT (key) DO UPDATE
  SET description = EXCLUDED.description,
      updated_at  = now()
WHERE system_settings.value = system_settings.value; -- não sobrescreve valor existente
