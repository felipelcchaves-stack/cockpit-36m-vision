CREATE TABLE public.roadmap_fases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  subtitulo text,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.roadmap_fases TO anon, authenticated;
GRANT ALL ON public.roadmap_fases TO service_role;
ALTER TABLE public.roadmap_fases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Leitura pública de roadmap_fases" ON public.roadmap_fases FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Inserir roadmap_fases" ON public.roadmap_fases FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Atualizar roadmap_fases" ON public.roadmap_fases FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Remover roadmap_fases" ON public.roadmap_fases FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE public.roadmap_tarefas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fase_id uuid NOT NULL REFERENCES public.roadmap_fases(id) ON DELETE CASCADE,
  descricao text NOT NULL,
  ordem integer NOT NULL DEFAULT 0,
  concluida boolean NOT NULL DEFAULT false,
  concluida_em timestamptz,
  valor_previsto numeric NOT NULL DEFAULT 0,
  valor_realizado numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.roadmap_tarefas TO anon, authenticated;
GRANT ALL ON public.roadmap_tarefas TO service_role;
ALTER TABLE public.roadmap_tarefas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Leitura pública de roadmap_tarefas" ON public.roadmap_tarefas FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Inserir roadmap_tarefas" ON public.roadmap_tarefas FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Atualizar roadmap_tarefas" ON public.roadmap_tarefas FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Remover roadmap_tarefas" ON public.roadmap_tarefas FOR DELETE TO anon, authenticated USING (true);

CREATE TRIGGER update_roadmap_fases_updated_at BEFORE UPDATE ON public.roadmap_fases FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_roadmap_tarefas_updated_at BEFORE UPDATE ON public.roadmap_tarefas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.crm_receitas ADD COLUMN IF NOT EXISTS data_ritual date;
ALTER TABLE public.crm_receitas ADD COLUMN IF NOT EXISTS data_pagamento_prevista date;
ALTER TABLE public.crm_clientes ADD COLUMN IF NOT EXISTS data_ritual date;
ALTER TABLE public.crm_clientes ADD COLUMN IF NOT EXISTS data_pagamento date;

WITH f AS (
  INSERT INTO public.roadmap_fases (titulo, subtitulo, ordem) VALUES
    ('Ofensiva Sazonal', 'Pré-Dia D — captação máxima', 1),
    ('Operação Dia D', 'Liberação da liquidez travada', 2),
    ('Ponte de 90 Dias', 'Queima acelerada de passivos', 3),
    ('A Virada de Chave', 'De sobrevivência a acumulação', 4),
    ('O Império dos 36M', 'Patrimônio consolidado', 5)
  RETURNING id, ordem
)
INSERT INTO public.roadmap_tarefas (fase_id, descricao, ordem, concluida, valor_previsto, valor_realizado)
SELECT f.id, t.descricao, t.ordem, t.concluida, t.valor_previsto, CASE WHEN t.concluida THEN t.valor_previsto ELSE 0 END
FROM f
JOIN (VALUES
  (1, 'Mapear 20 leads Premium', 1, true, 0),
  (1, 'Fechar 3 Oye 30k', 2, true, 90000),
  (1, 'Agenda de rituais lotada', 3, false, 120000),
  (2, 'Documentação do aporte', 1, true, 0),
  (2, 'Confirmar R$ 700.000 de aporte', 2, false, 700000),
  (2, 'Plano de alocação assinado', 3, false, 0),
  (3, 'Quitar Oluwo', 1, false, 180000),
  (3, 'Renegociar Leka Novo', 2, false, 150000),
  (3, 'Zerar cartões rotativos', 3, false, 52300),
  (4, 'Reserva de 6 meses', 1, false, 180000),
  (4, 'Primeiro aporte em renda fixa', 2, false, 300000),
  (5, 'Estrutura societária', 1, false, 0),
  (5, 'Carteira diversificada 36M', 2, false, 36000000)
) AS t(fase_ordem, descricao, ordem, concluida, valor_previsto) ON t.fase_ordem = f.ordem;