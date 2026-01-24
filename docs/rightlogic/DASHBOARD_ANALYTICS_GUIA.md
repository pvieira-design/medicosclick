# Guia de Desenvolvimento de Dashboards Analytics

> Documentacao das boas praticas para criar dashboards de analytics no ClickMedicos, incluindo adaptacao de queries do Grafana/RightLogic.

## Arquitetura

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           FRONTEND (Next.js)                            │
│  ┌─────────────────┐  ┌──────────────────┐  ┌───────────────────────┐  │
│  │ useAnalytics    │  │ DateRangePicker  │  │ MetricCard            │  │
│  │ Filters (hook)  │──│ (Untitled UI)    │  │ (componente)          │  │
│  └────────┬────────┘  └──────────────────┘  └───────────────────────┘  │
│           │                                                             │
│           ▼                                                             │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ trpc.analytics.[metrica].queryOptions({ dataInicio, dataFim })  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         BACKEND (tRPC Router)                           │
│  packages/api/src/routers/analytics.ts                                  │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ - Recebe dataInicio e dataFim                                   │   │
│  │ - Calcula periodo anterior automaticamente                      │   │
│  │ - Chama query do Click Replica                                  │   │
│  │ - Calcula variacao percentual                                   │   │
│  │ - Retorna { total, totalAnterior, variacao, periodo }           │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      DATABASE (Click Replica)                           │
│  packages/db/src/click-replica.ts                                       │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ getTotalConsultasAgendadas(dataInicio, dataFim, usarFiltroHora) │   │
│  │ getTotalConsultasRealizadas(...)                                │   │
│  │ getTotalConsultasCanceladas(...)                                │   │
│  │ getTotalMedicosAtendendo(...)                                   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 1. Adaptando Queries do Grafana/RightLogic

### Query Original (Grafana)

```sql
SELECT COUNT(*) AS total_consultas
FROM consultings
WHERE $__timeFilter(start::timestamp)
  AND user_id IS NOT NULL
  AND status NOT IN ('preconsulting', 'cancelled');
```

### Query Adaptada (ClickMedicos)

```sql
SELECT COUNT(*)::int AS total_consultas
FROM consultings
WHERE start::timestamptz AT TIME ZONE 'America/Sao_Paulo' >= $1::date
  AND start::timestamptz AT TIME ZONE 'America/Sao_Paulo' < ($2::date + INTERVAL '1 day')
  AND user_id IS NOT NULL
  AND status NOT IN ('preconsulting', 'cancelled')
  AND (event_id NOT LIKE 'external%' OR event_id IS NULL)
  AND (
    $3::boolean = false 
    OR (start::timestamptz AT TIME ZONE 'America/Sao_Paulo')::time <= (NOW() AT TIME ZONE 'America/Sao_Paulo')::time
  )
```

### Regras de Adaptacao

| Grafana | ClickMedicos | Motivo |
|---------|--------------|--------|
| `$__timeFilter(start::timestamp)` | `start::timestamptz AT TIME ZONE 'America/Sao_Paulo' >= $1::date AND ... < ($2::date + INTERVAL '1 day')` | Filtro de data parametrizado |
| `COUNT(*)` | `COUNT(*)::int` | Retornar tipo TypeScript correto |
| - | `AND (event_id NOT LIKE 'external%' OR event_id IS NULL)` | Excluir consultas externas |
| - | `AND ($3::boolean = false OR ...)` | Filtro de hora para comparacao justa |

### Filtro de Hora para Comparacao Justa

Quando comparamos "hoje vs ontem", precisamos comparar periodos equivalentes:
- Se sao 15h, comparar "hoje ate 15h" vs "ontem ate 15h"

```sql
AND (
  $3::boolean = false  -- Se false, nao aplica filtro de hora
  OR (start::timestamptz AT TIME ZONE 'America/Sao_Paulo')::time 
     <= (NOW() AT TIME ZONE 'America/Sao_Paulo')::time
)
```

**IMPORTANTE**: A hora e calculada diretamente no PostgreSQL com `NOW() AT TIME ZONE 'America/Sao_Paulo'` para evitar problemas de timezone do servidor Node.js.

---

## 2. Criando Query no Click Replica

### Arquivo: `packages/db/src/click-replica.ts`

```typescript
getTotalMinhaMetrica: (dataInicio: string, dataFim: string, usarFiltroHora: boolean = false) =>
  query<{ total_metrica: number }>(
    `SELECT COUNT(*)::int AS total_metrica
     FROM consultings
     WHERE start::timestamptz AT TIME ZONE 'America/Sao_Paulo' >= $1::date
       AND start::timestamptz AT TIME ZONE 'America/Sao_Paulo' < ($2::date + INTERVAL '1 day')
       AND user_id IS NOT NULL
       AND negotiation_id IS NOT NULL
       AND status NOT IN ('preconsulting', 'cancelled')
       AND (event_id NOT LIKE 'external%' OR event_id IS NULL)
       AND (
         $3::boolean = false 
         OR (start::timestamptz AT TIME ZONE 'America/Sao_Paulo')::time <= (NOW() AT TIME ZONE 'America/Sao_Paulo')::time
       )`,
    [dataInicio, dataFim, usarFiltroHora]
  ),
```

### Checklist da Query

- [ ] Usar `::int` no COUNT para tipo correto
- [ ] Usar `AT TIME ZONE 'America/Sao_Paulo'` em todas as conversoes
- [ ] Filtrar `user_id IS NOT NULL` (excluir slots vazios)
- [ ] Filtrar `negotiation_id IS NOT NULL` (excluir testes)
- [ ] Filtrar `status NOT IN ('preconsulting')` no minimo
- [ ] Filtrar `(event_id NOT LIKE 'external%' OR event_id IS NULL)` para excluir externos
- [ ] Incluir parametro `usarFiltroHora` com filtro de hora

---

## 3. Criando Endpoint no Router

### Arquivo: `packages/api/src/routers/analytics.ts`

```typescript
import { z } from "zod";
import { clickQueries } from "@clickmedicos/db/click-replica";
import { router, staffProcedure } from "../index";

// Funcoes utilitarias (ja existentes no arquivo)
function calcularPeriodoAnterior(dataInicio: string, dataFim: string) {
  const inicio = new Date(dataInicio);
  const fim = new Date(dataFim);
  const duracao = Math.ceil((fim.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24));
  
  const anteriorFim = new Date(inicio);
  anteriorFim.setDate(anteriorFim.getDate() - 1);
  
  const anteriorInicio = new Date(anteriorFim);
  anteriorInicio.setDate(anteriorInicio.getDate() - duracao);
  
  return {
    dataInicio: anteriorInicio.toISOString().split("T")[0]!,
    dataFim: anteriorFim.toISOString().split("T")[0]!,
  };
}

function calcularVariacao(atual: number, anterior: number): number | null {
  if (anterior === 0) return atual > 0 ? 100 : null;
  return ((atual - anterior) / anterior) * 100;
}

// Adicionar novo endpoint
minhaMetrica: staffProcedure
  .input(
    z.object({
      dataInicio: z.string(),
      dataFim: z.string(),
    })
  )
  .query(async ({ input }) => {
    const [resultadoAtual] = await clickQueries.getTotalMinhaMetrica(
      input.dataInicio,
      input.dataFim,
      true  // Sempre passar true para comparacao justa
    );

    const periodoAnterior = calcularPeriodoAnterior(input.dataInicio, input.dataFim);
    const [resultadoAnterior] = await clickQueries.getTotalMinhaMetrica(
      periodoAnterior.dataInicio,
      periodoAnterior.dataFim,
      true
    );

    const total = resultadoAtual?.total_metrica ?? 0;
    const totalAnterior = resultadoAnterior?.total_metrica ?? 0;
    const variacao = calcularVariacao(total, totalAnterior);

    return {
      total,
      totalAnterior,
      variacao,
      periodo: {
        atual: { dataInicio: input.dataInicio, dataFim: input.dataFim },
        anterior: periodoAnterior,
      },
    };
  }),
```

### Estrutura de Retorno Padrao

```typescript
{
  total: number,           // Valor do periodo atual
  totalAnterior: number,   // Valor do periodo anterior
  variacao: number | null, // Variacao percentual
  periodo: {
    atual: { dataInicio: string, dataFim: string },
    anterior: { dataInicio: string, dataFim: string },
  }
}
```

---

## 4. Design dos Cards de Metricas

### Componente MetricCard

```tsx
interface MetricCardProps {
  icon: FC<{ className?: string }>;
  title: string;
  subtitle: string;
  change?: string;
  changeTrend?: "positive" | "negative";
  variant?: "default" | "danger";
}
```

### Variantes de Estilo

| Variante | Uso | Fundo do Icone | Cor do Icone |
|----------|-----|----------------|--------------|
| `default` | Metricas neutras/positivas | `bg-gray-100` | `text-gray-600` |
| `danger` | Metricas negativas (cancelamentos, erros) | `bg-red-50` | `text-red-600` |

### Icones Recomendados (@untitledui/icons)

| Metrica | Icone | Import |
|---------|-------|--------|
| Consultas Agendadas | `Calendar` | `import { Calendar } from "@untitledui/icons"` |
| Consultas Realizadas | `CalendarCheck01` | `import { CalendarCheck01 } from "@untitledui/icons"` |
| Consultas Canceladas | `XCircle` | `import { XCircle } from "@untitledui/icons"` |
| Medicos | `Users01` | `import { Users01 } from "@untitledui/icons"` |
| Faturamento | `CurrencyDollar` | `import { CurrencyDollar } from "@untitledui/icons"` |
| Tickets | `Receipt` | `import { Receipt } from "@untitledui/icons"` |

### Logica de Trend (Positivo/Negativo)

```tsx
// Para metricas onde AUMENTO e BOM (consultas, faturamento)
changeTrend={variacao >= 0 ? "positive" : "negative"}

// Para metricas onde AUMENTO e RUIM (cancelamentos, erros)
changeTrend={variacao >= 0 ? "negative" : "positive"}
```

---

## 5. Hook de Filtros de Data

### Arquivo: `apps/web/src/hooks/useAnalyticsFilters.ts`

```tsx
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useCallback, useMemo } from "react";
import { getLocalTimeZone, today, parseDate } from "@internationalized/date";

export function useAnalyticsFilters() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Valor para o DateRangePicker (componente visual)
  const dateRangeValue = useMemo(() => {
    const inicio = searchParams.get("inicio");
    const fim = searchParams.get("fim");
    
    if (inicio && fim) {
      return { start: parseDate(inicio), end: parseDate(fim) };
    }
    
    // Default: hoje
    const now = today(getLocalTimeZone());
    return { start: now, end: now };
  }, [searchParams]);

  // Valor para a API (strings YYYY-MM-DD)
  const dateRangeForApi = useMemo(() => ({
    dataInicio: dateValueToString(dateRangeValue.start),
    dataFim: dateValueToString(dateRangeValue.end),
  }), [dateRangeValue]);

  // Funcao para atualizar filtros na URL
  const setDateRange = useCallback((range) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("inicio", dateValueToString(range.start));
    params.set("fim", dateValueToString(range.end));
    router.push(`${pathname}?${params.toString()}`);
  }, [searchParams, router, pathname]);

  return { dateRangeValue, dateRangeForApi, setDateRange };
}
```

### Uso na Pagina

```tsx
function AnalyticsContent() {
  const { dateRangeValue, dateRangeForApi, setDateRange } = useAnalyticsFilters();

  // Query com filtros
  const { data, isLoading } = useQuery(
    trpc.analytics.minhaMetrica.queryOptions({
      dataInicio: dateRangeForApi.dataInicio,
      dataFim: dateRangeForApi.dataFim,
    })
  );

  return (
    <>
      <DateRangePicker value={dateRangeValue} onChange={setDateRange} />
      {/* ... cards ... */}
    </>
  );
}
```

---

## 6. Estrutura Completa da Pagina

### Arquivo: `apps/web/src/app/(dashboard)/dashboard/analytics/page.tsx`

```tsx
"use client";

import { Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { Calendar, TrendUp01, TrendDown01 } from "@untitledui/icons";
import { trpc } from "@/utils/trpc";
import { DateRangePicker } from "@/components/untitled/application/date-picker/date-range-picker";
import { useAnalyticsFilters } from "@/hooks/useAnalyticsFilters";
import { Skeleton } from "@/components/ui/skeleton";

function AnalyticsContent() {
  const { dateRangeValue, dateRangeForApi, setDateRange } = useAnalyticsFilters();

  const { data, isLoading } = useQuery(
    trpc.analytics.minhaMetrica.queryOptions({
      dataInicio: dateRangeForApi.dataInicio,
      dataFim: dateRangeForApi.dataFim,
    })
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header com titulo e DatePicker */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Analytics</h1>
          <p className="text-gray-500 mt-1">Metricas e indicadores</p>
        </div>
        <DateRangePicker value={dateRangeValue} onChange={setDateRange} />
      </div>

      {/* Grid de cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {isLoading ? (
          <Skeleton className="h-[180px] rounded-xl" />
        ) : (
          <MetricCard
            icon={Calendar}
            title={data?.total.toLocaleString("pt-BR") ?? "0"}
            subtitle="Minha Metrica"
            change={formatVariacao(data?.variacao)}
            changeTrend={getTrend(data?.variacao)}
          />
        )}
      </div>
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
```

---

## 7. Checklist para Nova Metrica

- [ ] **Query** (`packages/db/src/click-replica.ts`)
  - [ ] Criar funcao `getTotalMinhaMetrica`
  - [ ] Usar `::int` no COUNT
  - [ ] Usar timezone `America/Sao_Paulo`
  - [ ] Filtrar slots vazios e externos
  - [ ] Incluir filtro de hora

- [ ] **Endpoint** (`packages/api/src/routers/analytics.ts`)
  - [ ] Criar procedure `minhaMetrica`
  - [ ] Usar `staffProcedure` (requer autenticacao)
  - [ ] Chamar query para periodo atual
  - [ ] Chamar query para periodo anterior
  - [ ] Calcular variacao
  - [ ] Retornar estrutura padrao

- [ ] **Frontend** (`apps/web/src/app/(dashboard)/dashboard/analytics/page.tsx`)
  - [ ] Importar icone do `@untitledui/icons`
  - [ ] Adicionar `useQuery` para nova metrica
  - [ ] Adicionar `MetricCard` com props corretas
  - [ ] Adicionar `Skeleton` para loading
  - [ ] Definir trend correto (positivo/negativo)

- [ ] **Testes**
  - [ ] Verificar tipos com `npx tsc --noEmit`
  - [ ] Testar no browser com diferentes datas
  - [ ] Verificar comparacao com periodo anterior

---

## 8. Filtros Comuns de Consultas

### Consultas Validas (Agendadas)

```sql
AND user_id IS NOT NULL              -- Tem paciente
AND status NOT IN ('preconsulting')  -- Nao e reserva
AND (event_id NOT LIKE 'external%' OR event_id IS NULL)  -- Nao e externo
```

### Consultas Realizadas

```sql
AND completed = TRUE
AND status NOT IN ('preconsulting', 'cancelled')
AND (event_id NOT LIKE 'external%' OR event_id IS NULL)
```

### Consultas Canceladas

```sql
AND user_id IS NOT NULL
AND negotiation_id IS NOT NULL
AND status = 'cancelled'
AND (event_id NOT LIKE 'external%' OR event_id IS NULL)
```

### Medicos Ativos

```sql
SELECT COUNT(DISTINCT c.doctor_id)
FROM consultings c
WHERE ...  -- mesmos filtros de consultas validas
```

---

## Arquivos de Referencia

| Arquivo | Descricao |
|---------|-----------|
| `packages/db/src/click-replica.ts` | Queries do banco Click |
| `packages/api/src/routers/analytics.ts` | Endpoints tRPC |
| `apps/web/src/hooks/useAnalyticsFilters.ts` | Hook de filtros de data |
| `apps/web/src/app/(dashboard)/dashboard/analytics/page.tsx` | Pagina de analytics |
| `docs/queries/queries-documentacao-schema-consultas.md` | Schema do banco Click |
| `docs/queries/respostas-perguntas-bancodadosclick.md` | Regras de negocio |
