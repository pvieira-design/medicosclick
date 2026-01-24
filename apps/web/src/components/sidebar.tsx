"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { trpc } from "@/utils/trpc"
import { authClient } from "@/lib/auth-client"
import { ModeToggle } from "./mode-toggle"
import { ClickLogo, ClickLogoIcon } from "./icons/click-logo"
import {
  Calendar,
  PlusCircle,
  MinusCircle,
  FileText,
  Users,
  User,
  LayoutDashboard,
  AlertCircle,
  Siren,
  Stethoscope,
  Settings,
  Menu,
  ChevronLeft,
  ChevronRight,
  Shield,
  LogOut,
  ChevronsUpDown,
  BarChart3,
  Bell
} from "lucide-react"

type UserRole = "medico" | "atendente" | "diretor" | "admin" | "super_admin"

interface SidebarProps {
  className?: string
}

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [isCollapsed, setIsCollapsed] = React.useState(false)
  const [isMobileOpen, setIsMobileOpen] = React.useState(false)
  
  const { data, isLoading } = useQuery(trpc.me.queryOptions())
  
  // @ts-ignore - Backend is ready but types might not be generated yet
  const { data: unreadCount } = useQuery(trpc.notificacoes.contarNaoLidas.queryOptions(undefined, {
    refetchInterval: 30000
  }))

  const userRole = data?.user?.tipo as UserRole | undefined
  const userName = data?.user?.name || "Usuário"
  const userEmail = data?.user?.email || ""
  const userInitial = userName.charAt(0).toUpperCase()

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed)
  }

  const handleSignOut = () => {
    authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          router.push("/login")
        },
      },
    })
  }

  const getMenuItems = (role?: UserRole) => {
    if (!role) return []

    const items = []

    if (role === "medico") {
      items.push(
        { title: "Meu Desempenho", icon: LayoutDashboard, href: "/dashboard/meu-desempenho" },
        { title: "Meus Horários", icon: Calendar, href: "/dashboard/horarios" },
        { title: "Solicitar Abertura", icon: PlusCircle, href: "/dashboard/solicitar" },
        { title: "Fechar Horários", icon: MinusCircle, href: "/dashboard/fechar" },
        { title: "Cancelar Emergencial", icon: Siren, href: "/dashboard/cancelamento-emergencial" },
        { title: "Minhas Solicitações", icon: FileText, href: "/dashboard/solicitacoes" }
      )
    }

    const isStaff = ["atendente", "diretor", "admin", "super_admin"].includes(role)
    if (isStaff) {
      items.push(
        { title: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
        { title: "Analytics", icon: BarChart3, href: "/dashboard/analytics" },
        { title: "Solicitações Pendentes", icon: AlertCircle, href: "/dashboard/pendentes" },
        { title: "Cancelamentos", icon: Siren, href: "/dashboard/cancelamentos" },
        { title: "Médicos", icon: Stethoscope, href: "/dashboard/medicos" }
      )
    }

    const isAdmin = ["admin", "super_admin"].includes(role)
    if (isAdmin) {
      items.push(
        { title: "Configurações", icon: Settings, href: "/dashboard/config" },
        { title: "Gestão de Usuários", icon: Shield, href: "/dashboard/usuarios" }
      )
    }

    return items
  }

  const menuItems = getMenuItems(userRole)

  if (isLoading) {
    return (
      <div className={cn("hidden h-full border-r bg-muted/10 md:block", isCollapsed ? "w-[64px]" : "w-[240px]", className)}>
        <div className="flex h-14 items-center px-4 border-b">
           <div className="h-6 w-24 rounded bg-muted animate-pulse" />
        </div>
      </div>
    )
  }

  const UserSection = ({ collapsed = false, onSignOut }: { collapsed?: boolean, onSignOut: () => void }) => (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            className={cn(
              "flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-accent transition-colors",
              collapsed ? "justify-center" : ""
            )}
          >
            <Avatar className="h-9 w-9 border border-border shrink-0">
              <AvatarImage src="" />
              <AvatarFallback className="bg-brand-100 text-brand-800 dark:bg-brand-900 dark:text-brand-200">
                {userInitial}
              </AvatarFallback>
            </Avatar>
            
            {!collapsed && (
              <>
                <div className="flex flex-col overflow-hidden flex-1">
                  <span className="truncate text-sm font-medium leading-none">
                    {userName}
                  </span>
                  <span className="truncate text-xs text-muted-foreground mt-1 capitalize">
                    {userRole?.replace('_', ' ')}
                  </span>
                </div>
                <ChevronsUpDown className="h-4 w-4 text-muted-foreground shrink-0" />
              </>
            )}
          </button>
        }
      />
      <DropdownMenuContent align="end" side={collapsed ? "right" : "top"} className="w-56">
        <div className="px-2 py-2">
          <p className="text-sm font-medium leading-none">{userName}</p>
          <p className="text-xs leading-none text-muted-foreground mt-1">{userEmail}</p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={onSignOut}>
          <LogOut className="mr-2 h-4 w-4" />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )

  return (
    <>
      <div className="md:hidden fixed bottom-4 right-4 z-50">
        <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
          <SheetTrigger className="h-12 w-12 rounded-full bg-primary hover:bg-primary/90 text-white flex items-center justify-center">
             <Menu className="h-6 w-6" />
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-[280px]">
            <div className="flex h-full flex-col bg-background">
              <div className="flex h-14 items-center border-b px-4 justify-between">
                <ClickLogo 
                  size="md" 
                  className="text-brand-600 dark:text-brand-400" 
                />
                <div className="flex items-center gap-1">
                  <Link
                    href="/dashboard/notificacoes"
                    onClick={() => setIsMobileOpen(false)}
                    className="relative p-2 rounded-lg hover:bg-accent transition-colors"
                    title="Notificações"
                  >
                    <Bell className="h-5 w-5 text-muted-foreground" />
                    {(unreadCount ?? 0) > 0 && (
                      <span className="absolute top-1 right-1 h-4 w-4 rounded-full bg-red-600 text-white text-[10px] font-medium flex items-center justify-center">
                        {(unreadCount ?? 0) > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </Link>
                  <ModeToggle />
                </div>
              </div>
              <ScrollArea className="flex-1 py-4">
                <nav className="grid gap-1 px-2">
                  {menuItems.map((item, index) => {
                     const isActive = pathname === item.href
                     return (
                       <Link
                         key={index}
                         href={item.href as any}
                         onClick={() => setIsMobileOpen(false)}
                         className={cn(
                           "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors",
                           isActive ? "bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400" : "transparent"
                         )}
                       >
                         <item.icon className={cn("h-4 w-4", isActive ? "text-brand-600 dark:text-brand-400" : "text-muted-foreground")} />
                         <span>{item.title}</span>
                       </Link>
                     )
                  })}
                </nav>
              </ScrollArea>
              <div className="mt-auto border-t p-3">
                <UserSection onSignOut={handleSignOut} />
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <aside 
        className={cn(
          "hidden md:flex h-full flex-col border-r bg-background transition-all duration-300", 
          isCollapsed ? "w-[64px]" : "w-[240px]",
          className
        )}
      >
        <div className="flex h-full flex-col bg-background">
          <div className={cn("flex h-14 items-center border-b px-3", isCollapsed ? "justify-center" : "justify-between")}>
            {isCollapsed ? (
              <button
                onClick={toggleCollapse}
                className="p-1 rounded-lg hover:bg-accent transition-colors"
                title="Expandir menu"
              >
                <ClickLogoIcon className="w-6 h-6 text-brand-600 dark:text-brand-400" />
              </button>
            ) : (
              <>
                <ClickLogo 
                  size="md" 
                  className="text-brand-600 dark:text-brand-400" 
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="hidden md:flex h-8 w-8"
                  onClick={toggleCollapse}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
          
          <ScrollArea className="flex-1 py-4">
            <nav className="grid gap-1 px-2 group-[[data-collapsed=true]]:justify-center group-[[data-collapsed=true]]:px-2">
              {menuItems.map((item, index) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={index}
                    href={item.href as any}
                    title={isCollapsed ? item.title : undefined}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors",
                      isActive ? "bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400" : "transparent",
                      isCollapsed ? "justify-center px-2" : ""
                    )}
                  >
                    <item.icon className={cn("h-4 w-4", isActive ? "text-brand-600 dark:text-brand-400" : "text-muted-foreground")} />
                    {!isCollapsed && <span>{item.title}</span>}
                  </Link>
                )
              })}
            </nav>
          </ScrollArea>

          <div className="mt-auto border-t p-3 space-y-3">
            <div className={cn("flex items-center gap-1", isCollapsed ? "justify-center" : "justify-end")}>
              <Link
                href="/dashboard/notificacoes"
                className={cn(
                  "relative p-2 rounded-lg hover:bg-accent transition-colors",
                  pathname === "/dashboard/notificacoes" && "bg-accent"
                )}
                title="Notificações"
              >
                <Bell className={cn(
                  "h-5 w-5",
                  pathname === "/dashboard/notificacoes" ? "text-brand-600 dark:text-brand-400" : "text-muted-foreground"
                )} />
                {(unreadCount ?? 0) > 0 && (
                  <span className="absolute top-0.5 right-0.5 h-4 w-4 rounded-full bg-red-600 text-white text-[10px] font-medium flex items-center justify-center">
                    {(unreadCount ?? 0) > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Link>
              <ModeToggle />
            </div>
            <UserSection collapsed={isCollapsed} onSignOut={handleSignOut} />
          </div>
        </div>
      </aside>
    </>
  )
}
