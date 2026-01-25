import { z } from "zod";
import prisma from "@clickmedicos/db";
import { clickQueries } from "@clickmedicos/db/click-replica";
import { router, medicoProcedure, publicProcedure } from "../index";
import { getVidaasService } from "../services/vidaas.service";
import { TRPCError } from "@trpc/server";

const ReceitaStatus = {
  RASCUNHO: "RASCUNHO",
  PENDENTE_ASSINATURA: "PENDENTE_ASSINATURA",
  ASSINADA: "ASSINADA",
  CANCELADA: "CANCELADA",
} as const;

const produtoSchema = z.object({
  nome: z.string().min(1),
  concentracao: z.string().optional(),
  apresentacao: z.string().optional(),
  quantidade: z.number().int().positive(),
  posologia: z.string().min(1),
});

export const receitaRouter = router({
  listarConsultasRecentes: medicoProcedure
    .input(z.object({ limit: z.number().min(1).max(50).default(20) }))
    .query(async ({ ctx, input }) => {
      if (!ctx.medico.clickDoctorId) {
        return [];
      }

      try {
        return await clickQueries.buscarConsultasRecentesMedico(
          ctx.medico.clickDoctorId,
          input.limit
        );
      } catch (error) {
        console.error("[listarConsultasRecentes] Erro:", error);
        return [];
      }
    }),

  buscarDadosConsulta: medicoProcedure
    .input(z.object({ consultingId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.medico.clickDoctorId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Médico não vinculado ao Click",
        });
      }

      try {
        const [anamneseResult] = await clickQueries.buscarDadosAnamnese(input.consultingId);
        
        const consultas = await clickQueries.buscarConsultasRecentesMedico(
          ctx.medico.clickDoctorId,
          100
        );
        
        const consulta = consultas.find((c) => c.id === input.consultingId);
        
        if (!consulta) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Consulta não encontrada ou não pertence a este médico",
          });
        }

        let pacienteNome = consulta.patient_name || "";
        let pacienteEndereco = "";
        let patologias: string[] = [];
        let motivoBusca = "";

        if (anamneseResult?.data && Array.isArray(anamneseResult.data)) {
          const anamneseData = anamneseResult.data as Array<{ question: string; answer: unknown }>;
          
          const nomeItem = anamneseData.find((item) => 
            item.question?.toLowerCase().includes("nome completo")
          );
          if (nomeItem && typeof nomeItem.answer === "string") {
            pacienteNome = nomeItem.answer;
          }

          const condicoesItem = anamneseData.find((item) => 
            item.question?.toLowerCase().includes("condição clínica")
          );
          if (condicoesItem && Array.isArray(condicoesItem.answer)) {
            patologias.push(...condicoesItem.answer.filter(v => typeof v === 'string' && v.trim()));
          }

          const problemaItem = anamneseData.find((item) => 
            item.question?.toLowerCase().includes("problema de saúde")
          );
          if (problemaItem && typeof problemaItem.answer === "string" && problemaItem.answer.trim()) {
            patologias.push(problemaItem.answer.trim());
          }

          const motivoItem = anamneseData.find((item) => 
            item.question?.toLowerCase().includes("buscando a cannabis")
          );
          if (motivoItem && typeof motivoItem.answer === "string") {
            motivoBusca = motivoItem.answer.trim();
          }
        }

        return {
          paciente: {
            nome: pacienteNome,
            endereco: pacienteEndereco,
          },
          patologias: [...new Set(patologias)],
          motivoBusca,
          anamnese: anamneseResult?.data ?? null,
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("[buscarDadosConsulta] Erro:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erro ao buscar dados da consulta",
        });
      }
    }),

  listarProdutos: medicoProcedure.query(async () => {
    try {
      const produtos = await clickQueries.buscarProdutos();
      // Transform "title" to "name" for frontend compatibility
      return produtos.map((p) => ({
        id: p.id,
        name: p.title,
        formula: p.formula,
        type: p.type,
        volume: p.volume,
        price: p.price,
      }));
    } catch (error) {
      console.error("[listarProdutos] Erro:", error);
      return [];
    }
  }),

   criarReceita: medicoProcedure
     .input(
       z.object({
         consultaClickId: z.number().int().positive().optional(),
         pacienteNome: z.string().min(1),
         pacienteEndereco: z.string().optional(),
         pacienteCpf: z.string().optional(),
         produtos: z.array(produtoSchema).min(1),
         posologia: z.string().min(1),
         alertas: z.string().optional(),
         observacoes: z.string().optional(),
       })
     )
     .mutation(async ({ ctx, input }) => {
       const dataValidade = new Date();
       dataValidade.setMonth(dataValidade.getMonth() + 6);

       const receita = await prisma.receita.create({
         data: {
           medicoId: ctx.medico.id,
           consultaClickId: input.consultaClickId,
           pacienteNome: input.pacienteNome,
           pacienteEndereco: input.pacienteEndereco,
           pacienteCpf: input.pacienteCpf,
           produtos: input.produtos,
           posologia: input.posologia,
           alertas: input.alertas,
           observacoes: input.observacoes,
           status: ReceitaStatus.RASCUNHO,
           dataValidade,
         },
       });

      await prisma.receitaAuditoria.create({
        data: {
          receitaId: receita.id,
          acao: "CRIADA",
          medicoId: ctx.medico.id,
        },
      });

      return receita;
    }),

   atualizarReceita: medicoProcedure
     .input(
       z.object({
         receitaId: z.string().uuid(),
         pacienteNome: z.string().min(1).optional(),
         pacienteEndereco: z.string().optional(),
         pacienteCpf: z.string().optional(),
         produtos: z.array(produtoSchema).min(1).optional(),
         posologia: z.string().min(1).optional(),
         alertas: z.string().optional(),
         observacoes: z.string().optional(),
       })
     )
     .mutation(async ({ ctx, input }) => {
       const receita = await prisma.receita.findUnique({
         where: { id: input.receitaId },
       });

       if (!receita) {
         throw new TRPCError({
           code: "NOT_FOUND",
           message: "Receita não encontrada",
         });
       }

       if (receita.medicoId !== ctx.medico.id) {
         throw new TRPCError({
           code: "FORBIDDEN",
           message: "Você não tem permissão para editar esta receita",
         });
       }

       if (receita.status === ReceitaStatus.ASSINADA) {
         throw new TRPCError({
           code: "BAD_REQUEST",
           message: "Receitas assinadas não podem ser editadas",
         });
       }

       const { receitaId, ...updateData } = input;

       const receitaAtualizada = await prisma.receita.update({
         where: { id: receitaId },
         data: updateData,
       });

      await prisma.receitaAuditoria.create({
        data: {
          receitaId: receitaId,
          acao: "ATUALIZADA",
          medicoId: ctx.medico.id,
        },
      });

      return receitaAtualizada;
    }),

  assinarReceita: medicoProcedure
    .input(z.object({ receitaId: z.string().uuid(), pdfBase64: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const receita = await prisma.receita.findUnique({
        where: { id: input.receitaId },
      });

      if (!receita) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Receita não encontrada",
        });
      }

      if (receita.medicoId !== ctx.medico.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Você não tem permissão para assinar esta receita",
        });
      }

      if (receita.status === ReceitaStatus.ASSINADA) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Receita já está assinada",
        });
      }

      const medico = await prisma.user.findUnique({
        where: { id: ctx.medico.id },
        select: { cpf: true },
      });

      if (!medico?.cpf) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "CPF do médico não cadastrado. Configure seu CPF nas configurações.",
        });
      }

      await prisma.receita.update({
        where: { id: input.receitaId },
        data: { status: ReceitaStatus.PENDENTE_ASSINATURA },
      });

      try {
        const vidaasService = getVidaasService();

        const resultado = await vidaasService.assinarReceita(
          medico.cpf,
          input.pdfBase64,
          input.receitaId
        );

        await prisma.receita.update({
          where: { id: input.receitaId },
          data: {
            status: ReceitaStatus.ASSINADA,
            pdfUrl: `data:application/pdf;base64,${resultado.pdfAssinadoBase64}`,
          },
        });

        await prisma.receitaAuditoria.create({
          data: {
            receitaId: input.receitaId,
            acao: "ASSINADA",
            medicoId: ctx.medico.id,
          },
        });

        return {
          success: true,
          pdfUrl: `data:application/pdf;base64,${resultado.pdfAssinadoBase64}`,
        };
      } catch (error) {
        await prisma.receita.update({
          where: { id: input.receitaId },
          data: { status: ReceitaStatus.RASCUNHO },
        });

        console.error("[assinarReceita] Erro VIDaaS:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Erro ao assinar receita",
        });
      }
    }),

  statusAssinatura: medicoProcedure
    .input(z.object({ receitaId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const receita = await prisma.receita.findUnique({
        where: { id: input.receitaId },
        select: { id: true, status: true, pdfUrl: true, medicoId: true },
      });

      if (!receita) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Receita não encontrada",
        });
      }

      if (receita.medicoId !== ctx.medico.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Você não tem permissão para acessar esta receita",
        });
      }

      return {
        status: receita.status,
        pdfUrl: receita.pdfUrl,
        assinada: receita.status === ReceitaStatus.ASSINADA,
      };
    }),

  atualizarPdfAssinado: medicoProcedure
    .input(z.object({ receitaId: z.string().uuid(), pdfBase64: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const receita = await prisma.receita.findUnique({
        where: { id: input.receitaId },
        select: { id: true, status: true, medicoId: true },
      });

      if (!receita) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Receita não encontrada" });
      }

      if (receita.medicoId !== ctx.medico.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Sem permissão" });
      }

      if (receita.status !== ReceitaStatus.ASSINADA) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Receita não está assinada" });
      }

      await prisma.receita.update({
        where: { id: input.receitaId },
        data: { pdfUrl: `data:application/pdf;base64,${input.pdfBase64}` },
      });

      return { success: true };
    }),

  listarReceitas: medicoProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(50).default(10),
        status: z.enum(["RASCUNHO", "PENDENTE_ASSINATURA", "ASSINADA", "CANCELADA"]).optional(),
        dataInicio: z.date().optional(),
        dataFim: z.date().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const where = {
        medicoId: ctx.medico.id,
        ...(input.status && { status: input.status }),
        ...(input.dataInicio && {
          createdAt: {
            gte: input.dataInicio,
            ...(input.dataFim && { lte: input.dataFim }),
          },
        }),
      };

      const [receitas, total] = await Promise.all([
        prisma.receita.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip: (input.page - 1) * input.limit,
          take: input.limit,
          select: {
            id: true,
            status: true,
            pacienteNome: true,
            dataEmissao: true,
            dataValidade: true,
            pdfUrl: true,
            createdAt: true,
          },
        }),
        prisma.receita.count({ where }),
      ]);

      return {
        receitas,
        total,
        pages: Math.ceil(total / input.limit),
        page: input.page,
      };
    }),

  buscarReceita: medicoProcedure
    .input(z.object({ receitaId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const receita = await prisma.receita.findUnique({
        where: { id: input.receitaId },
        include: {
          auditorias: {
            orderBy: { createdAt: "desc" },
            take: 10,
          },
        },
      });

      if (!receita) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Receita não encontrada",
        });
      }

      if (receita.medicoId !== ctx.medico.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Você não tem permissão para acessar esta receita",
        });
      }

      return receita;
    }),

  duplicarReceita: medicoProcedure
    .input(z.object({ receitaId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const receitaOriginal = await prisma.receita.findUnique({
        where: { id: input.receitaId },
      });

      if (!receitaOriginal) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Receita não encontrada",
        });
      }

      if (receitaOriginal.medicoId !== ctx.medico.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Você não tem permissão para duplicar esta receita",
        });
      }

      const dataValidade = new Date();
      dataValidade.setMonth(dataValidade.getMonth() + 6);

      const novaReceita = await prisma.receita.create({
        data: {
          medicoId: ctx.medico.id,
          consultaClickId: receitaOriginal.consultaClickId,
          pacienteNome: receitaOriginal.pacienteNome,
          pacienteEndereco: receitaOriginal.pacienteEndereco,
          produtos: receitaOriginal.produtos as object,
          posologia: receitaOriginal.posologia,
          alertas: receitaOriginal.alertas,
          observacoes: receitaOriginal.observacoes,
          status: ReceitaStatus.RASCUNHO,
          dataValidade,
        },
      });

      await prisma.receitaAuditoria.create({
        data: {
          receitaId: novaReceita.id,
          acao: "DUPLICADA",
          medicoId: ctx.medico.id,
        },
      });

      return novaReceita;
    }),

  salvarCredenciaisVidaas: medicoProcedure
    .input(
      z.object({
        cpf: z.string().optional(),
        enderecoConsultorio: z.string().optional(),
        ufCrm: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { cpf, enderecoConsultorio, ufCrm } = input;

      await prisma.user.update({
        where: { id: ctx.medico.id },
        data: {
          ...(cpf && { cpf }),
          ...(enderecoConsultorio && { enderecoConsultorio }),
          ...(ufCrm && { ufCrm }),
        },
      });

      return {
        success: true,
      };
    }),

  validarCredenciaisVidaas: medicoProcedure
    .input(
      z.object({
        cpf: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      let cpf = input.cpf;
      if (!cpf) {
        const medico = await prisma.user.findUnique({
          where: { id: ctx.medico.id },
          select: { cpf: true },
        });
        cpf = medico?.cpf ?? undefined;
      }

      if (!cpf) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "CPF do médico não cadastrado",
        });
      }

      try {
        const vidaasService = getVidaasService();
        const resultado = await vidaasService.verificarCertificado(cpf);

        return {
          valido: resultado.possuiCertificado,
          slots: resultado.slots,
        };
      } catch (error) {
        console.error("[validarCredenciaisVidaas] Erro:", error);
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error instanceof Error ? error.message : "Erro ao validar credenciais",
        });
      }
    }),

   buscarCredenciaisVidaas: medicoProcedure.query(async ({ ctx }) => {
      const [user, medicoClickResult] = await Promise.all([
        prisma.user.findUnique({
          where: { id: ctx.medico.id },
          select: { cpf: true, enderecoConsultorio: true, ufCrm: true },
        }),
        ctx.medico.clickDoctorId 
          ? clickQueries.getMedicoById(ctx.medico.clickDoctorId)
          : Promise.resolve([]),
      ]);

      const medicoClick = medicoClickResult?.[0] || null;
      const hasEnvCredentials = !!(process.env.VIDAAS_CLIENT_ID && process.env.VIDAAS_CLIENT_SECRET);

      return {
        cpf: user?.cpf || "",
        enderecoConsultorio: user?.enderecoConsultorio || "",
        ufCrm: user?.ufCrm || "",
        name: medicoClick?.name || "",
        crm: medicoClick?.crm || "",
        isConfigured: hasEnvCredentials,
      };
    }),

  verificarReceita: publicProcedure
    .input(z.object({ receitaId: z.string().uuid() }))
    .query(async ({ input }) => {
      const receita = await prisma.receita.findUnique({
        where: { id: input.receitaId },
        include: {
          medico: {
            select: {
              name: true,
              crm: true,
              ufCrm: true,
            },
          },
          auditorias: {
            where: { acao: "ASSINADA" },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      });

      if (!receita) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Receita nao encontrada",
        });
      }

      let medicoNome = receita.medico?.name || "";
      let medicoCrm = receita.medico?.crm || "";
      let medicoUf = receita.medico?.ufCrm || "";

      if (!medicoNome || !medicoCrm) {
        const user = await prisma.user.findUnique({
          where: { id: receita.medicoId },
          select: { name: true, crm: true, ufCrm: true, clickDoctorId: true },
        });

        if (user) {
          medicoNome = user.name || medicoNome;
          medicoCrm = user.crm || medicoCrm;
          medicoUf = user.ufCrm || medicoUf;

          if (user.clickDoctorId && (!medicoNome || !medicoCrm)) {
            try {
              const [medicoClick] = await clickQueries.getMedicoById(user.clickDoctorId);
              if (medicoClick) {
                medicoNome = medicoNome || medicoClick.name || "";
                medicoCrm = medicoCrm || medicoClick.crm || "";
              }
            } catch {
            }
          }
        }
      }

      const dataAssinatura = receita.auditorias[0]?.createdAt || null;

      return {
        status: receita.status,
        medicoNome,
        medicoCrm: medicoCrm ? `${medicoCrm}${medicoUf ? `/${medicoUf}` : ""}` : "",
        pacienteNome: receita.pacienteNome,
        dataEmissao: receita.dataEmissao.toISOString(),
        dataAssinatura: dataAssinatura?.toISOString() || null,
        dataValidade: receita.dataValidade?.toISOString() || null,
      };
    }),
});
