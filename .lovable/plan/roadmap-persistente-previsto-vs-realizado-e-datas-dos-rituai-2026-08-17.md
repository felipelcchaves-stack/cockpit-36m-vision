# Roadmap persistente, Previsto vs Realizado e datas dos rituais

## Situação atual (verificada)

- O check do Roadmap **não** é salvo no banco. As 5 fases e suas tarefas vivem apenas em estado local do app (`initialPhases` + `useState`), então tudo volta ao original ao recarregar a página.
- `crm_receitas` (catálogo de rituais) tem apenas produto, ticket médio, meta, realizado e status — **sem nenhuma data**.
- `crm_clientes` (Kanban) tem nome, tipo, status, valor e nota — também sem data de ritual ou de pagamento.

## 1. Salvar o Roadmap no banco

- Novas tabelas: `roadmap_fases` (título, subtítulo, ordem, meta de conclusão) e `roadmap_tarefas` (fase, descrição, ordem, concluída, data de conclusão, valor previsto, valor realizado).
- As 5 fases e tarefas atuais são migradas para o banco exatamente como estão hoje, preservando o que já existe na tela.
- Marcar/desmarcar grava na hora e registra a data em que foi concluída.
- Poder editar o texto da tarefa, adicionar nova tarefa e remover tarefa dentro de cada fase.

## 2. Previsto vs Realizado no Roadmap

- Cada tarefa passa a ter um **valor previsto** (quanto aquela etapa deve gerar ou quitar) e um **valor realizado**.
- Por fase: barra dupla mostrando % de tarefas concluídas e % financeiro (realizado / previsto), com os dois números em R$.
- No topo da página: cartão "Previsto vs Realizado" com total previsto, total realizado, desvio em R$ e em %, e um gráfico de barras comparando as 5 fases.

## 3. Datas nos rituais

No catálogo de receitas (`crm_receitas`), cada produto ganha:
- **Data do ritual** (quando acontece) e **data de pagamento prevista**.
- Contagem regressiva na linha ("faltam 12 dias", "atrasado há 3 dias") com cor de alerta.

No Kanban de clientes (`crm_clientes`), cada card ganha:
- **Data do ritual** e **data de pagamento** (esta preenchida quando o card vai para "Pago").
- Ordenação e alerta de vencimento: cards com pagamento previsto vencido ficam destacados.

## 4. Ideias extras para decisão (o "surpreenda-me")

- **Fluxo de caixa dos próximos 90 dias**: linha do tempo somando pagamentos previstos dos rituais e clientes contra as parcelas de passivos — mostra em qual semana o caixa aperta.
- **Velocidade da meta**: com base no realizado acumulado por mês, uma projeção de "nesse ritmo você bate a meta em X" e quanto falta por mês para bater no prazo.
- **Ranking de produtos**: quais rituais mais convertem (realizado/meta) e qual tem maior potencial parado — ajuda a escolher onde focar a próxima campanha.
- **Alertas no Dashboard**: bloco "Precisa da sua atenção" com pagamentos atrasados, rituais sem data, metas com progresso abaixo do esperado para o mês.
- **Sala de Comando conectada**: o CFO Virtual passa a responder usando esses novos números (previsto vs realizado, atrasos, projeção).

Se preferir enxugar, posso entregar em duas ondas: primeiro roadmap no banco + previsto/realizado + datas; depois os insights (itens da seção 4).

## Detalhes técnicos

- Migração criando `roadmap_fases` e `roadmap_tarefas` com GRANTs e políticas públicas (mesmo padrão de `crm_clientes`), mais `INSERT`s literais com as 5 fases e tarefas atuais; `ALTER TABLE crm_receitas ADD COLUMN data_ritual date, data_pagamento_prevista date`; `ALTER TABLE crm_clientes ADD COLUMN data_ritual date, data_pagamento date`.
- `src/lib/cockpit-queries.ts`: hooks `useRoadmap`, `useToggleTarefa`, `useSalvarTarefa`, `useRemoverTarefa`, agregadores `previstoFase`/`realizadoFase`, e inclusão das novas datas nos tipos/selects e mutations existentes.
- `src/lib/cockpit-store.tsx`: remover `initialPhases` e `toggleTask` locais, passando a ler do banco (mesmo caminho já usado para clientes).
- `src/routes/roadmap.tsx`: barras duplas por fase, cartão de resumo e `BarChart` (Recharts) Previsto x Realizado.
- `src/routes/entradas.tsx`: campos de data no sheet do catálogo e no sheet do cliente, badges de prazo/atraso.
- `src/routes/index.tsx`: bloco de alertas e projeção de caixa 90 dias.
- Tudo mantendo o dark premium com tokens do tema (dourado = meta/previsto, verde = realizado, vermelho = atraso).
