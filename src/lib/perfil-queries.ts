import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Tema = "dark" | "clean";

export type Perfil = {
  id: string;
  nome: string | null;
  avatar_url: string | null;
  tema: Tema;
  email: string;
};

const TEMA_KEY = "cockpit-tema";

export function aplicarTema(tema: Tema) {
  if (typeof document === "undefined") return;
  const el = document.documentElement;
  el.classList.toggle("clean", tema === "clean");
  el.classList.toggle("dark", tema !== "clean");
  try {
    localStorage.setItem(TEMA_KEY, tema);
  } catch {
    /* storage indisponível */
  }
}

export function temaSalvo(): Tema {
  if (typeof window === "undefined") return "dark";
  try {
    return localStorage.getItem(TEMA_KEY) === "clean" ? "clean" : "dark";
  } catch {
    return "dark";
  }
}

/** Perfil do usuário logado (nome, avatar, tema) + e-mail da sessão. */
export function usePerfil() {
  return useQuery({
    queryKey: ["perfil"],
    queryFn: async (): Promise<Perfil | null> => {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth.user;
      if (!user) return null;

      const { data, error } = await supabase
        .from("profiles")
        .select("id, nome, avatar_url, tema")
        .eq("id", user.id)
        .maybeSingle();
      if (error) throw error;

      return {
        id: user.id,
        nome: data?.nome ?? user.email?.split("@")[0] ?? null,
        avatar_url: data?.avatar_url ?? null,
        tema: data?.tema === "clean" ? "clean" : "dark",
        email: user.email ?? "",
      };
    },
    staleTime: 60_000,
  });
}

export function useSalvarPerfil() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: { nome?: string; avatar_url?: string | null; tema?: Tema }) => {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth.user;
      if (!user) throw new Error("Sessão expirada");
      const { error } = await supabase
        .from("profiles")
        .upsert({ id: user.id, ...patch }, { onConflict: "id" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["perfil"] }),
  });
}

/** URL assinada para exibir o avatar guardado no bucket privado. */
export function useAvatarUrl(path: string | null | undefined) {
  return useQuery({
    queryKey: ["avatar-url", path],
    enabled: !!path,
    staleTime: 45 * 60_000,
    queryFn: async () => {
      if (!path) return null;
      const { data, error } = await supabase.storage
        .from("avatares")
        .createSignedUrl(path, 60 * 60);
      if (error) throw error;
      return data.signedUrl;
    },
  });
}

export function useEnviarAvatar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth.user;
      if (!user) throw new Error("Sessão expirada");
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("avatares")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (error) throw error;
      const { error: e2 } = await supabase
        .from("profiles")
        .upsert({ id: user.id, avatar_url: path }, { onConflict: "id" });
      if (e2) throw e2;
      return path;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["perfil"] });
      qc.invalidateQueries({ queryKey: ["avatar-url"] });
    },
  });
}

export function useRemoverAvatar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (path: string) => {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth.user;
      if (!user) throw new Error("Sessão expirada");
      await supabase.storage.from("avatares").remove([path]);
      const { error } = await supabase
        .from("profiles")
        .upsert({ id: user.id, avatar_url: null }, { onConflict: "id" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["perfil"] });
      qc.invalidateQueries({ queryKey: ["avatar-url"] });
    },
  });
}
