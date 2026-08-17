import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { motion } from "motion/react";
import { Bot, Send, User } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { APORTE_PREVISTO, brl, useCockpit } from "@/lib/cockpit-store";

export const Route = createFileRoute("/comando")({
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
  "Como alocar o aporte do Dia D?",
  "Qual passivo devo atacar primeiro?",
  "Recalcule minha rota para os 36M",
  "Quantos rituais faltam este mês?",
];

function Comando() {
  const { liquidity, totalDebt, creditors, pipeline, freeSurplus, progress } = useCockpit();
  const [messages, setMessages] = useState<Msg[]>([
    {
      id: 1,
      role: "cfo",
      text: "Bom dia, Comandante. Estou com todos os seus números carregados. Pergunte sobre alocação, amortização ou recálculo de rota.",
    },
  ]);
  const [input, setInput] = useState("");
  const idRef = useRef(2);

  const answer = (q: string) => {
    const lower = q.toLowerCase();
    const alvos = [...creditors].filter((c) => c.balance > 0).sort((a, b) => b.balance - a.balance);
    const maior = alvos[0];
    const menor = alvos[alvos.length - 1];

    if (lower.includes("alocar") || lower.includes("aporte")) {
      return `Com ${brl(APORTE_PREVISTO)} de aporte e ${brl(liquidity)} de liquidez, minha recomendação: 60% (${brl(APORTE_PREVISTO * 0.6)}) para abater ${maior?.name ?? "o maior passivo"}, 25% (${brl(APORTE_PREVISTO * 0.25)}) em reserva de liquidez operacional e 15% (${brl(APORTE_PREVISTO * 0.15)}) no primeiro bloco de renda fixa — o embrião dos 36M.`;
    }
    if (lower.includes("passivo") || lower.includes("dívida") || lower.includes("primeiro")) {
      return `Ataque ${menor?.name ?? "o menor saldo"} (${brl(menor?.balance ?? 0)}) para gerar vitória psicológica rápida, e em paralelo negocie ${maior?.name ?? ""} (${brl(maior?.balance ?? 0)}), que concentra o maior custo. Passivo total hoje: ${brl(totalDebt)}.`;
    }
    if (lower.includes("recalcul") || lower.includes("rota") || lower.includes("36m")) {
      return `Você está em ${progress.toFixed(2)}% da meta de 36M. Sobra livre projetada: ${brl(freeSurplus)}. Mantendo o ritmo atual de captação e reinvestindo 70% da sobra, a rota se sustenta — o gargalo não é receita, é a velocidade de extinção dos passivos.`;
    }
    if (lower.includes("ritual") || lower.includes("cliente") || lower.includes("receita")) {
      return `Seu pipeline não pago vale ${brl(pipeline)}. Convertendo 60% dele você cobre ${(((pipeline * 0.6) / (totalDebt || 1)) * 100).toFixed(1)}% do passivo restante. Priorize os Oye 30k: melhor retorno por hora de operação.`;
    }
    return `Analisando: liquidez ${brl(liquidity)}, passivos ${brl(totalDebt)}, pipeline ${brl(pipeline)}. Em resumo — não aumente estrutura antes de zerar ${menor?.name ?? "os passivos menores"}. Disciplina agora, escala depois.`;
  };

  const send = (text?: string) => {
    const q = (text ?? input).trim();
    if (!q) return;
    const userMsg: Msg = { id: idRef.current++, role: "user", text: q };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setTimeout(() => {
      setMessages((m) => [...m, { id: idRef.current++, role: "cfo", text: answer(q) }]);
    }, 450);
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
        </div>

        <div className="border-t border-border/60 p-4">
          <div className="mb-3 flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <Button key={s} size="sm" variant="secondary" className="text-[11px]" onClick={() => send(s)}>
                {s}
              </Button>
            ))}
          </div>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Pergunte ao CFO Virtual..."
            />
            <Button type="submit" size="icon">
              <Send className="size-4" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
