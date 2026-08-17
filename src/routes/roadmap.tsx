import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "motion/react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { brl } from "@/lib/cockpit-store";
import {
  previstoFase,
  realizadoFase,
  useAtivos,
  useAtualizarTarefa,
  useCriarTarefa,
  usePassivos,
  useRemoverTarefa,
  useRoadmap,
  useParametros,
  useSalvarParametros,
  useTransacoes,
  type RoadmapFase,
  type RoadmapTarefa,
} from "@/lib/cockpit-queries";
import {
  cascataFase1DiaD,
  exterminioRealizado,
  pontede90Dias,
  viradaDeChave,
} from "@/lib/financeiro";

export const Route = createFileRoute("/roadmap")({
  head: () => ({
    meta: [
      { title: "Roadmap Dia D | Cockpit 36M" },
      {
        name: "description",
        content: "As 5 fases da virada: previsto vs realizado, da ofensiva sazonal aos 36 milhões.",
      },
      { property: "og:title", content: "Roadmap Dia D | Cockpit 36M" },
      { property: "og:description", content: "Timeline gamificada com previsto vs realizado." },
    ],
  }),
  component: Roadmap,
});

type TarefaForm = { descricao: string; valor_previsto: string; valor_realizado: string };
const emptyTarefa: TarefaForm = { descricao: "", valor_previsto: "0", valor_realizado: "0" };

function Roadmap() {
  const { data: fases = [], isLoading, error } = useRoadmap();
  const criar = useCriarTarefa();
  const atualizar = useAtualizarTarefa();
  const remover = useRemoverTarefa();

  const [sheet, setSheet] = useState<{ fase: RoadmapFase; tarefa: RoadmapTarefa | null } | null>(
    null,
  );
  const [form, setForm] = useState<TarefaForm>(emptyTarefa);
  const [deleteTarget, setDeleteTarget] = useState<RoadmapTarefa | null>(null);

  const allTasks = fases.flatMap((f) => f.tarefas);
  const overall = allTasks.length
    ? (allTasks.filter((t) => t.concluida).length / allTasks.length) * 100
    : 0;
  const totalPrevisto = fases.reduce((s, f) => s + previstoFase(f), 0);
  const totalRealizado = fases.reduce((s, f) => s + realizadoFase(f), 0);
  const pctFinanceiro = totalPrevisto > 0 ? (totalRealizado / totalPrevisto) * 100 : 0;
  const desvio = totalRealizado - totalPrevisto;

  const chartData = fases.map((f) => ({
    fase: `F${f.ordem}`,
    previsto: previstoFase(f),
    realizado: realizadoFase(f),
  }));

  const toggle = async (t: RoadmapTarefa) => {
    const concluida = !t.concluida;
    try {
      await atualizar.mutateAsync({
        id: t.id,
        concluida,
        concluida_em: concluida ? new Date().toISOString() : null,
        valor_realizado: concluida && t.valor_realizado === 0 ? t.valor_previsto : t.valor_realizado,
      });
    } catch {
      toast.error("Não foi possível salvar o check");
    }
  };

  const openNew = (fase: RoadmapFase) => {
    setForm(emptyTarefa);
    setSheet({ fase, tarefa: null });
  };

  const openEdit = (fase: RoadmapFase, tarefa: RoadmapTarefa) => {
    setForm({
      descricao: tarefa.descricao,
      valor_previsto: String(tarefa.valor_previsto),
      valor_realizado: String(tarefa.valor_realizado),
    });
    setSheet({ fase, tarefa });
  };

  const save = async () => {
    if (!sheet) return;
    if (!form.descricao.trim()) {
      toast.error("Descreva a tarefa");
      return;
    }
    const payload = {
      descricao: form.descricao.trim(),
      valor_previsto: Number(form.valor_previsto) || 0,
      valor_realizado: Number(form.valor_realizado) || 0,
    };
    try {
      if (sheet.tarefa) {
        await atualizar.mutateAsync({ id: sheet.tarefa.id, ...payload });
        toast.success("Tarefa atualizada");
      } else {
        await criar.mutateAsync({
          ...payload,
          fase_id: sheet.fase.id,
          ordem: sheet.fase.tarefas.length + 1,
        });
        toast.success("Tarefa adicionada");
      }
      setSheet(null);
    } catch {
      toast.error("Não foi possível salvar");
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await remover.mutateAsync(deleteTarget.id);
      toast.success("Tarefa removida");
    } catch {
      toast.error("Não foi possível remover");
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <PageHeader
        eyebrow="As 5 Fases"
        title="Roadmap Dia D"
        description="Cada check é um degrau irreversível — agora salvo no banco, com previsto vs realizado."
      />

      {error && <p className="text-sm text-debt">Não foi possível carregar o roadmap.</p>}
      {isLoading && <p className="text-sm text-muted-foreground">Carregando roadmap...</p>}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="glass-card space-y-4 rounded-2xl p-5">
          <div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progresso geral (tarefas)</span>
              <span className="num font-semibold text-gold">{overall.toFixed(0)}%</span>
            </div>
            <Progress value={overall} className="mt-3 h-2 bg-secondary" />
          </div>
          <div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Avanço financeiro</span>
              <span className="num font-semibold text-liquidity">{pctFinanceiro.toFixed(1)}%</span>
            </div>
            <Progress value={Math.min(100, pctFinanceiro)} className="mt-3 h-2 bg-secondary" />
          </div>
          <div className="grid grid-cols-3 gap-2 border-t border-border/60 pt-4 text-center">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Previsto</p>
              <p className="num text-sm font-semibold gold-text">{brl(totalPrevisto)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Realizado</p>
              <p className="num text-sm font-semibold text-liquidity">{brl(totalRealizado)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Desvio</p>
              <p className={`num text-sm font-semibold ${desvio < 0 ? "text-debt" : "text-liquidity"}`}>
                {brl(desvio)}
              </p>
            </div>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-5 lg:col-span-2">
          <h2 className="text-base font-semibold">Previsto x Realizado por fase</h2>
          <div className="mt-4 h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ left: -12, right: 8, top: 8 }}>
                <CartesianGrid strokeDasharray="3 6" stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="fase"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  width={62}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                  tickFormatter={(v: number) => `${Math.round(v / 1000)}k`}
                />
                <Tooltip
                  cursor={{ fill: "var(--secondary)", opacity: 0.4 }}
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    color: "var(--foreground)",
                    fontSize: 12,
                  }}
                  formatter={(v: number) => brl(v)}
                />
                <Bar dataKey="previsto" fill="var(--gold)" radius={[6, 6, 0, 0]} />
                <Bar dataKey="realizado" fill="var(--liquidity)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <PonteVirada />



      <div className="relative pl-8 sm:pl-12">
        <div className="absolute left-3 top-2 bottom-2 w-px bg-gradient-to-b from-liquidity via-gold to-border sm:left-5" />
        <div className="space-y-6">
          {fases.map((phase, i) => {
            const done = phase.tarefas.filter((t) => t.concluida).length;
            const pct = phase.tarefas.length ? (done / phase.tarefas.length) * 100 : 0;
            const prev = previstoFase(phase);
            const real = realizadoFase(phase);
            const pctFin = prev > 0 ? (real / prev) * 100 : 0;
            const complete = pct === 100 && phase.tarefas.length > 0;
            return (
              <motion.div
                key={phase.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
                className="relative"
              >
                <span
                  className={`absolute -left-[1.4rem] top-5 flex size-7 items-center justify-center rounded-full border text-[11px] font-semibold sm:-left-[1.9rem] ${
                    complete
                      ? "border-liquidity bg-liquidity/20 text-liquidity"
                      : pct > 0
                        ? "border-gold bg-gold/15 text-gold"
                        : "border-border bg-surface text-muted-foreground"
                  }`}
                >
                  {i + 1}
                </span>
                <div className="glass-card rounded-2xl p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h2 className="text-lg font-semibold">{phase.titulo}</h2>
                      <p className="text-xs text-muted-foreground">{phase.subtitulo}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="num text-xs text-muted-foreground">
                        {done}/{phase.tarefas.length} concluídos
                      </span>
                      <Button size="sm" variant="secondary" className="h-7 gap-1 text-[11px]" onClick={() => openNew(phase)}>
                        <Plus className="size-3" /> Tarefa
                      </Button>
                    </div>
                  </div>

                  <div className="mt-4 space-y-3">
                    <div>
                      <div className="flex justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
                        <span>Tarefas</span>
                        <span className="num">{pct.toFixed(0)}%</span>
                      </div>
                      <Progress value={pct} className="mt-1.5 h-1.5 bg-secondary" />
                    </div>
                    <div>
                      <div className="flex justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
                        <span>
                          Financeiro · {brl(real)} de {brl(prev)}
                        </span>
                        <span className="num">{pctFin.toFixed(0)}%</span>
                      </div>
                      <Progress value={Math.min(100, pctFin)} className="mt-1.5 h-1.5 bg-secondary" />
                    </div>
                  </div>

                  <ul className="mt-4 space-y-3">
                    {phase.tarefas.map((t) => (
                      <li key={t.id} className="flex items-center gap-3">
                        <Checkbox
                          id={t.id}
                          checked={t.concluida}
                          onCheckedChange={() => void toggle(t)}
                        />
                        <label
                          htmlFor={t.id}
                          className={`flex-1 cursor-pointer text-sm ${t.concluida ? "text-muted-foreground line-through" : ""}`}
                        >
                          {t.descricao}
                          {t.valor_previsto > 0 && (
                            <span className="num ml-2 text-[11px] text-muted-foreground">
                              {brl(t.valor_realizado)} / {brl(t.valor_previsto)}
                            </span>
                          )}
                        </label>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-7 text-muted-foreground hover:text-gold"
                          onClick={() => openEdit(phase, t)}
                          aria-label={`Editar ${t.descricao}`}
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-7 text-muted-foreground hover:text-debt"
                          onClick={() => setDeleteTarget(t)}
                          aria-label={`Remover ${t.descricao}`}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </li>
                    ))}
                    {phase.tarefas.length === 0 && (
                      <li className="rounded-xl border border-dashed border-border/70 p-4 text-center text-xs text-muted-foreground">
                        Nenhuma tarefa nesta fase
                      </li>
                    )}
                  </ul>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      <Sheet open={sheet !== null} onOpenChange={(o) => !o && setSheet(null)}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{sheet?.tarefa ? "Editar tarefa" : "Nova tarefa"}</SheetTitle>
            <SheetDescription>{sheet?.fase.titulo}</SheetDescription>
          </SheetHeader>
          <div className="space-y-5 px-4">
            <div className="space-y-2">
              <Label htmlFor="desc">Tarefa</Label>
              <Input
                id="desc"
                value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                placeholder="Ex: Quitar Oluwo"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="prev">Previsto (R$)</Label>
                <Input
                  id="prev"
                  inputMode="numeric"
                  value={form.valor_previsto}
                  onChange={(e) => setForm({ ...form, valor_previsto: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="real">Realizado (R$)</Label>
                <Input
                  id="real"
                  inputMode="numeric"
                  value={form.valor_realizado}
                  onChange={(e) => setForm({ ...form, valor_realizado: e.target.value })}
                />
              </div>
            </div>
            <Button
              className="w-full"
              onClick={() => void save()}
              disabled={criar.isPending || atualizar.isPending}
            >
              {sheet?.tarefa ? "Salvar alterações" : "Adicionar tarefa"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={deleteTarget !== null} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover tarefa?</AlertDialogTitle>
            <AlertDialogDescription>
              “{deleteTarget?.descricao}” será excluída do roadmap. A ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmDelete()}>Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ---------------- Fase 4 e 5: Ponte de 90 dias e Virada de Chave ---------------- */

function PonteVirada() {
  const { data: parametros } = useParametros();
  const salvar = useSalvarParametros();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    obra_mensal: "",
    aluguel_potiguara: "",
    faturamento_base: "",
    obra_meses_restantes: "",
    potiguara_meses_restantes: "",
  });

  const p = {
    obra_mensal: parametros?.obra_mensal ?? 22000,
    aluguel_potiguara: parametros?.aluguel_potiguara ?? 10000,
    faturamento_base: parametros?.faturamento_base ?? 67500,
    obra_meses_restantes: parametros?.obra_meses_restantes ?? 3,
    potiguara_meses_restantes: parametros?.potiguara_meses_restantes ?? 3,
  };

  const meses = pontede90Dias(p, 4);
  const virada = viradaDeChave(p);

  const openSheet = () => {
    setForm({
      obra_mensal: String(p.obra_mensal),
      aluguel_potiguara: String(p.aluguel_potiguara),
      faturamento_base: String(p.faturamento_base),
      obra_meses_restantes: String(p.obra_meses_restantes),
      potiguara_meses_restantes: String(p.potiguara_meses_restantes),
    });
    setOpen(true);
  };

  const salvarForm = async () => {
    if (!parametros) {
      toast.error("Parâmetros ainda não carregados");
      return;
    }
    try {
      await salvar.mutateAsync({
        id: parametros.id,
        obra_mensal: Number(form.obra_mensal) || 0,
        aluguel_potiguara: Number(form.aluguel_potiguara) || 0,
        faturamento_base: Number(form.faturamento_base) || 0,
        obra_meses_restantes: Number(form.obra_meses_restantes) || 0,
        potiguara_meses_restantes: Number(form.potiguara_meses_restantes) || 0,
      });
      toast.success("Parâmetros atualizados");
      setOpen(false);
    } catch {
      toast.error("Não foi possível salvar");
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="glass-card rounded-2xl p-5 lg:col-span-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">Fase 4 — Ponte de 90 dias</h2>
            <p className="text-xs text-muted-foreground">
              Faturamento base contra obra e aluguel da Potiguara, mês a mês, sem dívidas.
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={openSheet}>
            Ajustar parâmetros
          </Button>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="pb-3 font-medium">Mês</th>
                <th className="pb-3 text-right font-medium">Entradas</th>
                <th className="pb-3 text-right font-medium">Obra</th>
                <th className="pb-3 text-right font-medium">Potiguara</th>
                <th className="pb-3 text-right font-medium">Caixa livre</th>
              </tr>
            </thead>
            <tbody>
              {meses.map((m) => (
                <tr key={m.mes} className="border-t border-border/60">
                  <td className="py-3">
                    {m.rotulo}
                    {m.marcos.length > 0 && (
                      <span className="ml-2 rounded-full border border-gold/30 bg-gold/10 px-2 py-0.5 text-[10px] text-gold">
                        {m.marcos.join(" · ")}
                      </span>
                    )}
                  </td>
                  <td className="num py-3 text-right text-liquidity">{brl(m.entradas)}</td>
                  <td className="num py-3 text-right text-debt">
                    {m.obra > 0 ? `-${brl(m.obra)}` : "—"}
                  </td>
                  <td className="num py-3 text-right text-debt">
                    {m.potiguara > 0 ? `-${brl(m.potiguara)}` : "—"}
                  </td>
                  <td className="num py-3 text-right font-semibold">{brl(m.livre)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-2xl border border-gold/25 bg-gold/[0.06] p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gold">
          Fase 5 — Virada de Chave
        </h2>
        <p className="num mt-3 text-2xl font-semibold gold-text">+{brl(virada.destravado)}</p>
        <p className="mt-1 text-[11px] text-muted-foreground">
          destravados por mês com o fim da obra e a devolução da Potiguara.
        </p>
        <div className="mt-4 space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Caixa livre hoje</span>
            <span className="num">{brl(virada.livreHoje)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Caixa livre pós-virada</span>
            <span className="num text-liquidity">{brl(virada.livreDepois)}</span>
          </div>
          <div className="flex justify-between border-t border-border/60 pt-2">
            <span className="text-muted-foreground">Folga sobre o aporte de 70k</span>
            <span className={`num ${virada.folga >= 0 ? "text-liquidity" : "text-debt"}`}>
              {brl(virada.folga)}
            </span>
          </div>
        </div>
        <p className="mt-3 text-[11px] text-muted-foreground">
          {virada.cobreAporte
            ? "O faturamento base já sustenta os R$ 70.000/mês rumo aos 36M."
            : "Ainda falta caixa para os R$ 70.000/mês — aumente o faturamento antes da demissão."}
        </p>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Parâmetros do fluxo mensal</SheetTitle>
            <SheetDescription>Usados na Ponte de 90 dias e na Virada de Chave.</SheetDescription>
          </SheetHeader>
          <div className="space-y-4 px-4">
            <div className="space-y-2">
              <Label htmlFor="obra">Obra por mês (R$)</Label>
              <Input
                id="obra"
                inputMode="numeric"
                value={form.obra_mensal}
                onChange={(e) => setForm({ ...form, obra_mensal: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pot">Aluguel Potiguara (R$)</Label>
              <Input
                id="pot"
                inputMode="numeric"
                value={form.aluguel_potiguara}
                onChange={(e) => setForm({ ...form, aluguel_potiguara: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fat">Faturamento base (R$/mês)</Label>
              <Input
                id="fat"
                inputMode="numeric"
                value={form.faturamento_base}
                onChange={(e) => setForm({ ...form, faturamento_base: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="mo">Meses de obra restantes</Label>
                <Input
                  id="mo"
                  inputMode="numeric"
                  value={form.obra_meses_restantes}
                  onChange={(e) => setForm({ ...form, obra_meses_restantes: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mp">Meses de Potiguara</Label>
                <Input
                  id="mp"
                  inputMode="numeric"
                  value={form.potiguara_meses_restantes}
                  onChange={(e) => setForm({ ...form, potiguara_meses_restantes: e.target.value })}
                />
              </div>
            </div>
            <Button className="w-full" onClick={() => void salvarForm()} disabled={salvar.isPending}>
              Salvar parâmetros
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
