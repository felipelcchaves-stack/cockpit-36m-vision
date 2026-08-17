import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "motion/react";
import { Plus, Trash2, ArrowRight } from "lucide-react";
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
  ENTRY_TYPES,
  ENTRY_VALUES,
  brl,
  useCockpit,
  type EntryStatus,
  type EntryType,
} from "@/lib/cockpit-store";
import { potencial, useCrmReceitas } from "@/lib/cockpit-queries";

export const Route = createFileRoute("/entradas")({
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
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<EntryType>("Ritual 4.5k");
  const [status, setStatus] = useState<EntryStatus>("Interessado");

  const submit = () => {
    if (!name.trim()) {
      toast.error("Informe o nome do cliente");
      return;
    }
    addClient({ name: name.trim(), type, status });
    toast.success(`${name} adicionado ao pipeline`);
    setName("");
    setOpen(false);
  };

  const advance = (id: string, current: EntryStatus, clientName: string) => {
    const next = ENTRY_STATUSES[Math.min(2, ENTRY_STATUSES.indexOf(current) + 1)]!;
    setClientStatus(id, next);
    if (next === "Pago") toast.success(`${clientName} pago — liquidez atualizada`);
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
          const total = list.reduce((s, c) => s + ENTRY_VALUES[c.type], 0);
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
                      <span className="num text-sm">{brl(ENTRY_VALUES[c.type])}</span>
                    </div>
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
                  {ENTRY_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t} — {brl(ENTRY_VALUES[t])}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
  status_campanha: string;
};

const emptyForm: ReceitaForm = {
  produto: "",
  ticket_medio: "",
  meta_quantidade: "",
  quantidade_realizada: "0",
  status_campanha: "Em Captação",
};

function CrmReceitasReais() {
  const { data = [], isLoading, error } = useCrmReceitas();
  const criar = useCriarReceita();
  const atualizar = useAtualizarReceita();
  const remover = useRemoverReceita();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<ReceitaForm>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<CrmReceita | null>(null);

  const totalPotencial = data.reduce((s, r) => s + potencial(r), 0);
  const totalRealizado = data.reduce((s, r) => s + realizado(r), 0);
  const pctGeral = totalPotencial > 0 ? Math.min(100, (totalRealizado / totalPotencial) * 100) : 0;

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
      status_campanha: r.status_campanha ?? "Em Captação",
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
      status_campanha: form.status_campanha,
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
            Potencial = meta de quantidade x ticket médio de cada produto.
          </p>
        </div>
        <div className="flex items-end gap-5">
          <div className="text-right">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Realizado</p>
            <p className="num text-lg font-semibold text-liquidity">{brl(totalRealizado)}</p>
          </div>
          <div className="text-right">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Potencial total
            </p>
            <p className="num text-2xl font-semibold gold-text">{brl(totalPotencial)}</p>
          </div>
          <Button variant="secondary" className="gap-2" onClick={openNew}>
            <Plus className="size-4" /> Novo produto
          </Button>
        </div>
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>Avanço geral da meta</span>
          <span className="num">{pctGeral.toFixed(1)}%</span>
        </div>
        <Progress value={pctGeral} className="mt-2 h-2" />
      </div>

      {error && <p className="mt-4 text-sm text-debt">Não foi possível carregar as receitas.</p>}
      {isLoading && <p className="mt-4 text-sm text-muted-foreground">Carregando receitas...</p>}

      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[860px] text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
              <th className="pb-3 font-medium">Produto</th>
              <th className="pb-3 font-medium">Status</th>
              <th className="pb-3 font-medium">Progresso</th>
              <th className="pb-3 text-right font-medium">Ticket médio</th>
              <th className="pb-3 text-right font-medium">Meta</th>
              <th className="pb-3 text-right font-medium">Potencial</th>
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
                <td className="num py-3 text-right font-semibold text-liquidity">
                  {brl(potencial(r))}
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
