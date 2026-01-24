import { Resend } from "resend";
import { env } from "@clickmedicos/env/server";

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

const APP_URL = env.BETTER_AUTH_URL;
const FROM_EMAIL = env.EMAIL_FROM ?? "ClickMedicos <noreply@clickmedicos.com.br>";

interface EmailResult {
  success: boolean;
  error?: string;
}

interface EmailParams {
  to: string;
  subject: string;
  title: string;
  body: string;
  buttonText?: string;
  buttonUrl?: string;
}

function buildEmailHtml(params: Omit<EmailParams, "to" | "subject">): string {
  const { title, body, buttonText, buttonUrl } = params;

  const buttonHtml = buttonText && buttonUrl
    ? `
      <tr>
        <td align="center" style="padding: 32px 0;">
          <a href="${buttonUrl}" 
             style="display: inline-block; background-color: #16a34a; color: #ffffff; 
                    font-size: 16px; font-weight: 600; text-decoration: none; 
                    padding: 14px 32px; border-radius: 8px;">
            ${buttonText}
          </a>
        </td>
      </tr>`
    : "";

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f4f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden;">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); padding: 32px 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">
                ClickMedicos
              </h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 16px; color: #18181b; font-size: 22px; font-weight: 600;">
                ${title}
              </h2>
              <p style="margin: 0; color: #52525b; font-size: 16px; line-height: 1.6;">
                ${body.replace(/\n/g, "<br>")}
              </p>
            </td>
          </tr>
          
          <!-- Button -->
          ${buttonHtml}
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background-color: #fafafa; border-top: 1px solid #e4e4e7;">
              <p style="margin: 0; color: #a1a1aa; font-size: 13px; text-align: center;">
                Este email foi enviado automaticamente pelo sistema ClickMedicos.<br>
                Por favor, nao responda a este email.
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

async function sendEmail(params: EmailParams): Promise<EmailResult> {
  if (!resend) {
    console.warn("[Email] Resend não configurado (RESEND_API_KEY ausente)");
    return { success: false, error: "Email service not configured" };
  }

  try {
    const html = buildEmailHtml(params);

    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: params.to,
      subject: params.subject,
      html,
    });

    if (error) {
      console.error("[Email] Erro ao enviar:", error);
      return { success: false, error: error.message };
    }

    console.log(`[Email] Enviado para ${params.to}: ${params.subject}`);
    return { success: true };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    console.error("[Email] Exceção ao enviar:", errorMessage);
    return { success: false, error: errorMessage };
  }
}

export async function enviarEmailSolicitacaoCriada(
  email: string,
  nomeMedico: string,
  totalSlots: number
): Promise<EmailResult> {
  return sendEmail({
    to: email,
    subject: "Solicitação de horários recebida",
    title: "Solicitação Recebida!",
    body: `Olá, ${nomeMedico}!\n\nSua solicitação de abertura de ${totalSlots} horários foi recebida com sucesso.\n\nNossa equipe analisará sua solicitação e você será notificado assim que houver uma atualização.`,
    buttonText: "Ver Minhas Solicitações",
    buttonUrl: `${APP_URL}/dashboard/solicitacoes`,
  });
}

export async function enviarEmailSolicitacaoAprovada(
  email: string,
  nomeMedico: string,
  aprovados: number,
  rejeitados: number
): Promise<EmailResult> {
  const isParcial = rejeitados > 0;
  
  const body = isParcial
    ? `Olá, ${nomeMedico}!\n\nSua solicitação foi parcialmente aprovada.\n\n✅ ${aprovados} horários aprovados\n❌ ${rejeitados} horários não aprovados\n\nOs horários aprovados já estão disponíveis na sua agenda.`
    : `Olá, ${nomeMedico}!\n\nÓtima notícia! Sua solicitação foi aprovada.\n\n✅ ${aprovados} horários foram adicionados à sua agenda e já estão disponíveis para agendamento.`;

  return sendEmail({
    to: email,
    subject: isParcial ? "Solicitação parcialmente aprovada" : "Solicitação aprovada!",
    title: isParcial ? "Solicitação Parcialmente Aprovada" : "Solicitação Aprovada!",
    body,
    buttonText: "Ver Minha Agenda",
    buttonUrl: `${APP_URL}/dashboard/agenda`,
  });
}

export async function enviarEmailSolicitacaoRejeitada(
  email: string,
  nomeMedico: string,
  motivo: string
): Promise<EmailResult> {
  return sendEmail({
    to: email,
    subject: "Solicitação de horários rejeitada",
    title: "Solicitação Rejeitada",
    body: `Olá, ${nomeMedico}.\n\nInfelizmente sua solicitação de horários foi rejeitada.\n\n📋 Motivo: ${motivo}\n\nVocê pode criar uma nova solicitação a qualquer momento.`,
    buttonText: "Criar Nova Solicitação",
    buttonUrl: `${APP_URL}/dashboard/horarios`,
  });
}

export async function enviarEmailCancelamentoSolicitado(
  email: string,
  nomeMedico: string,
  cancelamentoId: string
): Promise<EmailResult> {
  return sendEmail({
    to: email,
    subject: "Cancelamento emergencial recebido",
    title: "Cancelamento Recebido",
    body: `Olá, ${nomeMedico}!\n\nSua solicitação de cancelamento emergencial foi recebida com sucesso.\n\n📋 ID: ${cancelamentoId}\n\nNossa equipe analisará sua solicitação e você será notificado assim que houver uma decisão.`,
    buttonText: "Ver Status",
    buttonUrl: `${APP_URL}/dashboard/cancelamentos`,
  });
}

export async function enviarEmailCancelamentoAprovado(
  email: string,
  nomeMedico: string,
  aplicouStrike: boolean
): Promise<EmailResult> {
  const strikeInfo = aplicouStrike
    ? "\n\n⚠️ Um strike foi aplicado à sua conta conforme as regras do sistema."
    : "";

  return sendEmail({
    to: email,
    subject: "Cancelamento emergencial aprovado",
    title: "Cancelamento Aprovado",
    body: `Olá, ${nomeMedico}!\n\nSeu cancelamento emergencial foi aprovado.\n\n✅ Os horários foram removidos da sua agenda.${strikeInfo}`,
    buttonText: "Ver Minha Agenda",
    buttonUrl: `${APP_URL}/dashboard/agenda`,
  });
}

export async function enviarEmailCancelamentoRejeitado(
  email: string,
  nomeMedico: string,
  motivo: string
): Promise<EmailResult> {
  return sendEmail({
    to: email,
    subject: "Cancelamento emergencial rejeitado",
    title: "Cancelamento Rejeitado",
    body: `Olá, ${nomeMedico}.\n\nSeu cancelamento emergencial foi rejeitado.\n\n📋 Motivo: ${motivo}\n\nOs horários permanecem na sua agenda. Entre em contato com a equipe se precisar de mais informações.`,
    buttonText: "Ver Minha Agenda",
    buttonUrl: `${APP_URL}/dashboard/agenda`,
  });
}

export async function enviarEmailCancelamentoParaStaff(
  emailsStaff: string[],
  nomeMedico: string,
  cancelamentoId: string,
  totalSlots: number
): Promise<EmailResult[]> {
  const results: EmailResult[] = [];

  for (const email of emailsStaff) {
    const result = await sendEmail({
      to: email,
      subject: `[URGENTE] Cancelamento emergencial - ${nomeMedico}`,
      title: "Novo Cancelamento Emergencial",
      body: `O médico ${nomeMedico} solicitou um cancelamento emergencial.\n\n📋 ID: ${cancelamentoId}\n📅 Total de horários: ${totalSlots}\n\nPor favor, analise a solicitação o mais rápido possível.`,
      buttonText: "Analisar Solicitação",
      buttonUrl: `${APP_URL}/dashboard/cancelamentos/${cancelamentoId}`,
    });
    results.push(result);
  }

  return results;
}

export async function enviarEmailNovoCandidato(
  emailsStaff: string[],
  nome: string,
  email: string,
  crmNumero: string,
  crmEstado: string,
  especialidades: string[]
): Promise<EmailResult[]> {
  const results: EmailResult[] = [];
  const crm = `${crmNumero}-${crmEstado}`;
  const especialidadesStr = especialidades.join(", ");

  for (const staffEmail of emailsStaff) {
    const result = await sendEmail({
      to: staffEmail,
      subject: `Novo Candidato - ${nome}`,
      title: "Novo Candidato Registrado",
      body: `Um novo candidato se registrou no sistema.\n\n👤 Nome: ${nome}\n📧 Email: ${email}\n🏥 CRM: ${crm}\n🔬 Especialidades: ${especialidadesStr}\n\nAcesse o Kanban para revisar a candidatura.`,
      buttonText: "Ver Kanban de Onboarding",
      buttonUrl: `${APP_URL}/dashboard/onboarding`,
    });
    results.push(result);
  }

  return results;
}
