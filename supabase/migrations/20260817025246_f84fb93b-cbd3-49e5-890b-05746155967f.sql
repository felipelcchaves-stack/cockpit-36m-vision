DROP INDEX IF EXISTS public.rendimentos_fechamento_unico;
CREATE UNIQUE INDEX rendimentos_fechamento_unico
  ON public.rendimentos (ativo_id, data)
  WHERE origem = 'automatico';