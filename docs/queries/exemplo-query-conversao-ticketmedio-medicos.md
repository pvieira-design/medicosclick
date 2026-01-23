-- Taxa de Conversão Médicos - APENAS PRIMEIRA CONSULTA DO PACIENTE
-- Exclui consultas de recorrência para medir conversão real de novos leads
WITH primeira_consulta AS (
    -- Identifica apenas a primeira consulta de cada paciente
    SELECT 
        id,
        user_id,
        doctor_id,
        start,
        completed
    FROM (
        SELECT 
            id,
            user_id,
            doctor_id,
            start,
            completed,
            ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY start::timestamp) AS rn
        FROM consultings
        WHERE status NOT IN ('preconsulting', 'cancelled')
    ) c
    WHERE c.rn = 1
),
metricas_medico AS (
    SELECT 
        pc.doctor_id,
        d.name AS medico,
        
        -- Primeiras consultas realizadas no período
        COUNT(DISTINCT pc.id) FILTER (
            WHERE pc.completed = true 
            AND $__timeFilter(pc.start::timestamp)
        ) AS consultas_realizadas,
        
        -- Primeiras consultas que tiveram receita
        COUNT(DISTINCT CASE 
            WHEN mp.id IS NOT NULL 
            AND pc.completed = true 
            AND $__timeFilter(pc.start::timestamp)
            THEN pc.id 
        END) AS consultas_com_receita,
        
        -- Total de receitas (pode haver múltiplas por consulta)
        COUNT(DISTINCT mp.id) FILTER (
            WHERE pc.completed = true 
            AND $__timeFilter(pc.start::timestamp)
        ) AS total_receitas,
        
        -- Orçamentos pagos
        COUNT(DISTINCT pb.id) FILTER (
            WHERE pb.status = 'confirmed' 
            AND $__timeFilter(pc.start::timestamp)
        ) AS orcamentos_pagos,
        
        -- Faturamento
        COALESCE(SUM(pb.value) FILTER (
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
    
    -- Taxa de prescrição
    ROUND(consultas_com_receita::numeric * 100.0 / NULLIF(consultas_realizadas, 0), 1) || '%' AS taxa_prescricao,
    
    -- Taxa de conversão (leads que compraram)
    ROUND(orcamentos_pagos::numeric * 100.0 / NULLIF(consultas_com_receita, 0), 2) || '%' AS taxa_conversao,
    
    consultas_realizadas,
    consultas_com_receita,
    total_receitas,
    orcamentos_pagos,
    
    'R$ ' || TO_CHAR(faturamento::numeric, 'FM999G999G999D00') AS faturamento,
    
    COALESCE(
        'R$ ' || TO_CHAR(ROUND(faturamento / NULLIF(orcamentos_pagos, 0), 2)::numeric, 'FM999G999G999D00'),
        'R$ 0,00'
    ) AS ticket_medio

FROM metricas_medico
WHERE consultas_realizadas > 0
ORDER BY faturamento DESC;