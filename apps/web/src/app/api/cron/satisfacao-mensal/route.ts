import { NextResponse } from "next/server";
import prisma from "@clickmedicos/db";
import { enviarEmailSatisfacaoPendente } from "@clickmedicos/api/services/email.service";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Retorna mes atual no formato YYYY-MM (America/Sao_Paulo) */
function getMesReferenciaAtual(): string {
  const agora = new Date();
  const spDate = new Date(agora.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  const ano = spDate.getFullYear();
  const mes = String(spDate.getMonth() + 1).padStart(2, "0");
  return `${ano}-${mes}`;
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const inicio = Date.now();
    const mesReferencia = getMesReferenciaAtual();

    // Buscar medicos que ja responderam neste mes
    const medicosQueResponderam = await prisma.satisfacaoMensal.findMany({
      where: { mesReferencia },
      select: { userId: true },
    });

    const idsQueResponderam = medicosQueResponderam.map((s) => s.userId);

    // Buscar medicos pendentes (ativos que nao responderam)
    const medicosPendentes = await prisma.user.findMany({
      where: {
        tipo: "medico",
        ativo: true,
        id: { notIn: idsQueResponderam },
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    let emailsEnviados = 0;
    let erros: string[] = [];

    // Enviar email para cada medico pendente
    for (const medico of medicosPendentes) {
      try {
        await enviarEmailSatisfacaoPendente(medico.email, medico.name, mesReferencia);

        // Criar notificacao in-app
        await prisma.notificacao.create({
          data: {
            usuarioId: medico.id,
            tipo: "satisfacao_pendente",
            titulo: "Pesquisa de Satisfação Pendente",
            mensagem: "Responda à pesquisa de satisfação do mês",
          },
        });

        emailsEnviados++;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Erro desconhecido";
        erros.push(`${medico.email}: ${errorMsg}`);
        console.error(`[CRON] Erro ao enviar email para ${medico.email}:`, error);
      }
    }

    const duracao = Date.now() - inicio;

    // Registrar auditoria
    await prisma.auditoria.create({
      data: {
        usuarioId: null,
        usuarioNome: "SISTEMA",
        acao: "CRON_ENVIO_SATISFACAO_MENSAL",
        entidade: "cron",
        dadosDepois: {
          mesReferencia,
          totalMedicosPendentes: medicosPendentes.length,
          emailsEnviados,
          erros: erros.length,
          duracaoMs: duracao,
        },
      },
    });

    console.log(
      `[CRON] Satisfacao mensal: ${emailsEnviados}/${medicosPendentes.length} emails enviados em ${duracao}ms`
    );

    return NextResponse.json({
      success: true,
      mesReferencia,
      totalMedicosPendentes: medicosPendentes.length,
      emailsEnviados,
      erros: erros.length > 0 ? erros : undefined,
      duracaoMs: duracao,
    });
  } catch (error) {
    console.error("[CRON] Erro ao enviar satisfacao mensal:", error);

    await prisma.auditoria.create({
      data: {
        usuarioId: null,
        usuarioNome: "SISTEMA",
        acao: "CRON_ENVIO_SATISFACAO_MENSAL_ERRO",
        entidade: "cron",
        dadosDepois: {
          erro: error instanceof Error ? error.message : "Erro desconhecido",
        },
      },
    });

    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
