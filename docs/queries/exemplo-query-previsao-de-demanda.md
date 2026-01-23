-- ===============================================
-- QUERY CORRIGIDA V3: PREVISÃO DE DEMANDA + CAPACIDADE
-- ===============================================
-- PROBLEMAS CORRIGIDOS:
-- 1. ✅ Usa slots REAIS dos médicos (tabela doctors.schedule)
-- 2. ✅ Exclui AUTOMATICAMENTE outliers (dias < 50% do MÁXIMO do DOW)
-- 3. ✅ Usa 4 semanas recentes com peso maior para semanas recentes
-- 4. ✅ Calcula cobertura: agendadas / slots_totais
-- 5. ✅ Mostra range histórico (min/max) para contexto
-- 
-- VALIDAÇÃO (14/01/2026 - QUA):
-- - Real agendadas: 385
-- - Slots totais: 567
-- - Previsão corrigida: ~411 (vs 91 da query antiga com feriados)
-- ===============================================

WITH 
-- ==========================================================
-- CTE 1: MAPEAMENTO DIA DA SEMANA
-- ==========================================================
dias_semana_map AS (
    SELECT 
        unnest(ARRAY['DOM','SEG','TER','QUA','QUI','SEX','SAB']) AS dia_codigo,
        unnest(ARRAY[0,1,2,3,4,5,6]) AS dow
),

-- ==========================================================
-- CTE 2: CAPACIDADE ATUAL (SLOTS DOS MÉDICOS)
-- Calcula slots de 20 min a partir de doctors.schedule
-- ==========================================================
capacidade_atual AS (
    SELECT 
        dsm.dia_codigo,
        dsm.dow,
        COALESCE(SUM(
            (SELECT SUM(
                GREATEST(0, 
                    EXTRACT(EPOCH FROM (
                        (split_part(s.slot, '-', 2) || ':00')::time - 
                        (split_part(s.slot, '-', 1) || ':00')::time
                    )) / 60 / 20
                )::int
            )
            FROM jsonb_array_elements_text(d.schedule->dsm.dia_codigo) AS s(slot)
            WHERE s.slot ~ '^[0-9]{1,2}:[0-9]{2}-[0-9]{1,2}:[0-9]{2}$'
            )
        ), 0) AS slots_totais,
        COUNT(DISTINCT d.id) FILTER (WHERE d.schedule ? dsm.dia_codigo) AS medicos_ativos
    FROM dias_semana_map dsm
    LEFT JOIN doctors d ON d.schedule IS NOT NULL AND d.schedule ? dsm.dia_codigo
    GROUP BY dsm.dia_codigo, dsm.dow
),

-- ==========================================================
-- CTE 3: HISTÓRICO BRUTO (28 DIAS)
-- ==========================================================
historico_bruto AS (
    SELECT 
        EXTRACT(DOW FROM DATE(c.start::timestamp))::int AS dow,
        DATE(c.start::timestamp) AS data_consulta,
        COUNT(*) AS total_consultas
    FROM consultings c
    WHERE DATE(c.start::timestamp) >= CURRENT_DATE - 28
      AND DATE(c.start::timestamp) < CURRENT_DATE
      AND c.user_id IS NOT NULL
      AND c.status NOT IN ('preconsulting', 'cancelled')
    GROUP BY 1, 2
),

-- ==========================================================
-- CTE 4: ESTATÍSTICAS POR DIA DA SEMANA (para detectar outliers)
-- ==========================================================
stats_por_dow AS (
    SELECT 
        dow,
        AVG(total_consultas) AS media,
        MAX(total_consultas) AS maximo
    FROM historico_bruto
    GROUP BY dow
),

-- ==========================================================
-- CTE 5: HISTÓRICO FILTRADO (SEM OUTLIERS)
-- Remove dias com volume < 50% do MÁXIMO (feriados/anomalias)
-- ==========================================================
historico_filtrado AS (
    SELECT 
        hb.dow,
        hb.data_consulta,
        hb.total_consultas,
        -- Peso: semanas recentes têm mais peso (1.0 → 1.75)
        1.0 + (0.75 * (
            (hb.data_consulta - (CURRENT_DATE - 28))::float / 28
        )) AS peso
    FROM historico_bruto hb
    JOIN stats_por_dow s ON s.dow = hb.dow
    WHERE hb.total_consultas >= s.maximo * 0.5  -- Exclui outliers < 50% do máximo
),

-- ==========================================================
-- CTE 6: DEMANDA AGREGADA POR DIA DA SEMANA
-- ==========================================================
demanda_por_dow AS (
    SELECT 
        dow,
        COUNT(DISTINCT data_consulta) AS dias_contados,
        ROUND(SUM(total_consultas * peso) / NULLIF(SUM(peso), 0)) AS demanda_ponderada,
        ROUND(AVG(total_consultas)) AS demanda_media,
        MIN(total_consultas) AS historico_min,
        MAX(total_consultas) AS historico_max
    FROM historico_filtrado
    GROUP BY dow
),

-- ==========================================================
-- CTE 7: PRÓXIMOS 14 DIAS
-- ==========================================================
proximos_dias AS (
    SELECT generate_series(
        CURRENT_DATE,
        CURRENT_DATE + 13,
        '1 day'::interval
    )::date AS data
),

-- ==========================================================
-- CTE 8: CONSULTAS JÁ AGENDADAS
-- ==========================================================
agendadas_por_dia AS (
    SELECT 
        DATE(c.start::timestamp) AS data_consulta,
        COUNT(*) AS total_agendadas,
        COUNT(*) FILTER (WHERE EXTRACT(HOUR FROM c.start::timestamp) BETWEEN 8 AND 11) AS manha,
        COUNT(*) FILTER (WHERE EXTRACT(HOUR FROM c.start::timestamp) BETWEEN 12 AND 17) AS tarde,
        COUNT(*) FILTER (WHERE EXTRACT(HOUR FROM c.start::timestamp) >= 18) AS noite
    FROM consultings c
    WHERE DATE(c.start::timestamp) >= CURRENT_DATE
      AND DATE(c.start::timestamp) < CURRENT_DATE + 14
      AND c.user_id IS NOT NULL
      AND c.status NOT IN ('preconsulting', 'cancelled')
    GROUP BY 1
),

-- ==========================================================
-- CTE 9: RESULTADO FINAL COMBINADO
-- ==========================================================
resultado AS (
    SELECT 
        pd.data,
        CASE EXTRACT(DOW FROM pd.data)::int
            WHEN 0 THEN 'DOM' WHEN 1 THEN 'SEG' WHEN 2 THEN 'TER'
            WHEN 3 THEN 'QUA' WHEN 4 THEN 'QUI' WHEN 5 THEN 'SEX'
            WHEN 6 THEN 'SAB'
        END AS dia,
        EXTRACT(DOW FROM pd.data)::int AS dow,
        -- Semana
        CASE 
            WHEN pd.data <= CURRENT_DATE + (6 - EXTRACT(DOW FROM CURRENT_DATE)::int)
            THEN 'semana_atual'
            ELSE 'proxima_semana'
        END AS semana,
        -- Capacidade
        ca.slots_totais,
        ca.medicos_ativos,
        -- Demanda
        COALESCE(dpd.demanda_ponderada, 0) AS demanda_prevista,
        dpd.historico_min,
        dpd.historico_max,
        dpd.dias_contados,
        -- Agendadas
        COALESCE(apd.total_agendadas, 0) AS agendadas,
        COALESCE(apd.manha, 0) AS agendadas_manha,
        COALESCE(apd.tarde, 0) AS agendadas_tarde,
        COALESCE(apd.noite, 0) AS agendadas_noite,
        -- Métricas calculadas
        GREATEST(0, ca.slots_totais - COALESCE(apd.total_agendadas, 0)) AS slots_livres,
        CASE WHEN ca.slots_totais > 0 
            THEN ROUND(COALESCE(apd.total_agendadas, 0) * 100.0 / ca.slots_totais, 1)
            ELSE 0 
        END AS ocupacao_pct
    FROM proximos_dias pd
    LEFT JOIN capacidade_atual ca ON ca.dow = EXTRACT(DOW FROM pd.data)::int
    LEFT JOIN demanda_por_dow dpd ON dpd.dow = EXTRACT(DOW FROM pd.data)::int
    LEFT JOIN agendadas_por_dia apd ON apd.data_consulta = pd.data
)

-- ==========================================================
-- OUTPUT: JSON ESTRUTURADO
-- ==========================================================
SELECT json_build_object(
    'atualizado_em', NOW(),
    'metodologia', json_build_object(
        'periodo_historico', '28 dias',
        'filtro_outliers', 'Dias com volume < 50% do máximo são excluídos automaticamente',
        'ponderacao', 'Peso de 1.0 (mais antigo) até 1.75 (mais recente)'
    ),
    
    'semana_atual', json_build_object(
        'periodo', json_build_object(
            'inicio', (SELECT MIN(data) FROM resultado WHERE semana = 'semana_atual'),
            'fim', (SELECT MAX(data) FROM resultado WHERE semana = 'semana_atual')
        ),
        'totais', json_build_object(
            'slots_disponiveis', (SELECT SUM(slots_totais) FROM resultado WHERE semana = 'semana_atual'),
            'demanda_prevista', (SELECT SUM(demanda_prevista) FROM resultado WHERE semana = 'semana_atual'),
            'agendadas', (SELECT SUM(agendadas) FROM resultado WHERE semana = 'semana_atual'),
            'slots_livres', (SELECT SUM(slots_livres) FROM resultado WHERE semana = 'semana_atual'),
            'ocupacao_pct', ROUND(
                (SELECT SUM(agendadas) FROM resultado WHERE semana = 'semana_atual') * 100.0 / 
                NULLIF((SELECT SUM(slots_totais) FROM resultado WHERE semana = 'semana_atual'), 0), 1
            )
        ),
        'dias', (
            SELECT json_agg(json_build_object(
                'data', data,
                'dia', dia,
                'slots_totais', slots_totais,
                'medicos', medicos_ativos,
                'demanda_prevista', demanda_prevista,
                'hist_min', historico_min,
                'hist_max', historico_max,
                'agendadas', agendadas,
                'slots_livres', slots_livres,
                'ocupacao_pct', ocupacao_pct,
                'periodos', json_build_object('manha', agendadas_manha, 'tarde', agendadas_tarde, 'noite', agendadas_noite)
            ) ORDER BY data)
            FROM resultado WHERE semana = 'semana_atual'
        )
    ),
    
    'proxima_semana', json_build_object(
        'periodo', json_build_object(
            'inicio', (SELECT MIN(data) FROM resultado WHERE semana = 'proxima_semana'),
            'fim', (SELECT MAX(data) FROM resultado WHERE semana = 'proxima_semana')
        ),
        'totais', json_build_object(
            'slots_disponiveis', (SELECT SUM(slots_totais) FROM resultado WHERE semana = 'proxima_semana'),
            'demanda_prevista', (SELECT SUM(demanda_prevista) FROM resultado WHERE semana = 'proxima_semana'),
            'agendadas', (SELECT SUM(agendadas) FROM resultado WHERE semana = 'proxima_semana'),
            'slots_livres', (SELECT SUM(slots_livres) FROM resultado WHERE semana = 'proxima_semana'),
            'ocupacao_pct', ROUND(
                (SELECT SUM(agendadas) FROM resultado WHERE semana = 'proxima_semana') * 100.0 / 
                NULLIF((SELECT SUM(slots_totais) FROM resultado WHERE semana = 'proxima_semana'), 0), 1
            )
        ),
        'dias', (
            SELECT json_agg(json_build_object(
                'data', data,
                'dia', dia,
                'slots_totais', slots_totais,
                'medicos', medicos_ativos,
                'demanda_prevista', demanda_prevista,
                'hist_min', historico_min,
                'hist_max', historico_max,
                'agendadas', agendadas,
                'slots_livres', slots_livres,
                'ocupacao_pct', ocupacao_pct,
                'periodos', json_build_object('manha', agendadas_manha, 'tarde', agendadas_tarde, 'noite', agendadas_noite)
            ) ORDER BY data)
            FROM resultado WHERE semana = 'proxima_semana'
        )
    )
) AS previsao;