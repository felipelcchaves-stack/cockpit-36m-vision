# Salvar os clientes do Kanban no banco

## O que aconteceu

O Catálogo de Receitas está no banco e intacto (5 produtos). Já o quadro de clientes (Interessado / Confirmado / Pago) na tela de Entradas nunca foi para o banco: ele vive só na memória do navegador, com uma lista de exemplo fixa. Qualquer cliente que você cadastrou desapareceu ao recarregar a página — e não é possível recuperá-lo, porque nunca chegou a ser gravado.

## O que será feito

1. Criar a tabela `crm_clientes` no banco, com nome do cliente, tipo de ritual, status (Interessado / Confirmado / Pago), valor e observação.
2. Migrar os 7 clientes de exemplo atuais para essa tabela, para a tela não começar vazia.
3. Ligar o Kanban de Entradas ao banco:
   - cadastrar cliente pelo painel lateral grava direto no banco;
   - mover o cartão entre colunas atualiza o status no banco;
   - remover cliente apaga a linha do banco.
4. Recalcular a receita paga e o pipeline a partir dos dados reais, e refletir isso nos cards do Dashboard.

Depois disso nada mais some ao recarregar a página.

## Detalhes técnicos

- Migração: `create table public.crm_clientes (id uuid pk default gen_random_uuid(), nome text not null, tipo text not null, status text not null default 'Interessado', valor numeric not null default 0, nota text, created_at, updated_at)` + GRANTs para `anon`/`authenticated`/`service_role`, RLS ativa com políticas públicas (mesmo padrão já usado em `passivos`/`crm_receitas`, já que o app ainda não tem login) + trigger de `updated_at`.
- Novos hooks em `src/lib/cockpit-queries.ts`: `useClientes`, `useCriarCliente`, `useAtualizarStatusCliente`, `useRemoverCliente`, invalidando a chave `["crm_clientes"]`.
- `src/routes/entradas.tsx` passa a ler do hook em vez de `useCockpit().clients`; `paidRevenue` e `pipeline` derivados das linhas reais.
- `src/lib/cockpit-store.tsx`: remover a lista de clientes do estado local (mantendo credores, transações e fases como estão) e ajustar os consumidores no Dashboard.

## Observação

As políticas de acesso serão públicas, como nas outras tabelas — qualquer visitante do app poderá ver e editar os clientes. Se quiser proteger com login, isso pode ser feito em uma etapa seguinte.
