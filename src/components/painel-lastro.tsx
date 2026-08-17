import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, Pencil, RefreshCw, TrendingUp } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { brl } from "@/lib/cockpit-store";
import {
  useAjustarSaldoAtivo,
  useRenderAgora,
  useRendimentos,
  useSalvarTaxaAtivo,
  type Ativo,
} from "@/lib/cockpit-queries";
import {
  brlExato,
  curvaLastro,
  jurosDoDia,
  rendimentoEstimado,
  resumoRendimento,
  taxaAnualAtivo,
} from "@/lib/financeiro";

const dataBRCurta = (iso: string) => iso.split("-").reverse().slice(0, 2).join("/");

export function PainelLastro({ ativo }: { ativo: Ativo | undefined }) {
  const { data: rendimentos = [] } = useRendimentos();
  const render = useRenderAgora();
  const ajustar = useAjustarSaldoAtivo();
  const salvarTaxa = useSalvarTaxaAtivo();

  const [sheet, setSheet] = useState<"saldo" | "taxa" | null>(null);
  const [comoRendimento, setComoRendimento] = useState(true);
  const [saldoReal, setSaldoReal] = useState("");
  const [taxa, setTaxa] = useState({ modo_taxa: "cdi", taxa_aa: "", pct_cdi: "", cdi_aa: "" });

  useEffect(() => {
    if (!ativo) return;
    setSaldoReal(String(ativo.valor));
    setTaxa({
      modo_taxa: ativo.modo_taxa,
      taxa_aa: String(ativo.taxa_aa),
      pct_cdi: String(ativo.pct_cdi),
      cdi_aa: String(ativo.cdi_aa),
    });
  }, [ativo]);

  if (!ativo) return null;

  const resumo = resumoRendimento(rendimentos, ativo.id);
  const curva = curvaLastro(rendimentos, ativo.id, 90);
  const taxaAa = taxaAnualAtivo(ativo);
  const porDia = jurosDoDia(ativo);
  const est = rendimentoEstimado(ativo);
  const desatualizado = est.corridos >= 7;

  const rodar = async () => {
    try {
      const dias = await render.mutateAsync();
      toast.success(
        dias > 0
          ? `${dias} ${dias === 1 ? "dia útil capitalizado" : "dias úteis capitalizados"}`
          : "Nenhum dia útil pendente — o lastro já está em dia",
      );
    } catch {
      toast.error("Não foi possível capitalizar agora");
    }
  };

  const fecharSaldo = async () => {
    const v = Number(saldoReal.replace(/\./g, "").replace(",", "."));
    if (!v || v <= 0) {
      toast.error("Informe o saldo do extrato");
      return;
    }
    try {
      const r = await ajustar.mutateAsync({
        ativo,
        saldoReal: v,
        rendimentoEstimado: comoRendimento ? est.valor : 0,
      });
      toast.success(
        r.movimento !== 0
          ? `Saldo atualizado — ${brl(Math.abs(r.juro))} de rendimento e ${brl(Math.abs(r.movimento))} de ${r.movimento < 0 ? "saída" : "entrada"}`
          : "Saldo real do extrato registrado",
      );
      setSheet(null);
    } catch {
      toast.error("Não foi possível registrar o ajuste");
    }
  };

  const salvarTaxaForm = async () => {
    try {
      await salvarTaxa.mutateAsync({
        id: ativo.id,
        rende: true,
        modo_taxa: taxa.modo_taxa,
        taxa_aa: Number(taxa.taxa_aa) || 0,
        pct_cdi: Number(taxa.pct_cdi) || 0,
        cdi_aa: Number(taxa.cdi_aa) || 0,
      });
      toast.success("Taxa contratada atualizada");
      setSheet(null);
    } catch {
      toast.error("Não foi possível salvar a taxa");
    }
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card rounded-2xl p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-liquidity">
            <TrendingUp className="size-4" />
            <h2 className="text-sm font-semibold uppercase tracking-wider">
              Lastro em CDB — saldo conferido por você
            </h2>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {ativo.nome} · {ativo.modo_taxa === "fixa" ? "taxa fixa" : `${ativo.pct_cdi}% do CDI`} ·{" "}
            {taxaAa.toFixed(2)}% a.a. · último fechamento em {dataBRCurta(ativo.ultimo_fechamento)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={() => setSheet("taxa")}>
            Taxa contratada
          </Button>
          <Button size="sm" onClick={() => setSheet("saldo")}>
            <Pencil className="size-3.5" />
            Atualizar saldo
          </Button>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Saldo de hoje", value: brlExato(ativo.valor), tone: "gold-text" },
          { label: "Rendeu hoje", value: brlExato(resumo.hoje), tone: "text-liquidity" },
          { label: "Rendeu no mês", value: brlExato(resumo.mes), tone: "text-liquidity" },
          { label: "Rendeu no total", value: brlExato(resumo.total), tone: "text-liquidity" },
        ].map((m) => (
          <div key={m.label} className="rounded-xl border border-border bg-card/40 p-4">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{m.label}</p>
            <p className={`num mt-1 text-lg font-semibold ${m.tone}`}>{m.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card/40 p-4">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Rendimento estimado (não aplicado)
          </p>
          <p className="num mt-1 text-lg font-semibold text-liquidity">{brlExato(est.valor)}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {est.uteis === 0
              ? `Nenhum dia útil desde a última conferência. Ritmo: ${brl(porDia)} por dia útil.`
              : `${est.uteis} ${est.uteis === 1 ? "dia útil" : "dias úteis"} desde ${dataBRCurta(ativo.ultimo_fechamento)} · ritmo de ${brl(porDia)} por dia útil.`}
          </p>
        </div>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => void rodar()}
          disabled={render.isPending || est.uteis === 0}
        >
          <RefreshCw className={`size-3.5 ${render.isPending ? "animate-spin" : ""}`} />
          Aplicar estimativa
        </Button>
      </div>

      {desatualizado && (
        <div className="mt-3 flex items-start gap-2 rounded-xl border border-gold/30 bg-gold/10 p-3 text-xs text-gold">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span>
            Faz {est.corridos} dias que o saldo do lastro não é conferido com o extrato. Abra o app do
            banco e use "Atualizar saldo" — o número do Poder de Fogo depende disso.
          </span>
        </div>
      )}

      <div className="mt-4 h-44 w-full">
        {curva.length > 1 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={curva} margin={{ left: -10, right: 8, top: 8 }}>
              <defs>
                <linearGradient id="gradLastro" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--liquidity)" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="var(--liquidity)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="data"
                tickLine={false}
                axisLine={false}
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              />
              <YAxis
                domain={["dataMin - 500", "dataMax + 500"]}
                tickLine={false}
                axisLine={false}
                width={58}
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                tickFormatter={(v: number) => `${Math.round(v / 1000)}k`}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--popover)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  color: "var(--foreground)",
                  fontSize: 12,
                }}
                formatter={(v: number) => brlExato(v)}
              />
              <Area
                type="monotone"
                dataKey="saldo"
                stroke="var(--liquidity)"
                strokeWidth={2}
                fill="url(#gradLastro)"
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-border text-xs text-muted-foreground">
            A curva aparece a partir do primeiro fechamento diário. Use "Render agora" para começar.
          </div>
        )}
      </div>

      <Sheet open={sheet !== null} onOpenChange={(o) => !o && setSheet(null)}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>
              {sheet === "saldo" ? "Fechar saldo real" : "Taxa contratada do CDB"}
            </SheetTitle>
            <SheetDescription>
              {sheet === "saldo"
                ? "Digite o valor exato do extrato. A diferença é registrada como ajuste no histórico."
                : "Define quanto o lastro capitaliza por dia útil."}
            </SheetDescription>
          </SheetHeader>

          {sheet === "saldo" ? (
            <div className="space-y-4 px-4">
              <div className="space-y-2">
                <Label htmlFor="saldo-real">Saldo do extrato (R$)</Label>
                <Input
                  id="saldo-real"
                  inputMode="decimal"
                  value={saldoReal}
                  onChange={(e) => setSaldoReal(e.target.value)}
                />
              </div>
              <label className="flex cursor-pointer items-start gap-2 rounded-xl border border-border bg-card/40 p-3">
                <input
                  type="checkbox"
                  className="mt-0.5 size-4 accent-[var(--liquidity)]"
                  checked={comoRendimento}
                  onChange={(e) => setComoRendimento(e.target.checked)}
                />
                <span className="text-[11px] text-muted-foreground">
                  Separar {brlExato(est.valor)} de rendimento estimado do restante. O que sobrar da
                  diferença é registrado como movimentação (saque, depósito, taxas).
                </span>
              </label>
              <p className="text-[11px] text-muted-foreground">
                Saldo no cockpit hoje: {brlExato(ativo.valor)}.
              </p>
              <Button
                className="w-full"
                onClick={() => void fecharSaldo()}
                disabled={ajustar.isPending}
              >
                Registrar saldo real
              </Button>
            </div>
          ) : (
            <div className="space-y-4 px-4">
              <div className="space-y-2">
                <Label>Modo da taxa</Label>
                <Select
                  value={taxa.modo_taxa}
                  onValueChange={(v) => setTaxa({ ...taxa, modo_taxa: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cdi">% do CDI</SelectItem>
                    <SelectItem value="fixa">Taxa fixa ao ano</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {taxa.modo_taxa === "cdi" ? (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="pct">% do CDI</Label>
                    <Input
                      id="pct"
                      inputMode="decimal"
                      value={taxa.pct_cdi}
                      onChange={(e) => setTaxa({ ...taxa, pct_cdi: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cdi">CDI hoje (% a.a.)</Label>
                    <Input
                      id="cdi"
                      inputMode="decimal"
                      value={taxa.cdi_aa}
                      onChange={(e) => setTaxa({ ...taxa, cdi_aa: e.target.value })}
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="fixa">Taxa fixa (% a.a.)</Label>
                  <Input
                    id="fixa"
                    inputMode="decimal"
                    value={taxa.taxa_aa}
                    onChange={(e) => setTaxa({ ...taxa, taxa_aa: e.target.value })}
                  />
                </div>
              )}
              <Button
                className="w-full"
                onClick={() => void salvarTaxaForm()}
                disabled={salvarTaxa.isPending}
              >
                Salvar taxa
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </motion.section>
  );
}
