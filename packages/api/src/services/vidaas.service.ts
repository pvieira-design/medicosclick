import crypto from "crypto";

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface PKCEPair {
  code_verifier: string;
  code_challenge: string;
}

export interface CertificateSlot {
  slot_alias: string;
  label: string;
}

export interface VerificarCertificadoResponse {
  possuiCertificado: boolean;
  slots: CertificateSlot[];
}

export interface SolicitarAutorizacaoResponse {
  code: string;
  code_verifier: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  authorized_identification: string;
  authorized_identification_type: string;
}

export interface SignatureRequest {
  id: string;
  alias: string;
  hash: string;
  hash_algorithm: string;
  signature_format: string;
  padding_method: string;
  pdf_signature_page: string;
  base64_content: string;
}

export interface SignatureResponse {
  pdfAssinadoBase64: string;
  certificateAlias: string;
}

export interface VidaasConfig {
  baseUrl: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

// ============================================================================
// ERROR CLASSES
// ============================================================================

export class VidaasError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public originalError?: unknown
  ) {
    super(message);
    this.name = "VidaasError";
  }
}

export class VidaasAuthError extends VidaasError {
  constructor(message: string) {
    super(message, 401);
    this.name = "VidaasAuthError";
  }
}

export class VidaasTimeoutError extends VidaasError {
  constructor(message: string) {
    super(message, 408);
    this.name = "VidaasTimeoutError";
  }
}

export class VidaasRateLimitError extends VidaasError {
  constructor(message: string, public retryAfter?: number) {
    super(message, 429);
    this.name = "VidaasRateLimitError";
  }
}

export class VidaasServiceUnavailableError extends VidaasError {
  constructor(message: string) {
    super(message, 503);
    this.name = "VidaasServiceUnavailableError";
  }
}

// ============================================================================
// VIDAAS SERVICE
// ============================================================================

export class VidaasService {
  private readonly baseUrl: string;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;
  private readonly timeout: number = 30000; // 30s

  constructor(config?: Partial<VidaasConfig>) {
    this.baseUrl =
      config?.baseUrl ?? process.env.VIDAAS_BASE_URL ?? "";
    this.clientId =
      config?.clientId ?? process.env.VIDAAS_CLIENT_ID ?? "";
    this.clientSecret =
      config?.clientSecret ?? process.env.VIDAAS_CLIENT_SECRET ?? "";
    this.redirectUri =
      config?.redirectUri ?? process.env.VIDAAS_REDIRECT_URI ?? "push://";

    if (!this.baseUrl || !this.clientId || !this.clientSecret) {
      throw new VidaasError(
        "VIDaaS configuration missing. Check VIDAAS_BASE_URL, VIDAAS_CLIENT_ID, and VIDAAS_CLIENT_SECRET environment variables."
      );
    }
  }

  /**
   * Gera par PKCE (Proof Key for Code Exchange)
   * - code_verifier: Random 32-byte string, Base64 URL-safe
   * - code_challenge: SHA-256(code_verifier), Base64 URL-safe
   */
  generatePKCE(): PKCEPair {
    const code_verifier = crypto
      .randomBytes(32)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "");

    const code_challenge = crypto
      .createHash("sha256")
      .update(code_verifier)
      .digest("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "");

    return { code_verifier, code_challenge };
  }

  /**
   * Calcula hash SHA-256 do PDF em Base64
   */
  calculateHash(pdfBase64: string): string {
    const buffer = Buffer.from(pdfBase64, "base64");
    return crypto.createHash("sha256").update(buffer).digest("base64");
  }

  /**
   * Verifica se médico possui certificado digital VIDaaS
   */
  async verificarCertificado(cpf: string): Promise<VerificarCertificadoResponse> {
    const url = `${this.baseUrl}/v0/oauth/user-discovery`;
    const payload = {
      client_id: this.clientId,
      client_secret: this.clientSecret,
      user_cpf_cnpj: "CPF",
      val_cpf_cnpj: cpf.replace(/\D/g, ""),
    };

    try {
      const response = await this.makeRequest<{
        status: string;
        slots?: CertificateSlot[];
      }>(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      return {
        possuiCertificado: response.status === "S",
        slots: response.slots ?? [],
      };
    } catch (error) {
      throw this.handleError(error, "Erro ao verificar certificado");
    }
  }

  /**
   * Solicita autorização via push notification
   * @param cpf CPF do médico (11 dígitos)
   * @param lifetime Tempo de vida da sessão em segundos (padrão: 12h = 43200s)
   */
  async solicitarAutorizacaoPush(
    cpf: string,
    lifetime: number = 43200
  ): Promise<SolicitarAutorizacaoResponse> {
    const pkce = this.generatePKCE();

    const params = new URLSearchParams({
      client_id: this.clientId,
      code_challenge: pkce.code_challenge,
      code_challenge_method: "S256",
      response_type: "code",
      scope: "signature_session",
      login_hint: cpf.replace(/\D/g, ""),
      lifetime: lifetime.toString(),
      redirect_uri: this.redirectUri,
    });

    const url = `${this.baseUrl}/v0/oauth/authorize?${params.toString()}`;

    try {
      const response = await this.makeRequest<{ code: string }>(url, {
        method: "GET",
      });

      return {
        code: response.code,
        code_verifier: pkce.code_verifier,
      };
    } catch (error) {
      throw this.handleError(error, "Erro ao solicitar autorização push");
    }
  }

  /**
   * Aguarda autorização do médico via polling
   * @param code Código retornado pelo /authorize
   * @param timeoutMs Timeout em milissegundos (padrão: 2 minutos)
   */
  async aguardarAutorizacao(
    code: string,
    timeoutMs: number = 120000
  ): Promise<string> {
    const startTime = Date.now();
    const url = `${this.baseUrl}/valid/api/v1/trusted-services/authentications`;

    while (Date.now() - startTime < timeoutMs) {
      try {
        const params = new URLSearchParams({ code });
        const response = await this.makeRequest<{
          authorizationToken?: string;
          status?: string;
        }>(`${url}?${params.toString()}`, {
          method: "GET",
        });

        if (response.authorizationToken) {
          return response.authorizationToken;
        }

        // Status 202 ou pending = ainda aguardando
      } catch (error) {
        // Se for 202 (Accepted), continua polling
        if (error instanceof VidaasError && error.statusCode === 202) {
          // Continue polling
        } else {
          throw error;
        }
      }

      // Aguardar 1 segundo antes do próximo polling (requisito da API)
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    throw new VidaasTimeoutError(
      "Timeout: Médico não autorizou a assinatura no tempo limite"
    );
  }

  /**
   * Obtém access token usando authorization code
   */
  async obterAccessToken(
    authorizationToken: string,
    codeVerifier: string
  ): Promise<TokenResponse> {
    const url = `${this.baseUrl}/v0/oauth/token`;

    const params = new URLSearchParams({
      grant_type: "authorization_code",
      client_id: this.clientId,
      client_secret: this.clientSecret,
      code: authorizationToken,
      code_verifier: codeVerifier,
    });

    try {
      const response = await this.makeRequest<TokenResponse>(url, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
      });

      return response;
    } catch (error) {
      throw this.handleError(error, "Erro ao obter access token");
    }
  }

  /**
   * Assina o PDF com certificado digital
   */
  async assinarPdf(
    accessToken: string,
    pdfBase64: string,
    documentId: string,
    documentAlias: string
  ): Promise<SignatureResponse> {
    const url = `${this.baseUrl}/v0/oauth/signature`;
    const hash = this.calculateHash(pdfBase64);

    const payload = {
      hashes: [
        {
          id: documentId,
          alias: documentAlias,
          hash: hash,
          hash_algorithm: "2.16.840.1.101.3.4.2.1", // SHA-256 OID
          signature_format: "PAdES_AD_RT", // PAdES com timestamp
          padding_method: "PKCS1V1_5",
          pdf_signature_page: "true",
          base64_content: pdfBase64,
        },
      ],
    };

    try {
      const response = await this.makeRequest<{
        signatures: Array<{ id: string; raw_signature: string }>;
        certificate_alias: string;
      }>(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
      });

      const firstSignature = response.signatures[0];
      if (!firstSignature?.raw_signature) {
        throw new VidaasError("Assinatura não retornada pela API VIDaaS");
      }

      return {
        pdfAssinadoBase64: firstSignature.raw_signature,
        certificateAlias: response.certificate_alias,
      };
    } catch (error) {
      throw this.handleError(error, "Erro ao assinar PDF");
    }
  }

  /**
   * Fluxo completo de assinatura de receita médica
   * 1. Verifica certificado
   * 2. Solicita autorização push
   * 3. Aguarda médico autorizar
   * 4. Obtém access token
   * 5. Assina PDF
   */
  async assinarReceita(
    cpfMedico: string,
    pdfBase64: string,
    receitaId: string
  ): Promise<SignatureResponse> {
    // 1. Verificar certificado
    const { possuiCertificado } = await this.verificarCertificado(cpfMedico);
    if (!possuiCertificado) {
      throw new VidaasError(
        "Médico não possui certificado digital VIDaaS ativo"
      );
    }

    // 2. Solicitar autorização
    const { code, code_verifier } =
      await this.solicitarAutorizacaoPush(cpfMedico);

    // 3. Aguardar médico autorizar
    const authorizationToken = await this.aguardarAutorizacao(code);

    // 4. Obter access token
    const tokenData = await this.obterAccessToken(
      authorizationToken,
      code_verifier
    );

    // 5. Assinar PDF
    const resultado = await this.assinarPdf(
      tokenData.access_token,
      pdfBase64,
      receitaId,
      `receita_${receitaId}.pdf`
    );

    return resultado;
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  /**
   * Faz requisição HTTP com timeout e tratamento de erros
   */
  private async makeRequest<T>(url: string, options: RequestInit): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Status 202 = Accepted (ainda processando)
      if (response.status === 202) {
        throw new VidaasError("Request still processing", 202);
      }

      if (!response.ok) {
        const errorText = await response.text().catch(() => "Unknown error");
        throw new VidaasError(
          `HTTP ${response.status}: ${errorText}`,
          response.status
        );
      }

      const data = (await response.json()) as T;
      return data;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === "AbortError") {
        throw new VidaasTimeoutError("Request timeout (30s)");
      }

      throw error;
    }
  }

  /**
   * Trata erros da API VIDaaS
   */
  private handleError(error: unknown, context: string): VidaasError {
    if (error instanceof VidaasError) {
      return error;
    }

    if (error instanceof Error) {
      // Parse status code from error message if available
      const statusMatch = error.message.match(/HTTP (\d+):/);
      const statusCode = statusMatch?.[1] ? parseInt(statusMatch[1], 10) : undefined;

      switch (statusCode) {
        case 400:
          return new VidaasError(
            `${context}: Parâmetros inválidos - ${error.message}`,
            400,
            error
          );
        case 401:
          return new VidaasAuthError(
            `${context}: Token inválido ou expirado - ${error.message}`
          );
        case 403:
          return new VidaasError(
            `${context}: Acesso negado - ${error.message}`,
            403,
            error
          );
        case 404:
          return new VidaasError(
            `${context}: Recurso não encontrado - ${error.message}`,
            404,
            error
          );
        case 408:
          return new VidaasTimeoutError(`${context}: ${error.message}`);
        case 429:
          return new VidaasRateLimitError(
            `${context}: Limite de requisições excedido - ${error.message}`
          );
        case 500:
          return new VidaasError(
            `${context}: Erro interno do servidor VIDaaS - ${error.message}`,
            500,
            error
          );
        case 503:
          return new VidaasServiceUnavailableError(
            `${context}: Serviço VIDaaS temporariamente indisponível - ${error.message}`
          );
        default:
          return new VidaasError(
            `${context}: ${error.message}`,
            statusCode,
            error
          );
      }
    }

    return new VidaasError(`${context}: Erro desconhecido`, undefined, error);
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let vidaasServiceInstance: VidaasService | null = null;

export function getVidaasService(config?: Partial<VidaasConfig>): VidaasService {
  if (!vidaasServiceInstance) {
    vidaasServiceInstance = new VidaasService(config);
  }
  return vidaasServiceInstance;
}

export default VidaasService;
