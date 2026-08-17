import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { Crosshair, Flame, Lock, Rocket, Sparkles, Target } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { AmortizarSheet, type AlvoAmortizacao } from "@/components/amortizar-sheet";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { brl, useCockpit } from "@/lib/cockpit-store";
import {
  killList,
  useAtivos,
  useCrmReceitas,
  usePassivos,
  useTransacoes,
  type CrmReceita,
} from "@/lib/cockpit-queries";

import {
  META_PATRIMONIO,
  RENDA_PASSIVA_ALVO,
  RETIRADA_SEGURA,
  brlExato,
  cascataFase1DiaD,
  exterminioRealizado,
} from "@/lib/financeiro";


export const Route = createFileRoute("/ofensiva")({
  head: () => ({
    meta: [
      { title: "Ofensiva → Dia D | Cockpit 36M" },
      {
        name: "description",
        content:
          "Quanto de ritual ainda falta vender para exterminar Agiota e Oluwo, e quanto sobra livre no Dia D.",
      },
      { property: "og:title", content: "Ofensiva → Dia D | Cockpit 36M" },
      {
        property: "og:description",
        content: "A cascata completa: munição da Fase 1, extermínio pré-Dia D, Bazuca e sobra livre.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Ofensiva,
});

type Cenario = "realizado" | "provavel" | "otimista";

const CENARIOS: { id: Cenario; label: string; hint: string }[] = [
  { id: "realizado", label: "Realizado", hint: "Só o que já entrou em caixa" },
  { id: "provavel", label: "Provável", hint: "Realizado + clientes confirmados" },
  { id: "otimista", label: "Otimista", hint: "Todo o pipeline do Kanban" },
];

/** Custo de operação por unidade vendida daquele produto. */
const custoUnitario = (r: CrmReceita | undefined) =>
  r && r.meta_quantidade > 0 ? (r.custo_operacao ?? 0) / r.meta_quantidade : 0;

function Ofensiva() {
  const { clients } = useCockpit();
  const { data: passivos = [] } = usePassivos();
  const { data: ativos = [] } = useAtivos();
  const { data: receitas = [] } = useCrmReceitas();

  const [cenario, setCenario] = useState<Cenario>("provavel");

  const liquidoCliente = (valor: number, tipo: string) => {
    const produto = receitas.find((r) => r.produto === tipo);
    return Math.max(0, valor - custoUnitario(produto));
  };

  const clientesPagos = clients.filter((c) => c.status === "Pago");
  const pagos = clientesPagos.reduce((s, c) => s + liquidoCliente(c.valor, c.type), 0);
  const confirmados = clients
    .filter((c) => c.status === "Confirmado")
    .reduce((s, c) => s + liquidoCliente(c.valor, c.type), 0);
  const interessados = clients
    .filter((c) => c.status === "Interessado")
    .reduce((s, c) => s + liquidoCliente(c.valor, c.type), 0);

  // Cenários cumulativos: o realizado sempre conta; o pipeline entra por cima.
  const pipeline =
    cenario === "realizado" ? 0 : cenario === "provavel" ? confirmados : confirmados + interessados;

  const c = useMemo(
    () => cascataFase1DiaD({ passivos, ativos, municao: pipeline, municaoRealizada: pagos }),
    [passivos, ativos, pipeline, pagos],
  );

  const alvoTotal = c.abates.reduce((s, a) => s + a.saldo, 0) + c.jaExterminado;
  const pctFase1 = alvoTotal > 0 ? Math.min(100, ((alvoTotal - c.faltaVender) / alvoTotal) * 100) : 100;
  const rendaSobra = c.sobraLivre * RETIRADA_SEGURA;
  const pctMeta = Math.max(0, (c.sobraLivre / META_PATRIMONIO) * 100);

  const sugestoes = receitas
    .filter((r) => r.ticket_medio > 0)
    .map((r) => ({
      produto: r.produto,
      qtd: Math.ceil(c.faltaVender / Math.max(1, r.ticket_medio - custoUnitario(r))),
    }));


  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <PageHeader
        eyebrow="Fase 1 → Evento de Liquidez"
        title="Ofensiva → Dia D"
        description="Todo ritual vendido tem um único destino: matar Agiota e Oluwo. O que sobrar vira munição da Bazuca e o começo da riqueza."
      />

      {/* Barra de comando: falta vender */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        className={`rounded-2xl border p-5 ${
          c.faltaVender > 0 ? "border-debt/40 bg-debt/[0.07]" : "border-liquidity/40 bg-liquidity/[0.07]"
        }`}
      >
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              {c.faltaVender > 0 ? "Falta vender (líquido)" : "Fase 1 fechada"}
            </p>
            <p
              className={`num mt-1 text-3xl font-semibold ${
                c.faltaVender > 0 ? "text-debt" : "text-liquidity"
              }`}
            >
              {c.faltaVender > 0 ? brlExato(c.faltaVender) : "Agiota e Oluwo exterminados"}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Cenário {CENARIOS.find((x) => x.id === cenario)?.label.toLowerCase()} · munição de{" "}
              {brl(c.municao)} sobre {brl(alvoTotal)} em aberto
            </p>
          </div>
          <div className="flex gap-2">
            {CENARIOS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setCenario(s.id)}
                title={s.hint}
                className={`rounded-full border px-3 py-1.5 text-xs transition ${
                  cenario === s.id
                    ? "border-gold/50 bg-gold/15 text-gold"
                    : "border-border bg-secondary/50 text-muted-foreground hover:text-foreground"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
        <Progress
          value={pctFase1}
          className={`mt-4 h-2 bg-secondary ${c.faltaVender === 0 ? "[&>div]:bg-liquidity" : ""}`}
        />
      </motion.div>

      {/* Já capturado: rituais efetivamente pagos */}
      <div className="glass-card rounded-2xl p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">Já capturado (rituais pagos)</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Dinheiro que já entrou e já baixou o saldo de Agiota/Oluwo — por isso não aparece mais
              como abatimento a fazer.
            </p>
          </div>
          <p className="num text-2xl font-semibold text-liquidity">{brlExato(pagos)}</p>
        </div>
        {clientesPagos.length > 0 ? (
          <ul className="mt-4 divide-y divide-border/60">
            {clientesPagos.map((cl) => (
              <li key={cl.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="min-w-0">
                  <span className="block truncate">{cl.name}</span>
                  <span className="block truncate text-[11px] text-muted-foreground">
                    {cl.type}
                    {cl.paymentDate ? ` · pago em ${cl.paymentDate.split("-").reverse().join("/")}` : ""}
                  </span>
                </span>
                <span className="num shrink-0 text-liquidity">
                  {brlExato(liquidoCliente(cl.valor, cl.type))}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">
            Nenhum ritual marcado como Pago ainda.
          </p>
        )}
      </div>



      {/* Degraus da cascata */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            n: "1",
            label: "Munição da Fase 1",
            value: brlExato(c.municao),
            hint: `Já pago ${brl(pagos)} · confirmados ${brl(confirmados)} · interessados ${brl(interessados)}`,
            icon: Crosshair,
            tone: "text-liquidity",
          },
          {
            n: "2",
            label: "Extermínio pré-Dia D",
            value: brlExato(c.municao - c.troco),
            hint: `${c.abates.filter((a) => a.extinto).length}/${c.abates.length} alvos mortos antes do evento`,
            icon: Flame,
            tone: "text-debt",
          },
          {
            n: "3",
            label: "A Bazuca",
            value: brlExato(c.sim.bazuca),
            hint: `Aporte ${brl(c.aporte)} + lastro ${brl(c.lastro)} − consignado ${brl(c.consignado)} + troco ${brl(c.troco)}`,
            icon: Rocket,
            tone: "gold-text",
          },
          {
            n: "4",
            label: "Sobra Livre — início da riqueza",
            value: brlExato(c.sobraLivre),
            hint: `${brl(rendaSobra)}/mês a 0,5% a.m. · ${pctMeta.toFixed(2)}% dos 36M`,
            icon: Sparkles,
            tone: "gold-text",
          },
        ].map((d, i) => (
          <motion.div
            key={d.label}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="glass-card rounded-2xl p-5"
          >
            <div className="flex items-center justify-between">
              <d.icon className={`size-4 ${d.tone}`} />
              <span className="num text-[11px] text-muted-foreground">degrau {d.n}</span>
            </div>
            <p className="mt-3 text-[11px] uppercase tracking-wider text-muted-foreground">
              {d.label}
            </p>
            <p className={`num mt-1 text-xl font-semibold ${d.tone}`}>{d.value}</p>
            <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">{d.hint}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Alvos pré-Dia D */}
        <div className="glass-card rounded-2xl p-5">
          <h2 className="text-base font-semibold">Alvos da Ofensiva (antes do Dia D)</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            A munição dos rituais entra na ordem oficial: Agiota primeiro, Oluwo depois.
          </p>
          <div className="mt-5 space-y-4">
            {c.abates.map((a) => (
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
                  value={a.saldo > 0 ? (a.abatido / a.saldo) * 100 : 100}
                  className={`mt-2 h-2 bg-secondary ${a.extinto ? "[&>div]:bg-liquidity" : ""}`}
                />
              </div>
            ))}
            {c.abates.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Agiota e Oluwo já estão zerados — a Fase 1 cumpriu o papel.
              </p>
            )}
          </div>

          {c.faltaVender > 0 && sugestoes.length > 0 && (
            <div className="mt-5 border-t border-border/60 pt-4">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Para fechar o buraco, escolha um caminho
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {sugestoes.map((s) => (
                  <span
                    key={s.produto}
                    className="rounded-full border border-border bg-secondary/60 px-2.5 py-1 text-[11px] text-muted-foreground"
                  >
                    {s.qtd}x {s.produto}
                  </span>
                ))}
              </div>
              <Link
                to="/entradas"
                className="mt-4 inline-block text-xs text-gold underline underline-offset-4"
              >
                Ir para Entradas e Rituais
              </Link>
            </div>
          )}
        </div>

        {/* Kill List no Dia D */}
        <div className="glass-card rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Kill List no Dia D</h2>
            <Link to="/dia-d" className="text-xs text-gold underline underline-offset-4">
              Simulador completo
            </Link>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            O que a Bazuca — já com o troco da Ofensiva — derruba no evento de liquidez.
          </p>
          <div className="mt-5 space-y-4">
            {c.sim.alvos.map((a) => (
              <div key={a.id}>
                <div className="flex items-center justify-between text-sm">
                  <span className={a.extinto ? "text-liquidity" : ""}>{a.credor}</span>
                  <span className="num text-xs text-muted-foreground">
                    {brl(a.abatido)} de {brl(a.saldo)}
                  </span>
                </div>
                <Progress
                  value={a.saldo > 0 ? (a.abatido / a.saldo) * 100 : 100}
                  className={`mt-2 h-2 bg-secondary ${a.extinto ? "[&>div]:bg-liquidity" : ""}`}
                />
              </div>
            ))}
            {c.sim.alvos.length === 0 && (
              <p className="text-sm text-muted-foreground">Kill List zerada.</p>
            )}
          </div>
          <div className="mt-5 space-y-2 border-t border-border/60 pt-4 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Passivo remanescente</span>
              <span className="num font-semibold text-debt">{brl(c.passivoRestante)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Sobra livre</span>
              <span className="num font-semibold gold-text">{brl(c.sobraLivre)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Renda passiva gerada</span>
              <span className="num font-semibold gold-text">
                {brl(rendaSobra)} de {brl(RENDA_PASSIVA_ALVO)}/mês
              </span>
            </div>
          </div>
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-gold/30 bg-gold/[0.06] p-3 text-[11px] text-muted-foreground">
            <Lock className="mt-0.5 size-3.5 shrink-0 text-gold" />
            Fundo de Reserva de {brl(c.reserva)} segue blindado — não entra em nenhum degrau desta
            cascata.
          </div>
          <div className="mt-3 flex items-start gap-2 rounded-xl border border-border bg-secondary/40 p-3 text-[11px] text-muted-foreground">
            <Target className="mt-0.5 size-3.5 shrink-0 text-gold" />
            A sobra livre é o capital semente dos 36M: {pctMeta.toFixed(2)}% da meta já no dia
            seguinte ao evento.
          </div>
        </div>
      </div>
    </div>
  );
}
