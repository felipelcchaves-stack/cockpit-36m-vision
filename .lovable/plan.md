# Catálogo de Receitas: progresso da meta + CRUD

## O que muda

### 1. Barra de progresso da meta
Hoje o catálogo só mostra o potencial (meta x ticket). Para saber o avanço, cada produto passa a ter uma quantidade já vendida/realizada.

- Nova coluna `quantidade_realizada` na tabela de receitas (começa em 0).
- Em cada linha do catálogo: barra de progresso `realizado / meta` com percentual e valor já realizado em R$.
- Botões rápidos `+1` / `-1` para registrar uma venda sem abrir formulário.
- No topo do bloco, além do "Potencial total", um resumo: **Realizado total** (R$ e %) com uma barra geral de avanço rumo à meta somada.

### 2. Cadastrar, editar e remover rituais
- Botão "Novo produto" no cabeçalho do catálogo, abrindo um side sheet (mesmo padrão do resto do app) com: produto, ticket médio, meta de quantidade, quantidade realizada e status da campanha.
- Cada linha ganha ações de editar (abre o mesmo sheet preenchido) e remover (com confirmação).
- Tudo grava direto no banco e a tela se atualiza sozinha após salvar.

## Detalhes técnicos

- Migração: `ALTER TABLE crm_receitas ADD COLUMN quantidade_realizada integer NOT NULL DEFAULT 0`; políticas de acesso adicionais permitindo criar, editar e remover linhas de `crm_receitas` (hoje só há leitura pública), mais os GRANTs correspondentes.
- `src/lib/cockpit-queries.ts`: incluir `quantidade_realizada` no tipo/select e adicionar mutations `useCriarReceita`, `useAtualizarReceita`, `useRemoverReceita`, além de helpers `realizado(r)` e `progresso(r)`; todas invalidam a query `crm_receitas`.
- `src/routes/entradas.tsx`: o componente `CrmReceitasReais` ganha coluna de progresso (`Progress` do shadcn, com trilha em dourado/verde do tema), sheet de formulário reutilizável e `AlertDialog` de confirmação de exclusão; feedback via `sonner`.
- Visual mantém o padrão dark premium atual (glass-card, dourado para meta, verde para realizado). Nada de cores hardcoded fora dos tokens.

## Observação
Como o banco hoje não tem histórico de vendas por produto, o progresso é controlado por essa quantidade realizada editável — simples e direto. Se preferir que o avanço venha do Kanban (clientes marcados como "Pago"), dá para ligar depois.
