"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Info,
  Bell,
  Check,
  Clock,
  Star
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

type NotificationType = 
  | 'solicitacao_criada' 
  | 'solicitacao_aprovada' 
  | 'solicitacao_rejeitada' 
  | 'cancelamento_criado' 
  | 'cancelamento_aprovado' 
  | 'cancelamento_rejeitado'
  | 'satisfacao_pendente';

interface Notification {
  id: string;
  tipo: NotificationType;
  titulo: string;
  mensagem: string;
  lida: boolean;
  referenciaId: string | null;
  referenciaTipo: 'solicitacao' | 'cancelamento' | null;
  createdAt: string | Date;
}

export default function NotificationsPage() {
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const router = useRouter();
  const queryClient = useQueryClient();
  const perPage = 10;

  // @ts-ignore - Backend is ready but types might not be generated yet
  const { data, isLoading, isError } = useQuery(
    // @ts-ignore
    trpc.notificacoes.listar.queryOptions({
      page,
      perPage,
      apenasNaoLidas: filter === "unread"
    })
  );

  // @ts-ignore
  const markAsReadMutation = useMutation({
    // @ts-ignore
    ...trpc.notificacoes.marcarComoLida.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [['notificacoes']] });
    },
    onError: (error: any) => {
      toast.error("Erro ao marcar como lida");
    },
  });

  // @ts-ignore
  const markAllAsReadMutation = useMutation({
    // @ts-ignore
    ...trpc.notificacoes.marcarTodasComoLidas.mutationOptions(),
    onSuccess: () => {
      toast.success("Todas as notificações marcadas como lidas");
      queryClient.invalidateQueries({ queryKey: [['notificacoes']] });
    },
    onError: (error: any) => {
      toast.error("Erro ao marcar todas como lidas");
    },
  });

  const handleMarkAsRead = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    markAsReadMutation.mutate({ notificacaoId: id });
  };

  const handleMarkAllAsRead = () => {
    // @ts-ignore
    markAllAsReadMutation.mutate();
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.lida) {
      markAsReadMutation.mutate({ notificacaoId: notification.id });
    }

    if (notification.tipo === 'satisfacao_pendente') {
      router.push(`/dashboard/satisfacao`);
      return;
    }

    if (!notification.referenciaId) return;

    switch (notification.tipo) {
      case 'solicitacao_criada':
        router.push(`/dashboard/pendentes?id=${notification.referenciaId}`);
        break;
      case 'solicitacao_aprovada':
      case 'solicitacao_rejeitada':
        router.push(`/dashboard/solicitacoes?id=${notification.referenciaId}`);
        break;
      case 'cancelamento_criado':
        router.push(`/dashboard/cancelamentos?id=${notification.referenciaId}`);
        break;
      case 'cancelamento_aprovado':
      case 'cancelamento_rejeitado':
        router.push(`/dashboard/solicitacoes?tab=cancelamento&id=${notification.referenciaId}`);
        break;
    }
  };

  const getIcon = (type: NotificationType) => {
    switch (type) {
      case 'solicitacao_aprovada':
      case 'cancelamento_aprovado':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case 'solicitacao_rejeitada':
      case 'cancelamento_rejeitado':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'cancelamento_criado':
        return <AlertCircle className="h-5 w-5 text-amber-600" />;
      case 'satisfacao_pendente':
        return <Star className="h-5 w-5 text-purple-600" />;
      case 'solicitacao_criada':
      default:
        return <Info className="h-5 w-5 text-brand-600" />;
    }
  };

  const getBgColor = (type: NotificationType) => {
    switch (type) {
      case 'solicitacao_aprovada':
      case 'cancelamento_aprovado':
        return "bg-green-50 border-green-100";
      case 'solicitacao_rejeitada':
      case 'cancelamento_rejeitado':
        return "bg-red-50 border-red-100";
      case 'cancelamento_criado':
        return "bg-amber-50 border-amber-100";
      case 'satisfacao_pendente':
        return "bg-purple-50 border-purple-100";
      case 'solicitacao_criada':
      default:
        return "bg-brand-50 border-brand-100";
    }
  };

  const formatTime = (dateString: string | Date) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return "agora";
    if (diffInSeconds < 3600) return `há ${Math.floor(diffInSeconds / 60)} min`;
    if (diffInSeconds < 86400) return `há ${Math.floor(diffInSeconds / 3600)} h`;
    if (diffInSeconds < 604800) return `há ${Math.floor(diffInSeconds / 86400)} dias`;
    
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit"
    }).format(date);
  };

  const totalPages = data ? Math.ceil(data.total / perPage) : 0;

  return (
    <div className="flex flex-col gap-6 p-6 max-w-[1000px] mx-auto animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Notificações</h1>
          <p className="text-muted-foreground">
            Acompanhe as atualizações sobre suas solicitações e agendamentos.
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={handleMarkAllAsRead}
          disabled={markAllAsReadMutation.isPending || isLoading || data?.notificacoes.length === 0}
          className="w-full md:w-auto"
        >
          <Check className="mr-2 h-4 w-4" />
          Marcar todas como lidas
        </Button>
      </div>

      <Tabs defaultValue="all" className="w-full" onValueChange={(val) => {
        setFilter(val as "all" | "unread");
        setPage(1);
      }}>
        <TabsList className="grid w-full md:w-[400px] grid-cols-2">
          <TabsTrigger value="all">Todas</TabsTrigger>
          <TabsTrigger value="unread">Não lidas</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6 space-y-4">
          <NotificationList 
            data={data} 
            isLoading={isLoading} 
            isError={isError}
            onMarkAsRead={handleMarkAsRead}
            onNotificationClick={handleNotificationClick}
            getIcon={getIcon}
            getBgColor={getBgColor}
            formatTime={formatTime}
          />
        </TabsContent>

        <TabsContent value="unread" className="mt-6 space-y-4">
          <NotificationList 
            data={data} 
            isLoading={isLoading} 
            isError={isError}
            onMarkAsRead={handleMarkAsRead}
            onNotificationClick={handleNotificationClick}
            getIcon={getIcon}
            getBgColor={getBgColor}
            formatTime={formatTime}
          />
        </TabsContent>
      </Tabs>

      {totalPages > 1 && (
        <div className="mt-4 flex justify-center">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious 
                  href="#" 
                  onClick={(e) => {
                    e.preventDefault();
                    if (page > 1) setPage(page - 1);
                  }}
                  className={page <= 1 ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>
              
              {Array.from({ length: totalPages }).map((_, i) => (
                <PaginationItem key={i}>
                  <PaginationLink 
                    href="#" 
                    isActive={page === i + 1}
                    onClick={(e) => {
                      e.preventDefault();
                      setPage(i + 1);
                    }}
                  >
                    {i + 1}
                  </PaginationLink>
                </PaginationItem>
              ))}
              
              <PaginationItem>
                <PaginationNext 
                  href="#" 
                  onClick={(e) => {
                    e.preventDefault();
                    if (page < totalPages) setPage(page + 1);
                  }}
                  className={page >= totalPages ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
}

function NotificationList({ 
  data, 
  isLoading, 
  isError, 
  onMarkAsRead, 
  onNotificationClick,
  getIcon,
  getBgColor,
  formatTime
}: any) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i} className="border-none shadow-sm">
            <CardContent className="p-4 flex items-start gap-4">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h3 className="text-lg font-medium text-gray-900">Erro ao carregar notificações</h3>
        <p className="text-muted-foreground mt-1">Não foi possível carregar suas notificações. Tente novamente.</p>
      </div>
    );
  }

  if (!data?.notificacoes || data.notificacoes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center bg-white/50 rounded-lg border border-dashed">
        <Bell className="h-12 w-12 text-gray-300 mb-4" />
        <h3 className="text-lg font-medium text-gray-900">Nenhuma notificação</h3>
        <p className="text-muted-foreground mt-1">Você não tem notificações neste momento.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {data.notificacoes.map((notification: Notification) => (
        <div
          key={notification.id}
          onClick={() => onNotificationClick(notification)}
          className={cn(
            "group relative flex items-start gap-4 p-4 rounded-xl border transition-all cursor-pointer hover:shadow-sm",
            notification.lida ? "bg-white border-gray-100" : "bg-blue-50/30 border-blue-100"
          )}
        >
          <div className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border",
            getBgColor(notification.tipo)
          )}>
            {getIcon(notification.tipo)}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <p className={cn(
                "text-sm font-medium leading-none",
                notification.lida ? "text-gray-900" : "text-brand-900"
              )}>
                {notification.titulo}
              </p>
              <span className="text-xs text-muted-foreground whitespace-nowrap flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatTime(notification.createdAt)}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {notification.mensagem}
            </p>
          </div>

          {!notification.lida && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-brand-600"
                onClick={(e) => onMarkAsRead(notification.id, e)}
                title="Marcar como lida"
              >
                <div className="h-2 w-2 rounded-full bg-brand-600" />
                <span className="sr-only">Marcar como lida</span>
              </Button>
            </div>
          )}
          
          {!notification.lida && (
            <div className="absolute right-4 top-4 md:top-1/2 md:-translate-y-1/2 md:hidden">
               <div className="h-2 w-2 rounded-full bg-brand-600" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
