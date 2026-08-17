# Lastro que rende sozinho (CDB) + continuidade do dossiê

Hoje o "Conta de Investimento (Lastro)" é um número parado (R$ 432.935,38). Ele precisa crescer todo dia útil, sem depender de novo ritual, e ficar auditável: quanto era, quanto rendeu, quanto é hoje.

## 1. Motor de rendimento diário

Cada ativo passa a ter taxa e data do último fechamento:

- Taxa contratada do CDB, no formato que você recebe do banco (ex.: 110% do CDI) mais o CDI vigente, ou uma taxa fixa ao ano — os dois modos, você escolhe por ativo.
- O sistema converte para taxa diária útil e capitaliza automaticamente uma vez por dia (job no banco, roda de madrugada, só dias úteis).
- Cada capitalização vira uma linha no extrato de rendimento: data, saldo anterior, juros do dia, saldo novo. Nada de valor aparecendo do nada.
- Se o job ficar dias sem rodar, o próximo cálculo recupera todos os dias úteis pendentes de uma vez — sem furo e sem juros dobrados.

## 2. Painel do Lastro (nova seção em Operação Dia D)

- Saldo de hoje, rendeu hoje, rendeu no mês, rendeu desde o início.
- Mini-gráfico da curva do lastro nos últimos 90 dias.
- Botão "Fechar saldo real": você digita o valor exato do extrato do banco e o sistema registra o ajuste (diferença entre o projetado e o real), mantendo o histórico honesto.
- Botão "Render agora" para forçar o cálculo do dia, caso queira ver na hora.

O "Resgate Lastro" da Operação Dia D e o Poder de Fogo do Dashboard passam a usar esse saldo vivo — a Bazuca cresce sozinha conforme o CDB rende.

O Fundo de Reserva (R$ 40.000) continua blindado: rende também, mas segue fora da Bazuca e de qualquer amortização.

## 3. Continuidade do dossiê (o que ainda falta)

- **Extrato de rendimento** ganha aba própria no Histórico de Transações, separado de receita/amortização, para não poluir o fluxo operacional.
- **Projeção dos 36M** passa a partir do patrimônio real com juros, não de um valor fixo: 0,9% de juros reais ao mês + aporte de R$ 70k, até os 66 anos.
- **Renda passiva** recalculada diariamente sobre o lastro real (0,5% a.m.), com a barra do alvo de R$ 180k/mês reagindo ao crescimento.
- **Sala de Comando (CFO)** recebe no contexto o rendimento do mês e a curva do lastro, para responder coisas como "quanto o CDB me deu esse mês" e "o rendimento cobre a fatura do cartão?".

## Detalhes técnicos

- Migração: colunas em `ativos` (`rende` boolean, `modo_taxa` fixa/cdi, `taxa_aa`, `pct_cdi`, `cdi_aa`, `ultimo_fechamento` date); nova tabela `rendimentos` (ativo_id, data, saldo_anterior, juros, saldo_final, origem: automático/ajuste manual) com RLS e GRANTs; RLS de `ativos` liberada para UPDATE.
- Função SQL `public.render_ativos()` que capitaliza dia útil a dia útil desde `ultimo_fechamento` até hoje, gravando em `rendimentos` e atualizando `ativos.valor`. Idempotente por (ativo, data).
- `pg_cron` diário às 06:00 UTC chamando a função — tarefa 100% SQL, sem endpoint externo.
- Front: hooks `useRendimentos`, `useRenderAgora`, `useAjustarSaldoAtivo` em `cockpit-queries.ts`; helpers de taxa (`diariaDeAnual`, `rendeuNoMes`) em `financeiro.ts`; painel novo em `dia-d.tsx`, aba nova em `historico.tsx`, ajustes em `index.tsx` e `cfo.functions.ts`.
