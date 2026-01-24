import prisma from "@clickmedicos/db";
import { clickQueries, type MetricasMedicoPrimeiroLead } from "@clickmedicos/db/click-replica";
import type { Faixa } from "@clickmedicos/db/enums";

export interface ScoreResult {
  score: number;
  faixa: Faixa;
  taxaConversao: number;
  ticketMedio: number;
  percentilConversao: number;
  percentilTicket: number;
  totalConsultasRealizadas: number;
}

interface FaixaConfig {
  scoreMinimo: number;
  consultasMinimas: number;
  slotsMaximo: number | null;
  slotsMinimo: number;
  periodos: string[];
}

interface ScoreConfig {
  conversao: number;
  ticketMedio: number;
  semanasCalculo: number;
}

const DEFAULT_CONFIG: ScoreConfig = {
  conversao: 0.66,
  ticketMedio: 0.34,
  semanasCalculo: 8,
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

export async function getScoreConfig(): Promise<ScoreConfig> {
  const configPesos = await prisma.configSistema.findUnique({
    where: { chave: "pesos_score" },
  });
  
  if (!configPesos?.valor) return DEFAULT_CONFIG;
  
  const valor = configPesos.valor as Record<string, unknown>;
  return {
    conversao: typeof valor.conversao === "number" ? valor.conversao : DEFAULT_CONFIG.conversao,
    ticketMedio: typeof valor.ticketMedio === "number" ? valor.ticketMedio : DEFAULT_CONFIG.ticketMedio,
    semanasCalculo: typeof valor.semanasCalculo === "number" ? valor.semanasCalculo : DEFAULT_CONFIG.semanasCalculo,
  };
}

const DEFAULT_FAIXAS_CONFIG: Record<Faixa, FaixaConfig> = {
  P1: { scoreMinimo: 80, consultasMinimas: 100, slotsMaximo: null, slotsMinimo: 10, periodos: ["manha", "tarde", "noite"] },
  P2: { scoreMinimo: 60, consultasMinimas: 50, slotsMaximo: 120, slotsMinimo: 10, periodos: ["manha", "tarde", "noite"] },
  P3: { scoreMinimo: 40, consultasMinimas: 25, slotsMaximo: 80, slotsMinimo: 8, periodos: ["tarde", "noite"] },
  P4: { scoreMinimo: 20, consultasMinimas: 10, slotsMaximo: 50, slotsMinimo: 5, periodos: ["tarde"] },
  P5: { scoreMinimo: 0, consultasMinimas: 0, slotsMaximo: 30, slotsMinimo: 3, periodos: ["tarde"] },
};

async function getConfigFaixas(): Promise<Record<Faixa, FaixaConfig>> {
  const configFaixas = await prisma.configSistema.findUnique({
    where: { chave: "faixas" },
  });
  
  if (!configFaixas?.valor) return DEFAULT_FAIXAS_CONFIG;
  
  return configFaixas.valor as unknown as Record<Faixa, FaixaConfig>;
}

function ajustarFaixaPorConsultasMinimas(
  faixaCalculada: Faixa,
  totalConsultas: number,
  configFaixas: Record<Faixa, FaixaConfig>
): Faixa {
  const ordemFaixas: Faixa[] = ["P1", "P2", "P3", "P4", "P5"];
  const idxCalculada = ordemFaixas.indexOf(faixaCalculada);
  
  for (let i = idxCalculada; i < ordemFaixas.length; i++) {
    const faixa = ordemFaixas[i]!;
    const minConsultas = configFaixas[faixa]?.consultasMinimas ?? 0;
    
    if (totalConsultas >= minConsultas) {
      return faixa;
    }
  }
  
  return "P5";
}

export async function calcularScoreMedico(
  clickDoctorId: number,
  todasMetricas?: MetricasMedicoPrimeiroLead[]
): Promise<ScoreResult | null> {
  const config = await getScoreConfig();
  const configFaixas = await getConfigFaixas();
  
  const [medicoMetricas] = await clickQueries.getMetricasMedicoPrimeiroLead(clickDoctorId, config.semanasCalculo);
  
  if (!medicoMetricas) {
    return null;
  }

  const metricas = todasMetricas ?? await clickQueries.getMetricasTodosMedicosPrimeiroLead(config.semanasCalculo);
  
  const conversoes = metricas.map(m => m.taxa_conversao);
  const tickets = metricas.map(m => m.ticket_medio);
  
  const percentilConversao = calcularPercentil(medicoMetricas.taxa_conversao, conversoes);
  const percentilTicket = calcularPercentil(medicoMetricas.ticket_medio, tickets);
  
  const score = Math.round(
    (percentilConversao * config.conversao) + (percentilTicket * config.ticketMedio)
  );
  
  const faixaPorScore = determinarFaixa(score);
  
  const faixa = ajustarFaixaPorConsultasMinimas(
    faixaPorScore,
    medicoMetricas.total_consultas_realizadas,
    configFaixas
  );

  return {
    score,
    faixa,
    taxaConversao: medicoMetricas.taxa_conversao,
    ticketMedio: medicoMetricas.ticket_medio,
    percentilConversao,
    percentilTicket,
    totalConsultasRealizadas: medicoMetricas.total_consultas_realizadas,
  };
}

export async function recalcularTodosScores(): Promise<{
  atualizados: number;
  erros: Array<{ medicoId: string; erro: string }>;
}> {
  const config = await getScoreConfig();
  
  const medicos = await prisma.user.findMany({
    where: { tipo: "medico", ativo: true, clickDoctorId: { not: null } },
  });

  const todasMetricas = await clickQueries.getMetricasTodosMedicosPrimeiroLead(config.semanasCalculo);
  
  let atualizados = 0;
  const erros: Array<{ medicoId: string; erro: string }> = [];

  for (const medico of medicos) {
    try {
      if (!medico.clickDoctorId) continue;
      
      const scoreResult = await calcularScoreMedico(medico.clickDoctorId, todasMetricas);
      
      if (scoreResult) {
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
               totalConsultas: scoreResult.totalConsultasRealizadas,
             },
             create: {
               medicoId: medico.id,
               taxaConversao: scoreResult.taxaConversao,
               ticketMedio: scoreResult.ticketMedio,
               totalConsultas: scoreResult.totalConsultasRealizadas,
             },
           }),
           prisma.historicoScore.create({
             data: {
               medicoId: medico.id,
               score: scoreResult.score,
               faixa: medico.faixaFixa ? medico.faixa : scoreResult.faixa,
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
