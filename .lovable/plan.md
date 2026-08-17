# Correção: rituais pagos não aparecem na Ofensiva → Dia D

## O que está acontecendo

Confirmei no banco e no código:

- Existem 5 clientes com status **Pago** (Ifalimileyin, Leonardo, Ifadara, Ifamodupe, Ifapanle — R$ 23.000 brutos), e o livro-caixa já registra R$ 23.000 de Receita e R$ 21.000 de Amortização.
- A tela Ofensiva só soma clientes com status **Confirmado** e **Interessado**. Cliente **Pago** não entra em nenhum cenário.
- O cenário "Realizado" está fixado em munição = 0 (literalmente `municao = 0`).
- Existe um cálculo de realizado por catálogo (`realizadoLiquido`) que é computado mas nunca usado; além disso, todos os produtos estão com `quantidade_realizada = 0`, então esse caminho também daria zero.

Resultado: mesmo com rituais pagos e passivo já amortizado, a cascata mostra 0 de munição realizada.

## Como corrigir

1. **Contar o que já foi pago**: somar os clientes com status `Pago` (valor líquido = valor − custo unitário do produto) como base realizada da Fase 1.
2. **Cenários passam a ser cumulativos**:
   - Realizado = pagos
   - Provável = pagos + confirmados
   - Otimista = pagos + confirmados + interessados
3. **Não contar duas vezes o abatimento**: quando o ritual é recebido, o saldo do Agiota/Oluwo já cai no banco. Então a cascata deve mostrar o realizado como "já exterminado" (histórico) e aplicar sobre o saldo em aberto atual apenas a parcela ainda não recebida (confirmados/interessados), somando o troco realizado que foi para o CDB.
4. **Novo degrau visual**: no topo do funil, um bloco "Já capturado" listando os rituais pagos (nome, produto, valor líquido, data de pagamento), para o usuário ver exatamente o que entrou.
5. **Placar da Fase 1 em Entradas** e o card do Dashboard passam a usar a mesma base, para os três lugares nunca divergirem.

## Detalhes técnicos

- `src/routes/ofensiva.tsx`: derivar `pagos`, `confirmados`, `interessados` a partir de `clients`; munição cumulativa por cenário; usar o abatimento já realizado como histórico em vez de reaplicá-lo sobre o saldo em aberto.
- `src/lib/financeiro.ts` (`cascataFase1DiaD`): aceitar `municaoRealizada` separada de `municaoPipeline`, retornando `jaExterminado`, `faltaVender` e `troco` coerentes com o saldo atual dos passivos.
- Remover o uso morto de `realizadoLiquido` na Ofensiva (o catálogo `quantidade_realizada` não é alimentado pelo fluxo do Kanban).
- Sem migração de banco: os dados já estão corretos; o defeito é só de leitura/agregação.
