SELECT 
    c.id AS consulting_id,
    c.doctor_id,
    c.user_id,
    c.status,
    
    -- Data e hora completa (fuso São Paulo)
    c.start::timestamp AT TIME ZONE 'America/Sao_Paulo' AS data_hora,
    
    -- Data separada
    (c.start::timestamp AT TIME ZONE 'America/Sao_Paulo')::date AS data,
    
    -- Hora separada (HH:MM)
    TO_CHAR(c.start::timestamp AT TIME ZONE 'America/Sao_Paulo', 'HH24:MI') AS hora,
    
    -- Formatos de data
    TO_CHAR(c.start::timestamp AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM-DD') AS data_iso,
    TO_CHAR(c.start::timestamp AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY') AS data_br,
    
    -- Dia da semana
    CASE EXTRACT(DOW FROM c.start::timestamp)
        WHEN 0 THEN 'DOM'
        WHEN 1 THEN 'SEG'
        WHEN 2 THEN 'TER'
        WHEN 3 THEN 'QUA'
        WHEN 4 THEN 'QUI'
        WHEN 5 THEN 'SEX'
        WHEN 6 THEN 'SAB'
    END AS dia_semana

FROM consultings c
WHERE c.doctor_id =  {{ $json.query.doctor_id }}                         -- Substituir pelo parâmetro
  AND c.status NOT IN ('preconsulting', 'cancelled')    -- Apenas consultas válidas
  AND c.start::timestamp >= NOW()                       -- Apenas consultas futuras
ORDER BY c.start::timestamp ASC