CREATE TABLE public.crm_clientes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  tipo text NOT NULL,
  status text NOT NULL DEFAULT 'Interessado',
  valor numeric NOT NULL DEFAULT 0,
  nota text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_clientes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_clientes TO authenticated;
GRANT ALL ON public.crm_clientes TO service_role;

ALTER TABLE public.crm_clientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leitura pública de crm_clientes" ON public.crm_clientes FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Inserir crm_clientes" ON public.crm_clientes FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Atualizar crm_clientes" ON public.crm_clientes FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Remover crm_clientes" ON public.crm_clientes FOR DELETE TO anon, authenticated USING (true);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_crm_clientes_updated_at BEFORE UPDATE ON public.crm_clientes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.crm_clientes (nome, tipo, status, valor) VALUES
  ('Marcos Vinícius', 'Oye 30k', 'Pago', 30000),
  ('Dona Iracema', 'Premium 12k', 'Pago', 12000),
  ('Rafael Antunes', 'Ritual 4.5k', 'Confirmado', 4500),
  ('Juliana Prado', 'Egungun 5k', 'Confirmado', 5000),
  ('Beatriz Lima', 'Ritual 2.5k', 'Interessado', 2500),
  ('Sr. Alvarenga', 'Premium 12k', 'Interessado', 12000),
  ('Cláudia Rocha', 'Ritual 4.5k', 'Interessado', 4500);