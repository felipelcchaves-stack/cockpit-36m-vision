import { AnimatePresence, motion } from "motion/react";
import { Skull } from "lucide-react";

const PIECES = Array.from({ length: 28 }, (_, i) => ({
  id: i,
  x: (i * 37) % 100,
  delay: (i % 7) * 0.05,
  rotate: (i % 2 ? 1 : -1) * (120 + i * 7),
  tone: i % 3 === 0 ? "bg-gold" : i % 3 === 1 ? "bg-liquidity" : "bg-debt",
}));

/** Banner + micro-confete disparado ao zerar um credor. */
export function AlvoExterminado({ nome, onDone }: { nome: string | null; onDone: () => void }) {
  return (
    <AnimatePresence>
      {nome && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="pointer-events-none fixed inset-0 z-50 flex items-start justify-center overflow-hidden"
          onAnimationComplete={() => setTimeout(onDone, 2600)}
        >
          {PIECES.map((p) => (
            <motion.span
              key={p.id}
              initial={{ y: -40, opacity: 0 }}
              animate={{ y: "60vh", opacity: [0, 1, 1, 0], rotate: p.rotate }}
              transition={{ duration: 2.2, delay: p.delay, ease: "easeIn" }}
              className={`absolute top-0 size-2 rounded-[2px] ${p.tone}`}
              style={{ left: `${p.x}%` }}
            />
          ))}
          <motion.div
            initial={{ y: -30, scale: 0.9, opacity: 0 }}
            animate={{ y: 32, scale: 1, opacity: 1 }}
            exit={{ y: -30, opacity: 0 }}
            className="glass-card flex items-center gap-3 rounded-2xl border-liquidity/40 px-6 py-4 shadow-2xl"
          >
            <Skull className="size-5 text-liquidity" />
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-liquidity">Alvo Exterminado</p>
              <p className="text-base font-semibold">{nome}</p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
