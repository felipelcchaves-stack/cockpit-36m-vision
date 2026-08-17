import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { Camera, KeyRound, Loader2, LogOut, Moon, Sun, Trash2, User } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import {
  aplicarTema,
  useAvatarUrl,
  useEnviarAvatar,
  usePerfil,
  useRemoverAvatar,
  useSalvarPerfil,
  type Tema,
} from "@/lib/perfil-queries";

export const Route = createFileRoute("/_authenticated/perfil")({
  head: () => ({
    meta: [
      { title: "Meu perfil | Cockpit 36M" },
      {
        name: "description",
        content: "Foto, nome, senha e tema visual do seu acesso ao Cockpit 36M.",
      },
      { property: "og:title", content: "Meu perfil | Cockpit 36M" },
      { property: "og:description", content: "Configurações da sua conta no Cockpit 36M." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: Perfil,
});

function Perfil() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: perfil } = usePerfil();
  const { data: avatarUrl } = useAvatarUrl(perfil?.avatar_url);
  const salvar = useSalvarPerfil();
  const enviarAvatar = useEnviarAvatar();
  const removerAvatar = useRemoverAvatar();
  const fileRef = useRef<HTMLInputElement>(null);

  const [nome, setNome] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmaSenha, setConfirmaSenha] = useState("");
  const [trocando, setTrocando] = useState(false);

  useEffect(() => {
    if (perfil?.nome) setNome(perfil.nome);
  }, [perfil?.nome]);

  const trocarTema = (tema: Tema) => {
    aplicarTema(tema);
    salvar.mutate({ tema });
  };

  const salvarNome = () => {
    salvar.mutate(
      { nome },
      {
        onSuccess: () => toast.success("Perfil atualizado."),
        onError: (e) => toast.error(e instanceof Error ? e.message : "Falhou"),
      },
    );
  };

  const upload = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Envie um arquivo de imagem.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Imagem acima de 5 MB.");
      return;
    }
    enviarAvatar.mutate(file, {
      onSuccess: () => toast.success("Foto atualizada."),
      onError: (e) => toast.error(e instanceof Error ? e.message : "Falhou o upload"),
    });
  };

  const trocarSenha = async () => {
    if (novaSenha.length < 8) {
      toast.error("A nova senha precisa de 8+ caracteres.");
      return;
    }
    if (novaSenha !== confirmaSenha) {
      toast.error("As senhas não conferem.");
      return;
    }
    setTrocando(true);
    const { error } = await supabase.auth.updateUser({ password: novaSenha });
    setTrocando(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setNovaSenha("");
    setConfirmaSenha("");
    toast.success("Senha alterada.");
  };

  const sair = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  const iniciais = (perfil?.nome ?? perfil?.email ?? "?").slice(0, 2).toUpperCase();

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <PageHeader
        eyebrow="Sua conta"
        title="Meu perfil"
        description="Identidade, senha e a aparência do cockpit — só você enxerga e altera estes dados."
      />

      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-border bg-card p-5"
      >
        <div className="flex flex-wrap items-center gap-5">
          <div className="relative">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={`Foto de ${perfil?.nome ?? "perfil"}`}
                className="size-20 rounded-2xl object-cover"
              />
            ) : (
              <div className="flex size-20 items-center justify-center rounded-2xl bg-secondary text-xl font-semibold text-muted-foreground">
                {iniciais}
              </div>
            )}
            {enviarAvatar.isPending && (
              <span className="absolute inset-0 flex items-center justify-center rounded-2xl bg-background/70">
                <Loader2 className="size-5 animate-spin" />
              </span>
            )}
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">{perfil?.email}</p>
            <div className="flex flex-wrap gap-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => upload(e.target.files?.[0])}
              />
              <Button variant="secondary" size="sm" onClick={() => fileRef.current?.click()}>
                <Camera className="size-4" /> Enviar foto
              </Button>
              {perfil?.avatar_url && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    removerAvatar.mutate(perfil.avatar_url!, {
                      onSuccess: () => toast.success("Foto removida."),
                    })
                  }
                >
                  <Trash2 className="size-4" /> Remover
                </Button>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">JPG ou PNG, até 5 MB. Armazenamento privado.</p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="nome">Nome de exibição</Label>
            <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>
          <div className="flex items-end">
            <Button onClick={salvarNome} disabled={salvar.isPending}>
              <User className="size-4" /> Salvar
            </Button>
          </div>
        </div>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-border bg-card p-5"
      >
        <h2 className="text-sm font-semibold">Aparência</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Dark é o padrão de guerra. Clean mantém as mesmas cores estratégicas em fundo claro.
        </p>
        <div className="mt-4 flex gap-2">
          {(
            [
              { id: "dark" as Tema, label: "Dark", icon: Moon },
              { id: "clean" as Tema, label: "Clean", icon: Sun },
            ]
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => trocarTema(t.id)}
              className={`flex items-center gap-2 rounded-full border px-4 py-2 text-xs transition ${
                perfil?.tema === t.id
                  ? "border-gold/50 bg-gold/15 text-gold"
                  : "border-border bg-secondary/50 text-muted-foreground hover:text-foreground"
              }`}
            >
              <t.icon className="size-4" />
              {t.label}
            </button>
          ))}
        </div>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-border bg-card p-5"
      >
        <h2 className="text-sm font-semibold">Trocar senha</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="nova">Nova senha</Label>
            <Input
              id="nova"
              type="password"
              value={novaSenha}
              onChange={(e) => setNovaSenha(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirma">Confirmar nova senha</Label>
            <Input
              id="confirma"
              type="password"
              value={confirmaSenha}
              onChange={(e) => setConfirmaSenha(e.target.value)}
              autoComplete="new-password"
            />
          </div>
        </div>
        <Button className="mt-4" onClick={trocarSenha} disabled={trocando}>
          {trocando ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />}
          Alterar senha
        </Button>
      </motion.section>

      <div>
        <Button variant="destructive" onClick={sair}>
          <LogOut className="size-4" /> Encerrar sessão
        </Button>
      </div>
    </div>
  );
}
