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
