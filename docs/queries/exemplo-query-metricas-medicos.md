-- Parâmetro: $weeks (default: 8)
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
    WHERE c.start::timestamp >= NOW() - INTERVAL '{{ $json.query.weeks }} weeks'  -- Substituir por parâmetro
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
        END, 2
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
ORDER BY valor_total DESC