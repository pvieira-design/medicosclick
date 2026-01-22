# Smart Polling e Cache

## Visao Geral

O sistema utiliza polling adaptativo que ajusta a frequencia de atualizacoes baseado em:
- Visibilidade da aba do navegador
- Atividade do usuario (mouse, teclado, scroll)

Isso reduz carga no servidor quando o usuario nao esta interagindo ativamente.

## Intervalos de Polling

### Contextos e Prioridades

| Contexto | Ativo | Background | Prioridade |
|----------|-------|------------|------------|
| `emergenciais` | 10s | 30s | Alta |
| `cancelamento` | 15s | 45s | Alta |
| `meusHorarios` | 20s | 60s | Media |
| `solicitacoes` | 20s | 60s | Media |
| `dashboard` | 5min | 10min | Baixa |
| `sidebarEmergenciais` | 15s | 45s | - |
| `sidebarSolicitacoes` | 30s | 90s | - |

### Configuracao

```typescript
// lib/polling-config.ts
export const POLLING_INTERVALS: Record<PollingContext, PollingInterval> = {
  emergenciais: {
    active: 10_000,      // 10 segundos
    background: 30_000,  // 30 segundos
  },
  cancelamento: {
    active: 15_000,      // 15 segundos
    background: 45_000,  // 45 segundos
  },
  meusHorarios: {
    active: 20_000,      // 20 segundos
    background: 60_000,  // 60 segundos
  },
  solicitacoes: {
    active: 20_000,      // 20 segundos
    background: 60_000,  // 60 segundos
  },
  dashboard: {
    active: 300_000,     // 5 minutos
    background: 600_000, // 10 minutos
  },
  sidebarEmergenciais: {
    active: 15_000,      // 15 segundos
    background: 45_000,  // 45 segundos
  },
  sidebarSolicitacoes: {
    active: 30_000,      // 30 segundos
    background: 90_000,  // 90 segundos
  },
};
```

## Estados do Usuario

### Ativo
- Documento visivel (`document.visibilityState === "visible"`)
- Atividade recente (< 30 segundos)
- Usa intervalo `active`

### Background
- Documento oculto (aba em segundo plano)
- OU inatividade > 30 segundos
- Usa intervalo `background`

### Threshold de Inatividade

```typescript
export const USER_INACTIVITY_THRESHOLD = 30_000; // 30 segundos
```

## Eventos Monitorados

```typescript
export const USER_ACTIVITY_EVENTS = [
  'mousedown',
  'mousemove',
  'keydown',
  'scroll',
  'touchstart',
] as const;
```

## Hook useSmartPolling

### Interface

```typescript
interface UseSmartPollingReturn {
  /** Intervalo atual de polling em ms (ou false para desabilitado) */
  interval: number | false;
  /** Se esta em modo background */
  isBackground: boolean;
  /** Timestamp da ultima atividade */
  lastActivity: number;
  /** Forca uma atualizacao imediata */
  triggerActivity: () => void;
}
```

### Uso Basico

```typescript
import { useSmartPolling } from '@/hooks/use-smart-polling';

function MeusHorarios() {
  const { interval } = useSmartPolling('meusHorarios');

  const { data } = trpc.medicos.meusHorariosComConsultas.useQuery(undefined, {
    refetchInterval: interval, // false quando inativo
  });

  return <GradeHorarios data={data} />;
}
```

### Com Informacoes Extras

```typescript
function PainelSolicitacoes() {
  const { interval, isBackground, lastActivity, triggerActivity } = useSmartPolling('solicitacoes');

  // Mostrar indicador quando em background
  {isBackground && (
    <Badge variant="secondary">
      Atualizacao lenta (background)
    </Badge>
  )}

  // Forcar atualizacao apos acao importante
  const handleAprovar = async () => {
    await aprovarMutation.mutateAsync(dados);
    triggerActivity(); // Reinicia timer de atividade
  };
}
```

### Desabilitar Polling

```typescript
function ComponenteEstatico() {
  const { interval } = useSmartPolling('dashboard', { enabled: false });
  // interval sempre sera false
}
```

## Hook usePollingInterval

Versao simplificada que retorna apenas o intervalo.

```typescript
import { usePollingInterval } from '@/hooks/use-smart-polling';

function Sidebar() {
  const interval = usePollingInterval('sidebarEmergenciais');

  const { data } = trpc.emergenciais.estatisticas.useQuery(undefined, {
    refetchInterval: interval,
  });
}
```

## Invalidacao de Cache

### Apos Mutacoes

Invalidar queries relacionadas apos mutacoes:

```typescript
import { useQueryClient } from '@tanstack/react-query';

function AprovarButton() {
  const queryClient = useQueryClient();

  const aprovarMutation = trpc.solicitacoes.aprovarSlots.useMutation({
    onSuccess: () => {
      // Invalida queries relacionadas
      queryClient.invalidateQueries({ queryKey: [["solicitacoes"]] });
      queryClient.invalidateQueries({ queryKey: [["medicos"]] });

      toast.success("Slots aprovados com sucesso!");
    },
  });
}
```

### Padroes de Invalidacao

| Acao | Queries a Invalidar |
|------|---------------------|
| Aprovar slots | `solicitacoes`, `medicos` |
| Criar solicitacao | `solicitacoes` |
| Aceitar emergencial | `emergenciais`, `medicos` |
| Alterar score | `medicos` |
| Aprovar cancelamento | `cancelamentoEmergencial`, `medicos` |

### Invalidacao Seletiva

```typescript
// Invalida todas as queries de solicitacoes
queryClient.invalidateQueries({ queryKey: [["solicitacoes"]] });

// Invalida query especifica
queryClient.invalidateQueries({
  queryKey: [["medicos", "buscarPorId"], { id: medicoId }]
});

// Invalida todas as queries de um router
queryClient.invalidateQueries({
  queryKey: [["medicos"]]
});
```

## Otimistic Updates (Opcional)

Para UX mais responsiva, aplicar updates otimistas:

```typescript
const aprovarMutation = trpc.solicitacoes.aprovarSlots.useMutation({
  onMutate: async (newData) => {
    // Cancelar queries em andamento
    await queryClient.cancelQueries({ queryKey: [["solicitacoes"]] });

    // Snapshot do estado anterior
    const previousData = queryClient.getQueryData([["solicitacoes", "listarAgrupado"]]);

    // Otimistic update
    queryClient.setQueryData([["solicitacoes", "listarAgrupado"]], (old) => {
      // Atualizar dados localmente
      return updateLocalData(old, newData);
    });

    return { previousData };
  },
  onError: (err, newData, context) => {
    // Reverter em caso de erro
    queryClient.setQueryData(
      [["solicitacoes", "listarAgrupado"]],
      context?.previousData
    );
  },
  onSettled: () => {
    // Revalidar sempre ao final
    queryClient.invalidateQueries({ queryKey: [["solicitacoes"]] });
  },
});
```

## Melhores Praticas

### 1. Escolher Contexto Correto

Use o contexto que melhor reflete a prioridade dos dados:
- Dados criticos em tempo real → `emergenciais`
- Dados operacionais → `solicitacoes`
- Metricas agregadas → `dashboard`

### 2. Invalidar Relacionados

Sempre invalide todas as queries que podem ser afetadas por uma mutacao.

### 3. Evitar Over-Fetching

Nao use intervalos muito curtos. Os defaults ja foram otimizados.

### 4. Feedback Visual

Mostrar ao usuario quando esta em modo background:

```tsx
{isBackground && (
  <div className="text-sm text-muted-foreground">
    Atualizacoes reduzidas (aba em segundo plano)
  </div>
)}
```

### 5. Forcar Atualizacao Apos Acoes

Chamar `triggerActivity()` apos acoes importantes para garantir que os dados sejam atualizados:

```typescript
const handleSubmit = async () => {
  await mutation.mutateAsync(data);
  triggerActivity();
};
```

## Debug

### Ver Estado do Polling

```typescript
function DebugPolling() {
  const { interval, isBackground, lastActivity } = useSmartPolling('solicitacoes');

  return (
    <pre>
      {JSON.stringify({
        interval,
        isBackground,
        lastActivity: new Date(lastActivity).toISOString(),
        inactiveFor: Date.now() - lastActivity
      }, null, 2)}
    </pre>
  );
}
```

### React Query DevTools

Instale as devtools para visualizar estado das queries:

```tsx
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

function App() {
  return (
    <>
      <MyApp />
      <ReactQueryDevtools initialIsOpen={false} />
    </>
  );
}
```
