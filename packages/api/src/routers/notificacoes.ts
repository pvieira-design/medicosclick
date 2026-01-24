import { z } from "zod";
import prisma from "@clickmedicos/db";
import { router, authenticatedProcedure } from "../index";

export const notificacoesRouter = router({
  contarNaoLidas: authenticatedProcedure.query(async ({ ctx }) => {
    return prisma.notificacao.count({
      where: { usuarioId: ctx.user.id, lida: false },
    });
  }),

  listar: authenticatedProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        perPage: z.number().min(1).max(50).default(20),
        apenasNaoLidas: z.boolean().default(false),
      })
    )
    .query(async ({ ctx, input }) => {
      const where = {
        usuarioId: ctx.user.id,
        ...(input.apenasNaoLidas && { lida: false }),
      };

      const [notificacoes, total] = await Promise.all([
        prisma.notificacao.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip: (input.page - 1) * input.perPage,
          take: input.perPage,
        }),
        prisma.notificacao.count({ where }),
      ]);

      return {
        notificacoes,
        total,
        pages: Math.ceil(total / input.perPage),
      };
    }),

  marcarComoLida: authenticatedProcedure
    .input(z.object({ notificacaoId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await prisma.notificacao.updateMany({
        where: { id: input.notificacaoId, usuarioId: ctx.user.id },
        data: { lida: true },
      });
      return { success: true };
    }),

  marcarTodasComoLidas: authenticatedProcedure.mutation(async ({ ctx }) => {
    const result = await prisma.notificacao.updateMany({
      where: { usuarioId: ctx.user.id, lida: false },
      data: { lida: true },
    });
    return { count: result.count };
  }),
});
