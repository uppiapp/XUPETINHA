-- Criar primeiro usuário admin
-- IMPORTANTE: Este script usa a extensão pgcrypto para hash de senha

-- 1. Criar o usuário na tabela auth.users
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  recovery_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'admin@uppi.com',
  crypt('Admin123!', gen_salt('bf')), -- ATENÇÃO: altere esta senha antes de executar em produção!
  NOW(),
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Admin Uppi"}',
  NOW(),
  NOW(),
  '',
  '',
  '',
  ''
)
ON CONFLICT (email) DO NOTHING
RETURNING id, email;

-- 2. Criar perfil correspondente
INSERT INTO profiles (
  id,
  email,
  full_name,
  is_admin,
  user_type,
  created_at
)
SELECT 
  id,
  email,
  'Admin Uppi',
  true,
  'passenger',
  NOW()
FROM auth.users
WHERE email = 'admin@uppi.com'
ON CONFLICT (id) DO UPDATE SET is_admin = true
RETURNING id, email, full_name, is_admin;
