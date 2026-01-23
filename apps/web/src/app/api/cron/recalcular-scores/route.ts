import { NextResponse } from "next/server";
import prisma from "@clickmedicos/db";
import { recalcularTodosScores } from "@clickmedicos/api/services/score.service";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const inicio = Date.now();

    const resultado = await recalcularTodosScores();

    const duracao = Date.now() - inicio;

    await prisma.auditoria.create({
      data: {
        usuarioId: null,
        usuarioNome: "SISTEMA",
        acao: "CRON_RECALCULAR_SCORES",
        entidade: "cron",
        dadosDepois: {
          atualizados: resultado.atualizados,
          erros: resultado.erros.length,
          duracaoMs: duracao,
        },
      },
    });

    console.log(`[CRON] Scores recalculados: ${resultado.atualizados} em ${duracao}ms`);

    return NextResponse.json({
      success: true,
      atualizados: resultado.atualizados,
      erros: resultado.erros.length,
      duracaoMs: duracao,
    });
  } catch (error) {
    console.error("[CRON] Erro ao recalcular scores:", error);

    await prisma.auditoria.create({
      data: {
        usuarioId: null,
        usuarioNome: "SISTEMA",
        acao: "CRON_RECALCULAR_SCORES_ERRO",
        entidade: "cron",
        dadosDepois: {
          erro: error instanceof Error ? error.message : "Erro desconhecido",
        },
      },
    });

    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
