"use client";

import { useQuery } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Activity, 
  Calendar, 
  CheckCircle, 
  Clock,
  ArrowRight,
  TrendingUp,
  Stethoscope,
  AlertOctagon,
  Users,
  FileText
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts';
import { cn } from "@/lib/utils";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { useMemo, Suspense } from "react";
import { KPICard } from "@/components/dashboard/KPICard";
import { DateRangePicker } from "@/components/dashboard/DateRangePicker";
import { AlertasList } from "@/components/dashboard/AlertasList";
import { useDashboardFilters } from "@/hooks/useDashboardFilters";

export default function Dashboard({ session }: { session: typeof authClient.$Infer.Session }) {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent session={session} />
    </Suspense>
  );
}

function DashboardContent({ session }: { session: typeof authClient.$Infer.Session }) {
  const { dateRange, setDateRange } = useDashboardFilters();
  
  const resumo = useQuery(trpc.dashboard.resumoGeral.queryOptions());
  const atividade = useQuery(trpc.dashboard.atividadeRecente.queryOptions({ limite: 5 }));
  const strikes = useQuery(trpc.dashboard.medicosComStrikes.queryOptions());
  const aprovacoes = useQuery(trpc.aprovacoes.pendentes.queryOptions());
  const alertas = useQuery(trpc.dashboard.getAlertas.queryOptions());

  const isLoading = resumo.isLoading;

  const chartData = useMemo(() => {
    if (!resumo.data?.medicos.porFaixa) return [];
    return Object.entries(resumo.data.medicos.porFaixa).map(([faixa, count]) => ({
      name: faixa,
      value: count
    }));
  }, [resumo.data]);

  const atividadeFormatada = useMemo(() => {
    if (!atividade.data) return [];
    const { solicitacoes, cancelamentos, auditoria } = atividade.data;
    
    const items: { descricao: string; usuario: string; data: string }[] = [];
    
    solicitacoes?.forEach((s) => {
      items.push({
        descricao: `Solicitacao ${s.status}: ${s.medico?.name || 'Medico'}`,
        usuario: s.aprovadoPor?.name || 'Sistema',
        data: s.updatedAt
      });
    });
    
    cancelamentos?.forEach((c) => {
      items.push({
        descricao: `Cancelamento ${c.status}: ${c.medico?.name || 'Medico'}`,
        usuario: c.processadoPor?.name || 'Sistema',
        data: c.updatedAt
      });
    });
    
    auditoria?.forEach((a) => {
      items.push({
        descricao: a.acao,
        usuario: a.usuarioNome || 'Sistema',
        data: a.createdAt
      });
    });
    
    return items.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()).slice(0, 5);
  }, [atividade.data]);

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-6">
        <div>
          <h2 className="text-3xl font-light tracking-tight text-foreground">
            Ola, <span className="font-semibold text-brand-600">{session.user.name}</span>
          </h2>
          <p className="text-muted-foreground mt-1">
            Resumo das operacoes de hoje.
          </p>
        </div>
        <div className="flex items-center gap-3">
           <DateRangePicker value={dateRange} onChange={setDateRange} />
           <Badge variant="outline" className="text-brand-600 border-brand-200 bg-brand-50 dark:bg-brand-900/30 dark:border-brand-800 px-3 py-1">
             <Activity className="w-3 h-3 mr-2" />
             Sistema Operacional
           </Badge>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard 
          titulo="Consultas Hoje"
          valor={resumo.data?.consultasHoje.total ?? 0}
          formato="numero"
          icone={Calendar}
          cor="brand"
          isLoading={resumo.isLoading}
        />
        <KPICard 
          titulo="Realizadas"
          valor={resumo.data?.consultasHoje.realizadas ?? 0}
          formato="numero"
          icone={CheckCircle}
          cor="green"
          isLoading={resumo.isLoading}
        />
        <KPICard 
          titulo="Pendentes Aprovacao"
          valor={resumo.data?.pendentes.total ?? 0}
          formato="numero"
          icone={Clock}
          cor="orange"
          isLoading={aprovacoes.isLoading}
        />
        <KPICard 
          titulo="Medicos Ativos"
          valor={resumo.data?.medicos.total ?? 0}
          formato="numero"
          icone={Users}
          cor="blue"
          isLoading={resumo.isLoading}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-7">
        <Card className="lg:col-span-4 border-border/50">
          <CardHeader>
            <CardTitle className="text-lg font-medium">Distribuicao de Medicos</CardTitle>
            <CardDescription>Medicos ativos por faixa de atendimento</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
                  <XAxis 
                    dataKey="name" 
                    stroke="#888888" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false} 
                  />
                  <YAxis 
                    stroke="#888888" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false} 
                    tickFormatter={(value) => `${value}`} 
                  />
                  <Tooltip 
                    cursor={{ fill: 'transparent' }}
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }}
                  />
                  <Bar dataKey="value" fill="currentColor" radius={[6, 6, 0, 0]} className="fill-brand-500" barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <div className="lg:col-span-3">
          <AlertasList 
            data={alertas.data} 
            isLoading={alertas.isLoading}
            titulo="Alertas e Oportunidades"
            mostrarTodos={false}
            limite={4}
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="border-border/50 flex flex-col">
          <CardHeader>
            <CardTitle className="text-lg font-medium">Atividade Recente</CardTitle>
            <CardDescription>Ultimas acoes no sistema</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 overflow-auto">
            <div className="space-y-6">
              {atividadeFormatada.length === 0 ? (
                 <p className="text-sm text-muted-foreground text-center py-8">Nenhuma atividade recente.</p>
              ) : (
                atividadeFormatada.map((item, i) => (
                  <div key={i} className="flex items-start gap-4 group">
                    <div className="relative mt-1">
                      <div className="absolute inset-0 bg-brand-100 rounded-full opacity-20 group-hover:opacity-40 transition-opacity" />
                      <div className="relative h-2 w-2 rounded-full bg-brand-500 ring-4 ring-background" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {item.descricao || "Acao realizada"}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{item.usuario}</span>
                        <span>•</span>
                        <span>{new Date(item.data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-orange-200 bg-orange-50/30 dark:bg-orange-950/10 dark:border-orange-900/50">
           <CardHeader className="pb-3">
             <div className="flex items-center justify-between">
               <CardTitle className="text-base font-medium flex items-center gap-2 text-orange-700 dark:text-orange-400">
                 <AlertOctagon className="h-4 w-4" />
                 Alertas de Strikes
               </CardTitle>
               <Badge variant="secondary" className="bg-orange-100 text-orange-700 hover:bg-orange-200 dark:bg-orange-900/30 dark:text-orange-400">
                 {strikes.data?.length || 0} Medicos
               </Badge>
             </div>
           </CardHeader>
           <CardContent>
             {strikes.data && strikes.data.length > 0 ? (
               <div className="space-y-3">
                 {strikes.data.slice(0, 3).map((medico, idx) => (
                   <div key={idx} className="flex items-center justify-between p-3 bg-background/50 border rounded-lg">
                     <span className="text-sm font-medium">{medico.name}</span>
                     <div className="flex items-center gap-2">
                       <span className="text-xs text-muted-foreground">{medico.strikes} strikes</span>
                       <ArrowRight className="h-3 w-3 text-orange-600" />
                     </div>
                   </div>
                 ))}
               </div>
             ) : (
               <p className="text-sm text-muted-foreground">Nenhum medico com strikes ativos.</p>
             )}
           </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <FileText className="h-4 w-4 text-brand-600" />
              Aprovacoes Pendentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-muted/30 border rounded-xl flex flex-col items-center justify-center gap-2 text-center hover:bg-muted/50 transition-colors cursor-pointer group">
                <span className="text-2xl font-bold text-foreground group-hover:text-brand-600 transition-colors">
                  {aprovacoes.data?.solicitacoes || 0}
                </span>
                <span className="text-xs text-muted-foreground">Solicitacoes</span>
              </div>
              <div className="p-4 bg-muted/30 border rounded-xl flex flex-col items-center justify-center gap-2 text-center hover:bg-muted/50 transition-colors cursor-pointer group">
                <span className="text-2xl font-bold text-foreground group-hover:text-red-600 transition-colors">
                  {aprovacoes.data?.cancelamentos || 0}
                </span>
                <span className="text-xs text-muted-foreground">Cancelamentos</span>
              </div>
            </div>
            <div className="mt-4">
              <Link 
                href={"/dashboard/pendentes" as any} 
                className={cn(buttonVariants({ variant: "default" }), "w-full")}
              >
                Gerenciar Aprovacoes
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between pb-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-[200px]" />
          <Skeleton className="h-4 w-[300px]" />
        </div>
        <Skeleton className="h-10 w-[200px]" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array(4).fill(0).map((_, i) => (
          <Skeleton key={i} className="h-[120px]" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-7">
        <Skeleton className="lg:col-span-4 h-[400px]" />
        <Skeleton className="lg:col-span-3 h-[400px]" />
      </div>
    </div>
  )
}
