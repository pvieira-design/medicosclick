"use client";

import { useQuery, useMutation } from "@tanstack/react-query";
import { trpc, trpcClient, queryClient } from "@/utils/trpc";
import { toast } from "sonner";
import { RefreshCw, Clock, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "agora";
  if (diffMins < 60) return `ha ${diffMins} min`;
  if (diffHours < 24) return `ha ${diffHours}h`;
  return `ha ${diffDays}d`;
}

export default function AdminSyncPage() {
  const stats = useQuery(trpc.config.filaRetryStats.queryOptions());
  const fila = useQuery(trpc.config.filaRetryList.queryOptions({ limite: 20 }));

  const processarMutation = useMutation({
    mutationFn: () => trpcClient.config.processarFilaRetryManual.mutate(),
    onSuccess: (data) => {
      toast.success(`Processados: ${data.processados} | Sucesso: ${data.sucesso} | Falha: ${data.falha}`);
      queryClient.invalidateQueries({ queryKey: ["config"] });
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const isLoading = stats.isLoading || fila.isLoading;

  if (isLoading) {
    return <PageSkeleton />;
  }

  return (
    <div className="space-y-6 p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Sincronizacao Click</h1>
          <p className="text-muted-foreground">Monitoramento da fila de sincronizacao com API Click</p>
        </div>
        <Button
          onClick={() => processarMutation.mutate()}
          disabled={processarMutation.isPending || stats.data?.pendentes === 0}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${processarMutation.isPending ? "animate-spin" : ""}`} />
          Processar Fila
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="Pendentes"
          value={stats.data?.pendentes ?? 0}
          icon={<Clock className="h-5 w-5 text-yellow-500" />}
          variant="warning"
        />
        <StatCard
          title="Processados"
          value={stats.data?.processados ?? 0}
          icon={<CheckCircle className="h-5 w-5 text-green-500" />}
          variant="success"
        />
        <StatCard
          title="Falhados (max retries)"
          value={stats.data?.falhados ?? 0}
          icon={<XCircle className="h-5 w-5 text-red-500" />}
          variant="error"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Fila de Retry</CardTitle>
          <CardDescription>Itens aguardando sincronizacao ou reprocessamento</CardDescription>
        </CardHeader>
        <CardContent>
          {fila.data && fila.data.length > 0 ? (
            <div className="space-y-3">
              {fila.data.map((item: any) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-4 border rounded-lg bg-muted/20"
                >
                  <div className="flex items-center gap-4">
                    <div>
                      {item.tentativas >= 5 ? (
                        <XCircle className="h-5 w-5 text-red-500" />
                      ) : (
                        <AlertTriangle className="h-5 w-5 text-yellow-500" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{item.tipo}</p>
                      <p className="text-xs text-muted-foreground">
                        Tentativas: {item.tentativas}/{item.maxTentativas}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant={item.tentativas >= 5 ? "destructive" : "secondary"}>
                      {item.tentativas >= 5 ? "Falhou" : "Pendente"}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatTimeAgo(new Date(item.createdAt))}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500/50" />
              <p>Nenhum item na fila de retry</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Configuracao Cron Jobs</CardTitle>
          <CardDescription>Agendamentos automaticos configurados no Vercel</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <CronItem
              path="/api/cron/recalcular-scores"
              schedule="Diario as 06:00 (BRT)"
              description="Recalcula scores de todos os medicos"
            />
            <CronItem
              path="/api/cron/processar-retry"
              schedule="A cada 5 minutos"
              description="Processa itens pendentes na fila de sync"
            />
            <CronItem
              path="/api/cron/limpeza"
              schedule="Domingo as 03:00 (BRT)"
              description="Limpa dados antigos (retry 30d, auditoria 90d)"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ title, value, icon, variant }: {
  title: string;
  value: number;
  icon: React.ReactNode;
  variant: "warning" | "success" | "error";
}) {
  const bgClass = {
    warning: "bg-yellow-50 border-yellow-200 dark:bg-yellow-950/20 dark:border-yellow-900",
    success: "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-900",
    error: "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-900",
  }[variant];

  return (
    <Card className={bgClass}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold mt-1">{value}</p>
          </div>
          {icon}
        </div>
      </CardContent>
    </Card>
  );
}

function CronItem({ path, schedule, description }: {
  path: string;
  schedule: string;
  description: string;
}) {
  return (
    <div className="flex items-center justify-between p-3 border rounded-lg">
      <div>
        <code className="text-xs bg-muted px-2 py-1 rounded">{path}</code>
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      </div>
      <Badge variant="outline">{schedule}</Badge>
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="space-y-6 p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
      <Skeleton className="h-64" />
    </div>
  );
}
