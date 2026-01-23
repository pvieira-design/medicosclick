# Fase 4: Dashboard Completo

> Duracao estimada: 3-4 dias
> Prioridade: Media
> Dependencias: Fase 1 (Queries Click)

## Objetivo

Implementar o dashboard completo com metricas reais do Click:
- KPIs principais (consultas, faturamento, conversao)
- Alertas e oportunidades
- Rankings de medicos
- Graficos de distribuicao

---

## Estrutura de Paginas

```
apps/web/src/app/(dashboard)/dashboard/
├── page.tsx                    # Visao Geral (refatorar)
├── alertas/
│   └── page.tsx               # Central de Alertas
├── performance/
│   └── page.tsx               # Performance Individual
└── ranking/
    └── page.tsx               # Ranking de Medicos
```

---

## Componentes a Criar

```
apps/web/src/components/dashboard/
├── KPICard.tsx                 # Card de metrica individual
├── KPIGrid.tsx                 # Grid de KPIs
├── SaudeOperacao.tsx           # Score de saude operacional
├── AlertaCard.tsx              # Card de alerta
├── AlertasList.tsx             # Lista de alertas
├── RankingTable.tsx            # Tabela de ranking
├── ChartDistribuicao.tsx       # Grafico de barras
├── ChartPizza.tsx              # Grafico de pizza
├── ComparativoMedico.tsx       # Comparativo medico vs plataforma
├── DateRangePicker.tsx         # Seletor de periodo
└── hooks/
    ├── useDashboardFilters.ts  # Filtros via URL
    └── useDashboardData.ts     # Agregador de dados
```

---

## KPIs Principais

### Grid de KPIs

```typescript
interface KPI {
  id: string;
  titulo: string;
  valor: number;
  formato: "numero" | "moeda" | "porcentagem";
  variacao?: number;        // % vs periodo anterior
  meta?: number;            // meta para comparacao
  icone: LucideIcon;
  cor: string;
}

const KPIs: KPI[] = [
  {
    id: "consultas_agendadas",
    titulo: "Consultas Agendadas",
    formato: "numero",
    icone: Calendar,
    cor: "brand",
  },
  {
    id: "consultas_realizadas",
    titulo: "Realizadas",
    formato: "numero",
    icone: CheckCircle,
    cor: "green",
  },
  {
    id: "faturamento",
    titulo: "Faturamento",
    formato: "moeda",
    icone: DollarSign,
    cor: "emerald",
  },
  {
    id: "conversao",
    titulo: "Conversao",
    formato: "porcentagem",
    meta: 65,
    icone: TrendingUp,
    cor: "blue",
  },
  {
    id: "no_show",
    titulo: "No-Show",
    formato: "porcentagem",
    meta: 15, // meta e < 15%
    icone: UserX,
    cor: "red",
  },
  {
    id: "ticket_medio",
    titulo: "Ticket Medio",
    formato: "moeda",
    icone: Receipt,
    cor: "purple",
  },
];
```

### Componente KPICard

```typescript
"use client";

import { cn } from "@/lib/utils";
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface KPICardProps {
  titulo: string;
  valor: number;
  formato: "numero" | "moeda" | "porcentagem";
  variacao?: number;
  meta?: number;
  icone: LucideIcon;
  cor: string;
  isLoading?: boolean;
}

function formatarValor(valor: number, formato: string): string {
  switch (formato) {
    case "moeda":
      return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
      }).format(valor);
    case "porcentagem":
      return `${valor.toFixed(1)}%`;
    default:
      return valor.toLocaleString("pt-BR");
  }
}

export function KPICard({
  titulo,
  valor,
  formato,
  variacao,
  meta,
  icone: Icon,
  cor,
  isLoading,
}: KPICardProps) {
  const variacaoPositiva = variacao && variacao > 0;
  const atingiuMeta = meta !== undefined && valor >= meta;
  
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{titulo}</p>
            {isLoading ? (
              <div className="h-8 w-24 bg-gray-200 animate-pulse rounded mt-1" />
            ) : (
              <p className="text-2xl font-bold mt-1">
                {formatarValor(valor, formato)}
              </p>
            )}
          </div>
          <div className={cn(
            "p-3 rounded-full",
            `bg-${cor}-100 text-${cor}-600`
          )}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
        
        {variacao !== undefined && (
          <div className="flex items-center mt-2">
            {variacaoPositiva ? (
              <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
            )}
            <span className={cn(
              "text-sm",
              variacaoPositiva ? "text-green-600" : "text-red-600"
            )}>
              {variacaoPositiva ? "+" : ""}{variacao.toFixed(1)}%
            </span>
            <span className="text-sm text-muted-foreground ml-1">
              vs periodo anterior
            </span>
          </div>
        )}
        
        {meta !== undefined && (
          <div className="mt-2">
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>Meta: {formatarValor(meta, formato)}</span>
              <span className={atingiuMeta ? "text-green-600" : "text-red-600"}>
                {atingiuMeta ? "Atingida" : "Nao atingida"}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div
                className={cn(
                  "h-1.5 rounded-full",
                  atingiuMeta ? "bg-green-500" : "bg-red-500"
                )}
                style={{ width: `${Math.min((valor / meta) * 100, 100)}%` }}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

---

## Sistema de Alertas

### Tipos de Alertas

```typescript
type AlertaSeveridade = "critico" | "alerta" | "oportunidade";

interface Alerta {
  id: string;
  tipo: string;
  severidade: AlertaSeveridade;
  medicoId?: string;
  medicoNome?: string;
  valor: number;
  meta: number;
  mensagem: string;
  createdAt: Date;
}

const ALERTAS_CONFIG = {
  noShowCritico: {
    severidade: "critico",
    threshold: 30,
    mensagem: (valor: number) => `Taxa de no-show em ${valor}% (meta: 15%)`,
  },
  conversaoCritica: {
    severidade: "critico",
    threshold: 45,
    mensagem: (valor: number) => `Taxa de conversao em ${valor}% (meta: 55%)`,
  },
  receitaAtrasada: {
    severidade: "alerta",
    threshold: 70,
    mensagem: (valor: number) => `SLA receitas em ${valor}% (meta: 80%)`,
  },
  notaMinima: {
    severidade: "alerta",
    threshold: 3.5,
    mensagem: (valor: number) => `Nota media ${valor} (minimo: 3.5)`,
  },
  prontoPromocao: {
    severidade: "oportunidade",
    mensagem: () => "Performance consistente para promocao de faixa",
  },
  reviewChampion: {
    severidade: "oportunidade",
    threshold: 4.8,
    mensagem: (valor: number) => `Nota media ${valor} - Destaque em avaliacoes`,
  },
};
```

### Componente AlertaCard

```typescript
import { AlertTriangle, AlertCircle, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const SEVERIDADE_CONFIG = {
  critico: {
    bg: "bg-red-50",
    border: "border-red-200",
    text: "text-red-700",
    icon: AlertTriangle,
  },
  alerta: {
    bg: "bg-amber-50",
    border: "border-amber-200",
    text: "text-amber-700",
    icon: AlertCircle,
  },
  oportunidade: {
    bg: "bg-green-50",
    border: "border-green-200",
    text: "text-green-700",
    icon: TrendingUp,
  },
};

interface AlertaCardProps {
  alerta: Alerta;
}

export function AlertaCard({ alerta }: AlertaCardProps) {
  const config = SEVERIDADE_CONFIG[alerta.severidade];
  const Icon = config.icon;
  
  return (
    <Card className={cn(config.bg, config.border, "border")}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Icon className={cn("h-5 w-5 mt-0.5", config.text)} />
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <span className={cn("font-medium", config.text)}>
                {alerta.tipo}
              </span>
              {alerta.medicoNome && (
                <span className="text-sm text-muted-foreground">
                  {alerta.medicoNome}
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {alerta.mensagem}
            </p>
            {alerta.medicoId && (
              <Link href={`/dashboard/performance?medicoId=${alerta.medicoId}`}>
                <Button variant="link" className="p-0 h-auto mt-2">
                  Ver performance
                </Button>
              </Link>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

---

## Queries tRPC

### Router dashboardMetricas (expandir)

```typescript
// packages/api/src/routers/dashboardMetricas.ts

export const dashboardMetricasRouter = router({
  getDadosPrincipais: staffProcedure
    .input(z.object({
      dataInicio: z.string(),
      dataFim: z.string(),
      doctorId: z.number().optional(),
    }))
    .query(async ({ input }) => {
      const consultas = await clickQueries.getConsultasPeriodo(
        input.dataInicio,
        input.dataFim,
        input.doctorId
      );
      
      // Calcular metricas
      const agendadas = consultas.length;
      const realizadas = consultas.filter(c => c.completed).length;
      const noShows = consultas.filter(c => 
        !c.completed && c.reason_for_cancellation?.includes("no-show")
      ).length;
      
      // Buscar faturamento
      const faturamento = await clickQueries.getFaturamentoPeriodo(
        input.dataInicio,
        input.dataFim,
        input.doctorId
      );
      
      // Calcular periodo anterior para comparacao
      const diasPeriodo = daysBetween(input.dataInicio, input.dataFim);
      const dataInicioAnterior = subtractDays(input.dataInicio, diasPeriodo);
      const dataFimAnterior = subtractDays(input.dataFim, diasPeriodo);
      
      const consultasAnterior = await clickQueries.getConsultasPeriodo(
        dataInicioAnterior,
        dataFimAnterior,
        input.doctorId
      );
      
      return {
        volume: {
          agendadas,
          realizadas,
          noShows,
          canceladas: agendadas - realizadas - noShows,
        },
        financeiro: {
          faturamento: faturamento.total,
          ticketMedio: faturamento.ticketMedio,
        },
        conversao: {
          taxa: realizadas > 0 ? (faturamento.vendas / realizadas) * 100 : 0,
        },
        comparecimento: {
          taxa: agendadas > 0 ? (realizadas / agendadas) * 100 : 0,
          noShow: agendadas > 0 ? (noShows / agendadas) * 100 : 0,
        },
        periodoAnterior: {
          consultas: consultasAnterior.length,
          variacao: calcularVariacao(agendadas, consultasAnterior.length),
        },
      };
    }),

  getAlertas: staffProcedure
    .input(z.object({
      dataInicio: z.string(),
      dataFim: z.string(),
    }))
    .query(async ({ input }) => {
      const medicos = await prisma.user.findMany({
        where: { tipo: "medico", ativo: true, clickDoctorId: { not: null } },
        include: { config: true },
      });
      
      const alertas: Alerta[] = [];
      
      for (const medico of medicos) {
        const metricas = await clickQueries.getMetricasMedico(
          medico.clickDoctorId!,
          input.dataInicio,
          input.dataFim
        );
        
        // Verificar no-show critico
        if (metricas.noShowRate > 30) {
          alertas.push({
            tipo: "noShowCritico",
            severidade: "critico",
            medicoId: medico.id,
            medicoNome: medico.name,
            valor: metricas.noShowRate,
            meta: 15,
            mensagem: `Taxa de no-show em ${metricas.noShowRate}%`,
          });
        }
        
        // Verificar conversao critica
        if (metricas.conversao < 45) {
          alertas.push({
            tipo: "conversaoCritica",
            severidade: "critico",
            medicoId: medico.id,
            medicoNome: medico.name,
            valor: metricas.conversao,
            meta: 55,
            mensagem: `Taxa de conversao em ${metricas.conversao}%`,
          });
        }
        
        // Verificar oportunidade de promocao
        if (metricas.conversao > 70 && metricas.nota > 4.5) {
          alertas.push({
            tipo: "prontoPromocao",
            severidade: "oportunidade",
            medicoId: medico.id,
            medicoNome: medico.name,
            valor: metricas.conversao,
            meta: 70,
            mensagem: "Performance consistente para promocao",
          });
        }
      }
      
      return {
        criticos: alertas.filter(a => a.severidade === "critico"),
        alertas: alertas.filter(a => a.severidade === "alerta"),
        oportunidades: alertas.filter(a => a.severidade === "oportunidade"),
        totais: {
          criticos: alertas.filter(a => a.severidade === "critico").length,
          alertas: alertas.filter(a => a.severidade === "alerta").length,
          oportunidades: alertas.filter(a => a.severidade === "oportunidade").length,
        },
      };
    }),

  getRanking: staffProcedure
    .input(z.object({
      dataInicio: z.string(),
      dataFim: z.string(),
      ordenarPor: z.enum(["faturamento", "conversao", "nota"]).default("faturamento"),
      limite: z.number().default(10),
    }))
    .query(async ({ input }) => {
      // Buscar metricas de todos os medicos
      const metricas = await clickQueries.getMetricasTodosMedicos(
        input.dataInicio,
        input.dataFim
      );
      
      // Ordenar
      const ordenado = metricas.sort((a, b) => {
        switch (input.ordenarPor) {
          case "conversao":
            return b.conversao - a.conversao;
          case "nota":
            return b.nota - a.nota;
          default:
            return b.faturamento - a.faturamento;
        }
      });
      
      return ordenado.slice(0, input.limite).map((m, i) => ({
        posicao: i + 1,
        ...m,
      }));
    }),
});
```

---

## Hooks

### useDashboardFilters

```typescript
"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useCallback, useMemo } from "react";

interface DateRange {
  dataInicio: string;
  dataFim: string;
  label: string;
}

const PRESETS: Record<string, () => DateRange> = {
  hoje: () => {
    const hoje = new Date().toISOString().split("T")[0]!;
    return { dataInicio: hoje, dataFim: hoje, label: "Hoje" };
  },
  ultimos7: () => {
    const fim = new Date();
    const inicio = new Date();
    inicio.setDate(inicio.getDate() - 7);
    return {
      dataInicio: inicio.toISOString().split("T")[0]!,
      dataFim: fim.toISOString().split("T")[0]!,
      label: "Ultimos 7 dias",
    };
  },
  // ... mais presets
};

export function useDashboardFilters() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  
  const dateRange = useMemo<DateRange>(() => {
    const preset = searchParams.get("preset") ?? "ultimos7";
    const presetFn = PRESETS[preset];
    if (presetFn) return presetFn();
    
    // Custom range
    return {
      dataInicio: searchParams.get("inicio") ?? PRESETS.ultimos7().dataInicio,
      dataFim: searchParams.get("fim") ?? PRESETS.ultimos7().dataFim,
      label: "Personalizado",
    };
  }, [searchParams]);
  
  const doctorId = searchParams.get("doctorId")
    ? parseInt(searchParams.get("doctorId")!)
    : undefined;
  
  const setDateRange = useCallback((range: DateRange | string) => {
    const params = new URLSearchParams(searchParams);
    if (typeof range === "string") {
      params.set("preset", range);
      params.delete("inicio");
      params.delete("fim");
    } else {
      params.delete("preset");
      params.set("inicio", range.dataInicio);
      params.set("fim", range.dataFim);
    }
    router.push(`${pathname}?${params.toString()}`);
  }, [searchParams, router, pathname]);
  
  const setDoctorId = useCallback((id: number | undefined) => {
    const params = new URLSearchParams(searchParams);
    if (id) {
      params.set("doctorId", id.toString());
    } else {
      params.delete("doctorId");
    }
    router.push(`${pathname}?${params.toString()}`);
  }, [searchParams, router, pathname]);
  
  return {
    dateRange,
    doctorId,
    setDateRange,
    setDoctorId,
  };
}
```

---

## Layout da Pagina Principal

```typescript
// apps/web/src/app/(dashboard)/dashboard/page.tsx

"use client";

import { KPIGrid } from "@/components/dashboard/KPIGrid";
import { AlertasList } from "@/components/dashboard/AlertasList";
import { RankingTable } from "@/components/dashboard/RankingTable";
import { DateRangePicker } from "@/components/dashboard/DateRangePicker";
import { useDashboardFilters } from "@/components/dashboard/hooks/useDashboardFilters";
import { trpc } from "@/lib/trpc";

export default function DashboardPage() {
  const { dateRange, doctorId, setDateRange } = useDashboardFilters();
  
  const { data: dadosPrincipais, isLoading: loadingPrincipais } = 
    trpc.dashboardMetricas.getDadosPrincipais.useQuery({
      dataInicio: dateRange.dataInicio,
      dataFim: dateRange.dataFim,
      doctorId,
    });
  
  const { data: alertas } = trpc.dashboardMetricas.getAlertas.useQuery({
    dataInicio: dateRange.dataInicio,
    dataFim: dateRange.dataFim,
  });
  
  const { data: ranking } = trpc.dashboardMetricas.getRanking.useQuery({
    dataInicio: dateRange.dataInicio,
    dataFim: dateRange.dataFim,
    limite: 5,
  });
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <DateRangePicker value={dateRange} onChange={setDateRange} />
      </div>
      
      <KPIGrid data={dadosPrincipais} isLoading={loadingPrincipais} />
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AlertasList 
          alertas={alertas} 
          titulo="Acoes Urgentes"
          mostrarTodos={false}
        />
        
        <RankingTable 
          ranking={ranking}
          titulo="Top Performers"
          limite={5}
        />
      </div>
    </div>
  );
}
```

---

## Criterios de Aceite

- [ ] KPIs renderizam com dados reais do Click
- [ ] Variacao vs periodo anterior calculada corretamente
- [ ] Sistema de alertas identifica problemas
- [ ] Ranking ordenado corretamente
- [ ] Filtro de periodo funciona
- [ ] Filtro por medico funciona
- [ ] Graficos renderizam corretamente
- [ ] Responsivo em mobile/tablet
- [ ] Loading states implementados

---

## Checklist de Conclusao

- [ ] Componentes de KPI criados
- [ ] Sistema de alertas implementado
- [ ] Ranking implementado
- [ ] Queries tRPC expandidas
- [ ] Hook de filtros funcionando
- [ ] Pagina principal refatorada
- [ ] Pagina de alertas criada
- [ ] Pagina de performance criada
- [ ] Testes implementados
- [ ] Code review realizado
