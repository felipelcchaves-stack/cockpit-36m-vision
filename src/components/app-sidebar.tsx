import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  LayoutDashboard,
  Users,
  Target,
  Route as RouteIcon,
  Receipt,
  Bot,
  Bomb,
  Crosshair,
  Crown,
  LogOut,
  UserRound,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { supabase } from "@/integrations/supabase/client";
import { useAvatarUrl, usePerfil } from "@/lib/perfil-queries";

const items = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Entradas/Rituais", url: "/entradas", icon: Users },
  { title: "Ofensiva → Dia D", url: "/ofensiva", icon: Crosshair },
  { title: "Passivos/Credores", url: "/passivos", icon: Target },
  { title: "Operação Dia D", url: "/dia-d", icon: Bomb },
  { title: "Roadmap Dia D", url: "/roadmap", icon: RouteIcon },
  { title: "Histórico", url: "/historico", icon: Receipt },
  { title: "Sala de Comando", url: "/comando", icon: Bot },
];


export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: perfil } = usePerfil();
  const { data: avatarUrl } = useAvatarUrl(perfil?.avatar_url);

  const sair = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <Sidebar collapsible="icon" className="border-sidebar-border">
      <SidebarHeader className="px-3 py-4">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gold/15 text-gold">
            <Crown className="size-5" />
          </span>
          {!collapsed && (
            <div className="leading-tight">
              <p className="font-display text-sm font-semibold">Cockpit 36M</p>
              <p className="text-[11px] text-muted-foreground">Wealth Command</p>
            </div>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>Operação</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.url}
                    tooltip={item.title}
                    className="data-[active=true]:bg-gold/10 data-[active=true]:text-gold"
                  >
                    <Link to={item.url} className="flex items-center gap-3">
                      <item.icon className="size-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={pathname === "/perfil"}
              tooltip={perfil?.nome ?? "Meu perfil"}
              className="data-[active=true]:bg-gold/10 data-[active=true]:text-gold"
            >
              <Link to="/perfil" className="flex items-center gap-3">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="size-5 rounded-md object-cover" />
                ) : (
                  <UserRound className="size-4" />
                )}
                <span className="truncate">{perfil?.nome ?? "Meu perfil"}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Sair" onClick={sair}>
              <LogOut className="size-4" />
              <span>Sair</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

