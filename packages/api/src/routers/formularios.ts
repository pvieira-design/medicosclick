import { z } from "zod";
import prisma from "@clickmedicos/db";
import { router, medicoProcedure, staffProcedure } from "../index";
import { TRPCError } from "@trpc/server";
import { enviarEmailSatisfacaoPendente } from "../services/email.service";

const mesReferenciaSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, {
  message: "Formato invalido. Use YYYY-MM (ex: 2026-01)",
});

const npsSchema = z.number().int().min(0).max(10, {
  message: "NPS deve ser um numero inteiro entre 0 e 10",
});

const detalhesPessoaisInputSchema = z.object({
  tamanhoCamisa: z.string().optional().nullable(),
  tamanhoCalcado: z.string().optional().nullable(),
  corFavorita: z.string().optional().nullable(),
  dataAniversario: z.date().optional().nullable(),
  cep: z.string().optional().nullable(),
  rua: z.string().optional().nullable(),
  numero: z.string().optional().nullable(),
  complemento: z.string().optional().nullable(),
  bairro: z.string().optional().nullable(),
  cidade: z.string().optional().nullable(),
  estado: z.string().optional().nullable(),
  hobbies: z.string().optional().nullable(),
  pets: z.string().optional().nullable(),
  destinoViagem: z.string().optional().nullable(),
  esportePratica: z.string().optional().nullable(),
  marcaRoupa: z.string().optional().nullable(),
});

const satisfacaoInputSchema = z.object({
  npsSuporte: npsSchema,
  npsFerramentas: npsSchema,
  sugestoes: z.string().default(""),
});

/** Janela de resposta: dias 1-15 do mes (America/Sao_Paulo) */
function estaDentroJanelaResposta(): boolean {
  return true;
  // const agora = new Date();
  // const spDate = new Date(agora.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  // const diaDoMes = spDate.getDate();
  // return diaDoMes >= 1 && diaDoMes <= 15;
}

/** Retorna mes atual no formato YYYY-MM (America/Sao_Paulo) */
function getMesReferenciaAtual(): string {
  const agora = new Date();
  const spDate = new Date(agora.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  const ano = spDate.getFullYear();
  const mes = String(spDate.getMonth() + 1).padStart(2, "0");
  return `${ano}-${mes}`;
}

export const formulariosRouter = router({
  getDetalhesPessoais: medicoProcedure.query(async ({ ctx }) => {
    const detalhes = await prisma.medicoDetalhesPessoais.findUnique({
      where: { userId: ctx.medico.id },
    });

    return detalhes;
  }),

  upsertDetalhesPessoais: medicoProcedure
    .input(detalhesPessoaisInputSchema)
    .mutation(async ({ ctx, input }) => {
      const detalhes = await prisma.medicoDetalhesPessoais.upsert({
        where: { userId: ctx.medico.id },
        create: {
          userId: ctx.medico.id,
          ...input,
        },
        update: input,
      });

      return detalhes;
    }),

  getDetalhesPessoaisByMedico: staffProcedure
    .input(z.object({ medicoId: z.string() }))
    .query(async ({ input }) => {
      const detalhes = await prisma.medicoDetalhesPessoais.findUnique({
        where: { userId: input.medicoId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      return detalhes;
    }),

  listarMedicosSemDetalhes: staffProcedure.query(async () => {
    const medicosComDetalhes = await prisma.medicoDetalhesPessoais.findMany({
      select: { userId: true },
    });

    const idsComDetalhes = medicosComDetalhes.map((d) => d.userId);

    const medicosSemDetalhes = await prisma.user.findMany({
      where: {
        tipo: "medico",
        ativo: true,
        id: { notIn: idsComDetalhes },
      },
      select: {
        id: true,
        name: true,
        email: true,
        faixa: true,
      },
      orderBy: { name: "asc" },
    });

    return medicosSemDetalhes;
  }),

  getSatisfacaoAtual: medicoProcedure.query(async ({ ctx }) => {
    const mesReferencia = getMesReferenciaAtual();
    const dentroJanela = estaDentroJanelaResposta();

    const satisfacao = await prisma.satisfacaoMensal.findUnique({
      where: {
        userId_mesReferencia: {
          userId: ctx.medico.id,
          mesReferencia,
        },
      },
    });

    return {
      mesReferencia,
      dentroJanela,
      jaRespondeu: !!satisfacao,
      resposta: satisfacao,
    };
  }),

  responderSatisfacao: medicoProcedure
    .input(satisfacaoInputSchema)
    .mutation(async ({ ctx, input }) => {
      const mesReferencia = getMesReferenciaAtual();

      const existente = await prisma.satisfacaoMensal.findUnique({
        where: {
          userId_mesReferencia: {
            userId: ctx.medico.id,
            mesReferencia,
          },
        },
      });

      if (existente) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Voce ja respondeu a pesquisa de satisfacao deste mes",
        });
      }

      const satisfacao = await prisma.satisfacaoMensal.create({
        data: {
          userId: ctx.medico.id,
          mesReferencia,
          npsSuporte: input.npsSuporte,
          npsFerramentas: input.npsFerramentas,
          sugestoes: input.sugestoes,
          respondidoEm: new Date(),
        },
      });

      return satisfacao;
    }),

  getHistoricoSatisfacao: medicoProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        perPage: z.number().min(1).max(50).default(12),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const page = input?.page ?? 1;
      const perPage = input?.perPage ?? 12;

      const [respostas, total] = await Promise.all([
        prisma.satisfacaoMensal.findMany({
          where: { userId: ctx.medico.id },
          orderBy: { mesReferencia: "desc" },
          skip: (page - 1) * perPage,
          take: perPage,
        }),
        prisma.satisfacaoMensal.count({
          where: { userId: ctx.medico.id },
        }),
      ]);

      return {
        respostas,
        total,
        pages: Math.ceil(total / perPage),
      };
    }),

  listarMedicosPendentes: staffProcedure.query(async () => {
    const mesReferencia = getMesReferenciaAtual();

    const medicosQueResponderam = await prisma.satisfacaoMensal.findMany({
      where: { mesReferencia },
      select: { userId: true },
    });

    const idsQueResponderam = medicosQueResponderam.map((s) => s.userId);

    const medicosPendentes = await prisma.user.findMany({
      where: {
        tipo: "medico",
        ativo: true,
        id: { notIn: idsQueResponderam },
      },
      select: {
        id: true,
        name: true,
        email: true,
        faixa: true,
      },
      orderBy: { name: "asc" },
    });

    return {
      mesReferencia,
      dentroJanela: estaDentroJanelaResposta(),
      medicosPendentes,
      totalPendentes: medicosPendentes.length,
    };
  }),

  listarMedicosQueResponderam: staffProcedure
    .input(
      z.object({
        mesReferencia: mesReferenciaSchema.optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      const mesReferencia = input?.mesReferencia ?? getMesReferenciaAtual();

      const respostas = await prisma.satisfacaoMensal.findMany({
        where: { mesReferencia },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              faixa: true,
              image: true,
            },
          },
        },
        orderBy: { respondidoEm: "desc" },
      });

      return {
        mesReferencia,
        respostas,
        totalRespostas: respostas.length,
      };
    }),

  getEstatisticasSatisfacao: staffProcedure.query(async () => {
    const mesReferencia = getMesReferenciaAtual();

    const [totalMedicosAtivos, agregados] = await Promise.all([
      prisma.user.count({
        where: {
          tipo: "medico",
          ativo: true,
        },
      }),
      prisma.satisfacaoMensal.aggregate({
        where: { mesReferencia },
        _avg: {
          npsSuporte: true,
          npsFerramentas: true,
        },
        _count: true,
      }),
    ]);

    const totalResponderam = agregados._count;
    const totalPendentes = totalMedicosAtivos - totalResponderam;
    const mediaSuporte = agregados._avg.npsSuporte ?? 0;
    const mediaFerramentas = agregados._avg.npsFerramentas ?? 0;

    return {
      mesReferencia,
      dentroJanela: estaDentroJanelaResposta(),
      totalMedicosAtivos,
      totalResponderam,
      totalPendentes,
      mediaSuporte: Number(mediaSuporte.toFixed(1)),
      mediaFerramentas: Number(mediaFerramentas.toFixed(1)),
      mediaGeral: Number(((mediaSuporte + mediaFerramentas) / 2).toFixed(1)),
    };
  }),

  getHistoricoSatisfacaoByMedico: staffProcedure
    .input(
      z.object({
        medicoId: z.string(),
      })
    )
    .query(async ({ input }) => {
      const respostas = await prisma.satisfacaoMensal.findMany({
        where: { userId: input.medicoId },
        orderBy: { mesReferencia: "desc" },
        take: 12,
      });

      return respostas;
    }),

  getNpsGeral: staffProcedure
    .input(
      z.object({
        mesReferencia: mesReferenciaSchema.optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      const mesReferencia = input?.mesReferencia ?? getMesReferenciaAtual();

      const resultado = await prisma.satisfacaoMensal.aggregate({
        where: { mesReferencia },
        _avg: {
          npsSuporte: true,
          npsFerramentas: true,
        },
        _count: true,
      });

      const mediaSuporte = resultado._avg.npsSuporte ?? 0;
      const mediaFerramentas = resultado._avg.npsFerramentas ?? 0;
      const mediaGeral = (mediaSuporte + mediaFerramentas) / 2;

      return {
        mesReferencia,
        mediaGeral: Number(mediaGeral.toFixed(2)),
        mediaSuporte: Number(mediaSuporte.toFixed(2)),
        mediaFerramentas: Number(mediaFerramentas.toFixed(2)),
        totalRespostas: resultado._count,
      };
    }),

  getNpsPorCategoria: staffProcedure
    .input(
      z.object({
        mesReferencia: mesReferenciaSchema.optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      const mesReferencia = input?.mesReferencia ?? getMesReferenciaAtual();

      const resultado = await prisma.satisfacaoMensal.aggregate({
        where: { mesReferencia },
        _avg: {
          npsSuporte: true,
          npsFerramentas: true,
        },
        _count: true,
      });

      const respostas = await prisma.satisfacaoMensal.findMany({
        where: { mesReferencia },
        select: {
          npsSuporte: true,
          npsFerramentas: true,
        },
      });

      const calcularDistribuicao = (scores: number[]) => {
        const promotores = scores.filter((s) => s >= 9).length;
        const neutros = scores.filter((s) => s >= 7 && s <= 8).length;
        const detratores = scores.filter((s) => s <= 6).length;
        const total = scores.length;

        return {
          promotores,
          neutros,
          detratores,
          percentualPromotores: total > 0 ? Number(((promotores / total) * 100).toFixed(1)) : 0,
          percentualNeutros: total > 0 ? Number(((neutros / total) * 100).toFixed(1)) : 0,
          percentualDetratores: total > 0 ? Number(((detratores / total) * 100).toFixed(1)) : 0,
          nps: total > 0 ? Number((((promotores - detratores) / total) * 100).toFixed(1)) : 0,
        };
      };

      return {
        mesReferencia,
        totalRespostas: resultado._count,
        suporte: {
          media: Number((resultado._avg.npsSuporte ?? 0).toFixed(2)),
          ...calcularDistribuicao(respostas.map((r) => r.npsSuporte)),
        },
        ferramentas: {
          media: Number((resultado._avg.npsFerramentas ?? 0).toFixed(2)),
          ...calcularDistribuicao(respostas.map((r) => r.npsFerramentas)),
        },
      };
    }),

  getEvolucaoNps: staffProcedure
    .input(
      z.object({
        meses: z.number().min(3).max(24).default(12),
      }).optional()
    )
    .query(async ({ input }) => {
      const meses = input?.meses ?? 12;

      const mesesParaBuscar: string[] = [];
      const agora = new Date();
      
      for (let i = 0; i < meses; i++) {
        const data = new Date(agora.getFullYear(), agora.getMonth() - i, 1);
        const ano = data.getFullYear();
        const mes = String(data.getMonth() + 1).padStart(2, "0");
        mesesParaBuscar.push(`${ano}-${mes}`);
      }

      const respostas = await prisma.satisfacaoMensal.findMany({
        where: {
          mesReferencia: { in: mesesParaBuscar },
        },
        select: {
          mesReferencia: true,
          npsSuporte: true,
          npsFerramentas: true,
        },
      });

      const porMes = new Map<string, { suporte: number[]; ferramentas: number[] }>();
      
      for (const mesRef of mesesParaBuscar) {
        porMes.set(mesRef, { suporte: [], ferramentas: [] });
      }

      for (const resposta of respostas) {
        const grupo = porMes.get(resposta.mesReferencia);
        if (grupo) {
          grupo.suporte.push(resposta.npsSuporte);
          grupo.ferramentas.push(resposta.npsFerramentas);
        }
      }

      const evolucao = mesesParaBuscar.map((mesRef) => {
        const grupo = porMes.get(mesRef)!;
        const mediaSuporte = grupo.suporte.length > 0
          ? grupo.suporte.reduce((a, b) => a + b, 0) / grupo.suporte.length
          : null;
        const mediaFerramentas = grupo.ferramentas.length > 0
          ? grupo.ferramentas.reduce((a, b) => a + b, 0) / grupo.ferramentas.length
          : null;
        const mediaGeral = mediaSuporte !== null && mediaFerramentas !== null
          ? (mediaSuporte + mediaFerramentas) / 2
          : null;

        return {
          mesReferencia: mesRef,
          mediaSuporte: mediaSuporte !== null ? Number(mediaSuporte.toFixed(2)) : null,
          mediaFerramentas: mediaFerramentas !== null ? Number(mediaFerramentas.toFixed(2)) : null,
          mediaGeral: mediaGeral !== null ? Number(mediaGeral.toFixed(2)) : null,
          totalRespostas: grupo.suporte.length,
        };
      });

      evolucao.reverse();

      return evolucao;
    }),

  getSugestoesRecentes: staffProcedure
    .input(
      z.object({
        limite: z.number().min(1).max(100).default(20),
        mesReferencia: mesReferenciaSchema.optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      const limite = input?.limite ?? 20;
      const mesReferencia = input?.mesReferencia;

      const where = {
        sugestoes: { not: null },
        ...(mesReferencia && { mesReferencia }),
      };

      const sugestoes = await prisma.satisfacaoMensal.findMany({
        where,
        select: {
          id: true,
          mesReferencia: true,
          sugestoes: true,
          npsSuporte: true,
          npsFerramentas: true,
          respondidoEm: true,
          user: {
            select: {
              id: true,
              name: true,
              faixa: true,
            },
          },
        },
        orderBy: { respondidoEm: "desc" },
        take: limite,
      });

      return sugestoes;
    }),

  reenviarNotificacaoSatisfacao: staffProcedure
    .input(
      z.object({
        medicoIds: z.array(z.string()).min(1, "Selecione pelo menos um médico"),
        tipoEnvio: z.enum(['notificacao', 'email', 'ambos']).default('ambos'),
      })
    )
    .mutation(async ({ input }) => {
      const mesReferencia = getMesReferenciaAtual();
      const emailsEnviados: string[] = [];
      const erros: Array<{ medicoId: string; erro: string }> = [];

      for (const medicoId of input.medicoIds) {
        try {
          const medico = await prisma.user.findUnique({
            where: { id: medicoId },
            select: {
              id: true,
              name: true,
              email: true,
            },
          });

          if (!medico) {
            erros.push({
              medicoId,
              erro: "Médico não encontrado",
            });
            continue;
          }

          if (input.tipoEnvio === 'email' || input.tipoEnvio === 'ambos') {
            if (!medico.email) {
              erros.push({
                medicoId,
                erro: "Médico sem email cadastrado",
              });
              continue;
            }

            const resultadoEmail = await enviarEmailSatisfacaoPendente(
              medico.email,
              medico.name || "Médico",
              mesReferencia
            );

            if (!resultadoEmail.success) {
              erros.push({
                medicoId,
                erro: resultadoEmail.error || "Erro ao enviar email",
              });
              continue;
            }
          }

          if (input.tipoEnvio === 'notificacao' || input.tipoEnvio === 'ambos') {
            await prisma.notificacao.create({
              data: {
                usuarioId: medicoId,
                tipo: "satisfacao_pendente",
                titulo: "Pesquisa de Satisfação Pendente",
                mensagem: "Responda à pesquisa de satisfação do mês",
              },
            });
          }

          emailsEnviados.push(medicoId);
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : "Erro desconhecido";
          erros.push({
            medicoId,
            erro: errorMessage,
          });
        }
      }

      return {
        totalProcessados: input.medicoIds.length,
        emailsEnviados: emailsEnviados.length,
        erros,
        sucesso: erros.length === 0,
      };
    }),
});
