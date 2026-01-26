import { z } from "zod";
import { clickQueries } from "@clickmedicos/db/click-replica";
import { router, staffProcedure } from "../index";

function calcularPeriodoAnterior(dataInicio: string, dataFim: string) {
  const inicio = new Date(dataInicio);
  const fim = new Date(dataFim);
  const duracao = Math.ceil((fim.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24));
  
  const anteriorFim = new Date(inicio);
  anteriorFim.setDate(anteriorFim.getDate() - 1);
  
  const anteriorInicio = new Date(anteriorFim);
  anteriorInicio.setDate(anteriorInicio.getDate() - duracao);
  
  return {
    dataInicio: anteriorInicio.toISOString().split("T")[0]!,
    dataFim: anteriorFim.toISOString().split("T")[0]!,
  };
}

function calcularSemanaAnterior(dataInicio: string, dataFim: string) {
  const inicio = new Date(dataInicio);
  const fim = new Date(dataFim);
  
  const semanaAnteriorInicio = new Date(inicio);
  semanaAnteriorInicio.setDate(semanaAnteriorInicio.getDate() - 7);
  
  const semanaAnteriorFim = new Date(fim);
  semanaAnteriorFim.setDate(semanaAnteriorFim.getDate() - 7);
  
  return {
    dataInicio: semanaAnteriorInicio.toISOString().split("T")[0]!,
    dataFim: semanaAnteriorFim.toISOString().split("T")[0]!,
  };
}

function calcularUltimas4Semanas(dataInicio: string, dataFim: string) {
  const periodos: { dataInicio: string; dataFim: string }[] = [];
  
  for (let i = 1; i <= 4; i++) {
    const inicio = new Date(dataInicio);
    const fim = new Date(dataFim);
    
    inicio.setDate(inicio.getDate() - (7 * i));
    fim.setDate(fim.getDate() - (7 * i));
    
    periodos.push({
      dataInicio: inicio.toISOString().split("T")[0]!,
      dataFim: fim.toISOString().split("T")[0]!,
    });
  }
  
  return periodos;
}

function calcularVariacao(atual: number, anterior: number): number | null {
  if (anterior === 0) return atual > 0 ? 100 : null;
  return ((atual - anterior) / anterior) * 100;
}

export const analyticsRouter = router({
  consultasAgendadas: staffProcedure
    .input(
      z.object({
        dataInicio: z.string(),
        dataFim: z.string(),
      })
    )
    .query(async ({ input }) => {
      const [resultadoAtual] = await clickQueries.getTotalConsultasAgendadas(
        input.dataInicio,
        input.dataFim,
        true
      );

      const periodoAnterior = calcularPeriodoAnterior(input.dataInicio, input.dataFim);
      const [resultadoAnterior] = await clickQueries.getTotalConsultasAgendadas(
        periodoAnterior.dataInicio,
        periodoAnterior.dataFim,
        true
      );

      const semanaAnterior = calcularSemanaAnterior(input.dataInicio, input.dataFim);
      const [resultadoSemana] = await clickQueries.getTotalConsultasAgendadas(
        semanaAnterior.dataInicio,
        semanaAnterior.dataFim,
        true
      );

      const ultimas4Semanas = calcularUltimas4Semanas(input.dataInicio, input.dataFim);
      const resultados4Semanas = await Promise.all(
        ultimas4Semanas.map((p) =>
          clickQueries.getTotalConsultasAgendadas(p.dataInicio, p.dataFim, true)
        )
      );
      const soma4Semanas = resultados4Semanas.reduce((acc, [r]) => acc + (r?.total_agendadas ?? 0), 0);
      const media4Semanas = soma4Semanas / 4;

      const total = resultadoAtual?.total_agendadas ?? 0;
      const totalAnterior = resultadoAnterior?.total_agendadas ?? 0;
      const totalSemana = resultadoSemana?.total_agendadas ?? 0;
      const variacao = calcularVariacao(total, totalAnterior);
      const variacaoSemana = calcularVariacao(total, totalSemana);
      const variacaoMedia = calcularVariacao(total, media4Semanas);

      return {
        total,
        totalAnterior,
        totalSemana,
        media4Semanas: Math.round(media4Semanas),
        variacao,
        variacaoSemana,
        variacaoMedia,
        periodo: {
          atual: { dataInicio: input.dataInicio, dataFim: input.dataFim },
          anterior: periodoAnterior,
          semanaAnterior: semanaAnterior,
        },
      };
    }),

  consultasRealizadas: staffProcedure
    .input(
      z.object({
        dataInicio: z.string(),
        dataFim: z.string(),
      })
    )
    .query(async ({ input }) => {
      const [resultadoAtual] = await clickQueries.getTotalConsultasRealizadas(
        input.dataInicio,
        input.dataFim,
        true
      );

      const periodoAnterior = calcularPeriodoAnterior(input.dataInicio, input.dataFim);
      const [resultadoAnterior] = await clickQueries.getTotalConsultasRealizadas(
        periodoAnterior.dataInicio,
        periodoAnterior.dataFim,
        true
      );

      const semanaAnterior = calcularSemanaAnterior(input.dataInicio, input.dataFim);
      const [resultadoSemana] = await clickQueries.getTotalConsultasRealizadas(
        semanaAnterior.dataInicio,
        semanaAnterior.dataFim,
        true
      );

      const ultimas4Semanas = calcularUltimas4Semanas(input.dataInicio, input.dataFim);
      const resultados4Semanas = await Promise.all(
        ultimas4Semanas.map((p) =>
          clickQueries.getTotalConsultasRealizadas(p.dataInicio, p.dataFim, true)
        )
      );
      const soma4Semanas = resultados4Semanas.reduce((acc, [r]) => acc + (r?.total_realizadas ?? 0), 0);
      const media4Semanas = soma4Semanas / 4;

      const total = resultadoAtual?.total_realizadas ?? 0;
      const totalAnterior = resultadoAnterior?.total_realizadas ?? 0;
      const totalSemana = resultadoSemana?.total_realizadas ?? 0;
      const variacao = calcularVariacao(total, totalAnterior);
      const variacaoSemana = calcularVariacao(total, totalSemana);
      const variacaoMedia = calcularVariacao(total, media4Semanas);

      return {
        total,
        totalAnterior,
        totalSemana,
        media4Semanas: Math.round(media4Semanas),
        variacao,
        variacaoSemana,
        variacaoMedia,
        periodo: {
          atual: { dataInicio: input.dataInicio, dataFim: input.dataFim },
          anterior: periodoAnterior,
          semanaAnterior: semanaAnterior,
        },
      };
    }),

  consultasCanceladas: staffProcedure
    .input(
      z.object({
        dataInicio: z.string(),
        dataFim: z.string(),
      })
    )
    .query(async ({ input }) => {
      const [resultadoAtual] = await clickQueries.getTotalConsultasCanceladas(
        input.dataInicio,
        input.dataFim,
        true
      );

      const periodoAnterior = calcularPeriodoAnterior(input.dataInicio, input.dataFim);
      const [resultadoAnterior] = await clickQueries.getTotalConsultasCanceladas(
        periodoAnterior.dataInicio,
        periodoAnterior.dataFim,
        true
      );

      const semanaAnterior = calcularSemanaAnterior(input.dataInicio, input.dataFim);
      const [resultadoSemana] = await clickQueries.getTotalConsultasCanceladas(
        semanaAnterior.dataInicio,
        semanaAnterior.dataFim,
        true
      );

      const ultimas4Semanas = calcularUltimas4Semanas(input.dataInicio, input.dataFim);
      const resultados4Semanas = await Promise.all(
        ultimas4Semanas.map((p) =>
          clickQueries.getTotalConsultasCanceladas(p.dataInicio, p.dataFim, true)
        )
      );
      const soma4Semanas = resultados4Semanas.reduce((acc, [r]) => acc + (r?.total_canceladas ?? 0), 0);
      const media4Semanas = soma4Semanas / 4;

      const total = resultadoAtual?.total_canceladas ?? 0;
      const totalAnterior = resultadoAnterior?.total_canceladas ?? 0;
      const totalSemana = resultadoSemana?.total_canceladas ?? 0;
      const variacao = calcularVariacao(total, totalAnterior);
      const variacaoSemana = calcularVariacao(total, totalSemana);
      const variacaoMedia = calcularVariacao(total, media4Semanas);

      return {
        total,
        totalAnterior,
        totalSemana,
        media4Semanas: Math.round(media4Semanas),
        variacao,
        variacaoSemana,
        variacaoMedia,
        periodo: {
          atual: { dataInicio: input.dataInicio, dataFim: input.dataFim },
          anterior: periodoAnterior,
          semanaAnterior: semanaAnterior,
        },
      };
    }),

  medicosAtendendo: staffProcedure
    .input(
      z.object({
        dataInicio: z.string(),
        dataFim: z.string(),
      })
    )
    .query(async ({ input }) => {
      const [resultadoAtual] = await clickQueries.getTotalMedicosAtendendo(
        input.dataInicio,
        input.dataFim,
        true
      );

      const periodoAnterior = calcularPeriodoAnterior(input.dataInicio, input.dataFim);
      const [resultadoAnterior] = await clickQueries.getTotalMedicosAtendendo(
        periodoAnterior.dataInicio,
        periodoAnterior.dataFim,
        true
      );

      const semanaAnterior = calcularSemanaAnterior(input.dataInicio, input.dataFim);
      const [resultadoSemana] = await clickQueries.getTotalMedicosAtendendo(
        semanaAnterior.dataInicio,
        semanaAnterior.dataFim,
        true
      );

      const ultimas4Semanas = calcularUltimas4Semanas(input.dataInicio, input.dataFim);
      const resultados4Semanas = await Promise.all(
        ultimas4Semanas.map((p) =>
          clickQueries.getTotalMedicosAtendendo(p.dataInicio, p.dataFim, true)
        )
      );
      const soma4Semanas = resultados4Semanas.reduce((acc, [r]) => acc + (r?.total_medicos ?? 0), 0);
      const media4Semanas = soma4Semanas / 4;

      const total = resultadoAtual?.total_medicos ?? 0;
      const totalAnterior = resultadoAnterior?.total_medicos ?? 0;
      const totalSemana = resultadoSemana?.total_medicos ?? 0;
      const variacao = calcularVariacao(total, totalAnterior);
      const variacaoSemana = calcularVariacao(total, totalSemana);
      const variacaoMedia = calcularVariacao(total, media4Semanas);

      return {
        total,
        totalAnterior,
        totalSemana,
        media4Semanas: Math.round(media4Semanas),
        variacao,
        variacaoSemana,
        variacaoMedia,
        periodo: {
          atual: { dataInicio: input.dataInicio, dataFim: input.dataFim },
          anterior: periodoAnterior,
          semanaAnterior: semanaAnterior,
        },
      };
    }),

  consultasPorHorario: staffProcedure
    .input(
      z.object({
        dataInicio: z.string(),
        dataFim: z.string(),
      })
    )
    .query(async ({ input }) => {
      const dados = await clickQueries.getConsultasPorHorario(
        input.dataInicio,
        input.dataFim
      );

      return dados.map((item) => ({
        name: item.hora,
        value: item.total,
      }));
    }),

  receitasEnviadas: staffProcedure
    .input(
      z.object({
        dataInicio: z.string(),
        dataFim: z.string(),
      })
    )
    .query(async ({ input }) => {
      const [resultadoAtual] = await clickQueries.getTotalReceitasEnviadas(
        input.dataInicio,
        input.dataFim,
        true
      );

      const periodoAnterior = calcularPeriodoAnterior(input.dataInicio, input.dataFim);
      const [resultadoAnterior] = await clickQueries.getTotalReceitasEnviadas(
        periodoAnterior.dataInicio,
        periodoAnterior.dataFim,
        true
      );

      const semanaAnterior = calcularSemanaAnterior(input.dataInicio, input.dataFim);
      const [resultadoSemana] = await clickQueries.getTotalReceitasEnviadas(
        semanaAnterior.dataInicio,
        semanaAnterior.dataFim,
        true
      );

      const ultimas4Semanas = calcularUltimas4Semanas(input.dataInicio, input.dataFim);
      const resultados4Semanas = await Promise.all(
        ultimas4Semanas.map((p) =>
          clickQueries.getTotalReceitasEnviadas(p.dataInicio, p.dataFim, true)
        )
      );
      const soma4Semanas = resultados4Semanas.reduce((acc: number, [r]: any) => acc + (r?.total_receitas ?? 0), 0);
      const media4Semanas = soma4Semanas / 4;

      const total = resultadoAtual?.total_receitas ?? 0;
      const totalAnterior = resultadoAnterior?.total_receitas ?? 0;
      const totalSemana = resultadoSemana?.total_receitas ?? 0;
      const variacao = calcularVariacao(total, totalAnterior);
      const variacaoSemana = calcularVariacao(total, totalSemana);
      const variacaoMedia = calcularVariacao(total, media4Semanas);

      return {
        total,
        totalAnterior,
        totalSemana,
        media4Semanas: Math.round(media4Semanas),
        variacao,
        variacaoSemana,
        variacaoMedia,
        periodo: {
          atual: { dataInicio: input.dataInicio, dataFim: input.dataFim },
          anterior: periodoAnterior,
          semanaAnterior: semanaAnterior,
        },
      };
    }),
});
