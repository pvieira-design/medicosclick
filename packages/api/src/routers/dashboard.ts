import { z } from "zod";
import prisma from "@clickmedicos/db";
import { clickQueries } from "@clickmedicos/db/click-replica";
import { router, staffProcedure, diretorProcedure } from "../index";

export interface DashboardAlerta {
  id: string;
  tipo: string;
  severidade: "critico" | "alerta" | "oportunidade";
  medicoId: string;
  medicoNome: string;
  valor: number;
  meta?: number;
  mensagem: string;
}

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0] ?? "";
}

export const dashboardRouter = router({
  resumoGeral: staffProcedure.query(async () => {
    const hoje = formatDate(new Date());

    let consultasDoDia: Awaited<ReturnType<typeof clickQueries.getConsultasDoDia>> = [];
    
    try {
      consultasDoDia = await clickQueries.getConsultasDoDia(hoje);
    } catch {
    }

    const [
      solicitacoesPendentes,
      cancelamentosPendentes,
      medicosPorFaixa,
      totalMedicosAtivos,
    ] = await Promise.all([
      prisma.solicitacao.count({ where: { status: "pendente" } }),
      prisma.cancelamentoEmergencial.count({ where: { status: "pendente" } }),
      prisma.user.groupBy({
        by: ["faixa"],
        where: { tipo: "medico", ativo: true },
        _count: true,
      }),
      prisma.user.count({ where: { tipo: "medico", ativo: true } }),
    ]);

    const consultasRealizadas = consultasDoDia.filter((c) => c.completed).length;
    const consultasNaoRealizadas = consultasDoDia.filter(
      (c) => !c.completed && c.reason_for_cancellation
    ).length;
    const consultasAgendadas = consultasDoDia.filter(
      (c) => !c.completed && !c.reason_for_cancellation
    ).length;

    const motivosCancelamento = consultasDoDia
      .filter((c) => c.reason_for_cancellation)
      .reduce<Record<string, number>>((acc, c) => {
        const motivo = c.reason_for_cancellation ?? "Nao informado";
        acc[motivo] = (acc[motivo] ?? 0) + 1;
        return acc;
      }, {});

    return {
      consultasHoje: {
        total: consultasDoDia.length,
        realizadas: consultasRealizadas,
        naoRealizadas: consultasNaoRealizadas,
        agendadas: consultasAgendadas,
        motivosCancelamento,
      },
      pendentes: {
        solicitacoes: solicitacoesPendentes,
        cancelamentos: cancelamentosPendentes,
        total: solicitacoesPendentes + cancelamentosPendentes,
      },
      medicos: {
        total: totalMedicosAtivos,
        porFaixa: medicosPorFaixa.reduce<Record<string, number>>((acc, item) => {
          acc[item.faixa] = item._count;
          return acc;
        }, {}),
      },
    };
  }),

  consultasDoDia: staffProcedure.query(async () => {
    const hoje = formatDate(new Date());
    try {
      return await clickQueries.getConsultasDoDia(hoje);
    } catch {
      return [];
    }
  }),

  consultasPorPeriodo: staffProcedure
    .input(
      z.object({
        dataInicio: z.string(),
        dataFim: z.string(),
        medicoId: z.number().optional(),
      })
    )
    .query(async ({ input }) => {
      try {
        if (input.medicoId) {
          return await clickQueries.getConsultasMedico(
            input.medicoId,
            input.dataInicio,
            input.dataFim
          );
        }
        return await clickQueries.getConsultasDoDia(input.dataInicio);
      } catch {
        return [];
      }
    }),

  atividadeRecente: staffProcedure
    .input(z.object({ limite: z.number().min(1).max(50).default(20) }))
    .query(async ({ input }) => {
      const [solicitacoesRecentes, cancelamentosRecentes, auditoriaRecente] =
        await Promise.all([
          prisma.solicitacao.findMany({
            orderBy: { updatedAt: "desc" },
            take: input.limite,
            include: {
              medico: { select: { name: true } },
              aprovadoPor: { select: { name: true } },
            },
          }),
          prisma.cancelamentoEmergencial.findMany({
            orderBy: { updatedAt: "desc" },
            take: input.limite,
            include: {
              medico: { select: { name: true } },
              processadoPor: { select: { name: true } },
            },
          }),
          prisma.auditoria.findMany({
            orderBy: { createdAt: "desc" },
            take: input.limite,
          }),
        ]);

      return {
        solicitacoes: solicitacoesRecentes,
        cancelamentos: cancelamentosRecentes,
        auditoria: auditoriaRecente,
      };
    }),

  medicosComStrikes: staffProcedure.query(async () => {
    return prisma.user.findMany({
      where: {
        tipo: "medico",
        strikes: { gt: 0 },
      },
      orderBy: { strikes: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        faixa: true,
        strikes: true,
      },
    });
  }),

  metricasSensiveis: diretorProcedure.query(async () => {
    const medicos = await prisma.user.findMany({
      where: { tipo: "medico", ativo: true },
      include: { config: true },
      orderBy: { score: "desc" },
    });

    return medicos.map((m) => ({
      id: m.id,
      name: m.name,
      faixa: m.faixa,
      score: Number(m.score),
      taxaConversao: m.config?.taxaConversao ? Number(m.config.taxaConversao) : null,
      ticketMedio: m.config?.ticketMedio ? Number(m.config.ticketMedio) : null,
      totalConsultas: m.config?.totalConsultas ?? 0,
    }));
  }),

  rankingMedicos: diretorProcedure
    .input(
      z.object({
        ordenarPor: z.enum(["score", "conversao", "ticket"]).default("score"),
        limite: z.number().min(1).max(100).default(20),
      })
    )
    .query(async ({ input }) => {
      const medicos = await prisma.user.findMany({
        where: { tipo: "medico", ativo: true },
        include: { config: true },
        take: input.limite,
      });

      const ordenado = medicos.sort((a, b) => {
        switch (input.ordenarPor) {
          case "conversao":
            return Number(b.config?.taxaConversao ?? 0) - Number(a.config?.taxaConversao ?? 0);
          case "ticket":
            return Number(b.config?.ticketMedio ?? 0) - Number(a.config?.ticketMedio ?? 0);
          default:
            return Number(b.score) - Number(a.score);
        }
      });

      return ordenado.map((m, index) => ({
        posicao: index + 1,
        id: m.id,
        name: m.name,
        faixa: m.faixa,
        score: Number(m.score),
        taxaConversao: m.config?.taxaConversao ? Number(m.config.taxaConversao) : null,
        ticketMedio: m.config?.ticketMedio ? Number(m.config.ticketMedio) : null,
      }));
    }),

  getAlertas: staffProcedure.query(async () => {
    const medicos = await prisma.user.findMany({
      where: { tipo: "medico", ativo: true, clickDoctorId: { not: null } },
      include: { config: true },
    });

    const alertas: DashboardAlerta[] = [];
    let alertaId = 0;

    for (const medico of medicos) {
      const conversao = medico.config?.taxaConversao ? Number(medico.config.taxaConversao) : null;
      const score = Number(medico.score);

      if (conversao !== null && conversao < 45) {
        alertas.push({
          id: `alerta-${++alertaId}`,
          tipo: "Conversao Critica",
          severidade: "critico",
          medicoId: medico.id,
          medicoNome: medico.name,
          valor: conversao,
          meta: 55,
          mensagem: `Taxa de conversao em ${conversao.toFixed(1)}% (meta: 55%)`,
        });
      }

      if (medico.strikes >= 2) {
        alertas.push({
          id: `alerta-${++alertaId}`,
          tipo: "Strikes Elevados",
          severidade: medico.strikes >= 3 ? "critico" : "alerta",
          medicoId: medico.id,
          medicoNome: medico.name,
          valor: medico.strikes,
          meta: 3,
          mensagem: `${medico.strikes} strikes acumulados`,
        });
      }

      if (conversao !== null && conversao >= 70 && score >= 70) {
        alertas.push({
          id: `alerta-${++alertaId}`,
          tipo: "Pronto para Promocao",
          severidade: "oportunidade",
          medicoId: medico.id,
          medicoNome: medico.name,
          valor: conversao,
          meta: 70,
          mensagem: `Performance consistente - conversao ${conversao.toFixed(1)}%, score ${score.toFixed(0)}`,
        });
      }

      if (medico.faixa === "P5" && (medico.config?.totalConsultas ?? 0) >= 10 && score < 20) {
        alertas.push({
          id: `alerta-${++alertaId}`,
          tipo: "Atencao Score Baixo",
          severidade: "alerta",
          medicoId: medico.id,
          medicoNome: medico.name,
          valor: score,
          meta: 20,
          mensagem: `Score ${score.toFixed(1)} apos ${medico.config?.totalConsultas ?? 0} consultas`,
        });
      }
    }

    const criticos = alertas.filter((a) => a.severidade === "critico");
    const avisos = alertas.filter((a) => a.severidade === "alerta");
    const oportunidades = alertas.filter((a) => a.severidade === "oportunidade");

    return {
      criticos,
      alertas: avisos,
      oportunidades,
      totais: {
        criticos: criticos.length,
        alertas: avisos.length,
        oportunidades: oportunidades.length,
      },
    };
  }),

  kpis: staffProcedure
    .input(
      z.object({
        dataInicio: z.string(),
        dataFim: z.string(),
      })
    )
    .query(async ({ input }) => {
      let consultas: Awaited<ReturnType<typeof clickQueries.getConsultasDoDia>> = [];

      try {
        consultas = await clickQueries.getConsultasDoDia(input.dataInicio);
      } catch {
      }

      const [totalMedicos, totalSolicitacoes] = await Promise.all([
        prisma.user.count({ where: { tipo: "medico", ativo: true } }),
        prisma.solicitacao.count({ where: { status: "pendente" } }),
      ]);

      const realizadas = consultas.filter((c) => c.completed).length;
      const noShows = consultas.filter(
        (c) => !c.completed && c.reason_for_cancellation?.toLowerCase().includes("no-show")
      ).length;
      const taxaComparecimento = consultas.length > 0 ? (realizadas / consultas.length) * 100 : 0;
      const taxaNoShow = consultas.length > 0 ? (noShows / consultas.length) * 100 : 0;

      return {
        consultasAgendadas: consultas.length,
        consultasRealizadas: realizadas,
        taxaComparecimento,
        taxaNoShow,
        totalMedicos,
        solicitacoesPendentes: totalSolicitacoes,
      };
    }),
});
