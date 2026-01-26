"use client";

import { Suspense, type FC } from "react";
import { useQuery } from "@tanstack/react-query";
import { Calendar, CalendarCheck01, XCircle, Users01, TrendUp01, TrendDown01 } from "@untitledui/icons";
import { trpc } from "@/utils/trpc";
import { DateRangePicker } from "@/components/untitled/application/date-picker/date-range-picker";
import { useAnalyticsFilters, type DateRangeValue } from "@/hooks/useAnalyticsFilters";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart01 } from "@/components/untitled/application/charts/bar-charts";
import { cn } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { SatisfacaoTab } from "./components/SatisfacaoTab";

interface MetricCardProps {
  icon: FC<{ className?: string }>;
  title: string;
  subtitle: string;
  change?: string;
  changeTrend?: "positive" | "negative";
  changeWeek?: string;
  changeWeekTrend?: "positive" | "negative";
  changeAvg?: string;
  changeAvgTrend?: "positive" | "negative";
  variant?: "default" | "danger";
}

const variantStyles = {
  default: {
    iconBg: "bg-gray-100 dark:bg-gray-800 ring-1 ring-gray-200 dark:ring-gray-700",
    iconColor: "text-gray-600 dark:text-gray-300",
  },
  danger: {
    iconBg: "bg-red-50 dark:bg-red-950/30 ring-1 ring-red-200 dark:ring-red-800",
    iconColor: "text-red-600 dark:text-red-400",
  },
};

export function MetricCard({ 
  icon: Icon, 
  title, 
  subtitle, 
  change, 
  changeTrend = "positive", 
  changeWeek,
  changeWeekTrend = "positive",
  changeAvg,
  changeAvgTrend = "positive",
  variant = "default" 
}: MetricCardProps) {
  const styles = variantStyles[variant];
  
  return (
    <div className="rounded-xl bg-white dark:bg-gray-900 shadow-sm ring-1 ring-gray-200 dark:ring-gray-800">
      <div className="flex flex-col gap-4 px-5 py-5">
        <div className={cn("flex h-12 w-12 items-center justify-center rounded-xl", styles.iconBg)}>
          <Icon className={cn("h-6 w-6", styles.iconColor)} />
        </div>

        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">{subtitle}</h3>

          <p className="text-display-sm font-semibold text-gray-900 dark:text-gray-50">{title}</p>
          
          <div className="flex flex-col gap-1">
            {change && (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  {changeTrend === "positive" ? (
                    <TrendUp01 className="size-4 stroke-[2.5px] text-green-500" />
                  ) : (
                    <TrendDown01 className="size-4 stroke-[2.5px] text-red-500" />
                  )}
                  <span className={cn("text-sm font-medium", changeTrend === "positive" ? "text-green-600" : "text-red-600")}>
                    {change}
                  </span>
                </div>
                <span className="text-sm text-gray-500 dark:text-gray-400">vs dia anterior</span>
              </div>
            )}
            
            {changeWeek && (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  {changeWeekTrend === "positive" ? (
                    <TrendUp01 className="size-4 stroke-[2.5px] text-green-500" />
                  ) : (
                    <TrendDown01 className="size-4 stroke-[2.5px] text-red-500" />
                  )}
                  <span className={cn("text-sm font-medium", changeWeekTrend === "positive" ? "text-green-600" : "text-red-600")}>
                    {changeWeek}
                  </span>
                </div>
                <span className="text-sm text-gray-500 dark:text-gray-400">vs semana anterior</span>
              </div>
            )}

            {changeAvg && (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  {changeAvgTrend === "positive" ? (
                    <TrendUp01 className="size-4 stroke-[2.5px] text-green-500" />
                  ) : (
                    <TrendDown01 className="size-4 stroke-[2.5px] text-red-500" />
                  )}
                  <span className={cn("text-sm font-medium", changeAvgTrend === "positive" ? "text-green-600" : "text-red-600")}>
                    {changeAvg}
                  </span>
                </div>
                <span className="text-sm text-gray-500 dark:text-gray-400">vs media anterior</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ConsultasTabContent({ dateRangeForApi }: { dateRangeForApi: { dataInicio: string; dataFim: string } }) {
  const { data: agendadas, isLoading: isLoadingAgendadas } = useQuery(
    trpc.analytics.consultasAgendadas.queryOptions({
      dataInicio: dateRangeForApi.dataInicio,
      dataFim: dateRangeForApi.dataFim,
    })
  );

  const { data: realizadas, isLoading: isLoadingRealizadas } = useQuery(
    trpc.analytics.consultasRealizadas.queryOptions({
      dataInicio: dateRangeForApi.dataInicio,
      dataFim: dateRangeForApi.dataFim,
    })
  );

  const { data: canceladas, isLoading: isLoadingCanceladas } = useQuery(
    trpc.analytics.consultasCanceladas.queryOptions({
      dataInicio: dateRangeForApi.dataInicio,
      dataFim: dateRangeForApi.dataFim,
    })
  );

  const { data: medicos, isLoading: isLoadingMedicos } = useQuery(
    trpc.analytics.medicosAtendendo.queryOptions({
      dataInicio: dateRangeForApi.dataInicio,
      dataFim: dateRangeForApi.dataFim,
    })
  );

  const { data: consultasPorHorario, isLoading: isLoadingConsultasPorHorario } = useQuery(
    trpc.analytics.consultasPorHorario.queryOptions({
      dataInicio: dateRangeForApi.dataInicio,
      dataFim: dateRangeForApi.dataFim,
    })
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500 mt-6">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {isLoadingAgendadas ? (
          <Skeleton className="h-[260px] rounded-xl" />
        ) : (
          <MetricCard
            icon={Calendar}
            title={agendadas?.total.toLocaleString("pt-BR") ?? "0"}
            subtitle="Consultas agendadas"
            change={
              agendadas?.variacao !== null && agendadas?.variacao !== undefined
                ? `${agendadas.variacao >= 0 ? "+" : ""}${agendadas.variacao.toFixed(1)}%`
                : undefined
            }
            changeTrend={
              agendadas?.variacao !== null && agendadas?.variacao !== undefined
                ? agendadas.variacao >= 0 ? "positive" : "negative"
                : "positive"
            }
            changeWeek={
              agendadas?.variacaoSemana !== null && agendadas?.variacaoSemana !== undefined
                ? `${agendadas.variacaoSemana >= 0 ? "+" : ""}${agendadas.variacaoSemana.toFixed(1)}%`
                : undefined
            }
            changeWeekTrend={
              agendadas?.variacaoSemana !== null && agendadas?.variacaoSemana !== undefined
                ? agendadas.variacaoSemana >= 0 ? "positive" : "negative"
                : "positive"
            }
            changeAvg={
              agendadas?.variacaoMedia !== null && agendadas?.variacaoMedia !== undefined
                ? `${agendadas.variacaoMedia >= 0 ? "+" : ""}${agendadas.variacaoMedia.toFixed(1)}%`
                : undefined
            }
            changeAvgTrend={
              agendadas?.variacaoMedia !== null && agendadas?.variacaoMedia !== undefined
                ? agendadas.variacaoMedia >= 0 ? "positive" : "negative"
                : "positive"
            }
          />
        )}

        {isLoadingRealizadas ? (
          <Skeleton className="h-[260px] rounded-xl" />
        ) : (
          <MetricCard
            icon={CalendarCheck01}
            title={realizadas?.total.toLocaleString("pt-BR") ?? "0"}
            subtitle="Consultas realizadas"
            change={
              realizadas?.variacao !== null && realizadas?.variacao !== undefined
                ? `${realizadas.variacao >= 0 ? "+" : ""}${realizadas.variacao.toFixed(1)}%`
                : undefined
            }
            changeTrend={
              realizadas?.variacao !== null && realizadas?.variacao !== undefined
                ? realizadas.variacao >= 0 ? "positive" : "negative"
                : "positive"
            }
            changeWeek={
              realizadas?.variacaoSemana !== null && realizadas?.variacaoSemana !== undefined
                ? `${realizadas.variacaoSemana >= 0 ? "+" : ""}${realizadas.variacaoSemana.toFixed(1)}%`
                : undefined
            }
            changeWeekTrend={
              realizadas?.variacaoSemana !== null && realizadas?.variacaoSemana !== undefined
                ? realizadas.variacaoSemana >= 0 ? "positive" : "negative"
                : "positive"
            }
            changeAvg={
              realizadas?.variacaoMedia !== null && realizadas?.variacaoMedia !== undefined
                ? `${realizadas.variacaoMedia >= 0 ? "+" : ""}${realizadas.variacaoMedia.toFixed(1)}%`
                : undefined
            }
            changeAvgTrend={
              realizadas?.variacaoMedia !== null && realizadas?.variacaoMedia !== undefined
                ? realizadas.variacaoMedia >= 0 ? "positive" : "negative"
                : "positive"
            }
          />
        )}

        {isLoadingCanceladas ? (
          <Skeleton className="h-[260px] rounded-xl" />
        ) : (
          <MetricCard
            icon={XCircle}
            title={canceladas?.total.toLocaleString("pt-BR") ?? "0"}
            subtitle="Consultas canceladas"
            variant="danger"
            change={
              canceladas?.variacao !== null && canceladas?.variacao !== undefined
                ? `${canceladas.variacao >= 0 ? "+" : ""}${canceladas.variacao.toFixed(1)}%`
                : undefined
            }
            changeTrend={
              canceladas?.variacao !== null && canceladas?.variacao !== undefined
                ? canceladas.variacao >= 0 ? "negative" : "positive"
                : "positive"
            }
            changeWeek={
              canceladas?.variacaoSemana !== null && canceladas?.variacaoSemana !== undefined
                ? `${canceladas.variacaoSemana >= 0 ? "+" : ""}${canceladas.variacaoSemana.toFixed(1)}%`
                : undefined
            }
            changeWeekTrend={
              canceladas?.variacaoSemana !== null && canceladas?.variacaoSemana !== undefined
                ? canceladas.variacaoSemana >= 0 ? "negative" : "positive"
                : "positive"
            }
            changeAvg={
              canceladas?.variacaoMedia !== null && canceladas?.variacaoMedia !== undefined
                ? `${canceladas.variacaoMedia >= 0 ? "+" : ""}${canceladas.variacaoMedia.toFixed(1)}%`
                : undefined
            }
            changeAvgTrend={
              canceladas?.variacaoMedia !== null && canceladas?.variacaoMedia !== undefined
                ? canceladas.variacaoMedia >= 0 ? "negative" : "positive"
                : "positive"
            }
          />
        )}

        {isLoadingMedicos ? (
          <Skeleton className="h-[260px] rounded-xl" />
        ) : (
          <MetricCard
            icon={Users01}
            title={medicos?.total.toLocaleString("pt-BR") ?? "0"}
            subtitle="Médicos atendendo"
            change={
              medicos?.variacao !== null && medicos?.variacao !== undefined
                ? `${medicos.variacao >= 0 ? "+" : ""}${medicos.variacao.toFixed(1)}%`
                : undefined
            }
            changeTrend={
              medicos?.variacao !== null && medicos?.variacao !== undefined
                ? medicos.variacao >= 0 ? "positive" : "negative"
                : "positive"
            }
            changeWeek={
              medicos?.variacaoSemana !== null && medicos?.variacaoSemana !== undefined
                ? `${medicos.variacaoSemana >= 0 ? "+" : ""}${medicos.variacaoSemana.toFixed(1)}%`
                : undefined
            }
            changeWeekTrend={
              medicos?.variacaoSemana !== null && medicos?.variacaoSemana !== undefined
                ? medicos.variacaoSemana >= 0 ? "positive" : "negative"
                : "positive"
            }
            changeAvg={
              medicos?.variacaoMedia !== null && medicos?.variacaoMedia !== undefined
                ? `${medicos.variacaoMedia >= 0 ? "+" : ""}${medicos.variacaoMedia.toFixed(1)}%`
                : undefined
            }
            changeAvgTrend={
              medicos?.variacaoMedia !== null && medicos?.variacaoMedia !== undefined
                ? medicos.variacaoMedia >= 0 ? "positive" : "negative"
                : "positive"
            }
          />
        )}
      </div>

      <div className="rounded-xl bg-white dark:bg-gray-900 shadow-sm ring-1 ring-gray-200 dark:ring-gray-800 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50 mb-4">
          Consultas agendadas por horário
        </h3>
        {isLoadingConsultasPorHorario ? (
          <Skeleton className="h-[280px] rounded-lg" />
        ) : (
          <BarChart01
            data={consultasPorHorario ?? []}
            dataKey="value"
            height={280}
            color="fill-utility-brand-500"
          />
        )}
      </div>
    </div>
  );
}

function AnalyticsContent() {
  const { dateRangeValue, dateRangeForApi, setDateRange } = useAnalyticsFilters();

  const handleDateChange = (range: DateRangeValue | null) => {
    if (range) {
      setDateRange(range);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 dark:border-gray-800 pb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-50">Analytics</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Metricas e indicadores de performance
          </p>
        </div>
        <DateRangePicker 
          value={dateRangeValue} 
          onChange={handleDateChange}
        />
      </div>

      <Tabs defaultValue="consultas">
        <TabsList>
          <TabsTrigger value="consultas">Consultas</TabsTrigger>
          <TabsTrigger value="satisfacao">Satisfação</TabsTrigger>
        </TabsList>
        <TabsContent value="consultas">
          <ConsultasTabContent dateRangeForApi={dateRangeForApi} />
        </TabsContent>
        <TabsContent value="satisfacao">
          <SatisfacaoTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function AnalyticsPage() {
  return (
    <Suspense fallback={<AnalyticsSkeleton />}>
      <AnalyticsContent />
    </Suspense>
  );
}

function AnalyticsSkeleton() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between pb-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-[150px]" />
          <Skeleton className="h-4 w-[250px]" />
        </div>
        <Skeleton className="h-10 w-[200px]" />
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <Skeleton className="h-[260px] rounded-xl" />
        <Skeleton className="h-[260px] rounded-xl" />
        <Skeleton className="h-[260px] rounded-xl" />
        <Skeleton className="h-[260px] rounded-xl" />
      </div>
      <Skeleton className="h-[340px] rounded-xl" />
    </div>
  );
}
