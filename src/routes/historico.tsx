import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "motion/react";
import { Plus } from "lucide-react";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { brl, useCockpit, type Tx } from "@/lib/cockpit-store";
import { useAtivos, useRendimentos } from "@/lib/cockpit-queries";
import { brlExato, resumoRendimento } from "@/lib/financeiro";

export const Route = createFileRoute("/historico")({
  head: () => ({
    meta: [
      { title: "Histórico de Transações | Cockpit 36M" },
      {
        name: "description",
        content: "Todas as receitas, despesas e amortizações registradas no cockpit.",
      },
      { property: "og:title", content: "Histórico de Transações | Cockpit 36M" },
      { property: "og:description", content: "Registro completo do fluxo financeiro." },
    ],
  }),
  component: Historico,
});

const kinds: Tx["kind"][] = ["Receita", "Despesa", "Amortização"];

const kindTone: Record<Tx["kind"], string> = {
  Receita: "border-liquidity/30 bg-liquidity/10 text-liquidity",
  Despesa: "border-debt/30 bg-debt/10 text-debt",
  "Amortização": "border-gold/30 bg-gold/10 text-gold",
};

function Historico() {
  const { transactions, addTx } = useCockpit();
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [kind, setKind] = useState<Tx["kind"]>("Despesa");
  const [amount, setAmount] = useState("");
  const [filter, setFilter] = useState<"Todas" | "Rendimentos" | Tx["kind"]>("Todas");
  const { data: rendimentos = [] } = useRendimentos();
  const { data: ativos = [] } = useAtivos();
  const resumo = resumoRendimento(rendimentos);
  const nomeAtivo = (id: number) => ativos.find((a) => a.id === id)?.nome ?? `Ativo ${id}`;

  const submit = () => {
    const v = Number(amount.replace(/\./g, "").replace(",", "."));
    if (!description.trim() || !v || v <= 0) {
      toast.error("Preencha descrição e valor");
      return;
    }
    addTx({ date: new Date().toISOString().slice(0, 10), description, kind, amount: v });
    toast.success("Transação registrada");
    setDescription("");
    setAmount("");
    setOpen(false);
  };

  const list = transactions.filter((t) => filter === "Todas" || t.kind === filter);

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <PageHeader
        eyebrow="Registro"
        title="Histórico de Transações"
        description="Tudo que entra e sai passa por aqui — sem ruído, sem surpresa."
        action={
          <Button className="gap-2" onClick={() => setOpen(true)}>
            <Plus className="size-4" /> Nova Despesa
          </Button>
        }
      />

      <div className="flex flex-wrap gap-2">
        {(["Todas", ...kinds, "Rendimentos"] as const).map((k) => (
          <Button
            key={k}
            size="sm"
            variant={filter === k ? "default" : "secondary"}
            onClick={() => setFilter(k)}
          >
            {k}
          </Button>
        ))}
      </div>

      {filter === "Rendimentos" ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card overflow-hidden rounded-2xl"
        >
          <div className="grid gap-3 border-b border-border/60 p-5 sm:grid-cols-3">
            {[
              { label: "Rendeu hoje", value: resumo.hoje },
              { label: "Rendeu no mês", value: resumo.mes },
              { label: "Rendeu no total", value: resumo.total },
            ].map((m) => (
              <div key={m.label}>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {m.label}
                </p>
                <p className="num mt-1 text-lg font-semibold text-liquidity">{brlExato(m.value)}</p>
              </div>
            ))}
          </div>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Data</TableHead>
                <TableHead>Ativo</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead className="text-right">Saldo anterior</TableHead>
                <TableHead className="text-right">Juros</TableHead>
                <TableHead className="text-right">Saldo final</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rendimentos.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                    Nenhum fechamento ainda. Rode "Render agora" na Operação Dia D.
                  </TableCell>
                </TableRow>
              )}
              {rendimentos.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="num text-xs text-muted-foreground">
                    {r.data.split("-").reverse().join("/")}
                  </TableCell>
                  <TableCell className="text-sm">{nomeAtivo(r.ativo_id)}</TableCell>
                  <TableCell>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] ${
                        r.origem === "ajuste"
                          ? "border-gold/30 bg-gold/10 text-gold"
                          : "border-liquidity/30 bg-liquidity/10 text-liquidity"
                      }`}
                    >
                      {r.origem === "ajuste" ? "Ajuste do extrato" : "Rendimento"}
                    </span>
                  </TableCell>
                  <TableCell className="num text-right text-xs text-muted-foreground">
                    {brlExato(r.saldo_anterior)}
                  </TableCell>
                  <TableCell
                    className={`num text-right text-sm ${r.juros < 0 ? "text-debt" : "text-liquidity"}`}
                  >
                    {r.juros >= 0 ? "+" : "−"}
                    {brlExato(Math.abs(r.juros))}
                  </TableCell>
                  <TableCell className="num text-right text-sm">{brlExato(r.saldo_final)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </motion.div>
      ) : (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card overflow-hidden rounded-2xl"
      >
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Data</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-right">Valor</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="num text-xs text-muted-foreground">
                  {new Date(t.date).toLocaleDateString("pt-BR")}
                </TableCell>
                <TableCell className="text-sm">{t.description}</TableCell>
                <TableCell>
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[10px] ${kindTone[t.kind]}`}
                  >
                    {t.kind}
                  </span>
                </TableCell>
                <TableCell
                  className={`num text-right text-sm ${t.kind === "Receita" ? "text-liquidity" : "text-foreground"}`}
                >
                  {t.kind === "Receita" ? "+" : "−"}
                  {brl(t.amount)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </motion.div>
      )}

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Nova Transação</SheetTitle>
            <SheetDescription>Registre uma despesa, receita avulsa ou amortização.</SheetDescription>
          </SheetHeader>
          <div className="space-y-5 px-4">
            <div className="space-y-2">
              <Label htmlFor="desc">Descrição</Label>
              <Input
                id="desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: Insumos do ritual"
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={kind} onValueChange={(v) => setKind(v as Tx["kind"])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {kinds.map((k) => (
                    <SelectItem key={k} value={k}>
                      {k}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="val">Valor (R$)</Label>
              <Input
                id="val"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="4300"
              />
            </div>
            <Button className="w-full" onClick={submit}>
              Registrar
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
