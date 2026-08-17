import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Crown, Loader2, Lock, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Acesso restrito | Cockpit 36M" },
      {
        name: "description",
        content: "Área privada do Cockpit 36M. Entre com e-mail e senha para acessar a operação.",
      },
      { property: "og:title", content: "Acesso restrito | Cockpit 36M" },
      { property: "og:description", content: "Centro de comando financeiro privado." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AuthPage,
});

type Modo = "entrar" | "cadastrar" | "recuperar";

function AuthPage() {
  const navigate = useNavigate();
  const [modo, setModo] = useState<Modo>("entrar");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [nome, setNome] = useState("");
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/", replace: true });
    });
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCarregando(true);
    try {
      if (modo === "entrar") {
        const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
        if (error) throw error;
        navigate({ to: "/", replace: true });
      } else if (modo === "cadastrar") {
        if (senha.length < 8) throw new Error("A senha precisa de pelo menos 8 caracteres.");
        const { error } = await supabase.auth.signUp({
          email,
          password: senha,
          options: {
            data: { nome: nome || email.split("@")[0] },
            emailRedirectTo: `${window.location.origin}/auth`,
          },
        });
        if (error) throw error;
        toast.success("Cofre criado. Acesso liberado.");
        navigate({ to: "/", replace: true });
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth`,
        });
        if (error) throw error;
        toast.success("Enviamos o link de recuperação para o seu e-mail.");
        setModo("entrar");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível concluir.");
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md rounded-2xl border border-border bg-card p-7 shadow-xl"
      >
        <div className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-xl bg-gold/15 text-gold">
            <Crown className="size-6" />
          </span>
          <div>
            <h1 className="font-display text-lg font-semibold">Cockpit 36M</h1>
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              Acesso restrito
            </p>
          </div>
        </div>

        <p className="mt-5 flex items-start gap-2 rounded-xl border border-border/60 bg-secondary/40 p-3 text-xs text-muted-foreground">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-liquidity" />
          Operação privada. Sem sessão válida, nenhum número deste cockpit é acessível.
        </p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          {modo === "cadastrar" && (
            <div className="space-y-1.5">
              <Label htmlFor="nome">Nome</Label>
              <Input
                id="nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Como quer ser chamado"
                autoComplete="name"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>

          {modo !== "recuperar" && (
            <div className="space-y-1.5">
              <Label htmlFor="senha">Senha</Label>
              <Input
                id="senha"
                type="password"
                required
                minLength={8}
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                autoComplete={modo === "entrar" ? "current-password" : "new-password"}
              />
              {modo === "cadastrar" && (
                <p className="text-[11px] text-muted-foreground">
                  Mínimo de 8 caracteres. Senhas presentes em vazamentos públicos são recusadas.
                </p>
              )}
            </div>
          )}

          <Button type="submit" disabled={carregando} className="w-full">
            {carregando ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Lock className="size-4" />
            )}
            {modo === "entrar" ? "Entrar" : modo === "cadastrar" ? "Criar meu acesso" : "Enviar link"}
          </Button>
        </form>

        <div className="mt-5 flex flex-wrap justify-between gap-2 text-xs">
          {modo !== "entrar" ? (
            <button
              type="button"
              onClick={() => setModo("entrar")}
              className="text-gold underline underline-offset-4"
            >
              Já tenho acesso
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setModo("cadastrar")}
              className="text-gold underline underline-offset-4"
            >
              Criar meu acesso
            </button>
          )}
          {modo !== "recuperar" && (
            <button
              type="button"
              onClick={() => setModo("recuperar")}
              className="text-muted-foreground underline underline-offset-4"
            >
              Esqueci minha senha
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
