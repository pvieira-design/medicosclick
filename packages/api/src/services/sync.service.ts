import prisma from "@clickmedicos/db";
import { clickQueries, expandirScheduleParaSlots } from "@clickmedicos/db/click-replica";
import { clickApi } from "./click-api.service";
import { slotsParaClickSchedule, type SlotLocal } from "../utils/horario-converter";

export interface SyncResult {
  success: boolean;
  error?: string;
  queuedForRetry?: boolean;
}

const RETRY_DELAYS_MINUTOS = [5, 20, 80, 320];

function calcularProximoRetry(tentativas: number): Date {
  const delayMinutos = RETRY_DELAYS_MINUTOS[tentativas] ?? 320;
  const proximoRetry = new Date();
  proximoRetry.setMinutes(proximoRetry.getMinutes() + delayMinutos);
  return proximoRetry;
}

export async function sincronizarHorariosMedicoComClick(
  medicoId: string
): Promise<SyncResult> {
  const medico = await prisma.user.findUnique({
    where: { id: medicoId },
    select: { clickDoctorId: true, name: true },
  });

  if (!medico?.clickDoctorId) {
    return { success: false, error: "Medico sem clickDoctorId" };
  }

  const [scheduleResult] = await clickQueries.getScheduleMedicoClick(medico.clickDoctorId);
  const horariosAtuaisClick = expandirScheduleParaSlots(scheduleResult?.schedule ?? null);

  const horariosLocais = await prisma.medicoHorario.findMany({
    where: { medicoId },
  });

  const slotsFinais = new Map<string, boolean>();
  
  for (const slot of horariosAtuaisClick) {
    slotsFinais.set(`${slot.diaSemana}-${slot.horario}`, true);
  }

  for (const h of horariosLocais) {
    const key = `${h.diaSemana}-${h.horario}`;
    if (h.ativo) {
      slotsFinais.set(key, true);
    } else {
      slotsFinais.delete(key);
    }
  }

  const slots: SlotLocal[] = Array.from(slotsFinais.keys()).map((key) => {
    const [diaSemana, horario] = key.split("-");
    return {
      diaSemana: diaSemana as SlotLocal["diaSemana"],
      horario: horario!,
    };
  });

  const schedule = slotsParaClickSchedule(slots);

  console.log(`[Sync] Mesclando horarios para ${medico.name}:`, {
    horariosClickAtual: horariosAtuaisClick.length,
    alteracoesLocais: horariosLocais.length,
    totalFinal: slots.length,
  });

  const response = await clickApi.atualizarHorarioMedico({
    doctor_id: medico.clickDoctorId,
    schedule,
  });

  if (response.success) {
    await prisma.medicoHorario.deleteMany({ where: { medicoId } });
    console.log(`[Sync] Horarios sincronizados para medico ${medico.name}`);
    return { success: true };
  }

  console.error(`[Sync] Falha ao sincronizar medico ${medico.name}: ${response.error}`);

  await adicionarFilaRetry("atualizar_horario", {
    medicoId,
    clickDoctorId: medico.clickDoctorId,
    schedule,
  });

  return {
    success: false,
    error: response.error,
    queuedForRetry: true,
  };
}

export async function adicionarFilaRetry(
  tipo: string,
  payload: Record<string, unknown>
): Promise<void> {
  await prisma.syncQueue.create({
    data: {
      tipo,
      payload: payload as object,
      tentativas: 0,
      maxTentativas: 5,
      proximoRetry: calcularProximoRetry(0),
    },
  });
}

export async function processarFilaRetry(): Promise<{
  processados: number;
  sucesso: number;
  falha: number;
}> {
  const agora = new Date();

  const pendentes = await prisma.syncQueue.findMany({
    where: {
      processadoEm: null,
      tentativas: { lt: 5 },
      proximoRetry: { lte: agora },
    },
    take: 10,
    orderBy: { proximoRetry: "asc" },
  });

  let sucesso = 0;
  let falha = 0;

  for (const item of pendentes) {
    const payload = item.payload as Record<string, unknown>;

    if (item.tipo === "atualizar_horario") {
      const response = await clickApi.atualizarHorarioMedico({
        doctor_id: payload.clickDoctorId as number,
        schedule: payload.schedule as Parameters<typeof clickApi.atualizarHorarioMedico>[0]["schedule"],
      });

      if (response.success) {
        await prisma.syncQueue.update({
          where: { id: item.id },
          data: { processadoEm: new Date() },
        });
        sucesso++;
      } else {
        const novaTentativa = item.tentativas + 1;
        await prisma.syncQueue.update({
          where: { id: item.id },
          data: {
            tentativas: novaTentativa,
            erro: response.error,
            proximoRetry:
              novaTentativa >= 5 ? undefined : calcularProximoRetry(novaTentativa),
          },
        });
        falha++;
      }
    }
  }

  return { processados: pendentes.length, sucesso, falha };
}

export async function obterEstatisticasFilaRetry(): Promise<{
  pendentes: number;
  processados: number;
  falhados: number;
}> {
  const [pendentes, processados, falhados] = await Promise.all([
    prisma.syncQueue.count({
      where: { processadoEm: null, tentativas: { lt: 5 } },
    }),
    prisma.syncQueue.count({
      where: { processadoEm: { not: null } },
    }),
    prisma.syncQueue.count({
      where: { processadoEm: null, tentativas: { gte: 5 } },
    }),
  ]);

  return { pendentes, processados, falhados };
}

export async function listarFilaRetry(limite: number = 20) {
  return prisma.syncQueue.findMany({
    where: { processadoEm: null },
    orderBy: { createdAt: "desc" },
    take: limite,
  });
}
