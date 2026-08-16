import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

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
  { id: uid(), name: "Marcos Vinícius", type: "Oye 30k", status: "Pago" },
  { id: uid(), name: "Dona Iracema", type: "Premium 12k", status: "Pago" },
  { id: uid(), name: "Rafael Antunes", type: "Ritual 4.5k", status: "Confirmado" },
  { id: uid(), name: "Juliana Prado", type: "Egungun 5k", status: "Confirmado" },
  { id: uid(), name: "Beatriz Lima", type: "Ritual 2.5k", status: "Interessado" },
  { id: uid(), name: "Sr. Alvarenga", type: "Premium 12k", status: "Interessado" },
  { id: uid(), name: "Cláudia Rocha", type: "Ritual 4.5k", status: "Interessado" },
];

const initialCreditors: Creditor[] = [
  { id: uid(), name: "Agiota", original: 95000, balance: 0, tag: "Extinto" },
  { id: uid(), name: "Oluwo", original: 220000, balance: 180000, tag: "Crítico" },
  { id: uid(), name: "Leka (Antigo)", original: 180000, balance: 151629, tag: "Alto" },
  { id: uid(), name: "Leka (Novo)", original: 165000, balance: 150000, tag: "Alto" },
  { id: uid(), name: "Banco Consignado", original: 120000, balance: 78400, tag: "Estável" },
  { id: uid(), name: "Caio", original: 60000, balance: 34500, tag: "Médio" },
  { id: uid(), name: "Cartões", original: 90000, balance: 52300, tag: "Rotativo" },
  { id: uid(), name: "Nubank", original: 40000, balance: 18700, tag: "Baixo" },
];

const initialTx: Tx[] = [
  { id: uid(), date: today(), description: "Oye 30k — Marcos Vinícius", kind: "Receita", amount: 30000 },
  { id: uid(), date: today(), description: "Amortização Agiota (quitação)", kind: "Amortização", amount: 25000 },
  { id: uid(), date: today(), description: "Premium 12k — Dona Iracema", kind: "Receita", amount: 12000 },
  { id: uid(), date: today(), description: "Insumos e logística do ritual", kind: "Despesa", amount: 4300 },
  { id: uid(), date: today(), description: "Amortização Nubank", kind: "Amortização", amount: 6200 },
];

const initialPhases: Phase[] = [
  {
    id: "f1",
    title: "Ofensiva Sazonal",
    subtitle: "Pré-Dia D — captação máxima",
    tasks: [
      { id: uid(), label: "Mapear 20 leads Premium", done: true },
      { id: uid(), label: "Fechar 3 Oye 30k", done: true },
      { id: uid(), label: "Agenda de rituais lotada", done: false },
    ],
  },
  {
    id: "f2",
    title: "Operação Dia D",
    subtitle: "Liberação da liquidez travada",
    tasks: [
      { id: uid(), label: "Documentação do aporte", done: true },
      { id: uid(), label: "Confirmar R$ 700.000 de aporte", done: false },
      { id: uid(), label: "Plano de alocação assinado", done: false },
    ],
  },
  {
    id: "f3",
    title: "Ponte de 90 Dias",
    subtitle: "Queima acelerada de passivos",
    tasks: [
      { id: uid(), label: "Quitar Oluwo", done: false },
      { id: uid(), label: "Renegociar Leka Novo", done: false },
      { id: uid(), label: "Zerar cartões rotativos", done: false },
    ],
  },
  {
    id: "f4",
    title: "A Virada de Chave",
    subtitle: "De sobrevivência a acumulação",
    tasks: [
      { id: uid(), label: "Reserva de 6 meses", done: false },
      { id: uid(), label: "Primeiro aporte em renda fixa", done: false },
    ],
  },
  {
    id: "f5",
    title: "O Império dos 36M",
    subtitle: "Patrimônio consolidado",
    tasks: [
      { id: uid(), label: "Estrutura societária", done: false },
      { id: uid(), label: "Carteira diversificada 36M", done: false },
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
  const [clients, setClients] = useState(initialClients);
  const [creditors, setCreditors] = useState(initialCreditors);
  const [transactions, setTransactions] = useState(initialTx);
  const [phases, setPhases] = useState(initialPhases);

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
      addClient: (c) => setClients((prev) => [{ ...c, id: uid() }, ...prev]),
      setClientStatus: (id, status) =>
        setClients((prev) => prev.map((c) => (c.id === id ? { ...c, status } : c))),
      removeClient: (id) => setClients((prev) => prev.filter((c) => c.id !== id)),
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
