import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

export type Passivo = {
  id: number;
  credor: string;
  saldo_devedor: number;
  fase_quitacao: string | null;
  status: string | null;
};

export type Ativo = {
  id: number;
  nome: string;
  valor: number;
  tipo: string | null;
};

export type CrmReceita = {
  id: number;
  produto: string;
  ticket_medio: number;
  meta_quantidade: number;
  quantidade_realizada: number;
  status_campanha: string | null;
};

export type CrmReceitaInput = {
  produto: string;
  ticket_medio: number;
  meta_quantidade: number;
  quantidade_realizada: number;
  status_campanha: string | null;
};

const num = (v: unknown) => Number(v ?? 0);

export const passivosQuery = queryOptions({
  queryKey: ["passivos"],
  queryFn: async (): Promise<Passivo[]> => {
    const { data, error } = await supabase
      .from("passivos")
      .select("id, credor, saldo_devedor, fase_quitacao, status")
      .order("saldo_devedor", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((r) => ({ ...r, saldo_devedor: num(r.saldo_devedor) }));
  },
});

export const ativosQuery = queryOptions({
  queryKey: ["ativos"],
  queryFn: async (): Promise<Ativo[]> => {
    const { data, error } = await supabase
      .from("ativos")
      .select("id, nome, valor, tipo")
      .order("valor", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((r) => ({ ...r, valor: num(r.valor) }));
  },
});

export const crmReceitasQuery = queryOptions({
  queryKey: ["crm_receitas"],
  queryFn: async (): Promise<CrmReceita[]> => {
    const { data, error } = await supabase
      .from("crm_receitas")
      .select("id, produto, ticket_medio, meta_quantidade, quantidade_realizada, status_campanha")
      .order("id");
    if (error) throw error;
    return (data ?? []).map((r) => ({
      ...r,
      ticket_medio: num(r.ticket_medio),
      meta_quantidade: num(r.meta_quantidade),
      quantidade_realizada: num((r as { quantidade_realizada?: number }).quantidade_realizada),
    }));
  },
});

export const usePassivos = () => useQuery(passivosQuery);
export const useAtivos = () => useQuery(ativosQuery);
export const useCrmReceitas = () => useQuery(crmReceitasQuery);

/** Passivos ainda em aberto somam o total da dívida real. */
export const isPago = (status: string | null) => (status ?? "").toLowerCase().startsWith("pago");

export const sumPassivos = (rows: Passivo[] = []) =>
  rows.filter((r) => !isPago(r.status)).reduce((s, r) => s + r.saldo_devedor, 0);

/** Poder de fogo = Aporte + Conta de Investimento. */
export const isPoderDeFogo = (a: Ativo) => {
  const label = `${a.nome} ${a.tipo ?? ""}`.toLowerCase();
  return label.includes("aporte") || label.includes("investimento");
};

export const sumPoderDeFogo = (rows: Ativo[] = []) =>
  rows.filter(isPoderDeFogo).reduce((s, a) => s + a.valor, 0);

export const potencial = (r: CrmReceita) => r.ticket_medio * r.meta_quantidade;

export function useMarcarPassivoPago() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from("passivos")
        .update({ status: "Pago" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["passivos"] });
    },
  });
}
