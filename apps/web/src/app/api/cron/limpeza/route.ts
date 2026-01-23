import { NextResponse } from "next/server";
import prisma from "@clickmedicos/db";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const agora = new Date();

    const limiteRetry = new Date(agora);
    limiteRetry.setDate(limiteRetry.getDate() - 30);

    const retryDeletados = await prisma.syncQueue.deleteMany({
      where: {
        processadoEm: { not: null, lt: limiteRetry },
      },
    });

    const limiteAuditoria = new Date(agora);
    limiteAuditoria.setDate(limiteAuditoria.getDate() - 90);

    const auditoriasDeletadas = await prisma.auditoria.deleteMany({
      where: {
        createdAt: { lt: limiteAuditoria },
      },
    });

    const resultado = {
      retryDeletados: retryDeletados.count,
      auditoriasDeletadas: auditoriasDeletadas.count,
    };

    console.log("[CRON] Limpeza concluida:", resultado);

    await prisma.auditoria.create({
      data: {
        usuarioId: null,
        usuarioNome: "SISTEMA",
        acao: "CRON_LIMPEZA",
        entidade: "cron",
        dadosDepois: resultado,
      },
    });

    return NextResponse.json({
      success: true,
      ...resultado,
    });
  } catch (error) {
    console.error("[CRON] Erro na limpeza:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
