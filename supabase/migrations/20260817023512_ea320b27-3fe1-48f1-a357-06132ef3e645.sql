ALTER TABLE public.crm_receitas ADD COLUMN IF NOT EXISTS custo_operacao numeric NOT NULL DEFAULT 0;

CREATE TABLE public.aportes_mensais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competencia date NOT NULL UNIQUE,
  previsto numeric NOT NULL DEFAULT 70000,
  realizado numeric NOT NULL DEFAULT 0,
  nota text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.aportes_mensais TO anon, authenticated;
GRANT ALL ON public.aportes_mensais TO service_role;
ALTER TABLE public.aportes_mensais ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Leitura pública de aportes_mensais" ON public.aportes_mensais FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Inserir aportes_mensais" ON public.aportes_mensais FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Atualizar aportes_mensais" ON public.aportes_mensais FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Remover aportes_mensais" ON public.aportes_mensais FOR DELETE TO anon, authenticated USING (true);
CREATE TRIGGER update_aportes_mensais_updated_at BEFORE UPDATE ON public.aportes_mensais FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.parametros_mensais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_mensal numeric NOT NULL DEFAULT 22000,
  aluguel_potiguara numeric NOT NULL DEFAULT 10000,
  faturamento_base numeric NOT NULL DEFAULT 67500,
  fatura_cartao numeric NOT NULL DEFAULT 25000,
  receita_livre_mes numeric NOT NULL DEFAULT 0,
  obra_meses_restantes integer NOT NULL DEFAULT 3,
  potiguara_meses_restantes integer NOT NULL DEFAULT 3,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.parametros_mensais TO anon, authenticated;
GRANT ALL ON public.parametros_mensais TO service_role;
ALTER TABLE public.parametros_mensais ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Leitura pública de parametros_mensais" ON public.parametros_mensais FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Inserir parametros_mensais" ON public.parametros_mensais FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Atualizar parametros_mensais" ON public.parametros_mensais FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Remover parametros_mensais" ON public.parametros_mensais FOR DELETE TO anon, authenticated USING (true);
CREATE TRIGGER update_parametros_mensais_updated_at BEFORE UPDATE ON public.parametros_mensais FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.parametros_mensais (receita_livre_mes) VALUES (67500);
UPDATE public.crm_receitas SET custo_operacao = 10000 WHERE produto ILIKE '%Imule Agba%';