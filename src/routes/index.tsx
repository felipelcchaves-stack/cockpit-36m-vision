import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  ArrowDownRight,
  ArrowUpRight,
  CreditCard,
  Flame,
  Lock,
  PiggyBank,

  Sparkles,
  Target,
  Wallet,
} from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { brl, useCockpit } from "@/lib/cockpit-store";
import {
  dataBR,
  diasAte,
  isPago,
  potencial,
  progresso,
  realizado,
  sequenciaDisciplina,
  sumPassivos,
  sumPoderDeFogo,
  useAportes,
  useAtivos,
  useCrmReceitas,
  useParametros,
  usePassivos,
  useSalvarAporte,
} from "@/lib/cockpit-queries";
import {
  APORTE_MENSAL,
  FATURA_CARTAO,
  META_PATRIMONIO,
  RENDA_PASSIVA_ALVO,
  alertaCartao,
  cofreBlindado,
  cruzamentoMeta,
  projetar36M,
  rendaPassivaAtual,
} from "@/lib/financeiro";


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
  const { progress, creditors, clients, pipeline } = useCockpit();
  const { data: passivosRows = [], isLoading: loadingPassivos } = usePassivos();
  const { data: ativosRows = [], isLoading: loadingAtivos } = useAtivos();
  const { data: receitas = [] } = useCrmReceitas();
  const { data: parametros } = useParametros();
  const { data: aportes = [] } = useAportes();

  const totalDebt = sumPassivos(passivosRows);
  const liquidity = sumPoderDeFogo(ativosRows);
  const freeSurplus = liquidity - totalDebt;
  const passivosQuitados = passivosRows.filter((p) => isPago(p.status)).length;

  const reserva = cofreBlindado(ativosRows);
  const projecao = projetar36M(Math.max(0, freeSurplus));
  const cruzamento = cruzamentoMeta(projecao);
  const faturaAtual = parametros?.fatura_cartao ?? FATURA_CARTAO;
  const receitaLivreMes = parametros?.receita_livre_mes ?? Math.max(0, freeSurplus);
  const cartao = alertaCartao(faturaAtual, receitaLivreMes);
  const rendaHoje = rendaPassivaAtual(Math.max(0, freeSurplus));
  const pctRenda = Math.min(100, (rendaHoje / RENDA_PASSIVA_ALVO) * 100);

  const competencia = `${new Date().toISOString().slice(0, 7)}-01`;
  const aporteMes = aportes.find((a) => a.competencia === competencia);
  const disciplina = sequenciaDisciplina(aportes);




  const paidCreditors = creditors.filter((c) => c.balance === 0).length;
  const nextTarget = [...creditors].filter((c) => c.balance > 0).sort((a, b) => a.balance - b.balance)[0];
  const ritualsToClear = nextTarget ? Math.max(1, Math.ceil(nextTarget.balance / 30000)) : 0;

  // Fluxo de caixa previsto dos próximos 90 dias (rituais + clientes a receber)
  const entradasPrevistas = [
    ...receitas
      .filter((r) => r.data_pagamento_prevista)
      .map((r) => ({
        label: r.produto,
        data: r.data_pagamento_prevista!,
        valor: potencial(r) - realizado(r),
      })),
    ...clients
      .filter((c) => c.status !== "Pago" && c.ritualDate)
      .map((c) => ({ label: c.name, data: c.ritualDate!, valor: c.valor })),
  ].filter((e) => e.valor > 0);

  const buckets = [0, 1, 2].map((i) => ({
    faixa: i === 0 ? "0-30d" : i === 1 ? "31-60d" : "61-90d",
    valor: entradasPrevistas
      .filter((e) => {
        const d = diasAte(e.data);
        return d !== null && d >= i * 30 && d < (i + 1) * 30;
      })
      .reduce((s, e) => s + e.valor, 0),
  }));

  const atrasados = entradasPrevistas
    .filter((e) => (diasAte(e.data) ?? 0) < 0)
    .sort((a, b) => (diasAte(a.data) ?? 0) - (diasAte(b.data) ?? 0));

  const semData = receitas.filter((r) => !r.data_pagamento_prevista && !r.data_ritual);

  const ranking = [...receitas]
    .map((r) => ({ r, gap: potencial(r) - realizado(r), pct: progresso(r) }))
    .sort((a, b) => b.gap - a.gap)
    .slice(0, 3);

  const cards = [
    {
      label: "Poder de Fogo Atual",
      value: loadingAtivos ? "—" : brl(liquidity),
      hint: "Aporte + Conta de Investimento",
      icon: Wallet,
      tone: "liquidity" as const,
      delta: "dados reais",
    },
    {
      label: "Sobra Livre — Dia D",
      value: loadingAtivos || loadingPassivos ? "—" : brl(freeSurplus),
      hint: "Poder de fogo menos passivos em aberto",
      icon: Sparkles,
      tone: "gold" as const,
      delta: "projetado",
    },
    {
      label: "Total de Passivos",
      value: loadingPassivos ? "—" : brl(totalDebt),
      hint: `${passivosQuitados} passivo(s) quitado(s)`,
      icon: Flame,
      tone: "debt" as const,
      delta: "dados reais",
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

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.16 }}
        className={`rounded-2xl border p-5 ${
          cascata.faltaVender > 0
            ? "border-debt/40 bg-debt/[0.07]"
            : "border-liquidity/40 bg-liquidity/[0.07]"
        }`}
      >
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Falta vender para o Dia D (cenário provável)
            </p>
            <p
              className={`num mt-1 text-2xl font-semibold ${
                cascata.faltaVender > 0 ? "text-debt" : "text-liquidity"
              }`}
            >
              {cascata.faltaVender > 0
                ? brl(cascata.faltaVender)
                : "Agiota e Oluwo cobertos"}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Contando {brl(confirmadosLiquido)} de rituais confirmados no Kanban.
            </p>
          </div>
          <div className="text-right">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Sobra livre projetada no Dia D
            </p>
            <p className="num mt-1 text-2xl font-semibold gold-text">{brl(cascata.sobraLivre)}</p>
            <Link to="/ofensiva" className="text-[11px] text-gold underline underline-offset-4">
              Ver a cascata completa
            </Link>
          </div>
        </div>
      </motion.div>



      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl border border-gold/25 bg-gold/[0.06] p-5"
        >
          <div className="flex items-center gap-2 text-gold">
            <Lock className="size-4" />
            <h2 className="text-sm font-semibold uppercase tracking-wider">
              Cofre — Fundo de Reserva
            </h2>
          </div>
          <p className="num mt-3 text-2xl font-semibold gold-text">{brl(reserva)}</p>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Blindado e intocável. Não entra na Bazuca, não amortiza passivo, não paga Leka.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.24 }}
          className={`rounded-2xl border p-5 ${
            cartao.excede ? "border-debt/40 bg-debt/[0.08]" : "border-border bg-card/40"
          }`}
        >
          <div className={`flex items-center gap-2 ${cartao.excede ? "text-debt" : "text-liquidity"}`}>
            <CreditCard className="size-4" />
            <h2 className="text-sm font-semibold uppercase tracking-wider">Lei do Cartão</h2>
          </div>
          <p className="num mt-3 text-2xl font-semibold">{brl(cartao.faturaProjetada)}</p>
          <p className="mt-2 text-[11px] text-muted-foreground">
            {cartao.excede
              ? `Fatura projetada supera a receita livre (${brl(cartao.receitaLivre)}) em ${brl(cartao.gap)}. Sem caixa para pagar à vista, a compra não é feita — zero rotativo, zero parcelamento.`
              : `Dentro da receita livre do mês (${brl(cartao.receitaLivre)}). Pagamento integral antes do vencimento.`}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.28 }}
          className="rounded-2xl border border-gold/25 bg-card/40 p-5"
        >
          <div className="flex items-center gap-2 text-gold">
            <Target className="size-4" />
            <h2 className="text-sm font-semibold uppercase tracking-wider">Renda Passiva</h2>
          </div>
          <p className="num mt-3 text-2xl font-semibold gold-text">
            {brl(RENDA_PASSIVA_ALVO)}
            <span className="text-sm font-normal text-muted-foreground">/mês alvo</span>
          </p>
          <Progress value={pctRenda} className="mt-3 h-1.5 bg-secondary" />
          <p className="num mt-2 text-[11px] text-muted-foreground">
            Hoje o lastro geraria {brl(rendaHoje)}/mês a 0,5% a.m. ({pctRenda.toFixed(1)}% do alvo).
          </p>
        </motion.div>

        <AporteCard
          competencia={competencia}
          realizado={aporteMes?.realizado ?? 0}
          disciplina={disciplina}
        />
      </div>





      <div className="grid gap-4 lg:grid-cols-3">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.45 }}
          className="glass-card rounded-2xl p-5 lg:col-span-2"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold">Rota até os 36M</h2>
              <p className="text-xs text-muted-foreground">
                Sobra livre reinvestida + aportes de R$ 70.000/mês a 0,9% a.m.
              </p>
            </div>
            <div className="flex gap-4 text-[11px]">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <span className="size-2 rounded-full bg-liquidity" /> Patrimônio
              </span>
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <span className="size-2 rounded-full bg-gold" /> Meta 36M
              </span>
            </div>
          </div>
          <div className="mt-5 h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={projecao} margin={{ left: -12, right: 8, top: 8 }}>
                <defs>
                  <linearGradient id="gLiq" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--liquidity)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="var(--liquidity)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 6" stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="idade"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                  tickFormatter={(v: number) => `${v}a`}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  width={70}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                  tickFormatter={(v: number) => `${Math.round(v / 1_000_000)}M`}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    color: "var(--foreground)",
                    fontSize: 12,
                  }}
                  labelFormatter={(v: number) => `${v} anos`}
                  formatter={(v: number) => brl(v)}
                />
                <Area
                  type="monotone"
                  dataKey="patrimonio"
                  name="Patrimônio"
                  stroke="var(--liquidity)"
                  strokeWidth={2.5}
                  fill="url(#gLiq)"
                />
                <Area
                  type="monotone"
                  dataKey="meta"
                  name="Meta"
                  stroke="var(--gold)"
                  strokeWidth={1.5}
                  strokeDasharray="5 5"
                  fill="none"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">
            {cruzamento
              ? `Cruzamento da meta aos ${cruzamento.idade} anos (${cruzamento.ano}) — renda passiva de ${brl(cruzamento.rendaPassiva)}/mês.`
              : `Neste ritmo você chega a ${brl(projecao[projecao.length - 1]?.patrimonio ?? 0)} aos 66 anos — ${brl(META_PATRIMONIO - (projecao[projecao.length - 1]?.patrimonio ?? 0))} abaixo da meta.`}
          </p>

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
                  Apenas <span className="gold-text font-semibold">{ritualsToClear} {ritualsToClear === 1 ? "ritual" : "rituais"}</span>{" "}
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

      <div className="grid gap-4 lg:grid-cols-3">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-2xl p-5 lg:col-span-2"
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold">Caixa previsto — próximos 90 dias</h2>
              <p className="text-xs text-muted-foreground">
                Rituais com pagamento previsto e clientes ainda não pagos.
              </p>
            </div>
            <p className="num text-lg font-semibold text-liquidity">
              {brl(buckets.reduce((s, b) => s + b.valor, 0))}
            </p>
          </div>
          <div className="mt-4 space-y-4">
            {buckets.map((b) => {
              const max = Math.max(1, ...buckets.map((x) => x.valor));
              return (
                <div key={b.faixa}>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{b.faixa}</span>
                    <span className="num">{brl(b.valor)}</span>
                  </div>
                  <Progress value={(b.valor / max) * 100} className="mt-2 h-2 bg-secondary" />
                </div>
              );
            })}
          </div>

          <h3 className="mt-6 text-sm font-semibold">Onde focar agora</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {ranking.map(({ r, gap, pct }) => (
              <li key={r.id} className="flex items-center justify-between gap-3">
                <span>
                  {r.produto}{" "}
                  <span className="text-[11px] text-muted-foreground">({pct}% da meta)</span>
                </span>
                <span className="num text-gold">{brl(gap)} parados</span>
              </li>
            ))}
            {ranking.length === 0 && (
              <li className="text-xs text-muted-foreground">Cadastre produtos no catálogo.</li>
            )}
          </ul>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-debt/25 bg-debt/[0.06] p-5"
        >
          <h2 className="text-sm font-semibold uppercase tracking-wider text-debt">
            Precisa da sua atenção
          </h2>
          <ul className="mt-4 space-y-3 text-sm">
            {atrasados.slice(0, 4).map((e) => (
              <li key={`${e.label}-${e.data}`} className="flex justify-between gap-3">
                <span>{e.label}</span>
                <span className="num text-debt">
                  {dataBR(e.data)} · {brl(e.valor)}
                </span>
              </li>
            ))}
            {semData.length > 0 && (
              <li className="text-muted-foreground">
                {semData.length} produto(s) sem data de ritual ou pagamento.
              </li>
            )}
            {atrasados.length === 0 && semData.length === 0 && (
              <li className="text-muted-foreground">Tudo em dia. Nenhum atraso previsto.</li>
            )}
          </ul>
        </motion.div>
      </div>
    </div>
  );
}

function AporteCard({
  competencia,
  realizado,
  disciplina,
}: {
  competencia: string;
  realizado: number;
  disciplina: number;
}) {
  const salvar = useSalvarAporte();
  const [valor, setValor] = useState(String(realizado || ""));

  useEffect(() => {
    setValor(String(realizado || ""));
  }, [realizado]);

  const pct = Math.min(100, (realizado / APORTE_MENSAL) * 100);

  const registrar = async () => {
    try {
      await salvar.mutateAsync({
        competencia,
        previsto: APORTE_MENSAL,
        realizado: Number(valor) || 0,
      });
      toast.success("Aporte do mês registrado");
    } catch {
      toast.error("Não foi possível registrar o aporte");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.32 }}
      className="rounded-2xl border border-liquidity/25 bg-card/40 p-5"
    >
      <div className="flex items-center gap-2 text-liquidity">
        <PiggyBank className="size-4" />
        <h2 className="text-sm font-semibold uppercase tracking-wider">Aporte do mês</h2>
      </div>
      <p className="num mt-3 text-2xl font-semibold">
        {brl(realizado)}
        <span className="text-sm font-normal text-muted-foreground">/{brl(APORTE_MENSAL)}</span>
      </p>
      <Progress value={pct} className="mt-3 h-1.5 bg-secondary" />
      <p className="mt-2 text-[11px] text-muted-foreground">
        {disciplina > 0
          ? `${disciplina} ${disciplina === 1 ? "mês" : "meses"} seguidos cumprindo a governança.`
          : "Governança pendente — R$ 70.000 religiosamente, todo mês."}
      </p>
      <div className="mt-3 flex gap-2">
        <Input
          inputMode="numeric"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          placeholder="70000"
          className="h-8 text-xs"
          aria-label="Valor aportado no mês"
        />
        <Button size="sm" className="h-8" onClick={() => void registrar()} disabled={salvar.isPending}>
          Registrar
        </Button>
      </div>
    </motion.div>
  );
}
