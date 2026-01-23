# Fase 2: Grade de Horarios Interativa

> Duracao estimada: 4-5 dias
> Prioridade: Alta
> Dependencias: Fase 1 (Queries Click)

## Objetivo

Implementar a grade interativa de horarios que permite ao medico:
- Visualizar horarios abertos/fechados
- Selecionar horarios para abrir (solicitar)
- Selecionar horarios para fechar
- Ver horarios com consultas agendadas (bloqueados)
- Ver dias bloqueados (hoje + 2)

---

## Arquivos a Criar/Modificar

### Componentes Novos
```
apps/web/src/components/
├── horarios/
│   ├── GradeHorarios.tsx        # Componente principal
│   ├── SlotHorario.tsx          # Celula individual
│   ├── LegendaGrade.tsx         # Legenda de cores
│   ├── ResumoSelecao.tsx        # Painel de selecao
│   ├── ModalConfirmacao.tsx     # Modal de confirmacao
│   └── hooks/
│       ├── useGradeState.ts     # Estado da grade
│       ├── useSlotSelection.ts  # Logica de selecao
│       └── useDiasBloqueados.ts # Calculo de dias bloqueados
```

### Paginas
```
apps/web/src/app/(dashboard)/dashboard/
├── meus-horarios/
│   └── page.tsx                 # Visualizacao de horarios
├── solicitar/
│   └── page.tsx                 # Solicitar abertura (ja existe, melhorar)
└── fechar/
    └── page.tsx                 # Fechar horarios
```

---

## Design da Grade

### Layout Visual

```
+------------------------------------------------------------------+
|                    Meus Horarios                                  |
+------------------------------------------------------------------+
| Legenda: [■ Aberto] [□ Fechado] [■ Selecionado] [🔒 Bloqueado]   |
+------------------------------------------------------------------+
|        | DOM | SEG | TER | QUA | QUI | SEX | SAB |
+--------+-----+-----+-----+-----+-----+-----+-----+
| 08:00  |  □  |  ■  |  ■  |  □  |  □  |  ■  |  □  |
| 08:20  |  □  |  ■  |  ■  |  □  |  □  |  ■  |  □  |
| 08:40  |  □  |  ■  |  □  |  □  |  □  |  ■  |  □  |
| 09:00  |  □  |  ■  |  □  |  □  |  □  |  ■  |  □  |
| ...    | ... | ... | ... | ... | ... | ... | ... |
| 20:00  |  □  |  □  |  □  |  □  |  □  |  □  |  □  |
| 20:20  |  □  |  □  |  □  |  □  |  □  |  □  |  □  |
| 20:40  |  □  |  □  |  □  |  □  |  □  |  □  |  □  |
+--------+-----+-----+-----+-----+-----+-----+-----+

+------------------------------------------------------------------+
| Selecao: 5 slots para abrir | [Cancelar] [Solicitar Abertura]    |
+------------------------------------------------------------------+
```

---

## Estados dos Slots

### Enum de Estados

```typescript
type SlotEstado = 
  | "fechado"           // Cinza - Slot disponivel para abrir
  | "aberto"            // Verde - Slot ja aberto
  | "selecionado-abrir" // Amarelo - Marcado para solicitar abertura
  | "selecionado-fechar"// Vermelho - Marcado para fechar
  | "com-consulta"      // Verde + Badge - Tem consulta agendada
  | "bloqueado"         // Cinza + Cadeado - Dia bloqueado (hoje+2)
  | "fora-periodo"      // Cinza escuro - Fora do periodo da faixa
  | "pendente"          // Amarelo tracejado - Solicitacao pendente
```

### Cores Tailwind

```typescript
const SLOT_COLORS: Record<SlotEstado, string> = {
  "fechado": "bg-gray-100 hover:bg-gray-200 cursor-pointer",
  "aberto": "bg-brand-100 border-brand-500 border-2",
  "selecionado-abrir": "bg-amber-200 border-amber-500 border-2",
  "selecionado-fechar": "bg-red-200 border-red-500 border-2",
  "com-consulta": "bg-brand-200 border-brand-600 border-2",
  "bloqueado": "bg-gray-300 cursor-not-allowed opacity-60",
  "fora-periodo": "bg-gray-400 cursor-not-allowed opacity-40",
  "pendente": "bg-amber-100 border-amber-400 border-dashed border-2",
};
```

---

## Componentes Detalhados

### 1. GradeHorarios.tsx

```typescript
"use client";

import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { SlotHorario } from "./SlotHorario";
import { LegendaGrade } from "./LegendaGrade";
import { ResumoSelecao } from "./ResumoSelecao";
import { useGradeState } from "./hooks/useGradeState";
import { useDiasBloqueados } from "./hooks/useDiasBloqueados";

interface GradeHorariosProps {
  modo: "visualizar" | "solicitar" | "fechar";
  onSubmit?: (slots: Slot[]) => void;
}

const DIAS_SEMANA = ["dom", "seg", "ter", "qua", "qui", "sex", "sab"] as const;
const SLOT_DURACAO = 20; // minutos

function gerarHorarios(inicio: string, fim: string): string[] {
  const horarios: string[] = [];
  const [hInicio, mInicio] = inicio.split(":").map(Number);
  const [hFim, mFim] = fim.split(":").map(Number);
  
  let minutos = hInicio * 60 + mInicio;
  const fimMinutos = hFim * 60 + mFim;
  
  while (minutos < fimMinutos) {
    const h = Math.floor(minutos / 60);
    const m = minutos % 60;
    horarios.push(`${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`);
    minutos += SLOT_DURACAO;
  }
  
  return horarios;
}

export function GradeHorarios({ modo, onSubmit }: GradeHorariosProps) {
  const { data: gradeData, isLoading } = trpc.medico.getGradeHorarios.useQuery();
  const { data: configFaixa } = trpc.medico.getConfigFaixa.useQuery();
  const { data: consultasData } = trpc.medico.proximasConsultas.useQuery({ limite: 50 });
  
  const diasBloqueados = useDiasBloqueados();
  const { 
    selecionados, 
    toggleSlot, 
    limparSelecao, 
    getSlotsParaAcao 
  } = useGradeState(modo);

  const horarios = useMemo(() => {
    const config = gradeData?.configFuncionamento as Record<string, { inicio: string; fim: string }> | null;
    // Usar horario mais amplo (08:00-21:00) como padrao
    return gerarHorarios("08:00", "21:00");
  }, [gradeData]);

  const horariosAbertosSet = useMemo(() => {
    return new Set(
      gradeData?.horariosAbertos.map(h => `${h.diaSemana}-${h.horario}`) ?? []
    );
  }, [gradeData]);

  const consultasSet = useMemo(() => {
    const set = new Set<string>();
    // Mapear consultas para slots
    consultasData?.forEach(c => {
      set.add(`${c.dia_semana}-${c.hora}`);
    });
    return set;
  }, [consultasData]);

  const getEstadoSlot = (dia: string, horario: string): SlotEstado => {
    const key = `${dia}-${horario}`;
    
    // Verificar se esta selecionado
    if (selecionados.has(key)) {
      return modo === "solicitar" ? "selecionado-abrir" : "selecionado-fechar";
    }
    
    // Verificar se dia esta bloqueado
    if (diasBloqueados.includes(dia)) {
      return "bloqueado";
    }
    
    // Verificar se tem consulta
    if (consultasSet.has(key)) {
      return "com-consulta";
    }
    
    // Verificar se esta aberto
    if (horariosAbertosSet.has(key)) {
      return "aberto";
    }
    
    // Verificar se esta fora do periodo permitido pela faixa
    // TODO: implementar logica de periodo
    
    return "fechado";
  };

  const handleSlotClick = (dia: string, horario: string) => {
    const estado = getEstadoSlot(dia, horario);
    
    // Nao permitir click em slots bloqueados
    if (estado === "bloqueado" || estado === "fora-periodo") {
      return;
    }
    
    // Modo solicitar: so permite selecionar slots fechados
    if (modo === "solicitar" && estado !== "fechado" && estado !== "selecionado-abrir") {
      return;
    }
    
    // Modo fechar: so permite selecionar slots abertos
    if (modo === "fechar" && estado !== "aberto" && estado !== "selecionado-fechar") {
      return;
    }
    
    toggleSlot(dia, horario);
  };

  if (isLoading) {
    return <div>Carregando...</div>;
  }

  return (
    <div className="space-y-4">
      <LegendaGrade modo={modo} />
      
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="p-2 border bg-gray-50 w-20">Horario</th>
              {DIAS_SEMANA.map(dia => (
                <th 
                  key={dia} 
                  className={`p-2 border bg-gray-50 uppercase ${
                    diasBloqueados.includes(dia) ? "text-gray-400" : ""
                  }`}
                >
                  {dia}
                  {diasBloqueados.includes(dia) && " 🔒"}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {horarios.map(horario => (
              <tr key={horario}>
                <td className="p-2 border bg-gray-50 text-sm font-mono">
                  {horario}
                </td>
                {DIAS_SEMANA.map(dia => (
                  <td key={`${dia}-${horario}`} className="p-1 border">
                    <SlotHorario
                      dia={dia}
                      horario={horario}
                      estado={getEstadoSlot(dia, horario)}
                      onClick={() => handleSlotClick(dia, horario)}
                      temConsulta={consultasSet.has(`${dia}-${horario}`)}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {selecionados.size > 0 && (
        <ResumoSelecao
          slots={getSlotsParaAcao()}
          modo={modo}
          onCancelar={limparSelecao}
          onConfirmar={() => onSubmit?.(getSlotsParaAcao())}
        />
      )}
    </div>
  );
}
```

### 2. SlotHorario.tsx

```typescript
import { cn } from "@/lib/utils";

interface SlotHorarioProps {
  dia: string;
  horario: string;
  estado: SlotEstado;
  onClick: () => void;
  temConsulta?: boolean;
}

const SLOT_COLORS: Record<SlotEstado, string> = {
  "fechado": "bg-gray-100 hover:bg-gray-200 cursor-pointer",
  "aberto": "bg-brand-100 border-brand-500 border-2 cursor-pointer",
  "selecionado-abrir": "bg-amber-200 border-amber-500 border-2 cursor-pointer",
  "selecionado-fechar": "bg-red-200 border-red-500 border-2 cursor-pointer",
  "com-consulta": "bg-brand-200 border-brand-600 border-2",
  "bloqueado": "bg-gray-300 cursor-not-allowed opacity-60",
  "fora-periodo": "bg-gray-400 cursor-not-allowed opacity-40",
  "pendente": "bg-amber-100 border-amber-400 border-dashed border-2",
};

export function SlotHorario({ dia, horario, estado, onClick, temConsulta }: SlotHorarioProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={estado === "bloqueado" || estado === "fora-periodo"}
      className={cn(
        "w-full h-8 rounded-lg transition-colors relative",
        SLOT_COLORS[estado]
      )}
      title={`${dia.toUpperCase()} ${horario}`}
    >
      {temConsulta && (
        <span className="absolute top-0 right-0 w-2 h-2 bg-blue-500 rounded-full" />
      )}
      {estado === "bloqueado" && (
        <span className="text-xs">🔒</span>
      )}
    </button>
  );
}
```

### 3. Hook useGradeState.ts

```typescript
import { useState, useCallback } from "react";

interface Slot {
  diaSemana: string;
  horario: string;
}

export function useGradeState(modo: "visualizar" | "solicitar" | "fechar") {
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  
  const toggleSlot = useCallback((dia: string, horario: string) => {
    const key = `${dia}-${horario}`;
    setSelecionados(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);
  
  const limparSelecao = useCallback(() => {
    setSelecionados(new Set());
  }, []);
  
  const getSlotsParaAcao = useCallback((): Slot[] => {
    return Array.from(selecionados).map(key => {
      const [diaSemana, horario] = key.split("-");
      return { diaSemana: diaSemana!, horario: horario! };
    });
  }, [selecionados]);
  
  // Selecao em range com Shift+Click
  const selecionarRange = useCallback((inicio: string, fim: string, horarios: string[], dias: string[]) => {
    // Implementar logica de range
  }, []);
  
  return {
    selecionados,
    toggleSlot,
    limparSelecao,
    getSlotsParaAcao,
    selecionarRange,
  };
}
```

### 4. Hook useDiasBloqueados.ts

```typescript
import { useMemo } from "react";

const DIAS_ORDEM = ["dom", "seg", "ter", "qua", "qui", "sex", "sab"];

export function useDiasBloqueados(): string[] {
  return useMemo(() => {
    const hoje = new Date();
    const diasBloqueados: string[] = [];
    
    // Bloquear hoje + proximos 2 dias
    for (let i = 0; i < 3; i++) {
      const data = new Date(hoje);
      data.setDate(hoje.getDate() + i);
      const diaSemana = DIAS_ORDEM[data.getDay()];
      if (diaSemana) {
        diasBloqueados.push(diaSemana);
      }
    }
    
    return diasBloqueados;
  }, []);
}
```

---

## Fluxos de Usuario

### Fluxo 1: Solicitar Abertura de Horarios

```
1. Medico acessa /dashboard/solicitar
2. Ve grade com horarios atuais (verde = aberto, cinza = fechado)
3. Clica em slots cinza para selecionar (ficam amarelos)
4. Sistema valida:
   - Periodo permitido pela faixa
   - Limite de slots nao excedido
   - Minimo de slots atendido
5. Painel inferior mostra resumo da selecao
6. Medico clica "Solicitar Abertura"
7. Sistema cria Solicitacao com status "pendente"
8. Feedback: "Solicitacao enviada! Aguarde aprovacao."
9. Medico e redirecionado para historico
```

### Fluxo 2: Fechar Horarios (Sem Consulta)

```
1. Medico acessa /dashboard/fechar
2. Ve grade com horarios atuais
3. Dias bloqueados (hoje+2) mostram cadeado
4. Slots com consulta mostram badge azul
5. Medico seleciona slots verdes (sem consulta, fora do bloqueio)
6. Slots ficam vermelhos
7. Sistema valida:
   - Nao tem consulta agendada
   - Nao e dia bloqueado
   - Minimo de slots mantido
8. Medico confirma fechamento
9. Sistema desativa MedicoHorario imediatamente
10. Sync com Click (se integrado)
```

### Fluxo 3: Cancelamento Emergencial (Com Consulta)

```
1. Medico tenta fechar slot com consulta
2. Sistema detecta consulta agendada
3. Modal aparece: "Este horario tem consulta. Deseja solicitar cancelamento emergencial?"
4. Medico seleciona motivo (doenca, emergencia_familiar, compromisso_medico)
5. Medico confirma
6. Sistema cria CancelamentoEmergencial com status "pendente"
7. Staff recebe notificacao
8. Feedback: "Solicitacao de cancelamento enviada!"
```

---

## Validacoes Frontend

```typescript
interface ValidacaoGrade {
  valido: boolean;
  erros: string[];
}

function validarSelecaoAbertura(
  slots: Slot[],
  horariosAtuais: Slot[],
  configFaixa: FaixaConfig,
  periodos: PeriodosConfig
): ValidacaoGrade {
  const erros: string[] = [];
  
  // 1. Verificar limite de slots
  const totalAposAbertura = horariosAtuais.length + slots.length;
  if (configFaixa.slotsMaximo && totalAposAbertura > configFaixa.slotsMaximo) {
    erros.push(`Limite de ${configFaixa.slotsMaximo} slots semanais seria excedido`);
  }
  
  // 2. Verificar periodo permitido
  const periodosPermitidos = configFaixa.periodos;
  for (const slot of slots) {
    const periodo = getPeriodoDoHorario(slot.horario, periodos);
    if (!periodosPermitidos.includes(periodo)) {
      erros.push(`Horario ${slot.horario} esta no periodo ${periodo}, nao permitido para sua faixa`);
    }
  }
  
  return {
    valido: erros.length === 0,
    erros,
  };
}

function validarSelecaoFechamento(
  slots: Slot[],
  horariosAtuais: Slot[],
  configFaixa: FaixaConfig,
  consultasAgendadas: Set<string>,
  diasBloqueados: string[]
): ValidacaoGrade {
  const erros: string[] = [];
  
  // 1. Verificar minimo de slots
  const totalAposFechamento = horariosAtuais.length - slots.length;
  if (totalAposFechamento < configFaixa.slotsMinimo) {
    erros.push(`Minimo de ${configFaixa.slotsMinimo} slots por semana para sua faixa`);
  }
  
  // 2. Verificar dias bloqueados
  for (const slot of slots) {
    if (diasBloqueados.includes(slot.diaSemana)) {
      erros.push(`Dia ${slot.diaSemana} esta bloqueado (hoje + 2 dias)`);
    }
  }
  
  // 3. Verificar consultas agendadas
  const slotsComConsulta = slots.filter(s => 
    consultasAgendadas.has(`${s.diaSemana}-${s.horario}`)
  );
  if (slotsComConsulta.length > 0) {
    erros.push(`${slotsComConsulta.length} slot(s) tem consulta agendada. Use cancelamento emergencial.`);
  }
  
  return {
    valido: erros.length === 0,
    erros,
  };
}
```

---

## Responsividade

### Mobile
- Grade com scroll horizontal
- Slots maiores (toque amigavel)
- Painel de resumo fixo no bottom

### Tablet
- Grade completa visivel
- Selecao com toque

### Desktop
- Shift+Click para selecao em range
- Hover states
- Tooltips com detalhes

---

## Acessibilidade

```typescript
// Atributos ARIA
<button
  role="gridcell"
  aria-label={`Horario ${horario} ${dia}, ${estado}`}
  aria-selected={estado.includes("selecionado")}
  aria-disabled={estado === "bloqueado"}
  tabIndex={0}
/>
```

---

## Testes

### Testes Unitarios

```typescript
describe("useGradeState", () => {
  it("deve adicionar slot ao selecionados", () => {});
  it("deve remover slot ao clicar novamente", () => {});
  it("deve limpar selecao", () => {});
  it("deve retornar slots formatados", () => {});
});

describe("useDiasBloqueados", () => {
  it("deve retornar hoje + 2 dias", () => {});
  it("deve lidar com virada de semana", () => {});
});

describe("validarSelecaoAbertura", () => {
  it("deve rejeitar se exceder limite", () => {});
  it("deve rejeitar periodo nao permitido", () => {});
  it("deve aceitar selecao valida", () => {});
});
```

### Testes E2E

```typescript
describe("Grade de Horarios", () => {
  it("deve permitir selecionar slots para abrir", () => {});
  it("deve mostrar erro ao exceder limite", () => {});
  it("deve bloquear dias bloqueados", () => {});
  it("deve mostrar badge em slots com consulta", () => {});
});
```

---

## Criterios de Aceite

- [ ] Grade renderiza corretamente todos os horarios
- [ ] Cores dos slots correspondem aos estados
- [ ] Selecao/desselecao funciona com click
- [ ] Dias bloqueados nao permitem interacao
- [ ] Slots com consulta mostram indicador
- [ ] Validacoes de faixa funcionam
- [ ] Painel de resumo mostra selecao
- [ ] Integracao com endpoints tRPC funciona
- [ ] Responsivo em mobile/tablet/desktop
- [ ] Acessivel via teclado

---

## Checklist de Conclusao

- [ ] Componente GradeHorarios implementado
- [ ] Componente SlotHorario implementado
- [ ] Hooks de estado implementados
- [ ] Pagina /dashboard/solicitar atualizada
- [ ] Pagina /dashboard/fechar criada
- [ ] Validacoes frontend implementadas
- [ ] Testes unitarios passando
- [ ] Responsividade testada
- [ ] Code review realizado
