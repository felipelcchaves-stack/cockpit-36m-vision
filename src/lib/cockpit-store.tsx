import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

import {
  useAtualizarStatusCliente,
  useClientes,
  useCriarCliente,
  useRemoverCliente,
} from "@/lib/cockpit-queries";


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
  note?: string;
};

export type Creditor = {
  id: string;
  name: string;
  original: number;
  balance: number;
  tag: string;
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

const uid = () => Math.random().toString(36).slice(2, 10);
const today = () => new Date().toISOString().slice(0, 10);

const initialClients: Client[] = [
  { id: "seed-1", name: "Marcos Vinícius", type: "Oye 30k", status: "Pago" },
  { id: "seed-2", name: "Dona Iracema", type: "Premium 12k", status: "Pago" },
  { id: "seed-3", name: "Rafael Antunes", type: "Ritual 4.5k", status: "Confirmado" },
  { id: "seed-4", name: "Juliana Prado", type: "Egungun 5k", status: "Confirmado" },
  { id: "seed-5", name: "Beatriz Lima", type: "Ritual 2.5k", status: "Interessado" },
  { id: "seed-6", name: "Sr. Alvarenga", type: "Premium 12k", status: "Interessado" },
  { id: "seed-7", name: "Cláudia Rocha", type: "Ritual 4.5k", status: "Interessado" },
];

const initialCreditors: Creditor[] = [
  { id: "seed-8", name: "Agiota", original: 95000, balance: 0, tag: "Extinto" },
  { id: "seed-9", name: "Oluwo", original: 220000, balance: 180000, tag: "Crítico" },
  { id: "seed-10", name: "Leka (Antigo)", original: 180000, balance: 151629, tag: "Alto" },
  { id: "seed-11", name: "Leka (Novo)", original: 165000, balance: 150000, tag: "Alto" },
  { id: "seed-12", name: "Banco Consignado", original: 120000, balance: 78400, tag: "Estável" },
  { id: "seed-13", name: "Caio", original: 60000, balance: 34500, tag: "Médio" },
  { id: "seed-14", name: "Cartões", original: 90000, balance: 52300, tag: "Rotativo" },
  { id: "seed-15", name: "Nubank", original: 40000, balance: 18700, tag: "Baixo" },
];

const initialTx: Tx[] = [
  { id: "seed-16", date: today(), description: "Oye 30k — Marcos Vinícius", kind: "Receita", amount: 30000 },
  { id: "seed-17", date: today(), description: "Amortização Agiota (quitação)", kind: "Amortização", amount: 25000 },
  { id: "seed-18", date: today(), description: "Premium 12k — Dona Iracema", kind: "Receita", amount: 12000 },
  { id: "seed-19", date: today(), description: "Insumos e logística do ritual", kind: "Despesa", amount: 4300 },
  { id: "seed-20", date: today(), description: "Amortização Nubank", kind: "Amortização", amount: 6200 },
];

const initialPhases: Phase[] = [
  {
    id: "f1",
    title: "Ofensiva Sazonal",
    subtitle: "Pré-Dia D — captação máxima",
    tasks: [
      { id: "seed-21", label: "Mapear 20 leads Premium", done: true },
      { id: "seed-22", label: "Fechar 3 Oye 30k", done: true },
      { id: "seed-23", label: "Agenda de rituais lotada", done: false },
    ],
  },
  {
    id: "f2",
    title: "Operação Dia D",
    subtitle: "Liberação da liquidez travada",
    tasks: [
      { id: "seed-24", label: "Documentação do aporte", done: true },
      { id: "seed-25", label: "Confirmar R$ 700.000 de aporte", done: false },
      { id: "seed-26", label: "Plano de alocação assinado", done: false },
    ],
  },
  {
    id: "f3",
    title: "Ponte de 90 Dias",
    subtitle: "Queima acelerada de passivos",
    tasks: [
      { id: "seed-27", label: "Quitar Oluwo", done: false },
      { id: "seed-28", label: "Renegociar Leka Novo", done: false },
      { id: "seed-29", label: "Zerar cartões rotativos", done: false },
    ],
  },
  {
    id: "f4",
    title: "A Virada de Chave",
    subtitle: "De sobrevivência a acumulação",
    tasks: [
      { id: "seed-30", label: "Reserva de 6 meses", done: false },
      { id: "seed-31", label: "Primeiro aporte em renda fixa", done: false },
    ],
  },
  {
    id: "f5",
    title: "O Império dos 36M",
    subtitle: "Patrimônio consolidado",
    tasks: [
      { id: "seed-32", label: "Estrutura societária", done: false },
      { id: "seed-33", label: "Carteira diversificada 36M", done: false },
    ],
  },
];

const BASE_LIQUIDITY = 432935;
export const APORTE_PREVISTO = 700000;
export const META_PATRIMONIO = 36000000;

type Ctx = {
  clients: Client[];
  creditors: Creditor[];
  transactions: Tx[];
  phases: Phase[];
  liquidity: number;
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
  toggleTask: (phaseId: string, taskId: string) => void;
};

const CockpitContext = createContext<Ctx | null>(null);

export function CockpitProvider({ children }: { children: ReactNode }) {
  const { data: clienteRows } = useClientes();
  const criarCliente = useCriarCliente();
  const atualizarStatusCliente = useAtualizarStatusCliente();
  const removerCliente = useRemoverCliente();
  const [creditors, setCreditors] = useState(initialCreditors);
  const [transactions, setTransactions] = useState(initialTx);
  const [phases, setPhases] = useState(initialPhases);

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
      })),
    [clienteRows],
  );

  const value = useMemo<Ctx>(() => {
    const paidRevenue = clients
      .filter((c) => c.status === "Pago")
      .reduce((s, c) => s + ENTRY_VALUES[c.type], 0);
    const pipeline = clients
      .filter((c) => c.status !== "Pago")
      .reduce((s, c) => s + ENTRY_VALUES[c.type], 0);
    const manual = transactions.reduce((s, t) => {
      if (t.kind === "Receita") return s + t.amount;
      return s - t.amount;
    }, 0);
    const liquidity = BASE_LIQUIDITY + paidRevenue + manual;
    const totalDebt = creditors.reduce((s, c) => s + c.balance, 0);
    const freeSurplus = liquidity + APORTE_PREVISTO - totalDebt;
    const progress = Math.max(0, (liquidity + APORTE_PREVISTO - totalDebt) / META_PATRIMONIO) * 100;

    return {
      clients,
      creditors,
      transactions,
      phases,
      liquidity,
      totalDebt,
      paidRevenue,
      pipeline,
      freeSurplus,
      progress,
      addClient: (c) =>
        criarCliente.mutateAsync({
          nome: c.name,
          tipo: c.type,
          status: c.status,
          valor: ENTRY_VALUES[c.type],
          nota: c.note ?? null,
        }),
      setClientStatus: (id, status) => atualizarStatusCliente.mutateAsync({ id, status }),
      removeClient: (id) => removerCliente.mutateAsync(id),

      amortize: (creditorId, amount) => {
        setCreditors((prev) =>
          prev.map((c) =>
            c.id === creditorId ? { ...c, balance: Math.max(0, c.balance - amount) } : c,
          ),
        );
        const target = creditors.find((c) => c.id === creditorId);
        setTransactions((prev) => [
          {
            id: uid(),
            date: today(),
            description: `Amortização ${target?.name ?? ""}`.trim(),
            kind: "Amortização",
            amount,
          },
          ...prev,
        ]);
      },
      addTx: (t) => setTransactions((prev) => [{ ...t, id: uid() }, ...prev]),
      toggleTask: (phaseId, taskId) =>
        setPhases((prev) =>
          prev.map((p) =>
            p.id === phaseId
              ? {
                  ...p,
                  tasks: p.tasks.map((t) => (t.id === taskId ? { ...t, done: !t.done } : t)),
                }
              : p,
          ),
        ),
    };
  }, [clients, creditors, transactions, phases]);

  return <CockpitContext.Provider value={value}>{children}</CockpitContext.Provider>;
}

export function useCockpit() {
  const ctx = useContext(CockpitContext);
  if (!ctx) throw new Error("useCockpit must be used within CockpitProvider");
  return ctx;
}

export const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
