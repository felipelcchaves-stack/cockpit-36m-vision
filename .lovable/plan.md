# Amortização antecipada refletida em Dia D, Dashboard e Roadmap

Resposta curta: **em parte já está correto**. Verifiquei o código:

- **Operação Dia D** lê o saldo atual dos credores e o valor atual do lastro/CDB. Se você amortizar hoje, a Bazuca, a cascata de extermínio e a **sobra ("troco") já saem corretas** — inclusive o CDB, porque amortizar com origem "CDB" debita o ativo.
- **Dashboard** também lê passivos e ativos ao vivo: dívida total, poder de fogo, sobra livre, projeção 36M e o card da Ofensiva já refletem o abate.

O que **não** está refletido:

1. **Dia D não mostra o histórico de extermínio.** A tela não lê as amortizações lançadas, então não existe ali "quanto já morreu antes do evento" nem o **ganho por antecipação** na sobra livre — números que a Ofensiva já calcula.
2. **Dashboard não mostra o ganho por antecipação.** O cálculo da cascata no Dashboard não recebe os saldos originais, então o indicador nasce zerado lá.
3. **Roadmap não consome nada de passivos.** As Fases 1 a 3 são texto/tarefas: não mostram que Agiota/Oluwo/Leka já foram (ou não) exterminados, nem o valor que a Bazuca precisa cobrir na Fase 3.

## O que será construído

### 1. Dia D com memória do que já morreu
- Faixa no topo: "Passivo já exterminado antes do evento: R$ X de R$ Y (Z%)" e "Ganho por antecipação na sobra: + R$ N".
- Cada alvo da cascata passa a mostrar saldo original riscado quando já houve abate parcial, e selo "ALVO EXTERMINADO" nos zerados.
- Botão "Amortizar" também aqui, usando o mesmo painel lateral da Ofensiva (valor, data, origem do dinheiro), com recálculo imediato.

### 2. Dashboard alinhado
- O card "Ofensiva → Dia D" passa a exibir a mesma linha de ganho por antecipação e o % de passivo já exterminado, usando exatamente o mesmo cálculo da Ofensiva (sem número divergente entre telas).

### 3. Roadmap vivo
- Fase 1 ganha o placar real: Agiota e Oluwo com barra de abatido × em aberto, e a fase marca-se "cumprida" quando ambos zeram.
- Fase 3 ("A Bazuca e a morte da Leka") ganha o alvo atualizado: quanto ainda falta a Bazuca cobrir hoje e se a sobra projetada já é positiva.
- Se um alvo morrer antes da fase prevista, aparece o selo "antecipado".

## Detalhes técnicos

- Reaproveitar `exterminioRealizado` e `cascataFase1DiaD` de `src/lib/financeiro.ts`; nenhuma lógica nova de negócio, apenas consumo.
- `src/routes/dia-d.tsx`: passa a usar `useTransacoes` + `exterminioRealizado`, renderiza a faixa de impacto e integra `AmortizarSheet`.
- `src/routes/index.tsx`: passar `originais: ex.originais` para `cascataFase1DiaD` e exibir `ganhoAntecipacao` / `pct` no card da Ofensiva.
- `src/routes/roadmap.tsx`: passa a ler `usePassivos`/`useAtivos`, monta os placares das Fases 1 e 3 a partir da Kill List.
- Sem migração de banco — tudo vem de `passivos`, `transacoes` e `ativos`.
