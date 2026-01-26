# Sistema de Receita Médica - Documentação Técnica Completa

> **Versão:** 1.0  
> **Data:** Janeiro/2026  
> **Autor:** Equipe ClickMedicos  
> **Classificação:** Documento Técnico Interno - Base de Conhecimento

---

## 📑 Índice

1. [Visão Geral](#1-visão-geral)
2. [Arquitetura do Sistema](#2-arquitetura-do-sistema)
3. [Modelo de Dados](#3-modelo-de-dados)
4. [Integração VIDaaS (Assinatura Digital)](#4-integração-vidaas-assinatura-digital)
5. [Backend: tRPC Router](#5-backend-trpc-router)
6. [Integração com Banco Click](#6-integração-com-banco-click)
7. [Frontend](#7-frontend)
8. [Geração de PDF](#8-geração-de-pdf)
9. [Máquina de Estados](#9-máquina-de-estados)
10. [Regras de Negócio](#10-regras-de-negócio)
11. [Error Handling](#11-error-handling)
12. [Casos de Uso](#12-casos-de-uso)
13. [Glossário](#13-glossário)
14. [Referências](#14-referências)

---

## 1. Visão Geral

### 1.1. Objetivo do Sistema

O **Sistema de Receita Médica** do ClickMedicos permite que médicos credenciados criem, editem e assinem digitalmente prescrições eletrônicas de cannabis medicinal com **certificado ICP-Brasil**, garantindo validade jurídica e conformidade com a legislação brasileira.

**Principais funcionalidades:**
- ✅ Criação de receitas a partir de consultas finalizadas no Click CRM
- ✅ Assinatura digital com certificado ICP-Brasil via VIDaaS
- ✅ Geração de PDF com QR Code para verificação pública
- ✅ Auditoria completa de todas as ações
- ✅ Validação pública de autenticidade (farmácias/pacientes)

### 1.2. Contexto de Negócio (Cannabis Medicinal)

O ClickMedicos atua no mercado de **cannabis medicinal**, onde médicos prescrevem produtos derivados de cannabis para pacientes com condições clínicas específicas. O sistema integra:

1. **Click CRM**: Sistema legado onde ocorrem as teleconsultas
2. **ClickMedicos**: Sistema moderno de gestão de horários e prescrições
3. **VIDaaS**: Prestador de Serviço de Confiança (PSC) da VALID para assinatura digital

**Fluxo de negócio:**
```
Paciente → Consulta (Click) → Receita (ClickMedicos) → Assinatura (VIDaaS) → Importação (Anvisa)
```

### 1.3. Requisitos Legais

#### ICP-Brasil e MP 2.200-2/2001
- **Certificado Digital**: e-CPF A3 em nuvem (VIDaaS)
- **Validade Jurídica**: Assinatura digital ICP-Brasil tem mesma validade que manuscrita
- **Padrão**: PAdES_AD_RT (PDF Advanced Electronic Signature com timestamp)

#### RDC 660/2022 (Anvisa)
Campos obrigatórios para importação de cannabis:
1. Nome do paciente
2. Nome do produto (+ concentração + apresentação)
3. Posologia (dose + frequência + via)
4. Data de emissão
5. Assinatura (digital ou manuscrita)
6. Registro profissional (CRM + UF)

**Validade:** 6 meses a partir da data de emissão

#### Resolução CFM nº 2.299/2021
- Prescrição eletrônica permitida
- Assinatura digital obrigatória para validade
- Validação via portal prescricao.cfm.org.br

### 1.4. Stakeholders e Usuários

| Stakeholder | Papel | Acesso |
|-------------|-------|--------|
| **Médicos** | Criam e assinam receitas | Dashboard médico |
| **Pacientes** | Recebem receitas assinadas | Via email/WhatsApp |
| **Farmácias** | Validam autenticidade | Página pública de verificação |
| **Anvisa** | Autoriza importação | Recebe PDF assinado do paciente |
| **Staff ClickMedicos** | Suporte técnico | Dashboard administrativo |

---

## 2. Arquitetura do Sistema

### 2.1. Diagrama de Arquitetura

```mermaid
graph TB
    subgraph "Frontend - Next.js 15"
        A[Wizard de Criação]
        B[Listagem de Receitas]
        C[Edição/Assinatura]
        D[Verificação Pública]
    end
    
    subgraph "Backend - tRPC"
        E[receitaRouter]
        F[vidaasService]
        G[medicoProcedure]
    end
    
    subgraph "Databases"
        H[(PostgreSQL Local<br/>Prisma)]
        I[(PostgreSQL Click<br/>Replica Read-Only)]
    end
    
    subgraph "External APIs"
        J[VIDaaS API<br/>OAuth 2.0 + PKCE]
    end
    
    A --> E
    B --> E
    C --> E
    D --> E
    
    E --> G
    E --> F
    E --> H
    E --> I
    
    F --> J
    
    style J fill:#ff6b6b
    style H fill:#51cf66
    style I fill:#ffd43b
```

### 2.2. Stack Tecnológico

| Camada | Tecnologia | Versão | Justificativa |
|--------|------------|--------|---------------|
| **Frontend** | Next.js | 15.x | App Router, Server Components, RSC |
| **UI** | React | 18.x | Hooks, Suspense, Concurrent Mode |
| **Styling** | Tailwind CSS | 3.x | Utility-first, Design System |
| **Components** | Radix UI | Latest | Acessibilidade, Headless UI |
| **Backend** | tRPC | 11.x | Type-safe API, End-to-end TypeScript |
| **ORM** | Prisma | 5.x | Type-safe queries, Migrations |
| **Database** | PostgreSQL | 14+ | ACID, JSONB, Full-text search |
| **Auth** | Better Auth | Latest | Session-based, Secure |
| **PDF** | @react-pdf/renderer | 3.x | React components → PDF |
| **QR Code** | qrcode | 1.x | Geração de QR Code |
| **Signature** | VIDaaS | API v0 | ICP-Brasil, OAuth 2.0 + PKCE |

### 2.3. Fluxo de Dados Geral

```mermaid
sequenceDiagram
    participant M as Médico
    participant F as Frontend
    participant T as tRPC Router
    participant P as Prisma DB
    participant C as Click DB
    participant V as VIDaaS API
    
    M->>F: Acessa /receitas/nova
    F->>T: listarConsultasRecentes()
    T->>C: SELECT consultings WHERE completed=TRUE
    C-->>T: Lista de consultas
    T-->>F: Consultas finalizadas
    
    M->>F: Seleciona consulta
    F->>T: buscarDadosConsulta(consultingId)
    T->>C: SELECT anamnese WHERE consulting_id=X
    C-->>T: Dados do paciente
    T-->>F: Anamnese + Paciente
    
    M->>F: Preenche produtos e posologia
    F->>T: criarReceita(dados)
    T->>P: INSERT INTO receita (status=RASCUNHO)
    P-->>T: Receita criada
    T-->>F: receitaId
    
    M->>F: Clica "Assinar Digitalmente"
    F->>F: Gera PDF (ReceitaPDF.tsx)
    F->>T: assinarReceita(receitaId, pdfBase64)
    T->>P: UPDATE receita SET status=PENDENTE_ASSINATURA
    T->>V: POST /user-discovery (verifica certificado)
    V-->>T: Certificado OK
    T->>V: GET /authorize (solicita autorização)
    V-->>T: code
    V->>M: Push notification no celular
    M->>V: Autoriza com PIN
    T->>V: GET /authentications (polling)
    V-->>T: authorizationToken
    T->>V: POST /token (troca por access_token)
    V-->>T: access_token
    T->>V: POST /signature (assina PDF)
    V-->>T: PDF assinado (Base64)
    T->>P: UPDATE receita SET status=ASSINADA, pdfUrl=...
    T->>P: INSERT INTO receita_auditoria (acao=ASSINADA)
    T-->>F: Sucesso
    F-->>M: "Receita assinada com sucesso!"
```

### 2.4. Componentes Principais

#### Backend
- **`packages/api/src/routers/receita.ts`**: Router tRPC com 15 endpoints
- **`packages/api/src/services/vidaas.service.ts`**: Service layer para VIDaaS
- **`packages/api/src/middleware/permissions.ts`**: Sistema de permissões
- **`packages/db/src/click-replica.ts`**: Queries SQL para banco Click

#### Frontend
- **`apps/web/src/components/receita/wizard/`**: Wizard de 3 passos
- **`apps/web/src/components/receita/ReceitaPDF.tsx`**: Geração de PDF
- **`apps/web/src/app/(dashboard)/dashboard/receitas/`**: Pages (nova, listagem, edição)
- **`apps/web/src/app/(public)/verificar/[id]/`**: Verificação pública

#### Database
- **`packages/db/prisma/schema/app.prisma`**: Models (Receita, ReceitaAuditoria, VidaasCredentials)
- **`packages/db/prisma/schema/auth.prisma`**: Model User (cpf, crm, ufCrm, enderecoConsultorio)

---

## 3. Modelo de Dados

### 3.1. Diagrama ER

```mermaid
erDiagram
    User ||--o{ Receita : "cria"
    User ||--o| VidaasCredentials : "possui"
    User ||--o{ ReceitaAuditoria : "registra"
    Receita ||--o{ ReceitaAuditoria : "tem"
    
    User {
        string id PK
        string email
        string name
        UserTipo tipo
        string cpf "Para VIDaaS"
        string crm "CRM do médico"
        string ufCrm "UF do CRM"
        string enderecoConsultorio "Endereço"
        int clickDoctorId "ID no Click"
    }
    
    Receita {
        string id PK
        ReceitaStatus status
        int consultaClickId "ID no Click"
        string medicoId FK
        string pacienteNome
        string pacienteCpf
        string pacienteEndereco
        json produtos "Array de produtos"
        text posologia
        text alertas
        text observacoes
        datetime dataEmissao
        datetime dataValidade "6 meses"
        string pdfUrl "PDF assinado Base64"
        datetime createdAt
        datetime updatedAt
    }
    
    ReceitaAuditoria {
        string id PK
        string receitaId FK
        string medicoId FK
        string acao "CRIADA, ASSINADA, etc"
        datetime createdAt
    }
    
    VidaasCredentials {
        string id PK
        string medicoId FK
        string clientId
        string clientSecret
        datetime createdAt
        datetime updatedAt
    }
```

### 3.2. Entidade: Receita

**Tabela:** `receita`  
**Arquivo:** `packages/db/prisma/schema/app.prisma` (linhas 327-369)

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `id` | String (UUID) | ✅ | Chave primária |
| `status` | ReceitaStatus | ✅ | Estado atual (RASCUNHO, PENDENTE_ASSINATURA, ASSINADA, CANCELADA) |
| `consultaClickId` | Int | ❌ | ID da consulta no banco Click (tabela `consultings`) |
| `medicoId` | String (UUID) | ✅ | FK para `user.id` (médico prescritor) |
| `pacienteNome` | String | ✅ | Nome completo do paciente |
| `pacienteCpf` | String | ❌ | CPF do paciente (opcional) |
| `pacienteEndereco` | String | ❌ | Endereço do paciente (facilita formulário Anvisa) |
| `produtos` | Json | ✅ | Array de objetos: `[{ nome, concentracao, quantidade, posologia }]` |
| `posologia` | Text | ✅ | Instruções de uso consolidadas |
| `alertas` | Text | ❌ | Alertas de segurança (ex: "Não dirigir") |
| `observacoes` | Text | ❌ | Observações adicionais do médico |
| `dataEmissao` | DateTime | ✅ | Data de criação da receita (default: now()) |
| `dataValidade` | DateTime | ❌ | Data de validade (6 meses após emissão) |
| `pdfUrl` | String | ❌ | PDF assinado em Base64 (formato: `data:application/pdf;base64,...`) |
| `pdfUrlNaoAssinado` | String | ❌ | PDF antes da assinatura (não utilizado atualmente) |
| `createdAt` | DateTime | ✅ | Timestamp de criação |
| `updatedAt` | DateTime | ✅ | Timestamp de última atualização |

**Índices:**
- `medicoId` (buscar receitas do médico)
- `status` (filtrar por estado)
- `consultaClickId` (vincular com consulta)
- `createdAt` (ordenação cronológica)

**Relações:**
- `medico`: User (1:N)
- `auditorias`: ReceitaAuditoria[] (1:N)

**Exemplo de registro:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "ASSINADA",
  "consultaClickId": 12345,
  "medicoId": "user-uuid-123",
  "pacienteNome": "Maria Aparecida Santos",
  "pacienteCpf": "123.456.789-00",
  "pacienteEndereco": "Rua das Flores, 123 - São Paulo/SP",
  "produtos": [
    {
      "nome": "Óleo de Cannabis Full Spectrum CBD 3000mg",
      "concentracao": "3000mg CBD",
      "quantidade": 1,
      "posologia": "3 gotas sublingual, 2x ao dia"
    }
  ],
  "posologia": "Óleo de Cannabis Full Spectrum CBD 3000mg: 3 gotas sublingual, 2x ao dia",
  "alertas": "Evitar dirigir após o uso",
  "observacoes": "Paciente com histórico de ansiedade",
  "dataEmissao": "2026-01-26T10:30:00.000Z",
  "dataValidade": "2026-07-26T10:30:00.000Z",
  "pdfUrl": "data:application/pdf;base64,JVBERi0xLjQK...",
  "createdAt": "2026-01-26T10:30:00.000Z",
  "updatedAt": "2026-01-26T10:35:00.000Z"
}
```

### 3.3. Entidade: ReceitaAuditoria

**Tabela:** `receita_auditoria`  
**Arquivo:** `packages/db/prisma/schema/app.prisma` (linhas 371-390)

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `id` | String (UUID) | ✅ | Chave primária |
| `receitaId` | String (UUID) | ✅ | FK para `receita.id` |
| `medicoId` | String (UUID) | ✅ | FK para `user.id` (quem executou a ação) |
| `acao` | String | ✅ | Tipo de ação (CRIADA, ATUALIZADA, ASSINADA, DUPLICADA, CANCELADA) |
| `createdAt` | DateTime | ✅ | Timestamp da ação |

**Índices:**
- `receitaId` (buscar auditoria de uma receita)
- `medicoId` (buscar ações de um médico)
- `createdAt` (ordenação cronológica)

**Ações registradas:**
- `CRIADA`: Receita criada em RASCUNHO
- `ATUALIZADA`: Receita editada (apenas em RASCUNHO)
- `ASSINADA`: Assinatura digital concluída com sucesso
- `DUPLICADA`: Receita duplicada a partir de outra
- `CANCELADA`: Receita cancelada (não implementado atualmente)

**Exemplo de registro:**
```json
{
  "id": "audit-uuid-123",
  "receitaId": "550e8400-e29b-41d4-a716-446655440000",
  "medicoId": "user-uuid-123",
  "acao": "ASSINADA",
  "createdAt": "2026-01-26T10:35:00.000Z"
}
```

### 3.4. Entidade: VidaasCredentials

**Tabela:** `vidaas_credentials`  
**Arquivo:** `packages/db/prisma/schema/app.prisma` (linhas 309-323)

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `id` | String (UUID) | ✅ | Chave primária |
| `medicoId` | String (UUID) | ✅ | FK para `user.id` (único por médico) |
| `clientId` | String | ✅ | Client ID OAuth 2.0 do VIDaaS |
| `clientSecret` | Text | ✅ | Client Secret OAuth 2.0 (criptografado) |
| `createdAt` | DateTime | ✅ | Timestamp de criação |
| `updatedAt` | DateTime | ✅ | Timestamp de última atualização |

**Índices:**
- `medicoId` (único - um médico tem apenas uma credencial)

**⚠️ IMPORTANTE:** Atualmente, as credenciais VIDaaS são **globais** (configuradas via variáveis de ambiente `VIDAAS_CLIENT_ID` e `VIDAAS_CLIENT_SECRET`). Esta tabela foi criada para suportar credenciais **por médico** no futuro, mas não está em uso.

### 3.5. Enum: ReceitaStatus

**Arquivo:** `packages/db/prisma/schema/app.prisma` (linhas 300-305)

```prisma
enum ReceitaStatus {
  RASCUNHO
  PENDENTE_ASSINATURA
  ASSINADA
  CANCELADA
}
```

| Status | Descrição | Pode Editar? | Pode Assinar? |
|--------|-----------|--------------|---------------|
| `RASCUNHO` | Receita criada, não assinada | ✅ Sim | ✅ Sim |
| `PENDENTE_ASSINATURA` | Aguardando autorização no app VIDaaS | ❌ Não | ❌ Não |
| `ASSINADA` | PDF assinado com ICP-Brasil | ❌ Não | ❌ Não |
| `CANCELADA` | Receita invalidada (não implementado) | ❌ Não | ❌ Não |

**Transições permitidas:**
```
RASCUNHO → PENDENTE_ASSINATURA → ASSINADA
RASCUNHO → CANCELADA
PENDENTE_ASSINATURA → RASCUNHO (em caso de erro)
```

### 3.6. Campos no User

**Arquivo:** `packages/db/prisma/schema/auth.prisma` (linhas 1-61)

Campos específicos para receita médica:

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `cpf` | String | ❌ | CPF do médico (11 dígitos) - **obrigatório para assinar** |
| `crm` | String | ❌ | CRM do médico (ex: "12345-SP") |
| `ufCrm` | String | ❌ | UF do CRM (estado - ex: "SP") |
| `enderecoConsultorio` | String | ❌ | Endereço do consultório (aparece no PDF) |
| `clickDoctorId` | Int | ❌ | ID na tabela `doctors` do banco Click (único) |

**Validações:**
- `cpf`: Verificado antes de assinar (endpoint `assinarReceita`)
- `crm` + `ufCrm`: Buscados automaticamente do banco Click se não preenchidos
- `enderecoConsultorio`: Usado no cabeçalho do PDF da receita

**Relações:**
- `receitas`: Receita[] (1:N)
- `receitasAuditorias`: ReceitaAuditoria[] (1:N)
- `vidaasCredentials`: VidaasCredentials (1:1)

---

## 4. Integração VIDaaS (Assinatura Digital)

### 4.1. Visão Geral do VIDaaS

**VIDaaS** (VALID ID as a Service) é um **Prestador de Serviço de Confiança (PSC)** da VALID, credenciado pela ICP-Brasil, que oferece certificados digitais em nuvem (e-CPF A3) e assinatura digital via API.

**Características:**
- ✅ Certificado ICP-Brasil (validade jurídica)
- ✅ Assinatura via smartphone (sem token físico)
- ✅ OAuth 2.0 + PKCE (segurança máxima)
- ✅ Push notification para autorização
- ✅ Padrão PAdES_AD_RT (PDF com timestamp)

**Ambientes:**
- **Produção**: `https://certificado.vidaas.com.br`
- **Homologação**: `https://hml-certificado.vidaas.com.br`

**Documentação oficial:** `docs/criacaoreceitamedica/documentacao_integracao_click_vidaas.md`

### 4.2. Diagrama de Sequência (Fluxo Completo)

```mermaid
sequenceDiagram
    participant M as Médico
    participant F as Frontend
    participant T as tRPC (receita.ts)
    participant V as VidaasService
    participant API as VIDaaS API
    participant APP as App VIDaaS (Celular)
    
    M->>F: Clica "Assinar Digitalmente"
    F->>F: Gera PDF (ReceitaPDF.tsx)
    F->>T: assinarReceita(receitaId, pdfBase64)
    
    Note over T: Validações iniciais
    T->>T: Verifica se receita existe
    T->>T: Verifica ownership (medicoId)
    T->>T: Verifica se status != ASSINADA
    T->>T: Busca CPF do médico
    
    alt CPF não cadastrado
        T-->>F: Error: "CPF do médico não cadastrado"
        F-->>M: Mensagem de erro
    end
    
    T->>T: UPDATE status = PENDENTE_ASSINATURA
    T->>V: assinarReceita(cpf, pdfBase64, receitaId)
    
    Note over V: Passo 1: Verificar Certificado
    V->>API: POST /v0/oauth/user-discovery
    API-->>V: { status: "S", slots: [...] }
    
    alt Certificado não encontrado
        V-->>T: Error: "Médico não possui certificado"
        T->>T: UPDATE status = RASCUNHO
        T-->>F: Error
        F-->>M: "Você não possui certificado digital VIDaaS"
    end
    
    Note over V: Passo 2: Gerar PKCE
    V->>V: generatePKCE()
    V->>V: code_verifier = random(32 bytes)
    V->>V: code_challenge = SHA256(code_verifier)
    
    Note over V: Passo 3: Solicitar Autorização
    V->>API: GET /v0/oauth/authorize?<br/>client_id=...&<br/>code_challenge=...&<br/>login_hint=CPF&<br/>redirect_uri=push://
    API-->>V: { code: "abc123..." }
    API->>APP: Push Notification
    
    Note over V: Passo 4: Polling (aguardar autorização)
    loop A cada 1 segundo (max 2 min)
        V->>API: GET /authentications?code=abc123
        alt Ainda aguardando
            API-->>V: 202 Accepted
        end
    end
    
    M->>APP: Abre notificação
    M->>APP: Digita PIN
    APP->>API: Autoriza assinatura
    
    API-->>V: 200 OK { authorizationToken: "xyz..." }
    
    Note over V: Passo 5: Obter Access Token
    V->>API: POST /v0/oauth/token<br/>grant_type=authorization_code&<br/>code=xyz...&<br/>code_verifier=...
    API-->>V: { access_token: "...", expires_in: 43200 }
    
    Note over V: Passo 6: Assinar PDF
    V->>V: calculateHash(pdfBase64)
    V->>API: POST /v0/oauth/signature<br/>Authorization: Bearer ...<br/>{ hashes: [{ id, hash, base64_content }] }
    API-->>V: { signatures: [{ raw_signature: "..." }] }
    
    V-->>T: { pdfAssinadoBase64, certificateAlias }
    T->>T: UPDATE status = ASSINADA, pdfUrl = ...
    T->>T: INSERT INTO receita_auditoria (acao=ASSINADA)
    T-->>F: { success: true, pdfUrl: "..." }
    F-->>M: "Receita assinada com sucesso!"
```

### 4.3. OAuth 2.0 + PKCE Explicado

**PKCE** (Proof Key for Code Exchange) é uma extensão do OAuth 2.0 que adiciona segurança contra ataques de interceptação de código.

**Fluxo:**

1. **Gerar code_verifier** (string aleatória de 43-128 caracteres, Base64 URL-safe):
   ```typescript
   const code_verifier = crypto.randomBytes(32)
     .toString('base64')
     .replace(/\+/g, '-')
     .replace(/\//g, '_')
     .replace(/=/g, '');
   // Exemplo: "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"
   ```

2. **Gerar code_challenge** (SHA-256 do code_verifier, Base64 URL-safe):
   ```typescript
   const code_challenge = crypto.createHash('sha256')
     .update(code_verifier)
     .digest('base64')
     .replace(/\+/g, '-')
     .replace(/\//g, '_')
     .replace(/=/g, '');
   // Exemplo: "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM"
   ```

3. **Enviar code_challenge** no `/authorize`:
   ```
   GET /v0/oauth/authorize?
     client_id=...&
     code_challenge=E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM&
     code_challenge_method=S256&
     ...
   ```

4. **Receber code** (após autorização do médico):
   ```json
   { "code": "d402d71c-0918-43ca-a07d-62597f559497" }
   ```

5. **Trocar code por access_token** (enviando code_verifier original):
   ```
   POST /v0/oauth/token
   grant_type=authorization_code&
   code=d402d71c-0918-43ca-a07d-62597f559497&
   code_verifier=dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk
   ```

**Segurança:**
- Mesmo que um atacante intercepte o `code`, ele não consegue trocá-lo por `access_token` sem o `code_verifier` original
- O `code_challenge` é enviado no início, mas o `code_verifier` só é revelado no final

### 4.4. Endpoints Utilizados

#### 4.4.1. User Discovery

**Endpoint:** `POST /v0/oauth/user-discovery`  
**Objetivo:** Verificar se um CPF/CNPJ possui certificado digital ativo no VIDaaS

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

**Implementação:**
```typescript
// packages/api/src/services/vidaas.service.ts (linhas 171-197)
async verificarCertificado(cpf: string): Promise<VerificarCertificadoResponse> {
  const url = `${this.baseUrl}/v0/oauth/user-discovery`;
  const payload = {
    client_id: this.clientId,
    client_secret: this.clientSecret,
    user_cpf_cnpj: "CPF",
    val_cpf_cnpj: cpf.replace(/\D/g, ""),
  };

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
}
```

#### 4.4.2. Authorize (Push)

**Endpoint:** `GET /v0/oauth/authorize`  
**Objetivo:** Iniciar fluxo de autorização OAuth 2.0 + PKCE via push notification

**Request:**
```
GET /v0/oauth/authorize?
  client_id=a1b2c3d4-e5f6-7890-abcd-ef1234567890&
  code_challenge=E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM&
  code_challenge_method=S256&
  response_type=code&
  scope=signature_session&
  login_hint=12345678901&
  lifetime=43200&
  redirect_uri=push://
```

**Parâmetros:**
- `client_id`: ID da aplicação cadastrada
- `code_challenge`: Hash SHA-256 do code_verifier (Base64 URL-safe)
- `code_challenge_method`: Sempre `S256`
- `response_type`: Sempre `code`
- `scope`: `signature_session` (múltiplas assinaturas na mesma sessão)
- `login_hint`: CPF do médico (11 dígitos)
- `lifetime`: Tempo de vida da sessão em segundos (max 7 dias para e-CPF)
- `redirect_uri`: `push://` para notificação push

**Response (200):**
```
code=d402d71c-0918-43ca-a07d-62597f559497
```

**Implementação:**
```typescript
// packages/api/src/services/vidaas.service.ts (linhas 204-271)
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
  
  // VIDaaS retorna URL-encoded: "code=xxxxx"
  let code: string | undefined;
  if (responseText.startsWith("code=")) {
    code = responseText.split("=")[1];
  } else {
    const data = JSON.parse(responseText) as { code?: string };
    code = data.code;
  }
  
  if (!code) {
    throw new VidaasError("VIDaaS não retornou código de autorização");
  }

  return {
    code,
    code_verifier: pkce.code_verifier,
  };
}
```

#### 4.4.3. Authentications (Polling)

**Endpoint:** `GET /valid/api/v1/trusted-services/authentications`  
**Objetivo:** Verificar se o médico já autorizou a assinatura (polling)

**Request:**
```
GET /valid/api/v1/trusted-services/authentications?code=d402d71c-0918-43ca-a07d-62597f559497
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
  "authorizationToken": "eyJlbmMiOiJBMTI4Q0JDLUhTMjU2IiwiYWxnIjoiZGlyIn0...",
  "redirectUrl": "push://<URI>?code=8b1bde77-3647-4d76-1289-a2ec97c75a4d&state=NONE"
}
```

**Implementação:**
```typescript
// packages/api/src/services/vidaas.service.ts (linhas 278-352)
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

      const data = await response.json() as { authorizationToken?: string };
      
      if (data.authorizationToken) {
        console.log(`[VIDaaS] Autorização recebida após ${attempts}s`);
        return data.authorizationToken;
      }

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
```

#### 4.4.4. Token

**Endpoint:** `POST /v0/oauth/token`  
**Objetivo:** Trocar código de autorização por access token

**Request:**
```
POST /v0/oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code&
client_id=a1b2c3d4-e5f6-7890-abcd-ef1234567890&
client_secret=Xy9Zw8Vt7Rs6Qp5On4Ml3Kj2Ih1Gf0Ed&
code=eyJlbmMiOiJBMTI4Q0JDLUhTMjU2IiwiYWxnIjoiZGlyIn0...&
code_verifier=dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk
```

**Response (200):**
```json
{
  "access_token": "eyJlbmMiOiJBMTI4Q0JDLUhTMjU2IiwiYWxnIjoiZGlyIn0...",
  "token_type": "Bearer",
  "expires_in": 43200,
  "scope": "signature_session",
  "authorized_identification": "12345678901",
  "authorized_identification_type": "CPF"
}
```

**Implementação:**
```typescript
// packages/api/src/services/vidaas.service.ts (linhas 357-382)
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

  const response = await this.makeRequest<TokenResponse>(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  return response;
}
```

#### 4.4.5. Signature

**Endpoint:** `POST /v0/oauth/signature`  
**Objetivo:** Assinar o PDF com certificado digital ICP-Brasil

**Request:**
```json
POST /v0/oauth/signature
Content-Type: application/json
Authorization: Bearer eyJlbmMiOiJBMTI4Q0JDLUhTMjU2IiwiYWxnIjoiZGlyIn0...

{
  "hashes": [
    {
      "id": "receita-click-2026-00001",
      "alias": "receita_cannabis_joao_silva.pdf",
      "hash": "FqulOTrXLABB9WAK08LFLsQ3ovDH/Aj638PA/pZB16M=",
      "hash_algorithm": "2.16.840.1.101.3.4.2.1",
      "signature_format": "PAdES_AD_RT",
      "padding_method": "PKCS1V1_5",
      "pdf_signature_page": "true",
      "base64_content": "JVBERi0xLjQKJeLjz9MK..."
    }
  ]
}
```

**Parâmetros:**
- `id`: Identificador único do documento (receitaId)
- `alias`: Nome amigável do arquivo
- `hash`: Hash SHA-256 do PDF em Base64
- `hash_algorithm`: OID do algoritmo SHA-256 (`2.16.840.1.101.3.4.2.1`)
- `signature_format`: `PAdES_AD_RT` (PDF com timestamp)
- `padding_method`: `PKCS1V1_5` (mais compatível)
- `pdf_signature_page`: `"true"` para incluir página visual de assinatura
- `base64_content`: Conteúdo do PDF em Base64

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

**⚠️ IMPORTANTE:** O campo `raw_signature` contém o PDF **assinado completo** em Base64.

**Implementação:**
```typescript
// packages/api/src/services/vidaas.service.ts (linhas 387-462)
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

  const firstSignature = response.signatures[0];
  if (!firstSignature?.raw_signature && !firstSignature?.file_base64_signed) {
    throw new VidaasError("Assinatura não retornada pela API VIDaaS");
  }

  const signedPdf = firstSignature.file_base64_signed || firstSignature.signed_file || firstSignature.raw_signature;
  const cleanBase64 = signedPdf.replace(/[\r\n]/g, "");

  return {
    pdfAssinadoBase64: cleanBase64,
    certificateAlias: response.certificate_alias,
  };
}
```

### 4.5. Código: VidaasService.assinarReceita()

**Arquivo:** `packages/api/src/services/vidaas.service.ts` (linhas 472-515)

```typescript
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
```

### 4.6. Classes de Erro

**Arquivo:** `packages/api/src/services/vidaas.service.ts` (linhas 63-100)

```typescript
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
```

**Tratamento de erros:**
```typescript
// packages/api/src/services/vidaas.service.ts (linhas 565-624)
private handleError(error: unknown, context: string): VidaasError {
  if (error instanceof VidaasError) {
    return error;
  }

  if (error instanceof Error) {
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
```

### 4.7. Variáveis de Ambiente

**Arquivo:** `apps/web/.env.example` (linhas 46-61)

```bash
# ------------------------------------------
# VIDAAS (Assinatura Digital de Receitas)
# ------------------------------------------
# Integracao com VIDaaS para assinatura digital de receitas medicas
# Documentacao: docs/criacaoreceitamedica/documentacao_integracao_click_vidaas.md

# URL base da API VIDaaS
# Producao: https://api.vidaas.com.br
# Homologacao: https://api-homolog.vidaas.com.br
VIDAAS_BASE_URL=https://api-homolog.vidaas.com.br

# Credenciais OAuth 2.0 (fornecidas pela VIDaaS)
VIDAAS_CLIENT_ID=
VIDAAS_CLIENT_SECRET=

# URI de redirecionamento (use "push://" para notificacao push)
VIDAAS_REDIRECT_URI=push://
```

**Como obter credenciais:**

1. **Cadastrar aplicação** (uma vez):
   ```bash
   POST https://api-homolog.vidaas.com.br/v0/oauth/application
   Content-Type: application/json
   
   {
     "name": "Click Cannabis - Prescrição Eletrônica",
     "comments": "Sistema de telemedicina para prescrição de cannabis medicinal",
     "redirect_uris": ["push://"],
     "email": "tech@clickcannabis.com.br"
   }
   ```

2. **Resposta** (guardar com segurança):
   ```json
   {
     "status": "success",
     "message": "New Client Application registered with Sucess",
     "client_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
     "client_secret": "Xy9Zw8Vt7Rs6Qp5On4Ml3Kj2Ih1Gf0Ed"
   }
   ```

3. **Configurar `.env`**:
   ```bash
   VIDAAS_CLIENT_ID=a1b2c3d4-e5f6-7890-abcd-ef1234567890
   VIDAAS_CLIENT_SECRET=Xy9Zw8Vt7Rs6Qp5On4Ml3Kj2Ih1Gf0Ed
   ```

**⚠️ SEGURANÇA:**
- ❌ NUNCA commitar credenciais no Git
- ❌ NUNCA expor credenciais em logs
- ❌ NUNCA enviar credenciais para o frontend
- ✅ Usar variáveis de ambiente
- ✅ Armazenar em vault/secrets manager em produção

---

## 5. Backend: tRPC Router

### 5.1. Visão Geral

**Arquivo:** `packages/api/src/routers/receita.ts` (676 linhas)

O `receitaRouter` expõe **15 endpoints** tRPC para gerenciar o ciclo de vida completo de receitas médicas:

| Endpoint | Tipo | Permissão | Descrição |
|----------|------|-----------|-----------|
| `listarConsultasRecentes` | Query | medicoProcedure | Lista consultas finalizadas do médico |
| `buscarDadosConsulta` | Query | medicoProcedure | Busca dados de anamnese e paciente |
| `listarProdutos` | Query | medicoProcedure | Lista produtos disponíveis no Click |
| `criarReceita` | Mutation | medicoProcedure | Cria receita em RASCUNHO |
| `atualizarReceita` | Mutation | medicoProcedure | Edita receita (apenas RASCUNHO) |
| `assinarReceita` | Mutation | medicoProcedure | Assina receita via VIDaaS |
| `statusAssinatura` | Query | medicoProcedure | Verifica status da assinatura |
| `atualizarPdfAssinado` | Mutation | medicoProcedure | Atualiza PDF assinado |
| `listarReceitas` | Query | medicoProcedure | Lista receitas com paginação |
| `buscarReceita` | Query | medicoProcedure | Busca receita por ID |
| `duplicarReceita` | Mutation | medicoProcedure | Duplica receita existente |
| `salvarCredenciaisVidaas` | Mutation | medicoProcedure | Salva CPF e endereço |
| `validarCredenciaisVidaas` | Mutation | medicoProcedure | Valida certificado VIDaaS |
| `buscarCredenciaisVidaas` | Query | medicoProcedure | Busca credenciais do médico |
| `verificarReceita` | Query | publicProcedure | Verifica receita (público) |

### 5.2. Endpoints Detalhados

#### 5.2.1. listarConsultasRecentes

**Tipo:** Query  
**Permissão:** medicoProcedure  
**Arquivo:** `receita.ts` (linhas 24-40)

**Input Schema:**
```typescript
z.object({
  limit: z.number().min(1).max(50).default(20)
})
```

**Output:**
```typescript
Array<{
  id: number;
  doctor_id: number;
  user_id: number | null;
  patient_name: string | null;
  start: string;
  completed: boolean;
}>
```

**Lógica:**
1. Verifica se médico tem `clickDoctorId` cadastrado
2. Chama `clickQueries.buscarConsultasRecentesMedico()`
3. Retorna apenas consultas **completadas** (`completed = TRUE`)
4. Ordenadas por data decrescente

**Validações:**
- ✅ Médico autenticado (medicoProcedure)
- ✅ Limite entre 1 e 50

**Erros possíveis:**
- Nenhum (retorna array vazio se não houver consultas)

**Exemplo de uso:**
```typescript
const consultas = await trpc.receita.listarConsultasRecentes.query({ limit: 10 });
```

---

#### 5.2.2. buscarDadosConsulta

**Tipo:** Query  
**Permissão:** medicoProcedure  
**Arquivo:** `receita.ts` (linhas 42-123)

**Input Schema:**
```typescript
z.object({
  consultingId: z.number().int().positive()
})
```

**Output:**
```typescript
{
  paciente: {
    nome: string;
    endereco: string;
  };
  patologias: string[];
  motivoBusca: string;
  anamnese: Record<string, unknown> | null;
}
```

**Lógica:**
1. Busca dados da anamnese no banco Click (`buscarDadosAnamnese`)
2. Busca consultas recentes do médico
3. Valida que a consulta pertence ao médico
4. Extrai dados da anamnese (JSONB):
   - Nome completo do paciente
   - Condições clínicas (patologias)
   - Motivo da busca pela cannabis

**Validações:**
- ✅ Médico autenticado
- ✅ Médico vinculado ao Click (`clickDoctorId`)
- ✅ Consulta pertence ao médico (ownership check)

**Erros possíveis:**
- `BAD_REQUEST`: Médico não vinculado ao Click
- `NOT_FOUND`: Consulta não encontrada ou não pertence ao médico
- `INTERNAL_SERVER_ERROR`: Erro ao buscar dados

**Exemplo de uso:**
```typescript
const dados = await trpc.receita.buscarDadosConsulta.query({ consultingId: 12345 });
console.log(dados.paciente.nome); // "Maria Silva"
console.log(dados.patologias); // ["Ansiedade", "Insônia"]
```

---

#### 5.2.3. listarProdutos

**Tipo:** Query  
**Permissão:** medicoProcedure  
**Arquivo:** `receita.ts` (linhas 125-141)

**Input:** Nenhum

**Output:**
```typescript
Array<{
  id: number;
  name: string;
  formula: string | null;
  type: string | null;
  volume: number | null;
  price: number;
}>
```

**Lógica:**
1. Chama `clickQueries.buscarProdutos()`
2. Transforma campo `title` para `name` (compatibilidade frontend)
3. Retorna apenas produtos com estoque (`quantity > 0`) e preço (`price > 0`)

**Validações:**
- ✅ Médico autenticado

**Erros possíveis:**
- Nenhum (retorna array vazio se não houver produtos)

**Exemplo de uso:**
```typescript
const produtos = await trpc.receita.listarProdutos.query();
```

---

#### 5.2.4. criarReceita

**Tipo:** Mutation  
**Permissão:** medicoProcedure  
**Arquivo:** `receita.ts` (linhas 143-185)

**Input Schema:**
```typescript
z.object({
  consultaClickId: z.number().int().positive().optional(),
  pacienteNome: z.string().min(1),
  pacienteEndereco: z.string().optional(),
  pacienteCpf: z.string().optional(),
  produtos: z.array(produtoSchema).min(1),
  posologia: z.string().min(1),
  alertas: z.string().optional(),
  observacoes: z.string().optional(),
})

// produtoSchema
z.object({
  nome: z.string().min(1),
  concentracao: z.string().optional(),
  apresentacao: z.string().optional(),
  quantidade: z.number().int().positive(),
  posologia: z.string().min(1),
})
```

**Output:**
```typescript
Receita // Model Prisma completo
```

**Lógica:**
1. Calcula `dataValidade` (6 meses após hoje)
2. Cria receita no Prisma com `status = RASCUNHO`
3. Registra auditoria (`acao = CRIADA`)

**Validações:**
- ✅ Médico autenticado
- ✅ `pacienteNome` obrigatório
- ✅ Pelo menos 1 produto
- ✅ `posologia` obrigatória

**Erros possíveis:**
- `BAD_REQUEST`: Validação Zod falhou

**Exemplo de uso:**
```typescript
const receita = await trpc.receita.criarReceita.mutate({
  consultaClickId: 12345,
  pacienteNome: "Maria Silva",
  pacienteCpf: "123.456.789-00",
  produtos: [
    {
      nome: "Óleo CBD 3000mg",
      concentracao: "3000mg",
      quantidade: 1,
      posologia: "3 gotas sublingual, 2x ao dia"
    }
  ],
  posologia: "Óleo CBD 3000mg: 3 gotas sublingual, 2x ao dia",
  alertas: "Evitar dirigir após o uso"
});
```

---

#### 5.2.5. atualizarReceita

**Tipo:** Mutation  
**Permissão:** medicoProcedure  
**Arquivo:** `receita.ts` (linhas 187-242)

**Input Schema:**
```typescript
z.object({
  receitaId: z.string().uuid(),
  pacienteNome: z.string().min(1).optional(),
  pacienteEndereco: z.string().optional(),
  pacienteCpf: z.string().optional(),
  produtos: z.array(produtoSchema).min(1).optional(),
  posologia: z.string().min(1).optional(),
  alertas: z.string().optional(),
  observacoes: z.string().optional(),
})
```

**Output:**
```typescript
Receita // Model Prisma atualizado
```

**Lógica:**
1. Busca receita por ID
2. Valida ownership (`medicoId === ctx.medico.id`)
3. Valida status (`status !== ASSINADA`)
4. Atualiza campos fornecidos
5. Registra auditoria (`acao = ATUALIZADA`)

**Validações:**
- ✅ Médico autenticado
- ✅ Receita existe
- ✅ Médico é dono da receita
- ✅ Receita não está assinada

**Erros possíveis:**
- `NOT_FOUND`: Receita não encontrada
- `FORBIDDEN`: Receita não pertence ao médico
- `BAD_REQUEST`: Receita já assinada (imutável)

**Exemplo de uso:**
```typescript
const receitaAtualizada = await trpc.receita.atualizarReceita.mutate({
  receitaId: "550e8400-e29b-41d4-a716-446655440000",
  alertas: "Evitar dirigir e operar máquinas pesadas"
});
```

---

#### 5.2.6. assinarReceita

**Tipo:** Mutation  
**Permissão:** medicoProcedure  
**Arquivo:** `receita.ts` (linhas 244-330)

**Input Schema:**
```typescript
z.object({
  receitaId: z.string().uuid(),
  pdfBase64: z.string()
})
```

**Output:**
```typescript
{
  success: true;
  pdfUrl: string; // data:application/pdf;base64,...
}
```

**Lógica:**
1. Busca receita e valida ownership
2. Valida que receita não está assinada
3. Busca CPF do médico
4. Atualiza status para `PENDENTE_ASSINATURA`
5. Chama `vidaasService.assinarReceita()` (fluxo completo OAuth 2.0 + PKCE)
6. Se sucesso:
   - Atualiza status para `ASSINADA`
   - Salva PDF assinado em `pdfUrl`
   - Registra auditoria (`acao = ASSINADA`)
7. Se erro:
   - Reverte status para `RASCUNHO`
   - Lança erro

**Validações:**
- ✅ Médico autenticado
- ✅ Receita existe
- ✅ Médico é dono da receita
- ✅ Receita não está assinada
- ✅ Médico tem CPF cadastrado

**Erros possíveis:**
- `NOT_FOUND`: Receita não encontrada
- `FORBIDDEN`: Receita não pertence ao médico
- `BAD_REQUEST`: Receita já assinada OU CPF não cadastrado
- `INTERNAL_SERVER_ERROR`: Erro VIDaaS (timeout, certificado inválido, etc.)

**Exemplo de uso:**
```typescript
const resultado = await trpc.receita.assinarReceita.mutate({
  receitaId: "550e8400-e29b-41d4-a716-446655440000",
  pdfBase64: "JVBERi0xLjQK..." // PDF gerado pelo frontend
});

console.log(resultado.pdfUrl); // PDF assinado com ICP-Brasil
```

---

#### 5.2.7. statusAssinatura

**Tipo:** Query  
**Permissão:** medicoProcedure  
**Arquivo:** `receita.ts` (linhas 332-359)

**Input Schema:**
```typescript
z.object({
  receitaId: z.string().uuid()
})
```

**Output:**
```typescript
{
  status: ReceitaStatus;
  pdfUrl: string | null;
  assinada: boolean;
}
```

**Lógica:**
1. Busca receita por ID
2. Valida ownership
3. Retorna status atual e PDF (se assinada)

**Validações:**
- ✅ Médico autenticado
- ✅ Receita existe
- ✅ Médico é dono da receita

**Erros possíveis:**
- `NOT_FOUND`: Receita não encontrada
- `FORBIDDEN`: Receita não pertence ao médico

**Exemplo de uso (polling):**
```typescript
// Frontend usa refetchInterval para polling
const { data } = useQuery(
  trpc.receita.statusAssinatura.queryOptions(
    { receitaId: "..." },
    { refetchInterval: 2000 } // Verifica a cada 2s
  )
);

if (data?.assinada) {
  console.log("Receita assinada!", data.pdfUrl);
}
```

---

#### 5.2.8. atualizarPdfAssinado

**Tipo:** Mutation  
**Permissão:** medicoProcedure  
**Arquivo:** `receita.ts` (linhas 361-387)

**Input Schema:**
```typescript
z.object({
  receitaId: z.string().uuid(),
  pdfBase64: z.string()
})
```

**Output:**
```typescript
{ success: true }
```

**Lógica:**
1. Busca receita e valida ownership
2. Valida que receita está `ASSINADA`
3. Atualiza campo `pdfUrl` com novo PDF

**⚠️ IMPORTANTE:** Este endpoint é usado para atualizar o PDF assinado **após** a assinatura VIDaaS. Não deve ser usado para substituir a assinatura digital.

**Validações:**
- ✅ Médico autenticado
- ✅ Receita existe
- ✅ Médico é dono da receita
- ✅ Receita está assinada

**Erros possíveis:**
- `NOT_FOUND`: Receita não encontrada
- `FORBIDDEN`: Receita não pertence ao médico
- `BAD_REQUEST`: Receita não está assinada

---

#### 5.2.9. listarReceitas

**Tipo:** Query  
**Permissão:** medicoProcedure  
**Arquivo:** `receita.ts` (linhas 389-436)

**Input Schema:**
```typescript
z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(50).default(10),
  status: z.enum(["RASCUNHO", "PENDENTE_ASSINATURA", "ASSINADA", "CANCELADA"]).optional(),
  dataInicio: z.date().optional(),
  dataFim: z.date().optional(),
})
```

**Output:**
```typescript
{
  receitas: Array<{
    id: string;
    status: ReceitaStatus;
    pacienteNome: string;
    dataEmissao: Date;
    dataValidade: Date | null;
    pdfUrl: string | null;
    createdAt: Date;
  }>;
  total: number;
  pages: number;
  page: number;
}
```

**Lógica:**
1. Filtra receitas do médico autenticado
2. Aplica filtros opcionais (status, data)
3. Paginação (skip/take)
4. Retorna metadados de paginação

**Validações:**
- ✅ Médico autenticado
- ✅ Página >= 1
- ✅ Limite entre 1 e 50

**Erros possíveis:**
- Nenhum (retorna array vazio se não houver receitas)

**Exemplo de uso:**
```typescript
const resultado = await trpc.receita.listarReceitas.query({
  page: 1,
  limit: 10,
  status: "ASSINADA",
  dataInicio: new Date("2026-01-01"),
  dataFim: new Date("2026-01-31")
});

console.log(`Total: ${resultado.total}, Páginas: ${resultado.pages}`);
```

---

#### 5.2.10. buscarReceita

**Tipo:** Query  
**Permissão:** medicoProcedure  
**Arquivo:** `receita.ts` (linhas 438-466)

**Input Schema:**
```typescript
z.object({
  receitaId: z.string().uuid()
})
```

**Output:**
```typescript
Receita & {
  auditorias: ReceitaAuditoria[]; // Últimas 10 ações
}
```

**Lógica:**
1. Busca receita por ID com auditorias
2. Valida ownership
3. Retorna receita completa

**Validações:**
- ✅ Médico autenticado
- ✅ Receita existe
- ✅ Médico é dono da receita

**Erros possíveis:**
- `NOT_FOUND`: Receita não encontrada
- `FORBIDDEN`: Receita não pertence ao médico

**Exemplo de uso:**
```typescript
const receita = await trpc.receita.buscarReceita.query({
  receitaId: "550e8400-e29b-41d4-a716-446655440000"
});

console.log(receita.auditorias); // [{ acao: "ASSINADA", createdAt: ... }, ...]
```

---

#### 5.2.11. duplicarReceita

**Tipo:** Mutation  
**Permissão:** medicoProcedure  
**Arquivo:** `receita.ts` (linhas 468-516)

**Input Schema:**
```typescript
z.object({
  receitaId: z.string().uuid()
})
```

**Output:**
```typescript
Receita // Nova receita em RASCUNHO
```

**Lógica:**
1. Busca receita original
2. Valida ownership
3. Cria nova receita com:
   - Mesmos dados (paciente, produtos, posologia, alertas, observações)
   - `status = RASCUNHO`
   - Nova `dataValidade` (6 meses)
   - Novo `id`
4. Registra auditoria (`acao = DUPLICADA`)

**Validações:**
- ✅ Médico autenticado
- ✅ Receita original existe
- ✅ Médico é dono da receita original

**Erros possíveis:**
- `NOT_FOUND`: Receita original não encontrada
- `FORBIDDEN`: Receita não pertence ao médico

**Exemplo de uso:**
```typescript
const novaReceita = await trpc.receita.duplicarReceita.mutate({
  receitaId: "550e8400-e29b-41d4-a716-446655440000"
});

console.log(novaReceita.status); // "RASCUNHO"
console.log(novaReceita.id); // Novo UUID
```

---

#### 5.2.12. salvarCredenciaisVidaas

**Tipo:** Mutation  
**Permissão:** medicoProcedure  
**Arquivo:** `receita.ts` (linhas 518-541)

**Input Schema:**
```typescript
z.object({
  cpf: z.string().optional(),
  enderecoConsultorio: z.string().optional(),
  ufCrm: z.string().optional(),
})
```

**Output:**
```typescript
{ success: true }
```

**Lógica:**
1. Atualiza campos do `User` (cpf, enderecoConsultorio, ufCrm)
2. Apenas campos fornecidos são atualizados

**Validações:**
- ✅ Médico autenticado

**Erros possíveis:**
- Nenhum

**Exemplo de uso:**
```typescript
await trpc.receita.salvarCredenciaisVidaas.mutate({
  cpf: "123.456.789-00",
  enderecoConsultorio: "Rua das Flores, 123 - São Paulo/SP",
  ufCrm: "SP"
});
```

---

#### 5.2.13. validarCredenciaisVidaas

**Tipo:** Mutation  
**Permissão:** medicoProcedure  
**Arquivo:** `receita.ts` (linhas 543-581)

**Input Schema:**
```typescript
z.object({
  cpf: z.string().optional()
})
```

**Output:**
```typescript
{
  valido: boolean;
  slots: CertificateSlot[];
}
```

**Lógica:**
1. Usa CPF fornecido OU busca CPF do médico no banco
2. Chama `vidaasService.verificarCertificado(cpf)`
3. Retorna se médico possui certificado digital ativo

**Validações:**
- ✅ Médico autenticado
- ✅ CPF fornecido ou cadastrado

**Erros possíveis:**
- `BAD_REQUEST`: CPF não fornecido e não cadastrado
- `BAD_REQUEST`: Erro ao validar credenciais (VIDaaS indisponível)

**Exemplo de uso:**
```typescript
const resultado = await trpc.receita.validarCredenciaisVidaas.mutate({
  cpf: "123.456.789-00"
});

if (resultado.valido) {
  console.log("Certificado válido!", resultado.slots);
} else {
  console.log("Médico não possui certificado VIDaaS");
}
```

---

#### 5.2.14. buscarCredenciaisVidaas

**Tipo:** Query  
**Permissão:** medicoProcedure  
**Arquivo:** `receita.ts` (linhas 583-605)

**Input:** Nenhum

**Output:**
```typescript
{
  cpf: string;
  enderecoConsultorio: string;
  ufCrm: string;
  name: string;
  crm: string;
  isConfigured: boolean; // Se env vars estão configuradas
}
```

**Lógica:**
1. Busca dados do `User` (cpf, enderecoConsultorio, ufCrm)
2. Busca dados do médico no Click (name, crm)
3. Verifica se variáveis de ambiente VIDaaS estão configuradas

**Validações:**
- ✅ Médico autenticado

**Erros possíveis:**
- Nenhum (retorna strings vazias se não houver dados)

**Exemplo de uso:**
```typescript
const credenciais = await trpc.receita.buscarCredenciaisVidaas.query();

console.log(credenciais.cpf); // "123.456.789-00"
console.log(credenciais.name); // "Dr. João Silva"
console.log(credenciais.isConfigured); // true
```

---

#### 5.2.15. verificarReceita (Público)

**Tipo:** Query  
**Permissão:** publicProcedure (sem autenticação)  
**Arquivo:** `receita.ts` (linhas 607-674)

**Input Schema:**
```typescript
z.object({
  receitaId: z.string().uuid()
})
```

**Output:**
```typescript
{
  status: ReceitaStatus;
  medicoNome: string;
  medicoCrm: string; // Formato: "12345/SP"
  pacienteNome: string;
  dataEmissao: string; // ISO 8601
  dataAssinatura: string | null; // ISO 8601
  dataValidade: string | null; // ISO 8601
}
```

**Lógica:**
1. Busca receita por ID (sem validação de ownership)
2. Busca dados do médico (User + Click)
3. Busca data de assinatura (auditoria)
4. Retorna dados públicos (sem informações sensíveis)

**⚠️ IMPORTANTE:** Este endpoint é **público** e usado por farmácias/pacientes para verificar autenticidade da receita via QR Code.

**Validações:**
- ✅ Receita existe

**Erros possíveis:**
- `NOT_FOUND`: Receita não encontrada

**Exemplo de uso:**
```typescript
// Página pública: /verificar/[id]
const dados = await trpc.receita.verificarReceita.query({
  receitaId: "550e8400-e29b-41d4-a716-446655440000"
});

console.log(`Receita emitida por ${dados.medicoNome} (${dados.medicoCrm})`);
console.log(`Paciente: ${dados.pacienteNome}`);
console.log(`Status: ${dados.status}`);
```

---

## 6. Integração com Banco Click

### 6.1. Visão Geral

**Arquivo:** `packages/db/src/click-replica.ts` (1047 linhas)

O sistema se integra com o banco de dados **Click CRM** (PostgreSQL) via **replica read-only** para buscar:
- Consultas finalizadas do médico
- Dados de anamnese (JSONB)
- Produtos disponíveis para prescrição
- Métricas do médico (taxa de conversão, ticket médio)

**⚠️ IMPORTANTE:** O banco Click é **somente leitura**. Todas as escritas ocorrem no banco local (Prisma).

### 6.2. Queries SQL Utilizadas

#### 6.2.1. buscarConsultasRecentesMedico

**Arquivo:** `click-replica.ts` (linhas 850-874)

**Assinatura:**
```typescript
buscarConsultasRecentesMedico(doctorId: number, limite: number = 20)
```

**SQL:**
```sql
SELECT 
  c.id,
  c.doctor_id,
  c.user_id,
  TRIM(COALESCE(u.first_name, '') || ' ' || COALESCE(u.last_name, '')) AS patient_name,
  c.start,
  c.completed
FROM consultings c
LEFT JOIN users u ON u.id = c.user_id
WHERE c.doctor_id = $1
  AND c.user_id IS NOT NULL
  AND c.completed = TRUE
ORDER BY c.start DESC
LIMIT $2
```

**Retorno:**
```typescript
Array<{
  id: number;
  doctor_id: number;
  user_id: number | null;
  patient_name: string | null;
  start: string;
  completed: boolean;
}>
```

**Filtros aplicados:**
- `user_id IS NOT NULL` - Exclui slots vazios
- `completed = TRUE` - Apenas consultas realizadas

**Uso:** Listar consultas finalizadas para criar receita

---

#### 6.2.2. buscarDadosAnamnese

**Arquivo:** `click-replica.ts` (linhas 876-922)

**Assinatura:**
```typescript
buscarDadosAnamnese(consultingId: number)
```

**SQL:**
```sql
SELECT a.data
FROM anamnese a
WHERE a.consulting_id = $1
```

**Retorno:**
```typescript
Array<{ data: Record<string, unknown> | null }>
```

**Estrutura do campo `data` (JSONB):**
```json
[
  {
    "question": "Nome completo do paciente",
    "answer": "Maria Silva"
  },
  {
    "question": "Você possui alguma condição clínica?",
    "answer": ["Ansiedade", "Insônia"]
  },
  {
    "question": "Por que você está buscando a cannabis medicinal?",
    "answer": "Tratamento de ansiedade e melhora do sono"
  }
]
```

**Campos importantes:**
- `"Nome completo do paciente"` → string
- `"Gênero do paciente"` → string
- `"Data de nascimento"` → string (YYYY-MM-DD)
- `"Peso do paciente"` → number
- `"Altura do paciente"` → number
- `"Você possui alguma condição clínica?"` → array de strings
- `"Possui algum problema de saúde?"` → string
- `"Por que você está buscando a cannabis medicinal?"` → string

**⚠️ IMPORTANTE:** O campo `answer` pode ser string, number, boolean ou array dependendo do tipo de pergunta.

**Uso:** Preencher dados do paciente e patologias na receita

---

#### 6.2.3. buscarProdutos

**Arquivo:** `click-replica.ts` (linhas 835-848)

**Assinatura:**
```typescript
buscarProdutos()
```

**SQL:**
```sql
SELECT 
  p.id,
  p.title,
  p.formula,
  p.type,
  p.volume,
  p.price
FROM products p
WHERE p.quantity > 0
  AND p.price > 0
ORDER BY p.title ASC
```

**Retorno:**
```typescript
Array<{
  id: number;
  title: string;
  formula: string | null;
  type: string | null;
  volume: number | null;
  price: number;
}>
```

**Filtros aplicados:**
- `quantity > 0` - Apenas produtos em estoque
- `price > 0` - Apenas produtos com preço

**Uso:** Listar produtos disponíveis para prescrição

---

#### 6.2.4. getMetricasMedicoPrimeiroLead

**Arquivo:** `click-replica.ts` (linhas 325-399)

**Assinatura:**
```typescript
getMetricasMedicoPrimeiroLead(doctorId: number, semanas: number = 8)
```

**SQL (simplificado):**
```sql
WITH consultas_classificadas AS (
  SELECT 
    id, user_id, doctor_id, start, completed,
    ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY start::timestamp) AS rn
  FROM consultings
  WHERE status NOT IN ('preconsulting', 'cancelled')
    AND user_id IS NOT NULL
    AND negotiation_id IS NOT NULL
),
primeira_consulta AS (
  SELECT * FROM consultas_classificadas WHERE rn = 1
)
SELECT 
  doctor_id,
  total_consultas_realizadas,
  consultas_primeiro_paciente,
  consultas_recorrencia,
  consultas_com_receita,
  orcamentos_pagos,
  ROUND(orcamentos_pagos::numeric / consultas_com_receita, 4) AS taxa_conversao,
  ROUND(faturamento / orcamentos_pagos, 2) AS ticket_medio,
  ROUND(faturamento, 2) AS faturamento
FROM metricas
```

**Retorno:**
```typescript
{
  doctor_id: number;
  total_consultas_realizadas: number;
  consultas_primeiro_paciente: number;
  consultas_recorrencia: number;
  consultas_com_receita: number;
  orcamentos_pagos: number;
  taxa_conversao: number; // orcamentos_pagos / consultas_com_receita
  ticket_medio: number;
  faturamento: number;
}
```

**Lógica:**
1. Classifica consultas por paciente (primeira vs recorrência)
2. Conta apenas **primeiras consultas** de cada paciente
3. Calcula taxa de conversão: `orcamentos_pagos / consultas_com_receita`
4. **NÃO é** vendas / consultas (métrica incorreta)

**Uso:** Calcular score do médico para sistema de faixas (P1-P5)

---

#### 6.2.5. getTotalReceitasEnviadas

**Arquivo:** `click-replica.ts` (linhas 796-811)

**Assinatura:**
```typescript
getTotalReceitasEnviadas(dataInicio: string, dataFim: string, usarFiltroHora: boolean = false)
```

**SQL:**
```sql
SELECT COUNT(DISTINCT mp.id)::int AS total_receitas
FROM consultings c
JOIN medical_prescriptions mp ON mp.consulting_id = c.id
WHERE c.start::timestamptz AT TIME ZONE 'America/Sao_Paulo' >= $1::date
  AND c.start::timestamptz AT TIME ZONE 'America/Sao_Paulo' < ($2::date + INTERVAL '1 day')
  AND c.completed = TRUE
  AND c.status NOT IN ('preconsulting', 'cancelled')
  AND (event_id NOT LIKE 'external%' OR event_id IS NULL)
  AND (
    $3::boolean = false 
    OR (c.start::timestamptz AT TIME ZONE 'America/Sao_Paulo')::time <= (NOW() AT TIME ZONE 'America/Sao_Paulo')::time
  )
```

**Retorno:**
```typescript
{ total_receitas: number }
```

**Filtros aplicados:**
- `completed = TRUE` - Apenas consultas realizadas
- `status NOT IN ('preconsulting', 'cancelled')` - Exclui reservas e canceladas
- `event_id NOT LIKE 'external%'` - Exclui eventos externos
- `usarFiltroHora` - Se true, filtra apenas consultas até a hora atual (comparação justa)

**Uso:** Dashboard de analytics (total de receitas enviadas no período)

---

### 6.3. Typos e Gotchas do Banco Click

**⚠️ ERROS CRÍTICOS A EVITAR:**

| Campo Errado | Campo Correto | Motivo |
|--------------|---------------|--------|
| `c.scheduled_at` | `c.start::timestamptz` | Campo `scheduled_at` NÃO EXISTE |
| `JOIN patients` | `JOIN users` | Tabela `patients` NÃO EXISTE |
| `CONCAT(first_name, last_name)` | `TRIM(COALESCE(first_name,'') \|\| ' ' \|\| COALESCE(last_name,''))` | 89.4% só tem first_name |
| `status = 'rescheduled'` | `status = 'reschudeled'` | TYPO no banco: reschudeled |
| `d.speciality` correto? | `d.speciality` (com Y) | TYPO no banco: speciality |
| `d.office_hours` | `d.schedule` | Campo `office_hours` NÃO EXISTE |
| `pb.value` para faturamento | `pb.value + COALESCE(pb.delivery_value, 0)` | Incluir valor do frete |

**Documentação completa:** `docs/queries/queries-documentacao-schema-consultas.md`

---

## 7. Frontend

### 7.1. Arquitetura de Páginas

**Estrutura:**
```
apps/web/src/app/(dashboard)/dashboard/receitas/
├── page.tsx                    # Listagem de receitas
├── nova/
│   └── page.tsx                # Wizard de criação (3 steps)
├── [id]/
│   └── editar/
│       └── page.tsx            # Edição e assinatura
└── (public)/verificar/[id]/
    └── page.tsx                # Verificação pública (QR Code)
```

### 7.2. Flowchart do Wizard (3 Steps)

```mermaid
flowchart TD
    A[Médico acessa /receitas/nova] --> B[Step 1: Seleção de Consulta]
    B --> C{Consulta selecionada?}
    C -->|Não| B
    C -->|Sim| D[Step 2: Produtos e Posologia]
    D --> E{Produtos adicionados?}
    E -->|Não| D
    E -->|Sim| F[Step 3: Revisão]
    F --> G{Ação?}
    G -->|Pré-visualizar| H[Gera PDF temporário]
    H --> I[Abre PDF em nova aba]
    I --> F
    G -->|Salvar Rascunho| J[criarReceita mutation]
    J --> K[Receita salva com status=RASCUNHO]
    K --> L[Redireciona para /receitas]
    G -->|Assinar Digitalmente| M[Gera PDF final]
    M --> N[criarReceita mutation]
    N --> O[assinarReceita mutation]
    O --> P[Modal: Aguardando autorização...]
    P --> Q[Polling statusAssinatura a cada 2s]
    Q --> R{Status?}
    R -->|PENDENTE_ASSINATURA| Q
    R -->|ASSINADA| S[Fecha modal]
    S --> T[Toast: Sucesso!]
    T --> U[Redireciona para /receitas]
    R -->|Erro| V[Reverte para RASCUNHO]
    V --> W[Exibe erro]
    W --> F
```

### 7.3. Step 1: Seleção de Consulta

**Arquivo:** `apps/web/src/components/receita/wizard/Step1SelecaoConsulta.tsx` (134 linhas)

**Funcionalidade:**
- Lista consultas finalizadas do médico (`listarConsultasRecentes`)
- Permite selecionar uma consulta
- Busca dados da consulta (`buscarDadosConsulta`)
- Preenche nome do paciente automaticamente

**Validações:**
- ✅ Pelo menos uma consulta deve ser selecionada

**Código principal:**
```typescript
const { data: consultas } = useQuery(
  trpc.receita.listarConsultasRecentes.queryOptions({ limit: 20 })
);

const handleSelectConsulta = async (consultingId: number) => {
  const dados = await trpcClient.receita.buscarDadosConsulta.query({ consultingId });
  onNext(consultingId, dados.paciente.nome);
};
```

---

### 7.4. Step 2: Produtos e Posologia

**Arquivo:** `apps/web/src/components/receita/wizard/Step2Produtos.tsx` (212 linhas)

**Funcionalidade:**
- Lista produtos disponíveis (`listarProdutos`)
- Permite adicionar múltiplos produtos
- Para cada produto:
  - Nome (seleção)
  - Concentração (texto livre)
  - Quantidade (número)
  - Posologia (texto livre)
- Campo de alertas (opcional)

**Validações:**
- ✅ Pelo menos 1 produto
- ✅ Cada produto deve ter nome, quantidade e posologia

**Código principal:**
```typescript
const { data: produtos } = useQuery(
  trpc.receita.listarProdutos.queryOptions()
);

const [produtosSelecionados, setProdutosSelecionados] = useState<ProdutoItem[]>([]);

const handleAddProduto = () => {
  setProdutosSelecionados([...produtosSelecionados, {
    nome: "",
    concentracao: "",
    quantidade: 1,
    posologia: ""
  }]);
};

const handleNext = () => {
  if (produtosSelecionados.length === 0) {
    toast.error("Adicione pelo menos um produto");
    return;
  }
  onNext(produtosSelecionados, alertas);
};
```

---

### 7.5. Step 3: Revisão e Assinatura

**Arquivo:** `apps/web/src/components/receita/wizard/Step3Revisao.tsx` (381 linhas)

**Funcionalidade:**
- Exibe resumo da receita
- Permite editar nome e CPF do paciente
- 3 ações:
  1. **Pré-visualizar**: Gera PDF temporário e abre em nova aba
  2. **Salvar Rascunho**: Cria receita com `status=RASCUNHO`
  3. **Assinar Digitalmente**: Cria receita e inicia fluxo VIDaaS

**Fluxo de Assinatura:**
```mermaid
sequenceDiagram
    participant U as Usuário
    participant F as Frontend
    participant T as tRPC
    participant V as VIDaaS
    
    U->>F: Clica "Assinar Digitalmente"
    F->>F: Gera PDF (ReceitaPDF.tsx)
    F->>T: criarReceita()
    T-->>F: receitaId
    F->>T: assinarReceita(receitaId, pdfBase64)
    T->>V: Fluxo OAuth 2.0 + PKCE
    V->>U: Push notification no celular
    F->>F: Abre modal "Aguardando autorização..."
    F->>T: statusAssinatura() [polling 2s]
    U->>V: Autoriza com PIN
    V-->>T: PDF assinado
    T-->>F: status=ASSINADA
    F->>F: Fecha modal
    F->>U: Toast: "Receita assinada com sucesso!"
```

**Código principal:**
```typescript
const [showSignatureModal, setShowSignatureModal] = useState(false);
const [isPolling, setIsPolling] = useState(false);

const handleAssinar = async () => {
  setShowSignatureModal(true);
  
  // 1. Gera PDF
  const pdfBase64 = await gerarReceitaPdfBase64(receitaData);
  
  // 2. Cria receita
  const receita = await criarReceitaMutation.mutateAsync({ ... });
  setReceitaId(receita.id);
  
  // 3. Assina receita
  await assinarReceitaMutation.mutateAsync({
    receitaId: receita.id,
    pdfBase64
  });
  
  // 4. Inicia polling
  setIsPolling(true);
};

// Polling automático via useQuery
const { data: statusAssinatura } = useQuery(
  trpc.receita.statusAssinatura.queryOptions(
    { receitaId: receitaId! },
    { 
      enabled: isPolling && !!receitaId,
      refetchInterval: 2000, // A cada 2 segundos
    }
  )
);

// Detecta conclusão
useEffect(() => {
  if (statusAssinatura?.status === "ASSINADA" && receitaId) {
    setIsPolling(false);
    setShowSignatureModal(false);
    toast.success("Receita assinada com sucesso!");
    onSuccess(receitaId, statusAssinatura.pdfUrl);
  }
}, [statusAssinatura, receitaId]);
```

**Modal de Loading:**
```tsx
<Dialog open={showSignatureModal}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Assinando Receita</DialogTitle>
      <DialogDescription>
        Aguardando autorização no aplicativo VIDaaS...
      </DialogDescription>
    </DialogHeader>
    <div className="flex items-center justify-center py-8">
      <Loader2 className="h-12 w-12 animate-spin text-brand-600" />
    </div>
    <p className="text-sm text-muted-foreground text-center">
      Abra o aplicativo VIDaaS no seu celular e autorize a assinatura com seu PIN.
    </p>
  </DialogContent>
</Dialog>
```

---

### 7.6. Página de Listagem

**Arquivo:** `apps/web/src/app/(dashboard)/dashboard/receitas/page.tsx`

**Funcionalidade:**
- Lista receitas do médico com paginação
- Filtros:
  - Status (RASCUNHO, ASSINADA, etc.)
  - Data de emissão (início/fim)
- Ações por receita:
  - **Visualizar PDF** (se assinada)
  - **Editar** (se RASCUNHO)
  - **Duplicar**
  - **Assinar** (se RASCUNHO)

**Código principal:**
```typescript
const [page, setPage] = useState(1);
const [statusFilter, setStatusFilter] = useState<ReceitaStatus | undefined>();

const { data } = useQuery(
  trpc.receita.listarReceitas.queryOptions({
    page,
    limit: 10,
    status: statusFilter
  })
);

return (
  <div>
    {/* Filtros */}
    <Select value={statusFilter} onValueChange={setStatusFilter}>
      <SelectItem value="RASCUNHO">Rascunho</SelectItem>
      <SelectItem value="ASSINADA">Assinada</SelectItem>
    </Select>
    
    {/* Tabela */}
    <Table>
      {data?.receitas.map(receita => (
        <TableRow key={receita.id}>
          <TableCell>{receita.pacienteNome}</TableCell>
          <TableCell>{receita.status}</TableCell>
          <TableCell>
            {receita.status === "ASSINADA" && (
              <Button onClick={() => window.open(receita.pdfUrl)}>
                Ver PDF
              </Button>
            )}
          </TableCell>
        </TableRow>
      ))}
    </Table>
    
    {/* Paginação */}
    <Pagination
      currentPage={page}
      totalPages={data?.pages ?? 1}
      onPageChange={setPage}
    />
  </div>
);
```

---

### 7.7. Página de Edição

**Arquivo:** `apps/web/src/app/(dashboard)/dashboard/receitas/[id]/editar/page.tsx`

**Funcionalidade:**
- Busca receita por ID (`buscarReceita`)
- Permite editar apenas se `status === RASCUNHO`
- Permite assinar se `status === RASCUNHO`
- Exibe PDF se `status === ASSINADA`

**Estados:**
- **RASCUNHO**: Pode editar e assinar
- **PENDENTE_ASSINATURA**: Bloqueado (aguardando VIDaaS)
- **ASSINADA**: Bloqueado (imutável)

**Código principal:**
```typescript
const { data: receita } = useQuery(
  trpc.receita.buscarReceita.queryOptions({ receitaId: id })
);

const podeEditar = receita?.status === "RASCUNHO";
const podeAssinar = receita?.status === "RASCUNHO";

return (
  <div>
    {receita?.status === "ASSINADA" && (
      <Alert>
        <CheckCircle className="h-4 w-4" />
        <AlertTitle>Receita Assinada</AlertTitle>
        <AlertDescription>
          Esta receita foi assinada digitalmente e não pode ser editada.
        </AlertDescription>
      </Alert>
    )}
    
    <Form>
      <Input
        value={pacienteNome}
        onChange={e => setPacienteNome(e.target.value)}
        disabled={!podeEditar}
      />
      
      {podeEditar && (
        <Button onClick={handleSalvar}>Salvar Alterações</Button>
      )}
      
      {podeAssinar && (
        <Button onClick={handleAssinar}>Assinar Digitalmente</Button>
      )}
    </Form>
  </div>
);
```

---

### 7.8. Página de Verificação Pública

**Arquivo:** `apps/web/src/app/(public)/verificar/[id]/page.tsx`

**Funcionalidade:**
- Endpoint público (sem autenticação)
- Verifica autenticidade da receita via QR Code
- Exibe:
  - Status da receita
  - Nome do médico e CRM
  - Nome do paciente
  - Data de emissão e validade
  - Data de assinatura

**Código principal:**
```typescript
const { data } = useQuery(
  trpc.receita.verificarReceita.queryOptions({ receitaId: id })
);

return (
  <div className="max-w-2xl mx-auto p-6">
    <h1>Verificação de Receita Médica</h1>
    
    {data?.status === "ASSINADA" ? (
      <Alert variant="success">
        <CheckCircle className="h-4 w-4" />
        <AlertTitle>Receita Válida</AlertTitle>
        <AlertDescription>
          Esta receita foi assinada digitalmente com certificado ICP-Brasil.
        </AlertDescription>
      </Alert>
    ) : (
      <Alert variant="warning">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Receita Não Assinada</AlertTitle>
        <AlertDescription>
          Esta receita ainda não foi assinada digitalmente.
        </AlertDescription>
      </Alert>
    )}
    
    <dl>
      <dt>Médico:</dt>
      <dd>{data?.medicoNome} - CRM {data?.medicoCrm}</dd>
      
      <dt>Paciente:</dt>
      <dd>{data?.pacienteNome}</dd>
      
      <dt>Data de Emissão:</dt>
      <dd>{new Date(data?.dataEmissao).toLocaleDateString()}</dd>
      
      {data?.dataAssinatura && (
        <>
          <dt>Data de Assinatura:</dt>
          <dd>{new Date(data.dataAssinatura).toLocaleDateString()}</dd>
        </>
      )}
    </dl>
  </div>
);
```

---

## 8. Geração de PDF

### 8.1. Biblioteca: @react-pdf/renderer

**Arquivo:** `apps/web/src/components/receita/ReceitaPDF.tsx` (414 linhas)

**Biblioteca:** `@react-pdf/renderer` v3.x

**Características:**
- ✅ Componentes React → PDF
- ✅ Suporte a estilos (StyleSheet)
- ✅ Imagens (Base64)
- ✅ Fontes customizadas
- ✅ Geração client-side (navegador)

### 8.2. Estrutura do Documento

**Layout:**
```
┌─────────────────────────────────────────┐
│         RECEITA MÉDICA                  │ ← Header
├─────────────────────────────────────────┤
│ Data: 26/01/2026    Validade: 26/07/26 │ ← Info Box
├─────────────────────────────────────────┤
│ Dr. João Silva                          │
│ CRM 12345/SP                            │ ← Doctor Box
│ Rua das Flores, 123 - São Paulo/SP      │
├─────────────────────────────────────────┤
│ Paciente: Maria Silva                   │ ← Patient Box
│ CPF: 123.456.789-00                     │
├─────────────────────────────────────────┤
│                                         │
│ PRESCRIÇÃO:                             │
│                                         │
│ • Óleo CBD 3000mg (1 unidade)           │
│   3 gotas sublingual, 2x ao dia         │ ← Content Box
│                                         │
│ ALERTAS:                                │
│ Evitar dirigir após o uso               │
│                                         │
├─────────────────────────────────────────┤
│ [Badge ICP-Brasil]  [QR Code]           │ ← Footer
│ Assinado digitalmente                   │
│ verificar em: /verificar/[id]           │
└─────────────────────────────────────────┘
```

### 8.3. Código do ReceitaPDF Component

**Interface:**
```typescript
export interface ReceitaData {
  medico: {
    nome: string;
    crm: string;
    uf: string;
    endereco: string;
  };
  paciente: {
    nome: string;
    cpf?: string;
  };
  produtos: Array<{
    nome: string;
    concentracao?: string;
    quantidade: number;
    posologia: string;
  }>;
  dataEmissao: Date;
  receitaId?: string; // Para QR Code
}
```

**Componente principal:**
```tsx
export const ReceitaPDF = ({ data }: { data: ReceitaData }) => {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");
  
  useEffect(() => {
    if (data.receitaId) {
      const url = `${window.location.origin}/verificar/${data.receitaId}`;
      QRCode.toDataURL(url, { width: 200 }).then(setQrCodeDataUrl);
    }
  }, [data.receitaId]);
  
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.headerBox}>
          <Text style={styles.headerTitle}>RECEITA MÉDICA</Text>
        </View>
        
        {/* Info Box */}
        <View style={styles.infoBox}>
          <Text>Data: {format(data.dataEmissao, "dd/MM/yyyy")}</Text>
          <Text>Validade: {format(addMonths(data.dataEmissao, 6), "dd/MM/yyyy")}</Text>
        </View>
        
        {/* Doctor Box */}
        <View style={styles.doctorBox}>
          <Text style={styles.doctorName}>{data.medico.nome}</Text>
          <Text style={styles.doctorInfo}>CRM {data.medico.crm}/{data.medico.uf}</Text>
          <Text style={styles.doctorInfo}>{data.medico.endereco}</Text>
        </View>
        
        {/* Patient Box */}
        <View style={styles.patientBox}>
          <Text style={styles.patientText}>Paciente: {data.paciente.nome}</Text>
          {data.paciente.cpf && (
            <Text style={styles.patientInfo}>CPF: {data.paciente.cpf}</Text>
          )}
        </View>
        
        {/* Content Box */}
        <View style={styles.contentBox}>
          <Text style={styles.sectionTitle}>PRESCRIÇÃO:</Text>
          
          {data.produtos.map((produto, index) => (
            <View key={index} style={styles.productContainer}>
              <Text style={styles.productLine}>
                • {produto.nome}
                {produto.concentracao && ` (${produto.concentracao})`}
                {` - ${produto.quantidade} unidade${produto.quantidade > 1 ? 's' : ''}`}
              </Text>
              <Text style={styles.posologia}>{produto.posologia}</Text>
            </View>
          ))}
        </View>
        
        {/* Footer */}
        <View style={styles.footerBox}>
          <View style={styles.signatureContainer}>
            {/* Badge ICP-Brasil */}
            <View style={styles.badgeContainer}>
              <Text style={styles.badgeHeader}>DOCUMENTO ELETRÔNICO</Text>
              <Text style={styles.badgeTitle}>Assinado Digitalmente</Text>
              <View style={styles.badgeDivider} />
              <Text style={styles.badgeLegalText}>
                Certificado ICP-Brasil
              </Text>
              <Text style={styles.badgeLegalBold}>
                Validade Jurídica (MP 2.200-2/2001)
              </Text>
            </View>
            
            {/* QR Code */}
            {qrCodeDataUrl && (
              <View style={styles.qrSection}>
                <Image src={qrCodeDataUrl} style={styles.qrCode} />
                <Text style={styles.serialCode}>
                  {data.receitaId?.slice(0, 8).toUpperCase()}
                </Text>
              </View>
            )}
          </View>
        </View>
      </Page>
    </Document>
  );
};
```

### 8.4. Geração de Base64

**Função:**
```typescript
export async function gerarReceitaPdfBase64(data: ReceitaData): Promise<string> {
  const blob = await pdf(<ReceitaPDF data={data} />).toBlob();
  
  // Validar tamanho (max 7MB)
  const maxSize = 7 * 1024 * 1024; // 7MB
  if (blob.size > maxSize) {
    throw new Error(`PDF muito grande (${(blob.size / 1024 / 1024).toFixed(2)}MB). Máximo: 7MB`);
  }
  
  // Converter para Base64
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      const base64Data = base64.split(',')[1]; // Remove "data:application/pdf;base64,"
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
```

### 8.5. QR Code de Verificação

**Geração:**
```typescript
import QRCode from 'qrcode';

const url = `${window.location.origin}/verificar/${receitaId}`;
const qrCodeDataUrl = await QRCode.toDataURL(url, {
  width: 200,
  margin: 1,
  color: {
    dark: '#000000',
    light: '#FFFFFF'
  }
});

// qrCodeDataUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
```

**Uso no PDF:**
```tsx
<Image src={qrCodeDataUrl} style={styles.qrCode} />
```

### 8.6. Badge de Assinatura ICP-Brasil

**Visual:**
```
┌─────────────────────────────┐
│ DOCUMENTO ELETRÔNICO        │
│ Assinado Digitalmente       │
├─────────────────────────────┤
│ Certificado ICP-Brasil      │
│ Validade Jurídica           │
│ (MP 2.200-2/2001)           │
└─────────────────────────────┘
```

**Código:**
```tsx
<View style={styles.badgeContainer}>
  <Text style={styles.badgeHeader}>DOCUMENTO ELETRÔNICO</Text>
  <Text style={styles.badgeTitle}>Assinado Digitalmente</Text>
  <View style={styles.badgeDivider} />
  <View style={styles.badgeRow}>
    <View style={styles.badgeLegalSection}>
      <Text style={styles.badgeLegalText}>
        Certificado ICP-Brasil
      </Text>
      <Text style={styles.badgeLegalBold}>
        Validade Jurídica (MP 2.200-2/2001)
      </Text>
    </View>
  </View>
</View>
```

**Estilos:**
```typescript
badgeContainer: {
  backgroundColor: '#1e3a5f', // Azul escuro
  borderRadius: 4,
  padding: 8,
  width: 140,
},
badgeTitle: {
  fontSize: 10,
  color: '#5bc0de', // Azul claro
  fontWeight: 'bold',
},
badgeLegalText: {
  fontSize: 5,
  color: '#ffffff',
  lineHeight: 1.3,
},
```

### 8.7. Validação de Tamanho

**Limite:** 7MB (requisito VIDaaS)

**Validação:**
```typescript
const blob = await pdf(<ReceitaPDF data={data} />).toBlob();

const maxSize = 7 * 1024 * 1024; // 7MB
if (blob.size > maxSize) {
  throw new Error(
    `PDF muito grande (${(blob.size / 1024 / 1024).toFixed(2)}MB). Máximo: 7MB`
  );
}
```

**Tratamento no frontend:**
```typescript
try {
  const pdfBase64 = await gerarReceitaPdfBase64(data);
} catch (error) {
  if (error.message.includes("PDF muito grande")) {
    toast.error("PDF excede o limite de 7MB. Reduza o número de produtos.");
  } else {
    toast.error("Erro ao gerar PDF");
  }
}
```

---

## 9. Máquina de Estados

### 9.1. Diagrama de Estados

```mermaid
stateDiagram-v2
    [*] --> RASCUNHO: criarReceita()
    
    RASCUNHO --> PENDENTE_ASSINATURA: assinarReceita()
    RASCUNHO --> CANCELADA: (não implementado)
    
    PENDENTE_ASSINATURA --> ASSINADA: VIDaaS sucesso
    PENDENTE_ASSINATURA --> RASCUNHO: VIDaaS erro (recuperação)
    
    ASSINADA --> [*]
    CANCELADA --> [*]
    
    note right of RASCUNHO
      Pode editar: ✅
      Pode assinar: ✅
    end note
    
    note right of PENDENTE_ASSINATURA
      Pode editar: ❌
      Pode assinar: ❌
      Aguardando VIDaaS
    end note
    
    note right of ASSINADA
      Pode editar: ❌
      Pode assinar: ❌
      IMUTÁVEL
    end note
```

### 9.2. Estados Detalhados

#### RASCUNHO

**Descrição:** Receita criada, não assinada

**Permissões:**
- ✅ Pode editar (`atualizarReceita`)
- ✅ Pode assinar (`assinarReceita`)
- ✅ Pode duplicar (`duplicarReceita`)
- ✅ Pode visualizar

**Transições permitidas:**
- → `PENDENTE_ASSINATURA` (via `assinarReceita`)
- → `CANCELADA` (não implementado)

**Código:**
```typescript
if (receita.status === "RASCUNHO") {
  // Permitir edição
  await prisma.receita.update({
    where: { id: receitaId },
    data: { pacienteNome: "Novo Nome" }
  });
  
  // Permitir assinatura
  await assinarReceita({ receitaId, pdfBase64 });
}
```

---

#### PENDENTE_ASSINATURA

**Descrição:** Aguardando autorização do médico no app VIDaaS

**Permissões:**
- ❌ Não pode editar
- ❌ Não pode assinar novamente
- ✅ Pode visualizar status

**Transições permitidas:**
- → `ASSINADA` (VIDaaS retorna PDF assinado)
- → `RASCUNHO` (erro VIDaaS - recuperação automática)

**Duração:** Máximo 2 minutos (timeout VIDaaS)

**Código:**
```typescript
// Backend: Atualiza para PENDENTE antes de chamar VIDaaS
await prisma.receita.update({
  where: { id: receitaId },
  data: { status: "PENDENTE_ASSINATURA" }
});

try {
  const resultado = await vidaasService.assinarReceita(...);
  
  // Sucesso: PENDENTE → ASSINADA
  await prisma.receita.update({
    where: { id: receitaId },
    data: { 
      status: "ASSINADA",
      pdfUrl: `data:application/pdf;base64,${resultado.pdfAssinadoBase64}`
    }
  });
} catch (error) {
  // Erro: PENDENTE → RASCUNHO (recuperação)
  await prisma.receita.update({
    where: { id: receitaId },
    data: { status: "RASCUNHO" }
  });
  throw error;
}
```

---

#### ASSINADA

**Descrição:** PDF assinado com certificado ICP-Brasil

**Permissões:**
- ❌ Não pode editar (IMUTÁVEL)
- ❌ Não pode assinar novamente
- ✅ Pode visualizar PDF
- ✅ Pode duplicar (cria nova receita em RASCUNHO)

**Transições permitidas:**
- Nenhuma (estado final)

**Código:**
```typescript
if (receita.status === "ASSINADA") {
  // Bloquear edição
  throw new TRPCError({
    code: "BAD_REQUEST",
    message: "Receitas assinadas não podem ser editadas"
  });
}

// Permitir visualização do PDF
const pdfUrl = receita.pdfUrl; // data:application/pdf;base64,...
window.open(pdfUrl, "_blank");

// Permitir duplicação (cria nova receita)
const novaReceita = await duplicarReceita({ receitaId });
console.log(novaReceita.status); // "RASCUNHO"
```

---

#### CANCELADA

**Descrição:** Receita invalidada (não implementado)

**Permissões:**
- ❌ Não pode editar
- ❌ Não pode assinar
- ✅ Pode visualizar (histórico)

**Transições permitidas:**
- Nenhuma (estado final)

**⚠️ IMPORTANTE:** Este estado existe no enum mas não está implementado. Não há endpoint para cancelar receitas.

---

### 9.3. Validações de Transição

**Código de validação:**
```typescript
// atualizarReceita
if (receita.status === "ASSINADA") {
  throw new TRPCError({
    code: "BAD_REQUEST",
    message: "Receitas assinadas não podem ser editadas"
  });
}

// assinarReceita
if (receita.status === "ASSINADA") {
  throw new TRPCError({
    code: "BAD_REQUEST",
    message: "Receita já está assinada"
  });
}

if (receita.status === "PENDENTE_ASSINATURA") {
  throw new TRPCError({
    code: "BAD_REQUEST",
    message: "Receita já está em processo de assinatura"
  });
}
```

### 9.4. Recuperação de Erro

**Cenário:** VIDaaS falha durante assinatura

**Comportamento:**
1. Status muda para `PENDENTE_ASSINATURA`
2. VIDaaS retorna erro (timeout, certificado inválido, etc.)
3. Status reverte para `RASCUNHO` automaticamente
4. Médico pode tentar assinar novamente

**Código:**
```typescript
// packages/api/src/routers/receita.ts (linhas 318-329)
try {
  const resultado = await vidaasService.assinarReceita(...);
  // Sucesso: atualiza para ASSINADA
} catch (error) {
  // Erro: reverte para RASCUNHO
  await prisma.receita.update({
    where: { id: input.receitaId },
    data: { status: ReceitaStatus.RASCUNHO },
  });
  
  console.error("[assinarReceita] Erro VIDaaS:", error);
  throw new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: error instanceof Error ? error.message : "Erro ao assinar receita",
  });
}
```

---

## 10. Regras de Negócio

### 10.1. Validade da Receita

**Regra:** Receitas de cannabis medicinal têm validade de **6 meses** a partir da data de emissão.

**Base legal:** RDC 660/2022 (Anvisa)

**Implementação:**
```typescript
// Backend: criarReceita
const dataValidade = new Date();
dataValidade.setMonth(dataValidade.getMonth() + 6);

await prisma.receita.create({
  data: {
    dataEmissao: new Date(),
    dataValidade,
    // ...
  }
});
```

**Validação no frontend:**
```typescript
const isValida = new Date() <= new Date(receita.dataValidade);

if (!isValida) {
  return (
    <Alert variant="warning">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Receita Expirada</AlertTitle>
      <AlertDescription>
        Esta receita expirou em {format(receita.dataValidade, "dd/MM/yyyy")}.
      </AlertDescription>
    </Alert>
  );
}
```

---

### 10.2. Permissões por Role

**Sistema de permissões:** `medicoProcedure` (middleware tRPC)

**Arquivo:** `packages/api/src/middleware/permissions.ts`

**Hierarquia:**
```typescript
const PERMISSION_LEVELS = {
  super_admin: 5,
  admin: 4,
  diretor: 3,
  atendente: 2,
  medico: 1,
};
```

**medicoProcedure:**
```typescript
export const medicoProcedure = authenticatedProcedure.use(async ({ ctx, next }) => {
  if (ctx.user.tipo !== "medico") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Apenas médicos podem acessar este recurso",
    });
  }
  
  return next({
    ctx: {
      ...ctx,
      medico: ctx.user, // Garantia de tipo
    },
  });
});
```

**Uso:**
```typescript
export const receitaRouter = router({
  criarReceita: medicoProcedure // ← Apenas médicos
    .input(...)
    .mutation(async ({ ctx, input }) => {
      // ctx.medico está disponível e tipado
      const receita = await prisma.receita.create({
        data: {
          medicoId: ctx.medico.id, // ← Ownership automático
          // ...
        }
      });
    }),
});
```

---

### 10.3. Ownership Check

**Regra:** Médico só pode acessar/editar suas próprias receitas.

**Implementação:**
```typescript
// buscarReceita
const receita = await prisma.receita.findUnique({
  where: { id: input.receitaId },
});

if (!receita) {
  throw new TRPCError({
    code: "NOT_FOUND",
    message: "Receita não encontrada",
  });
}

if (receita.medicoId !== ctx.medico.id) {
  throw new TRPCError({
    code: "FORBIDDEN",
    message: "Você não tem permissão para acessar esta receita",
  });
}
```

**Validação em todas as operações:**
- ✅ `buscarReceita`
- ✅ `atualizarReceita`
- ✅ `assinarReceita`
- ✅ `duplicarReceita`
- ✅ `statusAssinatura`

**Exceção:** `verificarReceita` (público - sem ownership check)

---

### 10.4. Restrições de Edição

**Regra:** Receitas assinadas são **imutáveis**.

**Validação:**
```typescript
// atualizarReceita
if (receita.status === ReceitaStatus.ASSINADA) {
  throw new TRPCError({
    code: "BAD_REQUEST",
    message: "Receitas assinadas não podem ser editadas",
  });
}
```

**Motivo:** Assinatura digital ICP-Brasil garante integridade do documento. Qualquer alteração invalida a assinatura.

**Alternativa:** Duplicar receita (cria nova em RASCUNHO)

---

### 10.5. Auditoria

**Regra:** Todas as ações importantes são registradas na tabela `receita_auditoria`.

**Ações registradas:**
- `CRIADA` - Receita criada em RASCUNHO
- `ATUALIZADA` - Receita editada
- `ASSINADA` - Assinatura digital concluída
- `DUPLICADA` - Receita duplicada

**Implementação:**
```typescript
// Após criar receita
await prisma.receitaAuditoria.create({
  data: {
    receitaId: receita.id,
    acao: "CRIADA",
    medicoId: ctx.medico.id,
  },
});

// Após assinar receita
await prisma.receitaAuditoria.create({
  data: {
    receitaId: input.receitaId,
    acao: "ASSINADA",
    medicoId: ctx.medico.id,
  },
});
```

**Consulta de auditoria:**
```typescript
const receita = await prisma.receita.findUnique({
  where: { id: receitaId },
  include: {
    auditorias: {
      orderBy: { createdAt: "desc" },
      take: 10,
    },
  },
});

console.log(receita.auditorias);
// [
//   { acao: "ASSINADA", createdAt: "2026-01-26T10:35:00Z" },
//   { acao: "CRIADA", createdAt: "2026-01-26T10:30:00Z" }
// ]
```

---

### 10.6. Campos Obrigatórios (RDC 660/2022)

**Regra:** Receitas de cannabis medicinal devem conter 6 elementos obrigatórios.

**Campos:**
1. ✅ Nome do paciente (`pacienteNome`)
2. ✅ Nome do produto + concentração + apresentação (`produtos[].nome`, `produtos[].concentracao`)
3. ✅ Posologia (dose + frequência + via) (`produtos[].posologia`)
4. ✅ Data de emissão (`dataEmissao`)
5. ✅ Assinatura digital (`pdfUrl` com ICP-Brasil)
6. ✅ Registro profissional (CRM + UF) (buscado do banco Click)

**Validação Zod:**
```typescript
z.object({
  pacienteNome: z.string().min(1), // 1. Nome do paciente
  produtos: z.array(
    z.object({
      nome: z.string().min(1), // 2. Nome do produto
      concentracao: z.string().optional(), // 2. Concentração
      posologia: z.string().min(1), // 3. Posologia
    })
  ).min(1),
  // 4. Data de emissão (gerada automaticamente)
  // 5. Assinatura (via VIDaaS)
  // 6. CRM (buscado do banco Click)
})
```

---

## 11. Error Handling

### 11.1. Erros VIDaaS

**Classe base:** `VidaasError`

**Arquivo:** `packages/api/src/services/vidaas.service.ts` (linhas 63-137)

#### 11.1.1. VidaasAuthError (401)

**Causa:** Token inválido ou expirado

**Tratamento:**
```typescript
catch (error) {
  if (error instanceof VidaasAuthError) {
    toast.error("Sessão VIDaaS expirada. Tente novamente.");
  }
}
```

---

#### 11.1.2. VidaasTimeoutError (408)

**Causa:** Médico não autorizou assinatura em 2 minutos

**Tratamento:**
```typescript
catch (error) {
  if (error instanceof VidaasTimeoutError) {
    toast.error(
      "Tempo esgotado. Você não autorizou a assinatura no aplicativo VIDaaS.",
      { duration: 5000 }
    );
  }
}
```

---

#### 11.1.3. VidaasRateLimitError (429)

**Causa:** Muitas requisições em curto período

**Tratamento:**
```typescript
catch (error) {
  if (error instanceof VidaasRateLimitError) {
    const retryAfter = error.retryAfter ?? 60;
    toast.error(
      `Limite de requisições excedido. Tente novamente em ${retryAfter}s.`
    );
  }
}
```

---

#### 11.1.4. VidaasServiceUnavailableError (503)

**Causa:** Serviço VIDaaS temporariamente indisponível

**Tratamento:**
```typescript
catch (error) {
  if (error instanceof VidaasServiceUnavailableError) {
    toast.error(
      "Serviço de assinatura digital temporariamente indisponível. Tente novamente em alguns minutos."
    );
  }
}
```

---

### 11.2. Erros tRPC

#### 11.2.1. UNAUTHORIZED

**Causa:** Usuário não autenticado

**Tratamento:**
```typescript
if (error.code === "UNAUTHORIZED") {
  router.push("/login");
}
```

---

#### 11.2.2. FORBIDDEN

**Causa:** Usuário autenticado mas sem permissão

**Exemplos:**
- Não é médico (medicoProcedure)
- Tentou acessar receita de outro médico (ownership check)

**Tratamento:**
```typescript
if (error.code === "FORBIDDEN") {
  toast.error("Você não tem permissão para realizar esta ação.");
}
```

---

#### 11.2.3. NOT_FOUND

**Causa:** Recurso não encontrado

**Exemplos:**
- Receita não existe
- Consulta não encontrada

**Tratamento:**
```typescript
if (error.code === "NOT_FOUND") {
  toast.error("Receita não encontrada.");
  router.push("/receitas");
}
```

---

#### 11.2.4. BAD_REQUEST

**Causa:** Validação falhou

**Exemplos:**
- CPF não cadastrado
- Receita já assinada
- PDF muito grande (> 7MB)

**Tratamento:**
```typescript
if (error.code === "BAD_REQUEST") {
  toast.error(error.message); // Mensagem específica do backend
}
```

---

### 11.3. Erros de Frontend

#### 11.3.1. Validação de Formulário

**Causa:** Campos obrigatórios não preenchidos

**Tratamento:**
```typescript
const handleNext = () => {
  if (!pacienteNome) {
    toast.error("Nome do paciente é obrigatório");
    return;
  }
  
  if (produtos.length === 0) {
    toast.error("Adicione pelo menos um produto");
    return;
  }
  
  onNext();
};
```

---

#### 11.3.2. Timeout de Assinatura

**Causa:** Polling excedeu 2 minutos

**Tratamento:**
```typescript
useEffect(() => {
  if (isPolling) {
    const timeout = setTimeout(() => {
      setIsPolling(false);
      setShowSignatureModal(false);
      toast.error(
        "Tempo esgotado. A assinatura não foi concluída.",
        { duration: 5000 }
      );
    }, 120000); // 2 minutos
    
    return () => clearTimeout(timeout);
  }
}, [isPolling]);
```

---

### 11.4. Logs e Debugging

**Backend (VIDaaS):**
```typescript
console.log(`[VIDaaS] Iniciando assinatura da receita ${receitaId}`);
console.log(`[VIDaaS] 1/5 Verificando certificado...`);
console.log(`[VIDaaS] 1/5 Certificado verificado ✓`);
console.log(`[VIDaaS] 2/5 Enviando push notification...`);
console.log(`[VIDaaS] 2/5 Push enviado ✓ (code: ${code.slice(0, 20)}...)`);
console.log(`[VIDaaS] 3/5 Aguardando autorização do médico...`);
console.log(`[VIDaaS] 3/5 Autorização recebida ✓`);
console.log(`[VIDaaS] 4/5 Obtendo access token...`);
console.log(`[VIDaaS] 4/5 Token obtido ✓`);
console.log(`[VIDaaS] 5/5 Assinando PDF...`);
console.log(`[VIDaaS] 5/5 PDF assinado ✓`);
console.log(`[VIDaaS] Assinatura concluída com sucesso!`);
```

**Frontend (Polling):**
```typescript
console.log(`[Polling] Iniciando polling para receita ${receitaId}`);
console.log(`[Polling] Status: ${statusAssinatura?.status}`);
console.log(`[Polling] Assinatura concluída!`);
```

---

## 12. Casos de Uso

### 12.1. Criar Nova Receita (Wizard Completo)

**Ator:** Médico

**Pré-condições:**
- Médico autenticado
- Médico tem `clickDoctorId` cadastrado
- Médico realizou pelo menos uma consulta

**Fluxo:**

1. **Médico acessa** `/receitas/nova`
2. **Step 1: Seleção de Consulta**
   - Sistema lista consultas finalizadas (`listarConsultasRecentes`)
   - Médico seleciona uma consulta
   - Sistema busca dados da consulta (`buscarDadosConsulta`)
   - Sistema preenche nome do paciente automaticamente
3. **Step 2: Produtos e Posologia**
   - Sistema lista produtos disponíveis (`listarProdutos`)
   - Médico adiciona produtos:
     - Seleciona produto
     - Informa concentração (opcional)
     - Informa quantidade
     - Informa posologia
   - Médico adiciona alertas (opcional)
4. **Step 3: Revisão**
   - Sistema exibe resumo da receita
   - Médico revisa dados
   - Médico pode editar nome e CPF do paciente
   - Médico escolhe ação:
     - **Pré-visualizar**: Sistema gera PDF temporário e abre em nova aba
     - **Salvar Rascunho**: Sistema cria receita com `status=RASCUNHO` e redireciona para `/receitas`
     - **Assinar Digitalmente**: Continua para fluxo de assinatura

**Pós-condições:**
- Receita criada no banco local
- Auditoria registrada (`acao=CRIADA`)

---

### 12.2. Editar Receita Rascunho

**Ator:** Médico

**Pré-condições:**
- Receita existe
- Receita pertence ao médico
- `status === RASCUNHO`

**Fluxo:**

1. **Médico acessa** `/receitas/[id]/editar`
2. **Sistema busca receita** (`buscarReceita`)
3. **Sistema valida:**
   - Receita existe
   - Médico é dono da receita
   - Status é RASCUNHO
4. **Médico edita campos:**
   - Nome do paciente
   - CPF do paciente
   - Produtos (adicionar/remover/editar)
   - Posologia
   - Alertas
   - Observações
5. **Médico clica "Salvar Alterações"**
6. **Sistema atualiza receita** (`atualizarReceita`)
7. **Sistema registra auditoria** (`acao=ATUALIZADA`)
8. **Sistema exibe toast:** "Receita atualizada com sucesso!"

**Pós-condições:**
- Receita atualizada no banco
- Auditoria registrada

**Fluxo alternativo (receita assinada):**
- Sistema exibe alerta: "Receitas assinadas não podem ser editadas"
- Campos ficam desabilitados
- Botão "Salvar" não é exibido

---

### 12.3. Assinar Receita (Fluxo VIDaaS)

**Ator:** Médico

**Pré-condições:**
- Receita existe
- Receita pertence ao médico
- `status === RASCUNHO`
- Médico tem CPF cadastrado
- Médico possui certificado VIDaaS ativo

**Fluxo:**

1. **Médico clica "Assinar Digitalmente"**
2. **Sistema gera PDF** (`gerarReceitaPdfBase64`)
3. **Sistema valida tamanho** (max 7MB)
4. **Sistema cria receita** (se ainda não existe) (`criarReceita`)
5. **Sistema atualiza status** para `PENDENTE_ASSINATURA`
6. **Sistema abre modal:** "Aguardando autorização..."
7. **Sistema inicia fluxo VIDaaS:**
   - Verifica certificado (`verificarCertificado`)
   - Solicita autorização push (`solicitarAutorizacaoPush`)
   - VIDaaS envia push notification para celular do médico
8. **Médico abre app VIDaaS no celular**
9. **Médico digita PIN**
10. **Médico autoriza assinatura**
11. **Sistema aguarda autorização** (`aguardarAutorizacao` - polling 1s)
12. **Sistema obtém access token** (`obterAccessToken`)
13. **Sistema assina PDF** (`assinarPdf`)
14. **Sistema atualiza receita:**
    - `status = ASSINADA`
    - `pdfUrl = PDF assinado (Base64)`
15. **Sistema registra auditoria** (`acao=ASSINADA`)
16. **Sistema fecha modal**
17. **Sistema exibe toast:** "Receita assinada com sucesso!"
18. **Sistema redireciona** para `/receitas`

**Pós-condições:**
- Receita assinada com ICP-Brasil
- PDF assinado salvo no banco
- Auditoria registrada

**Fluxos alternativos:**

**A1: CPF não cadastrado**
- Sistema exibe erro: "CPF do médico não cadastrado. Configure seu CPF nas configurações."
- Médico é redirecionado para `/configuracoes`

**A2: Certificado VIDaaS não encontrado**
- Sistema exibe erro: "Você não possui certificado digital VIDaaS ativo"
- Sistema sugere: "Entre em contato com o suporte para ativar seu certificado"

**A3: Timeout (2 minutos)**
- Sistema fecha modal
- Sistema reverte status para `RASCUNHO`
- Sistema exibe erro: "Tempo esgotado. Você não autorizou a assinatura no aplicativo VIDaaS."

**A4: Erro VIDaaS (503, 500, etc.)**
- Sistema fecha modal
- Sistema reverte status para `RASCUNHO`
- Sistema exibe erro: "Erro ao assinar receita. Tente novamente em alguns minutos."

---

### 12.4. Duplicar Receita

**Ator:** Médico

**Pré-condições:**
- Receita existe
- Receita pertence ao médico

**Fluxo:**

1. **Médico acessa** `/receitas`
2. **Médico clica "Duplicar"** em uma receita
3. **Sistema busca receita original** (`buscarReceita`)
4. **Sistema valida ownership**
5. **Sistema cria nova receita:**
   - Copia todos os dados (paciente, produtos, posologia, alertas, observações)
   - `status = RASCUNHO`
   - Nova `dataValidade` (6 meses)
   - Novo `id` (UUID)
6. **Sistema registra auditoria** (`acao=DUPLICADA`)
7. **Sistema exibe toast:** "Receita duplicada com sucesso!"
8. **Sistema redireciona** para `/receitas/[novoId]/editar`

**Pós-condições:**
- Nova receita criada em RASCUNHO
- Receita original permanece inalterada
- Auditoria registrada

**Uso:** Prescrever mesmos produtos para o mesmo paciente (renovação de receita)

---

### 12.5. Verificar Receita (Farmácia/Paciente)

**Ator:** Farmácia ou Paciente (público)

**Pré-condições:**
- Receita existe
- Receita foi assinada

**Fluxo:**

1. **Usuário escaneia QR Code** da receita
2. **Sistema abre** `/verificar/[id]` (página pública)
3. **Sistema busca receita** (`verificarReceita` - sem autenticação)
4. **Sistema exibe:**
   - Status da receita
   - Nome do médico e CRM
   - Nome do paciente
   - Data de emissão
   - Data de assinatura
   - Data de validade
5. **Sistema exibe badge:**
   - ✅ "Receita Válida" (se assinada)
   - ⚠️ "Receita Não Assinada" (se rascunho)

**Pós-condições:**
- Nenhuma (operação somente leitura)

**Uso:** Farmácias validam autenticidade da receita antes de dispensar medicamento

---

### 12.6. Configurar Credenciais VIDaaS

**Ator:** Médico

**Pré-condições:**
- Médico autenticado

**Fluxo:**

1. **Médico acessa** `/configuracoes`
2. **Sistema busca credenciais** (`buscarCredenciaisVidaas`)
3. **Sistema exibe formulário:**
   - CPF (obrigatório para assinar)
   - Endereço do consultório (aparece no PDF)
   - UF do CRM
4. **Médico preenche campos**
5. **Médico clica "Validar Certificado"**
6. **Sistema valida certificado** (`validarCredenciaisVidaas`)
7. **Sistema exibe resultado:**
   - ✅ "Certificado válido!" (se possui)
   - ❌ "Certificado não encontrado" (se não possui)
8. **Médico clica "Salvar"**
9. **Sistema salva credenciais** (`salvarCredenciaisVidaas`)
10. **Sistema exibe toast:** "Credenciais salvas com sucesso!"

**Pós-condições:**
- CPF e endereço salvos no banco
- Médico pode assinar receitas

---

## 13. Glossário

### Termos Técnicos

**ICP-Brasil**  
Infraestrutura de Chaves Públicas Brasileira. Sistema de certificação digital do governo brasileiro que garante validade jurídica a documentos eletrônicos.

**PAdES (PDF Advanced Electronic Signature)**  
Padrão europeu para assinatura digital de documentos PDF. Garante integridade, autenticidade e não-repúdio.

**PAdES_AD_RT**  
Variante do PAdES que inclui timestamp (carimbo de tempo) para comprovar quando o documento foi assinado.

**PKCE (Proof Key for Code Exchange)**  
Extensão do OAuth 2.0 que adiciona segurança contra ataques de interceptação de código. Usa `code_verifier` e `code_challenge`.

**e-CPF A3**  
Certificado digital de pessoa física com validade de 1 a 3 anos, armazenado em nuvem (VIDaaS) ou token físico.

**VIDaaS (VALID ID as a Service)**  
Prestador de Serviço de Confiança (PSC) da VALID que oferece certificados digitais em nuvem e assinatura digital via API.

**PSC (Prestador de Serviço de Confiança)**  
Entidade credenciada pela ICP-Brasil para emitir certificados digitais e realizar assinaturas eletrônicas.

**OAuth 2.0**  
Protocolo de autorização que permite aplicações acessarem recursos protegidos sem expor credenciais do usuário.

**tRPC**  
Framework TypeScript para criar APIs type-safe end-to-end. Elimina necessidade de gerar tipos manualmente.

**Prisma**  
ORM (Object-Relational Mapping) TypeScript-first para Node.js. Gera cliente type-safe a partir do schema.

**medicoProcedure**  
Middleware tRPC que valida se usuário autenticado é médico. Garante que apenas médicos acessem endpoints de receita.

---

### Termos de Negócio

**Anamnese**  
Questionário médico preenchido pelo paciente antes da consulta. Contém histórico de saúde, patologias, medicamentos em uso, etc.

**Posologia**  
Instruções de uso do medicamento: dose, frequência, via de administração, duração do tratamento.

**Concentração**  
Quantidade de princípio ativo no produto. Ex: "3000mg CBD", "10% THC".

**Apresentação**  
Forma farmacêutica do produto. Ex: "Óleo sublingual 30ml", "Cápsula 30 unidades".

**RDC 660/2022**  
Resolução da Anvisa que regulamenta importação de produtos à base de cannabis para uso medicinal.

**Anvisa**  
Agência Nacional de Vigilância Sanitária. Órgão regulador de medicamentos no Brasil.

**Receita Médica**  
Documento legal que autoriza paciente a adquirir medicamento controlado. Deve conter prescrição, assinatura do médico e CRM.

**Taxa de Conversão**  
Métrica de negócio: `orçamentos_pagos / consultas_com_receita`. Mede quantas receitas geraram venda.

**Ticket Médio**  
Valor médio de venda: `faturamento / orçamentos_pagos`.

**Primeiro Lead**  
Primeira consulta de um paciente com determinado médico. Usado para calcular score (exclui recorrência).

---

### Termos do Sistema

**RASCUNHO**  
Estado inicial da receita. Pode ser editada e assinada.

**PENDENTE_ASSINATURA**  
Estado temporário durante fluxo VIDaaS. Aguardando autorização do médico.

**ASSINADA**  
Estado final. Receita assinada com ICP-Brasil. Imutável.

**CANCELADA**  
Estado final (não implementado). Receita invalidada.

**Ownership Check**  
Validação que garante que médico só acessa suas próprias receitas (`medicoId === ctx.medico.id`).

**Polling**  
Técnica de verificar status periodicamente. Frontend consulta `statusAssinatura` a cada 2 segundos.

**QR Code**  
Código de barras 2D que contém URL de verificação da receita. Escaneado por farmácias.

**Base64**  
Codificação que converte dados binários (PDF) em texto ASCII. Usado para armazenar PDF no banco.

**Click CRM**  
Sistema legado de telemedicina onde ocorrem as consultas. ClickMedicos se integra via replica read-only.

**Replica Read-Only**  
Cópia do banco de dados Click que permite apenas leitura. Evita impacto no sistema de produção.

---

## 14. Referências

### Documentação Oficial

**RDC 660/2022 (Anvisa)**  
Resolução que regulamenta importação de cannabis medicinal  
https://www.in.gov.br/en/web/dou/-/resolucao-de-diretoria-colegiada-rdc-n-660-de-30-de-marco-de-2022-389908954

**MP 2.200-2/2001 (ICP-Brasil)**  
Medida Provisória que institui a Infraestrutura de Chaves Públicas Brasileira  
http://www.planalto.gov.br/ccivil_03/mpv/antigas_2001/2200-2.htm

**Resolução CFM nº 2.299/2021**  
Regulamenta telemedicina e prescrição eletrônica  
https://www.in.gov.br/en/web/dou/-/resolucao-cfm-n-2.299-de-9-de-fevereiro-de-2021-303869192

**Documentação VIDaaS**  
Arquivo local: `docs/criacaoreceitamedica/documentacao_integracao_click_vidaas.md`

**OAuth 2.0 RFC 6749**  
https://datatracker.ietf.org/doc/html/rfc6749

**PKCE RFC 7636**  
https://datatracker.ietf.org/doc/html/rfc7636

---

### Bibliotecas e Frameworks

**Next.js 15**  
https://nextjs.org/docs

**tRPC 11**  
https://trpc.io/docs

**Prisma 5**  
https://www.prisma.io/docs

**@react-pdf/renderer**  
https://react-pdf.org/

**Better Auth**  
https://www.better-auth.com/docs

**Tailwind CSS**  
https://tailwindcss.com/docs

**Radix UI**  
https://www.radix-ui.com/primitives/docs/overview/introduction

**QRCode**  
https://github.com/soldair/node-qrcode

---

### Arquivos do Projeto

**Backend:**
- `packages/api/src/routers/receita.ts` - Router tRPC (15 endpoints)
- `packages/api/src/services/vidaas.service.ts` - Integração VIDaaS
- `packages/api/src/middleware/permissions.ts` - Sistema de permissões
- `packages/db/src/click-replica.ts` - Queries SQL Click

**Frontend:**
- `apps/web/src/components/receita/ReceitaPDF.tsx` - Geração de PDF
- `apps/web/src/components/receita/wizard/Step1SelecaoConsulta.tsx` - Step 1
- `apps/web/src/components/receita/wizard/Step2Produtos.tsx` - Step 2
- `apps/web/src/components/receita/wizard/Step3Revisao.tsx` - Step 3
- `apps/web/src/app/(dashboard)/dashboard/receitas/page.tsx` - Listagem
- `apps/web/src/app/(dashboard)/dashboard/receitas/nova/page.tsx` - Wizard
- `apps/web/src/app/(dashboard)/dashboard/receitas/[id]/editar/page.tsx` - Edição
- `apps/web/src/app/(public)/verificar/[id]/page.tsx` - Verificação pública

**Database:**
- `packages/db/prisma/schema/app.prisma` - Models (Receita, ReceitaAuditoria, VidaasCredentials)
- `packages/db/prisma/schema/auth.prisma` - Model User

**Documentação:**
- `docs/criacaoreceitamedica/documentacao_integracao_click_vidaas.md` - Doc VIDaaS completa
- `docs/criacaoreceitamedica/Receita- dados importantes.md` - Requisitos legais
- `docs/queries/queries-documentacao-schema-consultas.md` - Schema Click
- `docs/queries/respostas-perguntas-bancodadosclick.md` - Regras de negócio Click
- `docs/FRONTEND_GUIDELINES.md` - Design System
- `CLAUDE.md` - Guia para desenvolvedores

---

### Repositório

**GitHub:** (URL do repositório - não fornecido)

**Estrutura:**
```
clickmedicos/
├── apps/web/              # Frontend Next.js
├── packages/
│   ├── api/               # tRPC routers
│   ├── auth/              # Better Auth
│   └── db/                # Prisma + Click replica
└── docs/                  # Documentação
    ├── criacaoreceitamedica/
    ├── queries/
    └── rightlogic/        # 🎯 ESTE ARQUIVO
```

---

## 📊 Status da Documentação

**Seções Completas:**
- ✅ 1. Visão Geral
- ✅ 2. Arquitetura do Sistema
- ✅ 3. Modelo de Dados
- ✅ 4. Integração VIDaaS (Assinatura Digital)
- ✅ 5. Backend: tRPC Router
- ✅ 6. Integração com Banco Click
- ✅ 7. Frontend
- ✅ 8. Geração de PDF
- ✅ 9. Máquina de Estados
- ✅ 10. Regras de Negócio
- ✅ 11. Error Handling
- ✅ 12. Casos de Uso
- ✅ 13. Glossário
- ✅ 14. Referências

**Documentação 100% completa!**

---

**Última atualização:** 26/01/2026  
**Versão:** 2.0 (Completa)  
**Autor:** Equipe ClickMedicos  
**Revisor:** Atlas (OhMyClaude Code)
