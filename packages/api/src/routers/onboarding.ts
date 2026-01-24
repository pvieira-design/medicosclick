import { z } from "zod";
import { TRPCError } from "@trpc/server";
import prisma from "@clickmedicos/db";
import { clickQueries } from "@clickmedicos/db/click-replica";
import { publicProcedure, router } from "../trpc";
import { staffProcedure } from "../middleware/permissions";
import { enviarEmailNovoCandidato } from "../services/email.service";

const submitCandidaturaInput = z.object({
  nome: z.string().min(3, "Nome deve ter no mínimo 3 caracteres"),
  email: z.string().email("Email inválido"),
  telefone: z.string().min(10, "Telefone deve ter no mínimo 10 dígitos"),
  crmNumero: z
    .string()
    .regex(/^\d{4,6}$/, "CRM deve conter entre 4 e 6 dígitos"),
  crmEstado: z
    .string()
    .length(2, "Estado deve ter 2 caracteres")
    .toUpperCase(),
  especialidades: z
    .array(z.string().min(1))
    .min(1, "Selecione pelo menos uma especialidade"),
  experiencia: z
    .string()
    .min(50, "Descrição de experiência deve ter no mínimo 50 caracteres"),
  disponibilidade: z
    .string()
    .min(20, "Descrição de disponibilidade deve ter no mínimo 20 caracteres"),
  comoConheceu: z.enum(["google", "indicacao", "linkedin", "instagram", "outro"]),
  comoConheceuOutro: z.string().optional(),
  anexos: z
    .array(
      z.object({
        nome: z.string().min(1),
        url: z.string().url("URL de anexo inválida"),
        tipo: z.string().min(1),
        tamanho: z.number().positive(),
      })
    )
    .optional(),
});

export const onboardingRouter = router({
  submitCandidatura: publicProcedure
    .input(submitCandidaturaInput)
    .mutation(async ({ input }) => {
      const existingEmail = await prisma.candidato.findUnique({
        where: { email: input.email },
      });

      if (existingEmail) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Email já cadastrado no sistema",
        });
      }

      const existingCRM = await prisma.candidato.findFirst({
        where: {
          crmNumero: input.crmNumero,
          crmEstado: input.crmEstado,
        },
      });

      if (existingCRM) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "CRM já cadastrado no sistema",
        });
      }

      const candidato = await prisma.candidato.create({
        data: {
          nome: input.nome,
          email: input.email,
          telefone: input.telefone,
          crmNumero: input.crmNumero,
          crmEstado: input.crmEstado,
          especialidades: input.especialidades,
          experiencia: input.experiencia,
          disponibilidade: input.disponibilidade,
          comoConheceu: input.comoConheceu,
          comoConheceuOutro: input.comoConheceuOutro || null,
          estagio: "candidato",
          status: "em_andamento",
        },
      });

      if (input.anexos && input.anexos.length > 0) {
        await prisma.candidatoAnexo.createMany({
          data: input.anexos.map((anexo) => ({
            candidatoId: candidato.id,
            nome: anexo.nome,
            url: anexo.url,
            tipo: anexo.tipo,
            tamanho: anexo.tamanho,
          })),
        });
      }

      await prisma.candidatoHistorico.create({
        data: {
          candidatoId: candidato.id,
          acao: "CRIADO",
          detalhes: {
            fonte: input.comoConheceu,
            comoConheceuOutro: input.comoConheceuOutro || null,
          },
          usuarioId: "system",
        },
      });

       await prisma.auditoria.create({
         data: {
           entidade: "candidato",
           entidadeId: candidato.id,
           acao: "CANDIDATO_CRIADO",
           usuarioId: null,
           usuarioNome: null,
           dadosDepois: {
             id: candidato.id,
             nome: candidato.nome,
             email: candidato.email,
             crmNumero: candidato.crmNumero,
             crmEstado: candidato.crmEstado,
             especialidades: candidato.especialidades,
             estagio: candidato.estagio,
             status: candidato.status,
             createdAt: candidato.createdAt.toISOString(),
           },
           ip: null,
           userAgent: null,
         },
       });

       // Notificar staff sobre novo candidato
       const configEmails = await prisma.configSistema.findUnique({
         where: { chave: "emails_onboarding_staff" },
       });

       if (configEmails && Array.isArray(configEmails.valor)) {
         enviarEmailNovoCandidato(
           configEmails.valor as string[],
           candidato.nome,
           candidato.email,
           candidato.crmNumero,
           candidato.crmEstado,
           candidato.especialidades
         ).catch((err) => {
           console.error("[Email] Falhou ao notificar staff:", err);
         });
       }

        return {
          id: candidato.id,
          nome: candidato.nome,
          email: candidato.email,
          message: "Candidatura enviada com sucesso! Entraremos em contato em breve.",
        };
     }),

  listarCandidatos: staffProcedure
    .input(
      z.object({
        estagio: z.enum(["candidato", "entrevista", "treinamento", "ativo", "performance"]).optional(),
        status: z.enum(["em_andamento", "rejeitado", "concluido"]).optional(),
        busca: z.string().optional(),
        page: z.number().min(1).default(1),
        perPage: z.number().min(1).max(50).default(20),
      })
    )
    .query(async ({ input }) => {
      const where: any = {};

      if (input.estagio) {
        where.estagio = input.estagio;
      }

      if (input.status) {
        where.status = input.status;
      }

      if (input.busca) {
        where.OR = [
          { nome: { contains: input.busca, mode: "insensitive" } },
          { email: { contains: input.busca, mode: "insensitive" } },
          { crmNumero: { contains: input.busca, mode: "insensitive" } },
        ];
      }

       const [candidatos, total] = await Promise.all([
         prisma.candidato.findMany({
           where,
           orderBy: { createdAt: "desc" },
           skip: (input.page - 1) * input.perPage,
           take: input.perPage,
           select: {
             id: true,
             nome: true,
             email: true,
             telefone: true,
             crmNumero: true,
             crmEstado: true,
             especialidades: true,
             estagio: true,
             status: true,
             entrevistaRealizada: true,
             entrevistaNota: true,
             createdAt: true,
             updatedAt: true,
             tags: {
               select: {
                 id: true,
                 nome: true,
               },
             },
           },
         }),
         prisma.candidato.count({ where }),
       ]);

      return {
        candidatos,
        total,
        pages: Math.ceil(total / input.perPage),
      };
    }),

  getCandidato: staffProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const candidato = await prisma.candidato.findUnique({
        where: { id: input.id },
        include: {
          historico: {
            orderBy: { createdAt: "desc" },
            select: {
              id: true,
              acao: true,
              de: true,
              para: true,
              detalhes: true,
              usuario: { select: { name: true } },
              createdAt: true,
            },
          },
          anexos: {
            select: {
              id: true,
              nome: true,
              url: true,
              tipo: true,
              tamanho: true,
              createdAt: true,
            },
          },
          tags: {
            select: {
              id: true,
              nome: true,
              criadoPor: { select: { name: true } },
              createdAt: true,
            },
          },
          rejeitadoPor: { select: { name: true } },
          entrevistador: { select: { name: true } },
          ativadoPor: { select: { name: true } },
        },
      });

      if (!candidato) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Candidato não encontrado",
        });
      }

      return candidato;
    }),

  moverEstagio: staffProcedure
    .input(
      z.object({
        candidatoId: z.string(),
        novoEstagio: z.enum(["candidato", "entrevista", "treinamento", "ativo", "performance"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const candidato = await prisma.candidato.findUnique({
        where: { id: input.candidatoId },
        select: { estagio: true, nome: true, clickDoctorId: true },
      });

      if (!candidato) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Candidato não encontrado",
        });
      }

      // Validar transição forward-only
      const ORDEM_ESTAGIOS = ["candidato", "entrevista", "treinamento", "ativo", "performance"];
      const indexAtual = ORDEM_ESTAGIOS.indexOf(candidato.estagio);
      const indexNovo = ORDEM_ESTAGIOS.indexOf(input.novoEstagio);

      if (indexNovo !== indexAtual + 1) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Transição inválida: ${candidato.estagio} → ${input.novoEstagio}. Apenas avanços de um estágio são permitidos.`,
        });
      }

      if (input.novoEstagio === "ativo" && !candidato.clickDoctorId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Candidato deve ter um médico vinculado no Click para ser ativado",
        });
      }

      const candidatoAtualizado = await prisma.candidato.update({
        where: { id: input.candidatoId },
        data: { estagio: input.novoEstagio },
        select: { id: true, nome: true, estagio: true },
      });

      // Registrar no histórico
      await prisma.candidatoHistorico.create({
        data: {
          candidatoId: input.candidatoId,
          acao: "ESTAGIO_ALTERADO",
          de: candidato.estagio,
          para: input.novoEstagio,
          usuarioId: ctx.user.id,
        },
      });

      // Registrar na auditoria
      await prisma.auditoria.create({
        data: {
          entidade: "candidato",
          entidadeId: input.candidatoId,
          acao: "ESTAGIO_ALTERADO",
          usuarioId: ctx.user.id,
          usuarioNome: ctx.user.name,
          dadosAntes: { estagio: candidato.estagio },
          dadosDepois: { estagio: input.novoEstagio },
          ip: null,
          userAgent: null,
        },
      });

      return candidatoAtualizado;
    }),

  rejeitarCandidato: staffProcedure
    .input(
      z.object({
        candidatoId: z.string(),
        motivo: z.string().min(10, "Motivo deve ter no mínimo 10 caracteres"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const candidato = await prisma.candidato.findUnique({
        where: { id: input.candidatoId },
        select: { id: true, nome: true, status: true },
      });

      if (!candidato) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Candidato não encontrado",
        });
      }

      if (candidato.status === "rejeitado") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Candidato já foi rejeitado",
        });
      }

      const candidatoAtualizado = await prisma.candidato.update({
        where: { id: input.candidatoId },
        data: {
          status: "rejeitado",
          motivoRejeicao: input.motivo,
          rejeitadoPorId: ctx.user.id,
          rejeitadoEm: new Date(),
        },
        select: { id: true, nome: true, status: true, rejeitadoEm: true },
      });

      // Registrar no histórico
      await prisma.candidatoHistorico.create({
        data: {
          candidatoId: input.candidatoId,
          acao: "REJEITADO",
          detalhes: { motivo: input.motivo },
          usuarioId: ctx.user.id,
        },
      });

      // Registrar na auditoria
      await prisma.auditoria.create({
        data: {
          entidade: "candidato",
          entidadeId: input.candidatoId,
          acao: "CANDIDATO_REJEITADO",
          usuarioId: ctx.user.id,
          usuarioNome: ctx.user.name,
          dadosAntes: { status: candidato.status },
          dadosDepois: { status: "rejeitado", motivo: input.motivo },
          ip: null,
          userAgent: null,
        },
      });

      return candidatoAtualizado;
    }),

   adicionarTag: staffProcedure
     .input(
       z.object({
         candidatoId: z.string(),
         nome: z.string().min(1, "Tag não pode estar vazia").max(50, "Tag muito longa"),
       })
     )
     .mutation(async ({ ctx, input }) => {
       const candidato = await prisma.candidato.findUnique({
         where: { id: input.candidatoId },
         select: { id: true, nome: true },
       });

       if (!candidato) {
         throw new TRPCError({
           code: "NOT_FOUND",
           message: "Candidato não encontrado",
         });
       }

       const tagExistente = await prisma.candidatoTag.findFirst({
         where: {
           candidatoId: input.candidatoId,
           nome: input.nome,
         },
       });

       if (tagExistente) {
         throw new TRPCError({
           code: "CONFLICT",
           message: "Esta tag já foi adicionada",
         });
       }

       const tag = await prisma.candidatoTag.create({
         data: {
           candidatoId: input.candidatoId,
           nome: input.nome,
           criadoPorId: ctx.user.id,
         },
         select: {
           id: true,
           nome: true,
           criadoPor: { select: { name: true } },
           createdAt: true,
         },
       });

       await prisma.candidatoHistorico.create({
         data: {
           candidatoId: input.candidatoId,
           acao: "TAG_ADICIONADA",
           detalhes: { tag: input.nome } as any,
           usuarioId: ctx.user.id,
         },
       });

       await prisma.auditoria.create({
         data: {
           entidade: "candidato",
           entidadeId: input.candidatoId,
           acao: "TAG_ADICIONADA",
           usuarioId: ctx.user.id,
           usuarioNome: ctx.user.name,
           dadosDepois: { tag: input.nome } as any,
           ip: null,
           userAgent: null,
         },
       });

       return tag;
     }),

   removerTag: staffProcedure
     .input(
       z.object({
         tagId: z.string(),
         candidatoId: z.string(),
       })
     )
     .mutation(async ({ ctx, input }) => {
       const tag = await prisma.candidatoTag.findUnique({
         where: { id: input.tagId },
         select: { id: true, nome: true, candidatoId: true },
       });

       if (!tag) {
         throw new TRPCError({
           code: "NOT_FOUND",
           message: "Tag não encontrada",
         });
       }

       if (tag.candidatoId !== input.candidatoId) {
         throw new TRPCError({
           code: "BAD_REQUEST",
           message: "Tag não pertence a este candidato",
         });
       }

       await prisma.candidatoTag.delete({
         where: { id: input.tagId },
       });

       await prisma.candidatoHistorico.create({
         data: {
           candidatoId: input.candidatoId,
           acao: "TAG_REMOVIDA",
           detalhes: { tag: tag.nome } as any,
           usuarioId: ctx.user.id,
         },
       });

       await prisma.auditoria.create({
         data: {
           entidade: "candidato",
           entidadeId: input.candidatoId,
           acao: "TAG_REMOVIDA",
           usuarioId: ctx.user.id,
           usuarioNome: ctx.user.name,
           dadosDepois: { tag: tag.nome } as any,
           ip: null,
           userAgent: null,
         },
       });

        return { success: true };
      }),

    buscarMentores: staffProcedure
      .input(
        z.object({
          busca: z.string().optional(),
        })
      )
      .query(async ({ input }) => {
        const medicos = await clickQueries.getMedicosAtivos();
        
        if (!input.busca) {
          return medicos.map((m) => ({
            id: String(m.doctor_id),
            nome: m.name,
            email: m.email,
          }));
        }

        const searchLower = input.busca.toLowerCase();
        return medicos
          .filter(
            (m) =>
              m.name?.toLowerCase().includes(searchLower) ||
              m.email?.toLowerCase().includes(searchLower)
          )
          .map((m) => ({
            id: String(m.doctor_id),
            nome: m.name,
            email: m.email,
          }));
      }),

    atribuirMentor: staffProcedure
      .input(
        z.object({
          candidatoId: z.string(),
          mentorId: z.string(),
          mentorNome: z.string(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const candidato = await prisma.candidato.findUnique({
          where: { id: input.candidatoId },
          select: { id: true, nome: true },
        });

        if (!candidato) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Candidato não encontrado",
          });
        }

        // Verificar se mentor já foi atribuído
        const mentorExistente = await prisma.candidatoMentor.findUnique({
          where: {
            candidatoId_mentorId: {
              candidatoId: input.candidatoId,
              mentorId: input.mentorId,
            },
          },
        });

        if (mentorExistente) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Este mentor já foi atribuído",
          });
        }

        const mentor = await prisma.candidatoMentor.create({
          data: {
            candidatoId: input.candidatoId,
            mentorId: input.mentorId,
            mentorNome: input.mentorNome,
            atribuidoPorId: ctx.user.id,
          },
          select: {
            id: true,
            mentorId: true,
            mentorNome: true,
            createdAt: true,
          },
        });

        // Registrar no histórico
        await prisma.candidatoHistorico.create({
          data: {
            candidatoId: input.candidatoId,
            acao: "MENTOR_ATRIBUIDO",
            detalhes: { mentorId: input.mentorId, mentorNome: input.mentorNome },
            usuarioId: ctx.user.id,
          },
        });

        // Registrar na auditoria
        await prisma.auditoria.create({
          data: {
            entidade: "candidato",
            entidadeId: input.candidatoId,
            acao: "MENTOR_ATRIBUIDO",
            usuarioId: ctx.user.id,
            usuarioNome: ctx.user.name,
            dadosDepois: { mentorId: input.mentorId, mentorNome: input.mentorNome },
            ip: null,
            userAgent: null,
          },
        });

        return mentor;
      }),

    removerMentor: staffProcedure
      .input(
        z.object({
          mentorId: z.string(),
          candidatoId: z.string(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const mentor = await prisma.candidatoMentor.findUnique({
          where: { id: input.mentorId },
          select: { id: true, mentorNome: true, candidatoId: true },
        });

        if (!mentor) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Mentor não encontrado",
          });
        }

        if (mentor.candidatoId !== input.candidatoId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Mentor não pertence a este candidato",
          });
        }

        await prisma.candidatoMentor.delete({
          where: { id: input.mentorId },
        });

        // Registrar no histórico
        await prisma.candidatoHistorico.create({
          data: {
            candidatoId: input.candidatoId,
            acao: "MENTOR_REMOVIDO",
            detalhes: { mentorNome: mentor.mentorNome },
            usuarioId: ctx.user.id,
          },
        });

        // Registrar na auditoria
        await prisma.auditoria.create({
          data: {
            entidade: "candidato",
            entidadeId: input.candidatoId,
            acao: "MENTOR_REMOVIDO",
            usuarioId: ctx.user.id,
            usuarioNome: ctx.user.name,
            dadosDepois: { mentorNome: mentor.mentorNome },
            ip: null,
            userAgent: null,
          },
        });

        return { success: true };
      }),

    salvarDatasTreinamento: staffProcedure
      .input(
        z.object({
          candidatoId: z.string(),
          dataInicio: z.date(),
          dataFim: z.date(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const candidato = await prisma.candidato.findUnique({
          where: { id: input.candidatoId },
          select: { id: true, nome: true },
        });

        if (!candidato) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Candidato não encontrado",
          });
        }

        if (input.dataFim <= input.dataInicio) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Data de fim deve ser posterior à data de início",
          });
        }

        const candidatoAtualizado = await prisma.candidato.update({
          where: { id: input.candidatoId },
          data: {
            treinamentoInicio: input.dataInicio,
            treinamentoFim: input.dataFim,
          },
          select: {
            id: true,
            nome: true,
            treinamentoInicio: true,
            treinamentoFim: true,
          },
        });

        // Registrar no histórico
        await prisma.candidatoHistorico.create({
          data: {
            candidatoId: input.candidatoId,
            acao: "DATAS_TREINAMENTO_SALVAS",
            detalhes: {
              dataInicio: input.dataInicio.toISOString(),
              dataFim: input.dataFim.toISOString(),
            },
            usuarioId: ctx.user.id,
          },
        });

        // Registrar na auditoria
        await prisma.auditoria.create({
          data: {
            entidade: "candidato",
            entidadeId: input.candidatoId,
            acao: "DATAS_TREINAMENTO_SALVAS",
            usuarioId: ctx.user.id,
            usuarioNome: ctx.user.name,
            dadosDepois: {
              treinamentoInicio: input.dataInicio.toISOString(),
              treinamentoFim: input.dataFim.toISOString(),
            },
            ip: null,
            userAgent: null,
          },
        });

         return candidatoAtualizado;
       }),

  searchDoctors: staffProcedure
    .input(z.object({ nome: z.string().min(2, "Mínimo 2 caracteres") }))
    .query(async ({ input }) => {
      const doctors = await clickQueries.searchDoctorsByName(input.nome);
      return doctors.map((doc) => ({
        id: doc.doctor_id,
        nome: doc.name,
        crm: doc.crm,
        email: doc.email,
      }));
    }),

  ativarCandidato: staffProcedure
    .input(
      z.object({
        candidatoId: z.string(),
        clickDoctorId: z.number().int().positive("ID do médico inválido"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const candidato = await prisma.candidato.findUnique({
        where: { id: input.candidatoId },
        select: { id: true, nome: true, estagio: true, clickDoctorId: true },
      });

      if (!candidato) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Candidato não encontrado",
        });
      }

      if (candidato.estagio !== "treinamento") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Candidato deve estar em treinamento para ser ativado",
        });
      }

      const candidatoAtualizado = await prisma.candidato.update({
        where: { id: input.candidatoId },
        data: {
          clickDoctorId: input.clickDoctorId,
          ativadoPorId: ctx.user.id,
          ativadoEm: new Date(),
        },
        select: { id: true, nome: true, clickDoctorId: true, ativadoEm: true },
      });

      // Registrar no histórico
      await prisma.candidatoHistorico.create({
        data: {
          candidatoId: input.candidatoId,
          acao: "ATIVACAO_MEDICO",
          detalhes: { clickDoctorId: input.clickDoctorId },
          usuarioId: ctx.user.id,
        },
      });

      // Registrar na auditoria
      await prisma.auditoria.create({
        data: {
          entidade: "candidato",
          entidadeId: input.candidatoId,
          acao: "CANDIDATO_ATIVADO",
          usuarioId: ctx.user.id,
          usuarioNome: ctx.user.name,
          dadosDepois: { clickDoctorId: input.clickDoctorId },
          ip: null,
          userAgent: null,
        },
      });

       return candidatoAtualizado;
     }),

   salvarEntrevista: staffProcedure
     .input(
       z.object({
         candidatoId: z.string(),
         nota: z.number().min(1).max(5, "Nota deve estar entre 1 e 5"),
         observacoes: z.string().min(10, "Observações devem ter no mínimo 10 caracteres"),
          checklist: z.record(z.string(), z.boolean()),
         entrevistadorId: z.string(),
         resultado: z.enum(["aprovado", "reprovado", "pendente"]),
       })
     )
     .mutation(async ({ ctx, input }) => {
       const candidato = await prisma.candidato.findUnique({
         where: { id: input.candidatoId },
         select: { id: true, nome: true, entrevistaRealizada: true },
       });

       if (!candidato) {
         throw new TRPCError({
           code: "NOT_FOUND",
           message: "Candidato não encontrado",
         });
       }

       const candidatoAtualizado = await prisma.candidato.update({
         where: { id: input.candidatoId },
         data: {
           entrevistaRealizada: true,
           entrevistaNota: input.nota,
           entrevistaObservacoes: input.observacoes,
            entrevistaChecklist: input.checklist as any,
           entrevistadorId: input.entrevistadorId,
           entrevistaResultado: input.resultado,
         },
         select: {
           id: true,
           nome: true,
           entrevistaRealizada: true,
           entrevistaNota: true,
           entrevistaResultado: true,
         },
       });

       // Registrar no histórico
       await prisma.candidatoHistorico.create({
         data: {
           candidatoId: input.candidatoId,
           acao: "ENTREVISTA_REALIZADA",
           detalhes: {
             nota: input.nota,
             resultado: input.resultado,
             checklistItems: Object.keys(input.checklist).filter(
               (key) => input.checklist[key]
             ),
           },
           usuarioId: ctx.user.id,
         },
       });

       // Registrar na auditoria
       await prisma.auditoria.create({
         data: {
           entidade: "candidato",
           entidadeId: input.candidatoId,
           acao: "ENTREVISTA_REALIZADA",
           usuarioId: ctx.user.id,
           usuarioNome: ctx.user.name,
           dadosDepois: {
             entrevistaRealizada: true,
             entrevistaNota: input.nota,
             entrevistaResultado: input.resultado,
             entrevistador: input.entrevistadorId,
           },
           ip: null,
           userAgent: null,
         },
       });

       return candidatoAtualizado;
     }),
});
