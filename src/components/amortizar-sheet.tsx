import { useEffect, useState } from "react";
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
import { brl, useCockpit } from "@/lib/cockpit-store";
import { isReservaBlindada, useAtivos, useDebitarAtivo } from "@/lib/cockpit-queries";

export type AlvoAmortizacao = { id: string; nome: string; saldo: number };

const hoje = () => new Date().toISOString().slice(0, 10);

/**
 * Lançamento manual de amortização: valor, origem do dinheiro e data.
 * Compartilhado entre a Kill List (Passivos) e a Ofensiva → Dia D.
 */
export function AmortizarSheet({
  alvo,
  onClose,
}: {
  alvo: AlvoAmortizacao | null;
  onClose: () => void;
}) {
  const { amortize, addTx } = useCockpit();
  const { data: ativos = [] } = useAtivos();
  const debitar = useDebitarAtivo();

  // O Fundo de Reserva é blindado e nunca aparece como fonte.
  const fontes = ativos.filter((a) => !isReservaBlindada(a));

  const [valor, setValor] = useState("");
  const [data, setData] = useState(hoje());
  const [origem, setOrigem] = useState("externo");

  useEffect(() => {
    if (!alvo) return;
    setValor("");
    setData(hoje());
    const preferida =
      fontes.find((a) => `${a.nome} ${a.tipo ?? ""}`.toLowerCase().includes("investimento")) ??
      fontes[0];
    setOrigem(preferida ? `ativo:${preferida.id}` : "externo");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alvo?.id]);

  const confirmar = async () => {
    if (!alvo) return;
    const v = Number(valor.replace(/\./g, "").replace(",", "."));
    if (!v || v <= 0) {
      toast.error("Informe o valor da amortização");
      return;
    }
    const pago = Math.min(v, alvo.saldo);
    const fonte = origem.startsWith("ativo:")
      ? fontes.find((a) => a.id === Number(origem.slice(6)))
      : undefined;

    if (fonte && fonte.valor < pago) {
      toast.error(`${fonte.nome} tem apenas ${brl(fonte.valor)} disponíveis`);
      return;
    }

    amortize(alvo.id, pago, data);
    if (fonte) {
      try {
        await debitar.mutateAsync({
          ativo: fonte,
          valor: pago,
          motivo: `Amortização ${alvo.nome}`,
        });
        // Contrapartida do resgate: o saldo sai do ativo e entra no caixa que pagou a dívida.
        addTx({
          date: data,
          description: `Resgate ${fonte.nome} — Amortização ${alvo.nome}`,
          kind: "Receita",
          amount: pago,
        });
      } catch {
        toast.error("Passivo abatido, mas não consegui debitar a origem do dinheiro");
      }
    }
    toast.success(
      fonte
        ? `${brl(pago)} saíram de ${fonte.nome} para abater ${alvo.nome}`
        : `Amortização de ${brl(pago)} registrada em ${alvo.nome}`,
    );
    onClose();
  };

  return (
    <Sheet open={alvo !== null} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Amortizar {alvo?.nome}</SheetTitle>
          <SheetDescription>
            Saldo devedor atual: {alvo ? brl(alvo.saldo) : "—"}. A amortização entra no histórico e
            atualiza a cascata do Dia D na hora.
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-5 px-4">
          <div className="space-y-2">
            <Label htmlFor="amort">Valor da amortização (R$)</Label>
            <Input
              id="amort"
              inputMode="decimal"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              placeholder="30000"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="amort-data">Data do pagamento</Label>
            <Input
              id="amort-data"
              type="date"
              value={data}
              onChange={(e) => setData(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>De onde saiu o dinheiro</Label>
            <Select value={origem} onValueChange={setOrigem}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {fontes.map((a) => (
                  <SelectItem key={a.id} value={`ativo:${a.id}`}>
                    {a.nome} · {brl(a.valor)}
                  </SelectItem>
                ))}
                <SelectItem value="externo">Outro / dinheiro externo</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              {origem === "externo"
                ? "Nenhum caixa do cockpit será debitado."
                : "O saldo dessa conta cai no mesmo valor e o saque entra no extrato do lastro."}
            </p>
            <p className="text-[11px] text-muted-foreground">
              O Fundo de Reserva de R$ 40.000 é blindado e não entra nesta lista.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => setValor(String(alvo?.saldo ?? 0))}
            >
              Extermínio total
            </Button>
            <Button className="flex-1" onClick={() => void confirmar()} disabled={debitar.isPending}>
              Registrar
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
