ALTER TABLE public.crm_receitas ADD COLUMN IF NOT EXISTS quantidade_realizada integer NOT NULL DEFAULT 0;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_receitas TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.crm_receitas_id_seq TO anon, authenticated;
GRANT ALL ON public.crm_receitas TO service_role;

CREATE POLICY "Inserir crm_receitas" ON public.crm_receitas FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Atualizar crm_receitas" ON public.crm_receitas FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Remover crm_receitas" ON public.crm_receitas FOR DELETE TO anon, authenticated USING (true);