import type { Ativo, Passivo } from "@/lib/cockpit-queries";
import { alvosVivos, isPago, isPoderDeFogo, isReservaBlindada } from "@/lib/cockpit-queries";

/* ---------------- Constantes do Dossiê 36M ---------------- */

export const IDADE_ATUAL = 51;
export const IDADE_ALVO = 66;
export const META_PATRIMONIO = 36_312_450;
export const APORTE_MENSAL = 70_000;
export const JUROS_REAL_MENSAL = 0.009; // 0,9% a.m.
export const RETIRADA_SEGURA = 0.005; // 0,5% a.m.
export const RENDA_PASSIVA_ALVO = META_PATRIMONIO * RETIRADA_SEGURA;

export const APORTE_DIA_D = 700_000;
export const QUITACAO_CONSIGNADO = 492_718.91;
export const LASTRO_INVESTIMENTO = 432_935.38;
export const FATURA_CARTAO = 25_000;

export const brlExato = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/* ---------------- Dia D e a Bazuca ---------------- */

/** Valor do ativo cadastrado que contém o rótulo, com fallback do dossiê. */
export const valorAtivo = (rows: Ativo[], termo: string, fallback: number) =>
  rows.find((a) => `${a.nome} ${a.tipo ?? ""}`.toLowerCase().includes(termo))?.valor ?? fallback;

export const valorPassivo = (rows: Passivo[], termo: string, fallback: number) => {
  const p = rows.find((r) => r.credor.toLowerCase().includes(termo));
  if (!p) return fallback;
  return isPago(p.status) ? 0 : p.saldo_devedor;
};

export type AlvoSimulado = {
  id: number;
  credor: string;
  saldo: number;
  abatido: number;
  restante: number;
  extinto: boolean;
};

export type SimulacaoDiaD = {
  aporte: number;
  consignado: number;
  lastro: number;
  bazuca: number;
  alvos: AlvoSimulado[];
  sobra: number;
  passivoRestante: number;
};

/**
 * Aplica a Bazuca em cascata sobre a Kill List, na ordem oficial do dossiê.
 * O Fundo de Reserva nunca entra — é caixa blindado.
 */
export function simularDiaD(
  passivos: Passivo[],
  opts: { aporte: number; consignado: number; lastro: number },
): SimulacaoDiaD {
  const bazuca = opts.aporte - opts.consignado + opts.lastro;
  let caixa = bazuca;

  const alvos = alvosVivos(passivos)
    .filter((p) => !p.credor.toLowerCase().includes("consignad"))
    .map((p) => {
      const abatido = Math.min(caixa, p.saldo_devedor);
      caixa -= abatido;
      const restante = p.saldo_devedor - abatido;
      return {
        id: p.id,
        credor: p.credor,
        saldo: p.saldo_devedor,
        abatido,
        restante,
        extinto: restante === 0,
      };
    });

  return {
    ...opts,
    bazuca,
    alvos,
    sobra: caixa,
    passivoRestante: alvos.reduce((s, a) => s + a.restante, 0),
  };
}

/* ---------------- Projeção rumo aos 36M ---------------- */

export type PontoProjecao = {
  ano: number;
  idade: number;
  patrimonio: number;
  meta: number;
  rendaPassiva: number;
};

/** Juros compostos com aporte mensal, agrupados por ano até os 66 anos. */
export function projetar36M(
  inicial: number,
  aporteMensal = APORTE_MENSAL,
  taxa = JUROS_REAL_MENSAL,
  anos = IDADE_ALVO - IDADE_ATUAL,
): PontoProjecao[] {
  const anoBase = new Date().getFullYear();
  let saldo = Math.max(0, inicial);
  const pontos: PontoProjecao[] = [
    {
      ano: anoBase,
      idade: IDADE_ATUAL,
      patrimonio: Math.round(saldo),
      meta: META_PATRIMONIO,
      rendaPassiva: Math.round(saldo * RETIRADA_SEGURA),
    },
  ];
  for (let a = 1; a <= anos; a++) {
    for (let m = 0; m < 12; m++) saldo = saldo * (1 + taxa) + aporteMensal;
    pontos.push({
      ano: anoBase + a,
      idade: IDADE_ATUAL + a,
      patrimonio: Math.round(saldo),
      meta: META_PATRIMONIO,
      rendaPassiva: Math.round(saldo * RETIRADA_SEGURA),
    });
  }
  return pontos;
}

/** Primeiro ponto em que o patrimônio cruza a meta de 36M. */
export const cruzamentoMeta = (pontos: PontoProjecao[]) =>
  pontos.find((p) => p.patrimonio >= META_PATRIMONIO) ?? null;

/* ---------------- Leis do CFO ---------------- */

/** Lei do Cartão: fatura projetada não pode superar a receita livre do mês. */
export function alertaCartao(faturaProjetada: number, receitaLivre: number) {
  const excede = faturaProjetada > receitaLivre;
  return {
    excede,
    faturaProjetada,
    receitaLivre,
    gap: faturaProjetada - receitaLivre,
  };
}

/** Poder de fogo líquido: ativos operacionais, sem o cofre blindado. */
export const poderDeFogoLiquido = (ativos: Ativo[]) =>
  ativos.filter(isPoderDeFogo).reduce((s, a) => s + a.valor, 0);

export const cofreBlindado = (ativos: Ativo[]) =>
  ativos.filter(isReservaBlindada).reduce((s, a) => s + a.valor, 0);

/* ---------------- Fase 1: placar de fechamento ---------------- */

/** Credores que precisam morrer antes do Dia D, na ordem oficial. */
export const ALVOS_PRE_DIA_D = ["agiota", "oluwo"];

const ehAlvoPreDiaD = (credor: string) =>
  ALVOS_PRE_DIA_D.some((t) => credor.toLowerCase().includes(t));

/** Agiota + Oluwo: o que precisa morrer antes do Dia D. */
export function placarFase1(passivos: Passivo[], liquidoJaPago: number, pipelineLiquido = 0) {
  const alvos = passivos.filter((p) => ehAlvoPreDiaD(p.credor));
  const emAberto = alvos.filter((p) => !isPago(p.status)).reduce((s, p) => s + p.saldo_devedor, 0);
  const total = alvos.reduce((s, p) => s + p.saldo_devedor, 0) || 352_500;
  const falta = Math.max(0, emAberto - liquidoJaPago);
  const faltaComPipeline = Math.max(0, emAberto - pipelineLiquido);
  return {
    total,
    emAberto,
    liquidoJaPago,
    pipelineLiquido,
    falta,
    faltaComPipeline,
    pct: emAberto > 0 ? Math.min(100, (liquidoJaPago / emAberto) * 100) : 100,
    pctComPipeline: emAberto > 0 ? Math.min(100, (pipelineLiquido / emAberto) * 100) : 100,
  };
}

/* ---------------- Extermínio já realizado (antes do Dia D) ---------------- */

export type AbateRealizado = {
  id: number;
  credor: string;
  original: number;
  abatido: number;
  restante: number;
  extinto: boolean;
  preDiaD: boolean;
};

export type LancamentoAbate = {
  passivo_id: number | null;
  tipo: string;
  valor: number;
  data: string;
  descricao: string;
};

/**
 * Reconstrói, por credor, o saldo original a partir das amortizações já
 * lançadas no histórico — de qualquer fonte (caixa, CDB, ritual, externo).
 */
export function exterminioRealizado(args: {
  passivos: Passivo[];
  transacoes: LancamentoAbate[];
}) {
  const { passivos, transacoes } = args;
  const lancamentos = transacoes.filter((t) => t.tipo === "Amortização" && t.passivo_id !== null);

  const abatidoDe = (id: number) =>
    lancamentos.filter((t) => t.passivo_id === id).reduce((s, t) => s + t.valor, 0);

  const alvos: AbateRealizado[] = passivos.map((p) => {
    const restante = isPago(p.status) ? 0 : p.saldo_devedor;
    const abatido = abatidoDe(p.id) + (isPago(p.status) ? p.saldo_devedor : 0);
    return {
      id: p.id,
      credor: p.credor,
      original: restante + abatido,
      abatido,
      restante,
      extinto: restante === 0,
      preDiaD: ehAlvoPreDiaD(p.credor),
    };
  });

  const original = alvos.reduce((s, a) => s + a.original, 0);
  const abatido = alvos.reduce((s, a) => s + a.abatido, 0);

  return {
    alvos,
    lancamentos: [...lancamentos].sort((a, b) => b.data.localeCompare(a.data)),
    original,
    abatido,
    restante: alvos.reduce((s, a) => s + a.restante, 0),
    extintos: alvos.filter((a) => a.extinto).length,
    pct: original > 0 ? Math.min(100, (abatido / original) * 100) : 0,
    /** Saldos originais por credor, para simular o cenário "sem antecipação". */
    originais: new Map(alvos.map((a) => [a.id, a.original])),
  };
}

/* ---------------- Cascata: Ofensiva da Fase 1 até o Dia D ---------------- */

export type AbatePreDiaD = {
  id: number;
  credor: string;
  saldo: number;
  abatido: number;
  restante: number;
  extinto: boolean;
};

/**
 * Liga a munição de rituais ao Dia D: mata Agiota → Oluwo, joga o troco na
 * Bazuca e devolve a sobra livre depois de toda a Kill List.
 */
export function cascataFase1DiaD(args: {
  passivos: Passivo[];
  ativos: Ativo[];
  /** Munição ainda a receber (pipeline do Kanban), líquida de custo. */
  municao: number;
  /**
   * Munição já recebida (clientes pagos), líquida de custo. Esse dinheiro já
   * baixou o saldo dos passivos no banco, então entra como histórico —
   * nunca é reaplicado sobre o saldo em aberto atual.
   */
  municaoRealizada?: number;
  /** Saldos originais por credor: habilita o cálculo do ganho por antecipação. */
  originais?: Map<number, number>;
}) {
  const { passivos, ativos } = args;
  const pipeline = Math.max(0, args.municao);
  const jaExterminado = Math.max(0, args.municaoRealizada ?? 0);
  const municao = pipeline + jaExterminado;


  let caixa = pipeline;
  const abates: AbatePreDiaD[] = alvosVivos(passivos)
    .filter((p) => ehAlvoPreDiaD(p.credor))
    .map((p) => {
      const abatido = Math.min(caixa, p.saldo_devedor);
      caixa -= abatido;
      const restante = p.saldo_devedor - abatido;
      return {
        id: p.id,
        credor: p.credor,
        saldo: p.saldo_devedor,
        abatido,
        restante,
        extinto: restante === 0,
      };
    });

  const faltaVender = abates.reduce((s, a) => s + a.restante, 0);
  const troco = caixa;

  const passivosPos = passivos.map((p) => {
    const a = abates.find((x) => x.id === p.id);
    if (!a) return p;
    return { ...p, saldo_devedor: a.restante, status: a.restante === 0 ? "Pago" : p.status };
  });

  const aporte = valorAtivo(ativos, "aporte", APORTE_DIA_D);
  const lastro = valorAtivo(ativos, "investimento", LASTRO_INVESTIMENTO);
  const consignado = valorPassivo(passivos, "consignad", QUITACAO_CONSIGNADO);

  const sim = simularDiaD(passivosPos, { aporte: aporte + troco, consignado, lastro });

  return {
    municao,
    pipeline,
    jaExterminado,
    abates,
    faltaVender,
    troco,
    aporte,
    lastro,
    consignado,
    sim,
    reserva: cofreBlindado(ativos),
    sobraLivre: sim.sobra,
    passivoRestante: sim.passivoRestante,
  };
}




/* ---------------- Ponte de 90 dias e Virada de Chave ---------------- */

export type ParametrosFluxo = {
  obra_mensal: number;
  aluguel_potiguara: number;
  faturamento_base: number;
  obra_meses_restantes: number;
  potiguara_meses_restantes: number;
};

export type MesFluxo = {
  mes: number;
  rotulo: string;
  entradas: number;
  obra: number;
  potiguara: number;
  saidas: number;
  livre: number;
  marcos: string[];
};

/** Fase 4: 3 meses de ponte com obra (22k) e Potiguara (10k) saindo do caixa. */
export function pontede90Dias(p: ParametrosFluxo, meses = 3): MesFluxo[] {
  const nomes = ["Mês 1", "Mês 2", "Mês 3", "Mês 4", "Mês 5", "Mês 6"];
  const out: MesFluxo[] = [];
  for (let i = 0; i < meses; i++) {
    const obra = i < p.obra_meses_restantes ? p.obra_mensal : 0;
    const potiguara = i < p.potiguara_meses_restantes ? p.aluguel_potiguara : 0;
    const marcos: string[] = [];
    if (i === p.obra_meses_restantes) marcos.push("Fim da obra");
    if (i === p.potiguara_meses_restantes) marcos.push("Devolução da Potiguara");
    out.push({
      mes: i + 1,
      rotulo: nomes[i] ?? `Mês ${i + 1}`,
      entradas: p.faturamento_base,
      obra,
      potiguara,
      saidas: obra + potiguara,
      livre: p.faturamento_base - obra - potiguara,
      marcos,
    });
  }
  return out;
}

/** Fase 5: fim da obra + devolução da Potiguara destravam caixa para o aporte. */
export function viradaDeChave(p: ParametrosFluxo) {
  const destravado = p.obra_mensal + p.aluguel_potiguara;
  const livreHoje = p.faturamento_base - destravado;
  const livreDepois = p.faturamento_base;
  return {
    destravado,
    livreHoje,
    livreDepois,
    cobreAporte: livreDepois >= APORTE_MENSAL,
    folga: livreDepois - APORTE_MENSAL,
  };
}

/** Renda passiva que o patrimônio atual já geraria (0,5% a.m.). */
export const rendaPassivaAtual = (patrimonio: number) => Math.max(0, patrimonio) * RETIRADA_SEGURA;

/* ---------------- Rendimento do lastro (CDB) ---------------- */

import type { Rendimento } from "@/lib/cockpit-queries";

/** Taxa efetiva anual contratada do ativo (fixa ou % do CDI), em %. */
export const taxaAnualAtivo = (a: Ativo) =>
  a.modo_taxa === "fixa" ? a.taxa_aa : (a.cdi_aa * a.pct_cdi) / 100;

/** Converte taxa anual (%) em taxa por dia útil (252 dias). */
export const diariaDeAnual = (taxaAa: number) => Math.pow(1 + taxaAa / 100, 1 / 252) - 1;

/** Quanto o ativo rende, em reais, num dia útil típico. */
export const jurosDoDia = (a: Ativo) => a.valor * diariaDeAnual(taxaAnualAtivo(a));

const soma = (rows: Rendimento[]) => rows.reduce((s, r) => s + r.juros, 0);

export type CategoriaExtrato = "rendimento" | "saque" | "ajuste" | "entrada";

/** Classifica a linha do extrato do lastro. */
export function categoriaExtrato(r: Rendimento): CategoriaExtrato {
  if (r.origem.startsWith("saque")) return "saque";
  if (r.origem.startsWith("entrada")) return "entrada";
  if (r.origem === "ajuste") return "ajuste";
  return "rendimento";
}

/** Motivo legível de um saque ("saque:Amortização Agiota"). */
export const motivoExtrato = (r: Rendimento) => {
  if (r.origem.startsWith("saque:")) return r.origem.slice(6);
  if (r.origem.startsWith("entrada:")) return r.origem.slice(8);
  return "";
};

export function resumoRendimento(rows: Rendimento[], ativoId?: number) {
  const base = ativoId ? rows.filter((r) => r.ativo_id === ativoId) : rows;
  const juros = base.filter((r) => categoriaExtrato(r) === "rendimento");
  const hoje = new Date().toISOString().slice(0, 10);
  const mes = hoje.slice(0, 7);
  const doMes = base.filter((r) => r.data.startsWith(mes));
  return {
    hoje: soma(juros.filter((r) => r.data === hoje)),
    mes: soma(juros.filter((r) => r.data.startsWith(mes))),
    total: soma(juros),
    saquesMes: Math.abs(soma(doMes.filter((r) => categoriaExtrato(r) === "saque"))),
    ajustesMes: soma(doMes.filter((r) => categoriaExtrato(r) === "ajuste")),
    entradasMes: soma(doMes.filter((r) => categoriaExtrato(r) === "entrada")),
    lancamentos: base.length,
  };
}

/** Dias corridos e dias úteis entre a última conferência e hoje. */
export function desdeUltimoFechamento(iso: string) {
  const base = new Date(`${iso}T00:00:00`);
  const hoje = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00");
  const corridos = Math.max(0, Math.round((hoje.getTime() - base.getTime()) / 86400000));
  let uteis = 0;
  for (let i = 1; i <= corridos; i++) {
    const d = new Date(base.getTime() + i * 86400000);
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) uteis++;
  }
  return { corridos, uteis };
}

/** Quanto o ativo deveria ter rendido desde a última conferência. */
export function rendimentoEstimado(a: Ativo) {
  const { corridos, uteis } = desdeUltimoFechamento(a.ultimo_fechamento);
  const taxaDia = diariaDeAnual(taxaAnualAtivo(a));
  const valor = a.valor * (Math.pow(1 + taxaDia, uteis) - 1);
  return { corridos, uteis, valor };
}

/** Curva do saldo do ativo nos últimos N dias, em ordem cronológica. */
export function curvaLastro(rows: Rendimento[], ativoId: number, dias = 90) {
  return rows
    .filter((r) => r.ativo_id === ativoId)
    .slice(0, dias)
    .map((r) => ({ data: r.data.slice(5), saldo: r.saldo_final }))
    .reverse();
}
