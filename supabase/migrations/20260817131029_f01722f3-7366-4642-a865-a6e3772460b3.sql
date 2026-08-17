-- 1. Perfis
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome text,
  avatar_url text,
  tema text NOT NULL DEFAULT 'dark',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Perfil próprio: ler" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Perfil próprio: criar" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Perfil próprio: atualizar" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, nome)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'nome', split_part(NEW.email, '@', 1)))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Políticas do bucket privado de avatares
CREATE POLICY "Avatar próprio: ler" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'avatares' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Avatar próprio: enviar" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatares' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Avatar próprio: atualizar" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'avatares' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Avatar próprio: remover" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'avatares' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 3. Fechar todas as tabelas de negócio: só autenticado
DROP POLICY IF EXISTS "Atualizar aportes_mensais" ON public.aportes_mensais;
DROP POLICY IF EXISTS "Inserir aportes_mensais" ON public.aportes_mensais;
DROP POLICY IF EXISTS "Leitura pública de aportes_mensais" ON public.aportes_mensais;
DROP POLICY IF EXISTS "Remover aportes_mensais" ON public.aportes_mensais;
CREATE POLICY "Cockpit autenticado: aportes_mensais" ON public.aportes_mensais
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
REVOKE ALL ON public.aportes_mensais FROM anon;

DROP POLICY IF EXISTS "Atualizar ativos" ON public.ativos;
DROP POLICY IF EXISTS "Leitura pública de ativos" ON public.ativos;
CREATE POLICY "Cockpit autenticado: ativos" ON public.ativos
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
REVOKE ALL ON public.ativos FROM anon;

DROP POLICY IF EXISTS "Atualizar crm_clientes" ON public.crm_clientes;
DROP POLICY IF EXISTS "Inserir crm_clientes" ON public.crm_clientes;
DROP POLICY IF EXISTS "Leitura pública de crm_clientes" ON public.crm_clientes;
DROP POLICY IF EXISTS "Remover crm_clientes" ON public.crm_clientes;
CREATE POLICY "Cockpit autenticado: crm_clientes" ON public.crm_clientes
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
REVOKE ALL ON public.crm_clientes FROM anon;

DROP POLICY IF EXISTS "Atualizar crm_receitas" ON public.crm_receitas;
DROP POLICY IF EXISTS "Inserir crm_receitas" ON public.crm_receitas;
DROP POLICY IF EXISTS "Leitura pública de crm_receitas" ON public.crm_receitas;
DROP POLICY IF EXISTS "Remover crm_receitas" ON public.crm_receitas;
CREATE POLICY "Cockpit autenticado: crm_receitas" ON public.crm_receitas
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
REVOKE ALL ON public.crm_receitas FROM anon;

DROP POLICY IF EXISTS "Atualizar parametros_mensais" ON public.parametros_mensais;
DROP POLICY IF EXISTS "Inserir parametros_mensais" ON public.parametros_mensais;
DROP POLICY IF EXISTS "Leitura pública de parametros_mensais" ON public.parametros_mensais;
DROP POLICY IF EXISTS "Remover parametros_mensais" ON public.parametros_mensais;
CREATE POLICY "Cockpit autenticado: parametros_mensais" ON public.parametros_mensais
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
REVOKE ALL ON public.parametros_mensais FROM anon;

DROP POLICY IF EXISTS "Atualizar status de passivos" ON public.passivos;
DROP POLICY IF EXISTS "Leitura pública de passivos" ON public.passivos;
CREATE POLICY "Cockpit autenticado: passivos" ON public.passivos
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
REVOKE ALL ON public.passivos FROM anon;

DROP POLICY IF EXISTS "Atualizar rendimentos" ON public.rendimentos;
DROP POLICY IF EXISTS "Inserir rendimentos" ON public.rendimentos;
DROP POLICY IF EXISTS "Leitura pública de rendimentos" ON public.rendimentos;
DROP POLICY IF EXISTS "Remover rendimentos" ON public.rendimentos;
CREATE POLICY "Cockpit autenticado: rendimentos" ON public.rendimentos
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
REVOKE ALL ON public.rendimentos FROM anon;

DROP POLICY IF EXISTS "Atualizar roadmap_fases" ON public.roadmap_fases;
DROP POLICY IF EXISTS "Inserir roadmap_fases" ON public.roadmap_fases;
DROP POLICY IF EXISTS "Leitura pública de roadmap_fases" ON public.roadmap_fases;
DROP POLICY IF EXISTS "Remover roadmap_fases" ON public.roadmap_fases;
CREATE POLICY "Cockpit autenticado: roadmap_fases" ON public.roadmap_fases
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
REVOKE ALL ON public.roadmap_fases FROM anon;

DROP POLICY IF EXISTS "Atualizar roadmap_tarefas" ON public.roadmap_tarefas;
DROP POLICY IF EXISTS "Inserir roadmap_tarefas" ON public.roadmap_tarefas;
DROP POLICY IF EXISTS "Leitura pública de roadmap_tarefas" ON public.roadmap_tarefas;
DROP POLICY IF EXISTS "Remover roadmap_tarefas" ON public.roadmap_tarefas;
CREATE POLICY "Cockpit autenticado: roadmap_tarefas" ON public.roadmap_tarefas
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
REVOKE ALL ON public.roadmap_tarefas FROM anon;

DROP POLICY IF EXISTS "Atualizar transacoes" ON public.transacoes;
DROP POLICY IF EXISTS "Inserir transacoes" ON public.transacoes;
DROP POLICY IF EXISTS "Leitura pública de transacoes" ON public.transacoes;
DROP POLICY IF EXISTS "Remover transacoes" ON public.transacoes;
CREATE POLICY "Cockpit autenticado: transacoes" ON public.transacoes
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
REVOKE ALL ON public.transacoes FROM anon;