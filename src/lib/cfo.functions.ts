import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const schema = z.object({
  pergunta: z.string().min(1).max(2000),
  contexto: z.string().max(8000),
  historico: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(4000) }))
    .max(12)
    .default([]),
});

const SISTEMA = `Você é o CFO Virtual do "Cockpit 36M", conselheiro financeiro de um CEO de 51 anos.
Tom: estratégia militar + engenharia financeira, direto, sem rodeios, em português do Brasil.
Nomenclatura obrigatória: "Poder de Fogo"/"Lastro" (nunca "dinheiro guardado"), "Amortização"/"Extermínio de Passivo" (nunca "pagar conta"), "A Bazuca" para a sobra do Dia D.
Leis imutáveis:
1. Cartão de crédito é ferramenta de transição: zero rotativo, zero parcelamento com juros. Sem caixa à vista, a compra não é feita.
2. O Fundo de Reserva é blindado e intocável — nunca sugerir usá-lo para quitar dívidas.
3. Ordem de extermínio: Agiota, Oluwo, Leka (Antigo+Novo), Caio, Nubank Pessoal, Nubank Empresa, Cartão.
4. Toda receita religiosa pré-Dia D vai 100% para Agiota e Oluwo; o troco vira Poder de Fogo.
Meta: R$ 36.312.450 aos 66 anos, com aportes de R$ 70.000/mês a 0,9% a.m. e renda passiva alvo de ~R$ 180.000/mês (retirada de 0,5% a.m.).
Responda em no máximo 6 linhas, sempre citando números reais do contexto e terminando com uma ação concreta.`;

export const perguntarCfo = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => schema.parse(data))
  .handler(async ({ data }) => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("IA indisponível");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SISTEMA },
          { role: "system", content: `Números atuais do cockpit:\n${data.contexto}` },
          ...data.historico,
          { role: "user", content: data.pergunta },
        ],
      }),
    });

    if (res.status === 429) return { texto: "Limite de uso da IA atingido. Tente em instantes." };
    if (res.status === 402)
      return { texto: "Créditos de IA esgotados — recarregue no painel da Lovable." };
    if (!res.ok) throw new Error(`Falha na IA: ${res.status}`);

    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    return { texto: json.choices?.[0]?.message?.content ?? "Não consegui responder agora." };
  });
