import { z } from "zod";
import { TRPCError } from "@trpc/server";
import prisma from "@clickmedicos/db";
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
        select: { estagio: true, nome: true },
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
});
