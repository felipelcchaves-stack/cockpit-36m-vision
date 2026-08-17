import { createFileRoute } from "@tanstack/react-router";
import { motion } from "motion/react";

import { PageHeader } from "@/components/page-header";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { useCockpit } from "@/lib/cockpit-store";

export const Route = createFileRoute("/roadmap")({
  head: () => ({
    meta: [
      { title: "Roadmap Dia D | Cockpit 36M" },
      {
        name: "description",
        content: "As 5 fases da virada: da ofensiva sazonal ao império dos 36 milhões.",
      },
      { property: "og:title", content: "Roadmap Dia D | Cockpit 36M" },
      { property: "og:description", content: "Timeline gamificada das 5 fases." },
    ],
  }),
  component: Roadmap,
});

function Roadmap() {
  const { phases, toggleTask } = useCockpit();
  const allTasks = phases.flatMap((p) => p.tasks);
  const overall = (allTasks.filter((t) => t.done).length / allTasks.length) * 100;

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <PageHeader
        eyebrow="As 5 Fases"
        title="Roadmap Dia D"
        description="Cada check é um degrau irreversível rumo ao império."
      />

      <div className="glass-card rounded-2xl p-5">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Progresso geral do roadmap</span>
          <span className="num font-semibold text-gold">{overall.toFixed(0)}%</span>
        </div>
        <Progress value={overall} className="mt-3 h-2 bg-secondary" />
      </div>

      <div className="relative pl-8 sm:pl-12">
        <div className="absolute left-3 top-2 bottom-2 w-px bg-gradient-to-b from-liquidity via-gold to-border sm:left-5" />
        <div className="space-y-6">
          {phases.map((phase, i) => {
            const done = phase.tasks.filter((t) => t.done).length;
            const pct = (done / phase.tasks.length) * 100;
            const complete = pct === 100;
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
                      <h2 className="text-lg font-semibold">{phase.title}</h2>
                      <p className="text-xs text-muted-foreground">{phase.subtitle}</p>
                    </div>
                    <span className="num text-xs text-muted-foreground">
                      {done}/{phase.tasks.length} concluídos
                    </span>
                  </div>
                  <Progress value={pct} className="mt-4 h-1.5 bg-secondary" />
                  <ul className="mt-4 space-y-3">
                    {phase.tasks.map((t) => (
                      <li key={t.id} className="flex items-center gap-3">
                        <Checkbox
                          id={t.id}
                          checked={t.done}
                          onCheckedChange={() => toggleTask(phase.id, t.id)}
                        />
                        <label
                          htmlFor={t.id}
                          className={`cursor-pointer text-sm ${t.done ? "text-muted-foreground line-through" : ""}`}
                        >
                          {t.label}
                        </label>
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
