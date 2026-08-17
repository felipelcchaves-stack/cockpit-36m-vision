# Pendências do Cockpit 36M vs. o Dossiê

Fiz uma varredura do app e do banco. O que o dossiê manda já está no ar quase todo: Kill List na ordem correta (Agiota → Oluwo → Leka → Caio → Nubanks → Cartão → Consignados), Dia D com Bazuca, Cofre de R$ 40.000 blindado, projeção até os R$ 36.312.450 aos 66 anos, CRM com metas e datas, Roadmap previsto vs realizado, Sala de Comando com IA, nomenclatura e gamificação.

Abaixo o que ainda falta para o app cobrir 100% do dossiê.

## 1. Custo de operação dos "Confirmados" (líquido real)
O dossiê diz: 20 x R$ 4.500 = R$ 90.000 bruto, com R$ 10.000 de custo de operação = R$ 80.000 líquido. Hoje o CRM só calcula bruto.
- Campo de custo por campanha no catálogo de receitas.
- Todos os cálculos de "quanto falta para matar Agiota + Oluwo" passam a usar o líquido.

## 2. Governança do aporte de R$ 70.000/mês
Hoje os R$ 70k só existem como premissa do gráfico. Falta o controle real.
- Registro mensal do aporte feito (previsto R$ 70k vs. realizado).
- Sequência de meses cumpridos ("disciplina"), e o impacto no ano de chegada aos 36M quando um mês falha.

## 3. Fluxo de caixa mensal — Fases 4 e 5
O dossiê tem números que o app ainda ignora: obra R$ 22k/mês, aluguel Potiguara R$ 10k/mês, destrave de R$ 32k/mês na virada de chave, faturamento base R$ 67,5k/mês.
- Painel "Ponte de 90 dias": entradas x saídas mês a mês, com fim da obra e devolução da Potiguara como marcos.
- Simulador da Virada de Chave: efeito de largar o emprego formal sobre o caixa livre e sobre a data dos 36M.

## 4. Lei do Cartão com fatura viva
Hoje o alerta usa a fatura fixa de R$ 25.000 do dossiê.
- Fatura do mês corrente editável/registrável.
- Alerta vermelho quando a fatura projetada passar da receita livre do mês, e aviso explícito de "compra não autorizada" quando não há caixa para pagar à vista.

## 5. Renda passiva alvo
Mostrar no Dashboard o alvo de ~R$ 180.000/mês (0,5% a.m. sobre o patrimônio) e quanto o patrimônio atual já geraria hoje — é o número que traduz a meta em liberdade.

## 6. Fase 1 com placar de fechamento
Um medidor único: R$ 352.500 (Agiota + Oluwo) menos o líquido já pago pelos rituais = quanto ainda falta vender antes do Dia D, com quantos rituais de cada produto isso significa.

## Detalhes técnicos
- Novas colunas: `crm_receitas.custo_operacao`; nova tabela `aportes_mensais` (mês, previsto, realizado); nova tabela `parametros_mensais` (obra, aluguel Potiguara, faturamento base, fatura do cartão) — todas com GRANTs e RLS no mesmo padrão das atuais.
- Lógica nova concentrada em `src/lib/financeiro.ts` (líquido de campanha, fluxo mensal por fase, renda passiva) e hooks em `src/lib/cockpit-queries.ts`.
- Novas telas/seções: bloco "Ponte de 90 dias" e "Virada de Chave" no Roadmap; cards de renda passiva e aporte no Dashboard; placar da Fase 1 em Entradas/Rituais.
- Contexto da IA da Sala de Comando passa a incluir aporte, fluxo mensal e fatura do cartão.

## Ordem sugerida
1. Custo de operação + placar da Fase 1 (afeta decisão hoje)
2. Lei do Cartão viva + renda passiva no Dashboard
3. Governança do aporte de R$ 70k
4. Ponte de 90 dias e Virada de Chave
