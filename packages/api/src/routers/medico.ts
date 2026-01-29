import { z } from "zod";
import prisma from "@clickmedicos/db";
import { 
  clickQueries, 
  expandirScheduleParaSlots,
  type ResumoConsultasMedico,
  type MotivoNaoRealizada,
  type EvolucaoHistorica,
  type ConsultaClick,
} from "@clickmedicos/db/click-replica";
import { router, medicoProcedure, staffProcedure, diretorProcedure, adminProcedure } from "../index";
import { calcularScoreMedico, recalcularTodosScores, getScoreConfig } from "../services/score.service";
import { TRPCError } from "@trpc/server";

export const medicoRouter = router({
  meuPerfil: medicoProcedure.query(async ({ ctx }) => {
    const medico = await prisma.user.findUnique({
      where: { id: ctx.medico.id },
      include: { config: true },
    });

    return {
      id: medico?.id,
      name: medico?.name,
      email: medico?.email,
      faixa: medico?.faixa,
      score: medico?.score,
      strikes: medico?.strikes,
      config: medico?.config,
    };
  }),

  meusHorarios: medicoProcedure.query(async ({ ctx }) => {
    return prisma.medicoHorario.findMany({
      where: {
        medicoId: ctx.medico.id,
        ativo: true,
      },
      orderBy: [{ diaSemana: "asc" }, { horario: "asc" }],
    });
  }),

  proximasConsultas: medicoProcedure
    .input(z.object({ limite: z.number().min(1).max(50).default(20) }))
    .query(async ({ ctx, input }) => {
      if (!ctx.medico.clickDoctorId) {
        return [];
      }
      try {
        return await clickQueries.getProximasConsultasMedico(ctx.medico.clickDoctorId, input.limite);
      } catch (error) {
        console.error("[proximasConsultas] Erro ao buscar consultas:", error);
        return [];
      }
    }),

  minhasMetricas: medicoProcedure.query(async ({ ctx }) => {
    const [config, user] = await Promise.all([
      prisma.medicoConfig.findUnique({ where: { medicoId: ctx.medico.id } }),
      prisma.user.findUnique({ where: { id: ctx.medico.id }, select: { score: true, faixa: true } }),
    ]);

    return {
      totalConsultas: config?.totalConsultas ?? 0,
      strikes: ctx.medico.strikes ?? 0,
      faixa: user?.faixa ?? ctx.medico.faixa,
      score: Number(user?.score ?? 0),
    };
  }),

  minhasSolicitacoes: medicoProcedure
    .input(
      z.object({
        status: z.enum(["pendente", "aprovada", "rejeitada"]).optional(),
        page: z.number().min(1).default(1),
        perPage: z.number().min(1).max(50).default(10),
      })
    )
    .query(async ({ ctx, input }) => {
      const where = {
        medicoId: ctx.medico.id,
        ...(input.status && { status: input.status }),
      };

      const [solicitacoes, total] = await Promise.all([
        prisma.solicitacao.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip: (input.page - 1) * input.perPage,
          take: input.perPage,
          include: {
            aprovadoPor: {
              select: { name: true },
            },
          },
        }),
        prisma.solicitacao.count({ where }),
      ]);

      return {
        solicitacoes,
        total,
        pages: Math.ceil(total / input.perPage),
      };
    }),

  meusCancelamentos: medicoProcedure
    .input(
      z.object({
        status: z.enum(["pendente", "aprovado", "rejeitado"]).optional(),
        page: z.number().min(1).default(1),
        perPage: z.number().min(1).max(50).default(10),
      })
    )
    .query(async ({ ctx, input }) => {
      const where = {
        medicoId: ctx.medico.id,
        ...(input.status && { status: input.status }),
      };

      const [cancelamentos, total] = await Promise.all([
        prisma.cancelamentoEmergencial.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip: (input.page - 1) * input.perPage,
          take: input.perPage,
          include: {
            processadoPor: {
              select: { name: true },
            },
          },
        }),
        prisma.cancelamentoEmergencial.count({ where }),
      ]);

      return {
        cancelamentos,
        total,
        pages: Math.ceil(total / input.perPage),
      };
    }),

  getConfigFaixa: medicoProcedure.query(async ({ ctx }): Promise<{
    minhaFaixa: string;
    configFaixa: { periodos?: string[]; slotsMaximo?: number } | null;
    periodos: Record<string, { inicio: string; fim: string }> | null;
  }> => {
    const [configFaixas, configPeriodos] = await Promise.all([
      prisma.configSistema.findUnique({ where: { chave: "faixas" } }),
      prisma.configSistema.findUnique({ where: { chave: "periodos" } }),
    ]);

    const faixas = configFaixas?.valor as Record<string, { periodos?: string[]; slotsMaximo?: number }> | null;
    const periodos = (configPeriodos?.valor ?? null) as Record<string, { inicio: string; fim: string }> | null;
    const minhaFaixa = ctx.medico.faixa || "P5";

    return {
      minhaFaixa,
      configFaixa: faixas?.[minhaFaixa] ?? null,
      periodos,
    };
  }),

  getGradeHorarios: medicoProcedure.query(async ({ ctx }): Promise<{
    horariosAbertos: { diaSemana: "dom" | "seg" | "ter" | "qua" | "qui" | "sex" | "sab"; horario: string }[];
    horariosMap: Record<string, boolean>;
    slotsComConsulta: Record<string, boolean>;
    slotsPendentes: Record<string, boolean>;
    configFuncionamento: Record<string, { inicio: string; fim: string; ativo: boolean }> | null;
  }> => {
    const [configHorarios, solicitacaoPendente] = await Promise.all([
      prisma.configSistema.findUnique({ where: { chave: "horarios_funcionamento" } }),
      prisma.solicitacao.findFirst({
        where: { medicoId: ctx.medico.id, status: "pendente" },
        select: { slots: true },
      }),
    ]);

    const configFuncionamento = (configHorarios?.valor ?? null) as Record<string, { inicio: string; fim: string; ativo: boolean }> | null;

    const slotsPendentes: Record<string, boolean> = {};
    if (solicitacaoPendente?.slots) {
      const slots = solicitacaoPendente.slots as Array<{ diaSemana: string; horario: string }>;
      for (const slot of slots) {
        slotsPendentes[`${slot.diaSemana}-${slot.horario}`] = true;
      }
    }

    if (!ctx.medico.clickDoctorId) {
      return {
        horariosAbertos: [],
        horariosMap: {},
        slotsComConsulta: {},
        slotsPendentes,
        configFuncionamento,
      };
    }

    const [scheduleResult, slotsConsulta] = await Promise.all([
      clickQueries.getScheduleMedicoClick(ctx.medico.clickDoctorId),
      clickQueries.getSlotsComConsulta(ctx.medico.clickDoctorId),
    ]);
    
    const slots = expandirScheduleParaSlots(scheduleResult[0]?.schedule ?? null);

    const horariosMap: Record<string, boolean> = {};
    for (const slot of slots) {
      horariosMap[`${slot.diaSemana}-${slot.horario}`] = true;
    }

    const slotsComConsulta: Record<string, boolean> = {};
    for (const consulta of slotsConsulta) {
      if (consulta.dia_semana && consulta.hora) {
        slotsComConsulta[`${consulta.dia_semana}-${consulta.hora}`] = true;
      }
    }

    return {
      horariosAbertos: slots,
      horariosMap,
      slotsComConsulta,
      slotsPendentes,
      configFuncionamento,
    };
  }),

  getGradeEmergencial: medicoProcedure.query(async ({ ctx }): Promise<{
    horariosAbertos: { diaSemana: "dom" | "seg" | "ter" | "qua" | "qui" | "sex" | "sab"; horario: string }[];
    slotsComConsulta: Record<string, boolean>;
  }> => {
    if (!ctx.medico.clickDoctorId) {
      return {
        horariosAbertos: [],
        slotsComConsulta: {},
      };
    }

    const [scheduleResult, slotsConsulta] = await Promise.all([
      clickQueries.getScheduleMedicoClick(ctx.medico.clickDoctorId),
      clickQueries.getSlotsComConsultaProximosDias(ctx.medico.clickDoctorId, 3),
    ]);
    
    const slots = expandirScheduleParaSlots(scheduleResult[0]?.schedule ?? null);

    const slotsComConsulta: Record<string, boolean> = {};
    for (const consulta of slotsConsulta) {
      if (consulta.dia_semana && consulta.hora) {
        slotsComConsulta[`${consulta.dia_semana}-${consulta.hora}`] = true;
      }
    }

    return {
      horariosAbertos: slots,
      slotsComConsulta,
    };
  }),

  getPerfil: staffProcedure
    .input(z.object({ medicoId: z.string() }))
    .query(async ({ input }) => {
      const medico = await prisma.user.findUnique({
        where: { id: input.medicoId },
        include: {
          config: true,
          horarios: { where: { ativo: true } },
        },
      });

      return medico;
    }),

  getHorariosMedico: staffProcedure
    .input(z.object({ medicoId: z.string() }))
    .query(async ({ input }) => {
      const medico = await prisma.user.findUnique({
        where: { id: input.medicoId },
        select: { clickDoctorId: true },
      });

      if (!medico?.clickDoctorId) {
        return [];
      }

      const [scheduleResult] = await clickQueries.getScheduleMedicoClick(medico.clickDoctorId);
      return expandirScheduleParaSlots(scheduleResult?.schedule ?? null);
    }),

  meuScore: medicoProcedure.query(async ({ ctx }) => {
    const user = await prisma.user.findUnique({
      where: { id: ctx.medico.id },
      select: { score: true, faixa: true, clickDoctorId: true },
    });

    if (!user?.clickDoctorId) {
      return {
        score: Number(user?.score ?? 0),
        faixa: user?.faixa ?? "P5",
        taxaConversao: null,
        ticketMedio: null,
        percentilConversao: null,
        percentilTicket: null,
      };
    }
    
    const scoreResult = await calcularScoreMedico(user.clickDoctorId);
    
    if (!scoreResult) {
      return {
        score: Number(user.score ?? 0),
        faixa: user.faixa ?? "P5",
        taxaConversao: null,
        ticketMedio: null,
        percentilConversao: null,
        percentilTicket: null,
      };
    }
    
    return scoreResult;
  }),

  recalcularMeuScore: medicoProcedure.mutation(async ({ ctx }) => {
    if (!ctx.medico.clickDoctorId) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Medico nao vinculado ao Click",
      });
    }
    
    const scoreResult = await calcularScoreMedico(ctx.medico.clickDoctorId);
    
    if (!scoreResult) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Nao foi possivel calcular score",
      });
    }
    
    await prisma.user.update({
      where: { id: ctx.medico.id },
      data: {
        score: scoreResult.score,
        faixa: scoreResult.faixa,
      },
    });

    await prisma.historicoScore.create({
      data: {
        medicoId: ctx.medico.id,
        score: scoreResult.score,
        faixa: scoreResult.faixa,
      },
    });
    
    return scoreResult;
  }),

  recalcularTodosScoresAdmin: adminProcedure.mutation(async ({ ctx }) => {
    const result = await recalcularTodosScores();
    
    await prisma.auditoria.create({
      data: {
        usuarioId: ctx.user.id,
        usuarioNome: ctx.user.name,
        acao: "RECALCULAR_TODOS_SCORES",
        entidade: "medico",
        dadosDepois: {
          atualizados: result.atualizados,
          erros: result.erros.length,
        },
      },
    });
    
    return result;
  }),

  recalcularTodosScoresDiretor: diretorProcedure.mutation(async ({ ctx }) => {
    const result = await recalcularTodosScores();
    
    await prisma.auditoria.create({
      data: {
        usuarioId: ctx.user.id,
        usuarioNome: ctx.user.name,
        acao: "RECALCULAR_TODOS_SCORES",
        entidade: "medico",
        dadosDepois: {
          atualizados: result.atualizados,
          erros: result.erros.length,
        },
      },
    });
    
    return result;
  }),

  meuDashboard: medicoProcedure
    .input(
      z.object({
        dataInicio: z.string(),
        dataFim: z.string(),
        diasEvolucao: z.number().min(7).max(90).default(30),
      })
    )
    .query(async ({ ctx, input }): Promise<{
      resumo: ResumoConsultasMedico | null;
      motivos: MotivoNaoRealizada[];
      evolucao: EvolucaoHistorica[];
      proximasConsultas: ConsultaClick[];
    }> => {
      if (!ctx.medico.clickDoctorId) {
        return {
          resumo: null,
          motivos: [],
          evolucao: [],
          proximasConsultas: [],
        };
      }

      const [resumoResult, motivos, evolucao, proximasConsultas] = await Promise.all([
        clickQueries.getResumoConsultasMedico(ctx.medico.clickDoctorId, input.dataInicio, input.dataFim).catch((e) => { console.error("getResumoConsultasMedico error:", e); return []; }),
        clickQueries.getDistribuicaoMotivosNaoRealizadas(ctx.medico.clickDoctorId, input.dataInicio, input.dataFim).catch((e) => { console.error("getDistribuicaoMotivos error:", e); return []; }),
        clickQueries.getEvolucaoHistorica(ctx.medico.clickDoctorId, input.diasEvolucao).catch((e) => { console.error("getEvolucaoHistorica error:", e); return []; }),
        clickQueries.getProximasConsultasMedico(ctx.medico.clickDoctorId, 10).catch((e) => { console.error("getProximasConsultas error:", e); return []; }),
      ]);

      return {
        resumo: (resumoResult as ResumoConsultasMedico[])[0] ?? null,
        motivos: motivos as MotivoNaoRealizada[],
        evolucao: evolucao as EvolucaoHistorica[],
        proximasConsultas: proximasConsultas as ConsultaClick[],
      };
    }),

   getMetricasDetalhadas: staffProcedure
     .input(z.object({ medicoId: z.string() }))
     .query(async ({ input }) => {
       const medico = await prisma.user.findUnique({
         where: { id: input.medicoId },
         select: { clickDoctorId: true, score: true, faixa: true },
       });

       if (!medico?.clickDoctorId) {
         return null;
       }

       const config = await getScoreConfig();
       
       const [metricas] = await clickQueries.getMetricasMedicoPrimeiroLead(
         medico.clickDoctorId, 
         config.semanasCalculo
       );

       if (!metricas) {
         return null;
       }

       const todasMetricas = await clickQueries.getMetricasTodosMedicosPrimeiroLead(config.semanasCalculo);
       
       const conversoes = todasMetricas.map(m => m.taxa_conversao);
       const tickets = todasMetricas.map(m => m.ticket_medio);
       
       const calcularPercentil = (valor: number, valores: number[]): number => {
         if (valores.length === 0) return 0;
         const sorted = [...valores].sort((a, b) => a - b);
         const menoresOuIguais = sorted.filter(v => v <= valor).length;
         return Math.round((menoresOuIguais / sorted.length) * 100);
       };
       
       const percentilConversao = calcularPercentil(metricas.taxa_conversao, conversoes);
       const percentilTicket = calcularPercentil(metricas.ticket_medio, tickets);
       
       const scoreCalculado = Math.round(
         (percentilConversao * config.conversao) + (percentilTicket * config.ticketMedio)
       );

       const periodoFim = new Date();
       const periodoInicio = new Date();
       periodoInicio.setDate(periodoInicio.getDate() - (config.semanasCalculo * 7));

       return {
         totalConsultas: metricas.total_consultas_realizadas,
         primeiroLead: metricas.consultas_primeiro_paciente,
         recorrencia: metricas.consultas_recorrencia,
         consultasComReceita: metricas.consultas_com_receita,
         orcamentosPagos: metricas.orcamentos_pagos,
         taxaConversao: metricas.taxa_conversao,
         ticketMedio: metricas.ticket_medio,
         faturamento: metricas.faturamento,
         semanasCalculo: config.semanasCalculo,
         periodoInicio: periodoInicio.toISOString(),
         periodoFim: periodoFim.toISOString(),
         percentilConversao,
         percentilTicket,
         pesoConversao: config.conversao,
         pesoTicket: config.ticketMedio,
         scoreCalculado,
         scoreAtual: medico.score,
         faixaAtual: medico.faixa,
         totalMedicosComparacao: todasMetricas.length,
       };
     }),

   getHistoricoScore: staffProcedure
     .input(z.object({ medicoId: z.string() }))
     .query(async ({ input }) => {
       const historico = await prisma.historicoScore.findMany({
         where: { medicoId: input.medicoId },
         orderBy: { createdAt: 'desc' },
         take: 100,
         select: {
           id: true,
           score: true,
           faixa: true,
           createdAt: true,
         },
       });
       return historico;
     }),

});
