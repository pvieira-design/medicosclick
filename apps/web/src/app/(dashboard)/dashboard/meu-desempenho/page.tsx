"use client";

import { useQuery } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Activity, 
  Calendar, 
  CheckCircle, 
  Clock,
  User,
  AlertCircle,
  Mail
} from "lucide-react";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';
import { cn } from "@/lib/utils";
import { Suspense, useMemo } from "react";
import { KPICard } from "@/components/dashboard/KPICard";
import { DateRangePicker } from "@/components/dashboard/DateRangePicker";
import { useDashboardFilters } from "@/hooks/useDashboardFilters";

export default function MeuDesempenhoPage() {
  return (
    <Suspense fallback={<MeuDesempenhoSkeleton />}>
      <MeuDesempenhoContent />
    </Suspense>
  );
}

function MeuDesempenhoContent() {
  const { dateRange, setDateRange } = useDashboardFilters();
  
  const { data: profile } = useQuery(trpc.medico.meuPerfil.queryOptions());
  
  const { data, isLoading } = useQuery(
    trpc.medico.meuDashboard.queryOptions({
      dataInicio: dateRange.dataInicio,
      dataFim: dateRange.dataFim,
      diasEvolucao: 30
    })
  );
  
  const initials = useMemo(() => {
    if (!profile?.name) return "DR";
    return profile.name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  }, [profile?.name]);

  const evolucaoData = useMemo(() => {
    if (!data?.evolucao) return [];
    return data.evolucao.map(item => ({
      ...item,
      dataFormatada: new Date(item.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
    }));
  }, [data?.evolucao]);

  const motivosData = useMemo(() => {
    if (!data?.motivos) return [];
    return data.motivos;
  }, [data?.motivos]);

  if (isLoading) {
    return <MeuDesempenhoSkeleton />;
  }

  const hasData = !!data?.resumo;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-6">
        <div className="flex items-center gap-4">
          <Avatar className="h-14 w-14 border-2 border-brand-200 shadow-sm">
            <AvatarImage src="" alt={profile?.name || "Doutor"} />
            <AvatarFallback className="text-lg font-bold bg-brand-100 text-brand-700">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">
              {profile?.name || "Carregando..."}
            </h2>
            <div className="flex items-center gap-2 text-muted-foreground text-sm mt-0.5">
              <Mail className="w-3.5 h-3.5" />
              <span>{profile?.email}</span>
              {profile?.faixa && (
                <Badge variant="secondary" className="ml-2 text-xs">
                  {profile.faixa}
                </Badge>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
           <DateRangePicker value={dateRange} onChange={setDateRange} />
        </div>
      </div>

      {!hasData ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="p-4 rounded-full bg-muted/50 mb-4">
              <AlertCircle className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium">Nenhum dado encontrado</h3>
            <p className="text-muted-foreground max-w-sm mt-2">
              Não encontramos registros de consultas para o período selecionado ou seu usuário não está vinculado a um perfil médico.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <KPICard 
              titulo="Agendadas"
              valor={data.resumo!.total_agendadas ?? 0}
              formato="numero"
              icone={Calendar}
              cor="brand"
              isLoading={isLoading}
            />
            <KPICard 
              titulo="Realizadas"
              valor={data.resumo!.total_realizadas ?? 0}
              formato="numero"
              icone={CheckCircle}
              cor="green"
              isLoading={isLoading}
            />
            <KPICard 
              titulo="Comparecimento"
              valor={data.resumo!.taxa_comparecimento ?? 0}
              formato="porcentagem"
              icone={Activity}
              cor="blue"
              isLoading={isLoading}
            />
            <KPICard 
              titulo="Tempo Médio"
              valor={data.resumo!.tempo_medio_consulta_minutos ?? 0}
              formato="numero"
              icone={Clock}
              cor="orange"
              isLoading={isLoading}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-7">
            <Card className="lg:col-span-4 border-border/50">
              <CardHeader>
                <CardTitle className="text-lg font-medium">Evolução de Comparecimento</CardTitle>
                <CardDescription>Taxa de comparecimento nos últimos 30 dias</CardDescription>
              </CardHeader>
              <CardContent className="pl-2">
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={evolucaoData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
                      <XAxis 
                        dataKey="dataFormatada" 
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
                        tickFormatter={(value) => `${value}%`} 
                      />
                      <Tooltip 
                        cursor={{ stroke: 'var(--brand-500)', strokeWidth: 2 }}
                        contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }}
                        formatter={(value: any) => [`${value}%`, 'Taxa']}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="taxa_comparecimento" 
                        stroke="var(--brand-600)" 
                        strokeWidth={2}
                        dot={{ r: 4, fill: "var(--brand-600)" }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <div className="lg:col-span-3 space-y-6">
              <Card className="border-border/50 h-full flex flex-col">
                <CardHeader>
                  <CardTitle className="text-lg font-medium">Motivos de Não Realização</CardTitle>
                  <CardDescription>Principais causas de consultas não realizadas</CardDescription>
                </CardHeader>
                <CardContent className="flex-1">
                  <div className="h-[300px] w-full">
                    {motivosData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={motivosData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} className="stroke-muted" />
                          <XAxis type="number" hide />
                          <YAxis 
                            dataKey="motivo" 
                            type="category" 
                            width={100}
                            tick={{ fontSize: 11 }}
                            interval={0}
                          />
                          <Tooltip 
                             cursor={{ fill: 'transparent' }}
                             contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }}
                             formatter={(value: any) => [value, 'Quantidade']}
                          />
                          <Bar dataKey="quantidade" fill="var(--brand-500)" radius={[0, 4, 4, 0]} barSize={20} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                        Sem dados suficientes
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-lg font-medium">Próximas Consultas</CardTitle>
              <CardDescription>Seus próximos agendamentos</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.proximasConsultas.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Nenhuma consulta agendada para breve.</p>
                ) : (
                  data.proximasConsultas.map((consulta) => (
                    <div key={consulta.id} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border/50">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-brand-100 flex items-center justify-center text-brand-600">
                          <User className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{consulta.patient_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(consulta.scheduled_at).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-brand-600 border-brand-200">
                        {new Date(consulta.scheduled_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function MeuDesempenhoSkeleton() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between pb-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-[250px]" />
          <Skeleton className="h-4 w-[350px]" />
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
      <Skeleton className="h-[200px]" />
    </div>
  )
}
