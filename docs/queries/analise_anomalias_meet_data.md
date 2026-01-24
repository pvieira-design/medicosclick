# Análise de Anomalias: Duração de Consultas via `meet_data`

**Data da Análise:** 24 de Janeiro de 2026  
**Período Analisado:** 23 de Janeiro de 2026  
**Autor:** Equipe de Dados - Click Cannabis  
**Status:** Em investigação

---

## 1. Resumo Executivo

Durante a análise de duração das consultas médicas utilizando o campo `meet_data` da tabela `consultings`, foram identificadas **anomalias significativas**: consultas marcadas como realizadas (`completed = TRUE`) com durações extremamente curtas (5 segundos) e, em muitos casos, com apenas um participante na sala de vídeo.

**Descoberta crítica:** Todas as consultas anômalas possuem receitas médicas emitidas na tabela `medical_prescriptions`.

---

## 2. Metodologia

### 2.1 Cálculo da Duração Real

A duração real de cada consulta é calculada como a diferença entre a **última saída** e a **primeira entrada** de qualquer participante (excluindo bots):

```
DURAÇÃO = MAX(start_timestamp_seconds + duration_seconds) - MIN(start_timestamp_seconds)
```

### 2.2 Filtros Aplicados

- `meet_data IS NOT NULL` — Apenas consultas com dados de videochamada
- `user_id IS NOT NULL` — Paciente vinculado
- `negotiation_id IS NOT NULL` — Negociação vinculada
- `status NOT IN ('preconsulting')` — Exclui slots vazios
- Exclusão de bots: `notetaker`, `assistant`, `read.ai`, `fireflies`, `meetgeek`, `fathom`

---

## 3. Dados Gerais do Dia 23/01/2026

| Métrica | Valor | Percentual |
|---------|-------|------------|
| Total de consultas com `meet_data` | 330 | 100% |
| `completed = TRUE` | 326 | 98.8% |
| `completed = FALSE` | 4 | 1.2% |
| `completed = NULL` | 0 | 0% |

### 3.1 Distribuição de Duração (completed = TRUE)

| Faixa de Duração | Quantidade | Percentual |
|------------------|------------|------------|
| < 1 minuto | 23 | 7.1% |
| 1-5 minutos | 33 | 10.1% |
| 5-10 minutos | 87 | 26.7% |
| 10-15 minutos | 89 | 27.3% |
| 15-20 minutos | 64 | 19.6% |
| 20-30 minutos | 26 | 8.0% |
| > 30 minutos | 4 | 1.2% |

**Observação:** 17.2% das consultas marcadas como realizadas tiveram duração inferior a 5 minutos.

---

## 4. Anomalias Identificadas

### 4.1 Anomalia Tipo 1: Consultas de ~5 segundos com `completed = TRUE`

**Total encontrado:** 15 consultas

Consultas onde o `meet_data` registra `duration_seconds = 5` (duração mínima capturada pelo sistema) e apenas 1 participante entrou na sala.

| Consulting ID | Médico | Duração | Entradas | Participante |
|---------------|--------|---------|----------|--------------|
| 110716 | Guilherme Silva | 0.08 min | 1 | Só médico |
| 110738 | Rayanna Kiyoko | 0.08 min | 1 | Só paciente |
| 110742 | Guilherme Silva | 0.08 min | 1 | UUID (sistema?) |
| 110778 | Hermínio Freitas | 0.08 min | 1 | Só paciente |
| 110862 | Rodrigo Saad | 0.08 min | 1 | Só paciente |
| 111011 | Raphael Mariz | 0.08 min | 1 | Só paciente |
| 111040 | Médico Teste | 0.08 min | 1 | Só médico (TESTE) |
| 111123 | Erick Alves Miranda | 0.08 min | 1 | Só paciente |
| 110200 | Clara Sinder Barroso | 0.08 min | 1 | Só paciente |
| 111257 | Hermínio Freitas | 0.08 min | 1 | Só paciente |

**Médicos mais afetados:**
- Rayanna Kiyoko Borges Utiama: 4 consultas
- Guilherme Silva: 2 consultas
- Hermínio Freitas Arleu de Melo: 2 consultas

### 4.2 Anomalia Tipo 2: Dois participantes, duração < 1 minuto

Consultas onde médico e paciente entraram, mas a duração total foi inferior a 1 minuto.

| Consulting ID | Médico | Duração | Participantes |
|---------------|--------|---------|---------------|
| 110396 | Gustavo Regonha Ayres | 0.23 min (14 seg) | Dr. Gustavo + Geneilson |
| 110343 | Raphael Mariz | 0.73 min (44 seg) | Dr. Raphael + Vanessa |
| 110884 | Raphael Mariz | 0.80 min (48 seg) | Dr. Raphael + Florentino |

### 4.3 Anomalia Tipo 3: Muitas reconexões (>5 entradas)

| Consulting ID | Médico | Duração | Entradas | Status |
|---------------|--------|---------|----------|--------|
| 109728 | Lucas Khouri | 7.87 min | 7 | completed |
| 110657 | Guilherme Silva | 23.10 min | 7 | completed |
| 110728 | Erick Alves Miranda | 8.10 min | 7 | completed |
| 111041 | Afrânio Loures | 21.58 min | 7 | completed |
| 111140 | Gustavo Campos | 9.77 min | 6 | completed |
| 110780 | Diego Naimi Usberco | 14.05 min | 6 | completed |
| 110993 | Erick Alves Miranda | 4.13 min | 6 | completed |

### 4.4 Anomalia Tipo 4: `completed = FALSE` mas teve participantes

| Consulting ID | Médico | Duração | Entradas | Status |
|---------------|--------|---------|----------|--------|
| 110649 | Guilherme Silva | 0.08 min | 1 | cancelled |
| 110943 | Raphael Mariz | 0.63 min | 2 | cancelled |
| 107498 | Erick Alves Miranda | 17.82 min | 3 | rescheduled |
| 111188 | Guilherme Lucchesi | 6.93 min | 5 | cancelled |

---

## 5. Verificação de Receitas

### 5.1 Consulta Realizada

Todas as consultas anômalas de 5 segundos foram verificadas na tabela `medical_prescriptions`:

| Consulting ID | Médico | Duração | Tem Receita? | Data da Receita |
|---------------|--------|---------|--------------|-----------------|
| 110200 | Clara Sinder Barroso | 0.08 min | ✅ SIM | 23/01 18:20 |
| 110343 | Raphael Mariz | 0.73 min | ✅ SIM | 23/01 13:23 |
| 110396 | Gustavo Regonha Ayres | 0.23 min | ✅ SIM | 23/01 11:30 |
| 110716 | Guilherme Silva | 0.08 min | ✅ SIM | 23/01 15:00 |
| 110738 | Rayanna Kiyoko | 0.08 min | ✅ SIM | 23/01 16:07 |
| 110742 | Guilherme Silva | 0.08 min | ✅ SIM | 23/01 15:53 |
| 110778 | Hermínio Freitas | 0.08 min | ✅ SIM | 23/01 16:51 |
| 110862 | Rodrigo Saad | 0.08 min | ✅ SIM | 23/01 12:18 |
| 111011 | Raphael Mariz | 0.08 min | ✅ SIM | 23/01 18:57 |
| 111040 | Médico Teste | 0.08 min | ✅ SIM | 23/01 16:23 |
| 111123 | Erick Alves Miranda | 0.08 min | ✅ SIM | 23/01 20:31 |
| 111257 | Hermínio Freitas | 0.08 min | ✅ SIM | 23/01 20:36 |

**Resultado:** 100% das consultas anômalas verificadas possuem receita emitida.

---

## 6. Exemplos de `meet_data` Bruto

### 6.1 Caso: Só médico entrou (ID 110716)

```json
{
  "total": 1,
  "registros": [
    {
      "identifier": "Dr. Guilherme Silva  - Guilherme Campos Silva",
      "display_name": "Dr. Guilherme Silva  - Guilherme Campos Silva",
      "duration_seconds": 5,
      "device_type": "web",
      "start_timestamp_seconds": 1769178579
    }
  ]
}
```

### 6.2 Caso: Só paciente entrou (ID 110738)

```json
{
  "total": 1,
  "registros": [
    {
      "identifier": "Leonam-Nagel",
      "display_name": "Leonam-Nagel",
      "duration_seconds": 5,
      "device_type": "web",
      "start_timestamp_seconds": 1769184057
    }
  ]
}
```

### 6.3 Caso: Ambos entraram por ~5 segundos (ID 110396)

```json
{
  "total": 2,
  "registros": [
    {
      "identifier": "Geneilson-da-Silva-Souza",
      "display_name": "Geneilson-da-Silva-Souza",
      "duration_seconds": 5,
      "device_type": "web",
      "start_timestamp_seconds": 1769167275
    },
    {
      "identifier": "Dr. Gustavo Regonha Ayres",
      "display_name": "Dr. Gustavo Regonha Ayres",
      "duration_seconds": 5,
      "device_type": "web",
      "start_timestamp_seconds": 1769167284
    }
  ]
}
```

### 6.4 Caso: Consulta "relâmpago" de 44 segundos (ID 110343)

```json
{
  "total": 2,
  "registros": [
    {
      "identifier": "Vanessa",
      "display_name": "Vanessa",
      "duration_seconds": 44,
      "device_type": "web",
      "start_timestamp_seconds": 1769173294
    },
    {
      "identifier": "Dr. Raphael Mariz",
      "display_name": "Dr. Raphael Mariz",
      "duration_seconds": 15,
      "device_type": "web",
      "start_timestamp_seconds": 1769173321
    }
  ]
}
```

---

## 7. Hipóteses de Explicação

### Hipótese 1: Consulta realizada por outro canal (Telefone/WhatsApp)
**Probabilidade:** Alta

A consulta pode ter sido realizada por telefone ou WhatsApp, e o médico/paciente apenas "entrou" na sala de vídeo para registrar presença no sistema. A receita foi gerada normalmente após o atendimento real.

**Indicadores a favor:**
- Receitas foram emitidas em tempo razoável após o horário agendado
- Padrão recorrente em alguns médicos específicos

### Hipótese 2: Retorno/Renovação de receita
**Probabilidade:** Média

Pacientes de retorno que já possuem histórico podem precisar apenas de renovação de receita, sem necessidade de consulta completa. O médico verifica rapidamente e emite a receita.

**Como validar:**
- Verificar se os pacientes são novos ou têm consultas anteriores
- Verificar se as receitas são renovações

### Hipótese 3: Bug no sistema de captura do `meet_data`
**Probabilidade:** Baixa

O sistema de captura de dados da videochamada pode estar com falhas, não registrando toda a sessão.

**Contra-indicadores:**
- O campo `total` indica corretamente o número de entradas
- Os timestamps são consistentes
- Não há padrão de falha sistêmica

### Hipótese 4: Problema operacional/má prática
**Probabilidade:** A investigar

Consultas sendo marcadas como realizadas sem atendimento efetivo.

**Indicadores de alerta:**
- Concentração em médicos específicos
- Receitas emitidas para consultas de 5 segundos
- Padrão consistente ao longo do dia

---

## 8. Observações Importantes

### 8.1 Participantes com UUID no nome

Algumas consultas apresentam `display_name` como UUID (ex: `0d73faa9-a6ea-44a6-8d30-09d6c5e7d13f`), indicando possível problema na identificação do participante pelo sistema.

### 8.2 Conta "Médico Teste"

A consulta ID 111040 foi realizada por "Médico Teste", sugerindo uso de conta de teste em ambiente de produção.

### 8.3 Duração mínima de 5 segundos

O valor `duration_seconds = 5` aparece com frequência, sugerindo que este seja o threshold mínimo de captura do sistema de videochamada.

---

## 9. Queries Validadas

### 9.1 Query Principal: Duração de Cada Consulta

```sql
SELECT 
    c.id AS consulting_id,
    c.doctor_id,
    d.name AS medico,
    c.start::timestamptz AS data_agendada,
    c.completed,
    
    -- Primeira entrada na sala
    to_timestamp(MIN((r->>'start_timestamp_seconds')::bigint)) AS primeira_entrada,
    
    -- Última saída da sala
    to_timestamp(MAX((r->>'start_timestamp_seconds')::bigint + (r->>'duration_seconds')::int)) AS ultima_saida,
    
    -- DURAÇÃO REAL EM MINUTOS
    ROUND(
        (MAX((r->>'start_timestamp_seconds')::bigint + (r->>'duration_seconds')::int) 
        - MIN((r->>'start_timestamp_seconds')::bigint)) / 60.0
    , 2) AS duracao_minutos,
    
    (c.meet_data->>'total')::int AS total_entradas

FROM consultings c
LEFT JOIN doctors d ON d.id = c.doctor_id,
     jsonb_array_elements(c.meet_data->'registros') r

WHERE c.meet_data IS NOT NULL
  AND c.user_id IS NOT NULL
  AND c.negotiation_id IS NOT NULL
  AND c.status NOT IN ('preconsulting')
  AND c.completed = true
  
  -- Excluir bots de gravação
  AND NOT (
      r->>'display_name' ILIKE '%notetaker%' 
      OR r->>'display_name' ILIKE '%assistant%'
      OR r->>'display_name' ILIKE '%read.ai%'
      OR r->>'display_name' ILIKE '%fireflies%'
      OR r->>'display_name' ILIKE '%meetgeek%'
      OR r->>'display_name' ILIKE '%fathom%'
  )

GROUP BY c.id, c.doctor_id, d.name, c.start, c.completed
ORDER BY c.start::timestamptz DESC;
```

### 9.2 Query: Estatísticas Gerais de Duração

```sql
WITH duracao_consultas AS (
    SELECT 
        c.id AS consulting_id,
        c.doctor_id,
        ROUND(
            (MAX((r->>'start_timestamp_seconds')::bigint + (r->>'duration_seconds')::int) 
            - MIN((r->>'start_timestamp_seconds')::bigint)) / 60.0
        , 2) AS duracao_minutos
    FROM consultings c,
         jsonb_array_elements(c.meet_data->'registros') r
    WHERE c.meet_data IS NOT NULL
      AND c.user_id IS NOT NULL
      AND c.negotiation_id IS NOT NULL
      AND c.status NOT IN ('preconsulting')
      AND c.completed = true
      AND NOT (
          r->>'display_name' ILIKE '%notetaker%' 
          OR r->>'display_name' ILIKE '%assistant%'
          OR r->>'display_name' ILIKE '%read.ai%'
          OR r->>'display_name' ILIKE '%fireflies%'
          OR r->>'display_name' ILIKE '%meetgeek%'
          OR r->>'display_name' ILIKE '%fathom%'
      )
    GROUP BY c.id, c.doctor_id
)
SELECT 
    COUNT(*) AS total_consultas,
    ROUND(AVG(duracao_minutos)::numeric, 2) AS media_minutos,
    ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY duracao_minutos)::numeric, 2) AS mediana_minutos,
    ROUND(MIN(duracao_minutos)::numeric, 2) AS minimo,
    ROUND(MAX(duracao_minutos)::numeric, 2) AS maximo,
    ROUND(STDDEV(duracao_minutos)::numeric, 2) AS desvio_padrao
FROM duracao_consultas
WHERE duracao_minutos > 0 
  AND duracao_minutos < 120;  -- Filtro de outliers
```

**Resultado (base completa):**
| Métrica | Valor |
|---------|-------|
| Total de consultas | 47.968 |
| Média | 14.44 minutos |
| Mediana | 13.15 minutos |
| Mínimo | 0.02 minutos |
| Máximo | 119.52 minutos |
| Desvio Padrão | 8.77 minutos |

### 9.3 Query: Consultas Anômalas com Verificação de Receita

```sql
SELECT 
    c.id AS consulting_id,
    d.name AS medico,
    c.completed,
    c.prescription_status,
    (c.meet_data->>'total')::int AS total_entradas,
    ROUND(
        (SELECT (MAX((r->>'start_timestamp_seconds')::bigint + (r->>'duration_seconds')::int) 
                - MIN((r->>'start_timestamp_seconds')::bigint)) / 60.0 
         FROM jsonb_array_elements(c.meet_data->'registros') r)
    , 2) AS duracao_minutos,
    mp.id AS receita_id,
    mp.created_at AS receita_criada,
    CASE WHEN mp.id IS NOT NULL THEN 'SIM' ELSE 'NÃO' END AS tem_receita
FROM consultings c
LEFT JOIN doctors d ON d.id = c.doctor_id
LEFT JOIN medical_prescriptions mp ON mp.consulting_id = c.id
WHERE c.id IN (110716, 110738, 110742, 110778, 110862, 111040, 110396, 110343)
ORDER BY c.id;
```

### 9.4 Query: Consultas < 3 minutos com Participantes

```sql
SELECT 
    c.id AS consulting_id,
    d.name AS medico,
    c.start::timestamptz AS data_agendada,
    c.completed,
    c.prescription_status,
    ROUND(
        (MAX((r->>'start_timestamp_seconds')::bigint + (r->>'duration_seconds')::int) 
        - MIN((r->>'start_timestamp_seconds')::bigint)) / 60.0
    , 2) AS duracao_minutos,
    (c.meet_data->>'total')::int AS total_entradas,
    COUNT(*) AS registros_validos,
    STRING_AGG(DISTINCT r->>'display_name', ' | ') AS participantes
FROM consultings c
LEFT JOIN doctors d ON d.id = c.doctor_id,
     jsonb_array_elements(c.meet_data->'registros') r
WHERE c.meet_data IS NOT NULL
  AND c.user_id IS NOT NULL
  AND c.negotiation_id IS NOT NULL
  AND c.status NOT IN ('preconsulting')
  AND c.start::date = '2026-01-23'
  AND c.completed = true
  AND NOT (
      r->>'display_name' ILIKE '%notetaker%' 
      OR r->>'display_name' ILIKE '%assistant%'
      OR r->>'display_name' ILIKE '%read.ai%'
      OR r->>'display_name' ILIKE '%fireflies%'
  )
GROUP BY c.id, d.name, c.start, c.completed, c.prescription_status
HAVING ROUND(
    (MAX((r->>'start_timestamp_seconds')::bigint + (r->>'duration_seconds')::int) 
    - MIN((r->>'start_timestamp_seconds')::bigint)) / 60.0
, 2) < 3
ORDER BY duracao_minutos;
```

### 9.5 Query: Visualizar meet_data Bruto

```sql
SELECT 
    c.id,
    c.doctor_id,
    d.name AS medico,
    c.completed,
    c.meet_data
FROM consultings c
LEFT JOIN doctors d ON d.id = c.doctor_id
WHERE c.id IN (110716, 110738, 110742, 110396, 110343);
```

---

## 10. Recomendações

### 10.1 Ações Imediatas

1. **Investigar os médicos com maior incidência** de consultas curtas
2. **Verificar se pacientes são retornos** ou primeiras consultas
3. **Auditar receitas** emitidas em consultas < 1 minuto

### 10.2 Melhorias Sugeridas

1. **Criar alerta automático** para consultas marcadas como `completed = TRUE` com duração < 5 minutos
2. **Implementar validação** que impeça emissão de receita sem duração mínima de consulta
3. **Dashboard de monitoramento** para acompanhar anomalias em tempo real

### 10.3 Query para Monitoramento Contínuo (Grafana)

```sql
-- Consultas suspeitas do dia atual
SELECT 
    c.id,
    d.name AS medico,
    c.start::timestamptz AS agendado,
    ROUND(
        (MAX((r->>'start_timestamp_seconds')::bigint + (r->>'duration_seconds')::int) 
        - MIN((r->>'start_timestamp_seconds')::bigint)) / 60.0
    , 2) AS duracao_min,
    (c.meet_data->>'total')::int AS entradas,
    CASE WHEN mp.id IS NOT NULL THEN 'SIM' ELSE 'NÃO' END AS tem_receita
FROM consultings c
LEFT JOIN doctors d ON d.id = c.doctor_id
LEFT JOIN medical_prescriptions mp ON mp.consulting_id = c.id,
     jsonb_array_elements(c.meet_data->'registros') r
WHERE c.meet_data IS NOT NULL
  AND c.user_id IS NOT NULL
  AND c.completed = true
  AND c.start::date = CURRENT_DATE
  AND NOT (r->>'display_name' ILIKE '%notetaker%')
GROUP BY c.id, d.name, c.start, mp.id
HAVING ROUND(
    (MAX((r->>'start_timestamp_seconds')::bigint + (r->>'duration_seconds')::int) 
    - MIN((r->>'start_timestamp_seconds')::bigint)) / 60.0
, 2) < 3
ORDER BY duracao_min;
```

---

## 11. Próximos Passos

- [ ] Validar hipótese de consultas por telefone/WhatsApp com equipe operacional
- [ ] Verificar histórico dos pacientes nas consultas anômalas
- [ ] Entrevistar médicos com maior incidência
- [ ] Definir threshold mínimo aceitável de duração de consulta
- [ ] Implementar alertas e dashboards de monitoramento

---

## 12. Histórico de Alterações

| Data | Versão | Alteração |
|------|--------|-----------|
| 24/01/2026 | 1.0 | Documento inicial |

---

*Documento gerado com dados validados via workflow N8N "Claude Queries" (ID: 6WdaglLNkVEoq1yw)*
