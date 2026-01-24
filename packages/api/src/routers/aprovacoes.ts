import { z } from "zod";
import { TRPCError } from "@trpc/server";
import prisma from "@clickmedicos/db";
import { router, staffProcedure, diretorProcedure } from "../index";
import { sincronizarHorariosMedicoComClick } from "../services/sync.service";
import {
  notificarSolicitacaoAprovada,
  notificarSolicitacaoRejeitada,
  notificarCancelamentoAprovado,
  notificarCancelamentoRejeitado,
} from "../services/notification.service";

const SlotSchema = z.object({
  diaSemana: z.enum(["dom", "seg", "ter", "qua", "qui", "sex", "sab"]),
  horario: z.string(),
});

export const aprovacoesRouter = router({
  listarSolicitacoes: staffProcedure
    .input(
      z.object({
        status: z.enum(["pendente", "aprovada", "rejeitada"]).optional(),
        medicoId: z.string().optional(),
        page: z.number().min(1).default(1),
        perPage: z.number().min(1).max(50).default(20),
      })
    )
    .query(async ({ input }) => {
      const where = {
        ...(input.status && { status: input.status }),
        ...(input.medicoId && { medicoId: input.medicoId }),
      };

      const [solicitacoes, total] = await Promise.all([
        prisma.solicitacao.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip: (input.page - 1) * input.perPage,
          take: input.perPage,
          include: {
            medico: {
              select: { id: true, name: true, email: true, faixa: true },
            },
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

  aprovarSolicitacao: staffProcedure
    .input(
      z.object({
        solicitacaoId: z.string(),
        slotsAprovados: z.array(SlotSchema).optional(),
        slotsRejeitados: z.array(SlotSchema).optional(),
        motivoRejeicao: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const solicitacao = await prisma.solicitacao.findUnique({
        where: { id: input.solicitacaoId },
      });

      if (!solicitacao) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Solicitacao nao encontrada",
        });
      }

      if (solicitacao.status !== "pendente") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Solicitacao ja foi processada",
        });
      }

      const slotsOriginais = solicitacao.slots as Array<{ diaSemana: string; horario: string }>;
      const slotsAprovados = input.slotsAprovados ?? slotsOriginais;

      const result = await prisma.$transaction(async (tx) => {
        const solicitacaoAtualizada = await tx.solicitacao.update({
          where: { id: input.solicitacaoId },
          data: {
            status: "aprovada",
            aprovadoPorId: ctx.user.id,
            slotsAprovados: slotsAprovados,
            slotsRejeitados: input.slotsRejeitados ?? [],
            motivoRejeicao: input.motivoRejeicao,
            processadoEm: new Date(),
          },
        });

        for (const slot of slotsAprovados) {
          await tx.medicoHorario.upsert({
            where: {
              medicoId_diaSemana_horario: {
                medicoId: solicitacao.medicoId,
                diaSemana: slot.diaSemana as "dom" | "seg" | "ter" | "qua" | "qui" | "sex" | "sab",
                horario: slot.horario,
              },
            },
            update: { ativo: true },
            create: {
              medicoId: solicitacao.medicoId,
              diaSemana: slot.diaSemana as "dom" | "seg" | "ter" | "qua" | "qui" | "sex" | "sab",
              horario: slot.horario,
              ativo: true,
            },
          });
        }

        await tx.auditoria.create({
          data: {
            usuarioId: ctx.user.id,
            usuarioNome: ctx.user.name,
            acao: "APROVAR_SOLICITACAO",
            entidade: "solicitacao",
            entidadeId: input.solicitacaoId,
            dadosAntes: { status: "pendente", slots: slotsOriginais },
            dadosDepois: { status: "aprovada", slotsAprovados },
          },
        });

        return solicitacaoAtualizada;
      });

      const syncResult = await sincronizarHorariosMedicoComClick(solicitacao.medicoId);

      if (!syncResult.success) {
        await prisma.auditoria.create({
          data: {
            usuarioId: ctx.user.id,
            usuarioNome: ctx.user.name,
            acao: "SYNC_CLICK_FALHA",
            entidade: "solicitacao",
            entidadeId: input.solicitacaoId,
            dadosDepois: {
              erro: syncResult.error,
              filaRetry: syncResult.queuedForRetry,
            },
          },
        });
      }

      const slotsRejeitadosCount = (input.slotsRejeitados ?? []).length;
      notificarSolicitacaoAprovada(
        solicitacao.medicoId,
        input.solicitacaoId,
        slotsRejeitadosCount > 0 ? { aprovados: slotsAprovados.length, rejeitados: slotsRejeitadosCount } : undefined
      ).catch((err: unknown) => {
        console.error("[Notification] Falha ao notificar solicitação aprovada:", err);
      });

      return result;
    }),

  rejeitarSolicitacao: staffProcedure
    .input(
      z.object({
        solicitacaoId: z.string(),
        motivoRejeicao: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const solicitacao = await prisma.solicitacao.findUnique({
        where: { id: input.solicitacaoId },
      });

      if (!solicitacao) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Solicitacao nao encontrada",
        });
      }

      if (solicitacao.status !== "pendente") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Solicitacao ja foi processada",
        });
      }

      const result = await prisma.$transaction(async (tx) => {
        const solicitacaoAtualizada = await tx.solicitacao.update({
          where: { id: input.solicitacaoId },
          data: {
            status: "rejeitada",
            aprovadoPorId: ctx.user.id,
            motivoRejeicao: input.motivoRejeicao,
            processadoEm: new Date(),
          },
        });

        await tx.auditoria.create({
          data: {
            usuarioId: ctx.user.id,
            usuarioNome: ctx.user.name,
            acao: "REJEITAR_SOLICITACAO",
            entidade: "solicitacao",
            entidadeId: input.solicitacaoId,
            dadosAntes: { status: "pendente" },
            dadosDepois: { status: "rejeitada", motivo: input.motivoRejeicao },
          },
        });

        return solicitacaoAtualizada;
      });

      notificarSolicitacaoRejeitada(
        solicitacao.medicoId,
        input.solicitacaoId,
        input.motivoRejeicao
      ).catch((err: unknown) => {
        console.error("[Notification] Falha ao notificar solicitação rejeitada:", err);
      });

      return result;
    }),

  aprovarComOverride: diretorProcedure
    .input(
      z.object({
        solicitacaoId: z.string(),
        overrideMotivo: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const solicitacao = await prisma.solicitacao.findUnique({
        where: { id: input.solicitacaoId },
      });

      if (!solicitacao) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Solicitacao nao encontrada",
        });
      }

      if (solicitacao.status !== "pendente") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Solicitacao ja foi processada",
        });
      }

      const slotsOriginais = solicitacao.slots as Array<{ diaSemana: string; horario: string }>;

      const result = await prisma.$transaction(async (tx) => {
        const solicitacaoAtualizada = await tx.solicitacao.update({
          where: { id: input.solicitacaoId },
          data: {
            status: "aprovada",
            aprovadoPorId: ctx.user.id,
            slotsAprovados: slotsOriginais,
            override: true,
            overrideMotivo: input.overrideMotivo,
            processadoEm: new Date(),
          },
        });

        for (const slot of slotsOriginais) {
          await tx.medicoHorario.upsert({
            where: {
              medicoId_diaSemana_horario: {
                medicoId: solicitacao.medicoId,
                diaSemana: slot.diaSemana as "dom" | "seg" | "ter" | "qua" | "qui" | "sex" | "sab",
                horario: slot.horario,
              },
            },
            update: { ativo: true },
            create: {
              medicoId: solicitacao.medicoId,
              diaSemana: slot.diaSemana as "dom" | "seg" | "ter" | "qua" | "qui" | "sex" | "sab",
              horario: slot.horario,
              ativo: true,
            },
          });
        }

        await tx.auditoria.create({
          data: {
            usuarioId: ctx.user.id,
            usuarioNome: ctx.user.name,
            acao: "APROVAR_SOLICITACAO_OVERRIDE",
            entidade: "solicitacao",
            entidadeId: input.solicitacaoId,
            dadosAntes: { status: "pendente" },
            dadosDepois: {
              status: "aprovada",
              override: true,
              overrideMotivo: input.overrideMotivo,
            },
          },
        });

        return solicitacaoAtualizada;
      });

      const syncResult = await sincronizarHorariosMedicoComClick(solicitacao.medicoId);

      if (!syncResult.success) {
        await prisma.auditoria.create({
          data: {
            usuarioId: ctx.user.id,
            usuarioNome: ctx.user.name,
            acao: "SYNC_CLICK_FALHA",
            entidade: "solicitacao",
            entidadeId: input.solicitacaoId,
            dadosDepois: {
              erro: syncResult.error,
              filaRetry: syncResult.queuedForRetry,
              override: true,
            },
          },
        });
      }

      notificarSolicitacaoAprovada(solicitacao.medicoId, input.solicitacaoId).catch((err: unknown) => {
        console.error("[Notification] Falha ao notificar solicitação aprovada (override):", err);
      });

      return result;
    }),

  listarCancelamentos: staffProcedure
    .input(
      z.object({
        status: z.enum(["pendente", "aprovado", "rejeitado"]).optional(),
        medicoId: z.string().optional(),
        page: z.number().min(1).default(1),
        perPage: z.number().min(1).max(50).default(20),
      })
    )
    .query(async ({ input }) => {
      const where = {
        ...(input.status && { status: input.status }),
        ...(input.medicoId && { medicoId: input.medicoId }),
      };

      const [cancelamentos, total] = await Promise.all([
        prisma.cancelamentoEmergencial.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip: (input.page - 1) * input.perPage,
          take: input.perPage,
          include: {
            medico: {
              select: { id: true, name: true, email: true, faixa: true, strikes: true },
            },
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

  aprovarCancelamento: staffProcedure
    .input(z.object({ 
      cancelamentoId: z.string(),
      aplicarStrike: z.boolean()
    }))
    .mutation(async ({ ctx, input }) => {
      const cancelamento = await prisma.cancelamentoEmergencial.findUnique({
        where: { id: input.cancelamentoId },
        include: { medico: true },
      });

      if (!cancelamento) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Cancelamento nao encontrado",
        });
      }

      if (cancelamento.status !== "pendente") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cancelamento ja foi processado",
        });
      }

      const slots = cancelamento.slots as Array<{ diaSemana: string; horario: string }>;

      const result = await prisma.$transaction(async (tx) => {
        const strikeAntes = cancelamento.medico.strikes;

        const cancelamentoAtualizado = await tx.cancelamentoEmergencial.update({
          where: { id: input.cancelamentoId },
          data: {
            status: "aprovado",
            processadoPorId: ctx.user.id,
            processadoEm: new Date(),
            strikeAplicado: input.aplicarStrike,
          },
        });

        if (input.aplicarStrike) {
          await tx.user.update({
            where: { id: cancelamento.medicoId },
            data: { strikes: { increment: 1 } },
          });
        }

        for (const slot of slots) {
          await tx.medicoHorario.updateMany({
            where: {
              medicoId: cancelamento.medicoId,
              diaSemana: slot.diaSemana as "dom" | "seg" | "ter" | "qua" | "qui" | "sex" | "sab",
              horario: slot.horario,
              ativo: true,
            },
            data: { ativo: false },
          });
        }

        await tx.auditoria.create({
          data: {
            usuarioId: ctx.user.id,
            usuarioNome: ctx.user.name,
            acao: "APROVAR_CANCELAMENTO",
            entidade: "cancelamento_emergencial",
            entidadeId: input.cancelamentoId,
            dadosAntes: { status: "pendente", strikeAntes },
            dadosDepois: { 
              status: "aprovado", 
              strikeAplicado: input.aplicarStrike,
              strikeDepois: input.aplicarStrike ? strikeAntes + 1 : strikeAntes
            },
          },
        });

        return cancelamentoAtualizado;
      });

      const syncResult = await sincronizarHorariosMedicoComClick(cancelamento.medicoId);

      if (!syncResult.success) {
        await prisma.auditoria.create({
          data: {
            usuarioId: ctx.user.id,
            usuarioNome: ctx.user.name,
            acao: "SYNC_CLICK_FALHA",
            entidade: "cancelamento_emergencial",
            entidadeId: input.cancelamentoId,
            dadosDepois: {
              erro: syncResult.error,
              filaRetry: syncResult.queuedForRetry,
            },
          },
        });
      }

      notificarCancelamentoAprovado(cancelamento.medicoId, input.cancelamentoId).catch((err: unknown) => {
        console.error("[Notification] Falha ao notificar cancelamento aprovado:", err);
      });

      return result;
    }),

  rejeitarCancelamento: staffProcedure
    .input(
      z.object({
        cancelamentoId: z.string(),
        motivoRejeicao: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const cancelamento = await prisma.cancelamentoEmergencial.findUnique({
        where: { id: input.cancelamentoId },
      });

      if (!cancelamento) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Cancelamento nao encontrado",
        });
      }

      if (cancelamento.status !== "pendente") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cancelamento ja foi processado",
        });
      }

      const result = await prisma.$transaction(async (tx) => {
        const cancelamentoAtualizado = await tx.cancelamentoEmergencial.update({
          where: { id: input.cancelamentoId },
          data: {
            status: "rejeitado",
            processadoPorId: ctx.user.id,
            motivoRejeicao: input.motivoRejeicao,
            processadoEm: new Date(),
          },
        });

        await tx.auditoria.create({
          data: {
            usuarioId: ctx.user.id,
            usuarioNome: ctx.user.name,
            acao: "REJEITAR_CANCELAMENTO",
            entidade: "cancelamento_emergencial",
            entidadeId: input.cancelamentoId,
            dadosAntes: { status: "pendente" },
            dadosDepois: { status: "rejeitado", motivo: input.motivoRejeicao },
          },
        });

        return cancelamentoAtualizado;
      });

      notificarCancelamentoRejeitado(
        cancelamento.medicoId,
        input.cancelamentoId,
        input.motivoRejeicao
      ).catch((err: unknown) => {
        console.error("[Notification] Falha ao notificar cancelamento rejeitado:", err);
      });

      return result;
    }),

  pendentes: staffProcedure.query(async () => {
    const [solicitacoes, cancelamentos] = await Promise.all([
      prisma.solicitacao.count({ where: { status: "pendente" } }),
      prisma.cancelamentoEmergencial.count({ where: { status: "pendente" } }),
    ]);

    return {
      solicitacoes,
      cancelamentos,
      total: solicitacoes + cancelamentos,
    };
  }),
});
