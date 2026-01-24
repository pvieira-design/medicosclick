import { z } from "zod";
import { TRPCError } from "@trpc/server";
import prisma from "@clickmedicos/db";
import { publicProcedure, router } from "../trpc";

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

      return {
        id: candidato.id,
        nome: candidato.nome,
        email: candidato.email,
        message: "Candidatura enviada com sucesso! Entraremos em contato em breve.",
      };
    }),
});
