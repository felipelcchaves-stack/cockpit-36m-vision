import { createFileRoute } from "@tanstack/react-router";
import { motion } from "motion/react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowDownRight, ArrowUpRight, Flame, Sparkles, Target, Wallet } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { APORTE_PREVISTO, brl, useCockpit } from "@/lib/cockpit-store";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard | Cockpit 36M" },
      {
        name: "description",
        content:
          "Visão de águia da sua liquidez, passivos e progresso rumo ao patrimônio de 36 milhões.",
      },
      { property: "og:title", content: "Dashboard | Cockpit 36M" },
      {
        property: "og:description",
        content: "Liquidez, passivos e projeção de patrimônio em um só painel.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { liquidity, totalDebt, freeSurplus, progress, creditors, clients, pipeline } =
    useCockpit();

  const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago"];
  const chartData = months.map((m, i) => ({
    mes: m,
    liquidez: Math.round(liquidity * (0.42 + i * 0.083)),
    passivos: Math.round(totalDebt * (1.35 - i * 0.05)),
  }));

  const paidCreditors = creditors.filter((c) => c.balance === 0).length;
  const nextTarget = [...creditors].filter((c) => c.balance > 0).sort((a, b) => a.balance - b.balance)[0];
  const ritualsToClear = nextTarget ? Math.max(1, Math.ceil(nextTarget.balance / 30000)) : 0;

  const cards = [
    {
      label: "Poder de Fogo Atual",
      value: brl(liquidity),
      hint: "Liquidez disponível em banco",
      icon: Wallet,
      tone: "liquidity" as const,
      delta: "+12,4%",
    },
    {
      label: "Sobra Livre — Dia D",
      value: brl(freeSurplus),
      hint: `Com aporte de ${brl(APORTE_PREVISTO)}`,
      icon: Sparkles,
      tone: "gold" as const,
      delta: "projetado",
    },
    {
      label: "Total de Passivos",
      value: brl(totalDebt),
      hint: `${paidCreditors} credor(es) extinto(s)`,
      icon: Flame,
      tone: "debt" as const,
      delta: "-8,1%",
    },
    {
      label: "Progresso Rumo aos 36M",
      value: `${progress.toFixed(2)}%`,
      hint: "Meta de patrimônio consolidado",
      icon: Target,
      tone: "gold" as const,
      progress,
    },
  ];

  const toneClass = {
    liquidity: "text-liquidity bg-liquidity/10",
    debt: "text-debt bg-debt/10",
    gold: "text-gold bg-gold/10",
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <PageHeader
        eyebrow="Visão de Águia"
        title="Bom dia, Comandante."
        description="Seu ritual matinal de poder e controle. Aqui está o estado real do império hoje."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07, duration: 0.4 }}
            className="glass-card rounded-2xl p-5"
          >
            <div className="flex items-start justify-between">
              <span className={`rounded-xl p-2 ${toneClass[card.tone]}`}>
                <card.icon className="size-4" />
              </span>
              {card.delta && (
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  {card.tone === "debt" ? (
                    <ArrowDownRight className="size-3 text-liquidity" />
                  ) : (
                    <ArrowUpRight className="size-3 text-liquidity" />
                  )}
                  {card.delta}
                </span>
              )}
            </div>
            <p className="mt-4 text-xs uppercase tracking-wider text-muted-foreground">
              {card.label}
            </p>
            <p className="num mt-1 text-2xl font-semibold">{card.value}</p>
            {card.progress !== undefined ? (
              <Progress value={Math.min(100, card.progress)} className="mt-3 h-1.5 bg-secondary" />
            ) : null}
            <p className="mt-2 text-[11px] text-muted-foreground">{card.hint}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.45 }}
          className="glass-card rounded-2xl p-5 lg:col-span-2"
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold">Queima de dívida x Liquidez</h2>
              <p className="text-xs text-muted-foreground">Projeção dos últimos 8 ciclos</p>
            </div>
            <div className="flex gap-4 text-[11px]">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <span className="size-2 rounded-full bg-liquidity" /> Liquidez
              </span>
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <span className="size-2 rounded-full bg-debt" /> Passivos
              </span>
            </div>
          </div>
          <div className="mt-5 h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ left: -12, right: 8, top: 8 }}>
                <defs>
                  <linearGradient id="gLiq" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--liquidity)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="var(--liquidity)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gDebt" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--debt)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="var(--debt)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 6" stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="mes"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  width={70}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                  tickFormatter={(v: number) => `${Math.round(v / 1000)}k`}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    color: "var(--foreground)",
                    fontSize: 12,
                  }}
                  formatter={(v: number) => brl(v)}
                />
                <Area
                  type="monotone"
                  dataKey="liquidez"
                  stroke="var(--liquidity)"
                  strokeWidth={2.5}
                  fill="url(#gLiq)"
                />
                <Area
                  type="monotone"
                  dataKey="passivos"
                  stroke="var(--debt)"
                  strokeWidth={2.5}
                  fill="url(#gDebt)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.32, duration: 0.45 }}
          className="space-y-4"
        >
          <div className="rounded-2xl border border-gold/25 bg-gold/[0.06] p-5">
            <div className="flex items-center gap-2 text-gold">
              <Sparkles className="size-4" />
              <h2 className="text-sm font-semibold uppercase tracking-wider">Insights do CFO</h2>
            </div>
            <ul className="mt-4 space-y-3 text-sm leading-relaxed">
              {nextTarget && (
                <li>
                  Apenas <span className="gold-text font-semibold">{ritualsToClear} rituais</span>{" "}
                  faltam para extinguir o passivo do{" "}
                  <span className="font-semibold">{nextTarget.name}</span>.
                </li>
              )}
              <li>
                O pipeline não pago soma{" "}
                <span className="text-liquidity font-semibold">{brl(pipeline)}</span> — converter
                metade já muda o Dia D.
              </li>
              <li>
                Você já eliminou <span className="font-semibold">{paidCreditors}</span> credor(es).
                Cada quitação libera fôlego mensal permanente.
              </li>
            </ul>
          </div>

          <div className="glass-card rounded-2xl p-5">
            <h3 className="text-sm font-semibold">Alvos mais próximos</h3>
            <div className="mt-4 space-y-4">
              {[...creditors]
                .filter((c) => c.balance > 0)
                .sort((a, b) => a.balance - b.balance)
                .slice(0, 4)
                .map((c) => {
                  const pct = ((c.original - c.balance) / c.original) * 100;
                  return (
                    <div key={c.id}>
                      <div className="flex justify-between text-xs">
                        <span>{c.name}</span>
                        <span className="num text-muted-foreground">{brl(c.balance)}</span>
                      </div>
                      <Progress value={pct} className="mt-2 h-1.5 bg-secondary" />
                    </div>
                  );
                })}
            </div>
          </div>

          <div className="glass-card rounded-2xl p-5">
            <h3 className="text-sm font-semibold">Rituais do ciclo</h3>
            <p className="num mt-1 text-2xl font-semibold text-liquidity">
              {clients.filter((c) => c.status === "Pago").length}
              <span className="text-sm text-muted-foreground">/{clients.length} pagos</span>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
