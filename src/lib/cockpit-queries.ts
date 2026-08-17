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
  rende: boolean;
  modo_taxa: string;
  taxa_aa: number;
  pct_cdi: number;
  cdi_aa: number;
  ultimo_fechamento: string;
};

export type Rendimento = {
  id: string;
  ativo_id: number;
  data: string;
  saldo_anterior: number;
  juros: number;
  saldo_final: number;
  origem: string;
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
      .select(
        "id, nome, valor, tipo, rende, modo_taxa, taxa_aa, pct_cdi, cdi_aa, ultimo_fechamento",
      )
      .order("valor", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((r) => ({
      ...r,
      valor: num(r.valor),
      rende: Boolean(r.rende),
      modo_taxa: r.modo_taxa ?? "cdi",
      taxa_aa: num(r.taxa_aa),
      pct_cdi: num(r.pct_cdi),
      cdi_aa: num(r.cdi_aa),
    }));
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


/* ---------------- Líquido de campanha (custo de operação) ---------------- */

/** Potencial líquido: meta x ticket menos o custo de operação da campanha. */
export const potencialLiquido = (r: CrmReceita) =>
  Math.max(0, potencial(r) - (r.custo_operacao ?? 0));

/** Líquido já realizado: proporcional às vendas feitas, descontando o custo. */
export const realizadoLiquido = (r: CrmReceita) => {
  const prop = r.meta_quantidade > 0 ? Math.min(1, r.quantidade_realizada / r.meta_quantidade) : 0;
  return Math.max(0, realizado(r) - (r.custo_operacao ?? 0) * prop);
};

/* ---------------- Aportes mensais (governança dos R$ 70k) ---------------- */

export type AporteMensal = {
  id: string;
  competencia: string;
  previsto: number;
  realizado: number;
  nota: string | null;
};

export const aportesQuery = queryOptions({
  queryKey: ["aportes_mensais"],
  queryFn: async (): Promise<AporteMensal[]> => {
    const { data, error } = await supabase
      .from("aportes_mensais")
      .select("id, competencia, previsto, realizado, nota")
      .order("competencia", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((r) => ({
      ...r,
      previsto: num(r.previsto),
      realizado: num(r.realizado),
    }));
  },
});

export const useAportes = () => useQuery(aportesQuery);

const invalidateAportes = (qc: ReturnType<typeof useQueryClient>) =>
  void qc.invalidateQueries({ queryKey: ["aportes_mensais"] });

export function useSalvarAporte() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      competencia: string;
      previsto: number;
      realizado: number;
      nota?: string | null;
    }) => {
      const { error } = await supabase
        .from("aportes_mensais")
        .upsert(input, { onConflict: "competencia" });
      if (error) throw error;
    },
    onSuccess: () => invalidateAportes(qc),
  });
}

export function useRemoverAporte() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("aportes_mensais").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidateAportes(qc),
  });
}

/** Meses seguidos (do mais recente para trás) em que o aporte foi cumprido. */
export const sequenciaDisciplina = (rows: AporteMensal[] = []) => {
  const ordenado = [...rows].sort((a, b) => b.competencia.localeCompare(a.competencia));
  let n = 0;
  for (const r of ordenado) {
    if (r.realizado >= r.previsto && r.previsto > 0) n++;
    else break;
  }
  return n;
};

/* ---------------- Parâmetros mensais (obra, Potiguara, cartão) ---------------- */

export type ParametrosMensais = {
  id: string;
  obra_mensal: number;
  aluguel_potiguara: number;
  faturamento_base: number;
  fatura_cartao: number;
  receita_livre_mes: number;
  obra_meses_restantes: number;
  potiguara_meses_restantes: number;
};

export const parametrosQuery = queryOptions({
  queryKey: ["parametros_mensais"],
  queryFn: async (): Promise<ParametrosMensais | null> => {
    const { data, error } = await supabase
      .from("parametros_mensais")
      .select(
        "id, obra_mensal, aluguel_potiguara, faturamento_base, fatura_cartao, receita_livre_mes, obra_meses_restantes, potiguara_meses_restantes",
      )
      .order("created_at")
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return {
      id: data.id,
      obra_mensal: num(data.obra_mensal),
      aluguel_potiguara: num(data.aluguel_potiguara),
      faturamento_base: num(data.faturamento_base),
      fatura_cartao: num(data.fatura_cartao),
      receita_livre_mes: num(data.receita_livre_mes),
      obra_meses_restantes: num(data.obra_meses_restantes),
      potiguara_meses_restantes: num(data.potiguara_meses_restantes),
    };
  },
});

export const useParametros = () => useQuery(parametrosQuery);

export function useSalvarParametros() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<ParametrosMensais> & { id: string }) => {
      const { error } = await supabase.from("parametros_mensais").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["parametros_mensais"] });
    },
  });
}

/* ---------------- Rendimento diário do lastro (CDB) ---------------- */

export const rendimentosQuery = queryOptions({
  queryKey: ["rendimentos"],
  queryFn: async (): Promise<Rendimento[]> => {
    const { data, error } = await supabase
      .from("rendimentos")
      .select("id, ativo_id, data, saldo_anterior, juros, saldo_final, origem")
      .order("data", { ascending: false })
      .limit(400);
    if (error) throw error;
    return (data ?? []).map((r) => ({
      ...r,
      saldo_anterior: num(r.saldo_anterior),
      juros: num(r.juros),
      saldo_final: num(r.saldo_final),
    }));
  },
});

export const useRendimentos = () => useQuery(rendimentosQuery);

const invalidateLastro = (qc: ReturnType<typeof useQueryClient>) => {
  void qc.invalidateQueries({ queryKey: ["rendimentos"] });
  void qc.invalidateQueries({ queryKey: ["ativos"] });
};

/** Roda a capitalização pendente (dias úteis desde o último fechamento). */
export function useRenderAgora() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("render_ativos");
      if (error) throw error;
      return num(data);
    },
    onSuccess: () => invalidateLastro(qc),
  });
}

/** Fecha o saldo real do extrato do banco e registra o ajuste. */
export function useAjustarSaldoAtivo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      ativo,
      saldoReal,
    }: {
      ativo: Ativo;
      saldoReal: number;
    }) => {
      const hoje = new Date().toISOString().slice(0, 10);
      const { error: errIns } = await supabase.from("rendimentos").upsert(
        {
          ativo_id: ativo.id,
          data: hoje,
          saldo_anterior: ativo.valor,
          juros: saldoReal - ativo.valor,
          saldo_final: saldoReal,
          origem: "ajuste",
        },
        { onConflict: "ativo_id,data,origem" },
      );
      if (errIns) throw errIns;
      const { error } = await supabase
        .from("ativos")
        .update({ valor: saldoReal, ultimo_fechamento: hoje })
        .eq("id", ativo.id);
      if (error) throw error;
    },
    onSuccess: () => invalidateLastro(qc),
  });
}

/** Atualiza a taxa contratada do ativo (CDI % ou taxa fixa a.a.). */
export function useSalvarTaxaAtivo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...patch
    }: {
      id: number;
      rende: boolean;
      modo_taxa: string;
      taxa_aa: number;
      pct_cdi: number;
      cdi_aa: number;
    }) => {
      const { error } = await supabase.from("ativos").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidateLastro(qc),
  });
}
