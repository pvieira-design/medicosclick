WITH schedule_expanded AS (
    SELECT 
        d.id AS doctor_id,
        d.name AS doctor_name,
        d.crm,
        day_key.key AS dia_semana,
        
        -- Número do dia (0=DOM, 1=SEG, ..., 6=SAB)
        CASE day_key.key
            WHEN 'DOM' THEN 0
            WHEN 'SEG' THEN 1
            WHEN 'TER' THEN 2
            WHEN 'QUA' THEN 3
            WHEN 'QUI' THEN 4
            WHEN 'SEX' THEN 5
            WHEN 'SAB' THEN 6
        END AS dia_numero,
        
        jsonb_array_elements_text(day_key.value) AS horario
        
    FROM doctors d,
         jsonb_each(d.schedule) AS day_key
    WHERE d.id = {{ $json.query.doctor_id }}  -- Substituir pelo parâmetro
)
SELECT 
    doctor_id,
    doctor_name,
    crm,
    dia_semana,
    dia_numero,
    horario,
    SPLIT_PART(horario, '-', 1) AS hora_inicio,
    SPLIT_PART(horario, '-', 2) AS hora_fim
FROM schedule_expanded
ORDER BY dia_numero, hora_inicio