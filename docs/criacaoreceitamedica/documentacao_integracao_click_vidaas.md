# 📋 Documentação Técnica: Integração Click Cannabis + VIDaaS

**Versão:** 1.0  
**Data:** Janeiro/2026  
**Autor:** Click Cannabis - Time de Tecnologia  
**Classificação:** Documento Técnico Interno

---

## 📑 Índice

1. [Visão Geral](#1-visão-geral)
2. [Arquitetura da Integração](#2-arquitetura-da-integração)
3. [Pré-requisitos](#3-pré-requisitos)
4. [Configuração Inicial](#4-configuração-inicial)
5. [Fluxo Completo de Assinatura](#5-fluxo-completo-de-assinatura)
6. [Endpoints da API VIDaaS](#6-endpoints-da-api-vidaas)
7. [Formatos de Request e Response](#7-formatos-de-request-e-response)
8. [Códigos de Erro e Tratamento](#8-códigos-de-erro-e-tratamento)
9. [Validação de Assinaturas](#9-validação-de-assinaturas)
10. [Boas Práticas e Segurança](#10-boas-práticas-e-segurança)
11. [Exemplos de Implementação](#11-exemplos-de-implementação)
12. [Troubleshooting](#12-troubleshooting)
13. [Links Úteis](#13-links-úteis)
14. [Glossário](#14-glossário)

---

## 1. Visão Geral

### 1.1 Objetivo

Esta documentação detalha a integração entre o sistema da **Click Cannabis** (que gera receitas médicas em PDF) e o **VIDaaS** (Prestador de Serviço de Confiança da VALID), permitindo que médicos assinem digitalmente receitas de cannabis medicinal com certificado ICP-Brasil.

### 1.2 Por que VIDaaS?

| Critério | Justificativa |
|----------|---------------|
| **Conformidade Legal** | Certificado ICP-Brasil obrigatório para receitas de controlados (Portaria 344/98) |
| **Market Share** | 50%+ dos médicos brasileiros já utilizam VIDaaS |
| **Parceria CFM** | PSC oficial do Conselho Federal de Medicina |
| **Mobilidade** | Assinatura via smartphone, sem token físico |
| **API Robusta** | Documentação completa e suporte técnico |

### 1.3 Fluxo Resumido

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                          FLUXO DE ASSINATURA DIGITAL                         │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐   │
│  │   MÉDICO    │    │    CLICK    │    │   VIDAAS    │    │  PACIENTE   │   │
│  │             │    │  CANNABIS   │    │     API     │    │             │   │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘    └──────┬──────┘   │
│         │                  │                  │                  │          │
│         │  1. Realiza      │                  │                  │          │
│         │     consulta     │                  │                  │          │
│         │─────────────────▶│                  │                  │          │
│         │                  │                  │                  │          │
│         │                  │  2. Gera PDF     │                  │          │
│         │                  │     da receita   │                  │          │
│         │                  │                  │                  │          │
│         │                  │  3. Solicita     │                  │          │
│         │                  │     assinatura   │                  │          │
│         │                  │─────────────────▶│                  │          │
│         │                  │                  │                  │          │
│         │  4. Recebe push  │                  │                  │          │
│         │◀─────────────────│──────────────────│                  │          │
│         │     notification │                  │                  │          │
│         │                  │                  │                  │          │
│         │  5. Autoriza     │                  │                  │          │
│         │     (senha PIN)  │                  │                  │          │
│         │─────────────────▶│─────────────────▶│                  │          │
│         │                  │                  │                  │          │
│         │                  │  6. Recebe PDF   │                  │          │
│         │                  │     assinado     │                  │          │
│         │                  │◀─────────────────│                  │          │
│         │                  │                  │                  │          │
│         │                  │  7. Disponibiliza│                  │          │
│         │                  │     receita      │                  │          │
│         │                  │─────────────────────────────────────▶│          │
│         │                  │                  │                  │          │
│         ▼                  ▼                  ▼                  ▼          │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Arquitetura da Integração

### 2.1 Componentes do Sistema

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         ARQUITETURA DE INTEGRAÇÃO                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        CLICK CANNABIS                                │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │                                                                     │   │
│  │  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐            │   │
│  │  │   Frontend   │   │   Backend    │   │   Database   │            │   │
│  │  │   (React)    │──▶│  (Node/PHP)  │──▶│  (PostgreSQL)│            │   │
│  │  └──────────────┘   └──────┬───────┘   └──────────────┘            │   │
│  │                            │                                        │   │
│  │                            │ PDF Generator                          │   │
│  │                            │ (puppeteer/wkhtmltopdf)                │   │
│  │                            │                                        │   │
│  └────────────────────────────┼────────────────────────────────────────┘   │
│                               │                                             │
│                               │ HTTPS (TLS 1.2+)                           │
│                               │                                             │
│  ┌────────────────────────────┼────────────────────────────────────────┐   │
│  │                            ▼                                        │   │
│  │                     VIDAAS SERVICE                                  │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │                                                                     │   │
│  │  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐            │   │
│  │  │   OAuth 2.0  │   │   Signature  │   │     HSM      │            │   │
│  │  │   + PKCE     │──▶│    Engine    │──▶│   (Chaves)   │            │   │
│  │  └──────────────┘   └──────────────┘   └──────────────┘            │   │
│  │                                                                     │   │
│  │  ┌──────────────────────────────────────────────────────────┐      │   │
│  │  │                    App VIDaaS (Mobile)                    │      │   │
│  │  │  • Push Notifications                                     │      │   │
│  │  │  • Autorização com PIN                                    │      │   │
│  │  │  • Biometria facial                                       │      │   │
│  │  └──────────────────────────────────────────────────────────┘      │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Ambientes Disponíveis

| Ambiente | URL Base | Uso |
|----------|----------|-----|
| **Produção** | `https://certificado.vidaas.com.br` | Assinaturas reais |
| **Homologação** | `https://hml-certificado.vidaas.com.br` | Testes de integração |
| **Demonstração** | `https://demo-certificado.vidaas.com.br` | Prova de conceito |

### 2.3 Portas e Protocolos

| Componente | Protocolo | Porta | Observação |
|------------|-----------|-------|------------|
| API VIDaaS | HTTPS | 443 | TLS 1.2 ou superior |
| Push Notification | FCM/APNs | - | Firebase/Apple Push |
| Callback | HTTPS | 443 | URL de retorno |

---

## 3. Pré-requisitos

### 3.1 Requisitos Técnicos Click Cannabis

| Item | Especificação |
|------|---------------|
| **Linguagem Backend** | Node.js 18+ / PHP 8+ / Python 3.10+ |
| **HTTPS** | Certificado SSL válido |
| **Encoding** | UTF-8 |
| **Base64** | Suporte a encoding/decoding |
| **SHA-256** | Biblioteca de hash |
| **OAuth 2.0 + PKCE** | Implementação de code_challenge |

### 3.2 Requisitos para o Médico

| Item | Descrição |
|------|-----------|
| **Certificado Digital** | e-CPF A3 em nuvem (VIDaaS) |
| **App Instalado** | VIDaaS no smartphone (iOS/Android) |
| **Direito de Uso** | Licença comercial ativa |
| **Senha PIN** | Cadastrada no momento da emissão |

### 3.3 Bibliotecas Recomendadas

**Node.js:**
```json
{
  "dependencies": {
    "axios": "^1.6.0",
    "crypto": "native",
    "uuid": "^9.0.0"
  }
}
```

**Python:**
```
requests>=2.31.0
cryptography>=41.0.0
PyPDF2>=3.0.0
```

**PHP:**
```php
// composer.json
{
    "require": {
        "guzzlehttp/guzzle": "^7.8"
    }
}
```

---

## 4. Configuração Inicial

### 4.1 Cadastro da Aplicação (Única Vez)

Para utilizar a API VIDaaS, é obrigatório cadastrar sua aplicação. Este procedimento é realizado **uma única vez**.

**Endpoint:**
```
POST {BASE_URL}/v0/oauth/application
```

**Headers:**
```http
Content-Type: application/json
Accept: application/json
```

**Request Body:**
```json
{
  "name": "Click Cannabis - Prescrição Eletrônica",
  "comments": "Sistema de telemedicina para prescrição de cannabis medicinal. Plataforma líder no Brasil.",
  "redirect_uris": [
    "https://app.clickcannabis.com.br/vidaas/callback",
    "https://api.clickcannabis.com.br/vidaas/callback",
    "https://staging.clickcannabis.com.br/vidaas/callback"
  ],
  "email": "tech@clickcannabis.com.br"
}
```

**Response (201 Created):**
```json
{
  "status": "success",
  "message": "New Client Application registered with Sucess",
  "client_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "client_secret": "Xy9Zw8Vt7Rs6Qp5On4Ml3Kj2Ih1Gf0Ed"
}
```

### 4.2 Armazenamento Seguro das Credenciais

⚠️ **CRÍTICO:** As credenciais devem ser armazenadas de forma segura.

**Variáveis de Ambiente (.env):**
```bash
# VIDaaS Configuration
VIDAAS_CLIENT_ID=a1b2c3d4-e5f6-7890-abcd-ef1234567890
VIDAAS_CLIENT_SECRET=Xy9Zw8Vt7Rs6Qp5On4Ml3Kj2Ih1Gf0Ed
VIDAAS_BASE_URL=https://certificado.vidaas.com.br
VIDAAS_REDIRECT_URI=https://api.clickcannabis.com.br/vidaas/callback

# Timeouts (em segundos)
VIDAAS_AUTH_TIMEOUT=120
VIDAAS_SIGNATURE_TIMEOUT=30
```

**⛔ NUNCA:**
- Commitar credenciais em repositório Git
- Expor credenciais em logs
- Enviar credenciais para o frontend

---

## 5. Fluxo Completo de Assinatura

### 5.1 Diagrama de Sequência Detalhado

```
┌──────────┐          ┌──────────┐          ┌──────────┐          ┌──────────┐
│  Médico  │          │  Click   │          │  VIDaaS  │          │   App    │
│(Frontend)│          │(Backend) │          │   API    │          │ VIDaaS   │
└────┬─────┘          └────┬─────┘          └────┬─────┘          └────┬─────┘
     │                     │                     │                     │
     │ 1. Clica "Assinar"  │                     │                     │
     │────────────────────▶│                     │                     │
     │                     │                     │                     │
     │                     │ 2. Gera PDF Base64  │                     │
     │                     │─────────┐           │                     │
     │                     │         │           │                     │
     │                     │◀────────┘           │                     │
     │                     │                     │                     │
     │                     │ 3. POST /user-discovery                   │
     │                     │─────────────────────▶                     │
     │                     │                     │                     │
     │                     │ 4. {"status": "S"}  │                     │
     │                     │◀─────────────────────                     │
     │                     │                     │                     │
     │                     │ 5. Gera PKCE        │                     │
     │                     │   (code_verifier,   │                     │
     │                     │    code_challenge)  │                     │
     │                     │                     │                     │
     │                     │ 6. GET /authorize   │                     │
     │                     │    (push://)        │                     │
     │                     │─────────────────────▶                     │
     │                     │                     │                     │
     │                     │ 7. {"code": "..."}  │                     │
     │                     │◀─────────────────────                     │
     │                     │                     │                     │
     │                     │                     │ 8. Push Notification│
     │                     │                     │─────────────────────▶
     │                     │                     │                     │
     │ 9. Status: "Aguardando autorização..."    │                     │
     │◀────────────────────│                     │                     │
     │                     │                     │                     │
     │                     │                     │ 10. Médico abre app │
     │                     │                     │     e digita PIN    │
     │                     │                     │◀────────────────────│
     │                     │                     │                     │
     │                     │ 11. GET /authentications (polling)        │
     │                     │─────────────────────▶                     │
     │                     │                     │                     │
     │                     │ 12. {"authorizationToken": "..."}         │
     │                     │◀─────────────────────                     │
     │                     │                     │                     │
     │                     │ 13. POST /token     │                     │
     │                     │─────────────────────▶                     │
     │                     │                     │                     │
     │                     │ 14. {"access_token": "..."}               │
     │                     │◀─────────────────────                     │
     │                     │                     │                     │
     │                     │ 15. POST /signature │                     │
     │                     │     (PDF base64)    │                     │
     │                     │─────────────────────▶                     │
     │                     │                     │                     │
     │                     │ 16. PDF assinado    │                     │
     │                     │◀─────────────────────                     │
     │                     │                     │                     │
     │ 17. "Receita assinada com sucesso!"       │                     │
     │◀────────────────────│                     │                     │
     │                     │                     │                     │
     ▼                     ▼                     ▼                     ▼
```

### 5.2 Estados da Assinatura

| Estado | Código | Descrição |
|--------|--------|-----------|
| `PENDING` | 0 | Aguardando geração do PDF |
| `AWAITING_AUTH` | 1 | Push enviado, aguardando médico |
| `AUTHORIZED` | 2 | Médico autorizou, processando |
| `SIGNED` | 3 | PDF assinado com sucesso |
| `EXPIRED` | 4 | Timeout na autorização |
| `REJECTED` | 5 | Médico recusou |
| `ERROR` | 9 | Erro no processo |

---

## 6. Endpoints da API VIDaaS

### 6.1 User Discovery - Verificar Certificado

Verifica se um CPF/CNPJ possui certificado válido no VIDaaS.

```http
POST {BASE_URL}/v0/oauth/user-discovery
Content-Type: application/json
```

**Request:**
```json
{
  "client_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "client_secret": "Xy9Zw8Vt7Rs6Qp5On4Ml3Kj2Ih1Gf0Ed",
  "user_cpf_cnpj": "CPF",
  "val_cpf_cnpj": "12345678901"
}
```

**Response (200 - Encontrado):**
```json
{
  "status": "S",
  "slots": [
    {
      "slot_alias": "b5c4d3e2-f1a0-9876-5432-10fedcba9876",
      "label": "e-CPF A3 em nuvem gold"
    }
  ]
}
```

**Response (200 - Não Encontrado):**
```json
{
  "status": "N"
}
```

### 6.2 Authorize - Solicitar Autorização

Inicia o fluxo de autorização OAuth 2.0 + PKCE.

#### 6.2.1 Via Push Notification (Recomendado)

```http
GET {BASE_URL}/v0/oauth/authorize?
    client_id={CLIENT_ID}&
    code_challenge={CODE_CHALLENGE}&
    code_challenge_method=S256&
    response_type=code&
    scope=signature_session&
    login_hint={CPF_MEDICO}&
    lifetime={TEMPO_SESSAO}&
    redirect_uri=push://
```

**Parâmetros:**

| Parâmetro | Obrigatório | Tipo | Descrição |
|-----------|-------------|------|-----------|
| `client_id` | ✅ | String | ID da aplicação cadastrada |
| `code_challenge` | ✅ | String | Hash SHA-256 do code_verifier (Base64 URL-safe) |
| `code_challenge_method` | ✅ | String | Sempre `S256` |
| `response_type` | ✅ | String | Sempre `code` |
| `scope` | ⚠️ | String | Ver tabela de escopos |
| `login_hint` | ✅ (push) | String | CPF (11 dígitos) ou CNPJ (14 dígitos) |
| `lifetime` | ⚠️ | Integer | Tempo de vida do token em segundos |
| `redirect_uri` | ✅ | String | `push://` para notificação |

**Escopos disponíveis:**

| Scope | Descrição | Uso Recomendado |
|-------|-----------|-----------------|
| `single_signature` | 1 assinatura, invalidado após uso | Receita única |
| `multi_signature` | Múltiplos hashes em 1 request | Lote de receitas |
| `signature_session` | Sessão com múltiplas chamadas | Plantão médico |
| `authentication_session` | Apenas autenticação | Login sem assinatura |

**Lifetime máximo por tipo de certificado:**

| Tipo | Tempo Máximo |
|------|--------------|
| Pessoa Física (e-CPF) | 7 dias (604.800s) |
| Pessoa Jurídica (e-CNPJ) | 30 dias (2.592.000s) |

**Response (200):**
```json
{
  "code": "d402d71c-0918-43ca-a07d-62597f559497"
}
```

#### 6.2.2 Via QR Code

```http
GET {BASE_URL}/v0/oauth/authorize?
    client_id={CLIENT_ID}&
    code_challenge={CODE_CHALLENGE}&
    code_challenge_method=S256&
    response_type=code&
    scope=signature_session&
    lifetime=43200&
    redirect_uri=https://app.clickcannabis.com.br/vidaas/callback
```

**Response:** Redireciona para página com QR Code. Após escaneamento e autorização, redireciona para `redirect_uri` com parâmetro `code`.

```
https://app.clickcannabis.com.br/vidaas/callback?code=eyJlbmMiOiJBMTI4Q0JDLUhTMjU2...&state=NONE
```

### 6.3 Authentications - Polling de Status (Push)

Verifica se o médico já autorizou a assinatura.

```http
GET {BASE_URL}/valid/api/v1/trusted-services/authentications?code={CODE}
```

**⚠️ IMPORTANTE:** Intervalo mínimo entre chamadas: **1 segundo**

**Response (202 - Aguardando):**
```json
{
  "status": "pending"
}
```

**Response (200 - Autorizado):**
```json
{
  "authorizationToken": "eyJlbmMiOiJBMTI4Q0JDLUhTMjU2IiwiYWxnIjoiZGlyIn0..nYWhIcwNUH_22Upe1BSUTQ.oXT7UF2Mvtm5C6CjpdEGxcL_9XM86oNh4w0iGgUkQVGBla0CNnNW0_QbGx73Ldnu81kydOuztSj3wfWUQf3t7IftvVMuyfdi-gW4_lz1LcC2q3p9N32iSEGb5VPzzSKqiZGa3asfMgEPjr3xYo7Lo3biTtbVPrChPLHslMi--b7DXXOIZ23N2R5bCT2_h6pj6PyBnXsEWl5uaF9v5PSXsQ.ZuLdlRZkfGBoqrxbj5tgTg",
  "redirectUrl": "push://<URI>?code=8b1bde77-3647-4d76-1289-a2ec97c75a4d&state=NONE"
}
```

### 6.4 Token - Obter Access Token

Troca o código de autorização por um access token.

```http
POST {BASE_URL}/v0/oauth/token
Content-Type: application/x-www-form-urlencoded
```

**Request Body:**
```
grant_type=authorization_code&
client_id=a1b2c3d4-e5f6-7890-abcd-ef1234567890&
client_secret=Xy9Zw8Vt7Rs6Qp5On4Ml3Kj2Ih1Gf0Ed&
code={AUTHORIZATION_CODE_OU_TOKEN}&
code_verifier={CODE_VERIFIER}
```

**Parâmetros:**

| Parâmetro | Origem do Valor |
|-----------|-----------------|
| `code` | **QR Code:** parâmetro `code` da URL de callback |
| `code` | **Push:** campo `authorizationToken` do `/authentications` |
| `code_verifier` | String original usada para gerar o `code_challenge` |

**Response (200):**
```json
{
  "access_token": "eyJlbmMiOiJBMTI4Q0JDLUhTMjU2IiwiYWxnIjoiZGlyIn0..2tk9rh8yisesxBm1tNNcUg.z6VZu-HZJk-a9EDBSAgDrtZWgYn5je__nCc6uOOrl3wsCrzWT5G0SMUHpuX3McdBk0uIJ85cMOe3MFn75Pe5mfhlmdLtRUtnX_tJmg8rW6dU7mg4nR4XlyMmWYy-Yep_2dIM2xni0sWUplPxUCLg9dl7_aeVTB_U9TmsXOYCJNMYSJfjPErsthUNHWJHzUIOg-2Otj9gkq_EBLr0jYVWCw.IPOs5b_o6yKmz2Q24zYYvA",
  "token_type": "Bearer",
  "expires_in": 43200,
  "scope": "signature_session",
  "authorized_identification": "12345678901",
  "authorized_identification_type": "CPF"
}
```

### 6.5 Signature - Assinar Documento

Realiza a assinatura digital do PDF.

```http
POST {BASE_URL}/v0/oauth/signature
Content-Type: application/json
Authorization: Bearer {ACCESS_TOKEN}
```

**Request Body:**
```json
{
  "certificate_alias": "b5c4d3e2-f1a0-9876-5432-10fedcba9876",
  "hashes": [
    {
      "id": "receita-click-2026-00001",
      "alias": "receita_cannabis_joao_silva.pdf",
      "hash": "FqulOTrXLABB9WAK08LFLsQ3ovDH/Aj638PA/pZB16M=",
      "hash_algorithm": "2.16.840.1.101.3.4.2.1",
      "signature_format": "PAdES_AD_RT",
      "padding_method": "PKCS1V1_5",
      "pdf_signature_page": "true",
      "base64_content": "JVBERi0xLjQKJeLjz9MKMSAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwovUGFnZXMgMiAwIFIKPj4KZW5kb2JqCjIgMCBvYmoKPDwKL1R5cGUgL1BhZ2VzCi9LaWRzIFszIDAgUl0KL0NvdW50IDEKL01lZGlhQm94IFswIDAgNjEyIDc5Ml0KPj4KZW5kb2JqCjMgMCBvYmoKPDwKL1R5cGUgL1BhZ2UKL1BhcmVudCAyIDAgUgovUmVzb3VyY2VzIDQgMCBSCi9Db250ZW50cyA1IDAgUgo+PgplbmRvYmoKNCA..."
    }
  ]
}
```

**Parâmetros do objeto `hashes`:**

| Parâmetro | Obrigatório | Tipo | Descrição |
|-----------|-------------|------|-----------|
| `id` | ✅ | String | Identificador único do documento |
| `alias` | ✅ | String | Nome amigável do arquivo |
| `hash` | ✅ | String | Hash SHA-256 do documento em Base64 |
| `hash_algorithm` | ✅ | String | OID do algoritmo (SHA-256 = `2.16.840.1.101.3.4.2.1`) |
| `signature_format` | ✅ | String | Formato da assinatura (ver tabela) |
| `padding_method` | ⚠️ | String | Método de padding |
| `pdf_signature_page` | ⚠️ | String | `"true"` para página visual |
| `base64_content` | ✅ | String | Conteúdo do PDF em Base64 |

**Formatos de Assinatura:**

| Formato | Descrição | Uso |
|---------|-----------|-----|
| `PAdES_AD_RB` | PDF Advanced Electronic Signature - Básico | Receitas simples |
| `PAdES_AD_RT` | PAdES com Carimbo de Tempo | **Recomendado** - Receitas controlados |
| `CAdES_AD_RB` | CMS Advanced Electronic Signature - Básico | Documentos não-PDF |
| `CAdES_AD_RT` | CAdES com Carimbo de Tempo | Documentos não-PDF |
| `RAW` | Assinatura crua sobre hash | Casos especiais |
| `CMS` | PKCS#7 detached | Integração legada |

**Métodos de Padding:**

| Método | Descrição |
|--------|-----------|
| `PKCS1V1_5` | RSA PKCS#1 v1.5 - **mais compatível** |
| `PSS` | RSA-PSS - mais seguro |
| `NONE` | Sem padding |

**Response (200):**
```json
{
  "signatures": [
    {
      "id": "receita-click-2026-00001",
      "raw_signature": "JVBERi0xLjcKJeLjz9MKOCAwIG9iago8PAovRmlsdGVyIC9GbGF0ZURlY29kZQovTGVuZ3RoIDEyMzQKPj4Kc3RyZWFtCnicpVpZc..."
    }
  ],
  "certificate_alias": "DR. JOAO CARLOS SILVA - CRM 123456/SP"
}
```

**⚠️ IMPORTANTE:** O campo `raw_signature` contém o PDF **assinado** em Base64. Para obter o arquivo final:

```javascript
// Decodificar Base64 (remover quebras de linha primeiro)
const pdfAssinado = response.signatures[0].raw_signature
  .replace(/\r\n/g, '')
  .replace(/\n/g, '');

const buffer = Buffer.from(pdfAssinado, 'base64');
fs.writeFileSync('receita_assinada.pdf', buffer);
```

### 6.6 Certificate Discovery - Extrair Chave Pública

Obtém o certificado público do assinante.

```http
GET {BASE_URL}/v0/oauth/certificate-discovery?
    token={ACCESS_TOKEN}&
    certificate_alias={CERTIFICATE_ALIAS}
```

**Response (200):**
```json
{
  "status": "S",
  "certificates": [
    {
      "alias": "b5c4d3e2-f1a0-9876-5432-10fedcba9876",
      "certificate": "-----BEGIN CERTIFICATE-----\nMIIHuzCCBaOgAwIBAgIINVGKh7BTogEwDQYJKoZIhvcNAQELBQAwdDELMAkGA1UE\nBhMCQlIxEzARBgNVBAoTCklDUC1CcmFzaWwxNjA0BgNVBAsTLVNlY3JldGFyaWEg\n...\n-----END CERTIFICATE-----\n"
    }
  ]
}
```

---

## 7. Formatos de Request e Response

### 7.1 Geração do PDF pela Click Cannabis

O PDF deve ser gerado seguindo o padrão de receituário médico:

**Estrutura mínima do PDF:**
```
┌─────────────────────────────────────────────────────────────────┐
│                    RECEITUÁRIO MÉDICO                           │
│                    CANNABIS MEDICINAL                           │
├─────────────────────────────────────────────────────────────────┤
│ IDENTIFICAÇÃO DO MÉDICO                                         │
│ Nome: Dr. João Carlos Silva                                     │
│ CRM: 123456/SP                                                  │
│ Especialidade: Neurologia                                       │
│ Endereço: Rua das Flores, 123 - São Paulo/SP                   │
├─────────────────────────────────────────────────────────────────┤
│ IDENTIFICAÇÃO DO PACIENTE                                       │
│ Nome: Maria Aparecida Santos                                    │
│ CPF: 123.456.789-00                                            │
│ Data de Nascimento: 15/03/1980                                 │
├─────────────────────────────────────────────────────────────────┤
│ PRESCRIÇÃO                                                      │
│                                                                 │
│ 1. Óleo de Cannabis Full Spectrum CBD 3000mg                   │
│    Posologia: 3 gotas sublingual, 2x ao dia                    │
│    Quantidade: 1 frasco de 30ml                                │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│ Data: 24/01/2026                                               │
│                                                                 │
│ [ESPAÇO PARA ASSINATURA DIGITAL]                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 7.2 Conversão do PDF para Base64

```javascript
// Node.js
const fs = require('fs');
const pdfBuffer = fs.readFileSync('receita.pdf');
const pdfBase64 = pdfBuffer.toString('base64');

// Verificar tamanho (máximo 7MB)
const sizeMB = Buffer.byteLength(pdfBase64, 'base64') / (1024 * 1024);
if (sizeMB > 7) {
  throw new Error('PDF excede limite de 7MB');
}
```

```python
# Python
import base64

with open('receita.pdf', 'rb') as f:
    pdf_bytes = f.read()
    
pdf_base64 = base64.b64encode(pdf_bytes).decode('utf-8')

# Verificar tamanho
size_mb = len(pdf_bytes) / (1024 * 1024)
if size_mb > 7:
    raise ValueError('PDF excede limite de 7MB')
```

### 7.3 Geração do Hash SHA-256

```javascript
// Node.js
const crypto = require('crypto');

function calculatePdfHash(pdfBase64) {
  const pdfBuffer = Buffer.from(pdfBase64, 'base64');
  const hash = crypto.createHash('sha256').update(pdfBuffer).digest('base64');
  return hash;
}
```

```python
# Python
import hashlib
import base64

def calculate_pdf_hash(pdf_base64: str) -> str:
    pdf_bytes = base64.b64decode(pdf_base64)
    hash_bytes = hashlib.sha256(pdf_bytes).digest()
    return base64.b64encode(hash_bytes).decode('utf-8')
```

### 7.4 Geração do PKCE (code_challenge/code_verifier)

```javascript
// Node.js
const crypto = require('crypto');

function generatePKCE() {
  // Gerar code_verifier (43-128 caracteres, URL-safe)
  const code_verifier = crypto.randomBytes(32)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
  
  // Gerar code_challenge (SHA-256 do verifier, Base64 URL-safe)
  const code_challenge = crypto.createHash('sha256')
    .update(code_verifier)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
  
  return { code_verifier, code_challenge };
}
```

```python
# Python
import secrets
import hashlib
import base64

def generate_pkce():
    # Gerar code_verifier
    code_verifier = secrets.token_urlsafe(32)
    
    # Gerar code_challenge
    digest = hashlib.sha256(code_verifier.encode()).digest()
    code_challenge = base64.urlsafe_b64encode(digest).decode().rstrip('=')
    
    return code_verifier, code_challenge
```

---

## 8. Códigos de Erro e Tratamento

### 8.1 Erros HTTP

| Código | Descrição | Ação Recomendada |
|--------|-----------|------------------|
| `400` | Bad Request - Parâmetros inválidos | Verificar formato dos dados |
| `401` | Unauthorized - Token inválido/expirado | Renovar autorização |
| `403` | Forbidden - Sem permissão | Verificar credenciais |
| `404` | Not Found - Recurso inexistente | Verificar URL/IDs |
| `408` | Timeout | Retry com backoff |
| `429` | Too Many Requests | Aguardar e reduzir taxa |
| `500` | Internal Server Error | Contatar suporte VIDaaS |
| `503` | Service Unavailable | Retry com backoff |

### 8.2 Erros de Negócio

| Erro | Descrição | Solução |
|------|-----------|---------|
| `user_not_found` | CPF não tem certificado VIDaaS | Médico precisa adquirir certificado |
| `certificate_expired` | Certificado vencido | Médico precisa renovar |
| `license_expired` | Direito de uso expirado | Médico precisa renovar licença |
| `authorization_denied` | Médico recusou | Tentar novamente |
| `authorization_timeout` | Tempo esgotado (2 min) | Enviar novo push |
| `invalid_signature_format` | Formato não suportado | Usar PAdES_AD_RT |
| `document_too_large` | PDF > 7MB | Otimizar/comprimir PDF |
| `invalid_hash` | Hash não confere | Recalcular hash do PDF |

### 8.3 Tratamento de Erros (Exemplo)

```javascript
async function handleVidaasError(error) {
  const { status, data } = error.response || {};
  
  switch (status) {
    case 400:
      logger.error('Parâmetros inválidos:', data);
      throw new Error('Dados da requisição inválidos');
      
    case 401:
      logger.warn('Token expirado, renovando...');
      // Implementar renovação de token
      break;
      
    case 429:
      const retryAfter = error.response.headers['retry-after'] || 60;
      logger.warn(`Rate limit atingido. Aguardando ${retryAfter}s`);
      await sleep(retryAfter * 1000);
      // Retry
      break;
      
    case 503:
      logger.error('VIDaaS indisponível');
      throw new Error('Serviço de assinatura temporariamente indisponível');
      
    default:
      logger.error('Erro desconhecido:', error);
      throw error;
  }
}
```

---

## 9. Validação de Assinaturas

### 9.1 Verificador Oficial do ITI

Após assinar, a receita pode ser validada no verificador oficial do governo:

**URL:** https://validar.iti.gov.br/

**Validações realizadas:**
- ✅ Integridade do documento
- ✅ Autenticidade da assinatura
- ✅ Validade do certificado
- ✅ Cadeia de certificação ICP-Brasil
- ✅ Carimbo de tempo (se presente)

### 9.2 Validação Programática

```javascript
// Exemplo usando biblioteca pdf-lib
const { PDFDocument } = require('pdf-lib');

async function validateSignedPdf(pdfBuffer) {
  const pdfDoc = await PDFDocument.load(pdfBuffer);
  
  // Verificar se tem assinatura
  const form = pdfDoc.getForm();
  const signatureFields = form.getFields()
    .filter(f => f.constructor.name === 'PDFSignature');
  
  if (signatureFields.length === 0) {
    return { valid: false, error: 'Documento não possui assinatura digital' };
  }
  
  // Para validação completa, usar verificador ITI
  return { 
    valid: true, 
    signatureCount: signatureFields.length,
    message: 'Validar em https://validar.iti.gov.br para confirmação oficial'
  };
}
```

---

## 10. Boas Práticas e Segurança

### 10.1 Limites da API

| Recurso | Limite |
|---------|--------|
| Requisições `/authorize` | 100/segundo por aplicação |
| Documentos por `/signature` | 20 documentos por request |
| Requisições `/signature` por CPF | 100/minuto |
| Total de assinaturas | 5.000/minuto por aplicação |
| Tamanho máximo do PDF | 7 MB |

### 10.2 Recomendações de Segurança

| Aspecto | Recomendação |
|---------|--------------|
| **Credenciais** | Armazenar em vault/secrets manager |
| **Tokens** | Não persistir access_token (usar sessão) |
| **Logs** | Não logar conteúdo de PDFs ou tokens |
| **HTTPS** | Obrigatório TLS 1.2+ |
| **Timeout** | Implementar timeout de 30s para assinatura |
| **Retry** | Exponential backoff para erros 5xx |

### 10.3 Checklist de Implementação

```
□ Credenciais armazenadas em variáveis de ambiente
□ PKCE implementado corretamente
□ Polling com intervalo mínimo de 1 segundo
□ Tratamento de todos os códigos de erro
□ Timeout configurado para autorização (120s)
□ Validação do tamanho do PDF antes de enviar
□ Log de auditoria de assinaturas
□ Notificação ao médico em caso de erro
□ Fallback para QR Code se push falhar
```

---

## 11. Exemplos de Implementação

### 11.1 Classe de Serviço Completa (Node.js)

```javascript
// services/VidaasService.js

const axios = require('axios');
const crypto = require('crypto');

class VidaasService {
  constructor() {
    this.baseUrl = process.env.VIDAAS_BASE_URL;
    this.clientId = process.env.VIDAAS_CLIENT_ID;
    this.clientSecret = process.env.VIDAAS_CLIENT_SECRET;
    this.redirectUri = process.env.VIDAAS_REDIRECT_URI;
    
    this.httpClient = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
  }

  /**
   * Gera par PKCE (code_verifier + code_challenge)
   */
  generatePKCE() {
    const code_verifier = crypto.randomBytes(32)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
    
    const code_challenge = crypto.createHash('sha256')
      .update(code_verifier)
      .digest('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
    
    return { code_verifier, code_challenge };
  }

  /**
   * Calcula hash SHA-256 do PDF
   */
  calculateHash(pdfBase64) {
    const buffer = Buffer.from(pdfBase64, 'base64');
    return crypto.createHash('sha256').update(buffer).digest('base64');
  }

  /**
   * Verifica se médico possui certificado
   */
  async verificarCertificado(cpf) {
    const response = await this.httpClient.post('/v0/oauth/user-discovery', {
      client_id: this.clientId,
      client_secret: this.clientSecret,
      user_cpf_cnpj: 'CPF',
      val_cpf_cnpj: cpf.replace(/\D/g, '')
    });
    
    return {
      possuiCertificado: response.data.status === 'S',
      slots: response.data.slots || []
    };
  }

  /**
   * Solicita autorização via push
   */
  async solicitarAutorizacaoPush(cpf, lifetime = 43200) {
    const pkce = this.generatePKCE();
    
    const params = new URLSearchParams({
      client_id: this.clientId,
      code_challenge: pkce.code_challenge,
      code_challenge_method: 'S256',
      response_type: 'code',
      scope: 'signature_session',
      login_hint: cpf.replace(/\D/g, ''),
      lifetime: lifetime.toString(),
      redirect_uri: 'push://'
    });
    
    const response = await this.httpClient.get(`/v0/oauth/authorize?${params}`);
    
    return {
      code: response.data.code,
      code_verifier: pkce.code_verifier
    };
  }

  /**
   * Aguarda autorização do médico (polling)
   */
  async aguardarAutorizacao(code, timeoutMs = 120000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeoutMs) {
      try {
        const response = await this.httpClient.get(
          '/valid/api/v1/trusted-services/authentications',
          { params: { code } }
        );
        
        if (response.data.authorizationToken) {
          return response.data.authorizationToken;
        }
      } catch (error) {
        if (error.response?.status !== 202) {
          throw error;
        }
      }
      
      // Aguardar 1 segundo antes do próximo polling
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    throw new Error('Timeout: Médico não autorizou a assinatura');
  }

  /**
   * Obtém access token
   */
  async obterAccessToken(authorizationToken, codeVerifier) {
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: this.clientId,
      client_secret: this.clientSecret,
      code: authorizationToken,
      code_verifier: codeVerifier
    });
    
    const response = await this.httpClient.post('/v0/oauth/token', params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    
    return response.data;
  }

  /**
   * Assina o PDF
   */
  async assinarPdf(accessToken, pdfBase64, documentId, documentAlias) {
    const hash = this.calculateHash(pdfBase64);
    
    const response = await this.httpClient.post('/v0/oauth/signature', {
      hashes: [{
        id: documentId,
        alias: documentAlias,
        hash: hash,
        hash_algorithm: '2.16.840.1.101.3.4.2.1',
        signature_format: 'PAdES_AD_RT',
        padding_method: 'PKCS1V1_5',
        pdf_signature_page: 'true',
        base64_content: pdfBase64
      }]
    }, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    
    return {
      pdfAssinadoBase64: response.data.signatures[0].raw_signature,
      certificateAlias: response.data.certificate_alias
    };
  }

  /**
   * Fluxo completo de assinatura
   */
  async assinarReceita(cpfMedico, pdfBase64, receitaId) {
    // 1. Verificar certificado
    const { possuiCertificado } = await this.verificarCertificado(cpfMedico);
    if (!possuiCertificado) {
      throw new Error('Médico não possui certificado digital VIDaaS');
    }
    
    // 2. Solicitar autorização
    const { code, code_verifier } = await this.solicitarAutorizacaoPush(cpfMedico);
    
    // 3. Aguardar médico autorizar
    const authorizationToken = await this.aguardarAutorizacao(code);
    
    // 4. Obter access token
    const tokenData = await this.obterAccessToken(authorizationToken, code_verifier);
    
    // 5. Assinar PDF
    const resultado = await this.assinarPdf(
      tokenData.access_token,
      pdfBase64,
      receitaId,
      `receita_${receitaId}.pdf`
    );
    
    return resultado;
  }
}

module.exports = VidaasService;
```

### 11.2 Uso do Serviço (Controller)

```javascript
// controllers/ReceitaController.js

const VidaasService = require('../services/VidaasService');
const ReceitaService = require('../services/ReceitaService');

class ReceitaController {
  constructor() {
    this.vidaas = new VidaasService();
    this.receitaService = new ReceitaService();
  }

  async assinarReceita(req, res) {
    const { receitaId } = req.params;
    const { cpfMedico } = req.body;
    
    try {
      // 1. Buscar receita no banco
      const receita = await this.receitaService.buscarPorId(receitaId);
      if (!receita) {
        return res.status(404).json({ error: 'Receita não encontrada' });
      }
      
      // 2. Gerar PDF
      const pdfBase64 = await this.receitaService.gerarPdf(receita);
      
      // 3. Assinar via VIDaaS
      const resultado = await this.vidaas.assinarReceita(
        cpfMedico,
        pdfBase64,
        receitaId
      );
      
      // 4. Salvar PDF assinado
      const urlPdfAssinado = await this.receitaService.salvarPdfAssinado(
        receitaId,
        resultado.pdfAssinadoBase64
      );
      
      // 5. Atualizar status da receita
      await this.receitaService.atualizarStatus(receitaId, 'ASSINADA', {
        dataAssinatura: new Date(),
        certificadoAlias: resultado.certificateAlias,
        urlPdfAssinado
      });
      
      return res.json({
        success: true,
        message: 'Receita assinada com sucesso',
        urlPdfAssinado
      });
      
    } catch (error) {
      console.error('Erro ao assinar receita:', error);
      
      if (error.message.includes('não possui certificado')) {
        return res.status(400).json({
          error: 'Médico não possui certificado digital VIDaaS'
        });
      }
      
      if (error.message.includes('Timeout')) {
        return res.status(408).json({
          error: 'Tempo esgotado. Médico não autorizou a assinatura.'
        });
      }
      
      return res.status(500).json({
        error: 'Erro ao assinar receita. Tente novamente.'
      });
    }
  }
}

module.exports = ReceitaController;
```

### 11.3 Implementação Python

```python
# services/vidaas_service.py

import os
import base64
import hashlib
import secrets
import time
import requests
from typing import Tuple, Dict, Any

class VidaasService:
    def __init__(self):
        self.base_url = os.environ['VIDAAS_BASE_URL']
        self.client_id = os.environ['VIDAAS_CLIENT_ID']
        self.client_secret = os.environ['VIDAAS_CLIENT_SECRET']
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        })
    
    def generate_pkce(self) -> Tuple[str, str]:
        """Gera par PKCE"""
        code_verifier = secrets.token_urlsafe(32)
        digest = hashlib.sha256(code_verifier.encode()).digest()
        code_challenge = base64.urlsafe_b64encode(digest).decode().rstrip('=')
        return code_verifier, code_challenge
    
    def calculate_hash(self, pdf_base64: str) -> str:
        """Calcula hash SHA-256 do PDF"""
        pdf_bytes = base64.b64decode(pdf_base64)
        hash_bytes = hashlib.sha256(pdf_bytes).digest()
        return base64.b64encode(hash_bytes).decode()
    
    def verificar_certificado(self, cpf: str) -> Dict[str, Any]:
        """Verifica se médico possui certificado"""
        cpf_limpo = ''.join(filter(str.isdigit, cpf))
        
        response = self.session.post(
            f'{self.base_url}/v0/oauth/user-discovery',
            json={
                'client_id': self.client_id,
                'client_secret': self.client_secret,
                'user_cpf_cnpj': 'CPF',
                'val_cpf_cnpj': cpf_limpo
            }
        )
        response.raise_for_status()
        data = response.json()
        
        return {
            'possui_certificado': data.get('status') == 'S',
            'slots': data.get('slots', [])
        }
    
    def solicitar_autorizacao_push(self, cpf: str, lifetime: int = 43200) -> Dict[str, str]:
        """Solicita autorização via push"""
        code_verifier, code_challenge = self.generate_pkce()
        cpf_limpo = ''.join(filter(str.isdigit, cpf))
        
        response = self.session.get(
            f'{self.base_url}/v0/oauth/authorize',
            params={
                'client_id': self.client_id,
                'code_challenge': code_challenge,
                'code_challenge_method': 'S256',
                'response_type': 'code',
                'scope': 'signature_session',
                'login_hint': cpf_limpo,
                'lifetime': str(lifetime),
                'redirect_uri': 'push://'
            }
        )
        response.raise_for_status()
        
        return {
            'code': response.json()['code'],
            'code_verifier': code_verifier
        }
    
    def aguardar_autorizacao(self, code: str, timeout_seconds: int = 120) -> str:
        """Aguarda autorização do médico (polling)"""
        start_time = time.time()
        
        while time.time() - start_time < timeout_seconds:
            response = self.session.get(
                f'{self.base_url}/valid/api/v1/trusted-services/authentications',
                params={'code': code}
            )
            
            if response.status_code == 200:
                data = response.json()
                if 'authorizationToken' in data:
                    return data['authorizationToken']
            
            time.sleep(1)  # Intervalo mínimo de 1 segundo
        
        raise TimeoutError('Médico não autorizou a assinatura')
    
    def obter_access_token(self, authorization_token: str, code_verifier: str) -> Dict[str, Any]:
        """Obtém access token"""
        response = self.session.post(
            f'{self.base_url}/v0/oauth/token',
            data={
                'grant_type': 'authorization_code',
                'client_id': self.client_id,
                'client_secret': self.client_secret,
                'code': authorization_token,
                'code_verifier': code_verifier
            },
            headers={'Content-Type': 'application/x-www-form-urlencoded'}
        )
        response.raise_for_status()
        return response.json()
    
    def assinar_pdf(self, access_token: str, pdf_base64: str, 
                   document_id: str, document_alias: str) -> Dict[str, str]:
        """Assina o PDF"""
        pdf_hash = self.calculate_hash(pdf_base64)
        
        response = self.session.post(
            f'{self.base_url}/v0/oauth/signature',
            json={
                'hashes': [{
                    'id': document_id,
                    'alias': document_alias,
                    'hash': pdf_hash,
                    'hash_algorithm': '2.16.840.1.101.3.4.2.1',
                    'signature_format': 'PAdES_AD_RT',
                    'padding_method': 'PKCS1V1_5',
                    'pdf_signature_page': 'true',
                    'base64_content': pdf_base64
                }]
            },
            headers={'Authorization': f'Bearer {access_token}'}
        )
        response.raise_for_status()
        data = response.json()
        
        return {
            'pdf_assinado_base64': data['signatures'][0]['raw_signature'],
            'certificate_alias': data['certificate_alias']
        }
    
    def assinar_receita(self, cpf_medico: str, pdf_base64: str, 
                       receita_id: str) -> Dict[str, str]:
        """Fluxo completo de assinatura"""
        # 1. Verificar certificado
        verificacao = self.verificar_certificado(cpf_medico)
        if not verificacao['possui_certificado']:
            raise ValueError('Médico não possui certificado digital VIDaaS')
        
        # 2. Solicitar autorização
        auth_data = self.solicitar_autorizacao_push(cpf_medico)
        
        # 3. Aguardar médico autorizar
        authorization_token = self.aguardar_autorizacao(auth_data['code'])
        
        # 4. Obter access token
        token_data = self.obter_access_token(
            authorization_token, 
            auth_data['code_verifier']
        )
        
        # 5. Assinar PDF
        resultado = self.assinar_pdf(
            token_data['access_token'],
            pdf_base64,
            receita_id,
            f'receita_{receita_id}.pdf'
        )
        
        return resultado
```

---

## 12. Troubleshooting

### 12.1 Problemas Comuns

| Problema | Causa Provável | Solução |
|----------|---------------|---------|
| `user_not_found` | CPF não tem VIDaaS | Médico precisa adquirir certificado |
| Push não chega | App não instalado/notificações bloqueadas | Verificar configurações do app |
| Timeout no polling | Médico não viu notificação | Implementar QR Code como fallback |
| `invalid_hash` | Hash calculado errado | Verificar encoding Base64 |
| `invalid_signature_format` | Formato não suportado | Usar `PAdES_AD_RT` |
| `rate_limit_exceeded` | Muitas requisições | Implementar backoff |

### 12.2 Logs de Diagnóstico

```javascript
// Implementar logs detalhados
const logger = {
  info: (msg, data) => console.log(`[INFO] ${new Date().toISOString()} - ${msg}`, data),
  warn: (msg, data) => console.warn(`[WARN] ${new Date().toISOString()} - ${msg}`, data),
  error: (msg, data) => console.error(`[ERROR] ${new Date().toISOString()} - ${msg}`, data)
};

// Uso
logger.info('Iniciando assinatura', { receitaId, cpfMedico: '***' });
logger.info('Autorização recebida', { receitaId });
logger.error('Falha na assinatura', { receitaId, error: error.message });
```

---

## 13. Links Úteis

### 13.1 VIDaaS / VALID

| Recurso | URL |
|---------|-----|
| **Documentação Oficial** | https://valid-sa.atlassian.net/wiki/spaces/PDD/pages/958365697 |
| **Portal do Desenvolvedor** | https://valid-sa.atlassian.net/wiki/spaces/PDD/ |
| **Suporte Técnico** | https://valid-sa.atlassian.net/servicedesk/customer/portal/4 |
| **Email Comercial** | produtos.certificadora@valid.com |
| **Comprar Certificado** | https://validcertificadora.com.br/pages/certificado-em-nuvem |
| **App VIDaaS (Android)** | https://play.google.com/store/apps/details?id=br.com.valid.vidaas |
| **App VIDaaS (iOS)** | https://apps.apple.com/br/app/vidaas/id1475046498 |
| **VIDaaS Connect (Desktop)** | https://validcertificadora.com.br/pages/vidaas-connect |

### 13.2 ICP-Brasil e Regulamentação

| Recurso | URL |
|---------|-----|
| **Verificador ITI** | https://validar.iti.gov.br/ |
| **ITI - Instituto Nacional de TI** | https://www.gov.br/iti/pt-br |
| **Prescrição Eletrônica CFM** | https://prescricaoeletronica.cfm.org.br/ |
| **Certificado Digital CFM** | https://certificadodigital.cfm.org.br/ |
| **RDC 1.000/2025 ANVISA** | https://www.gov.br/anvisa/ |

### 13.3 Referências Técnicas

| Recurso | URL |
|---------|-----|
| **RFC 7636 (PKCE)** | https://datatracker.ietf.org/doc/html/rfc7636 |
| **RFC 6749 (OAuth 2.0)** | https://datatracker.ietf.org/doc/html/rfc6749 |
| **PAdES (PDF Signatures)** | https://www.etsi.org/deliver/etsi_ts/103100_103199/103172/ |
| **Gerador PKCE Online** | https://example-app.com/pkce |

### 13.4 Bibliotecas Recomendadas

| Linguagem | Biblioteca | Uso |
|-----------|------------|-----|
| **Node.js** | `crypto` (nativo) | Hash SHA-256, PKCE |
| **Node.js** | `axios` | HTTP client |
| **Python** | `cryptography` | Hash, encoding |
| **Python** | `requests` | HTTP client |
| **PHP** | `guzzlehttp/guzzle` | HTTP client |
| **Qualquer** | `pdf-lib` | Manipulação de PDF |

---

## 14. Glossário

| Termo | Definição |
|-------|-----------|
| **ICP-Brasil** | Infraestrutura de Chaves Públicas Brasileira - autoridade raiz de certificação |
| **PSC** | Prestador de Serviço de Confiança - entidade que armazena certificados em nuvem |
| **HSM** | Hardware Security Module - dispositivo criptográfico que armazena chaves |
| **e-CPF** | Certificado digital de pessoa física no padrão ICP-Brasil |
| **PAdES** | PDF Advanced Electronic Signatures - padrão de assinatura em PDF |
| **CAdES** | CMS Advanced Electronic Signatures - padrão de assinatura CMS |
| **PKCE** | Proof Key for Code Exchange - extensão de segurança do OAuth 2.0 |
| **OAuth 2.0** | Protocolo de autorização usado para acesso à API |
| **Carimbo de Tempo** | Prova criptográfica de data/hora da assinatura |
| **Base64** | Codificação para representar dados binários em texto |
| **SHA-256** | Algoritmo de hash criptográfico |

---

## Histórico de Versões

| Versão | Data | Autor | Alterações |
|--------|------|-------|------------|
| 1.0 | 24/01/2026 | Click Cannabis | Versão inicial |

---

**Documento elaborado pela equipe de tecnologia da Click Cannabis.**  
**Contato:** tech@clickcannabis.com.br

