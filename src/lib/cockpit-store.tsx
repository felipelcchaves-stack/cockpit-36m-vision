import { createContext, useContext, useMemo, type ReactNode } from "react";

import {
  alvosVivos,
  isPago,
  useAmortizarPassivo,
  useCreditarAtivo,
  useAtivos,
  useAtualizarStatusCliente,
  useClientes,
  useCriarCliente,
  useCriarTransacao,
  usePassivos,
  useRemoverCliente,
  useTransacoes,
  type Passivo,
} from "@/lib/cockpit-queries";
import {
  APORTE_DIA_D,
  META_PATRIMONIO as META,
  cofreBlindado,
  poderDeFogoLiquido,
} from "@/lib/financeiro";

/** O tipo é o nome do produto do Catálogo de Receitas (texto livre vindo do banco). */
export type EntryType = string;
export type EntryStatus = "Interessado" | "Confirmado" | "Pago";

/** Compatibilidade: rótulos fixos antigos, usados só quando a linha não tem valor salvo. */
export const ENTRY_VALUES: Record<string, number> = {
  "Premium 12k": 12000,
  "Ritual 4.5k": 4500,
  "Ritual 2.5k": 2500,
  "Oye 30k": 30000,
  "Egungun 5k": 5000,
};

export const ENTRY_TYPES = Object.keys(ENTRY_VALUES);
export const ENTRY_STATUSES: EntryStatus[] = ["Interessado", "Confirmado", "Pago"];

export type Client = {
  id: string;
  name: string;
  type: EntryType;
  valor: number;
  status: EntryStatus;
  note?: string | undefined;
  ritualDate?: string | null;
  paymentDate?: string | null;
};

export type Creditor = {
  id: string;
  name: string;
  original: number;
  balance: number;
  tag: string;
  ordem: number;
};

export type Tx = {
  id: string;
  date: string;
  description: string;
  kind: "Receita" | "Despesa" | "Amortização";
  amount: number;
};

export type Phase = {
  id: string;
  title: string;
  subtitle: string;
  tasks: { id: string; label: string; done: boolean }[];
};

const today = () => new Date().toISOString().slice(0, 10);

export const APORTE_PREVISTO = APORTE_DIA_D;
export const META_PATRIMONIO = META;

/** Lei da destinação: receita religiosa mata Agiota e Oluwo antes do Dia D. */
const ALVOS_PRE_DIA_D = ["agiota", "oluwo"];

export type FatiaDestinacao = { id: number; credor: string; valor: number };

/** Prévia de como um valor líquido será distribuído: Kill List primeiro, sobra no CDB. */
export function planoDestinacao(passivos: Passivo[], liquido: number) {
  const alvos = alvosVivos(passivos).filter((p) =>
    ALVOS_PRE_DIA_D.some((t) => p.credor.toLowerCase().includes(t)),
  );
  const fatias: FatiaDestinacao[] = [];
  let restante = Math.max(0, liquido);
  for (const alvo of alvos) {
    if (restante <= 0) break;
    const abate = Math.min(restante, alvo.saldo_devedor);
    if (abate <= 0) continue;
    fatias.push({ id: alvo.id, credor: alvo.credor, valor: abate });
    restante -= abate;
  }
  return { fatias, sobra: restante };
}

type Ctx = {
  clients: Client[];
  creditors: Creditor[];
  transactions: Tx[];
  liquidity: number;
  reserva: number;
  totalDebt: number;
  paidRevenue: number;
  pipeline: number;
  freeSurplus: number;
  progress: number;
  addClient: (c: Omit<Client, "id">) => void;
  setClientStatus: (id: string, status: EntryStatus) => void;
  receberRitual: (args: {
    id: string;
    recebido: number;
    custo: number;
    ativoId: number | null;
  }) => Promise<void>;
  removeClient: (id: string) => void;
  amortize: (creditorId: string, amount: number, date?: string) => void;
  addTx: (t: Omit<Tx, "id">) => void;
};

const CockpitContext = createContext<Ctx | null>(null);

export function CockpitProvider({ children }: { children: ReactNode }) {
  const { data: clienteRows } = useClientes();
  const { data: passivoRows } = usePassivos();
  const { data: ativoRows } = useAtivos();
  const { data: txRows } = useTransacoes();

  const criarCliente = useCriarCliente();
  const atualizarStatusCliente = useAtualizarStatusCliente();
  const removerCliente = useRemoverCliente();
  const amortizarPassivo = useAmortizarPassivo();
  const criarTransacao = useCriarTransacao();
  const creditarAtivo = useCreditarAtivo();

  const clients = useMemo<Client[]>(
    () =>
      (clienteRows ?? []).map((r) => ({
        id: r.id,
        name: r.nome,
        type: r.tipo,
        valor: r.valor > 0 ? r.valor : (ENTRY_VALUES[r.tipo] ?? 0),
        status: (ENTRY_STATUSES.includes(r.status as EntryStatus)
          ? r.status
          : "Interessado") as EntryStatus,
        note: r.nota ?? undefined,
        ritualDate: r.data_ritual,
        paymentDate: r.data_pagamento,
      })),
    [clienteRows],
  );

  const transactions = useMemo<Tx[]>(
    () =>
      (txRows ?? []).map((t) => ({
        id: t.id,
        date: t.data,
        description: t.descricao,
        kind: t.tipo,
        amount: t.valor,
      })),
    [txRows],
  );

  const creditors = useMemo<Creditor[]>(() => {
    const amortizado = (id: number) =>
      (txRows ?? [])
        .filter((t) => t.passivo_id === id && t.tipo === "Amortização")
        .reduce((s, t) => s + t.valor, 0);
    return (passivoRows ?? []).map((p) => ({
      id: String(p.id),
      name: p.credor,
      original: p.saldo_devedor + amortizado(p.id),
      balance: isPago(p.status) ? 0 : p.saldo_devedor,
      tag: p.fase_quitacao ?? "Sem fase",
      ordem: p.ordem,
    }));
  }, [passivoRows, txRows]);

  const value = useMemo<Ctx>(() => {
    const paidRevenue = clients
      .filter((c) => c.status === "Pago")
      .reduce((s, c) => s + c.valor, 0);
    const pipeline = clients
      .filter((c) => c.status !== "Pago")
      .reduce((s, c) => s + c.valor, 0);

    const manual = transactions.reduce(
      (s, t) => (t.kind === "Receita" ? s + t.amount : s - t.amount),
      0,
    );

    const liquidity = poderDeFogoLiquido(ativoRows ?? []) + manual;
    const reserva = cofreBlindado(ativoRows ?? []);
    const totalDebt = creditors.reduce((s, c) => s + c.balance, 0);
    const freeSurplus = liquidity - totalDebt;
    const progress = Math.max(0, freeSurplus / META_PATRIMONIO) * 100;

    /** Direciona uma receita líquida: Kill List pré-Dia D primeiro, sobra no CDB. */
    const destinarReceita = async (liquido: number, origem: string, ativoId: number | null) => {
      const { fatias, sobra } = planoDestinacao(passivoRows ?? [], liquido);
      for (const fatia of fatias) {
        await amortizarPassivo.mutateAsync({ id: fatia.id, valor: fatia.valor });
        await criarTransacao.mutateAsync({
          data: today(),
          descricao: `Extermínio ${fatia.credor} — ${origem}`,
          tipo: "Amortização",
          valor: fatia.valor,
          passivo_id: fatia.id,
        });
      }
      if (sobra > 0) {
        const destino = (ativoRows ?? []).find((a) => a.id === ativoId);
        if (destino) {
          await creditarAtivo.mutateAsync({ ativo: destino, valor: sobra, motivo: origem });
          // Contrapartida: o caixa livre vira saldo aplicado, sem contar duas vezes.
          await criarTransacao.mutateAsync({
            data: today(),
            descricao: `Aplicação em ${destino.nome} — ${origem}`,
            tipo: "Despesa",
            valor: sobra,
          });
        } else {
          await criarTransacao.mutateAsync({
            data: today(),
            descricao: `${origem} — troco para Poder de Fogo`,
            tipo: "Receita",
            valor: sobra,
          });
        }
      }
    };

    return {
      clients,
      creditors,
      transactions,
      liquidity,
      reserva,
      totalDebt,
      paidRevenue,
      pipeline,
      freeSurplus,
      progress,
      addClient: (c) =>
        void criarCliente.mutateAsync({
          nome: c.name,
          tipo: c.type,
          status: c.status,
          valor: c.valor,
          nota: c.note ?? null,
          data_ritual: c.ritualDate ?? null,
        }),
      setClientStatus: (id, status) => {
        void atualizarStatusCliente.mutateAsync({ id, status });
      },
      receberRitual: async ({ id, recebido, custo, ativoId }) => {
        const cliente = clients.find((c) => c.id === id);
        if (!cliente) return;
        const origem = `${cliente.type} — ${cliente.name}`;
        await atualizarStatusCliente.mutateAsync({ id, status: "Pago" });
        await criarTransacao.mutateAsync({
          data: today(),
          descricao: `Recebimento ${origem}`,
          tipo: "Receita",
          valor: recebido,
        });
        if (custo > 0) {
          await criarTransacao.mutateAsync({
            data: today(),
            descricao: `Custo de operação — ${origem}`,
            tipo: "Despesa",
            valor: custo,
          });
        }
        await destinarReceita(Math.max(0, recebido - custo), origem, ativoId);
      },
      removeClient: (id) => void removerCliente.mutateAsync(id),

      amortize: (creditorId, amount, date) => {
        const id = Number(creditorId);
        const target = creditors.find((c) => c.id === creditorId);
        void (async () => {
          await amortizarPassivo.mutateAsync({ id, valor: amount });
          await criarTransacao.mutateAsync({
            data: date ?? today(),
            descricao: `Amortização ${target?.name ?? ""}`.trim(),
            tipo: "Amortização",
            valor: amount,
            passivo_id: id,
          });
        })();
      },
      addTx: (t) =>
        void criarTransacao.mutateAsync({
          data: t.date,
          descricao: t.description,
          tipo: t.kind,
          valor: t.amount,
        }),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clients, creditors, transactions, ativoRows, passivoRows]);

  return <CockpitContext.Provider value={value}>{children}</CockpitContext.Provider>;
}

export function useCockpit() {
  const ctx = useContext(CockpitContext);
  if (!ctx) throw new Error("useCockpit must be used within CockpitProvider");
  return ctx;
}

export const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
