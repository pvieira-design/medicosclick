# Respostas - Perguntas sobre o Banco de Dados Click Cannabis

**Data de Criação:** 23 de Janeiro de 2026  
**Banco:** PostgreSQL  
**Validação:** Queries executadas via n8n workflow "Claude Queries"

---

## 🏥 CONSULTAS (tabela consultings)

### 1. Tempo médio de consulta

**Pergunta:** Existe algum campo no banco que registra a duração real da consulta (hora início/fim)?

**Resposta:** ✅ SIM - O campo `meet_data` (JSONB)

O tempo real da consulta é calculável através do campo `meet_data`, que contém dados detalhados da videochamada:

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
    }
  ]
}
```

**Campos para cálculo:**
- `start_timestamp_seconds`: Unix timestamp de entrada na sala
- `duration_seconds`: Tempo em segundos na chamada

**Query para calcular tempo real:**
```sql
SELECT 
    c.id,
    MAX((r->>'start_timestamp_seconds')::bigint + (r->>'duration_seconds')::int) -
    MIN((r->>'start_timestamp_seconds')::bigint) AS duracao_total_segundos
FROM consultings c,
     jsonb_array_elements(c.meet_data->'registros') r
WHERE c.meet_data IS NOT NULL
GROUP BY c.id;
```

**Estatísticas validadas:**
- 47.754 consultas possuem `meet_data` preenchido (60.7% do total)
- Distribuição por duração:
  - < 1 min: 0.6%
  - 10-15 min: 13.7%
  - **20-30 min: 33.2%** (maioria)
  - > 30 min: 28.7%

**Observação:** O valor fixo de 20 minutos é apenas uma estimativa padrão. Use `meet_data` para cálculos reais.

---

### 2. Campo start - timezone

**Pergunta:** O campo `start` está armazenado em qual timezone?

**Resposta:** O campo `start` é **VARCHAR** e armazena a data com offset ISO 8601

**Exemplo de valor real:**
```
2026-01-22T21:00:00-03:00
```

O `-03:00` indica horário de Brasília (UTC-3). O servidor PostgreSQL está configurado em `America/Sao_Paulo`.

**Conversão recomendada:**
```sql
-- Converter para timestamp com timezone
c.start::timestamptz

-- Exibir em horário de São Paulo
c.start::timestamp AT TIME ZONE 'America/Sao_Paulo'
```

**⚠️ IMPORTANTE:** Sempre converta o campo `start` antes de usar em comparações de data.

---

### 3. Status rescheduled (typo: reschudeled)

**Pergunta:** Devo considerar esse status nas queries? Uma consulta reagendada aparece como novo registro ou o mesmo é atualizado?

**Resposta:**

**Valores de status validados no banco:**
| Status | Total de registros |
|--------|-------------------|
| confirmed | 70.458 |
| cancelled | 20.833 |
| **reschudeled** | 4.361 |
| preconsulting | 263 |

**Comportamento:**
- O status `reschudeled` (com typo) indica que a consulta foi **reagendada**
- O mesmo registro é atualizado (não cria novo registro)
- A data no campo `start` é atualizada para o novo horário

**Recomendação para "próximas consultas":**
```sql
-- INCLUIR consultas reagendadas (elas ainda vão acontecer)
WHERE status NOT IN ('preconsulting', 'cancelled')

-- OU ser explícito
WHERE status IN ('confirmed', 'reschudeled')
```

---

### 4. Consulta "confirmada" vs "realizada"

**Pergunta:** Qual a diferença entre `status = 'confirmed'` e `completed = TRUE`?

**Resposta:**

| Campo | Tipo | Significado |
|-------|------|-------------|
| `status = 'confirmed'` | VARCHAR | A consulta foi **agendada e confirmada** (não cancelada) |
| `completed = TRUE` | BOOLEAN | A consulta **realmente aconteceu** (médico finalizou) |

**Explicação detalhada:**

1. **status = 'confirmed'**: Significa que o paciente tem uma consulta agendada. Não garante que a consulta aconteceu.

2. **completed = TRUE**: Preenchido **manualmente pelo médico** quando ele finaliza a consulta e envia a receita. É a confirmação definitiva de que a consulta ocorreu.

**Combinações possíveis:**
```sql
-- Consulta agendada mas ainda não ocorreu
WHERE status = 'confirmed' AND completed IS NULL AND start::timestamp > NOW()

-- Consulta que aconteceu
WHERE status = 'confirmed' AND completed = TRUE

-- No-show (não compareceu)
WHERE status = 'confirmed' AND completed = FALSE 
  AND reason_for_cancellation IS NOT NULL

-- Consulta cancelada
WHERE status = 'cancelled'
```

**Query correta para consultas realizadas:**
```sql
SELECT COUNT(*) 
FROM consultings
WHERE completed = TRUE
  AND status NOT IN ('preconsulting', 'cancelled');
```

---

### 5. Consultas canceladas pelo médico vs pelo paciente

**Pergunta:** Existe algum campo que diferencia quem cancelou a consulta?

**Resposta:** ❌ NÃO existe campo específico para identificar quem cancelou.

**Campos disponíveis:**
- `status = 'cancelled'`: Indica que foi cancelada
- `reason_for_cancellation`: Texto livre com o motivo

**Análise do campo `reason_for_cancellation`:**
- É um campo VARCHAR de texto livre
- Preenchido quando `completed = FALSE`
- Não há padronização nos motivos

**Sugestão:** Para diferenciar, seria necessário:
1. Criar nova coluna `cancelled_by` (enum: 'patient', 'doctor', 'system')
2. Ou analisar padrões no texto de `reason_for_cancellation` via ILIKE

---

### 6. Campo type e scheduling

**Pergunta:** O que representam os campos `type` e `scheduling` na tabela consultings?

**Resposta:**

**Campo `type` - Tipo de videochamada:**
| Valor | Total | Descrição |
|-------|-------|-----------|
| google-meet | 66.448 | Consulta via Google Meet |
| daily-co | 17.026 | Consulta via Daily.co |
| video-chamada | 1.300 | Genérico |
| pending-meet-link | 69 | Link ainda não gerado |
| manual-scheduling-required | 1 | Agendamento manual |

**Campo `scheduling`:**
- Tipo: VARCHAR
- Status atual: **Vazio em todos os registros**
- Provavelmente campo legado não utilizado ou reservado para uso futuro

**Uso em queries:**
```sql
-- Filtrar por tipo de consulta
WHERE type = 'google-meet'
```

---

### 7. Campo meet_data

**Pergunta:** O que é armazenado em meet_data? É o log da videochamada? Podemos usar para calcular tempo real de consulta?

**Resposta:** ✅ SIM - É o log completo da videochamada

**Estrutura do JSONB:**
```json
{
  "total": 2,
  "registros": [
    {
      "identifier": "email@exemplo.com",
      "device_type": "web|android|ios",
      "display_name": "Nome Exibido",
      "duration_seconds": 1348,
      "start_timestamp_seconds": 1742487650
    }
  ]
}
```

**Campos importantes:**
| Campo | Descrição |
|-------|-----------|
| `total` | Número de entradas/reconexões |
| `identifier` | Email ou nome do participante |
| `device_type` | web (49.78%), android (27.33%), ios (22.81%) |
| `duration_seconds` | Tempo em segundos na sala |
| `start_timestamp_seconds` | Unix timestamp de entrada |

**Estatísticas:**
- 47.754 consultas com `meet_data` (60.7% do total)
- 98.2% com `completed = TRUE`
- Primeiro registro: Março/2025

**⚠️ Cuidado com bots:**
Excluir participantes de gravação:
```sql
WHERE NOT (
    LOWER(r->>'display_name') LIKE '%notetaker%'
    OR LOWER(r->>'display_name') LIKE '%assistant%'
    OR LOWER(r->>'display_name') LIKE '%read.ai%'
    OR LOWER(r->>'display_name') LIKE '%fireflies%'
)
```

---

## 👨‍⚕️ MÉDICOS (tabela doctors)

### 8. schedule vs office_hours

**Pergunta:** Qual a diferença entre `schedule` e `office_hours`?

**Resposta:** A tabela `doctors` **NÃO possui campo `office_hours`**.

**Campos da tabela doctors (validados):**
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | INTEGER | Chave primária |
| user_id | INTEGER | FK → users |
| name | VARCHAR | Nome do médico |
| number | VARCHAR | Número (telefone?) |
| priority | INTEGER | Prioridade no agendamento |
| **schedule** | JSONB | Horários disponíveis |
| doctor_schedule | JSONB | Parece ser campo legado/não usado |
| crm | VARCHAR | Número do CRM |
| speciality | VARCHAR | Especialidade (typo com Y) |
| dialog_id | VARCHAR | ID de integração |

**Estrutura do `schedule`:**
```json
{
  "SEG": ["08:00-12:00", "14:00-18:00"],
  "TER": ["15:00-21:00"],
  "QUA": ["08:00-21:00"],
  "QUI": ["08:00-19:00"],
  "SEX": null,
  "SAB": null,
  "DOM": null
}
```

---

### 9. doctor_schedule

**Pergunta:** Existe também um campo `doctor_schedule`. Para que serve?

**Resposta:** O campo `doctor_schedule` (JSONB) existe mas está **sempre NULL** nos registros analisados.

Provavelmente é um campo legado ou reservado para uso futuro. **Use apenas `schedule`** para obter os horários configurados.

---

### 10. Campo priority

**Pergunta:** O que significa o campo `priority` em doctors?

**Resposta:**

| Valor | Significado |
|-------|-------------|
| -1 | Médico inativo/sem agenda |
| 2+ | Médico ativo (números positivos) |

**Observação:** Médicos com `priority = -1` e `schedule = {}` geralmente são médicos inativos ou que não estão atendendo no momento.

**Uso recomendado:**
```sql
-- Médicos ativos com agenda configurada
WHERE d.priority > 0
  AND d.schedule IS NOT NULL
  AND d.schedule != '{}'
```

---

### 11. Médicos inativos

**Pergunta:** Como identifico se um médico está ativo ou inativo?

**Resposta:** Não existe campo booleano `active`. Use a combinação:

```sql
-- Médicos ATIVOS (recomendado)
SELECT * FROM doctors d
WHERE d.name IS NOT NULL 
  AND d.name NOT ILIKE '%teste%'
  AND d.priority > 0
  AND d.schedule IS NOT NULL 
  AND d.schedule != '{}';

-- Médicos que ATENDERAM no período
SELECT DISTINCT doctor_id 
FROM consultings 
WHERE completed = TRUE 
  AND start::timestamp >= '2025-01-01';
```

---

## 💰 VENDAS E CONVERSÃO

### 12. Fluxo de venda

**Pergunta:** O fluxo correto é: consulting → medical_prescription → product_budget?

**Resposta:** ✅ SIM - O fluxo é:

```
┌─────────────┐     ┌──────────────────────┐     ┌─────────────────┐
│ consultings │────→│ medical_prescriptions │────→│ product_budgets │
│  (consulta) │     │      (receita)        │     │   (orçamento)   │
└─────────────┘     └──────────────────────┘     └─────────────────┘
```

**Relacionamentos:**
- `consultings.id` → `medical_prescriptions.consulting_id`
- `medical_prescriptions.id` → `product_budgets.medical_prescription_id`

**Observação importante:** Nem toda consulta gera receita:
- `prescription_status = 'required'` → Teve receita
- `prescription_status = 'not_required'` → Sem receita (ver motivo em `reason_for_no_prescription`)

---

### 13. Status de product_budgets

**Pergunta:** Quais são todos os status possíveis de product_budgets?

**Resposta:** Existem apenas **2 status** (validado no banco):

| Status | Total | Descrição |
|--------|-------|-----------|
| **confirmed** | 31.451 | Orçamento pago ✅ |
| **pending** | 23.231 | Aguardando pagamento |

**Não existe** status `cancelled` na tabela `product_budgets`.

**Uso correto:**
```sql
-- Orçamentos pagos
WHERE pb.status = 'confirmed' AND pb.payment_at IS NOT NULL
```

---

### 14. Múltiplos orçamentos por receita

**Pergunta:** Uma medical_prescription pode ter vários product_budgets?

**Resposta:** ✅ SIM - É possível ter múltiplos orçamentos por receita.

**Estatísticas validadas:**
| Situação | Quantidade |
|----------|------------|
| Receitas sem orçamento | 57.569 (52.2%) |
| Receitas com 1 orçamento | 50.731 (46.0%) |
| Receitas com 2+ orçamentos | **1.915 (1.7%)** |
| **Total de receitas** | 110.215 |

**Cenários de múltiplos orçamentos:**
- Paciente pediu revisão do orçamento
- Atualização de preços
- Diferentes configurações de produtos

**Em queries de métricas**, considere usar `DISTINCT` ou filtrar apenas o primeiro/último:
```sql
-- Primeiro orçamento de cada receita
SELECT DISTINCT ON (medical_prescription_id) *
FROM product_budgets
ORDER BY medical_prescription_id, created_at ASC;
```

---

### 15. Valor do orçamento (campo value)

**Pergunta:** O campo `value` é o valor total ou preciso calcular?

**Resposta:** O campo `value` contém o **valor dos produtos** (sem frete).

**Estrutura de campos de valor:**
| Campo | Descrição |
|-------|-----------|
| `value` | Valor dos produtos (já com desconto aplicado) |
| `discount_value` | Valor do desconto adicional (se houver) |
| `delivery_value` | Valor do frete (geralmente R$ 150) |

**Exemplo real:**
```
value = 303.00 (produtos)
discount_value = 10.00
delivery_value = 150.00
Total pago pelo cliente = 303.00 + 150.00 = 453.00
```

**⚠️ Nota:** O `discount_value` parece ser um registro informativo. O `value` já contém o preço líquido dos produtos.

**Para cálculo de faturamento:**
```sql
-- Valor que o cliente pagou (produtos + frete)
SELECT SUM(value + COALESCE(delivery_value, 0)) AS faturamento_total
FROM product_budgets
WHERE status = 'confirmed';
```

---

## 👤 PACIENTES (tabela users)

### 16. Nome completo

**Pergunta:** Existe algum caso onde só first_name está preenchido?

**Resposta:** ✅ SIM - A maioria tem apenas `first_name`!

**Estatísticas validadas:**
| Situação | Quantidade | Percentual |
|----------|------------|------------|
| Nome completo (first + last) | 38.959 | 10.6% |
| Apenas first_name | **328.599** | **89.4%** |
| Sem nome | 3 | ~0% |
| **Total** | 367.561 | 100% |

**Padrão recomendado:**
```sql
-- Concatenação segura
COALESCE(u.first_name, '') || ' ' || COALESCE(u.last_name, '') AS nome_completo

-- Ou com TRIM para remover espaço extra
TRIM(COALESCE(u.first_name, '') || ' ' || COALESCE(u.last_name, '')) AS nome_completo

-- Ou usando CONCAT (ignora NULL automaticamente)
CONCAT(u.first_name, ' ', u.last_name) AS nome_completo
```

---

### 17. Pacientes vs outros usuários

**Pergunta:** Como diferencio um paciente de um admin/médico na tabela users?

**Resposta:** Use o campo `role`:

| Role | Quantidade | Descrição |
|------|------------|-----------|
| **client** | 367.400 | Pacientes |
| doctor | 90 | Médicos |
| attendant | 52 | Atendentes |
| admin | 19 | Administradores |

**Filtro para apenas pacientes:**
```sql
WHERE u.role = 'client'
-- OU
WHERE u.role IS NULL OR u.role = 'client'
```

---

## 📊 MÉTRICAS E RELATÓRIOS

### 18. Taxa de conversão - definição correta

**Pergunta:** Qual é a definição correta para taxa de conversão?

**Resposta:** Existem diferentes métricas dependendo do contexto:

**1. Taxa de conversão MÉDICO (primeira consulta do lead):**
```
Orçamentos pagos ÷ Receitas enviadas (na primeira consulta)
```
Mede a eficácia do médico em gerar vendas.

**2. Taxa de prescrição:**
```
Consultas com receita ÷ Consultas realizadas
```
Mede quantas consultas geram receita.

**3. Taxa de conversão geral:**
```
Orçamentos pagos ÷ Consultas com receita
```
Mede conversão da receita em venda.

**Query validada para taxa de conversão por médico:**
```sql
WITH metrics AS (
    SELECT 
        d.name AS medico,
        COUNT(DISTINCT CASE WHEN mp.id IS NOT NULL THEN c.id END) AS consultas_com_receita,
        COUNT(DISTINCT CASE WHEN pb.status = 'confirmed' THEN pb.id END) AS orcamentos_pagos
    FROM consultings c
    JOIN doctors d ON d.id = c.doctor_id
    LEFT JOIN medical_prescriptions mp ON mp.consulting_id = c.id
    LEFT JOIN product_budgets pb ON pb.medical_prescription_id = mp.id
    WHERE c.completed = TRUE
    GROUP BY d.name
)
SELECT 
    medico,
    consultas_com_receita,
    orcamentos_pagos,
    ROUND(orcamentos_pagos * 100.0 / NULLIF(consultas_com_receita, 0), 2) AS taxa_conversao
FROM metrics;
```

---

### 19. No-show vs Cancelamento

**Pergunta:** Como diferenciar no-show de cancelamento?

**Resposta:**

| Cenário | Condição SQL | Descrição |
|---------|--------------|-----------|
| **Consulta aconteceu** | `completed = TRUE` | Paciente compareceu |
| **No-show** | `completed = FALSE AND reason_for_cancellation IS NOT NULL` | Paciente faltou |
| **Cancelada** | `status = 'cancelled'` | Cancelada previamente |
| **Aguardando** | `completed IS NULL AND start > NOW()` | Futura |

**Query de presença:**
```sql
SELECT 
  CASE 
    WHEN completed = TRUE THEN 'Realizada'
    WHEN status = 'cancelled' THEN 'Cancelada'
    WHEN completed = FALSE AND reason_for_cancellation IS NOT NULL THEN 'No-show'
    WHEN start::timestamp > NOW() THEN 'Futura'
    ELSE 'Indefinido'
  END AS situacao,
  COUNT(*) AS total
FROM consultings
WHERE user_id IS NOT NULL AND negotiation_id IS NOT NULL
GROUP BY 1;
```

---

### 20. Consultas de acompanhamento

**Pergunta:** Existe campo que diferencia consulta inicial de acompanhamento?

**Resposta:** ❌ NÃO existe campo específico. Use lógica por paciente:

**Identificar primeira consulta do paciente:**
```sql
-- Numera consultas por paciente
SELECT 
    c.*,
    ROW_NUMBER() OVER (PARTITION BY c.user_id ORDER BY c.start) as numero_consulta,
    CASE 
        WHEN ROW_NUMBER() OVER (PARTITION BY c.user_id ORDER BY c.start) = 1 
        THEN 'Primeira Consulta'
        ELSE 'Retorno/Acompanhamento'
    END AS tipo_consulta
FROM consultings c
WHERE c.status NOT IN ('preconsulting', 'cancelled');
```

**Consultas gratuitas de pós-venda:**
Identificadas pela anotação na tabela `request_consultings`:
```sql
WHERE EXISTS (
    SELECT 1 FROM request_consultings rc 
    WHERE rc.consulting_id = c.id 
      AND rc.note ILIKE '%retorno gratuito pós%'
)
```

---

## 🔧 CONFIGURAÇÕES E SISTEMA

### 21. Intervalo de slots

**Pergunta:** O sistema usa slots de 20 minutos. Isso é fixo?

**Resposta:** ✅ SIM - É fixo em **20 minutos**.

Não existe campo de configuração no banco. O valor é hardcoded no sistema.

**Cálculo de slots disponíveis:**
```sql
-- Gera slots de 20 em 20 minutos
SELECT generate_series(
    check_date + '08:00'::time,
    check_date + '20:00'::time - interval '20 minutes',
    interval '20 minutes'
) AS slot_time;
```

---

### 22. Filtro de testes

**Pergunta:** Existem outros padrões que identificam dados de teste?

**Resposta:** Padrões conhecidos para excluir:

**Médicos:**
```sql
WHERE d.name NOT ILIKE '%teste%'
  AND d.name NOT ILIKE '%test%'
  AND d.name IS NOT NULL
```

**Consultas:**
```sql
WHERE c.user_id IS NOT NULL
  AND c.negotiation_id IS NOT NULL
  AND c.status NOT IN ('preconsulting')
```

**Usuários:**
```sql
WHERE u.email NOT ILIKE '%@clickcannabis%'
  AND u.email NOT ILIKE '%teste%'
  AND u.role = 'client'
```

---

### 23. negotiation_id IS NOT NULL

**Pergunta:** Por que filtramos por `negotiation_id IS NOT NULL`? Existem consultas válidas sem negotiation_id?

**Resposta:**

**Estatísticas validadas:**
| Filtro | Quantidade |
|--------|------------|
| Total de consultas | 95.915 |
| Com user_id E negotiation_id | 81.646 (85.1%) |
| Sem user_id | 13.982 (14.6%) |
| Sem negotiation_id | 14.263 (14.9%) |

**Por que filtrar:**
- Registros sem `negotiation_id` geralmente são:
  - Slots bloqueados/reservados sem paciente
  - Registros de teste
  - Erros de integração (bugs)

**Recomendação:** SEMPRE incluir os filtros:
```sql
WHERE c.user_id IS NOT NULL
  AND c.negotiation_id IS NOT NULL
  AND c.status NOT IN ('preconsulting')
```

Isso exclui aproximadamente **15% de registros inválidos**.

---

## 📅 DATAS E HORÁRIOS

### 24. Horário de funcionamento da clínica

**Pergunta:** A clínica tem horário fixo de funcionamento?

**Resposta:** Não existe configuração centralizada. Cada médico define sua própria agenda no campo `schedule`.

**Análise dos dados:**
- Horários variam de 08:00 a 21:00
- **Pico de consultas:** 17h (10.5%)
- Segunda e terça são os dias mais movimentados

---

### 25. Fuso horário do servidor

**Pergunta:** O servidor está configurado em qual timezone?

**Resposta:** ✅ **America/Sao_Paulo**

```sql
SHOW timezone;
-- Resultado: America/Sao_Paulo
```

**Implicações:**
- `NOW()` e `CURRENT_DATE` retornam horário de São Paulo
- Campos `timestamp with time zone` são convertidos automaticamente
- O campo `start` (VARCHAR) armazena ISO 8601 com offset `-03:00`

---

## ✅ CHECKLIST PARA NOVAS QUERIES

Antes de finalizar qualquer query, verifique:

### Tabela consultings
- [ ] Incluiu `user_id IS NOT NULL`?
- [ ] Incluiu `negotiation_id IS NOT NULL`?
- [ ] Excluiu `status NOT IN ('preconsulting')`?
- [ ] Converteu o campo `start` para timestamp (`start::timestamp`)?

### Tabela product_budgets
- [ ] Filtrou `status = 'confirmed'` para vendas?
- [ ] Usou `payment_at` (não `created_at`) para data do pagamento?

### Tabela doctors
- [ ] Excluiu `name ILIKE '%teste%'`?
- [ ] Verificou se `priority > 0` para médicos ativos?

---

## 📚 DOCUMENTAÇÃO RELACIONADA

- `Documentação_Completa__Coluna__meet_data__-_Tabela__consultings_`
- `Documentacao_Tabela_Consultings_Fluxo_Completo.md`
- `Documentacao_Regra_Validacao_Consultings.md`
- `Documentação__Product_Budgets__Venda_de_Orçamento_`
- `Documentação__Queries_de_Médicos`

---

**Documento gerado automaticamente via Claude AI**  
**Todas as queries foram validadas em tempo real via n8n**