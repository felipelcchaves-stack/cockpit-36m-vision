# Nova Receita deve usar o catálogo real de rituais

## O problema

A lista "Tipo de entrada" do painel "Adicionar Nova Receita" é uma lista fixa escrita no código ("Premium 12k", "Ritual 4.5k", "Ritual 2.5k", "Oye 30k", "Egungun 5k"). Ela não tem relação com o Catálogo de Receitas do banco, que hoje tem outros nomes e outros tickets:

- Títulos Oyes — R$ 30.000
- Ritual Iya Odu ou Egungun — R$ 12.000
- Ensinamento Egungun — R$ 5.000
- Ensinamento de Imule e Egbe Orun — R$ 5.000
- Ritual (Imule Agba) — R$ 4.500 (custo de operação R$ 10.000)
- Ritual (Sise Aje) — R$ 2.500
- Ensinamento Ebo Riru — R$ 1.500

Por isso o card do cliente nunca herda o nome do produto cadastrado: ele só sabe falar os cinco rótulos fixos.

## O que muda

1. O seletor "Tipo de entrada" passa a listar os produtos reais do Catálogo de Receitas, com o ticket de cada um. Quem cadastrar um produto novo no catálogo o vê imediatamente aqui.
2. Ao salvar, o cliente guarda o nome do produto e o valor do ticket daquele momento. O card do Kanban mostra o nome real do ritual e o valor correto.
3. O valor do cliente passa a vir do que foi salvo (não mais de uma tabela fixa), então totais das colunas, pipeline e receita realizada refletem os tickets reais.
4. Ao mover o card para "Pago", o painel de recebimento já sugere o ticket e o **custo de operação daquele produto exato** (ex.: Ritual (Imule Agba) sugere R$ 10.000 de custo), em vez de uma média.
5. Clientes antigos, salvos com os rótulos fixos, continuam aparecendo normalmente com o valor que já tinham — nada some.

## Detalhes técnicos

- `src/lib/cockpit-store.tsx`: `EntryType` deixa de ser união literal e vira `string`; `ENTRY_VALUES` fica só como tabela de compatibilidade para linhas antigas. `Client` ganha `valor` lido de `crm_clientes.valor`, com fallback `ENTRY_VALUES[type] ?? 0`. `paidRevenue`, `pipeline` e `destinarReceita` passam a usar `c.valor`.
- `useCriarCliente` (`src/lib/cockpit-queries.ts`) passa a gravar `valor` junto de `tipo`.
- `src/routes/entradas.tsx`: o sheet "Adicionar Nova Receita" monta as opções a partir de `useCrmReceitas()` (ordenado por ticket desc), guardando o `produto`; cards usam `c.valor`; `ReceberRitualSheet` resolve o produto por nome para pegar `custo_operacao` e `ticket_medio`.
- `src/routes/index.tsx`: substitui `ENTRY_VALUES[c.type]` por `c.valor` no bloco de próximos rituais.
- Sem migração: `crm_clientes.valor` já existe e hoje fica zerado.
