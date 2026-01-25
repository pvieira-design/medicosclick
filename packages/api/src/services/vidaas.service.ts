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

    if (!this.baseUrl) {
      throw new VidaasError(
        "VIDaaS base URL not configured. Set VIDAAS_BASE_URL environment variable."
      );
    }

    if (!this.clientId || !this.clientSecret) {
      throw new VidaasError(
        "VIDaaS credentials missing. Configure your Client ID and Client Secret in the VIDaaS settings page."
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
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);
      
      const response = await fetch(url, {
        method: "GET",
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorText = await response.text().catch(() => "Unknown error");
        throw new VidaasError(`HTTP ${response.status}: ${errorText}`, response.status);
      }
      
      const responseText = await response.text();
      
      // VIDaaS returns URL-encoded response: "code=xxxxx"
      let code: string | undefined;
      if (responseText.startsWith("code=")) {
        code = responseText.split("=")[1];
      } else {
        // Fallback to JSON parsing
        try {
          const data = JSON.parse(responseText) as { code?: string };
          code = data.code;
        } catch {
          throw new VidaasError(`Resposta inesperada do VIDaaS: ${responseText.slice(0, 100)}`);
        }
      }
      
      if (!code) {
        throw new VidaasError("VIDaaS não retornou código de autorização");
      }

      console.log(`[VIDaaS] Code recebido: ${code.slice(0, 20)}...`);

      return {
        code,
        code_verifier: pkce.code_verifier,
      };
    } catch (error) {
      if (error instanceof VidaasError) {
        throw error;
      }
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
    let attempts = 0;

    console.log(`[VIDaaS] Aguardando autorização... (timeout: ${timeoutMs}ms)`);

    while (Date.now() - startTime < timeoutMs) {
      attempts++;
      try {
        const params = new URLSearchParams({ code });
        const fullUrl = `${url}?${params.toString()}`;
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        const response = await fetch(fullUrl, {
          method: "GET",
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        if (response.status === 202 || response.status === 304) {
          if (attempts % 10 === 0) {
            console.log(`[VIDaaS] Ainda aguardando autorização... (${attempts}s)`);
          }
          await new Promise((resolve) => setTimeout(resolve, 1000));
          continue;
        }

        if (!response.ok) {
          const errorText = await response.text().catch(() => "Unknown error");
          console.error(`[VIDaaS] Erro na autenticação: ${response.status} - ${errorText}`);
          throw new VidaasError(`HTTP ${response.status}: ${errorText}`, response.status);
        }

        const data = await response.json() as { authorizationToken?: string; redirectUrl?: string };
        
        if (data.authorizationToken) {
          console.log(`[VIDaaS] Autorização recebida após ${attempts}s`);
          return data.authorizationToken;
        }

        console.log(`[VIDaaS] Resposta sem token:`, JSON.stringify(data).slice(0, 200));

      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          console.log(`[VIDaaS] Request timeout, continuando polling...`);
          await new Promise((resolve) => setTimeout(resolve, 1000));
          continue;
        }
        
        if (error instanceof VidaasError) {
          throw error;
        }
        
        console.error(`[VIDaaS] Erro no polling:`, error);
        throw new VidaasError(
          error instanceof Error ? error.message : "Erro desconhecido",
          undefined,
          error
        );
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    throw new VidaasTimeoutError(
      "Timeout: Médico não autorizou a assinatura no tempo limite (2 min)"
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
        signatures: Array<{
          id: string;
          raw_signature: string;
          signed_file?: string;
          file_base64_signed?: string;
        }>;
        certificate_alias: string;
      }>(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
      });

      console.log("[VIDaaS] ========== DIAGNOSTICO RESPOSTA ==========");
      console.log("[VIDaaS] Campos na resposta:", Object.keys(response));
      console.log("[VIDaaS] Campos em signatures[0]:", response.signatures[0] ? Object.keys(response.signatures[0]) : "nenhum");
      console.log("[VIDaaS] certificate_alias:", response.certificate_alias);
      
      const firstSignature = response.signatures[0];
      if (!firstSignature?.raw_signature && !firstSignature?.file_base64_signed) {
        throw new VidaasError("Assinatura não retornada pela API VIDaaS");
      }

      const signedPdf = firstSignature.file_base64_signed || firstSignature.signed_file || firstSignature.raw_signature;
      const cleanBase64 = signedPdf.replace(/[\r\n]/g, "");
      
      console.log("[VIDaaS] Campo usado:", firstSignature.file_base64_signed ? "file_base64_signed" : (firstSignature.signed_file ? "signed_file" : "raw_signature"));
      console.log("[VIDaaS] Tamanho PDF original:", pdfBase64.length, "caracteres");
      console.log("[VIDaaS] Tamanho retornado:", cleanBase64.length, "caracteres");
      console.log("[VIDaaS] Razao (retornado/original):", (cleanBase64.length / pdfBase64.length).toFixed(2));
      
      const isPdfCompleto = cleanBase64.length >= pdfBase64.length * 0.8;
      console.log("[VIDaaS] Parece ser PDF completo?", isPdfCompleto ? "SIM" : "NAO (provavelmente so assinatura CMS)");
      
      const primeirosBytes = Buffer.from(cleanBase64.slice(0, 100), 'base64').toString('utf8').slice(0, 20);
      console.log("[VIDaaS] Primeiros bytes (decodificado):", primeirosBytes);
      console.log("[VIDaaS] Comeca com %PDF?", primeirosBytes.startsWith('%PDF') ? "SIM (e um PDF)" : "NAO");
      console.log("[VIDaaS] ==========================================");

      return {
        pdfAssinadoBase64: cleanBase64,
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
    console.log(`[VIDaaS] Iniciando assinatura da receita ${receitaId}`);
    
    console.log(`[VIDaaS] 1/5 Verificando certificado...`);
    const { possuiCertificado } = await this.verificarCertificado(cpfMedico);
    if (!possuiCertificado) {
      throw new VidaasError(
        "Médico não possui certificado digital VIDaaS ativo"
      );
    }
    console.log(`[VIDaaS] 1/5 Certificado verificado ✓`);

    console.log(`[VIDaaS] 2/5 Enviando push notification...`);
    const { code, code_verifier } =
      await this.solicitarAutorizacaoPush(cpfMedico);
    console.log(`[VIDaaS] 2/5 Push enviado ✓ (code: ${code.slice(0, 20)}...)`);

    console.log(`[VIDaaS] 3/5 Aguardando autorização do médico...`);
    const authorizationToken = await this.aguardarAutorizacao(code);
    console.log(`[VIDaaS] 3/5 Autorização recebida ✓`);

    console.log(`[VIDaaS] 4/5 Obtendo access token...`);
    const tokenData = await this.obterAccessToken(
      authorizationToken,
      code_verifier
    );
    console.log(`[VIDaaS] 4/5 Token obtido ✓`);

    console.log(`[VIDaaS] 5/5 Assinando PDF...`);
    const resultado = await this.assinarPdf(
      tokenData.access_token,
      pdfBase64,
      receitaId,
      `receita_${receitaId}.pdf`
    );
    console.log(`[VIDaaS] 5/5 PDF assinado ✓`);

    console.log(`[VIDaaS] Assinatura concluída com sucesso!`);
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

export function getVidaasService(config?: Partial<VidaasConfig>): VidaasService {
  return new VidaasService(config);
}

export default VidaasService;
