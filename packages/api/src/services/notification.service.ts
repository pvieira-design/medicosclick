import prisma from "@clickmedicos/db";
import type { NotificacaoTipo } from "@clickmedicos/db/enums";
import {
  notificarSolicitacaoRecebida,
  notificarSolicitacaoAtualizada,
  notificarCancelamentoRecebido,
} from "./whatsapp-notification.service";
import {
  enviarEmailSolicitacaoCriada,
  enviarEmailSolicitacaoAprovada,
  enviarEmailSolicitacaoRejeitada,
  enviarEmailCancelamentoSolicitado,
  enviarEmailCancelamentoAprovado,
  enviarEmailCancelamentoRejeitado,
} from "./email.service";

async function notificarStaff(params: {
  tipo: NotificacaoTipo;
  titulo: string;
  mensagem: string;
  referenciaId: string;
  referenciaTipo: "solicitacao" | "cancelamento";
}) {
  const staff = await prisma.user.findMany({
    where: {
      tipo: { in: ["atendente", "diretor", "admin", "super_admin"] },
      ativo: true,
    },
    select: { id: true },
  });

  if (staff.length === 0) return;

  await prisma.notificacao.createMany({
    data: staff.map((s) => ({
      usuarioId: s.id,
      tipo: params.tipo,
      titulo: params.titulo,
      mensagem: params.mensagem,
      referenciaId: params.referenciaId,
      referenciaTipo: params.referenciaTipo,
    })),
  });
}

export async function notificarSolicitacaoCriada(
  medicoId: string,
  solicitacaoId: string,
  totalSlots: number
) {
  const medico = await prisma.user.findUnique({
    where: { id: medicoId },
    select: { name: true, email: true },
  });

  await notificarStaff({
    tipo: "solicitacao_criada",
    titulo: "Nova solicitação de horários",
    mensagem: `${medico?.name ?? "Médico"} enviou uma solicitação de abertura de horários`,
    referenciaId: solicitacaoId,
    referenciaTipo: "solicitacao",
  });

  notificarSolicitacaoRecebida(medicoId).catch((err) => {
    console.error("[Notification] WhatsApp falhou:", err);
  });

  if (medico?.email) {
    enviarEmailSolicitacaoCriada(
      medico.email,
      medico.name ?? "Médico",
      totalSlots
    ).catch((err) => {
      console.error("[Notification] Email falhou:", err);
    });
  }
}

export async function notificarSolicitacaoAprovada(
  medicoId: string,
  solicitacaoId: string,
  aprovacaoParcial?: { aprovados: number; rejeitados: number }
) {
  const medico = await prisma.user.findUnique({
    where: { id: medicoId },
    select: { name: true, email: true },
  });

  const aprovados = aprovacaoParcial?.aprovados ?? 0;
  const rejeitados = aprovacaoParcial?.rejeitados ?? 0;
  
  let mensagem = "Sua solicitação de horários foi aprovada. Os horários já estão disponíveis.";
  
  if (rejeitados > 0) {
    mensagem = `Sua solicitação foi parcialmente aprovada: ${aprovados} horários aprovados e ${rejeitados} rejeitados.`;
  }

  await prisma.notificacao.create({
    data: {
      usuarioId: medicoId,
      tipo: "solicitacao_aprovada",
      titulo: rejeitados > 0 ? "Solicitação parcialmente aprovada" : "Solicitação aprovada!",
      mensagem,
      referenciaId: solicitacaoId,
      referenciaTipo: "solicitacao",
    },
  });

  notificarSolicitacaoAtualizada(medicoId).catch((err) => {
    console.error("[Notification] WhatsApp falhou:", err);
  });

  if (medico?.email) {
    enviarEmailSolicitacaoAprovada(
      medico.email,
      medico.name ?? "Médico",
      aprovados,
      rejeitados
    ).catch((err) => {
      console.error("[Notification] Email falhou:", err);
    });
  }
}

export async function notificarSolicitacaoRejeitada(
  medicoId: string,
  solicitacaoId: string,
  motivoRejeicao: string
) {
  const medico = await prisma.user.findUnique({
    where: { id: medicoId },
    select: { name: true, email: true },
  });

  await prisma.notificacao.create({
    data: {
      usuarioId: medicoId,
      tipo: "solicitacao_rejeitada",
      titulo: "Solicitação rejeitada",
      mensagem: `Sua solicitação foi rejeitada. Motivo: ${motivoRejeicao}`,
      referenciaId: solicitacaoId,
      referenciaTipo: "solicitacao",
    },
  });

  notificarSolicitacaoAtualizada(medicoId).catch((err) => {
    console.error("[Notification] WhatsApp falhou:", err);
  });

  if (medico?.email) {
    enviarEmailSolicitacaoRejeitada(
      medico.email,
      medico.name ?? "Médico",
      motivoRejeicao
    ).catch((err) => {
      console.error("[Notification] Email falhou:", err);
    });
  }
}

export async function notificarCancelamentoCriado(
  medicoId: string,
  cancelamentoId: string
) {
  const medico = await prisma.user.findUnique({
    where: { id: medicoId },
    select: { name: true, email: true },
  });

  await notificarStaff({
    tipo: "cancelamento_criado",
    titulo: "Novo cancelamento emergencial",
    mensagem: `${medico?.name ?? "Médico"} solicitou cancelamento emergencial de horários`,
    referenciaId: cancelamentoId,
    referenciaTipo: "cancelamento",
  });

  notificarCancelamentoRecebido(medicoId).catch((err) => {
    console.error("[Notification] WhatsApp falhou:", err);
  });

  if (medico?.email) {
    enviarEmailCancelamentoSolicitado(
      medico.email,
      medico.name ?? "Médico",
      cancelamentoId
    ).catch((err) => {
      console.error("[Notification] Email falhou:", err);
    });
  }
}

export async function notificarCancelamentoAprovado(
  medicoId: string,
  cancelamentoId: string,
  aplicouStrike: boolean = true,
  aprovacaoParcial?: { aprovados: number; rejeitados: number }
) {
  const medico = await prisma.user.findUnique({
    where: { id: medicoId },
    select: { name: true, email: true },
  });

  const aprovados = aprovacaoParcial?.aprovados ?? 0;
  const rejeitados = aprovacaoParcial?.rejeitados ?? 0;
  
  let mensagem = aplicouStrike
    ? "Seu cancelamento emergencial foi aprovado. Um strike foi aplicado à sua conta."
    : "Seu cancelamento emergencial foi aprovado.";
  
  let titulo = "Cancelamento aprovado";
  
  if (rejeitados > 0) {
    mensagem = aplicouStrike
      ? `Seu cancelamento foi parcialmente aprovado: ${aprovados} horários aprovados e ${rejeitados} rejeitados. Um strike foi aplicado à sua conta.`
      : `Seu cancelamento foi parcialmente aprovado: ${aprovados} horários aprovados e ${rejeitados} rejeitados.`;
    titulo = "Cancelamento parcialmente aprovado";
  }

  await prisma.notificacao.create({
    data: {
      usuarioId: medicoId,
      tipo: "cancelamento_aprovado",
      titulo,
      mensagem,
      referenciaId: cancelamentoId,
      referenciaTipo: "cancelamento",
    },
  });

  if (medico?.email) {
    enviarEmailCancelamentoAprovado(
      medico.email,
      medico.name ?? "Médico",
      aplicouStrike
    ).catch((err) => {
      console.error("[Notification] Email falhou:", err);
    });
  }
}

export async function notificarCancelamentoRejeitado(
  medicoId: string,
  cancelamentoId: string,
  motivoRejeicao: string
) {
  const medico = await prisma.user.findUnique({
    where: { id: medicoId },
    select: { name: true, email: true },
  });

  await prisma.notificacao.create({
    data: {
      usuarioId: medicoId,
      tipo: "cancelamento_rejeitado",
      titulo: "Cancelamento rejeitado",
      mensagem: `Seu cancelamento emergencial foi rejeitado. Motivo: ${motivoRejeicao}`,
      referenciaId: cancelamentoId,
      referenciaTipo: "cancelamento",
    },
  });

  if (medico?.email) {
    enviarEmailCancelamentoRejeitado(
      medico.email,
      medico.name ?? "Médico",
      motivoRejeicao
    ).catch((err) => {
      console.error("[Notification] Email falhou:", err);
    });
  }
}
