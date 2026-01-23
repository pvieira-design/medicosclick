# Fase 1: Queries Click + Sistema de Score

> Duracao estimada: 3-4 dias
> Prioridade: Alta
> Dependencias: Nenhuma

## Objetivo

Completar a integracao com o banco Click replica, implementando todas as queries necessarias para:
- Buscar metricas de medicos (conversao, ticket medio)
- Calcular score e determinar faixa
- Listar consultas agendadas
- Validar horarios com consultas

---

## Arquivos a Modificar/Criar

### 1. packages/db/src/click-replica.ts
Completar queries existentes e adicionar novas.

### 2. packages/api/src/routers/medico.ts
Adicionar endpoints de score.

### 3. packages/api/src/services/score.service.ts (NOVO)
Servico de calculo de score.

---

## Tarefas Detalhadas

### Tarefa 1.1: Query de Metricas do Medico

**Arquivo**: `packages/db/src/click-replica.ts`

**Query SQL**:
```sql
WITH metricas AS (
    SELECT 
        c.doctor_id,
        COUNT(DISTINCT c.id) AS total_consultas,
        COUNT(DISTINCT CASE 
            WHEN pb.status = 'confirmed' THEN pb.id 
        END) AS total_vendas,
        COALESCE(SUM(CASE 
            WHEN pb.status = 'confirmed' THEN pb.value 
        END), 0) AS valor_total
    FROM consultings c
    LEFT JOIN medical_prescriptions mp ON mp.consulting_id = c.id
    LEFT JOIN product_budgets pb ON pb.medical_prescription_id = mp.id
    WHERE c.start::timestamp >= NOW() - INTERVAL '$1 weeks'
      AND c.status NOT IN ('preconsulting', 'cancelled')
      AND c.completed = TRUE
    GROUP BY c.doctor_id
)
SELECT 
    doctor_id,
    total_consultas,
    total_vendas,
    ROUND(
        CASE WHEN total_consultas > 0 
             THEN total_vendas::numeric / total_consultas 
             ELSE 0 
        END, 4
    ) AS taxa_conversao,
    ROUND(
        CASE WHEN total_vendas > 0 
             THEN valor_total / total_vendas 
             ELSE 0 
        END, 2
    ) AS ticket_medio,
    ROUND(valor_total, 2) AS valor_total
FROM metricas
WHERE total_consultas > 0
```

**Interface TypeScript**:
```typescript
export interface MetricasMedicoClick {
  doctor_id: number;
  total_consultas: number;
  total_vendas: number;
  taxa_conversao: number;
  ticket_medio: number;
  valor_total: number;
}

export const clickQueries = {
  // ... queries existentes ...

  getMetricasMedico: (doctorId: number, semanas: number = 8) =>
    query<MetricasMedicoClick>(
      `WITH metricas AS (
        SELECT 
          c.doctor_id,
          COUNT(DISTINCT c.id) AS total_consultas,
          COUNT(DISTINCT CASE WHEN pb.status = 'confirmed' THEN pb.id END) AS total_vendas,
          COALESCE(SUM(CASE WHEN pb.status = 'confirmed' THEN pb.value END), 0) AS valor_total
        FROM consultings c
        LEFT JOIN medical_prescriptions mp ON mp.consulting_id = c.id
        LEFT JOIN product_budgets pb ON pb.medical_prescription_id = mp.id
        WHERE c.doctor_id = $1
          AND c.start::timestamp >= NOW() - INTERVAL '${semanas} weeks'
          AND c.status NOT IN ('preconsulting', 'cancelled')
          AND c.completed = TRUE
        GROUP BY c.doctor_id
      )
      SELECT 
        doctor_id,
        total_consultas,
        total_vendas,
        ROUND(CASE WHEN total_consultas > 0 THEN total_vendas::numeric / total_consultas ELSE 0 END, 4) AS taxa_conversao,
        ROUND(CASE WHEN total_vendas > 0 THEN valor_total / total_vendas ELSE 0 END, 2) AS ticket_medio,
        ROUND(valor_total, 2) AS valor_total
      FROM metricas`,
      [doctorId]
    ),

  getMetricasTodosMedicos: (semanas: number = 8) =>
    query<MetricasMedicoClick>(
      `WITH metricas AS (
        SELECT 
          c.doctor_id,
          COUNT(DISTINCT c.id) AS total_consultas,
          COUNT(DISTINCT CASE WHEN pb.status = 'confirmed' THEN pb.id END) AS total_vendas,
          COALESCE(SUM(CASE WHEN pb.status = 'confirmed' THEN pb.value END), 0) AS valor_total
        FROM consultings c
        LEFT JOIN medical_prescriptions mp ON mp.consulting_id = c.id
        LEFT JOIN product_budgets pb ON pb.medical_prescription_id = mp.id
        WHERE c.start::timestamp >= NOW() - INTERVAL '${semanas} weeks'
          AND c.status NOT IN ('preconsulting', 'cancelled')
          AND c.completed = TRUE
        GROUP BY c.doctor_id
      )
      SELECT 
        doctor_id,
        total_consultas,
        total_vendas,
        ROUND(CASE WHEN total_consultas > 0 THEN total_vendas::numeric / total_consultas ELSE 0 END, 4) AS taxa_conversao,
        ROUND(CASE WHEN total_vendas > 0 THEN valor_total / total_vendas ELSE 0 END, 2) AS ticket_medio,
        ROUND(valor_total, 2) AS valor_total
      FROM metricas
      WHERE total_consultas > 0
      ORDER BY valor_total DESC`
    ),
};
```

---

### Tarefa 1.2: Query de Consultas Agendadas Detalhada

**Query SQL**:
```sql
SELECT 
    c.id AS consulting_id,
    c.doctor_id,
    c.user_id AS patient_id,
    p.name AS patient_name,
    c.status,
    c.start::timestamp AT TIME ZONE 'America/Sao_Paulo' AS data_hora,
    (c.start::timestamp AT TIME ZONE 'America/Sao_Paulo')::date AS data,
    TO_CHAR(c.start::timestamp AT TIME ZONE 'America/Sao_Paulo', 'HH24:MI') AS hora,
    TO_CHAR(c.start::timestamp AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY') AS data_br,
    CASE EXTRACT(DOW FROM c.start::timestamp)
        WHEN 0 THEN 'dom'
        WHEN 1 THEN 'seg'
        WHEN 2 THEN 'ter'
        WHEN 3 THEN 'qua'
        WHEN 4 THEN 'qui'
        WHEN 5 THEN 'sex'
        WHEN 6 THEN 'sab'
    END AS dia_semana
FROM consultings c
LEFT JOIN patients p ON p.id = c.patient_id
WHERE c.doctor_id = $1
  AND c.status NOT IN ('preconsulting', 'cancelled')
  AND c.start::timestamp >= NOW()
ORDER BY c.start::timestamp ASC
LIMIT $2
```

**Interface TypeScript**:
```typescript
export interface ConsultaAgendadaClick {
  consulting_id: number;
  doctor_id: number;
  patient_id: number;
  patient_name: string;
  status: string;
  data_hora: Date;
  data: string;
  hora: string;
  data_br: string;
  dia_semana: string;
}
```

---

### Tarefa 1.3: Servico de Calculo de Score

**Arquivo**: `packages/api/src/services/score.service.ts`

```typescript
import prisma from "@clickmedicos/db";
import { clickQueries, MetricasMedicoClick } from "@clickmedicos/db/click-replica";
import { Faixa } from "@prisma/client";

interface ScoreResult {
  score: number;
  faixa: Faixa;
  taxaConversao: number;
  ticketMedio: number;
  percentilConversao: number;
  percentilTicket: number;
}

interface PesosScore {
  conversao: number;
  ticketMedio: number;
}

const FAIXA_LIMITES: Record<Faixa, number> = {
  P1: 80,
  P2: 60,
  P3: 40,
  P4: 20,
  P5: 0,
};

function calcularPercentil(valor: number, valores: number[]): number {
  if (valores.length === 0) return 0;
  const sorted = [...valores].sort((a, b) => a - b);
  const index = sorted.findIndex(v => v >= valor);
  if (index === -1) return 100;
  return Math.round((index / sorted.length) * 100);
}

function determinarFaixa(score: number): Faixa {
  if (score >= 80) return "P1";
  if (score >= 60) return "P2";
  if (score >= 40) return "P3";
  if (score >= 20) return "P4";
  return "P5";
}

export async function calcularScoreMedico(
  clickDoctorId: number,
  todasMetricas?: MetricasMedicoClick[]
): Promise<ScoreResult | null> {
  // Buscar pesos configurados
  const configPesos = await prisma.configSistema.findUnique({
    where: { chave: "pesos_score" },
  });
  
  const pesos: PesosScore = (configPesos?.valor as PesosScore) ?? {
    conversao: 0.66,
    ticketMedio: 0.34,
  };

  // Buscar metricas do medico
  const [medicoMetricas] = await clickQueries.getMetricasMedico(clickDoctorId);
  
  if (!medicoMetricas) {
    return null;
  }

  // Se nao recebeu todas metricas, buscar
  const metricas = todasMetricas ?? await clickQueries.getMetricasTodosMedicos();
  
  // Calcular percentis
  const conversoes = metricas.map(m => m.taxa_conversao);
  const tickets = metricas.map(m => m.ticket_medio);
  
  const percentilConversao = calcularPercentil(medicoMetricas.taxa_conversao, conversoes);
  const percentilTicket = calcularPercentil(medicoMetricas.ticket_medio, tickets);
  
  // Calcular score final
  const score = Math.round(
    (percentilConversao * pesos.conversao) + (percentilTicket * pesos.ticketMedio)
  );
  
  const faixa = determinarFaixa(score);

  return {
    score,
    faixa,
    taxaConversao: medicoMetricas.taxa_conversao,
    ticketMedio: medicoMetricas.ticket_medio,
    percentilConversao,
    percentilTicket,
  };
}

export async function recalcularTodosScores(): Promise<{
  atualizados: number;
  erros: Array<{ medicoId: string; erro: string }>;
}> {
  const medicos = await prisma.user.findMany({
    where: { tipo: "medico", ativo: true, clickDoctorId: { not: null } },
  });

  const todasMetricas = await clickQueries.getMetricasTodosMedicos();
  
  let atualizados = 0;
  const erros: Array<{ medicoId: string; erro: string }> = [];

  for (const medico of medicos) {
    try {
      if (!medico.clickDoctorId) continue;
      
      const scoreResult = await calcularScoreMedico(medico.clickDoctorId, todasMetricas);
      
      if (scoreResult) {
        await prisma.user.update({
          where: { id: medico.id },
          data: {
            score: scoreResult.score,
            faixa: scoreResult.faixa,
          },
        });
        
        await prisma.medicoConfig.upsert({
          where: { medicoId: medico.id },
          update: {
            taxaConversao: scoreResult.taxaConversao,
            ticketMedio: scoreResult.ticketMedio,
          },
          create: {
            medicoId: medico.id,
            taxaConversao: scoreResult.taxaConversao,
            ticketMedio: scoreResult.ticketMedio,
          },
        });
        
        atualizados++;
      }
    } catch (error) {
      erros.push({
        medicoId: medico.id,
        erro: error instanceof Error ? error.message : "Erro desconhecido",
      });
    }
  }

  return { atualizados, erros };
}
```

---

### Tarefa 1.4: Endpoints de Score no Router

**Arquivo**: `packages/api/src/routers/medico.ts`

Adicionar:

```typescript
import { calcularScoreMedico, recalcularTodosScores } from "../services/score.service";

// Adicionar ao router existente:

meuScore: medicoProcedure.query(async ({ ctx }) => {
  if (!ctx.medico.clickDoctorId) {
    return {
      score: Number(ctx.medico.score ?? 0),
      faixa: ctx.medico.faixa ?? "P5",
      taxaConversao: null,
      ticketMedio: null,
      percentilConversao: null,
      percentilTicket: null,
    };
  }
  
  const scoreResult = await calcularScoreMedico(ctx.medico.clickDoctorId);
  
  if (!scoreResult) {
    return {
      score: Number(ctx.medico.score ?? 0),
      faixa: ctx.medico.faixa ?? "P5",
      taxaConversao: null,
      ticketMedio: null,
      percentilConversao: null,
      percentilTicket: null,
    };
  }
  
  return scoreResult;
}),

recalcularMeuScore: medicoProcedure.mutation(async ({ ctx }) => {
  if (!ctx.medico.clickDoctorId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Medico nao vinculado ao Click",
    });
  }
  
  const scoreResult = await calcularScoreMedico(ctx.medico.clickDoctorId);
  
  if (!scoreResult) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Nao foi possivel calcular score",
    });
  }
  
  await prisma.user.update({
    where: { id: ctx.medico.id },
    data: {
      score: scoreResult.score,
      faixa: scoreResult.faixa,
    },
  });
  
  return scoreResult;
}),

// Para admin:
recalcularTodosScores: adminProcedure.mutation(async ({ ctx }) => {
  const result = await recalcularTodosScores();
  
  await prisma.auditoria.create({
    data: {
      usuarioId: ctx.user.id,
      usuarioNome: ctx.user.name,
      acao: "RECALCULAR_TODOS_SCORES",
      entidade: "medico",
      dadosDepois: {
        atualizados: result.atualizados,
        erros: result.erros.length,
      },
    },
  });
  
  return result;
}),
```

---

### Tarefa 1.5: Query de Horarios do Medico no Click

**Query SQL**:
```sql
SELECT 
    d.id AS doctor_id,
    d.office_hours
FROM doctors d
WHERE d.id = $1
```

**Nota**: O campo `office_hours` no Click e um JSON com formato:
```json
{
  "SEG": ["08:00-12:00", "14:00-18:00"],
  "TER": ["08:00-12:00"],
  ...
}
```

**Funcao de parsing**:
```typescript
interface HorarioClickParsed {
  diaSemana: string;
  horarioInicio: string;
  horarioFim: string;
}

function parseOfficeHours(officeHours: Record<string, string[]>): HorarioClickParsed[] {
  const diaMap: Record<string, string> = {
    DOM: "dom", SEG: "seg", TER: "ter", QUA: "qua",
    QUI: "qui", SEX: "sex", SAB: "sab",
  };
  
  const resultado: HorarioClickParsed[] = [];
  
  for (const [dia, blocos] of Object.entries(officeHours)) {
    const diaSemana = diaMap[dia];
    if (!diaSemana) continue;
    
    for (const bloco of blocos) {
      const [inicio, fim] = bloco.split("-");
      if (inicio && fim) {
        resultado.push({
          diaSemana,
          horarioInicio: inicio,
          horarioFim: fim,
        });
      }
    }
  }
  
  return resultado;
}
```

---

## Testes a Implementar

### Testes Unitarios

```typescript
// packages/api/src/services/__tests__/score.service.test.ts

describe("calcularScoreMedico", () => {
  it("deve calcular percentis corretamente", () => {
    // ...
  });
  
  it("deve determinar faixa correta baseado no score", () => {
    expect(determinarFaixa(85)).toBe("P1");
    expect(determinarFaixa(65)).toBe("P2");
    expect(determinarFaixa(45)).toBe("P3");
    expect(determinarFaixa(25)).toBe("P4");
    expect(determinarFaixa(10)).toBe("P5");
  });
  
  it("deve retornar null se medico nao tem metricas", () => {
    // ...
  });
});
```

---

## Criterios de Aceite

- [ ] Query `getMetricasMedico` retorna dados corretos
- [ ] Query `getMetricasTodosMedicos` retorna todos medicos ativos
- [ ] Calculo de percentil funciona corretamente
- [ ] Score e calculado com pesos configuraveis
- [ ] Faixa e determinada corretamente pelo score
- [ ] Endpoint `meuScore` retorna dados do medico logado
- [ ] Endpoint `recalcularTodosScores` processa todos medicos
- [ ] Auditoria e registrada ao recalcular scores
- [ ] Erros sao tratados gracefully

---

## Riscos e Mitigacoes

| Risco | Probabilidade | Impacto | Mitigacao |
|-------|---------------|---------|-----------|
| Conexao Click lenta | Media | Alto | Implementar timeout e cache |
| Dados inconsistentes | Baixa | Medio | Validar dados antes de calcular |
| Muitos medicos para processar | Baixa | Medio | Processar em batches |

---

## Checklist de Conclusao

- [ ] Todas queries implementadas e testadas
- [ ] Servico de score funcionando
- [ ] Endpoints tRPC criados
- [ ] Auditoria implementada
- [ ] Testes unitarios passando
- [ ] Documentacao atualizada
- [ ] Code review realizado
