import { createFileRoute } from "@tanstack/react-router";
import { motion } from "motion/react";
import { CheckCircle2, Flame } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { brl } from "@/lib/cockpit-store";
import { isPago, sumPassivos, useMarcarPassivoPago, usePassivos } from "@/lib/cockpit-queries";

export const Route = createFileRoute("/passivos")({
  head: () => ({
    meta: [
      { title: "Painel de Alvos | Cockpit 36M" },
      {
        name: "description",
        content: "Gestão de passivos reais: saldo devedor, fase de quitação e status por credor.",
      },
      { property: "og:title", content: "Painel de Alvos | Cockpit 36M" },
      { property: "og:description", content: "Acompanhe e quite cada credor com dados reais." },
    ],
  }),
  component: Passivos,
});

function Passivos() {
  const { data: rows = [], isLoading, error } = usePassivos();
  const marcarPago = useMarcarPassivoPago();

  const totalOriginal = rows.reduce((s, r) => s + r.saldo_devedor, 0);
  const totalDebt = sumPassivos(rows);
  const burned = totalOriginal > 0 ? ((totalOriginal - totalDebt) / totalOriginal) * 100 : 0;
  const quitados = rows.filter((r) => isPago(r.status)).length;

  const quitar = (id: number, credor: string) => {
    marcarPago.mutate(id, {
      onSuccess: () => toast.success(`${credor} marcado como pago`),
      onError: () => toast.error("Não foi possível atualizar este passivo"),
    });
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <PageHeader
        eyebrow="Painel de Alvos"
        title="Gestão de Passivos"
        description="Dados reais do seu banco. Cada alvo abatido é fôlego permanente."
      />

      <div className="glass-card rounded-2xl p-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              Passivo total em aberto
            </p>
            <p className="num mt-1 text-3xl font-semibold text-debt">
              {isLoading ? "—" : brl(totalDebt)}
            </p>
          </div>
          <p className="text-sm text-muted-foreground">
            <span className="num font-semibold text-liquidity">{burned.toFixed(1)}%</span> do passivo
            mapeado já foi quitado — {quitados} de {rows.length} credores
          </p>
        </div>
        <Progress value={burned} className="mt-4 h-2 bg-secondary" />
      </div>

      {error && (
        <p className="glass-card rounded-2xl p-5 text-sm text-debt">
          Não foi possível carregar os passivos.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {rows.map((p, i) => {
          const done = isPago(p.status);
          return (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className={`glass-card rounded-2xl p-5 ${done ? "border-liquidity/30" : ""}`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-base font-semibold">{p.credor}</h2>
                  <span className="mt-1 inline-block rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                    {p.fase_quitacao ?? "Sem fase"}
                  </span>
                </div>
                <span
                  className={`rounded-xl p-2 ${done ? "bg-liquidity/10 text-liquidity" : "bg-debt/10 text-debt"}`}
                >
                  {done ? <CheckCircle2 className="size-4" /> : <Flame className="size-4" />}
                </span>
              </div>

              <p className="num mt-4 text-2xl font-semibold">{brl(p.saldo_devedor)}</p>
              <p className="text-[11px] text-muted-foreground">
                Status atual: {p.status ?? "Pendente"}
              </p>

              <Button
                variant={done ? "secondary" : "default"}
                className="mt-4 w-full"
                disabled={done || marcarPago.isPending}
                onClick={() => quitar(p.id, p.credor)}
              >
                {done ? "Alvo extinto" : "Marcar como Pago"}
              </Button>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
