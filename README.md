# Cockpit 36M

Crie uma aplicação web responsiva e sofisticada para gestão financeira pessoal e construção de patrimônio, chamada "Cockpit 36M". A interface deve ser inspirada nos melhores softwares de wealth management e fintechs de alta renda (ex: Monarch Money, Nubank Ultravioleta), utilizando um tema Dark Mode elegante, clean, com tipografia moderna, gráficos interativos e uso estratégico de cores (Verde para liquidez, Vermelho para dívidas, Dourado para metas de longo prazo).

Requisitos de Layout e Componentes:

Sidebar de Navegação: Esquerda, recolhível, com os itens: Dashboard, Entradas/Rituais, Passivos/Credores, Roadmap Dia D, Histórico de Transações, Sala de Comando (IA).

Interações via Side Sheets: Todas as ações de "Adicionar Nova Receita", "Nova Despesa" ou "Editar Dívida" devem abrir um Side Sheet (painel lateral deslizante vindo da direita) para manter o contexto visual do dashboard.

Gráficos: Use Recharts para criar gráficos de linha suaves (para projeção de patrimônio) e barras de progresso modernas.

Especificação das Páginas:

Página 1: Dashboard (A Visão de Águia)

4 Cards no topo (estilo widgets):

"Poder de Fogo Atual" (Liquidez no banco).

"Sobra Livre Projetada para o Dia D".

"Total de Passivos Restantes".

"Progresso Rumo aos 36M" (Barra percentual).

Um gráfico principal de área mostrando a queima de dívidas caindo e a liquidez subindo.

Widget de "Insights do CFO": Uma caixa de texto estilizada gerando frases motivacionais baseadas em dados (ex: "Apenas 3 rituais faltam para extinguir o passivo do Agiota").

Página 2: Entradas e Rituais (CRM de Receitas)

Uma tabela moderna em formato Kanban ou Lista para rastrear captação de clientes.

Colunas/Tags: Nome do Cliente, Tipo de Entrada (Premium 12k, Ritual 4.5k, Ritual 2.5k, Oye 30k, Egungun 5k), Status (Interessado, Confirmado, Pago).

Ao mover para "Pago", o valor deve somar automaticamente na barra de "Liquidez" do Dashboard.

Página 3: Gestão de Passivos (Painel de Alvos)

Cards para cada credor principal: Agiota, Oluwo, Banco Consignado, Leka (Antigo e Novo), Caio, Cartões e Nubank.

Cada card deve ter o saldo devedor, uma barra de amortização visual e um botão "Amortizar" que abre um Side Sheet.

Página 4: Roadmap "As 5 Fases" (Timeline Visual)

Uma linha do tempo vertical bonita e gamificada com 5 marcos: 1. Ofensiva Sazonal (Pré-Dia D) -> 2. Operação Dia D -> 3. Ponte de 90 Dias -> 4. A Virada de Chave -> 5. O Império dos 36M. O usuário deve poder dar "check" em tarefas dentro de cada fase.

Página 5: Sala de Comando (Integração IA)

Uma interface de chat estilo ChatGPT embarcada no app. Layout de mensagens claras onde o usuário pode interagir com o "CFO Virtual" (Gemini) para pedir conselhos de alocação e recálculos de rota.

Dados Iniciais (Mock Data para o visual ficar completo ao gerar): Popule a aplicação com esses dados iniciais para que o visual funcione imediatamente: Passivo Agiota: R$ 0 (Pago), Passivo Oluwo: R$ 180.000, Passivo Leka: R$ 301.629. Liquidez Travada: R$ 432.935. Aporte Previsto: R$ 700.000. Adicione alguns clientes fictícios com status diferentes na tela de Rituais.

Priorize animações suaves (framer-motion se possível), espaçamento adequado e sinta-se livre para criar uma UI que instigue o usuário a abrir o app todos os dias pela manhã como um ritual de poder e controle.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://cockpit-36m-vision.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/c846979c-ffec-467c-8d68-65a89a2e7334).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
