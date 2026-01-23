import { z } from "zod";
import prisma from "@clickmedicos/db";
import { router, adminProcedure, staffProcedure } from "../index";
import {
  obterEstatisticasFilaRetry,
  listarFilaRetry,
  processarFilaRetry,
} from "../services/sync.service";

const HorarioFuncionamentoSchema = z.object({
  dom: z.object({ inicio: z.string(), fim: z.string(), ativo: z.boolean() }),
  seg: z.object({ inicio: z.string(), fim: z.string(), ativo: z.boolean() }),
  ter: z.object({ inicio: z.string(), fim: z.string(), ativo: z.boolean() }),
  qua: z.object({ inicio: z.string(), fim: z.string(), ativo: z.boolean() }),
  qui: z.object({ inicio: z.string(), fim: z.string(), ativo: z.boolean() }),
  sex: z.object({ inicio: z.string(), fim: z.string(), ativo: z.boolean() }),
  sab: z.object({ inicio: z.string(), fim: z.string(), ativo: z.boolean() }),
});

const FaixaConfigSchema = z.object({
  scoreMinimo: z.number(),
  consultasMinimas: z.number(),
  slotsMaximo: z.number().nullable(),
  slotsMinimo: z.number(),
  periodos: z.array(z.enum(["manha", "tarde", "noite"])),
});

const FaixasSchema = z.object({
  P1: FaixaConfigSchema,
  P2: FaixaConfigSchema,
  P3: FaixaConfigSchema,
  P4: FaixaConfigSchema,
  P5: FaixaConfigSchema,
});

const PeriodosSchema = z.object({
  manha: z.object({ inicio: z.string(), fim: z.string() }),
  tarde: z.object({ inicio: z.string(), fim: z.string() }),
  noite: z.object({ inicio: z.string(), fim: z.string() }),
});

const PesosScoreSchema = z.object({
  conversao: z.number().min(0).max(1),
  ticketMedio: z.number().min(0).max(1),
});

const StrikesConfigSchema = z.object({
  maxStrikes: z.number().min(1),
  penalidades: z.array(
    z.object({
      strikes: z.number(),
      reducaoSlots: z.number(),
      duracaoDias: z.number(),
    })
  ),
});

export const configRouter = router({
  getAll: staffProcedure.query(async () => {
    const configs = await prisma.configSistema.findMany();
    return configs.reduce<Record<string, unknown>>((acc, config) => {
      acc[config.chave] = config.valor;
      return acc;
    }, {});
  }),

  getByKey: staffProcedure
    .input(z.object({ chave: z.string() }))
    .query(async ({ input }) => {
      const config = await prisma.configSistema.findUnique({
        where: { chave: input.chave },
      });
      return config?.valor ?? null;
    }),

  updateHorariosFuncionamento: adminProcedure
    .input(HorarioFuncionamentoSchema)
    .mutation(async ({ input }) => {
      return prisma.configSistema.upsert({
        where: { chave: "horarios_funcionamento" },
        update: { valor: input },
        create: {
          chave: "horarios_funcionamento",
          valor: input,
          descricao: "Horarios de funcionamento por dia da semana",
        },
      });
    }),

  updateFaixas: adminProcedure.input(FaixasSchema).mutation(async ({ input }) => {
    return prisma.configSistema.upsert({
      where: { chave: "faixas" },
      update: { valor: input },
      create: {
        chave: "faixas",
        valor: input,
        descricao: "Configuracoes das faixas P1-P5 (score, slots, periodos)",
      },
    });
  }),

  updatePeriodos: adminProcedure.input(PeriodosSchema).mutation(async ({ input }) => {
    return prisma.configSistema.upsert({
      where: { chave: "periodos" },
      update: { valor: input },
      create: {
        chave: "periodos",
        valor: input,
        descricao: "Definicao dos periodos do dia (manha, tarde, noite)",
      },
    });
  }),

  updatePesosScore: adminProcedure.input(PesosScoreSchema).mutation(async ({ input }) => {
    if (input.conversao + input.ticketMedio !== 1) {
      throw new Error("A soma dos pesos deve ser igual a 1");
    }

    return prisma.configSistema.upsert({
      where: { chave: "pesos_score" },
      update: { valor: input },
      create: {
        chave: "pesos_score",
        valor: input,
        descricao: "Pesos para calculo do score (conversao e ticket medio)",
      },
    });
  }),

  updateStrikes: adminProcedure.input(StrikesConfigSchema).mutation(async ({ input }) => {
    return prisma.configSistema.upsert({
      where: { chave: "strikes" },
      update: { valor: input },
      create: {
        chave: "strikes",
        valor: input,
        descricao: "Configuracao de strikes e penalidades",
      },
    });
  }),

  filaRetryStats: adminProcedure.query(async () => {
    return obterEstatisticasFilaRetry();
  }),

  filaRetryList: adminProcedure
    .input(z.object({ limite: z.number().min(1).max(100).default(20) }))
    .query(async ({ input }) => {
      return listarFilaRetry(input.limite);
    }),

  processarFilaRetryManual: adminProcedure.mutation(async ({ ctx }) => {
    const result = await processarFilaRetry();

    await prisma.auditoria.create({
      data: {
        usuarioId: ctx.user.id,
        usuarioNome: ctx.user.name,
        acao: "PROCESSAR_FILA_RETRY_MANUAL",
        entidade: "sync_queue",
        dadosDepois: result,
      },
    });

    return result;
  }),
});
