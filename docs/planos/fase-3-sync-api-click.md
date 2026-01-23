# Fase 3: Sincronizacao com API Click

> Duracao estimada: 2-3 dias
> Prioridade: Alta
> Dependencias: Fase 2 (Grade de Horarios)

## Objetivo

Implementar a sincronizacao bidirecional com a API Click:
- **Escrita**: Atualizar horarios do medico no Click apos aprovacao
- **Retry**: Fila de retry para falhas de sincronizacao
- **Auditoria**: Registrar todas as sincronizacoes

---

## APIs Click Disponiveis

### 1. Atualizar Horario do Medico

**Endpoint**: `POST https://clickcannabis.app.n8n.cloud/webhook/atualizar-hora-medico`

**Body**:
```json
{
  "doctor_id": 123,
  "schedule": {
    "DOM": ["08:00-12:00", "14:00-18:00"],
    "SEG": ["08:00-12:00"],
    "TER": [],
    "QUA": ["14:00-18:00"],
    "QUI": ["08:00-12:00", "14:00-18:00"],
    "SEX": ["08:00-12:00"],
    "SAB": []
  }
}
```

**Response**:
```json
{
  "success": true,
  "message": "Horarios atualizados com sucesso"
}
```

### 2. Atualizar Prioridade do Medico

**Endpoint**: `POST https://clickcannabis.app.n8n.cloud/webhook/atualizar-prioridade-medico`

**Body**:
```json
[
  { "id": 123, "prioridade": 1 },
  { "id": 456, "prioridade": 2 }
]
```

---

## Arquivos a Criar/Modificar

### Novos Arquivos
```
packages/api/src/
├── services/
│   ├── click-api.service.ts     # Cliente HTTP para API Click
│   ├── sync.service.ts          # Logica de sincronizacao
│   └── retry-queue.service.ts   # Gerenciamento da fila de retry
└── utils/
    └── horario-converter.ts     # Conversao de formatos de horario
```

### Arquivos Existentes a Modificar
```
packages/api/src/routers/aprovacoes.ts  # Chamar sync apos aprovacao
packages/api/src/routers/solicitacoes.ts # Chamar sync apos fechamento
```

---

## Implementacao Detalhada

### 1. Cliente API Click

**Arquivo**: `packages/api/src/services/click-api.service.ts`

```typescript
import { TRPCError } from "@trpc/server";

const CLICK_API_BASE_URL = "https://clickcannabis.app.n8n.cloud/webhook";
const CLICK_API_TIMEOUT = 30000; // 30 segundos

interface ClickSchedule {
  DOM: string[];
  SEG: string[];
  TER: string[];
  QUA: string[];
  QUI: string[];
  SEX: string[];
  SAB: string[];
}

interface AtualizarHorarioPayload {
  doctor_id: number;
  schedule: ClickSchedule;
}

interface AtualizarPrioridadePayload {
  id: number;
  prioridade: number;
}

interface ClickApiResponse {
  success: boolean;
  message?: string;
  error?: string;
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeout: number = CLICK_API_TIMEOUT
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

export const clickApi = {
  atualizarHorarioMedico: async (payload: AtualizarHorarioPayload): Promise<ClickApiResponse> => {
    try {
      const response = await fetchWithTimeout(
        `${CLICK_API_BASE_URL}/atualizar-hora-medico`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );
      
      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          error: `HTTP ${response.status}: ${errorText}`,
        };
      }
      
      const data = await response.json();
      return data as ClickApiResponse;
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === "AbortError") {
          return { success: false, error: "Timeout ao conectar com API Click" };
        }
        return { success: false, error: error.message };
      }
      return { success: false, error: "Erro desconhecido" };
    }
  },

  atualizarPrioridadeMedicos: async (
    payload: AtualizarPrioridadePayload[]
  ): Promise<ClickApiResponse> => {
    try {
      const response = await fetchWithTimeout(
        `${CLICK_API_BASE_URL}/atualizar-prioridade-medico`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );
      
      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          error: `HTTP ${response.status}: ${errorText}`,
        };
      }
      
      const data = await response.json();
      return data as ClickApiResponse;
    } catch (error) {
      if (error instanceof Error) {
        return { success: false, error: error.message };
      }
      return { success: false, error: "Erro desconhecido" };
    }
  },
};
```

### 2. Conversor de Horarios

**Arquivo**: `packages/api/src/utils/horario-converter.ts`

```typescript
interface Slot {
  diaSemana: string;
  horario: string;
}

interface ClickSchedule {
  DOM: string[];
  SEG: string[];
  TER: string[];
  QUA: string[];
  QUI: string[];
  SEX: string[];
  SAB: string[];
}

const DIA_MAP: Record<string, keyof ClickSchedule> = {
  dom: "DOM",
  seg: "SEG",
  ter: "TER",
  qua: "QUA",
  qui: "QUI",
  sex: "SEX",
  sab: "SAB",
};

const DIA_MAP_REVERSE: Record<string, string> = {
  DOM: "dom",
  SEG: "seg",
  TER: "ter",
  QUA: "qua",
  QUI: "qui",
  SEX: "sex",
  SAB: "sab",
};

/**
 * Agrupa slots de 20 minutos em blocos contiguos
 * Ex: ["08:00", "08:20", "08:40", "09:00"] -> ["08:00-09:20"]
 */
function agruparSlotsEmBlocos(slots: string[]): string[] {
  if (slots.length === 0) return [];
  
  // Ordenar slots
  const sorted = [...slots].sort();
  const blocos: string[] = [];
  
  let inicioBloco = sorted[0]!;
  let fimBloco = sorted[0]!;
  
  for (let i = 1; i < sorted.length; i++) {
    const slotAtual = sorted[i]!;
    const slotAnterior = sorted[i - 1]!;
    
    // Verificar se e contíguo (20 minutos de diferença)
    const [hAnt, mAnt] = slotAnterior.split(":").map(Number);
    const [hAtual, mAtual] = slotAtual.split(":").map(Number);
    
    const minutosAnt = hAnt! * 60 + mAnt!;
    const minutosAtual = hAtual! * 60 + mAtual!;
    
    if (minutosAtual - minutosAnt === 20) {
      // Contíguo, estender bloco
      fimBloco = slotAtual;
    } else {
      // Nao contíguo, fechar bloco anterior e iniciar novo
      const fimBlocoAjustado = adicionarMinutos(fimBloco, 20);
      blocos.push(`${inicioBloco}-${fimBlocoAjustado}`);
      inicioBloco = slotAtual;
      fimBloco = slotAtual;
    }
  }
  
  // Fechar ultimo bloco
  const fimBlocoAjustado = adicionarMinutos(fimBloco, 20);
  blocos.push(`${inicioBloco}-${fimBlocoAjustado}`);
  
  return blocos;
}

function adicionarMinutos(horario: string, minutos: number): string {
  const [h, m] = horario.split(":").map(Number);
  const totalMinutos = h! * 60 + m! + minutos;
  const novaHora = Math.floor(totalMinutos / 60);
  const novosMinutos = totalMinutos % 60;
  return `${novaHora.toString().padStart(2, "0")}:${novosMinutos.toString().padStart(2, "0")}`;
}

/**
 * Expande bloco em slots de 20 minutos
 * Ex: "08:00-12:00" -> ["08:00", "08:20", "08:40", "09:00", ..., "11:40"]
 */
function expandirBlocoEmSlots(bloco: string): string[] {
  const [inicio, fim] = bloco.split("-");
  if (!inicio || !fim) return [];
  
  const slots: string[] = [];
  const [hInicio, mInicio] = inicio.split(":").map(Number);
  const [hFim, mFim] = fim.split(":").map(Number);
  
  let minutos = hInicio! * 60 + mInicio!;
  const fimMinutos = hFim! * 60 + mFim!;
  
  while (minutos < fimMinutos) {
    const h = Math.floor(minutos / 60);
    const m = minutos % 60;
    slots.push(`${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`);
    minutos += 20;
  }
  
  return slots;
}

/**
 * Converte slots do banco local para formato Click
 */
export function slotsParaClickSchedule(slots: Slot[]): ClickSchedule {
  const schedule: ClickSchedule = {
    DOM: [],
    SEG: [],
    TER: [],
    QUA: [],
    QUI: [],
    SEX: [],
    SAB: [],
  };
  
  // Agrupar por dia
  const porDia: Record<string, string[]> = {};
  for (const slot of slots) {
    const diaClick = DIA_MAP[slot.diaSemana];
    if (!diaClick) continue;
    
    if (!porDia[diaClick]) {
      porDia[diaClick] = [];
    }
    porDia[diaClick]!.push(slot.horario);
  }
  
  // Converter para blocos
  for (const [dia, horarios] of Object.entries(porDia)) {
    schedule[dia as keyof ClickSchedule] = agruparSlotsEmBlocos(horarios);
  }
  
  return schedule;
}

/**
 * Converte formato Click para slots do banco local
 */
export function clickScheduleParaSlots(schedule: ClickSchedule): Slot[] {
  const slots: Slot[] = [];
  
  for (const [dia, blocos] of Object.entries(schedule)) {
    const diaSemana = DIA_MAP_REVERSE[dia];
    if (!diaSemana) continue;
    
    for (const bloco of blocos) {
      const slotsDoBloco = expandirBlocoEmSlots(bloco);
      for (const horario of slotsDoBloco) {
        slots.push({ diaSemana, horario });
      }
    }
  }
  
  return slots;
}

export { agruparSlotsEmBlocos, expandirBlocoEmSlots };
```

### 3. Servico de Sincronizacao

**Arquivo**: `packages/api/src/services/sync.service.ts`

```typescript
import prisma from "@clickmedicos/db";
import { clickApi } from "./click-api.service";
import { slotsParaClickSchedule } from "../utils/horario-converter";

interface SyncResult {
  success: boolean;
  error?: string;
  queuedForRetry?: boolean;
}

export async function sincronizarHorariosMedicoComClick(
  medicoId: string
): Promise<SyncResult> {
  // 1. Buscar medico e horarios
  const medico = await prisma.user.findUnique({
    where: { id: medicoId },
    include: {
      horarios: {
        where: { ativo: true },
      },
    },
  });
  
  if (!medico) {
    return { success: false, error: "Medico nao encontrado" };
  }
  
  if (!medico.clickDoctorId) {
    return { success: false, error: "Medico nao vinculado ao Click" };
  }
  
  // 2. Converter para formato Click
  const slots = medico.horarios.map(h => ({
    diaSemana: h.diaSemana,
    horario: h.horario,
  }));
  
  const schedule = slotsParaClickSchedule(slots);
  
  // 3. Chamar API Click
  const response = await clickApi.atualizarHorarioMedico({
    doctor_id: medico.clickDoctorId,
    schedule,
  });
  
  // 4. Se falhou, adicionar a fila de retry
  if (!response.success) {
    await adicionarFilaRetry("atualizar_horario", {
      medicoId,
      clickDoctorId: medico.clickDoctorId,
      schedule,
    });
    
    return {
      success: false,
      error: response.error,
      queuedForRetry: true,
    };
  }
  
  return { success: true };
}

export async function adicionarFilaRetry(
  tipo: string,
  payload: Record<string, unknown>
): Promise<void> {
  await prisma.syncQueue.create({
    data: {
      tipo,
      payload,
      tentativas: 0,
      maxTentativas: 5,
      proximoRetry: new Date(),
    },
  });
}

export async function processarFilaRetry(): Promise<{
  processados: number;
  sucesso: number;
  falha: number;
}> {
  const itens = await prisma.syncQueue.findMany({
    where: {
      processadoEm: null,
      tentativas: { lt: 5 },
      proximoRetry: { lte: new Date() },
    },
    orderBy: { createdAt: "asc" },
    take: 10,
  });
  
  let sucesso = 0;
  let falha = 0;
  
  for (const item of itens) {
    const payload = item.payload as Record<string, unknown>;
    
    try {
      let response;
      
      if (item.tipo === "atualizar_horario") {
        response = await clickApi.atualizarHorarioMedico({
          doctor_id: payload.clickDoctorId as number,
          schedule: payload.schedule as ClickSchedule,
        });
      } else {
        // Tipo desconhecido
        await prisma.syncQueue.update({
          where: { id: item.id },
          data: {
            processadoEm: new Date(),
            erro: "Tipo de operacao desconhecido",
          },
        });
        falha++;
        continue;
      }
      
      if (response.success) {
        await prisma.syncQueue.update({
          where: { id: item.id },
          data: { processadoEm: new Date() },
        });
        sucesso++;
      } else {
        // Incrementar tentativas e agendar proximo retry
        const proximoRetry = new Date();
        proximoRetry.setMinutes(proximoRetry.getMinutes() + Math.pow(2, item.tentativas) * 5);
        
        await prisma.syncQueue.update({
          where: { id: item.id },
          data: {
            tentativas: { increment: 1 },
            proximoRetry,
            erro: response.error,
          },
        });
        falha++;
      }
    } catch (error) {
      await prisma.syncQueue.update({
        where: { id: item.id },
        data: {
          tentativas: { increment: 1 },
          erro: error instanceof Error ? error.message : "Erro desconhecido",
        },
      });
      falha++;
    }
  }
  
  return {
    processados: itens.length,
    sucesso,
    falha,
  };
}
```

### 4. Integracao com Aprovacoes

**Modificar**: `packages/api/src/routers/aprovacoes.ts`

Adicionar apos aprovar solicitacao:

```typescript
import { sincronizarHorariosMedicoComClick } from "../services/sync.service";

// Dentro de aprovarSolicitacao, apos criar MedicoHorario:
// ...

// Sincronizar com Click
const syncResult = await sincronizarHorariosMedicoComClick(solicitacao.medicoId);

if (!syncResult.success) {
  // Nao falhar a aprovacao, apenas registrar
  await tx.auditoria.create({
    data: {
      usuarioId: null,
      acao: "SYNC_CLICK_FALHA",
      entidade: "solicitacao",
      entidadeId: input.solicitacaoId,
      dadosDepois: {
        erro: syncResult.error,
        filaRetry: syncResult.queuedForRetry,
      },
    },
  });
}

// ...
```

---

## Fila de Retry

### Estrategia de Backoff Exponencial

```
Tentativa 1: Imediato
Tentativa 2: +5 minutos
Tentativa 3: +20 minutos
Tentativa 4: +80 minutos
Tentativa 5: +320 minutos (~5 horas)
```

### Schema ja existente

```prisma
model SyncQueue {
  id            String    @id @default(uuid())
  tipo          String
  payload       Json
  tentativas    Int       @default(0)
  maxTentativas Int       @default(5)
  erro          String?
  processadoEm  DateTime?
  proximoRetry  DateTime  @default(now())
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}
```

### Endpoint Admin para Ver Fila

```typescript
// Adicionar ao config.ts ou criar sync.ts router

filaRetry: adminProcedure.query(async () => {
  const [pendentes, processados, falhas] = await Promise.all([
    prisma.syncQueue.count({
      where: { processadoEm: null, tentativas: { lt: 5 } },
    }),
    prisma.syncQueue.count({
      where: { processadoEm: { not: null } },
    }),
    prisma.syncQueue.count({
      where: { processadoEm: null, tentativas: { gte: 5 } },
    }),
  ]);
  
  const itens = await prisma.syncQueue.findMany({
    where: { processadoEm: null },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  
  return {
    estatisticas: { pendentes, processados, falhas },
    itens,
  };
}),

processarFilaManual: adminProcedure.mutation(async () => {
  return processarFilaRetry();
}),
```

---

## Testes

### Testes Unitarios

```typescript
describe("horario-converter", () => {
  describe("agruparSlotsEmBlocos", () => {
    it("deve agrupar slots contiguos", () => {
      const slots = ["08:00", "08:20", "08:40", "09:00"];
      expect(agruparSlotsEmBlocos(slots)).toEqual(["08:00-09:20"]);
    });
    
    it("deve separar slots nao contiguos", () => {
      const slots = ["08:00", "08:20", "14:00", "14:20"];
      expect(agruparSlotsEmBlocos(slots)).toEqual(["08:00-08:40", "14:00-14:40"]);
    });
  });
  
  describe("expandirBlocoEmSlots", () => {
    it("deve expandir bloco em slots de 20 min", () => {
      expect(expandirBlocoEmSlots("08:00-09:00")).toEqual([
        "08:00", "08:20", "08:40"
      ]);
    });
  });
  
  describe("slotsParaClickSchedule", () => {
    it("deve converter formato local para Click", () => {
      const slots = [
        { diaSemana: "seg", horario: "08:00" },
        { diaSemana: "seg", horario: "08:20" },
      ];
      const result = slotsParaClickSchedule(slots);
      expect(result.SEG).toEqual(["08:00-08:40"]);
    });
  });
});

describe("sync.service", () => {
  it("deve sincronizar horarios com Click", async () => {
    // Mock da API Click
    // ...
  });
  
  it("deve adicionar a fila de retry em caso de falha", async () => {
    // ...
  });
});
```

### Testes de Integracao

```typescript
describe("Integracao Click API", () => {
  it("deve enviar horarios no formato correto", async () => {
    // Usar sandbox/staging da API Click se disponivel
  });
});
```

---

## Monitoramento

### Metricas a Coletar

- Taxa de sucesso de sincronizacao
- Tempo medio de resposta da API Click
- Itens na fila de retry
- Falhas permanentes (5+ tentativas)

### Alertas Sugeridos

- Fila de retry > 10 itens pendentes
- Taxa de falha > 20%
- API Click offline por > 5 minutos

---

## Criterios de Aceite

- [ ] Cliente API Click funcionando
- [ ] Conversao de horarios local -> Click correta
- [ ] Conversao de horarios Click -> local correta
- [ ] Sincronizacao chamada apos aprovacao
- [ ] Fila de retry funcionando
- [ ] Backoff exponencial implementado
- [ ] Endpoint admin para ver fila
- [ ] Auditoria de falhas de sync
- [ ] Testes unitarios passando

---

## Riscos e Mitigacoes

| Risco | Probabilidade | Impacto | Mitigacao |
|-------|---------------|---------|-----------|
| API Click offline | Media | Alto | Fila de retry com backoff |
| Formato incorreto | Baixa | Alto | Testes extensivos de conversao |
| Timeout | Media | Medio | Timeout configuravel + retry |
| Inconsistencia de dados | Baixa | Alto | Validar dados antes de enviar |

---

## Checklist de Conclusao

- [ ] Cliente API Click implementado
- [ ] Conversor de horarios implementado
- [ ] Servico de sync implementado
- [ ] Fila de retry implementada
- [ ] Integracao com aprovacoes
- [ ] Endpoint admin para fila
- [ ] Testes unitarios
- [ ] Documentacao atualizada
- [ ] Code review realizado
