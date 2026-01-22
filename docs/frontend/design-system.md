# Design System

## Stack de UI

| Tecnologia | Uso |
|------------|-----|
| **Tailwind CSS** | Estilizacao utility-first |
| **Radix UI** | Componentes primitivos acessiveis |
| **Base-UI** | Componentes sem estilo |
| **Lucide React** | Icones |
| **Sonner** | Notificacoes toast |
| **class-variance-authority** | Variantes de componentes |

## Componentes Base

### Button

Variantes disponiveis:

| Variante | Classe | Uso |
|----------|--------|-----|
| `default` | bg-primary text-primary-foreground | Acao principal |
| `destructive` | bg-destructive text-destructive-foreground | Acoes destrutivas |
| `outline` | border border-input bg-background | Acoes secundarias |
| `secondary` | bg-secondary text-secondary-foreground | Destaque secundario |
| `ghost` | hover:bg-accent | Acoes sutis |
| `link` | text-primary underline-offset-4 | Links inline |

Tamanhos:

| Tamanho | Classe |
|---------|--------|
| `default` | h-9 px-4 py-2 |
| `sm` | h-8 rounded-md px-3 text-xs |
| `lg` | h-10 rounded-md px-8 |
| `icon` | h-9 w-9 |

```tsx
import { Button } from "@/components/ui/button";

<Button variant="default">Confirmar</Button>
<Button variant="destructive">Excluir</Button>
<Button variant="outline" size="sm">Cancelar</Button>
```

### Card

Estrutura de card com header, content e footer.

```tsx
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter
} from "@/components/ui/card";

<Card>
  <CardHeader>
    <CardTitle>Titulo do Card</CardTitle>
    <CardDescription>Descricao opcional</CardDescription>
  </CardHeader>
  <CardContent>
    Conteudo aqui
  </CardContent>
  <CardFooter>
    <Button>Acao</Button>
  </CardFooter>
</Card>
```

### Dialog (Modal)

Modal baseado em Radix com overlay e animacoes.

```tsx
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";

<Dialog>
  <DialogTrigger asChild>
    <Button>Abrir Modal</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Titulo</DialogTitle>
      <DialogDescription>Descricao</DialogDescription>
    </DialogHeader>
    Conteudo
    <DialogFooter>
      <Button>Confirmar</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### Sheet (Drawer)

Painel lateral deslizante.

```tsx
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle
} from "@/components/ui/sheet";

<Sheet>
  <SheetTrigger asChild>
    <Button>Abrir Drawer</Button>
  </SheetTrigger>
  <SheetContent side="right">
    <SheetHeader>
      <SheetTitle>Titulo</SheetTitle>
    </SheetHeader>
    Conteudo
  </SheetContent>
</Sheet>
```

Sides disponiveis: `top`, `right`, `bottom`, `left`

### Select

Dropdown de selecao.

```tsx
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem
} from "@/components/ui/select";

<Select value={value} onValueChange={setValue}>
  <SelectTrigger>
    <SelectValue placeholder="Selecione..." />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="opt1">Opcao 1</SelectItem>
    <SelectItem value="opt2">Opcao 2</SelectItem>
  </SelectContent>
</Select>
```

### Tabs

Navegacao em abas.

```tsx
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

<Tabs defaultValue="tab1">
  <TabsList>
    <TabsTrigger value="tab1">Tab 1</TabsTrigger>
    <TabsTrigger value="tab2">Tab 2</TabsTrigger>
  </TabsList>
  <TabsContent value="tab1">Conteudo 1</TabsContent>
  <TabsContent value="tab2">Conteudo 2</TabsContent>
</Tabs>
```

### Badge

Labels coloridos para status.

```tsx
import { Badge } from "@/components/ui/badge";

<Badge>Default</Badge>
<Badge variant="secondary">Secondary</Badge>
<Badge variant="outline">Outline</Badge>
<Badge variant="destructive">Destructive</Badge>
```

### Input, Textarea, Label

Campos de formulario.

```tsx
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

<Label htmlFor="email">Email</Label>
<Input id="email" type="email" placeholder="seu@email.com" />

<Label htmlFor="obs">Observacoes</Label>
<Textarea id="obs" placeholder="Digite aqui..." />
```

### Skeleton

Placeholder de loading.

```tsx
import { Skeleton } from "@/components/ui/skeleton";

<Skeleton className="h-4 w-[200px]" />
<Skeleton className="h-8 w-full" />
```

### Checkbox (Base-UI)

Checkbox customizado.

```tsx
import { Checkbox } from "@/components/ui/checkbox";

<Checkbox checked={checked} onCheckedChange={setChecked}>
  Aceito os termos
</Checkbox>
```

---

## Paleta de Cores por Faixa

```css
/* P1 - Melhor performance */
.faixa-p1 {
  @apply bg-green-700 text-white;
}

/* P2 - Bom */
.faixa-p2 {
  @apply bg-green-500 text-white;
}

/* P3 - Medio */
.faixa-p3 {
  @apply bg-yellow-500 text-black;
}

/* P4 - Baixo */
.faixa-p4 {
  @apply bg-orange-500 text-white;
}

/* P5 - Critico */
.faixa-p5 {
  @apply bg-red-500 text-white;
}
```

### Funcao Utilitaria

```typescript
// lib/utils/faixas.ts
export function getFaixaColor(faixa: string): string {
  const cores: Record<string, string> = {
    P1: "bg-green-700 text-white",
    P2: "bg-green-500 text-white",
    P3: "bg-yellow-500 text-black",
    P4: "bg-orange-500 text-white",
    P5: "bg-red-500 text-white",
  };
  return cores[faixa] || "bg-gray-500 text-white";
}
```

---

## Estados Semanticos

| Estado | Classes Text | Classes Background |
|--------|--------------|-------------------|
| Success | text-green-600 | bg-green-50 |
| Warning | text-yellow-600 | bg-yellow-50 |
| Danger | text-red-600 | bg-red-50 |
| Info | text-blue-600 | bg-blue-50 |
| Neutral | text-gray-600 | bg-gray-50 |

---

## Componentes Customizados

### SlotCheckbox

Checkbox para selecao de horarios na grade.

```tsx
interface SlotCheckboxProps {
  diaSemana: string;
  horario: string;
  estado: "empty" | "selected" | "new-selected" | "to-close" | "locked";
  consultas?: number;
  disabled?: boolean;
  onClick: () => void;
}

function SlotCheckbox({
  estado,
  consultas,
  disabled,
  onClick
}: SlotCheckboxProps) {
  const classes = {
    empty: "bg-gray-100 hover:bg-gray-200",
    selected: "bg-green-500 text-white",
    "new-selected": "bg-yellow-400",
    "to-close": "bg-red-500 text-white",
    locked: "bg-gray-200 cursor-not-allowed opacity-60"
  };

  return (
    <button
      className={cn("w-8 h-8 rounded", classes[estado])}
      disabled={disabled || estado === "locked"}
      onClick={onClick}
    >
      {estado === "locked" && <Lock className="w-3 h-3" />}
      {consultas && <span className="text-xs">{consultas}</span>}
    </button>
  );
}
```

### GradeSelecaoHorarios

Grid 7 colunas para selecao de horarios.

```tsx
interface GradeSelecaoHorariosProps {
  horariosAtuais: Map<string, boolean>;
  consultasPorSlot: Map<string, number>;
  diasBloqueados: Set<string>;
  onSlotClick: (dia: string, horario: string) => void;
  onShiftClick: (dia: string, horario: string) => void;
}

function GradeSelecaoHorarios(props: GradeSelecaoHorariosProps) {
  const dias = ["seg", "ter", "qua", "qui", "sex", "sab", "dom"];
  const horarios = gerarHorarios("08:00", "21:00", 20);

  return (
    <div className="grid grid-cols-8 gap-1">
      {/* Header */}
      <div /> {/* Cell vazia */}
      {dias.map(dia => (
        <div key={dia} className="text-center font-medium">
          {dia.toUpperCase()}
        </div>
      ))}

      {/* Linhas de horario */}
      {horarios.map(horario => (
        <React.Fragment key={horario}>
          <div className="text-xs text-right pr-2">{horario}</div>
          {dias.map(dia => (
            <SlotCheckbox
              key={`${dia}-${horario}`}
              diaSemana={dia}
              horario={horario}
              estado={getEstado(dia, horario)}
              consultas={props.consultasPorSlot.get(`${dia}-${horario}`)}
              disabled={props.diasBloqueados.has(dia)}
              onClick={() => props.onSlotClick(dia, horario)}
            />
          ))}
        </React.Fragment>
      ))}
    </div>
  );
}
```

---

## Padroes de Interacao

### Click Simples
Toggle do elemento clicado.

### Shift + Click
Selecao em range (do ultimo clique ao atual).

```typescript
function handleClick(e: React.MouseEvent, index: number) {
  if (e.shiftKey && lastClickedIndex !== null) {
    // Selecionar range
    const start = Math.min(lastClickedIndex, index);
    const end = Math.max(lastClickedIndex, index);
    for (let i = start; i <= end; i++) {
      toggleItem(i);
    }
  } else {
    toggleItem(index);
    setLastClickedIndex(index);
  }
}
```

### Indicadores Visuais

| Elemento | Indicador |
|----------|-----------|
| Dia bloqueado | Icone de cadeado + opacity 50% |
| Slot com consulta | Badge com numero |
| Loading | Skeleton ou spinner |
| Erro | Borda vermelha + mensagem |

---

## Responsividade

Breakpoints Tailwind:
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px
- `2xl`: 1536px

Exemplo de uso:
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* Cards responsivos */}
</div>
```

---

## Toasts (Sonner)

Notificacoes de feedback.

```typescript
import { toast } from "sonner";

// Sucesso
toast.success("Horarios aprovados com sucesso!");

// Erro
toast.error("Erro ao aprovar horarios");

// Info
toast.info("Processando...");

// Com acao
toast("Solicitacao criada", {
  action: {
    label: "Desfazer",
    onClick: () => handleUndo()
  }
});
```

---

## Icones (Lucide)

Icones mais usados no projeto:

| Icone | Componente | Uso |
|-------|------------|-----|
| Calendar | `<Calendar />` | Datas |
| Clock | `<Clock />` | Horarios |
| Check | `<Check />` | Confirmacao |
| X | `<X />` | Fechar/Cancelar |
| Lock | `<Lock />` | Bloqueado |
| ChevronDown | `<ChevronDown />` | Expandir |
| Plus | `<Plus />` | Adicionar |
| Trash | `<Trash />` | Excluir |
| User | `<User />` | Usuario |
| Settings | `<Settings />` | Configuracoes |

```tsx
import { Calendar, Clock, Check, X } from "lucide-react";

<Calendar className="h-4 w-4" />
<Clock className="h-4 w-4 text-muted-foreground" />
```

---

## Convenções de CSS

### Espacamento
- Use classes Tailwind: `p-4`, `m-2`, `gap-4`
- Prefira multiplos de 4: 4, 8, 12, 16, 24, 32

### Cores
- Use variantes semanticas: `bg-primary`, `text-muted-foreground`
- Evite cores hardcoded: `bg-[#FF0000]`

### Tipografia
- Titulo: `text-2xl font-bold`
- Subtitulo: `text-lg font-semibold`
- Corpo: `text-base`
- Small: `text-sm text-muted-foreground`

---

## Componentes do Dashboard

### KPICard

Card para exibicao de KPIs.

```tsx
import { KPICard } from "@/components/dashboard";

<KPICard
  titulo="Faturamento"
  valor={48500}
  formato="moeda"         // "numero" | "moeda" | "porcentagem"
  variacao={15}           // % vs periodo anterior
  icone={DollarSign}
/>
```

**Formatos:**
- `numero`: Formatado com separador de milhares (pt-BR)
- `moeda`: R$ com 2 casas decimais
- `porcentagem`: Com simbolo %

### KPIGrid

Grid de 4 colunas para KPIs.

```tsx
import { KPIGrid, KPICard } from "@/components/dashboard";

<KPIGrid>
  <KPICard titulo="Agendadas" valor={245} formato="numero" />
  <KPICard titulo="Realizadas" valor={198} formato="numero" />
  <KPICard titulo="Faturamento" valor={48500} formato="moeda" />
  <KPICard titulo="Conversao" valor={67.5} formato="porcentagem" />
</KPIGrid>
```

### DateRangePicker

Seletor de periodo.

```tsx
import { DateRangePicker, type DateRange } from "@/components/dashboard";

<DateRangePicker
  value={dateRange}
  onChange={(range: DateRange) => setDateRange(range)}
/>

// DateRange: { dataInicio: string, dataFim: string, label: string }
```

### ChartHora

Grafico de barras por hora.

```tsx
import { ChartHora } from "@/components/dashboard";

<ChartHora
  dados={[
    { hora: "08", consultas: 15 },
    { hora: "09", consultas: 22 },
    { hora: "10", consultas: 28 },
    // ...
  ]}
/>
```

### SaudeOperacao

Scorecard de saude operacional.

```tsx
import { SaudeOperacao } from "@/components/dashboard";

<SaudeOperacao
  comparecimento={81}
  noShow={19}
  slaReceitas={75}
  scoreGeral={78}
/>
```

### AcoesUrgentes

Lista de acoes urgentes (alertas resumidos).

```tsx
import { AcoesUrgentes } from "@/components/dashboard";

<AcoesUrgentes
  alertas={[
    { tipo: "noShowCritico", medico: "Dr. Silva", valor: 35 },
    { tipo: "conversaoCritica", medico: "Dra. Ana", valor: 42 },
  ]}
  onVerTodas={() => router.push("/dashboard/alertas")}
/>
```

### TopPerformers

Lista dos top 3 medicos.

```tsx
import { TopPerformers } from "@/components/dashboard";

<TopPerformers
  medicos={[
    { id: "1", nome: "Dr. Joao", nota: 4.9, conversao: 72, faturamento: 12500 },
    { id: "2", nome: "Dra. Maria", nota: 4.8, conversao: 68, faturamento: 11200 },
    { id: "3", nome: "Dr. Carlos", nota: 4.7, conversao: 65, faturamento: 9800 },
  ]}
  onVerRanking={() => {}}
/>
```

### PrecisamAtencao

Lista de medicos que precisam de atencao.

```tsx
import { PrecisamAtencao } from "@/components/dashboard";

<PrecisamAtencao
  medicos={[
    { id: "1", nome: "Dr. Pedro", problema: "No-show alto", valor: 35, risco: 80 },
    { id: "2", nome: "Dra. Clara", problema: "Conversao baixa", valor: 45, risco: 70 },
  ]}
  onVerDetalhes={(id) => router.push(`/dashboard/medicos?doctorId=${id}`)}
/>
```

### RankingMedicos

Tabela completa de ranking.

```tsx
import { RankingMedicos } from "@/components/dashboard";

<RankingMedicos
  medicos={rankingData}
  onMedicoClick={(id) => router.push(`/medicos/${id}`)}
/>
```

### ComparativoPlataforma

Comparacao medico vs plataforma.

```tsx
import { ComparativoPlataforma } from "@/components/dashboard";

<ComparativoPlataforma
  medico={{ conversao: 72, noShow: 12, ticketMedio: 320, notaMedia: 4.8, receita1h: 85 }}
  plataforma={{ conversao: 65, noShow: 18, ticketMedio: 285, notaMedia: 4.2, receita1h: 75 }}
  desvios={{ conversao: 10.8, noShow: -33.3, ticketMedio: 12.3, notaMedia: 14.3, receita1h: 13.3 }}
/>
```

### CardVolume, CardPrescricao, CardFinanceiro

Cards de metricas individuais.

```tsx
import { CardVolume, CardPrescricao, CardFinanceiro } from "@/components/dashboard";

<CardVolume
  agendadas={45}
  realizadas={42}
  noShows={3}
  canceladas={2}
  novos={15}
  recorrentes={27}
/>

<CardPrescricao
  comReceita={38}
  semReceita={7}
/>

<CardFinanceiro
  faturamento={12500}
  ticketMedio={320}
  orcamentosPagos={8500}
  conversao={72}
/>
```

### CardMotivosNoShow

Analise de motivos de no-show.

```tsx
import { CardMotivosNoShow } from "@/components/dashboard";

<CardMotivosNoShow
  categorias={[
    { categoria: "Paciente nao compareceu", quantidade: 5, porcentagem: 40 },
    { categoria: "Problemas tecnicos", quantidade: 3, porcentagem: 24 },
    // ...
  ]}
  compact={false}  // true para versao resumida
/>
```

### DashboardNav

Navegacao entre abas do dashboard.

```tsx
import { DashboardNav } from "@/components/dashboard";

<DashboardNav
  currentPath="/dashboard"
  dateRange={dateRange}
  doctorId={doctorId}
/>
```

---

## Cores de Alertas

| Severidade | Background | Texto | Border |
|------------|------------|-------|--------|
| Critico | `bg-red-50` | `text-red-700` | `border-red-200` |
| Alerta | `bg-amber-50` | `text-amber-700` | `border-amber-200` |
| Oportunidade | `bg-green-50` | `text-green-700` | `border-green-200` |

### Icones por Tipo de Alerta

```tsx
import { AlertTriangle, AlertCircle, TrendingUp } from "lucide-react";

// Critico
<AlertTriangle className="h-5 w-5 text-red-600" />

// Alerta
<AlertCircle className="h-5 w-5 text-amber-600" />

// Oportunidade
<TrendingUp className="h-5 w-5 text-green-600" />
```

---

## Hooks Customizados

### useDashboardFilters

Gerenciamento de filtros via URL.

```typescript
import { useDashboardFilters } from "@/hooks/use-dashboard-filters";

const {
  dateRange,       // { dataInicio, dataFim, label }
  doctorId,        // string | null
  setDateRange,    // (range: DateRange) => void
  setDoctorId,     // (id: string) => void
  clearDoctorId,   // () => void
  getTabUrl,       // (path: string) => string (preserva filtros)
} = useDashboardFilters();
```

### useSmartPolling

Polling adaptativo.

```typescript
import { useSmartPolling } from "@/hooks/use-smart-polling";

const { interval, isBackground, triggerActivity } = useSmartPolling("dashboard");

// Usar com React Query
const { data } = trpc.query.useQuery(undefined, {
  refetchInterval: interval,  // false quando inativo
});
```
