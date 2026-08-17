import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { CheckCircle2, CreditCard, Flame, Target } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { AlvoExterminado } from "@/components/alvo-exterminado";
import { AmortizarSheet, type AlvoAmortizacao } from "@/components/amortizar-sheet";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { brl, useCockpit } from "@/lib/cockpit-store";
import { isCartao, isPago, killList, sumPassivos, usePassivos } from "@/lib/cockpit-queries";


export const Route = createFileRoute("/_authenticated/passivos")({
  head: () => ({
    meta: [
      { title: "Kill List de Passivos | Cockpit 36M" },
      {
        name: "description",
        content:
          "Ordem oficial de extermínio: saldo devedor, fase de quitação e amortização por credor.",
      },
      { property: "og:title", content: "Kill List de Passivos | Cockpit 36M" },
      { property: "og:description", content: "Extermine cada alvo na ordem certa." },
    ],
  }),
  component: Passivos,
});

const faseTone = (fase: string | null) => {
  const f = (fase ?? "").toLowerCase();
  if (f.includes("fase 1")) return "border-debt/40 bg-debt/10 text-debt";
  if (f.includes("fase 2")) return "border-gold/40 bg-gold/10 text-gold";
  if (f.includes("fase 3")) return "border-liquidity/40 bg-liquidity/10 text-liquidity";
  return "border-border text-muted-foreground";
};

function Passivos() {
  const { data: rows = [], isLoading, error } = usePassivos();
  const { creditors } = useCockpit();

  const [alvo, setAlvo] = useState<AlvoAmortizacao | null>(null);
  const [exterminado, setExterminado] = useState<string | null>(null);
  const vivosRef = useRef<string[] | null>(null);

  const lista = killList(rows);
  const totalDebt = sumPassivos(rows);
  const totalOriginal = creditors.reduce((s, c) => s + c.original, 0);
  const burned = totalOriginal > 0 ? ((totalOriginal - totalDebt) / totalOriginal) * 100 : 0;
  const quitados = rows.filter((r) => isPago(r.status) || r.saldo_devedor === 0).length;
  const proximo = lista.find((r) => !isPago(r.status) && r.saldo_devedor > 0);

  // Detecta o momento em que um alvo zera para disparar o banner de extermínio.
  useEffect(() => {
    if (isLoading) return;
    const vivos = lista.filter((r) => !isPago(r.status) && r.saldo_devedor > 0).map((r) => r.credor);
    const antes = vivosRef.current;
    if (antes) {
      const morto = antes.find((n) => !vivos.includes(n));
      if (morto) setExterminado(morto);
    }
    vivosRef.current = vivos;
  }, [lista, isLoading]);

  const abrirAmortizacao = (id: number, credor: string, saldo: number) =>
    setAlvo({ id: String(id), nome: credor, saldo });

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <AlvoExterminado nome={exterminado} onDone={() => setExterminado(null)} />

      <PageHeader
        eyebrow="Kill List"
        title="Extermínio de Passivos"
        description="Ordem oficial do dossiê. Cada alvo abatido é fôlego permanente — nunca na base do rotativo."
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
          <div className="text-sm text-muted-foreground sm:text-right">
            <p>
              <span className="num font-semibold text-liquidity">{burned.toFixed(1)}%</span> do
              passivo mapeado já foi exterminado — {quitados} de {rows.length} alvos
            </p>
            {proximo && (
              <p className="mt-1 flex items-center gap-1.5 sm:justify-end">
                <Target className="size-3.5 text-gold" />
                Próximo alvo:{" "}
                <span className="font-semibold text-gold">
                  {proximo.credor} · {brl(proximo.saldo_devedor)}
                </span>
              </p>
            )}
          </div>
        </div>
        <Progress value={burned} className="mt-4 h-2 bg-secondary" />
      </div>

      {error && (
        <p className="glass-card rounded-2xl p-5 text-sm text-debt">
          Não foi possível carregar os passivos.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {lista.map((p, i) => {
          const done = isPago(p.status) || p.saldo_devedor === 0;
          const original = creditors.find((c) => c.id === String(p.id))?.original ?? p.saldo_devedor;
          const vida = original > 0 ? (p.saldo_devedor / original) * 100 : 0;
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
                  <div className="flex items-center gap-2">
                    <span className="num rounded-md border border-border px-1.5 text-[10px] text-muted-foreground">
                      #{p.ordem === 99 ? "—" : p.ordem}
                    </span>
                    <h2 className="text-base font-semibold">{p.credor}</h2>
                  </div>
                  <span
                    className={`mt-2 inline-block rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider ${faseTone(p.fase_quitacao)}`}
                  >
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
                Vida da dívida · {vida.toFixed(0)}% do saldo original de {brl(original)}
              </p>
              <Progress value={100 - vida} className="mt-2 h-1.5 bg-secondary" />

              {isCartao(p) && (
                <p className="mt-3 flex items-start gap-1.5 rounded-lg border border-debt/30 bg-debt/[0.07] p-2 text-[11px] text-debt">
                  <CreditCard className="mt-0.5 size-3.5 shrink-0" />
                  Lei do Cartão: zero rotativo, zero parcelamento com juros. Sem caixa à vista, a
                  compra não é feita.
                </p>
              )}

              <Button
                variant={done ? "secondary" : "default"}
                className="mt-4 w-full"
                disabled={done}
                onClick={() => abrirAmortizacao(p.id, p.credor, p.saldo_devedor)}
              >
                {done ? "Alvo extinto" : "Amortizar / Exterminar"}
              </Button>
            </motion.div>
          );
        })}
      </div>

      <AmortizarSheet alvo={alvo} onClose={() => setAlvo(null)} />
    </div>
  );
}
