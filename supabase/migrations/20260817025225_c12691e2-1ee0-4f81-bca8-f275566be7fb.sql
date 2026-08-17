ALTER TABLE public.rendimentos DROP CONSTRAINT IF EXISTS rendimentos_ativo_id_data_origem_key;
CREATE UNIQUE INDEX IF NOT EXISTS rendimentos_fechamento_unico
  ON public.rendimentos (ativo_id, data)
  WHERE origem = 'rendimento';