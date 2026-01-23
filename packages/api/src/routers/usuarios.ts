import { z } from "zod";
import { TRPCError } from "@trpc/server";
import prisma from "@clickmedicos/db";
import { clickQueries } from "@clickmedicos/db/click-replica";
import { router, adminProcedure, staffProcedure } from "../index";
import { hashPassword } from "better-auth/crypto";

const UserTipoEnum = z.enum(["super_admin", "admin", "diretor", "atendente", "medico"]);
const FaixaEnum = z.enum(["P1", "P2", "P3", "P4", "P5"]);

export const usuariosRouter = router({
  listar: staffProcedure
    .input(
      z.object({
        tipo: UserTipoEnum.optional(),
        faixa: FaixaEnum.optional(),
        ativo: z.boolean().optional(),
        search: z.string().optional(),
        page: z.number().min(1).default(1),
        perPage: z.number().min(1).max(100).default(20),
      })
    )
    .query(async ({ input }) => {
      const where = {
        ...(input.tipo && { tipo: input.tipo }),
        ...(input.faixa && { faixa: input.faixa }),
        ...(input.ativo !== undefined && { ativo: input.ativo }),
        ...(input.search && {
          OR: [
            { name: { contains: input.search, mode: "insensitive" as const } },
            { email: { contains: input.search, mode: "insensitive" as const } },
            { crm: { contains: input.search, mode: "insensitive" as const } },
          ],
        }),
      };

      const [usuarios, total] = await Promise.all([
        prisma.user.findMany({
          where,
          skip: (input.page - 1) * input.perPage,
          take: input.perPage,
          orderBy: { name: "asc" },
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            tipo: true,
            ativo: true,
            faixa: true,
            faixaFixa: true,
            score: true,
            strikes: true,
            clickDoctorId: true,
            crm: true,
            createdAt: true,
          },
        }),
        prisma.user.count({ where }),
      ]);

      return {
        usuarios,
        total,
        pages: Math.ceil(total / input.perPage),
      };
    }),

  getMedico: staffProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const medico = await prisma.user.findUnique({
        where: { id: input.id },
        include: {
          config: true,
          horarios: {
            where: { ativo: true },
            orderBy: [{ diaSemana: "asc" }, { horario: "asc" }],
          },
          solicitacoes: {
            orderBy: { createdAt: "desc" },
            take: 10,
          },
          cancelamentos: {
            orderBy: { createdAt: "desc" },
            take: 10,
          },
          observacoes: {
            orderBy: { createdAt: "desc" },
            include: {
              autor: {
                select: { id: true, name: true },
              },
            },
          },
        },
      });

      if (!medico) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Medico nao encontrado",
        });
      }

      return medico;
    }),

  getMedicosClick: adminProcedure.query(async () => {
    if (!process.env.CLICK_REPLICA_DATABASE_URL) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "Conexao com banco Click nao configurada (CLICK_REPLICA_DATABASE_URL)",
      });
    }

    const medicosClick = await clickQueries.getTodosMedicos();
    const medicosImportados = await prisma.user.findMany({
      where: { clickDoctorId: { not: null } },
      select: { clickDoctorId: true },
    });

    const idsImportados = new Set(medicosImportados.map((m) => m.clickDoctorId));

    return medicosClick.map((medico) => ({
      ...medico,
      jaImportado: idsImportados.has(medico.doctor_id),
    }));
  }),

  diagnosticoMedicosClick: adminProcedure.query(async () => {
    if (!process.env.CLICK_REPLICA_DATABASE_URL) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "Conexao com banco Click nao configurada (CLICK_REPLICA_DATABASE_URL)",
      });
    }

    const [diagnostico] = await clickQueries.getDiagnosticoMedicos();
    
    return {
      total_doctors: Number(diagnostico?.total_doctors ?? 0),
      filtrados: {
        sem_nome: Number(diagnostico?.sem_nome ?? 0),
        nome_teste: Number(diagnostico?.nome_teste ?? 0),
        priority_zero_ou_negativo: Number(diagnostico?.priority_zero_ou_negativo ?? 0),
        sem_schedule: Number(diagnostico?.sem_schedule ?? 0),
        schedule_vazio: Number(diagnostico?.schedule_vazio ?? 0),
      },
      ativos_final: Number(diagnostico?.ativos_final ?? 0),
    };
  }),

  importarMedicos: adminProcedure
    .input(
      z.object({
        doctorIds: z.array(z.number()),
      })
    )
    .mutation(async ({ input }) => {
      const medicosClick = await clickQueries.getTodosMedicos();
      const medicosParaImportar = medicosClick.filter((m) =>
        input.doctorIds.includes(m.doctor_id)
      );

      const existentes = await prisma.user.findMany({
        where: {
          OR: [
            { clickDoctorId: { in: input.doctorIds } },
            { email: { in: medicosParaImportar.map((m) => m.email) } },
          ],
        },
        select: { email: true, clickDoctorId: true },
      });

      const emailsExistentes = new Set(existentes.map((e) => e.email));
      const idsExistentes = new Set(existentes.map((e) => e.clickDoctorId));

      const novos = medicosParaImportar.filter(
        (m) => !emailsExistentes.has(m.email) && !idsExistentes.has(m.doctor_id)
      );

      if (novos.length === 0) {
        return { importados: 0, ignorados: input.doctorIds.length };
      }

      const senhaHasheada = await hashPassword("medico123");

      const operacoes = novos.flatMap((medico) => {
        const novoUserId = crypto.randomUUID();
        return [
          prisma.user.create({
            data: {
              id: novoUserId,
              name: medico.name,
              email: medico.email,
              tipo: "medico",
              faixa: "P5",
              clickDoctorId: medico.doctor_id,
              crm: medico.crm,
              ativo: true,
            },
          }),
          prisma.account.create({
            data: {
              id: crypto.randomUUID(),
              userId: novoUserId,
              accountId: novoUserId,
              providerId: "credential",
              password: senhaHasheada,
            },
          }),
        ];
      });

      await prisma.$transaction(operacoes);

      return {
        importados: novos.length,
        ignorados: input.doctorIds.length - novos.length,
      };
    }),

  sincronizarMedicos: staffProcedure.mutation(async ({ ctx }) => {
    if (!process.env.CLICK_REPLICA_DATABASE_URL) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "Conexao com banco Click nao configurada (CLICK_REPLICA_DATABASE_URL)",
      });
    }

    const medicosClick = await clickQueries.getTodosMedicos();

    const existentes = await prisma.user.findMany({
      where: { clickDoctorId: { not: null } },
      select: { id: true, email: true, clickDoctorId: true, name: true, crm: true },
    });

    const mapExistentes = new Map(
      existentes.map((e) => [e.clickDoctorId, e])
    );

    let novos = 0;
    let atualizados = 0;
    const erros: Array<{ doctorId: number; erro: string }> = [];
    const senhaHasheada = await hashPassword("medico123");

    for (const medico of medicosClick) {
      try {
        const existente = mapExistentes.get(medico.doctor_id);

        if (existente) {
          const dadosMudaram = existente.name !== medico.name || existente.email !== medico.email || existente.crm !== medico.crm;
          if (dadosMudaram) {
            await prisma.user.update({
              where: { id: existente.id },
              data: {
                name: medico.name,
                email: medico.email,
                crm: medico.crm,
              },
            });
            atualizados++;
          }
        } else {
          const emailJaExiste = await prisma.user.findUnique({
            where: { email: medico.email },
          });

          if (!emailJaExiste) {
            const novoUserId = crypto.randomUUID();
            await prisma.$transaction([
              prisma.user.create({
                data: {
                  id: novoUserId,
                  name: medico.name,
                  email: medico.email,
                  tipo: "medico",
                  faixa: "P5",
                  clickDoctorId: medico.doctor_id,
                  crm: medico.crm,
                  ativo: true,
                },
              }),
              prisma.account.create({
                data: {
                  id: crypto.randomUUID(),
                  userId: novoUserId,
                  accountId: novoUserId,
                  providerId: "credential",
                  password: senhaHasheada,
                },
              }),
            ]);
            novos++;
          }
        }
      } catch (error) {
        erros.push({
          doctorId: medico.doctor_id,
          erro: error instanceof Error ? error.message : "Erro desconhecido",
        });
      }
    }

    await prisma.auditoria.create({
      data: {
        usuarioId: ctx.user.id,
        usuarioNome: ctx.user.name,
        acao: "SINCRONIZAR_MEDICOS",
        entidade: "user",
        dadosDepois: {
          totalClick: medicosClick.length,
          novos,
          atualizados,
          erros: erros.length,
        },
      },
    });

    return { novos, atualizados, erros: erros.length, totalClick: medicosClick.length };
  }),

  criarStaff: adminProcedure
    .input(
      z.object({
        name: z.string().min(2),
        email: z.string().email(),
        tipo: z.enum(["atendente", "diretor", "admin"]),
        senha: z.string().min(6),
      })
    )
    .mutation(async ({ input }) => {
      const existente = await prisma.user.findUnique({
        where: { email: input.email },
      });

      if (existente) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Email ja cadastrado",
        });
      }

      const user = await prisma.user.create({
        data: {
          id: crypto.randomUUID(),
          name: input.name,
          email: input.email,
          tipo: input.tipo,
          ativo: true,
        },
      });

      await prisma.account.create({
        data: {
          id: crypto.randomUUID(),
          userId: user.id,
          accountId: user.id,
          providerId: "credential",
          password: input.senha,
        },
      });

      return user;
    }),

  alterarStatus: adminProcedure
    .input(
      z.object({
        userId: z.string(),
        ativo: z.boolean(),
      })
    )
    .mutation(async ({ input }) => {
      return prisma.user.update({
        where: { id: input.userId },
        data: { ativo: input.ativo },
      });
    }),

  alterarFaixaFixa: adminProcedure
    .input(
      z.object({
        medicoId: z.string(),
        faixaFixa: z.boolean(),
        faixa: FaixaEnum.optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const medico = await prisma.user.findUnique({
        where: { id: input.medicoId },
      });

      if (!medico || medico.tipo !== "medico") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Usuario nao e um medico",
        });
      }

      const updateData: { faixaFixa: boolean; faixa?: "P1" | "P2" | "P3" | "P4" | "P5" } = {
        faixaFixa: input.faixaFixa,
      };

      if (input.faixaFixa && input.faixa) {
        updateData.faixa = input.faixa;
      }

      const updated = await prisma.user.update({
        where: { id: input.medicoId },
        data: updateData,
      });

      await prisma.auditoria.create({
        data: {
          usuarioId: ctx.user.id,
          usuarioNome: ctx.user.name,
          acao: input.faixaFixa ? "FAIXA_FIXA_ATIVADA" : "FAIXA_FIXA_DESATIVADA",
          entidade: "user",
          entidadeId: input.medicoId,
          dadosAntes: { faixaFixa: medico.faixaFixa, faixa: medico.faixa },
          dadosDepois: { faixaFixa: input.faixaFixa, faixa: input.faixa || medico.faixa },
        },
      });

      return updated;
    }),

  alterarFaixa: adminProcedure
    .input(
      z.object({
        userId: z.string(),
        faixa: FaixaEnum,
      })
    )
    .mutation(async ({ input }) => {
      const medico = await prisma.user.findUnique({
        where: { id: input.userId },
      });

      if (!medico || medico.tipo !== "medico") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Usuario nao e um medico",
        });
      }

      return prisma.user.update({
        where: { id: input.userId },
        data: { faixa: input.faixa },
      });
    }),

  resetarStrikes: adminProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ input }) => {
      return prisma.user.update({
        where: { id: input.userId },
        data: { strikes: 0 },
      });
    }),

  alterarSenha: staffProcedure
    .input(
      z.object({
        userId: z.string(),
        novaSenha: z.string().min(6),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const user = await prisma.user.findUnique({
        where: { id: input.userId },
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Usuario nao encontrado",
        });
      }

      const hashedPassword = await hashPassword(input.novaSenha);
      
      await prisma.account.updateMany({
        where: { userId: input.userId, providerId: "credential" },
        data: { password: hashedPassword },
      });

      await prisma.auditoria.create({
        data: {
          usuarioId: ctx.user.id,
          usuarioNome: ctx.user.name,
          acao: "ALTERAR_SENHA",
          entidade: "user",
          entidadeId: input.userId,
          dadosDepois: { alteradoPor: ctx.user.name },
        },
      });

      return { success: true };
    }),

  atualizarFoto: staffProcedure
    .input(
      z.object({
        medicoId: z.string(),
        imageUrl: z.string().url(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const medico = await prisma.user.findUnique({
        where: { id: input.medicoId },
      });

      if (!medico) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Medico nao encontrado",
        });
      }

      await prisma.user.update({
        where: { id: input.medicoId },
        data: { image: input.imageUrl },
      });

      await prisma.auditoria.create({
        data: {
          usuarioId: ctx.user.id,
          usuarioNome: ctx.user.name,
          acao: "ATUALIZAR_FOTO_MEDICO",
          entidade: "user",
          entidadeId: input.medicoId,
          dadosDepois: { imageUrl: input.imageUrl },
        },
      });

      return { success: true, imageUrl: input.imageUrl };
    }),

  estatisticas: staffProcedure.query(async () => {
    const [totalMedicos, totalStaff, medicosPorFaixa, medicosAtivos] = await Promise.all([
      prisma.user.count({ where: { tipo: "medico" } }),
      prisma.user.count({ where: { tipo: { in: ["atendente", "diretor", "admin"] } } }),
      prisma.user.groupBy({
        by: ["faixa"],
        where: { tipo: "medico" },
        _count: true,
      }),
      prisma.user.count({ where: { tipo: "medico", ativo: true } }),
    ]);

    return {
      totalMedicos,
      totalStaff,
      medicosAtivos,
      medicosPorFaixa: medicosPorFaixa.reduce(
        (acc, item) => {
          acc[item.faixa] = item._count;
          return acc;
        },
        {} as Record<string, number>
      ),
    };
  }),

  criarObservacao: staffProcedure
    .input(
      z.object({
        medicoId: z.string(),
        conteudo: z.string().min(1).max(5000),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const medico = await prisma.user.findUnique({
        where: { id: input.medicoId },
      });

      if (!medico || medico.tipo !== "medico") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Medico nao encontrado",
        });
      }

      return prisma.medicoObservacao.create({
        data: {
          medicoId: input.medicoId,
          autorId: ctx.user.id,
          conteudo: input.conteudo,
        },
        include: {
          autor: {
            select: { id: true, name: true },
          },
        },
      });
    }),

  editarObservacao: staffProcedure
    .input(
      z.object({
        observacaoId: z.string(),
        conteudo: z.string().min(1).max(5000),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const observacao = await prisma.medicoObservacao.findUnique({
        where: { id: input.observacaoId },
      });

      if (!observacao) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Observacao nao encontrada",
        });
      }

      if (observacao.autorId !== ctx.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Voce so pode editar suas proprias observacoes",
        });
      }

      return prisma.medicoObservacao.update({
        where: { id: input.observacaoId },
        data: { conteudo: input.conteudo },
        include: {
          autor: {
            select: { id: true, name: true },
          },
        },
      });
    }),

  deletarObservacao: staffProcedure
    .input(z.object({ observacaoId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const observacao = await prisma.medicoObservacao.findUnique({
        where: { id: input.observacaoId },
      });

      if (!observacao) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Observacao nao encontrada",
        });
      }

      if (observacao.autorId !== ctx.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Voce so pode deletar suas proprias observacoes",
        });
      }

      await prisma.medicoObservacao.delete({
        where: { id: input.observacaoId },
      });

      return { success: true };
    }),
});
