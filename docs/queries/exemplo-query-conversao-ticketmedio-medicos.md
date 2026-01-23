# Query de Metricas para Calculo de Score (P1-P5)

Esta query e usada pelo sistema de scoring para calcular a taxa de conversao e ticket medio de cada medico.

## Regra de Negocio

- **Taxa de Conversao**: `orcamentos_pagos / consultas_com_receita` (NAO e vendas/consultas!)
- **Ticket Medio**: `faturamento / orcamentos_pagos`
- **Consultas para Minimo**: `total_consultas_realizadas` (primeiro lead + recorrencia)

A conversao mede quantas receitas geraram venda, focando apenas na PRIMEIRA consulta de cada paciente (exclui recorrencia).

## Implementacao no Sistema

Arquivo: `packages/db/src/click-replica.ts`
Funcoes:
- `getMetricasMedicoPrimeiroLead(doctorId, semanas)` - Para um medico
- `getMetricasTodosMedicosPrimeiroLead(semanas)` - Para todos (calculo de percentil)

## Query SQL (Versao Grafana com $__timeFilter)

```sql
-- Taxa de Conversao Medicos - APENAS PRIMEIRA CONSULTA DO PACIENTE
-- Exclui consultas de recorrencia para medir conversao real de novos leads
-- Inclui colunas comparativas: total geral, primeiro paciente e recorrencia
WITH consultas_classificadas AS (
    -- Classifica cada consulta como primeira ou recorrencia
    SELECT 
        id,
        user_id,
        doctor_id,
        start,
        completed,
        ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY start::timestamp) AS rn
    FROM consultings
    WHERE status NOT IN ('preconsulting', 'cancelled')
),
primeira_consulta AS (
    -- Filtra apenas a primeira consulta de cada paciente
    SELECT *
    FROM consultas_classificadas
    WHERE rn = 1
),
metricas_medico AS (
    SELECT 
        pc.doctor_id,
        d.name AS medico,
        
        -- =============================================
        -- NOVAS COLUNAS: Total, Primeiro Paciente, Recorrencia
        -- =============================================
        
        -- Total de consultas realizadas (todas)
        (SELECT COUNT(DISTINCT cc.id)
         FROM consultas_classificadas cc
         WHERE cc.doctor_id = pc.doctor_id
           AND cc.completed = true
           AND $__timeFilter(cc.start::timestamp)
        ) AS total_consultas_realizadas,
        
        -- Primeiras consultas realizadas no periodo (primeiro paciente)
        COUNT(DISTINCT pc.id) FILTER (
            WHERE pc.completed = true 
            AND $__timeFilter(pc.start::timestamp)
        ) AS consultas_primeiro_paciente,
        
        -- Consultas de recorrencia
        (SELECT COUNT(DISTINCT cc.id)
         FROM consultas_classificadas cc
         WHERE cc.doctor_id = pc.doctor_id
           AND cc.completed = true
           AND cc.rn > 1
           AND $__timeFilter(cc.start::timestamp)
        ) AS consultas_recorrencia,
        
        -- =============================================
        -- METRICAS EXISTENTES (baseadas em primeira consulta)
        -- =============================================
        
        -- Primeiras consultas que tiveram receita
        COUNT(DISTINCT CASE 
            WHEN mp.id IS NOT NULL 
            AND pc.completed = true 
            AND $__timeFilter(pc.start::timestamp)
            THEN pc.id 
        END) AS consultas_com_receita,
        
        -- Total de receitas (pode haver multiplas por consulta)
        COUNT(DISTINCT mp.id) FILTER (
            WHERE pc.completed = true 
            AND $__timeFilter(pc.start::timestamp)
        ) AS total_receitas,
        
        -- Orcamentos pagos
        COUNT(DISTINCT pb.id) FILTER (
            WHERE pb.status = 'confirmed' 
            AND $__timeFilter(pc.start::timestamp)
        ) AS orcamentos_pagos,
        
        -- Faturamento (inclui delivery_value)
        COALESCE(SUM(pb.value + COALESCE(pb.delivery_value, 0)) FILTER (
            WHERE pb.status = 'confirmed' 
            AND $__timeFilter(pc.start::timestamp)
        ), 0) AS faturamento
    FROM primeira_consulta pc
    INNER JOIN doctors d ON d.id = pc.doctor_id
    LEFT JOIN medical_prescriptions mp ON mp.consulting_id = pc.id
    LEFT JOIN product_budgets pb ON pb.medical_prescription_id = mp.id
    GROUP BY pc.doctor_id, d.name
)
SELECT 
    medico,
    
    -- =============================================
    -- NOVAS COLUNAS DE VISUALIZACAO
    -- =============================================
    total_consultas_realizadas,
    consultas_primeiro_paciente,
    consultas_recorrencia,
    
    -- =============================================
    -- METRICAS DE CONVERSAO (baseadas em primeira consulta)
    -- =============================================
    
    -- Taxa de prescricao
    ROUND(consultas_com_receita::numeric * 100.0 / NULLIF(consultas_primeiro_paciente, 0), 1) || '%' AS taxa_prescricao,
    
    -- Taxa de conversao (leads que compraram)
    ROUND(orcamentos_pagos::numeric * 100.0 / NULLIF(consultas_com_receita, 0), 2) || '%' AS taxa_conversao,
    
    consultas_com_receita,
    total_receitas,
    orcamentos_pagos,
    
    'R$ ' || TO_CHAR(faturamento::numeric, 'FM999G999G999D00') AS faturamento,
    
    COALESCE(
        'R$ ' || TO_CHAR(ROUND(faturamento / NULLIF(orcamentos_pagos, 0), 2)::numeric, 'FM999G999G999D00'),
        'R$ 0,00'
    ) AS ticket_medio
FROM metricas_medico
WHERE consultas_primeiro_paciente > 0
ORDER BY faturamento DESC;
```

## Query SQL (Versao Sistema - com parametro semanas)

Usada em `click-replica.ts`:

```sql
WITH consultas_classificadas AS (
    SELECT 
        id, user_id, doctor_id, start, completed,
        ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY start::timestamp) AS rn
    FROM consultings
    WHERE status NOT IN ('preconsulting', 'cancelled')
      AND user_id IS NOT NULL
      AND negotiation_id IS NOT NULL
),
primeira_consulta AS (
    SELECT * FROM consultas_classificadas WHERE rn = 1
),
metricas AS (
    SELECT 
        pc.doctor_id,
        
        (SELECT COUNT(DISTINCT cc.id)
         FROM consultas_classificadas cc
         WHERE cc.doctor_id = pc.doctor_id
           AND cc.completed = true
           AND cc.start::timestamptz >= NOW() - INTERVAL '${semanas} weeks'
        ) AS total_consultas_realizadas,
        
        COUNT(DISTINCT pc.id) FILTER (
            WHERE pc.completed = true 
            AND pc.start::timestamptz >= NOW() - INTERVAL '${semanas} weeks'
        ) AS consultas_primeiro_paciente,
        
        (SELECT COUNT(DISTINCT cc.id)
         FROM consultas_classificadas cc
         WHERE cc.doctor_id = pc.doctor_id
           AND cc.completed = true
           AND cc.rn > 1
           AND cc.start::timestamptz >= NOW() - INTERVAL '${semanas} weeks'
        ) AS consultas_recorrencia,
        
        COUNT(DISTINCT CASE 
            WHEN mp.id IS NOT NULL AND pc.completed = true 
            AND pc.start::timestamptz >= NOW() - INTERVAL '${semanas} weeks'
            THEN pc.id 
        END) AS consultas_com_receita,
        
        COUNT(DISTINCT pb.id) FILTER (
            WHERE pb.status = 'confirmed' 
            AND pc.start::timestamptz >= NOW() - INTERVAL '${semanas} weeks'
        ) AS orcamentos_pagos,
        
        COALESCE(SUM(pb.value + COALESCE(pb.delivery_value, 0)) FILTER (
            WHERE pb.status = 'confirmed' 
            AND pc.start::timestamptz >= NOW() - INTERVAL '${semanas} weeks'
        ), 0) AS faturamento
        
    FROM primeira_consulta pc
    LEFT JOIN medical_prescriptions mp ON mp.consulting_id = pc.id
    LEFT JOIN product_budgets pb ON pb.medical_prescription_id = mp.id
    GROUP BY pc.doctor_id
)
SELECT 
    doctor_id,
    COALESCE(total_consultas_realizadas, 0)::int AS total_consultas_realizadas,
    COALESCE(consultas_primeiro_paciente, 0)::int AS consultas_primeiro_paciente,
    COALESCE(consultas_recorrencia, 0)::int AS consultas_recorrencia,
    COALESCE(consultas_com_receita, 0)::int AS consultas_com_receita,
    COALESCE(orcamentos_pagos, 0)::int AS orcamentos_pagos,
    ROUND(CASE WHEN consultas_com_receita > 0 
        THEN orcamentos_pagos::numeric / consultas_com_receita ELSE 0 END, 4)::float AS taxa_conversao,
    ROUND(CASE WHEN orcamentos_pagos > 0 
        THEN faturamento / orcamentos_pagos ELSE 0 END, 2)::float AS ticket_medio,
    ROUND(faturamento, 2)::float AS faturamento
FROM metricas
WHERE total_consultas_realizadas > 0
```

## Campos Retornados

| Campo | Descricao | Uso |
|-------|-----------|-----|
| `total_consultas_realizadas` | Primeiro lead + recorrencia | Validacao de `consultasMinimas` |
| `consultas_primeiro_paciente` | Apenas primeira consulta de cada paciente | Informativo |
| `consultas_recorrencia` | Apenas consultas de pacientes ja atendidos | Informativo |
| `consultas_com_receita` | Primeiro lead que gerou receita | Denominador da taxa |
| `orcamentos_pagos` | Vendas confirmadas de primeiro lead | Numerador da taxa |
| `taxa_conversao` | `orcamentos_pagos / consultas_com_receita` | Calculo do score |
| `ticket_medio` | `faturamento / orcamentos_pagos` | Calculo do score |
| `faturamento` | Valor total vendido | Informativo |

## Validacao de Consultas Minimas

Apos calcular o score e determinar a faixa, o sistema valida se o medico tem o minimo de consultas exigido:

```
P1: consultasMinimas = 100
P2: consultasMinimas = 50
P3: consultasMinimas = 25
P4: consultasMinimas = 10
P5: consultasMinimas = 0
```

Se o medico tem score para P1 (>=80) mas apenas 30 consultas, ele sera rebaixado para P3 (primeira faixa onde 30 >= 25).

---

Ultima atualizacao: Janeiro 2026
