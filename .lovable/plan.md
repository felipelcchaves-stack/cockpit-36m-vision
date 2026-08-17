# Recebimento de ritual: custo, Kill List e CDB

Hoje, quando um cliente vai para "Pago", o app usa o valor **bruto** do tipo de ritual, abate Agiota/Oluwo e joga o troco apenas como uma linha de "Receita" no histórico. Nada entra no saldo do CDB e o custo de operação nunca é descontado.

## Como vai passar a funcionar

Ao mover um card para **Pago**, abre um painel lateral de confirmação do recebimento:

1. **Valor recebido** — já preenchido com o ticket do tipo (ex.: Confirmado R$ 4.500), editável.
2. **Custo da operação** — sugerido a partir do catálogo de rituais (custo por unidade do produto correspondente), editável na hora.
3. **Líquido** — calculado ao vivo: recebido − custo.
4. **Prévia da destinação** — mostra, antes de confirmar, quanto vai matar de Agiota, quanto de Oluwo e quanto sobra para o CDB.

Ao confirmar:

- O líquido segue a Lei da destinação: **Agiota primeiro, depois Oluwo**, na ordem oficial.
- **A sobra entra no saldo do CDB (lastro)** como um depósito real, aparecendo no extrato do lastro como "Entrada · <ritual>" — separado de juro, saque e ajuste.
- O custo de operação vira uma linha de **Despesa** no histórico, para o resultado líquido ficar rastreável.
- Se ainda não houver alvo vivo na Fase 1, 100% do líquido vai direto para o CDB.
- Se um alvo zerar no processo, o banner "Alvo Exterminado" dispara normalmente.

Nada é lançado às escondidas: a tela mostra o resumo do que foi feito ("R$ 4.500 recebidos · R$ 500 de custo · R$ 4.000 → Agiota").

## Onde o CDB entra

O depósito usa a mesma conta do painel de lastro (Conta de Investimento). Se você tiver mais de uma conta que rende, o painel de confirmação traz um seletor de destino com a de investimento pré-selecionada — o Fundo de Reserva continua blindado e fora da lista.

## Detalhes técnicos

- `src/lib/cockpit-queries.ts`: novo `useCreditarAtivo` (espelho de `useDebitarAtivo`, grava linha em `rendimentos` com `origem = "entrada:<motivo>"` e soma no `ativos.valor`).
- `src/lib/financeiro.ts`: `categoriaExtrato` ganha a categoria `entrada`; `resumoRendimento` passa a somar entradas separadamente.
- `src/lib/cockpit-store.tsx`: `destinarReceita` recebe `{ liquido, custo, ativoDestino }`; passa a creditar a sobra no ativo em vez de só criar transação de Receita; grava a despesa do custo.
- `src/routes/entradas.tsx`: botão "Avançar" para Pago abre um `Sheet` de confirmação (valor, custo, destino, prévia da cascata) em vez de disparar direto.
- `src/routes/historico.tsx`: aba Rendimentos passa a colorir "Entrada" em verde, distinta de Rendimento/Saque/Ajuste.
- Sem migração: as colunas necessárias (`custo_operacao`, `rendimentos.origem`) já existem.
