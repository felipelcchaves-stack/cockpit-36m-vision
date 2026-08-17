ALTER TABLE public.ativos
  ADD COLUMN IF NOT EXISTS rende boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS modo_taxa text NOT NULL DEFAULT 'cdi',
  ADD COLUMN IF NOT EXISTS taxa_aa numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pct_cdi numeric NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS cdi_aa numeric NOT NULL DEFAULT 10.65,
  ADD COLUMN IF NOT EXISTS ultimo_fechamento date NOT NULL DEFAULT CURRENT_DATE;

GRANT UPDATE ON public.ativos TO anon, authenticated;
GRANT ALL ON public.ativos TO service_role;

DROP POLICY IF EXISTS "Atualizar ativos" ON public.ativos;
CREATE POLICY "Atualizar ativos" ON public.ativos FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.rendimentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ativo_id integer NOT NULL REFERENCES public.ativos(id) ON DELETE CASCADE,
  data date NOT NULL DEFAULT CURRENT_DATE,
  saldo_anterior numeric NOT NULL DEFAULT 0,
  juros numeric NOT NULL DEFAULT 0,
  saldo_final numeric NOT NULL DEFAULT 0,
  origem text NOT NULL DEFAULT 'automatico',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ativo_id, data, origem)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.rendimentos TO anon, authenticated;
GRANT ALL ON public.rendimentos TO service_role;

ALTER TABLE public.rendimentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leitura pública de rendimentos" ON public.rendimentos FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Inserir rendimentos" ON public.rendimentos FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Atualizar rendimentos" ON public.rendimentos FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Remover rendimentos" ON public.rendimentos FOR DELETE TO anon, authenticated USING (true);

CREATE OR REPLACE FUNCTION public.render_ativos()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  a record;
  d date;
  taxa_ano numeric;
  taxa_dia numeric;
  saldo numeric;
  juros numeric;
  dias integer := 0;
BEGIN
  FOR a IN SELECT * FROM public.ativos WHERE rende LOOP
    taxa_ano := CASE WHEN a.modo_taxa = 'fixa' THEN a.taxa_aa ELSE a.cdi_aa * a.pct_cdi / 100 END;
    IF taxa_ano IS NULL OR taxa_ano <= 0 THEN CONTINUE; END IF;
    taxa_dia := power(1 + taxa_ano / 100, 1.0 / 252) - 1;
    saldo := a.valor;
    d := a.ultimo_fechamento + 1;
    WHILE d <= CURRENT_DATE LOOP
      IF extract(isodow from d) < 6 THEN
        juros := round(saldo * taxa_dia, 2);
        INSERT INTO public.rendimentos (ativo_id, data, saldo_anterior, juros, saldo_final, origem)
        VALUES (a.id, d, saldo, juros, saldo + juros, 'automatico')
        ON CONFLICT (ativo_id, data, origem) DO NOTHING;
        saldo := saldo + juros;
        dias := dias + 1;
      END IF;
      d := d + 1;
    END LOOP;
    UPDATE public.ativos SET valor = saldo, ultimo_fechamento = CURRENT_DATE WHERE id = a.id;
  END LOOP;
  RETURN dias;
END;
$$;

GRANT EXECUTE ON FUNCTION public.render_ativos() TO anon, authenticated, service_role;

UPDATE public.ativos
SET rende = true, modo_taxa = 'cdi', pct_cdi = 110, cdi_aa = 10.65, ultimo_fechamento = CURRENT_DATE
WHERE id = 2;

UPDATE public.ativos
SET rende = true, modo_taxa = 'cdi', pct_cdi = 100, cdi_aa = 10.65, ultimo_fechamento = CURRENT_DATE
WHERE id = 3;

CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.unschedule('render-ativos-diario')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'render-ativos-diario');

SELECT cron.schedule('render-ativos-diario', '0 6 * * *', $$SELECT public.render_ativos();$$);