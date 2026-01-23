# Fase 5: Configuracoes Admin

> Duracao estimada: 2-3 dias
> Prioridade: Media
> Dependencias: Nenhuma

## Objetivo

Implementar as telas de configuracao do sistema para administradores:
- Configuracao de faixas (P1-P5)
- Horarios de funcionamento
- Sistema de strikes e penalidades
- Pesos do score

---

## Estrutura de Paginas

```
apps/web/src/app/(dashboard)/dashboard/config/
├── page.tsx                    # Visao geral das configs
├── faixas/
│   └── page.tsx               # Configuracao de faixas P1-P5
├── horarios/
│   └── page.tsx               # Horarios de funcionamento
├── strikes/
│   └── page.tsx               # Sistema de strikes
└── score/
    └── page.tsx               # Pesos do score
```

---

## Componentes a Criar

```
apps/web/src/components/config/
├── ConfigCard.tsx              # Card de configuracao
├── FaixaForm.tsx              # Formulario de faixa
├── HorarioFuncionamentoForm.tsx
├── StrikesForm.tsx
├── PesosScoreForm.tsx
└── ConfigPreview.tsx          # Preview de configuracao
```

---

## Configuracoes do Sistema

### 1. Configuracao de Faixas (P1-P5)

```typescript
interface FaixaConfig {
  scoreMinimo: number;        // Score minimo para estar na faixa
  consultasMinimas: number;   // Consultas minimas para subir
  slotsMaximo: number | null; // Limite maximo de slots (null = ilimitado)
  slotsMinimo: number;        // Minimo de slots obrigatorio
  periodos: ("manha" | "tarde" | "noite")[]; // Periodos permitidos
}

interface FaixasConfig {
  P1: FaixaConfig;
  P2: FaixaConfig;
  P3: FaixaConfig;
  P4: FaixaConfig;
  P5: FaixaConfig;
}

// Valores padrao
const FAIXAS_DEFAULT: FaixasConfig = {
  P1: {
    scoreMinimo: 80,
    consultasMinimas: 100,
    slotsMaximo: null,
    slotsMinimo: 10,
    periodos: ["manha", "tarde", "noite"],
  },
  P2: {
    scoreMinimo: 60,
    consultasMinimas: 50,
    slotsMaximo: 120,
    slotsMinimo: 10,
    periodos: ["manha", "tarde", "noite"],
  },
  P3: {
    scoreMinimo: 40,
    consultasMinimas: 25,
    slotsMaximo: 80,
    slotsMinimo: 8,
    periodos: ["tarde", "noite"],
  },
  P4: {
    scoreMinimo: 20,
    consultasMinimas: 10,
    slotsMaximo: 50,
    slotsMinimo: 5,
    periodos: ["tarde"],
  },
  P5: {
    scoreMinimo: 0,
    consultasMinimas: 0,
    slotsMaximo: 30,
    slotsMinimo: 3,
    periodos: ["tarde"],
  },
};
```

### Componente FaixaForm

```typescript
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

const faixaSchema = z.object({
  scoreMinimo: z.number().min(0).max(100),
  consultasMinimas: z.number().min(0),
  slotsMaximo: z.number().nullable(),
  slotsMinimo: z.number().min(1),
  periodos: z.array(z.enum(["manha", "tarde", "noite"])).min(1),
});

interface FaixaFormProps {
  faixa: "P1" | "P2" | "P3" | "P4" | "P5";
  config: FaixaConfig;
  onSave: () => void;
}

export function FaixaForm({ faixa, config, onSave }: FaixaFormProps) {
  const utils = trpc.useUtils();
  const updateFaixa = trpc.config.updateFaixas.useMutation({
    onSuccess: () => {
      toast.success(`Faixa ${faixa} atualizada!`);
      utils.config.getAll.invalidate();
      onSave();
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const form = useForm({
    resolver: zodResolver(faixaSchema),
    defaultValues: config,
  });

  const periodos = form.watch("periodos");

  const togglePeriodo = (periodo: "manha" | "tarde" | "noite") => {
    const current = form.getValues("periodos");
    if (current.includes(periodo)) {
      form.setValue("periodos", current.filter(p => p !== periodo));
    } else {
      form.setValue("periodos", [...current, periodo]);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className={`px-2 py-1 rounded text-sm font-bold ${
            faixa === "P1" ? "bg-green-700 text-white" :
            faixa === "P2" ? "bg-green-500 text-white" :
            faixa === "P3" ? "bg-yellow-500 text-black" :
            faixa === "P4" ? "bg-orange-500 text-white" :
            "bg-red-500 text-white"
          }`}>
            {faixa}
          </span>
          Configuracao
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit((data) => {
          // Enviar todas as faixas (API espera objeto completo)
          // Simplificado aqui - na pratica, buscar config atual e atualizar
        })} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Score Minimo</label>
              <Input
                type="number"
                {...form.register("scoreMinimo", { valueAsNumber: true })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Consultas Minimas</label>
              <Input
                type="number"
                {...form.register("consultasMinimas", { valueAsNumber: true })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Slots Maximo (vazio = ilimitado)</label>
              <Input
                type="number"
                {...form.register("slotsMaximo", { 
                  valueAsNumber: true,
                  setValueAs: v => v === "" ? null : Number(v)
                })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Slots Minimo</label>
              <Input
                type="number"
                {...form.register("slotsMinimo", { valueAsNumber: true })}
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium block mb-2">Periodos Permitidos</label>
            <div className="flex gap-4">
              {(["manha", "tarde", "noite"] as const).map((periodo) => (
                <label key={periodo} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={periodos.includes(periodo)}
                    onCheckedChange={() => togglePeriodo(periodo)}
                  />
                  <span className="capitalize">{periodo}</span>
                </label>
              ))}
            </div>
          </div>

          <Button type="submit" disabled={updateFaixa.isPending}>
            {updateFaixa.isPending ? "Salvando..." : "Salvar"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
```

---

### 2. Horarios de Funcionamento

```typescript
interface HorarioDia {
  inicio: string;  // "08:00"
  fim: string;     // "21:00"
  ativo: boolean;
}

interface HorariosFuncionamento {
  dom: HorarioDia;
  seg: HorarioDia;
  ter: HorarioDia;
  qua: HorarioDia;
  qui: HorarioDia;
  sex: HorarioDia;
  sab: HorarioDia;
}

// Valores padrao
const HORARIOS_DEFAULT: HorariosFuncionamento = {
  dom: { inicio: "08:00", fim: "17:00", ativo: true },
  seg: { inicio: "08:00", fim: "21:00", ativo: true },
  ter: { inicio: "08:00", fim: "21:00", ativo: true },
  qua: { inicio: "08:00", fim: "21:00", ativo: true },
  qui: { inicio: "08:00", fim: "21:00", ativo: true },
  sex: { inicio: "08:00", fim: "21:00", ativo: true },
  sab: { inicio: "08:00", fim: "17:00", ativo: true },
};
```

### Componente HorarioFuncionamentoForm

```typescript
"use client";

import { useForm } from "react-hook-form";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

const DIAS = [
  { key: "dom", label: "Domingo" },
  { key: "seg", label: "Segunda" },
  { key: "ter", label: "Terca" },
  { key: "qua", label: "Quarta" },
  { key: "qui", label: "Quinta" },
  { key: "sex", label: "Sexta" },
  { key: "sab", label: "Sabado" },
] as const;

export function HorarioFuncionamentoForm() {
  const { data: config, isLoading } = trpc.config.getByKey.useQuery({
    chave: "horarios_funcionamento",
  });
  
  const utils = trpc.useUtils();
  const updateHorarios = trpc.config.updateHorariosFuncionamento.useMutation({
    onSuccess: () => {
      toast.success("Horarios atualizados!");
      utils.config.getByKey.invalidate({ chave: "horarios_funcionamento" });
    },
  });

  const form = useForm({
    defaultValues: (config as HorariosFuncionamento) ?? HORARIOS_DEFAULT,
  });

  if (isLoading) return <div>Carregando...</div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Horarios de Funcionamento</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit((data) => updateHorarios.mutate(data))}>
          <div className="space-y-4">
            {DIAS.map(({ key, label }) => (
              <div key={key} className="flex items-center gap-4 p-4 border rounded-lg">
                <div className="w-24">
                  <span className="font-medium">{label}</span>
                </div>
                <Switch
                  checked={form.watch(`${key}.ativo`)}
                  onCheckedChange={(checked) => form.setValue(`${key}.ativo`, checked)}
                />
                <div className="flex items-center gap-2">
                  <Input
                    type="time"
                    className="w-32"
                    {...form.register(`${key}.inicio`)}
                    disabled={!form.watch(`${key}.ativo`)}
                  />
                  <span>ate</span>
                  <Input
                    type="time"
                    className="w-32"
                    {...form.register(`${key}.fim`)}
                    disabled={!form.watch(`${key}.ativo`)}
                  />
                </div>
              </div>
            ))}
          </div>
          
          <Button type="submit" className="mt-6" disabled={updateHorarios.isPending}>
            Salvar Horarios
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
```

---

### 3. Sistema de Strikes

```typescript
interface Penalidade {
  strikes: number;        // Numero de strikes para ativar
  reducaoSlots: number;   // Quantos slots reduzir
  duracaoDias: number;    // Por quantos dias
}

interface StrikesConfig {
  maxStrikes: number;
  penalidades: Penalidade[];
}

// Valores padrao
const STRIKES_DEFAULT: StrikesConfig = {
  maxStrikes: 5,
  penalidades: [
    { strikes: 2, reducaoSlots: 5, duracaoDias: 7 },
    { strikes: 3, reducaoSlots: 10, duracaoDias: 14 },
    { strikes: 4, reducaoSlots: 20, duracaoDias: 30 },
    { strikes: 5, reducaoSlots: 0, duracaoDias: 0 }, // Suspensao
  ],
};
```

---

### 4. Pesos do Score

```typescript
interface PesosScore {
  conversao: number;    // 0.0 - 1.0
  ticketMedio: number;  // 0.0 - 1.0
  // Soma deve ser 1.0
}

// Valores padrao
const PESOS_DEFAULT: PesosScore = {
  conversao: 0.66,
  ticketMedio: 0.34,
};
```

### Componente PesosScoreForm

```typescript
"use client";

import { useForm } from "react-hook-form";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export function PesosScoreForm() {
  const { data: config } = trpc.config.getByKey.useQuery({
    chave: "pesos_score",
  });
  
  const utils = trpc.useUtils();
  const updatePesos = trpc.config.updatePesosScore.useMutation({
    onSuccess: () => {
      toast.success("Pesos atualizados!");
      utils.config.getByKey.invalidate({ chave: "pesos_score" });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const form = useForm({
    defaultValues: (config as PesosScore) ?? PESOS_DEFAULT,
  });

  const conversao = form.watch("conversao");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pesos do Calculo de Score</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit((data) => updatePesos.mutate(data))}>
          <div className="space-y-6">
            <div>
              <div className="flex justify-between mb-2">
                <label className="font-medium">Taxa de Conversao</label>
                <span className="text-lg font-bold">{(conversao * 100).toFixed(0)}%</span>
              </div>
              <Slider
                value={[conversao]}
                onValueChange={([value]) => {
                  form.setValue("conversao", value!);
                  form.setValue("ticketMedio", 1 - value!);
                }}
                min={0}
                max={1}
                step={0.01}
              />
            </div>
            
            <div>
              <div className="flex justify-between mb-2">
                <label className="font-medium">Ticket Medio</label>
                <span className="text-lg font-bold">{((1 - conversao) * 100).toFixed(0)}%</span>
              </div>
              <Slider
                value={[1 - conversao]}
                onValueChange={([value]) => {
                  form.setValue("ticketMedio", value!);
                  form.setValue("conversao", 1 - value!);
                }}
                min={0}
                max={1}
                step={0.01}
              />
            </div>
            
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                Formula do Score:
              </p>
              <p className="font-mono mt-2">
                Score = (Percentil Conversao × {(conversao * 100).toFixed(0)}%) + 
                (Percentil Ticket × {((1 - conversao) * 100).toFixed(0)}%)
              </p>
            </div>
          </div>
          
          <Button type="submit" className="mt-6" disabled={updatePesos.isPending}>
            Salvar Pesos
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
```

---

## Pagina Principal de Config

```typescript
// apps/web/src/app/(dashboard)/dashboard/config/page.tsx

"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings, Clock, AlertTriangle, Calculator } from "lucide-react";

const CONFIG_SECTIONS = [
  {
    title: "Faixas P1-P5",
    description: "Configurar scores, limites e periodos por faixa",
    href: "/dashboard/config/faixas",
    icon: Settings,
  },
  {
    title: "Horarios de Funcionamento",
    description: "Horarios de abertura/fechamento por dia da semana",
    href: "/dashboard/config/horarios",
    icon: Clock,
  },
  {
    title: "Sistema de Strikes",
    description: "Penalidades e limites de strikes",
    href: "/dashboard/config/strikes",
    icon: AlertTriangle,
  },
  {
    title: "Pesos do Score",
    description: "Pesos para calculo do score (conversao vs ticket)",
    href: "/dashboard/config/score",
    icon: Calculator,
  },
];

export default function ConfigPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Configuracoes do Sistema</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {CONFIG_SECTIONS.map((section) => (
          <Link key={section.href} href={section.href}>
            <Card className="h-full hover:bg-muted/50 transition-colors cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <section.icon className="h-5 w-5 text-brand-600" />
                  {section.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{section.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
```

---

## Permissoes

Apenas usuarios com `tipo: "admin"` ou `tipo: "super_admin"` podem acessar as configuracoes.

```typescript
// Middleware de rota
export const adminProcedure = authenticatedProcedure.use(({ ctx, next }) => {
  if (!["admin", "super_admin"].includes(ctx.user.tipo)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Apenas administradores podem acessar esta funcionalidade",
    });
  }
  return next();
});
```

---

## Criterios de Aceite

- [ ] Tela de config de faixas funcional
- [ ] Tela de horarios de funcionamento funcional
- [ ] Tela de strikes funcional
- [ ] Tela de pesos do score funcional
- [ ] Validacoes de formularios funcionando
- [ ] Feedback de sucesso/erro nas operacoes
- [ ] Apenas admin pode acessar
- [ ] Valores salvos corretamente no banco

---

## Checklist de Conclusao

- [ ] Pagina principal de config
- [ ] Pagina de faixas
- [ ] Pagina de horarios
- [ ] Pagina de strikes
- [ ] Pagina de pesos
- [ ] Formularios com validacao
- [ ] Permissoes verificadas
- [ ] Testes implementados
- [ ] Code review realizado
