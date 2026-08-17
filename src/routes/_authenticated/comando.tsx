import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { motion } from "motion/react";
import { Bot, Loader2, Send, User } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { brl, useCockpit } from "@/lib/cockpit-store";
import { perguntarCfo } from "@/lib/cfo.functions";
import { killList, sumPassivos, useAtivos, usePassivos, useRendimentos } from "@/lib/cockpit-queries";
import {
  APORTE_DIA_D,
  LASTRO_INVESTIMENTO,
  QUITACAO_CONSIGNADO,
  jurosDoDia,
  resumoRendimento,
  taxaAnualAtivo,
} from "@/lib/financeiro";

export const Route = createFileRoute("/_authenticated/comando")({
  head: () => ({
    meta: [
      { title: "Sala de Comando | Cockpit 36M" },
      {
        name: "description",
        content: "Converse com o CFO Virtual para alocação de capital e recálculo de rota.",
      },
      { property: "og:title", content: "Sala de Comando | Cockpit 36M" },
      { property: "og:description", content: "Seu CFO virtual, disponível 24/7." },
    ],
  }),
  component: Comando,
});

type Msg = { id: number; role: "user" | "cfo"; text: string };

const suggestions = [
  "Como alocar a Bazuca no Dia D?",
  "Qual passivo devo atacar primeiro?",
  "Recalcule minha rota para os 36M",
  "Quantos rituais faltam este mês?",
];

function Comando() {
  const { liquidity, pipeline, freeSurplus, progress, clients } = useCockpit();
  const { data: passivos = [] } = usePassivos();
  const enviar = useServerFn(perguntarCfo);

  const [messages, setMessages] = useState<Msg[]>([
    {
      id: 1,
      role: "cfo",
      text: "Bom dia, Comandante. Estou com todos os seus números carregados. Pergunte sobre alocação, amortização ou recálculo de rota.",
    },
  ]);
  const [input, setInput] = useState("");
  const [pensando, setPensando] = useState(false);
  const idRef = useRef(2);

  const totalDebt = sumPassivos(passivos);
  const alvos = killList(passivos).filter((p) => p.saldo_devedor > 0);

  const { data: ativosCtx = [] } = useAtivos();
  const { data: rendimentosCtx = [] } = useRendimentos();
  const lastro = ativosCtx.find((a) => `${a.nome} ${a.tipo ?? ""}`.toLowerCase().includes("investimento"));
  const resumoRend = resumoRendimento(rendimentosCtx, lastro?.id);

  const contexto = [
    `Poder de fogo: ${brl(liquidity)}`,
    `Passivo total em aberto: ${brl(totalDebt)}`,
    `Sobra livre projetada: ${brl(freeSurplus)}`,
    `Pipeline não pago: ${brl(pipeline)}`,
    `Progresso rumo aos 36M: ${progress.toFixed(2)}%`,
    `Clientes no CRM: ${clients.length}`,
    `Dia D — aporte ${brl(APORTE_DIA_D)}, consignado ${brl(QUITACAO_CONSIGNADO)}, lastro ${brl(LASTRO_INVESTIMENTO)}`,
    ...(lastro
      ? [
          `Lastro em CDB (${lastro.nome}): saldo ${brl(lastro.valor)}, taxa ${taxaAnualAtivo(lastro).toFixed(2)}% a.a., rende ~${brl(jurosDoDia(lastro))} por dia útil`,
          `Rendimento do lastro: hoje ${brl(resumoRend.hoje)}, no mês ${brl(resumoRend.mes)}, acumulado ${brl(resumoRend.total)}`,
        ]
      : []),
    "Kill List (ordem oficial, saldo atual):",
    ...alvos.map((a, i) => `${i + 1}. ${a.credor} — ${brl(a.saldo_devedor)} (${a.fase_quitacao ?? "sem fase"})`),
  ].join("\n");

  const send = async (text?: string) => {
    const q = (text ?? input).trim();
    if (!q || pensando) return;
    const historico = messages
      .slice(-8)
      .map((m) => ({ role: m.role === "cfo" ? ("assistant" as const) : ("user" as const), content: m.text }));

    setMessages((m) => [...m, { id: idRef.current++, role: "user", text: q }]);
    setInput("");
    setPensando(true);
    try {
      const res = await enviar({ data: { pergunta: q, contexto, historico } });
      setMessages((m) => [...m, { id: idRef.current++, role: "cfo", text: res.texto }]);
    } catch {
      setMessages((m) => [
        ...m,
        {
          id: idRef.current++,
          role: "cfo",
          text: `Perdi o link com a central de inteligência. Enquanto isso, o número que importa: ${brl(totalDebt)} de passivo vivo e ${alvos[0]?.credor ?? "nenhum alvo"} no topo da Kill List.`,
        },
      ]);
    } finally {
      setPensando(false);
    }
  };


  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col gap-5 p-4 sm:p-6 lg:p-8">
      <PageHeader
        eyebrow="IA"
        title="Sala de Comando"
        description="Seu CFO Virtual analisa os dados vivos do cockpit antes de responder."
      />

      <div className="glass-card flex min-h-0 flex-1 flex-col rounded-2xl">
        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          {messages.map((m) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-3 ${m.role === "user" ? "justify-end" : ""}`}
            >
              {m.role === "cfo" && (
                <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl bg-gold/15 text-gold">
                  <Bot className="size-4" />
                </span>
              )}
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  m.role === "user"
                    ? "bg-secondary text-secondary-foreground"
                    : "border border-gold/20 bg-gold/[0.05]"
                }`}
              >
                {m.text}
              </div>
              {m.role === "user" && (
                <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl bg-secondary">
                  <User className="size-4" />
                </span>
              )}
            </motion.div>
          ))}
          {pensando && (
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-gold/15 text-gold">
                <Bot className="size-4" />
              </span>
              <span className="flex items-center gap-2">
                <Loader2 className="size-3.5 animate-spin" /> Rodando os números...
              </span>
            </div>
          )}
        </div>

        <div className="border-t border-border/60 p-4">
          <div className="mb-3 flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <Button
                key={s}
                size="sm"
                variant="secondary"
                className="text-[11px]"
                disabled={pensando}
                onClick={() => void send(s)}
              >
                {s}
              </Button>
            ))}
          </div>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void send();
            }}
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Pergunte ao CFO Virtual..."
            />
            <Button type="submit" size="icon" disabled={pensando}>
              <Send className="size-4" />
            </Button>
          </form>

        </div>
      </div>
    </div>
  );
}
