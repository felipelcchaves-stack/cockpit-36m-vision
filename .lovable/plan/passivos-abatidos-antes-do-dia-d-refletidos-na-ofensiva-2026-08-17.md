# Passivos abatidos antes do Dia D refletidos na Ofensiva

Sim, faz total sentido. Hoje a cascata da Ofensiva já lê o saldo atual dos credores (então uma amortização feita na tela de Passivos já muda o resultado do Dia D), mas **isso é invisível na tela**: o bloco "Já capturado" só conta rituais pagos, e não existe nenhum lugar na Ofensiva que mostre a Kill List com saldo original × saldo atual × quanto já morreu.

Resultado prático: você abate o Agiota por fora (parcela, resgate do CDB, dinheiro de outra fonte) e a tela não te dá o crédito visual disso.

## O que será construído

### 1. Novo degrau: "Extermínio já realizado"
Substitui o bloco atual "Já capturado (rituais pagos)" por uma visão completa do que já foi abatido antes do Dia D, vindo de **duas fontes**:
- rituais pagos (como hoje);
- amortizações lançadas no histórico com credor vinculado (qualquer fonte de recurso: caixa, CDB, terceiros).

Mostra o total exterminado, e a lista por origem (nome do ritual ou "Amortização — Agiota, 12/08").

### 2. Kill List ao vivo dentro da Ofensiva
Uma faixa com todos os credores na ordem oficial de extermínio, cada um com:
- saldo original (saldo atual + tudo já amortizado nele);
- quanto já foi abatido, em barra de progresso;
- saldo em aberto hoje;
- selo "ALVO EXTERMINADO" quando zera.

Assim, ao matar qualquer passivo antes do Dia D, ele aparece verde aqui e some da conta da Bazuca no mesmo instante.

### 3. Cascata sensível ao que já morreu
- Agiota/Oluwo já quitados saem do cálculo de "falta vender" — se ambos morrerem, a Fase 1 fecha mesmo sem pipeline, e toda a munição de rituais passa a ser troco somado à Bazuca.
- Passivos pós-Dia D (Leka, Caio, Nubanks, Cartão) abatidos antecipadamente reduzem o alvo da Bazuca e **aumentam a Sobra Livre** — o card de sobra passa a exibir "+ R$ X de ganho por antecipação" comparado ao cenário do dossiê original.

### 4. Indicador de impacto
No topo da Ofensiva, ao lado de "Falta vender": um contador "Passivo já exterminado: R$ X de R$ Y (Z%)", com a variação de Sobra Livre projetada. É o número que responde "como eu estou, de forma atualizada".

### 5. Lançar a amortização manual (você não estava enganado, mas quase)
O lançamento manual **já existe hoje** na tela Passivos: botão "Amortizar / Exterminar", com valor e seletor de origem do dinheiro (CDB/caixa ou fonte externa) — ele baixa o saldo do credor e grava o lançamento no histórico. É essa gravação que a Ofensiva vai passar a ler.

O que falta, e entra no plano: **poder lançar sem sair da Ofensiva**. Cada credor da Kill List na nova faixa ganha o botão "Amortizar", abrindo o mesmo Side Sheet (valor + origem + data do pagamento), com a cascata e a Sobra Livre recalculando na hora após confirmar.



## Detalhes técnicos

- `src/lib/financeiro.ts`: nova função `exterminioRealizado({ passivos, transacoes, clientesPagos })` que reconstrói o saldo original por credor a partir de `transacoes.passivo_id` e devolve abatido/original/restante por alvo; `cascataFase1DiaD` passa a receber esse resumo e a expor `ganhoAntecipacao` (sobra livre atual − sobra do baseline do dossiê).
- `src/lib/cockpit-queries.ts`: hook/seletor de transações agrupadas por `passivo_id` (dados já existem na tabela `transacoes`).
- `src/routes/ofensiva.tsx`: novo bloco Kill List, bloco de extermínio consolidado, contador de impacto no cabeçalho e o Side Sheet de amortização reaproveitado.
- Sheet de amortização extraído de `src/routes/passivos.tsx` para um componente compartilhado (`src/components/amortizar-sheet.tsx`), sem mudar o comportamento atual na tela de Passivos; ganha campo de data do pagamento.
- Sem migração de banco — usa `passivos`, `transacoes` e `crm_clientes` já existentes.
