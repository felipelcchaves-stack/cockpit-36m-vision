import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "motion/react";
import { Bomb, Landmark, Lock, Rocket } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { brl } from "@/lib/cockpit-store";
import { useAtivos, usePassivos } from "@/lib/cockpit-queries";
import {
  APORTE_DIA_D,
  LASTRO_INVESTIMENTO,
  QUITACAO_CONSIGNADO,
  brlExato,
  cofreBlindado,
  simularDiaD,
  valorAtivo,
  valorPassivo,
} from "@/lib/financeiro";

export const Route = createFileRoute("/dia-d")({
  head: () => ({
    meta: [
      { title: "Operação Dia D | Cockpit 36M" },
      {
        name: "description",
        content:
          "Simulador do evento de liquidez: aporte, quitação do consignado, resgate do lastro e o disparo da Bazuca.",
      },
      { property: "og:title", content: "Operação Dia D | Cockpit 36M" },
      { property: "og:description", content: "Simule a Bazuca e veja a Kill List cair em cascata." },
    ],
  }),
  component: DiaD,
});

function DiaD() {
  const { data: passivos = [] } = usePassivos();
  const { data: ativos = [] } = useAtivos();

  const aporteBase = valorAtivo(ativos, "aporte", APORTE_DIA_D);
  const lastroBase = valorAtivo(ativos, "investimento", LASTRO_INVESTIMENTO);
  const consignadoBase = valorPassivo(passivos, "consignad", QUITACAO_CONSIGNADO);
  const reserva = cofreBlindado(ativos);

  const [pctAporte, setPctAporte] = useState(100);
  const aporte = (aporteBase * pctAporte) / 100;

  const sim = simularDiaD(passivos, {
    aporte,
    consignado: consignadoBase,
    lastro: lastroBase,
  });

  const extintos = sim.alvos.filter((a) => a.extinto).length;
  const cobertura =
    sim.alvos.length > 0
      ? (sim.alvos.reduce((s, a) => s + a.abatido, 0) /
          Math.max(1, sim.alvos.reduce((s, a) => s + a.saldo, 0))) *
        100
      : 0;

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <PageHeader
        eyebrow="Evento de Liquidez"
        title="Operação Dia D"
        description="O dinheiro do banco cai, o lastro destrava, o consignado morre — e o que sobra vira A Bazuca."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Injeção de Capital",
            value: brlExato(aporte),
            hint: "Aporte do banco",
            icon: Landmark,
            tone: "text-liquidity",
          },
          {
            label: "Quitação Consignado",
            value: `−${brlExato(sim.consignado)}`,
            hint: "Automático no Dia D",
            icon: Bomb,
            tone: "text-debt",
          },
          {
            label: "Resgate do Lastro",
            value: brlExato(sim.lastro),
            hint: "Conta de investimento destravada",
            icon: Rocket,
            tone: "text-liquidity",
          },
          {
            label: "A Bazuca",
            value: brlExato(sim.bazuca),
            hint: "Munição para a Kill List",
            icon: Bomb,
            tone: "gold-text",
          },
        ].map((c, i) => (
          <motion.div
            key={c.label}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="glass-card rounded-2xl p-5"
          >
            <c.icon className={`size-4 ${c.tone}`} />
            <p className="mt-3 text-[11px] uppercase tracking-wider text-muted-foreground">
              {c.label}
            </p>
            <p className={`num mt-1 text-xl font-semibold ${c.tone}`}>{c.value}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">{c.hint}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="glass-card rounded-2xl p-5">
          <h2 className="text-base font-semibold">E se o aporte vier menor?</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Ajuste o percentual liberado pelo banco e veja a Kill List reagir.
          </p>
          <p className="num mt-4 text-2xl font-semibold gold-text">{pctAporte}%</p>
          <Slider
            value={[pctAporte]}
            min={0}
            max={100}
            step={5}
            onValueChange={([v]) => setPctAporte(v ?? 100)}
            className="mt-4"
          />
          <div className="mt-5 space-y-2 border-t border-border/60 pt-4 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Alvos exterminados</span>
              <span className="num font-semibold text-liquidity">
                {extintos}/{sim.alvos.length}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Passivo remanescente</span>
              <span className="num font-semibold text-debt">{brl(sim.passivoRestante)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Sobra livre</span>
              <span className="num font-semibold gold-text">{brl(sim.sobra)}</span>
            </div>
          </div>
          <div className="mt-5 flex items-start gap-2 rounded-xl border border-gold/30 bg-gold/[0.06] p-3 text-[11px] text-muted-foreground">
            <Lock className="mt-0.5 size-3.5 shrink-0 text-gold" />
            Fundo de Reserva de {brl(reserva)} permanece blindado — não entra na Bazuca em nenhuma
            hipótese.
          </div>
        </div>

        <div className="glass-card rounded-2xl p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Cascata de extermínio</h2>
            <span className="num text-xs text-muted-foreground">
              {cobertura.toFixed(0)}% do passivo coberto
            </span>
          </div>
          <div className="mt-5 space-y-4">
            {sim.alvos.map((a) => {
              const pct = a.saldo > 0 ? (a.abatido / a.saldo) * 100 : 100;
              return (
                <div key={a.id}>
                  <div className="flex items-center justify-between text-sm">
                    <span className={a.extinto ? "text-liquidity" : ""}>
                      {a.credor}
                      {a.extinto && (
                        <span className="ml-2 rounded-full border border-liquidity/40 bg-liquidity/10 px-2 py-0.5 text-[10px] uppercase tracking-wider">
                          extinto
                        </span>
                      )}
                    </span>
                    <span className="num text-xs text-muted-foreground">
                      {brl(a.abatido)} de {brl(a.saldo)}
                    </span>
                  </div>
                  <Progress
                    value={pct}
                    className={`mt-2 h-2 bg-secondary ${a.extinto ? "[&>div]:bg-liquidity" : ""}`}
                  />
                </div>
              );
            })}
            {sim.alvos.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Nenhum alvo em aberto — a Kill List está zerada.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
