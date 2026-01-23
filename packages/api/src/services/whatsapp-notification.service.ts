import prisma from "@clickmedicos/db";
import { clickQueries } from "@clickmedicos/db/click-replica";

const WEBHOOK_BASE_URL = "https://clickcannabis.app.n8n.cloud/webhook";
const WEBHOOK_TIMEOUT = 5000;

interface NotificationResult {
  success: boolean;
  error?: string;
}

async function buscarTelefoneMedico(medicoId: string): Promise<string | null> {
  try {
    const medico = await prisma.user.findUnique({
      where: { id: medicoId },
      select: { clickDoctorId: true },
    });

    if (!medico?.clickDoctorId) {
      console.warn(`[WhatsApp] Médico ${medicoId} não tem clickDoctorId`);
      return null;
    }

    const [medicoClick] = await clickQueries.getMedicoById(medico.clickDoctorId);
    
    if (!medicoClick?.phone) {
      console.warn(`[WhatsApp] Médico ${medicoId} (clickId: ${medico.clickDoctorId}) não tem telefone`);
      return null;
    }

    return medicoClick.phone;
  } catch (error) {
    console.error(`[WhatsApp] Erro ao buscar telefone do médico ${medicoId}:`, error);
    return null;
  }
}

async function chamarWebhook(
  endpoint: string,
  payload: Record<string, unknown>
): Promise<NotificationResult> {
  const url = `${WEBHOOK_BASE_URL}${endpoint}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT);

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      console.error(`[WhatsApp] Webhook falhou: HTTP ${response.status} - ${errorText}`);
      return { success: false, error: `HTTP ${response.status}` };
    }

    return { success: true };
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        console.error(`[WhatsApp] Webhook timeout (${WEBHOOK_TIMEOUT}ms)`);
        return { success: false, error: "Timeout" };
      }
      console.error(`[WhatsApp] Webhook erro:`, error.message);
      return { success: false, error: error.message };
    }
    console.error(`[WhatsApp] Webhook erro desconhecido`);
    return { success: false, error: "Unknown error" };
  }
}

export async function notificarSolicitacaoRecebida(
  medicoId: string
): Promise<NotificationResult> {
  const telefone = await buscarTelefoneMedico(medicoId);

  if (!telefone) {
    return { success: false, error: "Telefone não encontrado" };
  }

  console.log(`[WhatsApp] Notificando solicitação recebida para médico ${medicoId}`);
  
  return chamarWebhook("/solicitacao_medico_recebida", { telefone });
}

export async function notificarSolicitacaoAtualizada(
  medicoId: string
): Promise<NotificationResult> {
  const telefone = await buscarTelefoneMedico(medicoId);

  if (!telefone) {
    return { success: false, error: "Telefone não encontrado" };
  }

  console.log(`[WhatsApp] Notificando solicitação atualizada para médico ${medicoId}`);
  
  return chamarWebhook("/solicitacao_aprovada", { telefone });
}

export async function notificarCancelamentoRecebido(
  medicoId: string
): Promise<NotificationResult> {
  const telefone = await buscarTelefoneMedico(medicoId);

  if (!telefone) {
    return { success: false, error: "Telefone não encontrado" };
  }

  console.log(`[WhatsApp] Notificando cancelamento recebido para médico ${medicoId}`);
  
  return chamarWebhook("/solicitacao_medico_recebida", { telefone });
}
