CREATE TABLE public.transacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  data date NOT NULL DEFAULT CURRENT_DATE,
  descricao text NOT NULL,
  tipo text NOT NULL DEFAULT 'Receita',
  valor numeric NOT NULL DEFAULT 0,
  passivo_id integer REFERENCES public.passivos(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.transacoes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transacoes TO authenticated;
GRANT ALL ON public.transacoes TO service_role;

ALTER TABLE public.transacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leitura pública de transacoes" ON public.transacoes FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Inserir transacoes" ON public.transacoes FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Atualizar transacoes" ON public.transacoes FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Remover transacoes" ON public.transacoes FOR DELETE TO anon, authenticated USING (true);

CREATE TRIGGER update_transacoes_updated_at
BEFORE UPDATE ON public.transacoes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.passivos ADD COLUMN IF NOT EXISTS ordem_extermínio integer;

UPDATE public.passivos SET ordem_extermínio = 1 WHERE credor ILIKE '%agiota%';
UPDATE public.passivos SET ordem_extermínio = 2 WHERE credor ILIKE '%oluwo%';
UPDATE public.passivos SET ordem_extermínio = 3 WHERE credor ILIKE '%leka antigo%';
UPDATE public.passivos SET ordem_extermínio = 4 WHERE credor ILIKE '%leka novo%';
UPDATE public.passivos SET ordem_extermínio = 5 WHERE credor ILIKE '%caio%';
UPDATE public.passivos SET ordem_extermínio = 6 WHERE credor ILIKE '%nubank pessoal%';
UPDATE public.passivos SET ordem_extermínio = 7 WHERE credor ILIKE '%nubank empresa%';
UPDATE public.passivos SET ordem_extermínio = 8 WHERE credor ILIKE '%cart%';
UPDATE public.passivos SET ordem_extermínio = 9 WHERE credor ILIKE '%consignad%';
UPDATE public.passivos SET ordem_extermínio = 99 WHERE ordem_extermínio IS NULL;

GRANT UPDATE ON public.passivos TO anon;
GRANT UPDATE ON public.passivos TO authenticated;