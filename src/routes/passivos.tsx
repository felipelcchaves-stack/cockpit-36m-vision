import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "motion/react";
import { CheckCircle2, Flame } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { brl, useCockpit, type Creditor } from "@/lib/cockpit-store";

export const Route = createFileRoute("/passivos")({
  head: () => ({
    meta: [
      { title: "Painel de Alvos | Cockpit 36M" },
      {
        name: "description",
        content: "Gestão de passivos: saldo devedor, amortização e progresso por credor.",
      },
      { property: "og:title", content: "Painel de Alvos | Cockpit 36M" },
      { property: "og:description", content: "Acompanhe e amortize cada credor." },
    ],
  }),
  component: Passivos,
});

function Passivos() {
  const { creditors, totalDebt, amortize } = useCockpit();
  const [target, setTarget] = useState<Creditor | null>(null);
  const [amount, setAmount] = useState("");

  const confirm = () => {
    const v = Number(amount.replace(/\./g, "").replace(",", "."));
    if (!target || !v || v <= 0) {
      toast.error("Informe um valor válido");
      return;
    }
    amortize(target.id, v);
    toast.success(`${brl(v)} amortizados de ${target.name}`);
    setAmount("");
    setTarget(null);
  };

  const totalOriginal = creditors.reduce((s, c) => s + c.original, 0);
  const burned = ((totalOriginal - totalDebt) / totalOriginal) * 100;

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <PageHeader
        eyebrow="Painel de Alvos"
        title="Gestão de Passivos"
        description="Cada alvo abatido é fôlego permanente. Amortize com precisão cirúrgica."
      />

      <div className="glass-card rounded-2xl p-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              Passivo total restante
            </p>
            <p className="num mt-1 text-3xl font-semibold text-debt">{brl(totalDebt)}</p>
          </div>
          <p className="text-sm text-muted-foreground">
            <span className="num text-liquidity font-semibold">{burned.toFixed(1)}%</span> da dívida
            original já foi queimada
          </p>
        </div>
        <Progress value={burned} className="mt-4 h-2 bg-secondary" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {creditors.map((c, i) => {
          const pct = ((c.original - c.balance) / c.original) * 100;
          const done = c.balance === 0;
          return (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`glass-card rounded-2xl p-5 ${done ? "border-liquidity/30" : ""}`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-base font-semibold">{c.name}</h2>
                  <span className="mt-1 inline-block rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                    {c.tag}
                  </span>
                </div>
                <span
                  className={`rounded-xl p-2 ${done ? "bg-liquidity/10 text-liquidity" : "bg-debt/10 text-debt"}`}
                >
                  {done ? <CheckCircle2 className="size-4" /> : <Flame className="size-4" />}
                </span>
              </div>

              <p className="num mt-4 text-2xl font-semibold">
                {done ? <span className="text-liquidity">Quitado</span> : brl(c.balance)}
              </p>
              <p className="text-[11px] text-muted-foreground">Original: {brl(c.original)}</p>

              <Progress value={pct} className="mt-4 h-1.5 bg-secondary" />
              <p className="mt-2 text-[11px] text-muted-foreground">
                {pct.toFixed(1)}% amortizado
              </p>

              <Button
                variant={done ? "secondary" : "default"}
                className="mt-4 w-full"
                disabled={done}
                onClick={() => setTarget(c)}
              >
                {done ? "Alvo extinto" : "Amortizar"}
              </Button>
            </motion.div>
          );
        })}
      </div>

      <Sheet open={!!target} onOpenChange={(o) => !o && setTarget(null)}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Amortizar {target?.name}</SheetTitle>
            <SheetDescription>
              Saldo atual: {target ? brl(target.balance) : ""}. O valor será registrado no histórico.
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-5 px-4">
            <div className="space-y-2">
              <Label htmlFor="amt">Valor da amortização (R$)</Label>
              <Input
                id="amt"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="30000"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {[5000, 15000, 30000].map((v) => (
                <Button key={v} size="sm" variant="secondary" onClick={() => setAmount(String(v))}>
                  {brl(v)}
                </Button>
              ))}
              {target && (
                <Button size="sm" variant="secondary" onClick={() => setAmount(String(target.balance))}>
                  Quitar total
                </Button>
              )}
            </div>
            <Button className="w-full" onClick={confirm}>
              Confirmar amortização
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
