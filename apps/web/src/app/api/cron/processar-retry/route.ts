import { NextResponse } from "next/server";
import prisma from "@clickmedicos/db";
import { processarFilaRetry, obterEstatisticasFilaRetry } from "@clickmedicos/api/services/sync.service";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const stats = await obterEstatisticasFilaRetry();

    if (stats.pendentes === 0) {
      return NextResponse.json({
        success: true,
        message: "Fila vazia",
        processados: 0,
      });
    }

    console.log(`[CRON] Processando ${stats.pendentes} itens na fila de retry...`);

    const resultado = await processarFilaRetry();

    if (resultado.processados > 0) {
      await prisma.auditoria.create({
        data: {
          usuarioId: null,
          usuarioNome: "SISTEMA",
          acao: "CRON_PROCESSAR_RETRY",
          entidade: "cron",
          dadosDepois: resultado,
        },
      });
    }

    return NextResponse.json({
      success: true,
      ...resultado,
    });
  } catch (error) {
    console.error("[CRON] Erro ao processar fila:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
