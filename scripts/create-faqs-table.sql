-- Tabela de perguntas frequentes (FAQ)
-- Gerenciada pelo admin em /admin/faq, consumida pela tela /uppi/help

CREATE TABLE IF NOT EXISTS public.faqs (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  question      text NOT NULL,
  answer        text NOT NULL,
  category      text NOT NULL DEFAULT 'Geral',
  order_index   integer NOT NULL DEFAULT 0,
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- Index para ordenação e filtro
CREATE INDEX IF NOT EXISTS idx_faqs_active_order ON public.faqs (is_active, order_index);

-- RLS: qualquer pessoa autenticada pode ler FAQs ativas
ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "FAQs ativas são públicas" ON public.faqs;
CREATE POLICY "FAQs ativas são públicas"
  ON public.faqs FOR SELECT
  USING (is_active = true);

DROP POLICY IF EXISTS "Admins gerenciam FAQs" ON public.faqs;
CREATE POLICY "Admins gerenciam FAQs"
  ON public.faqs FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  );
