# Da Ofensiva ao Dia D — uma tela que liga tudo

Hoje a informação existe, mas quebrada em dois lugares:

- Em **Entradas e Rituais** existe o "Placar da Fase 1", que compara Agiota + Oluwo com o líquido já capturado — mas ele só conta o realizado do Catálogo de Receitas; o pipeline do Kanban (clientes Interessado/Confirmado) não entra.
- Em **Operação Dia D** existe a Bazuca e a cascata de extermínio — mas ela parte do aporte do banco, sem mostrar o efeito das vendas de ritual antes do evento.

Falta a leitura que você quer: **quanto de ritual ainda falta vender para matar Agiota e Oluwo, e quanto sobra de fato no Dia D para começar a riqueza.**

## O que será criado

Uma nova página na sidebar: **Ofensiva → Dia D** (rota `/ofensiva`), com uma cascata única em quatro degraus:

1. **Munição da Fase 1** — líquido já recebido (rituais pagos) + pipeline líquido (Kanban Confirmado, e Interessado como cenário otimista), com custo de operação já descontado.
2. **Extermínio pré-Dia D** — quanto disso mata Agiota, quanto mata Oluwo, na ordem oficial, e quanto ainda falta vender. Se faltar, mostra quantos rituais de cada produto fecham o buraco.
3. **A Bazuca** — aporte do banco + resgate do lastro − consignado + troco que sobrou da Fase 1.
4. **Sobra Livre — o início da riqueza** — o que resta depois da Kill List inteira, com o Fundo de Reserva marcado como blindado (não entra) e a conversão para renda passiva (0,5% a.m.) e para o marco dos 36M.

Três cenários alternáveis no topo: **Realizado** (só o que já entrou), **Provável** (realizado + confirmados) e **Otimista** (tudo do pipeline). Cada cenário recalcula a cascata inteira, então você vê na hora se fechar X rituais já garante a morte do Agiota e do Oluwo.

Complementos:

- **Barra "Falta vender"** fixa no topo da página, em vermelho enquanto houver saldo.
- **Link cruzado**: o Placar da Fase 1 em Entradas passa a considerar também o pipeline do Kanban e ganha um botão "Ver cascata completa" que leva para a nova página.
- **Card no Dashboard**: "Falta vender para o Dia D" com o valor e a sobra livre projetada no cenário Provável.

## Detalhes técnicos

- Nova rota `src/routes/ofensiva.tsx` com `head()` próprio; item novo em `src/components/app-sidebar.tsx`.
- Nova função em `src/lib/financeiro.ts`: `cascataFase1DiaD({ passivos, ativos, munição })` reaproveitando `planoDestinacao` (ordem Agiota → Oluwo) e `simularDiaD`, devolvendo os quatro degraus + sobra final.
- Munição por cenário calculada a partir de `useCrmReceitas` (`realizadoLiquido`) e dos clientes do `CockpitProvider` (`valor` menos `custo_operacao` do produto correspondente).
- `placarFase1` ganha parâmetro opcional de pipeline; a chamada atual em `src/routes/entradas.tsx` é ajustada.
- Sem mudança de banco de dados — tudo derivado das tabelas que já existem.
