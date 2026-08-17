# Cofre fechado: login, blindagem total e página de Perfil

Hoje todas as telas do Cockpit (Dashboard, Ofensiva, Passivos, Dia D, Roadmap, Histórico, Sala de Comando) são públicas e o banco aceita leitura/escrita de qualquer visitante anônimo. Publicar assim expõe toda a operação financeira. O plano fecha isso em duas camadas: porta de entrada (login) e cadeado no banco (nenhum dado sai sem sessão válida).

## 1. Login com usuário e senha

- Nova tela `/auth`: entrar com e-mail e senha e, **agora em tempo de execução**, criar a sua conta.
- Depois que a sua conta existir, o **cadastro público é desligado** — ninguém mais consegue se registrar. Se um dia quiser liberar acesso a outra pessoa, isso passa a ser feito por convite/criação manual.
- Confirmação de e-mail desligada, para você entrar imediatamente após o cadastro.
- Senha vazada é bloqueada (checagem contra bases públicas de vazamento).
- Recuperação de senha por e-mail ("Esqueci minha senha").
- Sem login social, sem acesso anônimo.

## 2. Blindagem de tudo que existe hoje

- Todas as telas atuais passam para dentro de uma área protegida. Sem sessão, qualquer URL do cockpit redireciona para `/auth` — inclusive digitando o endereço direto.
- No banco: as permissões públicas atuais (leitura e escrita liberadas para visitante anônimo) são **removidas de todas as tabelas** — passivos, ativos, transações, CRM, rituais, roadmap, aportes, parâmetros e rendimentos. Passa a valer: só usuário autenticado lê e escreve.
- A Sala de Comando (IA) passa a exigir sessão — hoje qualquer um poderia consumir o modelo.
- A raiz `/` deixa de mostrar o dashboard para desconhecidos: sem sessão, cai no login.

## 3. Página de Perfil

Nova tela `/perfil`, acessível pela sidebar, com:

- **Foto**: upload de imagem (arrastar ou escolher arquivo), pré-visualização, troca e remoção. A foto aparece no topo da sidebar junto ao seu nome. Cada usuário só enxerga e altera a própria imagem.
- **Dados**: nome de exibição e e-mail.
- **Trocar senha**: senha atual → nova senha → confirmação, com validação de força.
- **Tema**: alternador Dark (padrão atual, militar) × Clean (versão clara, mesma linguagem visual — verde para liquidez, vermelho para passivo, dourado para meta, só que sobre fundo claro). A escolha fica salva e vale em todas as telas.
- **Sair** (encerra a sessão com limpeza total do cache local).

## 4. Sessão e sinais na interface

- Indicador de usuário logado no rodapé da sidebar (avatar + nome + sair).
- Ao sair, nada do que estava em tela permanece em cache — o botão "voltar" do navegador não recupera dados.

---

## Detalhes técnicos

**Banco (migração única)**
- Tabela `profiles` (`id` = id do usuário, `nome`, `avatar_url`, `tema`, timestamps), com GRANTs para `authenticated`/`service_role` e RLS: cada um só lê e escreve a própria linha. Trigger em `auth.users` cria a linha automaticamente no cadastro.
- Bucket de Storage `avatares` (privado) com políticas por pasta `<user_id>/…`: dono lê, envia, substitui e apaga.
- `DROP POLICY` em todas as políticas atuais `roles:{anon,authenticated}` das tabelas de negócio e recriação como `TO authenticated`; `REVOKE` dos grants de `anon` nas mesmas tabelas.

**Rotas**
- `src/routes/auth.tsx` — pública: login, cadastro (enquanto não houver usuário) e reset de senha.
- `src/routes/_authenticated/route.tsx` — gate gerenciado (`ssr: false`, redirect para `/auth`).
- Movimentação de `index, ofensiva, dia-d, passivos, entradas, roadmap, historico, comando, perfil` para dentro de `_authenticated/`, mantendo os caminhos atuais (`/`, `/ofensiva`, …) e o `head()` de cada rota.
- `src/routes/_authenticated/perfil.tsx` — nova tela de perfil.

**Auth e proteção de servidor**
- `supabase--configure_auth`: `disable_signup` inicialmente `false`, `auto_confirm_email` `true`, `password_hibp_enabled` `true`, anônimo desligado. Após você criar a conta, nova chamada com `disable_signup: true`.
- `src/lib/cfo.functions.ts` passa a usar `.middleware([requireSupabaseAuth])` — o `attachSupabaseAuth` já está registrado em `src/start.ts`.
- Listener único de `onAuthStateChange` em `__root.tsx` filtrando `SIGNED_IN/SIGNED_OUT/USER_UPDATED`.

**Tema claro**
- `src/styles.css` ganha o bloco de tokens do tema claro (`:root` claro × `.dark`), sem cores fixas nos componentes; alternância via classe no `<html>`, hidratada de `profiles.tema` e persistida em `localStorage` para evitar flash.

**Sem alteração de lógica financeira** — nenhum cálculo do dossiê é tocado.
