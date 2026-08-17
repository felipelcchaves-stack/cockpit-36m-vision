# Saldo do Lastro: você no comando, o automático só como referência

## Minha opinião

Concordo com você — e o ponto que levantou sobre as parcelas é o argumento decisivo.

O motor automático só sabe uma coisa: aplicar juros. Ele não sabe que você tirou dinheiro para pagar uma parcela do Agiota, que entrou o pagamento de um Oye, que o banco cobrou IOF/IR ou que o CDI mudou. Toda vez que qualquer uma dessas coisas acontece, o número do cockpit descola do extrato — e um cockpit que mente sobre o Poder de Fogo é pior do que não ter cockpit.

A regra certa é: **o extrato manda, o automático apenas sugere**. Você digita o saldo real, e o sistema te mostra quanto *deveria* ter rendido — se a diferença for grande, é sinal de que algo mexeu no caixa e você fica sabendo.

## O que muda

**1. Saldo do lastro passa a ser manual (padrão)**
- O campo de saldo vira edição direta, em destaque, com registro no extrato de rendimentos.
- Ao salvar, o app decompõe a diferença: "R$ 190 é rendimento esperado, R$ 4.000 é movimentação" — assim o histórico continua separando juro de saque/depósito.
- Desligo o robô diário. Ele deixa de mexer no seu saldo sozinho.

**2. O automático vira "rendimento estimado"**
- Um card mostra: "desde 17/08 seu lastro deveria ter rendido ~R$ X".
- Botão "Aplicar estimativa" para quando você quiser atualizar sem abrir o app do banco — mas é um clique seu, nunca automático.
- Alerta suave quando faz mais de 7 dias que o saldo não é conferido.

**3. Amortizar passivo passa a debitar a origem do dinheiro**
Essa é a peça que falta hoje: quando você amortiza um credor, o passivo cai mas nenhum caixa é debitado.
- No painel de amortização, passa a ter o campo **"De onde saiu o dinheiro"**: Lastro (CDB), Caixa livre, Receita de ritual, ou Outro/externo.
- Escolhendo Lastro, o saldo do ativo cai automaticamente no mesmo valor e o movimento entra no extrato como "saque — amortização Agiota".
- O Fundo de Reserva continua bloqueado nessa lista (Lei do Fundo de Reserva).

**4. Extrato mais honesto**
- A aba Rendimentos passa a mostrar três origens: `Rendimento`, `Saque/Amortização` e `Ajuste do extrato`, cada uma com sua cor.
- Totais do mês separados: quanto foi juro de verdade vs. quanto você tirou.

## Detalhes técnicos

- Remover o agendamento diário de `render_ativos` (o `pg_cron`); a função continua existindo, mas só roda quando você aciona "Aplicar estimativa".
- `rendimentos.origem` ganha o valor `saque`; a decomposição rendimento vs. movimentação é calculada no cliente com a taxa contratada.
- Nova mutação `useDebitarAtivo` chamada dentro do fluxo de amortização de `src/routes/passivos.tsx`, gravando a transação e atualizando `ativos.valor` na mesma ação.
- `src/components/painel-lastro.tsx`: saldo editável inline, card de estimativa e aviso de saldo desatualizado.
- `src/routes/historico.tsx`: filtro e cores por origem, totais separados.
