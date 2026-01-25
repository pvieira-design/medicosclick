import { Pool } from "pg";

const clickPool = new Pool({
  connectionString: process.env.CLICK_REPLICA_DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

export interface MedicoClick {
  doctor_id: number;
  user_id: number;
  email: string;
  name: string;
  phone: string | null;
  crm: string | null;
}

export interface ConsultaClick {
  id: number;
  doctor_id: number;
  completed: boolean;
  reason_for_cancellation: string | null;
  scheduled_at: Date;
  patient_name?: string;
  patient_id?: number;
}

export interface MetricasMedico {
  doctor_id: number;
  total_consultas: number;
  total_vendas: number;
  taxa_conversao: number;
  ticket_medio: number;
  valor_total: number;
}

/**
 * Métricas do médico baseadas apenas no PRIMEIRO LEAD de cada paciente.
 * Usada para cálculo de score e faixa (P1-P5).
 * 
 * Taxa de Conversão = orçamentos_pagos / consultas_com_receita
 * (Mede quantas receitas geraram venda, não consultas geraram venda)
 */
export interface MetricasMedicoPrimeiroLead {
  doctor_id: number;
  /** Total de consultas realizadas (primeiro lead + recorrência) - usado para validar consultasMinimas */
  total_consultas_realizadas: number;
  /** Apenas primeiras consultas de cada paciente */
  consultas_primeiro_paciente: number;
  /** Apenas consultas de recorrência (paciente já atendido antes) */
  consultas_recorrencia: number;
  /** Primeiras consultas que geraram receita médica */
  consultas_com_receita: number;
  /** Orçamentos pagos (vendas confirmadas) de primeiros leads */
  orcamentos_pagos: number;
  /** Taxa de conversão: orcamentos_pagos / consultas_com_receita */
  taxa_conversao: number;
  /** Ticket médio: faturamento / orcamentos_pagos */
  ticket_medio: number;
  /** Faturamento total (value + delivery_value) */
  faturamento: number;
}

export interface ConsultaAgendadaDetalhada {
  consulting_id: number;
  doctor_id: number;
  patient_id: number;
  patient_name: string | null;
  status: string;
  data_hora: Date;
  data: string;
  hora: string;
  data_br: string;
  dia_semana: string;
}

export interface ScheduleClick {
  doctor_id: number;
  schedule: Record<string, string[]> | null;
}

export interface HorarioParsed {
  diaSemana: string;
  horarioInicio: string;
  horarioFim: string;
}

export interface HorarioClick {
  dia_semana: string;
  horario_inicio: string;
  horario_fim: string;
}

export interface ProductClick {
  id: number;
  title: string;
  formula: string | null;
  type: string | null;
  volume: number | null;
  price: number;
}

async function query<T>(sql: string, params?: unknown[]): Promise<T[]> {
  const client = await clickPool.connect();
  try {
    const result = await client.query(sql, params);
    return result.rows as T[];
  } finally {
    client.release();
  }
}

export const clickQueries = {
   getMedicoById: (doctorId: number) =>
     query<MedicoClick>(
       `SELECT d.id as doctor_id, d.user_id, u.email, d.name, u.phone, d.crm
        FROM doctors d
        LEFT JOIN users u ON u.id = d.user_id
        WHERE d.id = $1`,
       [doctorId]
     ),

   searchDoctorsByName: (nome: string) =>
     query<MedicoClick>(
       `SELECT d.id as doctor_id, d.user_id, u.email, d.name, u.phone, d.crm
        FROM doctors d
        LEFT JOIN users u ON u.id = d.user_id
        WHERE d.name IS NOT NULL 
          AND d.name NOT ILIKE '%teste%'
          AND d.name NOT ILIKE '%test%'
          AND d.name ILIKE $1
        ORDER BY d.name
        LIMIT 20`,
       [`%${nome}%`]
     ),

  // Query para SINCRONIZACAO - traz todos os medicos (so exclui teste/sem nome)
  getTodosMedicos: () =>
    query<MedicoClick>(
      `SELECT d.id as doctor_id, d.user_id, u.email, d.name, u.phone, d.crm
       FROM doctors d
       LEFT JOIN users u ON u.id = d.user_id
       WHERE d.name IS NOT NULL 
         AND d.name NOT ILIKE '%teste%'
         AND d.name NOT ILIKE '%test%'
       ORDER BY d.name`
    ),

  // Query para CALCULO DE SCORE - apenas medicos ativos com agenda
  getMedicosAtivos: () =>
    query<MedicoClick>(
      `SELECT d.id as doctor_id, d.user_id, u.email, d.name, u.phone, d.crm
       FROM doctors d
       LEFT JOIN users u ON u.id = d.user_id
       WHERE d.name IS NOT NULL 
         AND d.name NOT ILIKE '%teste%'
         AND d.name NOT ILIKE '%test%'
         AND d.priority > 0
         AND d.schedule IS NOT NULL 
         AND d.schedule != '{}'
       ORDER BY d.name`
    ),

  getDiagnosticoMedicos: () =>
    query<{
      total_doctors: number;
      sem_nome: number;
      nome_teste: number;
      priority_zero_ou_negativo: number;
      sem_schedule: number;
      schedule_vazio: number;
      ativos_final: number;
    }>(
      `SELECT 
        (SELECT COUNT(*) FROM doctors) AS total_doctors,
        (SELECT COUNT(*) FROM doctors WHERE name IS NULL) AS sem_nome,
        (SELECT COUNT(*) FROM doctors WHERE name ILIKE '%teste%' OR name ILIKE '%test%') AS nome_teste,
        (SELECT COUNT(*) FROM doctors WHERE priority <= 0) AS priority_zero_ou_negativo,
        (SELECT COUNT(*) FROM doctors WHERE schedule IS NULL) AS sem_schedule,
        (SELECT COUNT(*) FROM doctors WHERE schedule = '{}') AS schedule_vazio,
        (SELECT COUNT(*) FROM doctors d
         WHERE d.name IS NOT NULL 
           AND d.name NOT ILIKE '%teste%'
           AND d.name NOT ILIKE '%test%'
           AND d.priority > 0
           AND d.schedule IS NOT NULL 
           AND d.schedule != '{}') AS ativos_final`
    ),

  getConsultasDoDia: (data: string) =>
    query<ConsultaClick>(
      `SELECT c.id, c.doctor_id, c.completed, c.reason_for_cancellation, 
              c.start::timestamptz AS scheduled_at
       FROM consultings c
       WHERE c.user_id IS NOT NULL
         AND c.negotiation_id IS NOT NULL
         AND c.status NOT IN ('preconsulting')
         AND DATE(c.start::timestamptz) = $1
       ORDER BY c.start::timestamptz`,
      [data]
    ),

  getConsultasMedico: (doctorId: number, dataInicio: string, dataFim: string) =>
    query<ConsultaClick>(
      `SELECT c.id, c.doctor_id, c.completed, c.reason_for_cancellation, 
              c.start::timestamptz AS scheduled_at, 
              TRIM(COALESCE(u.first_name, '') || ' ' || COALESCE(u.last_name, '')) AS patient_name,
              c.user_id AS patient_id
       FROM consultings c
       LEFT JOIN users u ON u.id = c.user_id
       WHERE c.doctor_id = $1 
         AND c.user_id IS NOT NULL
         AND c.negotiation_id IS NOT NULL
         AND c.status NOT IN ('preconsulting')
         AND DATE(c.start::timestamptz) BETWEEN $2 AND $3
       ORDER BY c.start::timestamptz`,
      [doctorId, dataInicio, dataFim]
    ),

  getProximasConsultasMedico: (doctorId: number, limite: number = 20) =>
    query<ConsultaClick>(
      `SELECT c.id, 
              c.start::timestamptz AS scheduled_at, 
              TRIM(COALESCE(u.first_name, '') || ' ' || COALESCE(u.last_name, '')) AS patient_name, 
              c.user_id AS patient_id, 
              c.completed
       FROM consultings c
       LEFT JOIN users u ON u.id = c.user_id
       WHERE c.doctor_id = $1
         AND c.user_id IS NOT NULL
         AND c.negotiation_id IS NOT NULL
         AND c.status IN ('confirmed', 'reschudeled')
         AND c.start::timestamptz >= NOW()
         AND (c.completed = false OR c.completed IS NULL)
         AND c.reason_for_cancellation IS NULL
       ORDER BY c.start::timestamptz
       LIMIT $2`,
      [doctorId, limite]
    ),

  temConsultaNoHorario: async (doctorId: number, diaSemana: number, horario: string) => {
    const result = await query<{ count: string }>(
      `SELECT COUNT(*) as count
       FROM consultings c
       WHERE c.doctor_id = $1
         AND c.user_id IS NOT NULL
         AND c.negotiation_id IS NOT NULL
         AND c.status IN ('confirmed', 'reschudeled')
         AND EXTRACT(DOW FROM c.start::timestamptz) = $2
         AND TO_CHAR(c.start::timestamptz, 'HH24:MI') = $3
         AND c.start::timestamptz >= NOW()
         AND (c.completed = false OR c.completed IS NULL)
         AND c.reason_for_cancellation IS NULL`,
      [doctorId, diaSemana, horario]
    );
    return parseInt(result[0]?.count || "0") > 0;
  },

  /**
   * Busca metricas de um medico especifico
   * Taxa de conversao = vendas confirmadas / consultas completadas
   * Ticket medio = valor total vendido / numero de vendas
   */
  getMetricasMedico: (doctorId: number, semanas: number = 8) =>
    query<MetricasMedico>(
      `WITH metricas AS (
        SELECT 
          c.doctor_id,
          COUNT(DISTINCT c.id) AS total_consultas,
          COUNT(DISTINCT CASE WHEN pb.status = 'confirmed' THEN pb.id END) AS total_vendas,
          COALESCE(SUM(CASE WHEN pb.status = 'confirmed' THEN pb.value + COALESCE(pb.delivery_value, 0) END), 0) AS valor_total
        FROM consultings c
        LEFT JOIN medical_prescriptions mp ON mp.consulting_id = c.id
        LEFT JOIN product_budgets pb ON pb.medical_prescription_id = mp.id
        WHERE c.doctor_id = $1
          AND c.user_id IS NOT NULL
          AND c.negotiation_id IS NOT NULL
          AND c.start::timestamptz >= NOW() - INTERVAL '${semanas} weeks'
          AND c.status NOT IN ('preconsulting', 'cancelled')
          AND c.completed = TRUE
        GROUP BY c.doctor_id
      )
      SELECT 
        doctor_id,
        total_consultas::int,
        total_vendas::int,
        ROUND(CASE WHEN total_consultas > 0 THEN total_vendas::numeric / total_consultas ELSE 0 END, 4)::float AS taxa_conversao,
        ROUND(CASE WHEN total_vendas > 0 THEN valor_total / total_vendas ELSE 0 END, 2)::float AS ticket_medio,
        ROUND(valor_total, 2)::float AS valor_total
      FROM metricas`,
      [doctorId]
    ),

  getMetricasTodosMedicos: (semanas: number = 8) =>
    query<MetricasMedico>(
      `WITH metricas AS (
        SELECT 
          c.doctor_id,
          COUNT(DISTINCT c.id) AS total_consultas,
          COUNT(DISTINCT CASE WHEN pb.status = 'confirmed' THEN pb.id END) AS total_vendas,
          COALESCE(SUM(CASE WHEN pb.status = 'confirmed' THEN pb.value + COALESCE(pb.delivery_value, 0) END), 0) AS valor_total
        FROM consultings c
        LEFT JOIN medical_prescriptions mp ON mp.consulting_id = c.id
        LEFT JOIN product_budgets pb ON pb.medical_prescription_id = mp.id
        WHERE c.user_id IS NOT NULL
          AND c.negotiation_id IS NOT NULL
          AND c.start::timestamptz >= NOW() - INTERVAL '${semanas} weeks'
          AND c.status NOT IN ('preconsulting', 'cancelled')
          AND c.completed = TRUE
        GROUP BY c.doctor_id
      )
      SELECT 
        doctor_id,
        total_consultas::int,
        total_vendas::int,
        ROUND(CASE WHEN total_consultas > 0 THEN total_vendas::numeric / total_consultas ELSE 0 END, 4)::float AS taxa_conversao,
        ROUND(CASE WHEN total_vendas > 0 THEN valor_total / total_vendas ELSE 0 END, 2)::float AS ticket_medio,
        ROUND(valor_total, 2)::float AS valor_total
      FROM metricas
      WHERE total_consultas > 0
      ORDER BY valor_total DESC`
    ),

  getMetricasMedicoPrimeiroLead: (doctorId: number, semanas: number = 8) =>
    query<MetricasMedicoPrimeiroLead>(
      `WITH consultas_classificadas AS (
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
        WHERE pc.doctor_id = $1
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
      FROM metricas`,
      [doctorId]
    ),

  getMetricasTodosMedicosPrimeiroLead: (semanas: number = 8) =>
    query<MetricasMedicoPrimeiroLead>(
      `WITH consultas_classificadas AS (
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
      ORDER BY faturamento DESC`
    ),

  getConsultasAgendadasDetalhada: (doctorId: number, limite: number = 50) =>
    query<ConsultaAgendadaDetalhada>(
      `SELECT 
        c.id AS consulting_id,
        c.doctor_id,
        c.user_id AS patient_id,
        CONCAT(u.first_name, ' ', u.last_name) AS patient_name,
        c.status,
        c.start::timestamptz AT TIME ZONE 'America/Sao_Paulo' AS data_hora,
        (c.start::timestamptz AT TIME ZONE 'America/Sao_Paulo')::date::text AS data,
        TO_CHAR(c.start::timestamptz AT TIME ZONE 'America/Sao_Paulo', 'HH24:MI') AS hora,
        TO_CHAR(c.start::timestamptz AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY') AS data_br,
        CASE EXTRACT(DOW FROM c.start::timestamptz)
          WHEN 0 THEN 'dom'
          WHEN 1 THEN 'seg'
          WHEN 2 THEN 'ter'
          WHEN 3 THEN 'qua'
          WHEN 4 THEN 'qui'
          WHEN 5 THEN 'sex'
          WHEN 6 THEN 'sab'
        END AS dia_semana
      FROM consultings c
      LEFT JOIN users u ON u.id = c.user_id
      WHERE c.doctor_id = $1
        AND c.user_id IS NOT NULL
        AND c.negotiation_id IS NOT NULL
        AND c.status IN ('confirmed', 'reschudeled')
        AND c.start::timestamptz >= NOW()
      ORDER BY c.start::timestamptz ASC
      LIMIT $2`,
      [doctorId, limite]
    ),

  getScheduleMedicoClick: (doctorId: number) =>
    query<ScheduleClick>(
      `SELECT 
        d.id AS doctor_id,
        d.schedule
      FROM doctors d
      WHERE d.id = $1`,
      [doctorId]
    ),

  getSlotsComConsulta: (doctorId: number) =>
    query<{ dia_semana: string; hora: string }>(
      `SELECT DISTINCT
        CASE EXTRACT(DOW FROM c.start::timestamptz)
          WHEN 0 THEN 'dom'
          WHEN 1 THEN 'seg'
          WHEN 2 THEN 'ter'
          WHEN 3 THEN 'qua'
          WHEN 4 THEN 'qui'
          WHEN 5 THEN 'sex'
          WHEN 6 THEN 'sab'
        END AS dia_semana,
        TO_CHAR(c.start::timestamptz AT TIME ZONE 'America/Sao_Paulo', 'HH24:MI') AS hora
      FROM consultings c
      WHERE c.doctor_id = $1
        AND c.user_id IS NOT NULL
        AND c.negotiation_id IS NOT NULL
        AND c.status IN ('confirmed', 'reschudeled')
        AND c.start::timestamptz >= NOW()`,
      [doctorId]
    ),

  getSlotsComConsultaProximosDias: (doctorId: number, dias: number = 3) =>
    query<{ dia_semana: string; hora: string; data: string }>(
      `SELECT DISTINCT
        CASE EXTRACT(DOW FROM c.start::timestamptz)
          WHEN 0 THEN 'dom'
          WHEN 1 THEN 'seg'
          WHEN 2 THEN 'ter'
          WHEN 3 THEN 'qua'
          WHEN 4 THEN 'qui'
          WHEN 5 THEN 'sex'
          WHEN 6 THEN 'sab'
        END AS dia_semana,
        TO_CHAR(c.start::timestamptz AT TIME ZONE 'America/Sao_Paulo', 'HH24:MI') AS hora,
        TO_CHAR(c.start::timestamptz AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM-DD') AS data
      FROM consultings c
      WHERE c.doctor_id = $1
        AND c.user_id IS NOT NULL
        AND c.negotiation_id IS NOT NULL
        AND c.status IN ('confirmed', 'reschudeled')
        AND DATE(c.start::timestamptz AT TIME ZONE 'America/Sao_Paulo') >= CURRENT_DATE
        AND DATE(c.start::timestamptz AT TIME ZONE 'America/Sao_Paulo') < CURRENT_DATE + INTERVAL '1 day' * $2`,
      [doctorId, dias]
    ),

  getResumoConsultasMedico: (doctorId: number, dataInicio: string, dataFim: string) =>
    query<ResumoConsultasMedico>(
      `WITH consultas AS (
        SELECT 
          c.id,
          c.completed,
          c.reason_for_cancellation,
          c.meet_data
        FROM consultings c
        WHERE c.doctor_id = $1
          AND c.user_id IS NOT NULL
          AND c.negotiation_id IS NOT NULL
          AND c.status NOT IN ('preconsulting')
          AND DATE(c.start::timestamptz) BETWEEN $2::date AND $3::date
      ),
      receitas AS (
        SELECT COUNT(DISTINCT mp.id) AS total_receitas
        FROM consultings c
        JOIN medical_prescriptions mp ON mp.consulting_id = c.id
        WHERE c.doctor_id = $1
          AND c.user_id IS NOT NULL
          AND c.negotiation_id IS NOT NULL
          AND c.status NOT IN ('preconsulting')
          AND DATE(c.start::timestamptz) BETWEEN $2::date AND $3::date
          AND c.completed = TRUE
      ),
      vendas AS (
        SELECT COUNT(DISTINCT pb.id) AS total_vendas
        FROM consultings c
        JOIN medical_prescriptions mp ON mp.consulting_id = c.id
        JOIN product_budgets pb ON pb.medical_prescription_id = mp.id AND pb.status = 'confirmed'
        WHERE c.doctor_id = $1
          AND c.user_id IS NOT NULL
          AND c.negotiation_id IS NOT NULL
          AND c.status NOT IN ('preconsulting')
          AND DATE(c.start::timestamptz) BETWEEN $2::date AND $3::date
          AND c.completed = TRUE
      ),
      tempo_medio AS (
        SELECT ROUND(AVG(duracao_segundos) / 60.0, 1) AS minutos
        FROM (
          SELECT c.id,
            (SELECT MAX((r->>'start_timestamp_seconds')::bigint + (r->>'duration_seconds')::int)
             FROM jsonb_array_elements(c.meet_data->'registros') r
             WHERE NOT (LOWER(r->>'display_name') LIKE '%notetaker%' 
                    OR LOWER(r->>'display_name') LIKE '%read.ai%'
                    OR LOWER(r->>'display_name') LIKE '%fireflies%')
            ) - 
            (SELECT MIN((r->>'start_timestamp_seconds')::bigint)
             FROM jsonb_array_elements(c.meet_data->'registros') r
             WHERE NOT (LOWER(r->>'display_name') LIKE '%notetaker%' 
                    OR LOWER(r->>'display_name') LIKE '%read.ai%'
                    OR LOWER(r->>'display_name') LIKE '%fireflies%')
            ) AS duracao_segundos
          FROM consultas c
          WHERE c.meet_data IS NOT NULL 
            AND c.meet_data->'registros' IS NOT NULL
            AND c.completed = TRUE
        ) sub
        WHERE duracao_segundos > 0 AND duracao_segundos < 7200
      )
      SELECT 
        COUNT(*)::int AS total_agendadas,
        COUNT(CASE WHEN completed = TRUE THEN 1 END)::int AS total_realizadas,
        COUNT(CASE WHEN completed = FALSE OR reason_for_cancellation IS NOT NULL THEN 1 END)::int AS total_nao_realizadas,
        COALESCE(ROUND(
          CASE WHEN COUNT(*) > 0 
            THEN COUNT(CASE WHEN completed = TRUE THEN 1 END)::numeric / COUNT(*) * 100 
            ELSE 0 
          END, 1
        ), 0)::float AS taxa_comparecimento,
        COALESCE(ROUND(
          CASE WHEN (SELECT total_receitas FROM receitas) > 0 
            THEN (SELECT total_vendas FROM vendas)::numeric / (SELECT total_receitas FROM receitas) * 100 
            ELSE 0 
          END, 1
        ), 0)::float AS taxa_conversao,
        COALESCE((SELECT minutos FROM tempo_medio), 20)::float AS tempo_medio_consulta_minutos
      FROM consultas`,
      [doctorId, dataInicio, dataFim]
    ),

  getDistribuicaoMotivosNaoRealizadas: (doctorId: number, dataInicio: string, dataFim: string) =>
    query<MotivoNaoRealizada>(
      `WITH motivos AS (
        SELECT 
          COALESCE(NULLIF(TRIM(c.reason_for_cancellation), ''), 'Nao informado') AS motivo,
          COUNT(*) AS quantidade
        FROM consultings c
        WHERE c.doctor_id = $1
          AND c.user_id IS NOT NULL
          AND c.negotiation_id IS NOT NULL
          AND c.status NOT IN ('preconsulting')
          AND DATE(c.start::timestamptz) BETWEEN $2::date AND $3::date
          AND (c.completed = FALSE OR c.reason_for_cancellation IS NOT NULL)
        GROUP BY COALESCE(NULLIF(TRIM(c.reason_for_cancellation), ''), 'Nao informado')
      ),
      total AS (
        SELECT COALESCE(SUM(quantidade), 0) AS total FROM motivos
      )
      SELECT 
        motivo,
        quantidade::int,
        COALESCE(ROUND(quantidade::numeric / NULLIF((SELECT total FROM total), 0) * 100, 1), 0)::float AS percentual
      FROM motivos
      ORDER BY quantidade DESC
      LIMIT 10`,
      [doctorId, dataInicio, dataFim]
    ),

  getEvolucaoHistorica: (doctorId: number, dias: number = 30) =>
    query<EvolucaoHistorica>(
      `SELECT 
        TO_CHAR(DATE(c.start::timestamptz), 'YYYY-MM-DD') AS data,
        COUNT(*)::int AS agendadas,
        COUNT(CASE WHEN c.completed = TRUE THEN 1 END)::int AS realizadas,
        COALESCE(ROUND(
          CASE WHEN COUNT(*) > 0 
            THEN COUNT(CASE WHEN c.completed = TRUE THEN 1 END)::numeric / COUNT(*) * 100 
            ELSE 0 
          END, 1
        ), 0)::float AS taxa_comparecimento
      FROM consultings c
      WHERE c.doctor_id = $1
        AND c.user_id IS NOT NULL
        AND c.negotiation_id IS NOT NULL
        AND c.status NOT IN ('preconsulting')
        AND DATE(c.start::timestamptz) >= CURRENT_DATE - INTERVAL '1 day' * $2
        AND DATE(c.start::timestamptz) <= CURRENT_DATE
      GROUP BY DATE(c.start::timestamptz)
      ORDER BY DATE(c.start::timestamptz) ASC`,
      [doctorId, dias]
    ),

  // ============================================================================
  // ANALYTICS DASHBOARD
  // ============================================================================

  /**
   * Total de consultas agendadas em um período
   * Exclui: slots vazios (user_id NULL) e status preconsulting
   * @param horaLimite - Se informado (formato HH:MM), filtra apenas consultas com horário <= hora limite
   *                     Usado para comparação justa entre períodos (ex: hoje até 15h vs ontem até 15h)
   */
  getTotalConsultasAgendadas: (dataInicio: string, dataFim: string, usarFiltroHora: boolean = false) =>
    query<{ total_agendadas: number }>(
      `SELECT COUNT(*)::int AS total_agendadas
       FROM consultings
       WHERE start::timestamptz AT TIME ZONE 'America/Sao_Paulo' >= $1::date
         AND start::timestamptz AT TIME ZONE 'America/Sao_Paulo' < ($2::date + INTERVAL '1 day')
         AND user_id IS NOT NULL
         AND status NOT IN ('preconsulting')
         AND (event_id NOT LIKE 'external%' OR event_id IS NULL)
         AND (
           $3::boolean = false 
           OR (start::timestamptz AT TIME ZONE 'America/Sao_Paulo')::time <= (NOW() AT TIME ZONE 'America/Sao_Paulo')::time
         )`,
      [dataInicio, dataFim, usarFiltroHora]
    ),

  getTotalConsultasRealizadas: (dataInicio: string, dataFim: string, usarFiltroHora: boolean = false) =>
    query<{ total_realizadas: number }>(
      `SELECT COUNT(*)::int AS total_realizadas
       FROM consultings
       WHERE start::timestamptz AT TIME ZONE 'America/Sao_Paulo' >= $1::date
         AND start::timestamptz AT TIME ZONE 'America/Sao_Paulo' < ($2::date + INTERVAL '1 day')
         AND completed = TRUE
         AND status NOT IN ('preconsulting', 'cancelled')
         AND (event_id NOT LIKE 'external%' OR event_id IS NULL)
         AND (
           $3::boolean = false 
           OR (start::timestamptz AT TIME ZONE 'America/Sao_Paulo')::time <= (NOW() AT TIME ZONE 'America/Sao_Paulo')::time
         )`,
      [dataInicio, dataFim, usarFiltroHora]
    ),

  getTotalConsultasCanceladas: (dataInicio: string, dataFim: string, usarFiltroHora: boolean = false) =>
    query<{ total_canceladas: number }>(
      `SELECT COUNT(*)::int AS total_canceladas
       FROM consultings
       WHERE start::timestamptz AT TIME ZONE 'America/Sao_Paulo' >= $1::date
         AND start::timestamptz AT TIME ZONE 'America/Sao_Paulo' < ($2::date + INTERVAL '1 day')
         AND user_id IS NOT NULL
         AND negotiation_id IS NOT NULL
         AND status = 'cancelled'
         AND (event_id NOT LIKE 'external%' OR event_id IS NULL)
         AND (
           $3::boolean = false 
           OR (start::timestamptz AT TIME ZONE 'America/Sao_Paulo')::time <= (NOW() AT TIME ZONE 'America/Sao_Paulo')::time
         )`,
      [dataInicio, dataFim, usarFiltroHora]
    ),

  getTotalMedicosAtendendo: (dataInicio: string, dataFim: string, usarFiltroHora: boolean = false) =>
    query<{ total_medicos: number }>(
      `SELECT COUNT(DISTINCT c.doctor_id)::int AS total_medicos
       FROM consultings c
       WHERE c.start::timestamptz AT TIME ZONE 'America/Sao_Paulo' >= $1::date
         AND c.start::timestamptz AT TIME ZONE 'America/Sao_Paulo' < ($2::date + INTERVAL '1 day')
         AND c.user_id IS NOT NULL
         AND c.negotiation_id IS NOT NULL
         AND c.status NOT IN ('preconsulting', 'cancelled')
         AND (c.event_id NOT LIKE 'external%' OR c.event_id IS NULL)
         AND (
           $3::boolean = false 
           OR (c.start::timestamptz AT TIME ZONE 'America/Sao_Paulo')::time <= (NOW() AT TIME ZONE 'America/Sao_Paulo')::time
         )`,
      [dataInicio, dataFim, usarFiltroHora]
    ),

  getConsultasPorHorario: (dataInicio: string, dataFim: string) =>
    query<{ hora: string; total: number }>(
      `SELECT 
         to_char(
           date_trunc('hour', start::timestamptz AT TIME ZONE 'America/Sao_Paulo') + 
           (FLOOR(EXTRACT(MINUTE FROM start::timestamptz AT TIME ZONE 'America/Sao_Paulo') / 20) * INTERVAL '20 minutes'),
           'HH24:MI'
         ) AS hora,
         COUNT(*)::int AS total
       FROM consultings
       WHERE start::timestamptz AT TIME ZONE 'America/Sao_Paulo' >= $1::date
         AND start::timestamptz AT TIME ZONE 'America/Sao_Paulo' < ($2::date + INTERVAL '1 day')
         AND user_id IS NOT NULL
         AND status NOT IN ('preconsulting')
         AND (event_id NOT LIKE 'external%' OR event_id IS NULL)
       GROUP BY hora
       ORDER BY hora`,
      [dataInicio, dataFim]
    ),

  // ============================================================================
  // PRIORIDADES DOS MÉDICOS
  // ============================================================================

  getPrioridadesMedicos: () =>
    query<{ doctor_id: number; priority: number }>(
      `SELECT d.id AS doctor_id, COALESCE(d.priority, 0)::int AS priority
       FROM doctors d
       WHERE d.name IS NOT NULL 
         AND d.name NOT ILIKE '%teste%'
         AND d.name NOT ILIKE '%test%'
       ORDER BY d.id`
    ),

   getPrioridadeMedico: (doctorId: number) =>
     query<{ doctor_id: number; priority: number }>(
       `SELECT d.id AS doctor_id, COALESCE(d.priority, 0)::int AS priority
        FROM doctors d
        WHERE d.id = $1`,
       [doctorId]
     ),

   buscarProdutos: () =>
     query<ProductClick>(
       `SELECT 
         p.id,
         p.title,
         p.formula,
         p.type,
         p.volume,
         p.price
        FROM products p
        WHERE p.quantity > 0
          AND p.price > 0
        ORDER BY p.title ASC`
     ),

   buscarConsultasRecentesMedico: (doctorId: number, limite: number = 20) =>
     query<{
       id: number;
       doctor_id: number;
       user_id: number | null;
       patient_name: string | null;
       start: string;
       completed: boolean;
     }>(
       `SELECT 
         c.id,
         c.doctor_id,
         c.user_id,
         TRIM(COALESCE(u.first_name, '') || ' ' || COALESCE(u.last_name, '')) AS patient_name,
         c.start,
         c.completed
        FROM consultings c
        LEFT JOIN users u ON u.id = c.user_id
        WHERE c.doctor_id = $1
          AND c.user_id IS NOT NULL
          AND c.completed = TRUE
        ORDER BY c.start DESC
        LIMIT $2`,
       [doctorId, limite]
     ),

   /**
    * Busca dados de anamnese para uma consulta específica
    * 
    * Estrutura do campo `data` (JSONB):
    * Array de objetos com a seguinte estrutura:
    * [
    *   {
    *     "question": "Nome completo do paciente",
    *     "answer": "Maria Silva" | ["Opção 1", "Opção 2"] | true | 123
    *   },
    *   {
    *     "question": "Gênero do paciente",
    *     "answer": "Gênero Feminino"
    *   },
    *   ...
    * ]
    * 
    * Campos importantes encontrados:
    * - "Nome completo do paciente" → string
    * - "Gênero do paciente" → string (ex: "Gênero Feminino")
    * - "Data de nascimento" → string (formato YYYY-MM-DD)
    * - "Peso do paciente" → number
    * - "Altura do paciente" → number
    * - "Já usou ou faz uso de Cannabis?" → string
    * - "Você possui alguma condição clínica?" → array de strings
    * - "Possui algum problema de saúde?" → string
    * - "Você tem alergias?" → string
    * - "Você usa medicamentos ou suplementos diariamente?" → string
    * - "Quantas vezes por semana você faz atividade física?" → string
    * - "Você ingere frutas e hortaliças diariamente?" → boolean
    * - "Como considera a qualidade do seu sono?" → string
    * - "Quantas horas costuma dormir por dia?" → string
    * - "Por que você está buscando a cannabis medicinal?" → string
    * - "Onde conheceu a Click Cannabis?" → string
    * - "Quem está preenchendo o formulário?" → string
    * - "Nome do representante legal" → string
    * - "Grau de parentesco" → string
    * 
    * Nota: O campo `answer` pode ser string, number, boolean ou array dependendo do tipo de pergunta.
    */
   buscarDadosAnamnese: (consultingId: number) =>
     query<{ data: Record<string, unknown> | null }>(
       `SELECT a.data
        FROM anamnese a
        WHERE a.consulting_id = $1`,
       [consultingId]
     ),

   buscarDadosPaciente: (userId: number) =>
     query<{ first_name: string | null; last_name: string | null }>(
       `SELECT 
         u.first_name,
         u.last_name
        FROM users u
        WHERE u.id = $1`,
       [userId]
     ),
};

/**
 * Converte o campo office_hours do Click para formato estruturado
 * office_hours no Click: { "SEG": ["08:00-12:00", "14:00-18:00"], ... }
 */
export function parseOfficeHours(officeHours: Record<string, string[]> | null): HorarioParsed[] {
  if (!officeHours) return [];
  
  const diaMap: Record<string, string> = {
    DOM: "dom", SEG: "seg", TER: "ter", QUA: "qua",
    QUI: "qui", SEX: "sex", SAB: "sab",
  };
  
  const resultado: HorarioParsed[] = [];
  
  for (const [dia, blocos] of Object.entries(officeHours)) {
    const diaSemana = diaMap[dia];
    if (!diaSemana || !Array.isArray(blocos)) continue;
    
    for (const bloco of blocos) {
      const [inicio, fim] = bloco.split("-");
      if (inicio && fim) {
        resultado.push({
          diaSemana,
          horarioInicio: inicio,
          horarioFim: fim,
        });
      }
    }
  }
  
  return resultado;
}

export { clickPool };

export async function closeClickConnection() {
  await clickPool.end();
}

export interface SlotExpandido {
  diaSemana: "dom" | "seg" | "ter" | "qua" | "qui" | "sex" | "sab";
  horario: string;
}

// ============================================================================
// DASHBOARD MÉDICO - Interfaces
// ============================================================================

export interface ResumoConsultasMedico {
  total_agendadas: number;
  total_realizadas: number;
  total_nao_realizadas: number;
  taxa_comparecimento: number;
  taxa_conversao: number;
  tempo_medio_consulta_minutos: number | null;
}

export interface MotivoNaoRealizada {
  motivo: string;
  quantidade: number;
  percentual: number;
}

export interface EvolucaoHistorica {
  data: string;
  agendadas: number;
  realizadas: number;
  taxa_comparecimento: number;
}

/**
 * Converte o campo schedule do Click para slots de 20 minutos
 * schedule no Click: { "SEG": ["08:00-12:00", "14:00-18:00"], ... }
 * Retorna: [{ diaSemana: "seg", horario: "08:00" }, { diaSemana: "seg", horario: "08:20" }, ...]
 */
export function expandirScheduleParaSlots(schedule: Record<string, string[]> | null): SlotExpandido[] {
  if (!schedule) return [];
  
  const diaMap: Record<string, SlotExpandido["diaSemana"]> = {
    DOM: "dom", SEG: "seg", TER: "ter", QUA: "qua",
    QUI: "qui", SEX: "sex", SAB: "sab",
  };
  
  const slots: SlotExpandido[] = [];
  
  for (const [dia, blocos] of Object.entries(schedule)) {
    const diaSemana = diaMap[dia];
    if (!diaSemana || !Array.isArray(blocos)) continue;
    
    for (const bloco of blocos) {
      const [inicioStr, fimStr] = bloco.split("-");
      if (!inicioStr || !fimStr) continue;
      
      const [inicioH, inicioM] = inicioStr.split(":").map(Number);
      const [fimH, fimM] = fimStr.split(":").map(Number);
      
      let minutoAtual = (inicioH ?? 0) * 60 + (inicioM ?? 0);
      const minutoFim = (fimH ?? 0) * 60 + (fimM ?? 0);
      
      while (minutoAtual < minutoFim) {
        const hora = Math.floor(minutoAtual / 60);
        const minuto = minutoAtual % 60;
        const horario = `${hora.toString().padStart(2, "0")}:${minuto.toString().padStart(2, "0")}`;
        
        slots.push({ diaSemana, horario });
        minutoAtual += 20; // Intervalo de 20 minutos
      }
    }
  }
  
  return slots;
}
