import type { ClickSchedule } from "../utils/horario-converter";

const CLICK_API_BASE_URL =
  process.env.CLICK_API_BASE_URL ?? "https://clickcannabis.app.n8n.cloud/webhook";
const CLICK_API_TIMEOUT = 8000; // 8s para Vercel

export interface AtualizarHorarioPayload {
  doctor_id: number;
  schedule: ClickSchedule;
}

export interface AtualizarPrioridadeItem {
  id: number;
  prioridade: number;
}

export interface ClickApiResponse {
  success: boolean;
  message?: string;
  error?: string;
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeout: number
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function makeRequest<T>(
  endpoint: string,
  payload: unknown
): Promise<ClickApiResponse & { data?: T }> {
  const url = `${CLICK_API_BASE_URL}${endpoint}`;

  try {
    const response = await fetchWithTimeout(
      url,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
      CLICK_API_TIMEOUT
    );

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      return {
        success: false,
        error: `HTTP ${response.status}: ${errorText}`,
      };
    }

    const data = (await response.json().catch(() => ({}))) as T;
    return { success: true, data };
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        return { success: false, error: "Request timeout (8s)" };
      }
      return { success: false, error: error.message };
    }
    return { success: false, error: "Unknown error" };
  }
}

export const clickApi = {
  atualizarHorarioMedico: async (
    payload: AtualizarHorarioPayload
  ): Promise<ClickApiResponse> => {
    console.log(
      `[ClickAPI] Atualizando horarios do medico ${payload.doctor_id}`
    );
    return makeRequest("/atualizar-hora-medico", payload);
  },

  atualizarPrioridadeMedicos: async (
    payload: AtualizarPrioridadeItem[]
  ): Promise<ClickApiResponse> => {
    console.log(`[ClickAPI] Atualizando prioridade de ${payload.length} medicos`);
    return makeRequest("/atualizar-prioridade-medico", payload);
  },
};

export { CLICK_API_BASE_URL, CLICK_API_TIMEOUT };
