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
