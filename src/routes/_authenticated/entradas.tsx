import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Plus, Trash2, ArrowRight, Minus, Pencil } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  ENTRY_STATUSES,
  brl,
  planoDestinacao,
  useCockpit,
  type EntryStatus,
  type EntryType,
} from "@/lib/cockpit-store";
import {
  dataBR,
  diasAte,
  prazoLabel,
  potencial,
  potencialLiquido,
  progresso,
  realizado,
  
  useAtualizarReceita,
  useCriarReceita,
  useAtivos,
  useCrmReceitas,
  isReservaBlindada,
  usePassivos,
  useRemoverReceita,
  type CrmReceita,
} from "@/lib/cockpit-queries";
import { placarFase1 } from "@/lib/financeiro";

import { Progress } from "@/components/ui/progress";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/entradas")({
  head: () => ({
    meta: [
      { title: "Entradas e Rituais | Cockpit 36M" },
      {
        name: "description",
        content: "CRM de captação: acompanhe clientes de rituais do interesse ao pagamento.",
      },
      { property: "og:title", content: "Entradas e Rituais | Cockpit 36M" },
      { property: "og:description", content: "Pipeline de receitas em formato Kanban." },
    ],
  }),
  component: Entradas,
});

const statusTone: Record<EntryStatus, string> = {
  Interessado: "border-border bg-secondary/60 text-muted-foreground",
  Confirmado: "border-gold/30 bg-gold/10 text-gold",
  Pago: "border-liquidity/30 bg-liquidity/10 text-liquidity",
};

function Entradas() {
  const { clients, addClient, setClientStatus, removeClient, paidRevenue, pipeline } = useCockpit();
  const { data: catalogo = [] } = useCrmReceitas();
  const opcoes = [...catalogo].sort((a, b) => b.ticket_medio - a.ticket_medio);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<EntryType>("");
  const [status, setStatus] = useState<EntryStatus>("Interessado");
  const [ritualDate, setRitualDate] = useState("");
  const [recebendo, setRecebendo] = useState<string | null>(null);

  useEffect(() => {
    if (!type && opcoes.length > 0) setType(opcoes[0]!.produto);
  }, [opcoes, type]);

  const submit = () => {
    if (!name.trim()) {
      toast.error("Informe o nome do cliente");
      return;
    }
    const produto = opcoes.find((r) => r.produto === type);
    if (!produto) {
      toast.error("Escolha um ritual do catálogo");
      return;
    }
    addClient({
      name: name.trim(),
      type: produto.produto,
      valor: produto.ticket_medio,
      status,
      ritualDate: ritualDate || null,
    });
    toast.success(`${name} adicionado ao pipeline`);
    setName("");
    setRitualDate("");
    setOpen(false);
  };

  const advance = (id: string, current: EntryStatus, clientName: string) => {
    const next = ENTRY_STATUSES[Math.min(2, ENTRY_STATUSES.indexOf(current) + 1)]!;
    if (next === "Pago") {
      setRecebendo(id);
      return;
    }
    setClientStatus(id, next);
    toast.success(`${clientName} movido para ${next}`);
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <PageHeader
        eyebrow="CRM de Receitas"
        title="Entradas e Rituais"
        description="Cada card movido para Pago soma automaticamente na liquidez do Dashboard."
        action={
          <Button onClick={() => setOpen(true)} className="gap-2">
            <Plus className="size-4" /> Nova Receita
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="glass-card rounded-2xl p-5">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Receita realizada</p>
          <p className="num mt-1 text-2xl font-semibold text-liquidity">{brl(paidRevenue)}</p>
        </div>
        <div className="glass-card rounded-2xl p-5">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Pipeline aberto</p>
          <p className="num mt-1 text-2xl font-semibold text-gold">{brl(pipeline)}</p>
        </div>
      </div>

      <CrmReceitasReais />

      <div className="grid gap-4 lg:grid-cols-3">
        {ENTRY_STATUSES.map((col, ci) => {
          const list = clients.filter((c) => c.status === col);
          const total = list.reduce((s, c) => s + c.valor, 0);
          return (
            <motion.div
              key={col}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: ci * 0.08 }}
              className="rounded-2xl border border-border/70 bg-surface/50 p-4"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold">{col}</h2>
                <span className="num text-xs text-muted-foreground">{brl(total)}</span>
              </div>
              <div className="mt-4 space-y-3">
                {list.length === 0 && (
                  <p className="rounded-xl border border-dashed border-border/70 p-4 text-center text-xs text-muted-foreground">
                    Sem clientes nesta coluna
                  </p>
                )}
                {list.map((c) => (
                  <motion.div
                    key={c.id}
                    layout
                    initial={{ opacity: 0, scale: 0.97 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="glass-card group rounded-xl p-4"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium">{c.name}</p>
                        <span
                          className={`mt-1.5 inline-block rounded-full border px-2 py-0.5 text-[10px] ${statusTone[c.status]}`}
                        >
                          {c.type}
                        </span>
                      </div>
                      <span className="num text-sm">{brl(c.valor)}</span>
                    </div>
                    {(c.ritualDate || c.paymentDate) && (
                      <p className="mt-2 text-[10px] text-muted-foreground">
                        {c.ritualDate ? `Ritual ${dataBR(c.ritualDate)}` : "Sem data de ritual"}
                        {c.paymentDate ? ` · Pago em ${dataBR(c.paymentDate)}` : ""}
                      </p>
                    )}
                    <div className="mt-3 flex items-center gap-2">
                      {c.status !== "Pago" && (
                        <Button
                          size="sm"
                          variant="secondary"
                          className="h-7 gap-1 text-[11px]"
                          onClick={() => advance(c.id, c.status, c.name)}
                        >
                          Avançar <ArrowRight className="size-3" />
                        </Button>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        className="ml-auto size-7 text-muted-foreground hover:text-debt"
                        onClick={() => removeClient(c.id)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          );
        })}
      </div>

      <ReceberRitualSheet id={recebendo} onClose={() => setRecebendo(null)} />

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Adicionar Nova Receita</SheetTitle>
            <SheetDescription>Registre um novo cliente no pipeline de rituais.</SheetDescription>
          </SheetHeader>
          <div className="space-y-5 px-4">
            <div className="space-y-2">
              <Label htmlFor="cli">Nome do cliente</Label>
              <Input id="cli" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: João Batista" />
            </div>
            <div className="space-y-2">
              <Label>Tipo de entrada</Label>
              <Select value={type} onValueChange={(v) => setType(v as EntryType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {opcoes.length === 0 && (
                    <SelectItem value="__vazio" disabled>
                      Cadastre um ritual no Catálogo de Receitas
                    </SelectItem>
                  )}
                  {opcoes.map((r) => (
                    <SelectItem key={r.id} value={r.produto}>
                      {r.produto} — {brl(r.ticket_medio)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dtritual">Data do ritual</Label>
              <Input
                id="dtritual"
                type="date"
                value={ritualDate}
                onChange={(e) => setRitualDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as EntryStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ENTRY_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" onClick={submit}>
              Salvar no pipeline
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

const CAMPANHA_STATUS = ["Em Captação", "Confirmados", "Concluído", "Pausado"] as const;

type ReceitaForm = {
  produto: string;
  ticket_medio: string;
  meta_quantidade: string;
  quantidade_realizada: string;
  custo_operacao: string;
  status_campanha: string;
  data_ritual: string;
  data_pagamento_prevista: string;
};

const emptyForm: ReceitaForm = {
  produto: "",
  ticket_medio: "",
  meta_quantidade: "",
  quantidade_realizada: "0",
  custo_operacao: "0",
  status_campanha: "Em Captação",
  data_ritual: "",
  data_pagamento_prevista: "",
};


function CrmReceitasReais() {
  const { data = [], isLoading, error } = useCrmReceitas();
  const { data: passivos = [] } = usePassivos();
  const { clients } = useCockpit();
  const criar = useCriarReceita();
  const atualizar = useAtualizarReceita();
  const remover = useRemoverReceita();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<ReceitaForm>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<CrmReceita | null>(null);

  const totalPotencial = data.reduce((s, r) => s + potencialLiquido(r), 0);
  const totalBruto = data.reduce((s, r) => s + potencial(r), 0);
  const totalCusto = data.reduce((s, r) => s + (r.custo_operacao ?? 0), 0);

  const custoUnitDe = (tipo: string) => {
    const produto = data.find((r) => r.produto === tipo);
    return produto && produto.meta_quantidade > 0
      ? (produto.custo_operacao ?? 0) / produto.meta_quantidade
      : 0;
  };

  // Realizado = clientes efetivamente pagos no Kanban, líquidos de custo.
  const totalRealizado = clients
    .filter((c) => c.status === "Pago")
    .reduce((s, c) => s + Math.max(0, c.valor - custoUnitDe(c.type)), 0);
  const pctGeral = totalPotencial > 0 ? Math.min(100, (totalRealizado / totalPotencial) * 100) : 0;

  // Pipeline do Kanban líquido: clientes ainda não pagos, menos o custo unitário do produto.
  const pipelineLiquido = clients
    .filter((c) => c.status !== "Pago")
    .reduce((s, c) => s + Math.max(0, c.valor - custoUnitDe(c.type)), 0);

  const fase1 = placarFase1(passivos, totalRealizado, totalRealizado + pipelineLiquido);



  const openNew = () => {
    setEditId(null);
    setForm(emptyForm);
    setSheetOpen(true);
  };

  const openEdit = (r: CrmReceita) => {
    setEditId(r.id);
    setForm({
      produto: r.produto,
      ticket_medio: String(r.ticket_medio),
      meta_quantidade: String(r.meta_quantidade),
      quantidade_realizada: String(r.quantidade_realizada),
      custo_operacao: String(r.custo_operacao ?? 0),
      status_campanha: r.status_campanha ?? "Em Captação",
      data_ritual: r.data_ritual ?? "",
      data_pagamento_prevista: r.data_pagamento_prevista ?? "",
    });
    setSheetOpen(true);
  };

  const saveForm = async () => {
    if (!form.produto.trim()) {
      toast.error("Informe o nome do produto");
      return;
    }
    const payload = {
      produto: form.produto.trim(),
      ticket_medio: Number(form.ticket_medio) || 0,
      meta_quantidade: Number(form.meta_quantidade) || 0,
      quantidade_realizada: Number(form.quantidade_realizada) || 0,
      custo_operacao: Number(form.custo_operacao) || 0,
      status_campanha: form.status_campanha,
      data_ritual: form.data_ritual || null,
      data_pagamento_prevista: form.data_pagamento_prevista || null,
    };


    try {
      if (editId === null) {
        await criar.mutateAsync(payload);
        toast.success(`${payload.produto} adicionado ao catálogo`);
      } else {
        await atualizar.mutateAsync({ id: editId, ...payload });
        toast.success(`${payload.produto} atualizado`);
      }
      setSheetOpen(false);
    } catch {
      toast.error("Não foi possível salvar no banco");
    }
  };

  const step = async (r: CrmReceita, delta: number) => {
    const next = Math.max(0, r.quantidade_realizada + delta);
    try {
      await atualizar.mutateAsync({ id: r.id, quantidade_realizada: next });
    } catch {
      toast.error("Não foi possível atualizar o progresso");
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await remover.mutateAsync(deleteTarget.id);
      toast.success(`${deleteTarget.produto} removido`);
    } catch {
      toast.error("Não foi possível remover");
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card rounded-2xl p-5"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Catálogo de Receitas (dados reais)</h2>
          <p className="text-xs text-muted-foreground">
            Potencial líquido = meta x ticket médio, menos o custo de operação da campanha.
          </p>
        </div>
        <div className="flex items-end gap-5">
          <div className="text-right">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Líquido realizado
            </p>
            <p className="num text-lg font-semibold text-liquidity">{brl(totalRealizado)}</p>
          </div>
          <div className="text-right">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Potencial líquido
            </p>
            <p className="num text-2xl font-semibold gold-text">{brl(totalPotencial)}</p>
            <p className="num text-[11px] text-muted-foreground">
              bruto {brl(totalBruto)} · custo {brl(totalCusto)}
            </p>
          </div>
          <Button variant="secondary" className="gap-2" onClick={openNew}>
            <Plus className="size-4" /> Novo produto
          </Button>
        </div>
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>Avanço geral da meta (líquido)</span>
          <span className="num">{pctGeral.toFixed(1)}%</span>
        </div>
        <Progress value={pctGeral} className="mt-2 h-2" />
      </div>

      <div className="mt-5 rounded-xl border border-debt/25 bg-debt/5 p-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Placar da Fase 1 — Ofensiva Sazonal
            </p>
            <h3 className="text-sm font-semibold">
              Agiota + Oluwo precisam morrer antes do Dia D
            </h3>
          </div>
          <div className="text-right">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Falta vender (líquido)
            </p>
            <p className="num text-2xl font-semibold text-debt">{brl(fase1.falta)}</p>
          </div>
        </div>
        <Progress value={fase1.pct} className="mt-3 h-2" />
        <p className="num mt-2 text-[11px] text-muted-foreground">
          Em aberto {brl(fase1.emAberto)} · líquido já capturado {brl(fase1.liquidoJaPago)} ·{" "}
          {fase1.pct.toFixed(1)}% do alvo
        </p>
        <p className="num mt-1 text-[11px] text-muted-foreground">
          Com o pipeline do Kanban ({brl(fase1.pipelineLiquido - fase1.liquidoJaPago)} a fechar):{" "}
          {fase1.pctComPipeline.toFixed(1)}% do alvo · faltaria {brl(fase1.faltaComPipeline)}
        </p>
        <Link to="/ofensiva" className="mt-2 inline-block text-[11px] text-gold underline underline-offset-4">
          Ver cascata completa até o Dia D
        </Link>

        {fase1.falta > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {data
              .filter((r) => r.ticket_medio > 0)
              .map((r) => (
                <span
                  key={r.id}
                  className="rounded-full border border-border bg-secondary/60 px-2.5 py-1 text-[11px] text-muted-foreground"
                >
                  {Math.ceil(fase1.falta / r.ticket_medio)}x {r.produto}
                </span>
              ))}
          </div>
        )}
      </div>

      {error && <p className="mt-4 text-sm text-debt">Não foi possível carregar as receitas.</p>}
      {isLoading && <p className="mt-4 text-sm text-muted-foreground">Carregando receitas...</p>}

      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[1120px] text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
              <th className="pb-3 font-medium">Produto</th>
              <th className="pb-3 font-medium">Status</th>
              <th className="pb-3 font-medium">Datas</th>
              <th className="pb-3 font-medium">Progresso</th>
              <th className="pb-3 text-right font-medium">Ticket médio</th>
              <th className="pb-3 text-right font-medium">Meta</th>
              <th className="pb-3 text-right font-medium">Custo op.</th>
              <th className="pb-3 text-right font-medium">Líquido</th>
              <th className="pb-3 text-right font-medium">Ações</th>
            </tr>
          </thead>

          <tbody>
            {data.map((r) => (
              <tr key={r.id} className="border-t border-border/60">
                <td className="py-3 font-medium">{r.produto}</td>
                <td className="py-3">
                  <span className="rounded-full border border-gold/30 bg-gold/10 px-2.5 py-1 text-[11px] text-gold">
                    {r.status_campanha ?? "—"}
                  </span>
                </td>
                <td className="min-w-[190px] py-3">
                  <PrazoCell ritual={r.data_ritual} pagamento={r.data_pagamento_prevista} />
                </td>

                <td className="min-w-[210px] py-3">
                  <div className="flex items-center gap-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-6 text-muted-foreground"
                      onClick={() => void step(r, -1)}
                      aria-label={`Remover uma venda de ${r.produto}`}
                    >
                      <Minus className="size-3" />
                    </Button>
                    <div className="flex-1">
                      <Progress value={progresso(r)} className="h-1.5" />
                      <p className="num mt-1 text-[10px] text-muted-foreground">
                        {r.quantidade_realizada}/{r.meta_quantidade} · {brl(realizado(r))}
                      </p>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-6 text-liquidity"
                      onClick={() => void step(r, 1)}
                      aria-label={`Registrar uma venda de ${r.produto}`}
                    >
                      <Plus className="size-3" />
                    </Button>
                  </div>
                </td>
                <td className="num py-3 text-right text-muted-foreground">{brl(r.ticket_medio)}</td>
                <td className="num py-3 text-right text-muted-foreground">{r.meta_quantidade}x</td>
                <td className="num py-3 text-right text-debt">
                  {r.custo_operacao > 0 ? `-${brl(r.custo_operacao)}` : "—"}
                </td>
                <td className="num py-3 text-right font-semibold text-liquidity">
                  {brl(potencialLiquido(r))}
                  {r.custo_operacao > 0 && (
                    <span className="block text-[10px] font-normal text-muted-foreground">
                      bruto {brl(potencial(r))}
                    </span>
                  )}
                </td>

                <td className="py-3">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-7 text-muted-foreground hover:text-gold"
                      onClick={() => openEdit(r)}
                      aria-label={`Editar ${r.produto}`}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-7 text-muted-foreground hover:text-debt"
                      onClick={() => setDeleteTarget(r)}
                      aria-label={`Remover ${r.produto}`}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{editId === null ? "Novo produto" : "Editar produto"}</SheetTitle>
            <SheetDescription>
              Dados gravados direto no catálogo real de receitas.
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-5 px-4">
            <div className="space-y-2">
              <Label htmlFor="prod">Produto</Label>
              <Input
                id="prod"
                value={form.produto}
                onChange={(e) => setForm({ ...form, produto: e.target.value })}
                placeholder="Ex: Ritual Premium"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="ticket">Ticket médio (R$)</Label>
                <Input
                  id="ticket"
                  inputMode="numeric"
                  value={form.ticket_medio}
                  onChange={(e) => setForm({ ...form, ticket_medio: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="meta">Meta (qtd.)</Label>
                <Input
                  id="meta"
                  inputMode="numeric"
                  value={form.meta_quantidade}
                  onChange={(e) => setForm({ ...form, meta_quantidade: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="feito">Quantidade já realizada</Label>
                <Input
                  id="feito"
                  inputMode="numeric"
                  value={form.quantidade_realizada}
                  onChange={(e) => setForm({ ...form, quantidade_realizada: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="custo">Custo de operação (R$)</Label>
                <Input
                  id="custo"
                  inputMode="numeric"
                  value={form.custo_operacao}
                  onChange={(e) => setForm({ ...form, custo_operacao: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="dr">Data do ritual</Label>
                <Input
                  id="dr"
                  type="date"
                  value={form.data_ritual}
                  onChange={(e) => setForm({ ...form, data_ritual: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dp">Pagamento previsto</Label>
                <Input
                  id="dp"
                  type="date"
                  value={form.data_pagamento_prevista}
                  onChange={(e) => setForm({ ...form, data_pagamento_prevista: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Status da campanha</Label>
              <Select
                value={form.status_campanha}
                onValueChange={(v) => setForm({ ...form, status_campanha: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CAMPANHA_STATUS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              className="w-full"
              onClick={() => void saveForm()}
              disabled={criar.isPending || atualizar.isPending}
            >
              {editId === null ? "Adicionar ao catálogo" : "Salvar alterações"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={deleteTarget !== null} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover {deleteTarget?.produto}?</AlertDialogTitle>
            <AlertDialogDescription>
              Este produto será excluído do catálogo de receitas. A ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmDelete()}>Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.section>
  );
}

function PrazoCell({ ritual, pagamento }: { ritual: string | null; pagamento: string | null }) {
  const dias = diasAte(pagamento);
  const label = prazoLabel(pagamento);
  const tone =
    dias === null
      ? "text-muted-foreground"
      : dias < 0
        ? "text-debt"
        : dias <= 7
          ? "text-gold"
          : "text-liquidity";
  return (
    <div className="text-[11px] leading-tight">
      <p className="text-muted-foreground">Ritual: {dataBR(ritual)}</p>
      <p className="text-muted-foreground">Pgto: {dataBR(pagamento)}</p>
      {label && <p className={`mt-0.5 font-medium ${tone}`}>{label}</p>}
    </div>
  );
}


/** Confirmação de recebimento: valor, custo editável e prévia da destinação. */
function ReceberRitualSheet({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { clients, receberRitual } = useCockpit();
  const { data: passivos = [] } = usePassivos();
  const { data: ativos = [] } = useAtivos();
  const { data: receitas = [] } = useCrmReceitas();

  const cliente = clients.find((c) => c.id === id);
  const produto = receitas.find((r) => r.produto === cliente?.type);
  const ticket = cliente ? cliente.valor || (produto?.ticket_medio ?? 0) : 0;
  const fontes = ativos.filter((a) => !isReservaBlindada(a));

  const custoSugerido = (() => {
    if (!produto || produto.meta_quantidade <= 0) return 0;
    return Math.round((produto.custo_operacao ?? 0) / produto.meta_quantidade);
  })();

  const [recebido, setRecebido] = useState("");
  const [custo, setCusto] = useState("");
  const [destino, setDestino] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!cliente) return;
    setRecebido(String(ticket));
    setCusto(String(custoSugerido));
    const preferida =
      fontes.find((a) => `${a.nome} ${a.tipo ?? ""}`.toLowerCase().includes("investimento")) ??
      fontes[0];
    setDestino(preferida ? String(preferida.id) : "caixa");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, ticket, custoSugerido, ativos.length]);

  const nRecebido = Math.max(0, Number(recebido.replace(",", ".")) || 0);
  const nCusto = Math.max(0, Number(custo.replace(",", ".")) || 0);
  const liquido = Math.max(0, nRecebido - nCusto);
  const plano = planoDestinacao(passivos, liquido);
  const nomeDestino = fontes.find((a) => String(a.id) === destino)?.nome ?? "Poder de Fogo livre";

  const confirmar = async () => {
    if (!cliente || nRecebido <= 0) {
      toast.error("Informe o valor recebido");
      return;
    }
    setEnviando(true);
    try {
      await receberRitual({
        id: cliente.id,
        recebido: nRecebido,
        custo: nCusto,
        ativoId: destino === "caixa" ? null : Number(destino),
      });
      const resumo = plano.fatias.map((f) => `${brl(f.valor)} → ${f.credor}`).join(" · ");
      toast.success(
        `${brl(nRecebido)} recebidos · ${brl(nCusto)} de custo${resumo ? ` · ${resumo}` : ""}${
          plano.sobra > 0 ? ` · ${brl(plano.sobra)} → ${nomeDestino}` : ""
        }`,
      );
      onClose();
    } catch {
      toast.error("Não consegui concluir o recebimento");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Sheet open={!!cliente} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Receber {cliente?.name}</SheetTitle>
          <SheetDescription>
            {cliente?.type} — confira o valor, ajuste o custo e veja para onde o líquido vai.
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-5 overflow-y-auto px-4 pb-6">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="recebido">Valor recebido (R$)</Label>
              <Input
                id="recebido"
                inputMode="decimal"
                value={recebido}
                onChange={(e) => setRecebido(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="custo">Custo da operação (R$)</Label>
              <Input
                id="custo"
                inputMode="decimal"
                value={custo}
                onChange={(e) => setCusto(e.target.value)}
              />
            </div>
          </div>

          <div className="rounded-xl border border-liquidity/25 bg-liquidity/5 p-4">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Líquido para a operação
            </p>
            <p className="num mt-1 text-2xl font-semibold text-liquidity">{brl(liquido)}</p>
          </div>

          <div className="space-y-2">
            <Label>Onde a sobra é aplicada</Label>
            <Select value={destino} onValueChange={setDestino}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {fontes.map((a) => (
                  <SelectItem key={a.id} value={String(a.id)}>
                    {a.nome} · {brl(a.valor)}
                  </SelectItem>
                ))}
                <SelectItem value="caixa">Deixar no caixa livre</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              O Fundo de Reserva de R$ 40.000 é blindado e não recebe entradas.
            </p>
          </div>

          <div className="rounded-xl border border-border/70 p-4">
            <p className="text-xs font-semibold">Destinação do líquido</p>
            <div className="mt-3 space-y-2 text-xs">
              {plano.fatias.map((f) => (
                <div key={f.id} className="flex items-center justify-between">
                  <span className="text-debt">Extermínio {f.credor}</span>
                  <span className="num">{brl(f.valor)}</span>
                </div>
              ))}
              {plano.fatias.length === 0 && (
                <p className="text-muted-foreground">
                  Nenhum alvo da Fase 1 em aberto — 100% vai para {nomeDestino}.
                </p>
              )}
              {plano.sobra > 0 && plano.fatias.length > 0 && (
                <div className="flex items-center justify-between border-t border-border/60 pt-2">
                  <span className="text-liquidity">Sobra para {nomeDestino}</span>
                  <span className="num">{brl(plano.sobra)}</span>
                </div>
              )}
            </div>
          </div>

          <Button className="w-full" onClick={() => void confirmar()} disabled={enviando}>
            {enviando ? "Registrando..." : "Confirmar recebimento"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
