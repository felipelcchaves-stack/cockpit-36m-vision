GRANT SELECT ON public.ativos TO anon, authenticated;
GRANT SELECT ON public.crm_receitas TO anon, authenticated;
GRANT SELECT, UPDATE ON public.passivos TO anon, authenticated;
GRANT ALL ON public.ativos TO service_role;
GRANT ALL ON public.crm_receitas TO service_role;
GRANT ALL ON public.passivos TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.ativos_id_seq TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.crm_receitas_id_seq TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.passivos_id_seq TO anon, authenticated;

ALTER TABLE public.ativos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_receitas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.passivos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leitura pública de ativos" ON public.ativos FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Leitura pública de crm_receitas" ON public.crm_receitas FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Leitura pública de passivos" ON public.passivos FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Atualizar status de passivos" ON public.passivos FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);