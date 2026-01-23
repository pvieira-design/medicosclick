import prisma from "@clickmedicos/db";
import { clickQueries, type MetricasMedico } from "@clickmedicos/db/click-replica";
import type { Faixa } from "@clickmedicos/db/enums";

export interface ScoreResult {
  score: number;
  faixa: Faixa;
  taxaConversao: number;
  ticketMedio: number;
  percentilConversao: number;
  percentilTicket: number;
}

interface PesosScore {
  conversao: number;
  ticketMedio: number;
}

const DEFAULT_PESOS: PesosScore = {
  conversao: 0.66,
  ticketMedio: 0.34,
};

const FAIXA_LIMITES: Array<{ min: number; faixa: Faixa }> = [
  { min: 80, faixa: "P1" },
  { min: 60, faixa: "P2" },
  { min: 40, faixa: "P3" },
  { min: 20, faixa: "P4" },
  { min: 0, faixa: "P5" },
];

function calcularPercentil(valor: number, valores: number[]): number {
  if (valores.length === 0) return 0;
  const sorted = [...valores].sort((a, b) => a - b);
  const menoresOuIguais = sorted.filter(v => v <= valor).length;
  return Math.round((menoresOuIguais / sorted.length) * 100);
}

function determinarFaixa(score: number): Faixa {
  for (const { min, faixa } of FAIXA_LIMITES) {
    if (score >= min) return faixa;
  }
  return "P5";
}

export async function getPesosScore(): Promise<PesosScore> {
  const configPesos = await prisma.configSistema.findUnique({
    where: { chave: "pesos_score" },
  });
  
  if (!configPesos?.valor) return DEFAULT_PESOS;
  
  const valor = configPesos.valor as Record<string, unknown>;
  return {
    conversao: typeof valor.conversao === "number" ? valor.conversao : DEFAULT_PESOS.conversao,
    ticketMedio: typeof valor.ticketMedio === "number" ? valor.ticketMedio : DEFAULT_PESOS.ticketMedio,
  };
}

export async function calcularScoreMedico(
  clickDoctorId: number,
  todasMetricas?: MetricasMedico[]
): Promise<ScoreResult | null> {
  const pesos = await getPesosScore();
  
  const [medicoMetricas] = await clickQueries.getMetricasMedico(clickDoctorId);
  
  if (!medicoMetricas) {
    return null;
  }

  const metricas = todasMetricas ?? await clickQueries.getMetricasTodosMedicos();
  
  const conversoes = metricas.map(m => m.taxa_conversao);
  const tickets = metricas.map(m => m.ticket_medio);
  
  const percentilConversao = calcularPercentil(medicoMetricas.taxa_conversao, conversoes);
  const percentilTicket = calcularPercentil(medicoMetricas.ticket_medio, tickets);
  
  const score = Math.round(
    (percentilConversao * pesos.conversao) + (percentilTicket * pesos.ticketMedio)
  );
  
  const faixa = determinarFaixa(score);

  return {
    score,
    faixa,
    taxaConversao: medicoMetricas.taxa_conversao,
    ticketMedio: medicoMetricas.ticket_medio,
    percentilConversao,
    percentilTicket,
  };
}

export async function recalcularTodosScores(): Promise<{
  atualizados: number;
  erros: Array<{ medicoId: string; erro: string }>;
}> {
  const medicos = await prisma.user.findMany({
    where: { tipo: "medico", ativo: true, clickDoctorId: { not: null } },
  });

  const todasMetricas = await clickQueries.getMetricasTodosMedicos();
  
  let atualizados = 0;
  const erros: Array<{ medicoId: string; erro: string }> = [];

  for (const medico of medicos) {
    try {
      if (!medico.clickDoctorId) continue;
      
      const scoreResult = await calcularScoreMedico(medico.clickDoctorId, todasMetricas);
      
      if (scoreResult) {
        // Se faixaFixa = true, atualiza apenas o score, mantém a faixa manual
        const updateData = medico.faixaFixa
          ? { score: scoreResult.score }
          : { score: scoreResult.score, faixa: scoreResult.faixa };
        
        await prisma.$transaction([
          prisma.user.update({
            where: { id: medico.id },
            data: updateData,
          }),
          prisma.medicoConfig.upsert({
            where: { medicoId: medico.id },
            update: {
              taxaConversao: scoreResult.taxaConversao,
              ticketMedio: scoreResult.ticketMedio,
            },
            create: {
              medicoId: medico.id,
              taxaConversao: scoreResult.taxaConversao,
              ticketMedio: scoreResult.ticketMedio,
            },
          }),
        ]);
        
        atualizados++;
      }
    } catch (error) {
      erros.push({
        medicoId: medico.id,
        erro: error instanceof Error ? error.message : "Erro desconhecido",
      });
    }
  }

  return { atualizados, erros };
}
