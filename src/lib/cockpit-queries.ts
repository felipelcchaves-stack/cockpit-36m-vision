import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

export type Passivo = {
  id: number;
  credor: string;
  saldo_devedor: number;
  fase_quitacao: string | null;
  status: string | null;
  /** Ordem oficial de extermínio do dossiê (Kill List). */
  ordem: number;
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
  custo_operacao: number;
  status_campanha: string | null;
  data_ritual: string | null;
  data_pagamento_prevista: string | null;
};

export type CrmReceitaInput = {
  produto: string;
  ticket_medio: number;
  meta_quantidade: number;
  quantidade_realizada: number;
  custo_operacao: number;
  status_campanha: string | null;
  data_ritual: string | null;
  data_pagamento_prevista: string | null;
};



const num = (v: unknown) => Number(v ?? 0);

export const passivosQuery = queryOptions({
  queryKey: ["passivos"],
  queryFn: async (): Promise<Passivo[]> => {
    const { data, error } = await supabase
      .from("passivos")
      .select("id, credor, saldo_devedor, fase_quitacao, status, ordem_exterminio")
      .order("ordem_exterminio", { ascending: true });
    if (error) throw error;
    return (data ?? []).map((r) => ({
      id: r.id,
      credor: r.credor,
      saldo_devedor: num(r.saldo_devedor),
      fase_quitacao: r.fase_quitacao,
      status: r.status,
      ordem: num(r.ordem_exterminio) || 99,
    }));
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
      .select(
        "id, produto, ticket_medio, meta_quantidade, quantidade_realizada, custo_operacao, status_campanha, data_ritual, data_pagamento_prevista",
      )
      .order("id");
    if (error) throw error;
    return (data ?? []).map((r) => ({
      ...r,
      ticket_medio: num(r.ticket_medio),
      meta_quantidade: num(r.meta_quantidade),
      quantidade_realizada: num((r as { quantidade_realizada?: number }).quantidade_realizada),
      custo_operacao: num((r as { custo_operacao?: number }).custo_operacao),
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

/** Lei do Fundo de Reserva: caixa blindado, fora de qualquer cálculo de quitação. */
export const isReservaBlindada = (a: Ativo) =>
  `${a.nome} ${a.tipo ?? ""}`.toLowerCase().includes("reserva");

export const sumReservaBlindada = (rows: Ativo[] = []) =>
  rows.filter(isReservaBlindada).reduce((s, a) => s + a.valor, 0);

/** Alvos ainda vivos, na ordem oficial de extermínio. */
export const killList = (rows: Passivo[] = []) =>
  [...rows].sort((a, b) => a.ordem - b.ordem || b.saldo_devedor - a.saldo_devedor);

export const alvosVivos = (rows: Passivo[] = []) =>
  killList(rows).filter((r) => !isPago(r.status) && r.saldo_devedor > 0);

export const isCartao = (p: Passivo) => p.credor.toLowerCase().includes("cart");

export const potencial = (r: CrmReceita) => r.ticket_medio * r.meta_quantidade;

/** Valor já realizado do produto (vendas registradas x ticket). */
export const realizado = (r: CrmReceita) => r.ticket_medio * r.quantidade_realizada;

/** Percentual de avanço da meta (0-100). */
export const progresso = (r: CrmReceita) =>
  r.meta_quantidade > 0
    ? Math.min(100, Math.round((r.quantidade_realizada / r.meta_quantidade) * 100))
    : 0;

const invalidateReceitas = (qc: ReturnType<typeof useQueryClient>) =>
  void qc.invalidateQueries({ queryKey: ["crm_receitas"] });

export function useCriarReceita() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CrmReceitaInput) => {
      const { error } = await supabase.from("crm_receitas").insert(input);
      if (error) throw error;
    },
    onSuccess: () => invalidateReceitas(qc),
  });
}

export function useAtualizarReceita() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<CrmReceitaInput> & { id: number }) => {
      const { error } = await supabase.from("crm_receitas").update(input).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidateReceitas(qc),
  });
}

export function useRemoverReceita() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from("crm_receitas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidateReceitas(qc),
  });
}

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

/** Amortização real: abate valor do saldo devedor e quita quando zera. */
export function useAmortizarPassivo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, valor }: { id: number; valor: number }) => {
      const { data, error: readErr } = await supabase
        .from("passivos")
        .select("saldo_devedor, status")
        .eq("id", id)
        .single();
      if (readErr) throw readErr;
      const novo = Math.max(0, num(data?.saldo_devedor) - valor);
      const { error } = await supabase
        .from("passivos")
        .update({ saldo_devedor: novo, status: novo === 0 ? "Pago" : (data?.status ?? "Pendente") })
        .eq("id", id);
      if (error) throw error;
      return { novo };
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["passivos"] });
    },
  });
}

/* ---------------- Transações (transacoes) ---------------- */

export type TipoTransacao = "Receita" | "Despesa" | "Amortização";

export type Transacao = {
  id: string;
  data: string;
  descricao: string;
  tipo: TipoTransacao;
  valor: number;
  passivo_id: number | null;
};

export const transacoesQuery = queryOptions({
  queryKey: ["transacoes"],
  queryFn: async (): Promise<Transacao[]> => {
    const { data, error } = await supabase
      .from("transacoes")
      .select("id, data, descricao, tipo, valor, passivo_id")
      .order("data", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((r) => ({
      ...r,
      valor: num(r.valor),
      tipo: (r.tipo ?? "Receita") as TipoTransacao,
    }));
  },
});

export const useTransacoes = () => useQuery(transacoesQuery);

export function useCriarTransacao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      data?: string;
      descricao: string;
      tipo: TipoTransacao;
      valor: number;
      passivo_id?: number | null;
    }) => {
      const { error } = await supabase.from("transacoes").insert(input);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["transacoes"] });
    },
  });
}

export function useRemoverTransacao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("transacoes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["transacoes"] });
    },
  });
}

/* ---------------- Clientes do Kanban (crm_clientes) ---------------- */

export type ClienteRow = {
  id: string;
  nome: string;
  tipo: string;
  status: string;
  valor: number;
  nota: string | null;
  data_ritual: string | null;
  data_pagamento: string | null;
};

export const clientesQuery = queryOptions({
  queryKey: ["crm_clientes"],
  queryFn: async (): Promise<ClienteRow[]> => {
    const { data, error } = await supabase
      .from("crm_clientes")
      .select("id, nome, tipo, status, valor, nota, data_ritual, data_pagamento")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((r) => ({ ...r, valor: num(r.valor) }));
  },
});

export const useClientes = () => useQuery(clientesQuery);

const invalidateClientes = (qc: ReturnType<typeof useQueryClient>) =>
  void qc.invalidateQueries({ queryKey: ["crm_clientes"] });

export function useCriarCliente() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      nome: string;
      tipo: string;
      status: string;
      valor: number;
      nota?: string | null;
      data_ritual?: string | null;
      data_pagamento?: string | null;
    }) => {
      const { error } = await supabase.from("crm_clientes").insert(input);
      if (error) throw error;
    },
    onSuccess: () => invalidateClientes(qc),
  });
}

export function useAtualizarCliente() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...input
    }: {
      id: string;
      status?: string;
      data_ritual?: string | null;
      data_pagamento?: string | null;
    }) => {
      const { error } = await supabase.from("crm_clientes").update(input).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidateClientes(qc),
  });
}

export function useAtualizarStatusCliente() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const patch: { status: string; data_pagamento?: string } = { status };
      if (status === "Pago") patch.data_pagamento = new Date().toISOString().slice(0, 10);
      const { error } = await supabase.from("crm_clientes").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidateClientes(qc),
  });
}

export function useRemoverCliente() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("crm_clientes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidateClientes(qc),
  });
}

/* ---------------- Roadmap Dia D (roadmap_fases / roadmap_tarefas) ---------------- */

export type RoadmapTarefa = {
  id: string;
  fase_id: string;
  descricao: string;
  ordem: number;
  concluida: boolean;
  concluida_em: string | null;
  valor_previsto: number;
  valor_realizado: number;
};

export type RoadmapFase = {
  id: string;
  titulo: string;
  subtitulo: string | null;
  ordem: number;
  tarefas: RoadmapTarefa[];
};

export const roadmapQuery = queryOptions({
  queryKey: ["roadmap"],
  queryFn: async (): Promise<RoadmapFase[]> => {
    const [fases, tarefas] = await Promise.all([
      supabase.from("roadmap_fases").select("id, titulo, subtitulo, ordem").order("ordem"),
      supabase
        .from("roadmap_tarefas")
        .select("id, fase_id, descricao, ordem, concluida, concluida_em, valor_previsto, valor_realizado")
        .order("ordem"),
    ]);
    if (fases.error) throw fases.error;
    if (tarefas.error) throw tarefas.error;
    const rows = (tarefas.data ?? []).map((t) => ({
      ...t,
      valor_previsto: num(t.valor_previsto),
      valor_realizado: num(t.valor_realizado),
    }));
    return (fases.data ?? []).map((f) => ({
      ...f,
      tarefas: rows.filter((t) => t.fase_id === f.id),
    }));
  },
});

export const useRoadmap = () => useQuery(roadmapQuery);

const invalidateRoadmap = (qc: ReturnType<typeof useQueryClient>) =>
  void qc.invalidateQueries({ queryKey: ["roadmap"] });

export type TarefaInput = {
  descricao: string;
  valor_previsto: number;
  valor_realizado: number;
};

export function useCriarTarefa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: TarefaInput & { fase_id: string; ordem: number }) => {
      const { error } = await supabase.from("roadmap_tarefas").insert(input);
      if (error) throw error;
    },
    onSuccess: () => invalidateRoadmap(qc),
  });
}

export function useAtualizarTarefa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...input
    }: Partial<TarefaInput> & { id: string; concluida?: boolean; concluida_em?: string | null }) => {
      const { error } = await supabase.from("roadmap_tarefas").update(input).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidateRoadmap(qc),
  });
}

export function useRemoverTarefa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("roadmap_tarefas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidateRoadmap(qc),
  });
}

export const previstoFase = (f: RoadmapFase) =>
  f.tarefas.reduce((s, t) => s + t.valor_previsto, 0);
export const realizadoFase = (f: RoadmapFase) =>
  f.tarefas.reduce((s, t) => s + t.valor_realizado, 0);

/* ---------------- Helpers de datas ---------------- */

export const diasAte = (iso: string | null) => {
  if (!iso) return null;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const alvo = new Date(`${iso}T00:00:00`);
  return Math.round((alvo.getTime() - hoje.getTime()) / 86400000);
};

export const prazoLabel = (iso: string | null) => {
  const d = diasAte(iso);
  if (d === null) return null;
  if (d === 0) return "hoje";
  if (d > 0) return `faltam ${d} ${d === 1 ? "dia" : "dias"}`;
  return `atrasado há ${-d} ${-d === 1 ? "dia" : "dias"}`;
};

export const dataBR = (iso: string | null) =>
  iso ? new Date(`${iso}T00:00:00`).toLocaleDateString("pt-BR") : "—";

