# Melhorias sugeridas — alinhar o Cockpit ao Dossiê 36M

Levantei o que já está pronto e onde o app ainda foge das Leis do CFO. Hoje o banco tem os passivos reais (Agiota 172.500, Oluwo 180.000, Consignados 492.718,91, Leka Antigo/Novo, Caio, Nubanks, Cartões), os ativos do Dia D (Aporte 700.000, Lastro 432.935,38, Fundo de Reserva 40.000) e o catálogo de rituais. Mas partes da tela ainda leem dados fictícios do código.

## Prioridade 1 — corrigir o que hoje mostra número errado

1. **Credores fictícios no Dashboard, Histórico e Sala de Comando.** O bloco "Alvos mais próximos", o CFO Virtual e o histórico ainda usam uma lista embutida no código (Agiota como "Extinto", Nubank 18.700, Cartões 52.300). Passar tudo a ler a tabela real de passivos, com a liquidez calculada a partir dos ativos + rituais pagos, em vez do valor fixo de 432.935 escrito no código.
2. **Histórico de transações não é salvo.** Criar tabela de transações (data, descrição, tipo Receita/Despesa/Amortização, valor, passivo vinculado) para que amortizações e receitas fiquem gravadas e alimentem a liquidez.
3. **Fundo de Reserva blindado.** Hoje ele só não entra no Poder de Fogo. Criar um "Cofre" visualmente isolado no Dashboard, em dourado, marcado como intocável, fora de qualquer cálculo de quitação.

## Prioridade 2 — o que falta do Dossiê

4. **Simulador do Dia D** (nova página ou bloco central): Aporte 700.000 − Consignados 492.718,91 + Lastro 432.935,38 = **A Bazuca**, com a sequência de extermínio aplicada em cascata sobre a Kill List e o saldo restante mostrado ao vivo. Slider para testar "e se o aporte atrasar / vier menor".
5. **Kill List na ordem oficial.** A página de Passivos passa a ordenar pela ordem de extermínio do dossiê (Agiota → Oluwo → Leka → Caio → Nubank Pessoal → Nubank Empresa → Cartão), não por saldo, com selo de fase (Pré-Dia D / Dia D / Bazuca).
6. **Lei do Cartão de Crédito.** Alerta vermelho no Dashboard quando a fatura projetada passar da receita livre do mês, e regra explícita "zero rotativo" no card de Cartões.
7. **Regra de destinação da receita religiosa.** Todo ritual marcado como Pago abate automaticamente Agiota e Oluwo (nessa ordem) antes do Dia D; o troco vira Poder de Fogo. Hoje o valor só soma na liquidez.
8. **Projeção real dos 36M.** Substituir o gráfico de 8 ciclos fictícios por uma projeção de 15 anos (51 → 66 anos) com aporte de 70.000/mês a 0,9% a.m., mostrando o cruzamento com os 36.312.450 e a renda passiva de ~180.000/mês (0,5% a.m.).
9. **Gamificação "Alvo Exterminado".** Confete + banner ao zerar um credor, e a barra de "vida" da dívida caindo a zero.

## Prioridade 3 — inteligência de decisão

10. **CFO Virtual com IA real** (via Lovable AI), recebendo os números do banco como contexto, no lugar das respostas por palavra-chave de hoje.
11. **Velocidade da meta:** quantos rituais/mês faltam para o Dia D no prazo, e qual data projetada de passivo zero no ritmo atual.

## Detalhes técnicos

- Migração: tabela `transacoes` (com GRANTs e políticas no mesmo padrão das demais) e coluna de ordem de extermínio em `passivos`.
- `src/lib/cockpit-store.tsx`: remover `initialCreditors`, `initialTx` e `BASE_LIQUIDITY`; derivar credores, liquidez e histórico das queries de `passivos`, `ativos` e `transacoes`.
- Simulador do Dia D como rota nova `/dia-d`, com cálculo puro em `src/lib/dia-d.ts`.
- Projeção 36M e cálculos de renda passiva em helper próprio, consumidos pelo Recharts do Dashboard.
- CFO com IA: `createServerFn` chamando o gateway Lovable AI com um resumo dos números atuais.

## Como quer avançar?

Posso fazer tudo em sequência, mas sugiro começar pelos itens 1–5 (números reais + Dia D + Kill List), que é o que muda decisão no dia a dia. Diga se prefere outra ordem ou quer cortar algum item.
