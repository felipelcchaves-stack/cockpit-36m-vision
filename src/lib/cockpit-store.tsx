import { createContext, useContext, useMemo, type ReactNode } from "react";

import {
  alvosVivos,
  isPago,
  useAmortizarPassivo,
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

export type EntryType = "Premium 12k" | "Ritual 4.5k" | "Ritual 2.5k" | "Oye 30k" | "Egungun 5k";
export type EntryStatus = "Interessado" | "Confirmado" | "Pago";

export const ENTRY_VALUES: Record<EntryType, number> = {
  "Premium 12k": 12000,
  "Ritual 4.5k": 4500,
  "Ritual 2.5k": 2500,
  "Oye 30k": 30000,
  "Egungun 5k": 5000,
};

export const ENTRY_TYPES = Object.keys(ENTRY_VALUES) as EntryType[];
export const ENTRY_STATUSES: EntryStatus[] = ["Interessado", "Confirmado", "Pago"];

export type Client = {
  id: string;
  name: string;
  type: EntryType;
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
  removeClient: (id: string) => void;
  amortize: (creditorId: string, amount: number) => void;
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

  const clients = useMemo<Client[]>(
    () =>
      (clienteRows ?? []).map((r) => ({
        id: r.id,
        name: r.nome,
        type: (ENTRY_TYPES.includes(r.tipo as EntryType) ? r.tipo : "Ritual 4.5k") as EntryType,
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
      .reduce((s, c) => s + ENTRY_VALUES[c.type], 0);
    const pipeline = clients
      .filter((c) => c.status !== "Pago")
      .reduce((s, c) => s + ENTRY_VALUES[c.type], 0);

    const manual = transactions.reduce(
      (s, t) => (t.kind === "Receita" ? s + t.amount : s - t.amount),
      0,
    );

    const liquidity = poderDeFogoLiquido(ativoRows ?? []) + manual;
    const reserva = cofreBlindado(ativoRows ?? []);
    const totalDebt = creditors.reduce((s, c) => s + c.balance, 0);
    const freeSurplus = liquidity - totalDebt;
    const progress = Math.max(0, freeSurplus / META_PATRIMONIO) * 100;

    /** Direciona uma receita para o Kill List pré-Dia D (Agiota → Oluwo). */
    const destinarReceita = async (valor: number, origem: string) => {
      const alvos = alvosVivos(passivoRows ?? []).filter((p: Passivo) =>
        ALVOS_PRE_DIA_D.some((t) => p.credor.toLowerCase().includes(t)),
      );
      let restante = valor;
      for (const alvo of alvos) {
        if (restante <= 0) break;
        const abate = Math.min(restante, alvo.saldo_devedor);
        restante -= abate;
        await amortizarPassivo.mutateAsync({ id: alvo.id, valor: abate });
        await criarTransacao.mutateAsync({
          data: today(),
          descricao: `Extermínio ${alvo.credor} — ${origem}`,
          tipo: "Amortização",
          valor: abate,
          passivo_id: alvo.id,
        });
      }
      if (restante > 0) {
        await criarTransacao.mutateAsync({
          data: today(),
          descricao: `${origem} — troco para Poder de Fogo`,
          tipo: "Receita",
          valor: restante,
        });
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
          valor: ENTRY_VALUES[c.type],
          nota: c.note ?? null,
          data_ritual: c.ritualDate ?? null,
        }),
      setClientStatus: (id, status) => {
        void (async () => {
          await atualizarStatusCliente.mutateAsync({ id, status });
          if (status !== "Pago") return;
          const cliente = clients.find((c) => c.id === id);
          if (!cliente) return;
          await destinarReceita(ENTRY_VALUES[cliente.type], `${cliente.type} — ${cliente.name}`);
        })();
      },
      removeClient: (id) => void removerCliente.mutateAsync(id),

      amortize: (creditorId, amount) => {
        const id = Number(creditorId);
        const target = creditors.find((c) => c.id === creditorId);
        void (async () => {
          await amortizarPassivo.mutateAsync({ id, valor: amount });
          await criarTransacao.mutateAsync({
            data: today(),
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
