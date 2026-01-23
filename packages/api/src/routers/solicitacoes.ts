import { z } from "zod";
import { TRPCError } from "@trpc/server";
import prisma from "@clickmedicos/db";
import { clickQueries } from "@clickmedicos/db/click-replica";
import { router, medicoProcedure } from "../index";
import { sincronizarHorariosMedicoComClick } from "../services/sync.service";
import { notificarSolicitacaoRecebida } from "../services/whatsapp-notification.service";

const DiaSemanaEnum = z.enum(["dom", "seg", "ter", "qua", "qui", "sex", "sab"]);
const MotivoCancelamentoEnum = z.enum([
  "doenca",
  "emergencia_familiar",
  "compromisso_medico",
  "problema_tecnico",
  "outro",
]);

const SlotSchema = z.object({
  diaSemana: DiaSemanaEnum,
  horario: z.string().regex(/^\d{2}:\d{2}$/),
});

interface FaixaConfig {
  scoreMinimo: number;
  consultasMinimas: number;
  slotsMaximo: number | null;
  slotsMinimo: number;
  periodos: string[];
}

interface PeriodoConfig {
  inicio: string;
  fim: string;
}

function parseHorario(horario: string): number {
  const parts = horario.split(":").map(Number);
  return (parts[0] ?? 0) * 60 + (parts[1] ?? 0);
}

function horarioNoPeriodo(horario: string, periodo: PeriodoConfig): boolean {
  const minutos = parseHorario(horario);
  const inicio = parseHorario(periodo.inicio);
  const fim = parseHorario(periodo.fim);
  return minutos >= inicio && minutos < fim;
}

export const solicitacoesRouter = router({
  criar: medicoProcedure
    .input(
      z.object({
        slots: z.array(SlotSchema).min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [configFaixas, configPeriodos, horariosExistentes, solicitacoesPendentes] =
        await Promise.all([
          prisma.configSistema.findUnique({ where: { chave: "faixas" } }),
          prisma.configSistema.findUnique({ where: { chave: "periodos" } }),
          prisma.medicoHorario.findMany({
            where: { medicoId: ctx.medico.id, ativo: true },
          }),
          prisma.solicitacao.findFirst({
            where: { medicoId: ctx.medico.id, status: "pendente" },
          }),
        ]);

      if (solicitacoesPendentes) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Voce ja possui uma solicitacao pendente. Aguarde a aprovacao.",
        });
      }

      const faixas = configFaixas?.valor as Record<string, FaixaConfig> | null;
      const periodos = configPeriodos?.valor as Record<string, PeriodoConfig> | null;
      const minhaFaixa = ctx.medico.faixa || "P5";
      const configFaixa = faixas?.[minhaFaixa];

      if (!configFaixa || !periodos) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Configuracao de faixas nao encontrada",
        });
      }

      const horariosSet = new Set(
        horariosExistentes.map((h) => `${h.diaSemana}-${h.horario}`)
      );

      const slotsNovos = input.slots.filter(
        (s) => !horariosSet.has(`${s.diaSemana}-${s.horario}`)
      );

      if (slotsNovos.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Todos os horarios selecionados ja estao abertos",
        });
      }

      const periodosPermitidos = configFaixa.periodos;
      const slotsInvalidos = slotsNovos.filter((slot) => {
        const periodosConfig = Object.entries(periodos);
        const periodoDoSlot = periodosConfig.find(([, config]) =>
          horarioNoPeriodo(slot.horario, config)
        );
        return !periodoDoSlot || !periodosPermitidos.includes(periodoDoSlot[0]);
      });

      if (slotsInvalidos.length > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Sua faixa (${minhaFaixa}) so permite horarios nos periodos: ${periodosPermitidos.join(", ")}`,
        });
      }

      const totalHorariosAtual = horariosExistentes.length;
      const totalAposAbertura = totalHorariosAtual + slotsNovos.length;

      if (configFaixa.slotsMaximo && totalAposAbertura > configFaixa.slotsMaximo) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Limite de ${configFaixa.slotsMaximo} slots semanais para sua faixa seria excedido`,
        });
      }

      const solicitacao = await prisma.solicitacao.create({
        data: {
          medicoId: ctx.medico.id,
          slots: slotsNovos,
          totalSlots: slotsNovos.length,
          status: "pendente",
        },
      });

      notificarSolicitacaoRecebida(ctx.medico.id).catch((err) => {
        console.error("[WhatsApp] Falha ao notificar solicitação recebida:", err);
      });

      return {
        solicitacao,
        slotsEnviados: slotsNovos.length,
        slotsIgnorados: input.slots.length - slotsNovos.length,
      };
    }),

  cancelarPendente: medicoProcedure
    .input(z.object({ solicitacaoId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const solicitacao = await prisma.solicitacao.findUnique({
        where: { id: input.solicitacaoId },
      });

      if (!solicitacao || solicitacao.medicoId !== ctx.medico.id) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Solicitacao nao encontrada",
        });
      }

      if (solicitacao.status !== "pendente") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Apenas solicitacoes pendentes podem ser canceladas",
        });
      }

      await prisma.solicitacao.delete({
        where: { id: input.solicitacaoId },
      });

      return { success: true };
    }),

  fecharHorarios: medicoProcedure
    .input(
      z.object({
        slots: z.array(SlotSchema).min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      for (const slot of input.slots) {
        await prisma.medicoHorario.upsert({
          where: {
            medicoId_diaSemana_horario: {
              medicoId: ctx.medico.id,
              diaSemana: slot.diaSemana,
              horario: slot.horario,
            },
          },
          update: { ativo: false },
          create: {
            medicoId: ctx.medico.id,
            diaSemana: slot.diaSemana,
            horario: slot.horario,
            ativo: false,
          },
        });
      }

      await sincronizarHorariosMedicoComClick(ctx.medico.id);

      return {
        fechados: input.slots.length,
      };
    }),

  criarCancelamentoEmergencial: medicoProcedure
    .input(
      z.object({
        slots: z.array(SlotSchema).min(1),
        motivoCategoria: MotivoCancelamentoEnum,
        motivoDescricao: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const cancelamentoPendente = await prisma.cancelamentoEmergencial.findFirst({
        where: { medicoId: ctx.medico.id, status: "pendente" },
      });

      if (cancelamentoPendente) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Voce ja possui um cancelamento emergencial pendente",
        });
      }

      const cancelamento = await prisma.cancelamentoEmergencial.create({
        data: {
          medicoId: ctx.medico.id,
          slots: input.slots,
          totalSlots: input.slots.length,
          motivoCategoria: input.motivoCategoria,
          motivoDescricao: input.motivoDescricao,
          status: "pendente",
        },
      });

      return cancelamento;
    }),

  cancelarCancelamentoEmergencial: medicoProcedure
    .input(z.object({ cancelamentoId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const cancelamento = await prisma.cancelamentoEmergencial.findUnique({
        where: { id: input.cancelamentoId },
      });

      if (!cancelamento || cancelamento.medicoId !== ctx.medico.id) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Cancelamento nao encontrado",
        });
      }

      if (cancelamento.status !== "pendente") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Apenas cancelamentos pendentes podem ser retirados",
        });
      }

      await prisma.cancelamentoEmergencial.delete({
        where: { id: input.cancelamentoId },
      });

      return { success: true };
    }),

  verificarHorariosComConsulta: medicoProcedure
    .input(
      z.object({
        slots: z.array(SlotSchema),
      })
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.medico.clickDoctorId) {
        return { slotsComConsulta: [], slotsSemConsulta: input.slots };
      }

      const diaMap = {
        dom: 0,
        seg: 1,
        ter: 2,
        qua: 3,
        qui: 4,
        sex: 5,
        sab: 6,
      } as const;

      const checks = await Promise.all(
        input.slots.map(async (slot) => {
          const diaSemanaNum = diaMap[slot.diaSemana as keyof typeof diaMap];
          const temConsulta = await clickQueries.temConsultaNoHorario(
            ctx.medico.clickDoctorId!,
            diaSemanaNum,
            slot.horario
          );
          return { slot, temConsulta };
        })
      );

      const slotsComConsulta = checks.filter((c) => c.temConsulta).map((c) => c.slot);
      const slotsSemConsulta = checks.filter((c) => !c.temConsulta).map((c) => c.slot);

      return { slotsComConsulta, slotsSemConsulta };
    }),
});
