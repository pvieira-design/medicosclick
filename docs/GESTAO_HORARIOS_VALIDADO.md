# 📋 DOCUMENTO VALIDADO: Gestão de Horários Médicos

> **⚠️ ESTE É O DOCUMENTO OFICIAL E VALIDADO**
> Qualquer outro documento que contradiga este deve ser ignorado.
> Última atualização: Janeiro 2026

---

## 🏗️ Arquitetura Geral

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FONTE DA VERDADE                           │
│                    Click Database (Réplica)                        │
│                    Campo: doctors.schedule                         │
│         Formato: { "SEG": ["08:00-12:00", "14:00-18:00"] }         │
└─────────────────────────────────────────────────────────────────────┘
                                  ▲
                                  │ Leitura
                                  │
┌─────────────────────────────────────────────────────────────────────┐
│                     ClickMedicos (Este Sistema)                    │
├─────────────────────────────────────────────────────────────────────┤
│  Tabela Local: MedicoHorario                                       │
│  Propósito: APENAS armazenar alterações pendentes de sync          │
│  - ativo: true  → slot a ser ADICIONADO                            │
│  - ativo: false → slot a ser REMOVIDO                              │
│  ❌ NÃO é fonte da verdade                                          │
│  ❌ Limpa após sync bem-sucedido                                    │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  │ Escrita (webhook)
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        Click API (n8n)                             │
│              POST /atualizar-hora-medico                           │
│       Payload: { doctor_id, schedule }                             │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 📌 Fluxo 1: Abertura de Horários

### Passo 1: Médico Solicita Abertura

**Arquivo:** `packages/api/src/routers/solicitacoes.ts` → `criar`

```
Médico seleciona slots → Validações → Cria Solicitação (pendente)
```

**Validações:**

1. Não pode ter solicitação pendente anterior
2. Slots devem estar nos períodos permitidos pela faixa (P1-P5)
3. Total de slots não pode exceder limite máximo da faixa

**Resultado:**

- Cria registro em `Solicitacao` com status `pendente`
- Armazena slots solicitados em JSON

---

### Passo 2: Staff Aprova Solicitação

**Arquivo:** `packages/api/src/routers/aprovacoes.ts` → `aprovarSolicitacao`

```
Staff revisa → Aprova (total ou parcial) → Grava alterações locais → Sincroniza
```

**Ações:**

1. Atualiza `Solicitacao` para status `aprovada`
2. **Cria registros em `MedicoHorario`** com `ativo: true` para cada slot aprovado
3. Registra auditoria
4. **Chama `sincronizarHorariosMedicoComClick()`**

---

### Passo 3: Sincronização com Click

**Arquivo:** `packages/api/src/services/sync.service.ts` → `sincronizarHorariosMedicoComClick`

```typescript
// 1. Busca horários ATUAIS do Click (fonte da verdade)
const [scheduleResult] = await clickQueries.getScheduleMedicoClick(doctorId);
const horariosAtuaisClick = expandirScheduleParaSlots(scheduleResult?.schedule);
// Exemplo: [seg-08:00, seg-08:20, seg-08:40, ter-14:00, ter-14:20] (5 slots)

// 2. Busca alterações locais (o que foi aprovado)
const horariosLocais = await prisma.medicoHorario.findMany({ where: { medicoId } });
// Exemplo: [seg-09:00 (ativo:true), seg-09:20 (ativo:true)] (2 novos)

// 3. MESCLA: Click atual + adições - remoções
const slotsFinais = new Map();

// Adiciona todos os atuais do Click
for (const slot of horariosAtuaisClick) {
  slotsFinais.set(`${slot.diaSemana}-${slot.horario}`, true);
}

// Aplica alterações locais
for (const h of horariosLocais) {
  const key = `${h.diaSemana}-${h.horario}`;
  if (h.ativo) {
    slotsFinais.set(key, true);   // ADICIONA
  } else {
    slotsFinais.delete(key);      // REMOVE
  }
}

// Resultado final: 5 + 2 = 7 slots
// [seg-08:00, seg-08:20, seg-08:40, seg-09:00, seg-09:20, ter-14:00, ter-14:20]

// 4. Converte para formato Click e envia
const schedule = slotsParaClickSchedule(slots);
// { SEG: ["08:00-09:40"], TER: ["14:00-14:40"] }

await clickApi.atualizarHorarioMedico({ doctor_id, schedule });

// 5. Após sucesso, LIMPA tabela local
await prisma.medicoHorario.deleteMany({ where: { medicoId } });
```

---

## 📌 Fluxo 2: Fechamento de Horários

### Passo 1: Médico Fecha Horários

**Arquivo:** `packages/api/src/routers/solicitacoes.ts` → `fecharHorarios`

```
Médico seleciona slots abertos → Grava como ativo:false → Sincroniza
```

**Ações:**

1. Atualiza/cria registros em `MedicoHorario` com `ativo: false`
2. **Chama `sincronizarHorariosMedicoComClick()`**

### Passo 2: Sincronização

Mesma lógica do Passo 3 acima, mas agora os slots marcados como `ativo: false` serão **removidos** do resultado final.

**Exemplo:**

```
Click atual: [seg-08:00, seg-08:20, seg-08:40]
Local (fechamento): [seg-08:20 (ativo:false)]
Resultado: [seg-08:00, seg-08:40] ← seg-08:20 removido
```

---

## 📌 Fluxo 3: Visualização de Horários

### Médico vê seus horários

**Arquivo:** `packages/api/src/routers/medico.ts` → `getGradeHorarios`

```typescript
// SEMPRE busca diretamente do Click (fonte da verdade)
const [scheduleResult] = await clickQueries.getScheduleMedicoClick(clickDoctorId);
const slots = expandirScheduleParaSlots(scheduleResult?.schedule);
return { horariosAbertos: slots, horariosMap };
```

**❌ NÃO busca da tabela local `MedicoHorario`**
**✅ Busca diretamente do Click replica**

---

## 🔄 Conversão de Formatos

### Formato Click (blocos)

```json
{
  "SEG": ["08:00-12:00", "14:00-18:00"],
  "TER": ["09:00-11:00"],
  "QUA": ["08:00-10:00", "15:00-17:00"]
}
```

### Formato Local (slots de 20min)

```json
[
  { "diaSemana": "seg", "horario": "08:00" },
  { "diaSemana": "seg", "horario": "08:20" },
  { "diaSemana": "seg", "horario": "08:40" }
]
```

### Funções de Conversão

**Arquivo:** `packages/api/src/utils/horario-converter.ts`

| Função | Direção |
|--------|---------|
| `expandirScheduleParaSlots()` | Click → Local |
| `slotsParaClickSchedule()` | Local → Click |

---

## ⚠️ Regras Importantes

| Regra | Descrição |
|-------|-----------|
| **Fonte da verdade** | Sempre é o banco Click (`doctors.schedule`) |
| **Tabela MedicoHorario** | Apenas para alterações pendentes de sync |
| **Após sync** | Tabela local é LIMPA |
| **Leitura de horários** | SEMPRE do Click, NUNCA da tabela local |
| **Mesclagem** | Novos slots são ADICIONADOS aos existentes |
| **Fechamento** | Slots são REMOVIDOS dos existentes |

---

## 🔧 Arquivos Principais

| Arquivo | Responsabilidade |
|---------|------------------|
| `packages/api/src/routers/solicitacoes.ts` | Criar solicitações, fechar horários |
| `packages/api/src/routers/aprovacoes.ts` | Aprovar/rejeitar solicitações |
| `packages/api/src/services/sync.service.ts` | Mesclar e sincronizar com Click |
| `packages/db/src/click-replica.ts` | Queries de leitura do Click |
| `packages/api/src/services/click-api.service.ts` | Webhook de escrita no Click |
| `packages/api/src/utils/horario-converter.ts` | Conversão entre formatos |
| `packages/api/src/routers/medico.ts` | Endpoints de visualização |

---

## ✅ Checklist de Validação

- [x] Abertura adiciona aos horários existentes (não substitui)
- [x] Fechamento remove dos horários existentes (não zera)
- [x] Visualização busca do Click replica
- [x] Tabela local é temporária (limpa após sync)
- [x] Formato Click: blocos (ex: "08:00-12:00")
- [x] Formato Local: slots de 20min (ex: "08:00", "08:20")

---

## 📊 Diagrama de Sequência: Aprovação de Horário

```
Médico          Frontend         API              DB Local         Click Replica      Click API
  │                │               │                  │                  │                │
  │ Solicita       │               │                  │                  │                │
  │ abertura ────► │               │                  │                  │                │
  │                │ criar() ────► │                  │                  │                │
  │                │               │ INSERT ────────► │                  │                │
  │                │               │ Solicitacao      │                  │                │
  │                │ ◄──────────── │                  │                  │                │
  │ ◄────────────  │               │                  │                  │                │
  │                │               │                  │                  │                │
  │                │               │                  │                  │                │
Staff             │               │                  │                  │                │
  │ Aprova ──────► │               │                  │                  │                │
  │                │ aprovar() ──► │                  │                  │                │
  │                │               │ UPDATE ────────► │                  │                │
  │                │               │ Solicitacao      │                  │                │
  │                │               │ INSERT ────────► │                  │                │
  │                │               │ MedicoHorario    │                  │                │
  │                │               │                  │                  │                │
  │                │               │ ════════════════════════════════════════════════════│
  │                │               │         sincronizarHorariosMedicoComClick()         │
  │                │               │ ════════════════════════════════════════════════════│
  │                │               │                  │                  │                │
  │                │               │ SELECT schedule ─────────────────► │                │
  │                │               │ ◄─────────────────────────────────  │                │
  │                │               │                  │                  │                │
  │                │               │ SELECT ────────► │                  │                │
  │                │               │ MedicoHorario    │                  │                │
  │                │               │ ◄──────────────  │                  │                │
  │                │               │                  │                  │                │
  │                │               │ [MESCLA: Click + Local]            │                │
  │                │               │                  │                  │                │
  │                │               │ POST /atualizar-hora-medico ──────────────────────► │
  │                │               │ ◄─────────────────────────────────────────────────  │
  │                │               │                  │                  │                │
  │                │               │ DELETE ────────► │                  │                │
  │                │               │ MedicoHorario    │                  │                │
  │                │               │                  │                  │                │
  │                │ ◄──────────── │                  │                  │                │
  │ ◄────────────  │               │                  │                  │                │
```

---

## 🚨 Erros Comuns a Evitar

| Erro | Problema | Solução |
|------|----------|---------|
| Ler horários da tabela local | Dados desatualizados ou incompletos | Sempre ler do Click replica |
| Enviar só novos slots para Click | Sobrescreve os existentes | Mesclar com atuais antes de enviar |
| Não limpar tabela após sync | Alterações reaplicadas no próximo sync | DELETE após sucesso |
| Usar `office_hours` do Click | Campo errado/legado | Usar campo `schedule` |
