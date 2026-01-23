# Documentação Completa: Tabelas de Consulta Médica - Click Cannabis

**Data de Criação:** 22 de Janeiro de 2026  
**Banco:** PostgreSQL  
**Versão:** 1.0  
**Escopo:** consultings, doctors, medical_prescriptions

---

## Índice

1. [Visão Geral do Sistema](#1-visão-geral-do-sistema)
2. [Tabela: consultings](#2-tabela-consultings)
3. [Tabela: doctors](#3-tabela-doctors)
4. [Tabela: medical_prescriptions](#4-tabela-medical_prescriptions)
5. [Diagrama de Relacionamentos](#5-diagrama-de-relacionamentos)
6. [Regras de Validação Obrigatórias](#6-regras-de-validação-obrigatórias)
7. [Checklists para Novas Queries](#7-checklists-para-novas-queries)

---

## 1. Visão Geral do Sistema

A Click Cannabis é a maior plataforma de telemedicina 100% dedicada a tratamentos com cannabis medicinal no Brasil. O sistema possui um fluxo de consulta médica que envolve três tabelas principais:

**Fluxo resumido:**
```
PACIENTE → CONSULTA → MÉDICO → RECEITA → ORÇAMENTO → ENTREGA
           (consultings)  (doctors)  (medical_prescriptions)  (product_budgets)
```

### Contexto de Negócio

| Etapa | Tabela Principal | Descrição |
|-------|-----------------|-----------|
| Agendamento | `consultings` | Paciente agenda consulta com médico |
| Videochamada | `consultings.meet_data` | Dados da videochamada são registrados |
| Prescrição | `medical_prescriptions` | Médico emite receita após consulta |
| Venda | `product_budgets` | Paciente compra produtos prescritos |

---

## 2. Tabela: consultings

### 2.1 O que representa

A tabela `consultings` é o **coração do sistema de consultas médicas**. Registra todos os agendamentos de consultas e seu ciclo de vida completo, desde o agendamento até a finalização com envio de receita.

### 2.2 Estrutura Completa

| Campo | Tipo | NULL? | Descrição |
|-------|------|-------|-----------|
| `id` | INTEGER | NOT NULL | Chave primária |
| `user_id` | INTEGER | NULL | FK → `users.id` (paciente) |
| `doctor_id` | INTEGER | NULL | FK → `doctors.id` (médico) |
| `negotiation_id` | INTEGER | NULL | FK → `negotiations.id` (deal/negociação) |
| `start` | **VARCHAR** ⚠️ | NULL | Data/hora de início da consulta |
| `status` | TEXT | NULL | Status do agendamento |
| `completed` | BOOLEAN | NULL | Se a consulta foi realizada |
| `prescription_status` | TEXT | NULL | Se houve receita médica |
| `reason_for_cancellation` | TEXT | NULL | Motivo do não comparecimento |
| `reason_for_no_prescription` | TEXT | NULL | Motivo de não prescrever |
| `meet_data` | JSONB | NULL | Dados da videochamada |
| `created_at` | TIMESTAMP | NULL | Data de criação do registro |
| `updated_at` | TIMESTAMP | NULL | Data da última atualização |

### 2.3 Valores do Campo `status`

| Valor | Descrição | Quando Ocorre |
|-------|-----------|---------------|
| `preconsulting` | Slot de horário reservado | ⚠️ Horário bloqueado sem paciente vinculado (**maioria são bugs**) |
| `confirmed` | Consulta confirmada | Paciente agendou e confirmou a consulta |
| `reschudeled` | Consulta reagendada | ⚠️ Typo no banco (deveria ser "rescheduled") |
| `cancelled` | Consulta cancelada | Consulta foi cancelada |

### 2.4 Valores do Campo `completed`

| Valor | Significado | Quem Define |
|-------|-------------|-------------|
| `TRUE` | Consulta aconteceu | Médico (via CRM ao enviar receita) |
| `FALSE` | Paciente não compareceu (no-show) | Médico (via CRM) |
| `NULL` | Aguardando processamento | Sistema (ainda não processado) |

> **Importante:** O campo `completed` é preenchido **manualmente pelo médico** ao finalizar a consulta.

### 2.5 Valores do Campo `prescription_status`

| Valor | Significado | Quando é Definido |
|-------|-------------|-------------------|
| `NULL` | Não definido | Consulta ainda não processada |
| `required` | Teve receita | Médico prescreveu medicamentos |
| `not_required` | Sem receita | Consulta aconteceu, mas sem prescrição |

### 2.6 Motivos de Não Prescrição (campo `reason_for_no_prescription`)

Quando `prescription_status = 'not_required'`, os motivos mais comuns são:

| Categoria | Exemplos |
|-----------|----------|
| Consulta de Retorno | Paciente já tem medicação suficiente |
| Contraindicação | Bipolaridade, problema hepático, gestante |
| Não Compareceu | ⚠️ Paciente não apareceu (deveria ser `status = 'cancelled'`) |
| Sem Indicação Clínica | Caso não tem indicação para cannabis |

### 2.7 Campo `meet_data` (JSONB)

Armazena informações detalhadas sobre a participação na videochamada.

**Estrutura:**
```json
{
  "total": 2,
  "registros": [
    {
      "identifier": "paciente@email.com",
      "device_type": "android",
      "display_name": "Nome do Paciente",
      "duration_seconds": 1348,
      "start_timestamp_seconds": 1742487650
    },
    {
      "identifier": "medico@email.com",
      "device_type": "web",
      "display_name": "Dr. Nome do Médico",
      "duration_seconds": 329,
      "start_timestamp_seconds": 1742487949
    }
  ]
}
```

**Valores de `device_type`:**
- `web` (~50%)
- `android` (~27%)
- `ios` (~23%)
- `other_client` (~0.1%)

**Bots a serem excluídos em análises:**
- notetaker
- assistant
- read.ai
- fireflies
- meetgeek
- fathom

### 2.8 Relacionamentos

```
consultings.user_id ─────────────→ users.id (paciente)
consultings.doctor_id ───────────→ doctors.id (médico)
consultings.negotiation_id ──────→ negotiations.id (deal)
consultings.id ──────────────────→ medical_prescriptions.consulting_id
consultings.id ──────────────────→ medical_records.consulting_id
consultings.id ──────────────────→ anamnese.consulting_id
```

### 2.9 Regras de Negócio

1. **Registros inválidos (bugs):** ~99,82% dos registros com `status = 'preconsulting'` são bugs do sistema
2. **Filtro obrigatório:** Sempre filtrar `user_id IS NOT NULL AND negotiation_id IS NOT NULL`
3. **Campo `start` é VARCHAR:** Sempre converter com `start::timestamp` ou `start::timestamptz`
4. **Timezone:** Datas são armazenadas em UTC. Para São Paulo usar `AT TIME ZONE 'America/Sao_Paulo'`

### 2.10 Queries Úteis

**Consultas realizadas em um período:**
```sql
SELECT COUNT(*) AS total_consultas_realizadas
FROM consultings
WHERE start::timestamp >= '2025-12-01'
  AND start::timestamp < '2026-01-01'
  AND user_id IS NOT NULL 
  AND negotiation_id IS NOT NULL
  AND status NOT IN ('preconsulting', 'cancelled')
  AND completed = TRUE;
```

**Distribuição por status de presença:**
```sql
SELECT 
  CASE 
    WHEN completed = TRUE THEN 'Realizada'
    WHEN completed = FALSE THEN 'No-show'
    WHEN completed IS NULL AND start::timestamp < NOW() THEN 'Aguardando processamento'
    ELSE 'Futura'
  END AS situacao,
  COUNT(*) AS total
FROM consultings
WHERE user_id IS NOT NULL 
  AND negotiation_id IS NOT NULL
  AND status NOT IN ('preconsulting')
GROUP BY 1;
```

**Consultas com/sem receita:**
```sql
SELECT 
  prescription_status,
  COUNT(*) AS total
FROM consultings
WHERE completed = TRUE
  AND user_id IS NOT NULL 
  AND negotiation_id IS NOT NULL
GROUP BY prescription_status;
```

### 2.11 Cuidados e Armadilhas

| Armadilha | Impacto | Solução |
|-----------|---------|---------|
| Não filtrar `preconsulting` | Infla total em ~39% | Sempre usar `status NOT IN ('preconsulting')` |
| Não filtrar `user_id IS NOT NULL` | Inclui bugs | Sempre adicionar este filtro |
| Campo `start` como VARCHAR | Erro de conversão | Sempre usar `start::timestamp` |
| Typo em `reschudeled` | Query não encontra dados | Usar exatamente `'reschudeled'` com o typo |
| Assumir `completed = TRUE` quando `NULL` | Conta consultas pendentes | Verificar explicitamente `completed = TRUE` |

---

## 3. Tabela: doctors

### 3.1 O que representa

A tabela `doctors` armazena os **profissionais médicos** cadastrados na plataforma que realizam consultas de telemedicina.

### 3.2 Estrutura Completa

| Campo | Tipo | NULL? | Descrição |
|-------|------|-------|-----------|
| `id` | INTEGER | NOT NULL | Chave primária |
| `user_id` | INTEGER | NULL | FK → `users.id` (conta do médico) |
| `name` | VARCHAR | NULL | Nome completo do médico |
| `crm` | VARCHAR | NULL | Número do CRM |
| `speciality` | VARCHAR | NULL | ⚠️ Especialidade (typo no banco: "speciality" ao invés de "specialty") |
| `priority` | INTEGER | NULL | Prioridade de agendamento |
| `schedule` | JSONB | NULL | Agenda semanal configurada |
| `created_at` | TIMESTAMP | NULL | Data de criação |
| `updated_at` | TIMESTAMP | NULL | Data da última atualização |

### 3.3 Campo `schedule` (JSONB)

Armazena a agenda semanal do médico com horários de atendimento por dia.

**Estrutura:**
```json
{
  "SEG": ["10:00-12:00", "14:00-18:00"],
  "TER": ["15:00-21:00"],
  "QUA": ["08:00-21:00"],
  "QUI": ["08:00-19:00"],
  "SEX": null,
  "SAB": null,
  "DOM": null
}
```

**Dias da semana:** SEG, TER, QUA, QUI, SEX, SAB, DOM

**Formato dos horários:** `"HH:MM-HH:MM"` (início-fim)

**Duração de cada consulta:** 20 minutos (slots)

### 3.4 Relacionamentos

```
doctors.id ─────────────────→ consultings.doctor_id (consultas do médico)
doctors.user_id ────────────→ users.id (conta/email do médico)
```

### 3.5 Regras de Negócio

1. **Médicos de teste:** Filtrar com `name NOT ILIKE '%teste%'`
2. **Médico ativo:** Médico que realizou ao menos uma consulta (`completed = true`) no período
3. **Prioridade:** Campo `priority` define ordem de agendamento
4. **Emails alternativos:** ~25% dos médicos usam email diferente nas videochamadas

### 3.6 Queries Úteis

**Lista de médicos cadastrados:**
```sql
SELECT 
    id,
    name AS nome,
    crm,
    speciality AS especialidade,
    priority AS prioridade
FROM doctors 
WHERE name IS NOT NULL 
  AND name NOT ILIKE '%teste%'
ORDER BY name;
```

**Médicos ativos no período:**
```sql
SELECT 
    d.id,
    d.name,
    COUNT(c.id) AS consultas_realizadas
FROM doctors d
INNER JOIN consultings c ON c.doctor_id = d.id
WHERE c.completed = true 
  AND c.start::timestamp >= '2025-12-01'
  AND c.start::timestamp < '2026-01-01'
  AND c.user_id IS NOT NULL
  AND c.negotiation_id IS NOT NULL
  AND c.status NOT IN ('preconsulting')
GROUP BY d.id, d.name
ORDER BY consultas_realizadas DESC;
```

**Slots disponíveis de um médico em um dia:**
```sql
WITH selected_day AS (
    SELECT 
        '2025-12-23'::date AS check_date,
        CASE EXTRACT(DOW FROM '2025-12-23'::date)
            WHEN 0 THEN 'DOM' WHEN 1 THEN 'SEG' WHEN 2 THEN 'TER'
            WHEN 3 THEN 'QUA' WHEN 4 THEN 'QUI' WHEN 5 THEN 'SEX'
            WHEN 6 THEN 'SAB'
        END AS weekday
),
slots_expandidos AS (
    SELECT 
        d.id AS doctor_id,
        d.name AS medico,
        generate_series(
            sd.check_date + (split_part(slot, '-', 1) || ':00')::time,
            sd.check_date + (split_part(slot, '-', 2) || ':00')::time - interval '20 minutes',
            interval '20 minutes'
        ) AS slot_time
    FROM doctors d
    CROSS JOIN selected_day sd
    CROSS JOIN jsonb_array_elements_text(d.schedule->sd.weekday) AS slot
    WHERE d.schedule IS NOT NULL
      AND d.schedule ? sd.weekday
)
SELECT 
    medico,
    TO_CHAR(slot_time, 'HH24:MI') AS horario
FROM slots_expandidos
ORDER BY medico, slot_time;
```

### 3.7 Cuidados e Armadilhas

| Armadilha | Impacto | Solução |
|-----------|---------|---------|
| Typo em `speciality` | Query não encontra coluna | Usar `speciality` (com Y) |
| Não filtrar médicos de teste | Inclui dados irreais | Usar `name NOT ILIKE '%teste%'` |
| Emails alternativos no meet_data | Não identifica médico corretamente | Manter lista de emails alternativos |
| Agenda nula | Erro ao expandir slots | Verificar `schedule IS NOT NULL` |

---

## 4. Tabela: medical_prescriptions

### 4.1 O que representa

A tabela `medical_prescriptions` armazena as **receitas médicas** emitidas após as consultas. Cada receita vincula uma consulta a produtos prescritos.

### 4.2 Estrutura Completa

| Campo | Tipo | NULL? | Descrição |
|-------|------|-------|-----------|
| `id` | INTEGER | NOT NULL | Chave primária |
| `consulting_id` | INTEGER | NULL | FK → `consultings.id` |
| `file_id` | INTEGER | NULL | FK → `files.id` (PDF da receita) |
| `created_at` | TIMESTAMP | NULL | Data de criação/envio da receita |
| `updated_at` | TIMESTAMP | NULL | Data da última atualização |

### 4.3 Relacionamentos

```
medical_prescriptions.consulting_id ───────→ consultings.id (consulta)
medical_prescriptions.file_id ─────────────→ files.id (PDF da receita)
medical_prescriptions.id ──────────────────→ product_medical_prescriptions.medical_prescription_id
medical_prescriptions.id ──────────────────→ product_budgets.medical_prescription_id
```

### 4.4 Tabela Relacionada: product_medical_prescriptions

Relaciona receitas com produtos prescritos (relação N:N).

| Campo | Tipo | NULL? | Descrição |
|-------|------|-------|-----------|
| `id` | INTEGER | NOT NULL | Chave primária |
| `medical_prescription_id` | INTEGER | NULL | FK → `medical_prescriptions.id` |
| `product_id` | INTEGER | NULL | FK → `products.id` |
| `quantity` | INTEGER | NULL | Quantidade prescrita |

### 4.5 Tabela Relacionada: files

Armazena arquivos do sistema (receitas, documentos, etc).

| Campo | Tipo | NULL? | Descrição |
|-------|------|-------|-----------|
| `id` | INTEGER | NOT NULL | Chave primária |
| `url` | TEXT | NULL | Link AWS S3 para o arquivo |
| `type` | TEXT | NULL | Tipo do arquivo |
| `created_at` | TIMESTAMP | NULL | Data de upload |

### 4.6 Regras de Negócio

1. **Uma consulta pode ter múltiplas receitas:** Usar `MIN(created_at)` para pegar a primeira
2. **Receita vincula a orçamento:** `product_budgets.medical_prescription_id`
3. **Tempo de envio:** Calculado como `medical_prescriptions.created_at - fim da videochamada`
4. **PDF da receita:** Armazenado no AWS S3 via tabela `files`

### 4.7 Queries Úteis

**Total de receitas emitidas no período:**
```sql
SELECT COUNT(*) AS total_receitas
FROM medical_prescriptions mp
WHERE mp.created_at >= '2025-12-01'
  AND mp.created_at < '2026-01-01';
```

**Receitas por médico:**
```sql
SELECT 
    d.name AS medico,
    COUNT(DISTINCT mp.id) AS total_receitas,
    COUNT(DISTINCT c.id) AS consultas_com_receita
FROM consultings c
INNER JOIN doctors d ON d.id = c.doctor_id
LEFT JOIN medical_prescriptions mp ON mp.consulting_id = c.id
WHERE c.completed = TRUE
  AND c.prescription_status = 'required'
  AND c.start::timestamp >= '2025-12-01'
  AND c.start::timestamp < '2026-01-01'
  AND c.user_id IS NOT NULL
  AND c.negotiation_id IS NOT NULL
GROUP BY d.id, d.name
ORDER BY total_receitas DESC;
```

**Produtos mais prescritos:**
```sql
SELECT
    p.title AS produto,
    SUM(pmp.quantity) AS quantidade_prescrita,
    COUNT(DISTINCT mp.consulting_id) AS qtd_consultas
FROM medical_prescriptions mp
JOIN product_medical_prescriptions pmp ON pmp.medical_prescription_id = mp.id
JOIN products p ON p.id = pmp.product_id
WHERE mp.created_at >= '2025-12-01'
  AND mp.created_at < '2026-01-01'
GROUP BY p.title
ORDER BY quantidade_prescrita DESC;
```

**Taxa de conversão (receita → orçamento pago):**
```sql
WITH receitas AS (
    SELECT 
        mp.id AS prescription_id,
        c.doctor_id
    FROM medical_prescriptions mp
    INNER JOIN consultings c ON c.id = mp.consulting_id
    WHERE mp.created_at >= '2025-12-01'
      AND mp.created_at < '2026-01-01'
)
SELECT 
    d.name AS medico,
    COUNT(DISTINCT r.prescription_id) AS receitas_enviadas,
    COUNT(DISTINCT CASE WHEN pb.status = 'confirmed' THEN pb.id END) AS orcamentos_pagos,
    ROUND(
        COUNT(DISTINCT CASE WHEN pb.status = 'confirmed' THEN pb.id END)::numeric * 100.0 / 
        NULLIF(COUNT(DISTINCT r.prescription_id), 0), 2
    ) AS taxa_conversao
FROM receitas r
INNER JOIN doctors d ON d.id = r.doctor_id
LEFT JOIN product_budgets pb ON pb.medical_prescription_id = r.prescription_id
GROUP BY d.id, d.name
ORDER BY taxa_conversao DESC;
```

### 4.8 Cuidados e Armadilhas

| Armadilha | Impacto | Solução |
|-----------|---------|---------|
| Múltiplas receitas por consulta | Conta duplicada | Usar `COUNT(DISTINCT consulting_id)` |
| Confundir receita com orçamento | Análise incorreta | Receita = `medical_prescriptions`, Orçamento = `product_budgets` |
| Usar `created_at` errado | Tempo de envio incorreto | Usar `medical_prescriptions.created_at` |

---

## 5. Diagrama de Relacionamentos

```
                                    ┌─────────────────┐
                                    │     doctors     │
                                    │─────────────────│
                                    │ id              │
                                    │ user_id         │──────────────┐
                                    │ name            │              │
                                    │ crm             │              │
                                    │ speciality      │              │
                                    │ schedule (JSON) │              │
                                    └────────┬────────┘              │
                                             │                       │
                                             │ doctor_id             │
                                             ▼                       ▼
┌─────────────────┐    user_id     ┌─────────────────────┐       ┌───────────┐
│     users       │◄───────────────│    consultings      │       │   users   │
│─────────────────│                │─────────────────────│       │ (médico)  │
│ id              │                │ id                  │       └───────────┘
│ first_name      │                │ user_id             │
│ last_name       │                │ doctor_id           │
│ phone           │                │ negotiation_id      │
│ email           │                │ start (VARCHAR!)    │
└─────────────────┘                │ status              │
                                   │ completed           │
                                   │ prescription_status │
                                   │ meet_data (JSON)    │
                                   └──────────┬──────────┘
                                              │
                                              │ consulting_id
                                              ▼
                                   ┌─────────────────────────┐
                                   │  medical_prescriptions  │
                                   │─────────────────────────│
                                   │ id                      │
                                   │ consulting_id           │
                                   │ file_id                 │────────────┐
                                   │ created_at              │            │
                                   └──────────┬──────────────┘            │
                                              │                           │
                                              │ medical_prescription_id   │
                                              ▼                           ▼
┌─────────────────────────────┐    ┌─────────────────────┐       ┌─────────────┐
│ product_medical_prescriptions│    │   product_budgets   │       │    files    │
│─────────────────────────────│    │─────────────────────│       │─────────────│
│ id                          │    │ id                  │       │ id          │
│ medical_prescription_id     │    │ medical_presc_id    │       │ url (S3)    │
│ product_id                  │    │ user_id             │       │ type        │
│ quantity                    │    │ value               │       └─────────────┘
└─────────────────────────────┘    │ status              │
                                   │ payment_at          │
                                   └─────────────────────┘
```

---

## 6. Regras de Validação Obrigatórias

### 6.1 Filtro Padrão para Tabela `consultings`

**SEMPRE inclua este filtro em queries que usam `consultings`:**

```sql
WHERE user_id IS NOT NULL 
  AND negotiation_id IS NOT NULL
  AND status NOT IN ('preconsulting')
```

### 6.2 Explicação de Cada Condição

| Condição | Motivo |
|----------|--------|
| `user_id IS NOT NULL` | Garante que existe um paciente vinculado |
| `negotiation_id IS NOT NULL` | Garante que existe um deal/negociação vinculado |
| `status NOT IN ('preconsulting')` | Exclui slots vazios que são apenas reserva de horário (bugs) |

### 6.3 Impacto se NÃO Filtrar (Exemplo: Dezembro/2025)

| Métrica | SEM filtro | COM filtro | Diferença |
|---------|------------|------------|-----------|
| Total consultas | 16.003 | 9.721 | **-39%** |
| Taxa cancelamento | 8,20% | 13,41% | +5,21pp |

---

## 7. Checklists para Novas Queries

### 7.1 Query na Tabela `consultings`

- [ ] Incluiu `user_id IS NOT NULL`?
- [ ] Incluiu `negotiation_id IS NOT NULL`?
- [ ] Excluiu `status NOT IN ('preconsulting')`?
- [ ] Converteu `start::timestamp` ou `start::timestamptz`?
- [ ] Aplicou timezone São Paulo se necessário?

### 7.2 Query de Consultas Realizadas

- [ ] Verificou `completed = TRUE`?
- [ ] Diferenciou `completed = FALSE` (no-show) de `completed IS NULL` (pendente)?

### 7.3 Query de Receitas

- [ ] Verificou `prescription_status = 'required'` para consultas com receita?
- [ ] Fez JOIN com `medical_prescriptions` para detalhes?
- [ ] Usou `COUNT(DISTINCT consulting_id)` para evitar duplicatas?

### 7.4 Query de Médicos

- [ ] Filtrou médicos de teste com `name NOT ILIKE '%teste%'`?
- [ ] Usou `speciality` (com Y)?
- [ ] Verificou `schedule IS NOT NULL` antes de expandir slots?

### 7.5 Query com `meet_data`

- [ ] Incluiu `meet_data IS NOT NULL`?
- [ ] Excluiu bots (notetaker, assistant, read.ai, fireflies)?
- [ ] Converteu `start_timestamp_seconds` para timestamp?
- [ ] Considerou emails alternativos dos médicos?

---

## Apêndice A: Template de Query Grafana

```sql
-- Template para Grafana com filtro de período
SELECT 
    -- Suas colunas aqui
FROM consultings c
WHERE $__timeFilter(c.start::timestamp)
  AND c.user_id IS NOT NULL 
  AND c.negotiation_id IS NOT NULL
  AND c.status NOT IN ('preconsulting')
```

## Apêndice B: Template de Query Metabase

```sql
-- Template para Metabase com variáveis
SELECT 
    -- Suas colunas aqui
FROM consultings c
WHERE c.start::timestamp >= {{data_inicio}}
  AND c.start::timestamp < {{data_fim}}
  AND c.user_id IS NOT NULL 
  AND c.negotiation_id IS NOT NULL
  AND c.status NOT IN ('preconsulting')
```

---

**Documento criado por:** IA Analista de Dados  
**Última atualização:** 22 de Janeiro de 2026  
**Revisão:** Baseada em documentação existente do projeto Click Cannabis

---

## Itens Marcados para Verificação

| Item | Tabela | Campo/Conceito | Status |
|------|--------|----------------|--------|
| 1 | doctors | Outros campos além dos documentados | [VERIFICAR] |
| 2 | medical_prescriptions | Outros campos além dos documentados | [VERIFICAR] |
| 3 | consultings | Campo `meet_data` - todos os subcampos | [VERIFICAR] |

> **Nota:** Os itens acima são inferidos da documentação existente. Recomenda-se validar com `information_schema.columns` para confirmar a estrutura exata das tabelas.
