# Guia de Implementação: Integração CFM
## Código e Referências Técnicas

**Versão:** 1.0  
**Data:** Janeiro/2026  
**Complemento ao:** Documento de Diagnóstico e Plano de Ação

---

## 1. Instalação da Biblioteca

### 1.1 Instalar dependência

```bash
npm install @conselho-federal-de-medicina/integracao-prescricao-cfm
```

### 1.2 Imports necessários

```typescript
import {
  CfmAmbiente,
  CfmIntegracaoPrescricao,
  CfmLocalAtendimento,
  CfmMedicamento,
  CfmPaciente,
  CfmPrescricao,
  CfmRequestMessage,
  CfmTipoDocumento,
} from "@conselho-federal-de-medicina/integracao-prescricao-cfm";
```

---

## 2. Ambientes Disponíveis

| Ambiente | Enum | Uso | Credenciais |
|----------|------|-----|-------------|
| Simulação | `CfmAmbiente.SIMULACAO` | Desenvolvimento com mock | Não precisa |
| Homologação | `CfmAmbiente.HOMOLOGACAO` | Testes com API real | Solicitar ao CFM |
| Produção | `CfmAmbiente.PRODUCAO` | Uso em produção | Solicitar ao CFM |

### Inicializar integração

```typescript
// Desenvolvimento (sem credenciais)
const integracao = new CfmIntegracaoPrescricao(CfmAmbiente.SIMULACAO);

// Homologação (com credenciais)
const integracao = new CfmIntegracaoPrescricao(CfmAmbiente.HOMOLOGACAO);

// Produção
const integracao = new CfmIntegracaoPrescricao(CfmAmbiente.PRODUCAO);
```

---

## 3. Obter Token de Acesso (Backend)

### 3.1 Variáveis de ambiente necessárias

```env
# .env
CFM_IAM_URL=https://iam.cfm.org.br/oauth/token
CFM_CLIENT_ID=seu_client_id_aqui
CFM_CLIENT_SECRET=seu_client_secret_aqui
```

### 3.2 Endpoint para obter token

```typescript
// Exemplo com Express/Node.js
app.get('/api/cfm/token', async (req, res) => {
  // IMPORTANTE: Reutilizar token enquanto válido!
  // NÃO solicitar novo token a cada requisição (CFM bloqueará)
  
  if (tokenCache && tokenCache.expiresAt > Date.now()) {
    return res.json({ accessToken: tokenCache.accessToken });
  }

  try {
    const response = await axios.post(
      process.env.CFM_IAM_URL,
      new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: process.env.CFM_CLIENT_ID,
        client_secret: process.env.CFM_CLIENT_SECRET,
        scope: 'openid'
      }),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }
    );

    // Cachear token (com margem de 5 minutos antes de expirar)
    tokenCache = {
      accessToken: response.data.access_token,
      expiresAt: Date.now() + (response.data.expires_in - 300) * 1000
    };

    res.json({ accessToken: tokenCache.accessToken });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao obter token CFM' });
  }
});
```

### 3.3 ⚠️ ALERTA IMPORTANTE

```
╔════════════════════════════════════════════════════════════════╗
║  NÃO SOLICITAR TOKEN A CADA REQUISIÇÃO!                        ║
║                                                                 ║
║  O CFM implementa rate limiting e BLOQUEARÁ seu sistema        ║
║  se você solicitar tokens em excesso.                          ║
║                                                                 ║
║  CORRETO: Cachear token e reutilizar até expirar               ║
║  ERRADO: Solicitar novo token para cada receita                ║
╚════════════════════════════════════════════════════════════════╝
```

---

## 4. Fluxo de Criação de Prescrição

### 4.1 Criar iframe no frontend

```typescript
// 1. Criar instância da integração
const integracao = new CfmIntegracaoPrescricao(CfmAmbiente.HOMOLOGACAO);

// 2. Criar iframe (passando tipo de documento e ID do container)
await integracao.criarIframe(
  CfmTipoDocumento.RELATORIO_MEDICO,  // ou RECEITA_SIMPLES, etc.
  'container-iframe-cfm'              // ID do elemento HTML
);
```

### 4.2 Preparar dados da prescrição

```typescript
// Local de atendimento
const localAtendimento = new CfmLocalAtendimento(
  'Clínica Click Cannabis',           // nome
  'Rua Exemplo, 123, São Paulo - SP', // endereço
  '1234567'                           // CNES (opcional)
);

// Paciente
const paciente = new CfmPaciente(
  'Wagner Gomes Pires',    // nome
  '123.456.789-00',        // CPF (opcional para RDC 660)
  '1980-01-15'             // data nascimento (opcional)
);

// Medicamentos
const medicamentos = [
  new CfmMedicamento(
    'Canna River - Tincture Classic - Full Spectrum', // nome
    '6.000mg CBD - 60ml',                              // concentração
    'Tomar 2 gotas após café da manhã e 2 gotas após jantar, sublingual',
    3,                                                  // quantidade
    'Frascos'                                          // unidade
  ),
  new CfmMedicamento(
    'cbdMD - Delta 9 gummies',
    '10mg THC por gummy - 20 gummies',
    'Comer ¼ gummie 1x ao dia, preferencialmente à noite',
    3,
    'Potes'
  )
];

// Criar prescrição
const prescricao = new CfmPrescricao(
  localAtendimento,
  paciente,
  medicamentos
);
```

### 4.3 Enviar para assinatura

```typescript
// Obter token do backend
const { accessToken } = await fetch('/api/cfm/token').then(r => r.json());

// Criar mensagem de requisição
const requisicao = new CfmRequestMessage(accessToken, prescricao);

// Enviar prescrição
const resposta = await integracao.enviarPrescricao(requisicao);

// Resultado
console.log(resposta.urlDocumento);  // URL do PDF assinado no CFM
console.log(resposta.codigoValidacao); // CFMxxxxxxx
```

---

## 5. Tipos de Documento

| Enum | Uso | Observação |
|------|-----|------------|
| `CfmTipoDocumento.RECEITA_SIMPLES` | Receita comum | CBD puro |
| `CfmTipoDocumento.RECEITA_CONTROLE_ESPECIAL` | Controlados (C1, C5) | Produtos com THC |
| `CfmTipoDocumento.RECEITA_ANTIMICROBIANO` | Antimicrobianos | Não aplicável cannabis |
| `CfmTipoDocumento.RELATORIO_MEDICO` | Relatório médico | **Mais usado para cannabis** |
| `CfmTipoDocumento.ATESTADO_MEDICO` | Atestado | Se necessário |
| `CfmTipoDocumento.SOLICITACAO_EXAMES` | Exames | Se necessário |

**Para cannabis medicinal:** Usar `RELATORIO_MEDICO` (mais comum para importação via RDC 660) ou `RECEITA_CONTROLE_ESPECIAL` (para produtos com THC).

---

## 6. Estrutura de Resposta

### 6.1 Resposta de sucesso

```typescript
interface RespostaCfm {
  urlDocumento: string;      // URL do PDF no servidor CFM
  codigoValidacao: string;   // Ex: "CFMQs5QFKf"
  dataAssinatura: string;    // ISO 8601
  certificateAlias: string;  // Nome no certificado
  pdfBase64?: string;        // PDF em Base64 (se disponível)
}
```

### 6.2 Exemplo de uso da resposta

```typescript
const resposta = await integracao.enviarPrescricao(requisicao);

// Salvar no banco de dados
await prisma.receita.update({
  where: { id: receitaId },
  data: {
    status: 'ASSINADA',
    codigoCfm: resposta.codigoValidacao,
    urlDocumentoCfm: resposta.urlDocumento,
    dataAssinatura: new Date(resposta.dataAssinatura),
  }
});
```

---

## 7. PSCs Suportados (Certillion)

O CFM usa o **Certillion** como hub de assinatura, que conecta com todos estes PSCs:

| PSC | Descrição |
|-----|-----------|
| `VIDAAS` | Valid (mais comum entre médicos) |
| `BIRDID` | Digital Identity |
| `SAFEID` | Safeweb |
| `NEOID` | Serpro |
| `REMOTEID` | Certisign |
| `VAULTID` | VaultID |
| `DSCLOUD` | DigitalSign |
| `CERTILLION_SIGNER` | Assinador local |

**O médico não precisa ter VIDaaS especificamente.** Se tiver certificado em qualquer um desses PSCs, funcionará.

---

## 8. Links Úteis

### 8.1 CFM - Prescrição Eletrônica

| Recurso | URL |
|---------|-----|
| **Biblioteca NPM** | https://www.npmjs.com/package/@conselho-federal-de-medicina/integracao-prescricao-cfm |
| **Prescrição Eletrônica** | https://prescricaoeletronica.cfm.org.br |
| **Portal de Serviços** | https://portalservicos.cfm.org.br |
| **Perguntas Frequentes** | https://prescricaoeletronica.cfm.org.br/perguntas-frequentes |
| **Certificado Digital CFM** | https://certificadodigital.cfm.org.br |

### 8.2 Certillion (Hub de Assinatura)

| Recurso | URL |
|---------|-----|
| **Documentação API** | https://certillion.com/certillion-api/ |
| **Agendar Suporte** | https://calendly.com/certillion/suporte |

### 8.3 VIDaaS (PSC)

| Recurso | URL |
|---------|-----|
| **Documentação Integração** | https://valid-sa.atlassian.net/wiki/spaces/PDD/pages/958365697/Manual+de+Integra+o+com+VIDaaS |
| **Portal do Desenvolvedor** | https://valid-sa.atlassian.net/wiki/spaces/PDD/ |
| **Suporte** | https://valid-sa.atlassian.net/servicedesk/customer/portal/4 |
| **App Android** | https://play.google.com/store/apps/details?id=br.com.valid.vidaas |
| **App iOS** | https://apps.apple.com/br/app/vidaas/id1475046498 |
| **Email Comercial** | produtos.certificadora@valid.com |

### 8.4 ITI (Validação)

| Recurso | URL |
|---------|-----|
| **Validador de Assinaturas** | https://validar.iti.gov.br |
| **Verificador (alternativo)** | https://assinaturadigital.iti.gov.br |
| **Portal ITI** | https://www.gov.br/iti/pt-br |

### 8.5 Legislação

| Documento | URL/Referência |
|-----------|----------------|
| **Resolução CFM 2.299/2021** | Prescrição eletrônica |
| **RDC 660/2022 (Anvisa)** | Importação cannabis |
| **RDC 327/2019 (Anvisa)** | Fabricação e prescrição cannabis |
| **MP 2.200-2/2001** | ICP-Brasil |
| **Portaria 344/1998** | Controle de substâncias |

---

## 9. Variáveis de Ambiente Completas

```env
# ============================================
# CFM - Prescrição Eletrônica
# ============================================

# Ambiente: SIMULACAO | HOMOLOGACAO | PRODUCAO
CFM_AMBIENTE=HOMOLOGACAO

# URL do serviço de autenticação (IAM)
# Homologação: https://iam-hml.cfm.org.br/oauth/token
# Produção: https://iam.cfm.org.br/oauth/token
CFM_IAM_URL=https://iam-hml.cfm.org.br/oauth/token

# Credenciais da aplicação (solicitar ao CFM)
CFM_CLIENT_ID=
CFM_CLIENT_SECRET=

# ============================================
# VIDAAS (mantido para referência/fallback)
# ============================================

# URL base da API VIDaaS
# Homologação: https://api-homolog.vidaas.com.br
# Produção: https://api.vidaas.com.br
VIDAAS_BASE_URL=https://api-homolog.vidaas.com.br

# Credenciais OAuth VIDaaS
VIDAAS_CLIENT_ID=
VIDAAS_CLIENT_SECRET=
VIDAAS_REDIRECT_URI=push://
```

---

## 10. Checklist de Implementação

### Fase 1: Setup Inicial

- [ ] Instalar biblioteca: `npm install @conselho-federal-de-medicina/integracao-prescricao-cfm`
- [ ] Configurar variáveis de ambiente
- [ ] Testar import da biblioteca
- [ ] Criar instância em `CfmAmbiente.SIMULACAO`

### Fase 2: Backend

- [ ] Criar endpoint `/api/cfm/token` com cache de token
- [ ] Criar serviço `cfm.service.ts`
- [ ] Adicionar campos no schema do banco (codigoCfm, urlDocumentoCfm)
- [ ] Criar migration para novos campos

### Fase 3: Frontend

- [ ] Criar componente para iframe CFM
- [ ] Adaptar wizard de criação de receita
- [ ] Implementar feedback visual durante assinatura
- [ ] Exibir código CFM após sucesso

### Fase 4: Testes

- [ ] Testar em ambiente SIMULACAO (mock)
- [ ] Solicitar credenciais de homologação ao CFM
- [ ] Testar em ambiente HOMOLOGACAO
- [ ] Validar receita em prescricao.cfm.org.br

### Fase 5: Produção

- [ ] Solicitar credenciais de produção
- [ ] Atualizar variáveis de ambiente
- [ ] Deploy
- [ ] Monitorar primeiras receitas

---

## 11. Exemplo Completo (Componente React)

```tsx
// CfmPrescricaoButton.tsx
import { useState } from 'react';
import {
  CfmAmbiente,
  CfmIntegracaoPrescricao,
  CfmLocalAtendimento,
  CfmMedicamento,
  CfmPaciente,
  CfmPrescricao,
  CfmRequestMessage,
  CfmTipoDocumento,
} from '@conselho-federal-de-medicina/integracao-prescricao-cfm';

interface Props {
  receita: {
    paciente: { nome: string; cpf?: string };
    medicamentos: Array<{
      nome: string;
      concentracao: string;
      posologia: string;
      quantidade: number;
      unidade: string;
    }>;
  };
  onSuccess: (codigoCfm: string, urlDocumento: string) => void;
  onError: (error: Error) => void;
}

export function CfmPrescricaoButton({ receita, onSuccess, onError }: Props) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');

  const handleAssinar = async () => {
    setLoading(true);
    setStatus('Iniciando...');

    try {
      // 1. Obter token do backend
      setStatus('Obtendo autorização...');
      const tokenRes = await fetch('/api/cfm/token');
      const { accessToken } = await tokenRes.json();

      // 2. Criar integração
      const ambiente = process.env.NEXT_PUBLIC_CFM_AMBIENTE === 'PRODUCAO'
        ? CfmAmbiente.PRODUCAO
        : CfmAmbiente.HOMOLOGACAO;
      
      const integracao = new CfmIntegracaoPrescricao(ambiente);

      // 3. Preparar dados
      const localAtendimento = new CfmLocalAtendimento(
        'Clínica ClickMedicos',
        'Endereço do consultório'
      );

      const paciente = new CfmPaciente(
        receita.paciente.nome,
        receita.paciente.cpf
      );

      const medicamentos = receita.medicamentos.map(
        m => new CfmMedicamento(
          m.nome,
          m.concentracao,
          m.posologia,
          m.quantidade,
          m.unidade
        )
      );

      const prescricao = new CfmPrescricao(
        localAtendimento,
        paciente,
        medicamentos
      );

      // 4. Criar iframe
      setStatus('Abrindo assinatura...');
      await integracao.criarIframe(
        CfmTipoDocumento.RELATORIO_MEDICO,
        'cfm-iframe-container'
      );

      // 5. Enviar para assinatura
      setStatus('Aguardando autorização do médico...');
      const requisicao = new CfmRequestMessage(accessToken, prescricao);
      const resposta = await integracao.enviarPrescricao(requisicao);

      // 6. Sucesso!
      setStatus('Assinado com sucesso!');
      onSuccess(resposta.codigoValidacao, resposta.urlDocumento);

    } catch (error) {
      setStatus('Erro na assinatura');
      onError(error instanceof Error ? error : new Error('Erro desconhecido'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        onClick={handleAssinar}
        disabled={loading}
        className="bg-blue-600 text-white px-6 py-3 rounded-lg disabled:opacity-50"
      >
        {loading ? status : 'Assinar Receita via CFM'}
      </button>
      
      {/* Container para o iframe do CFM */}
      <div id="cfm-iframe-container" className="mt-4 min-h-[400px]" />
    </div>
  );
}
```

---

## 12. Tratamento de Erros

### Erros comuns

| Erro | Causa | Solução |
|------|-------|---------|
| `invalid_client` | Credenciais erradas | Verificar client_id e client_secret |
| `rate_limit_exceeded` | Muitas requisições de token | Implementar cache de token |
| `user_not_found` | Médico sem certificado | Orientar médico a obter certificado |
| `timeout` | Médico não autorizou | Aumentar timeout, notificar médico |
| `invalid_certificate` | Certificado expirado | Médico precisa renovar certificado |

### Código de tratamento

```typescript
try {
  const resposta = await integracao.enviarPrescricao(requisicao);
  // Sucesso
} catch (error) {
  if (error.message.includes('rate_limit')) {
    // Aguardar e tentar novamente
    await sleep(5000);
    return handleAssinar();
  }
  
  if (error.message.includes('user_not_found')) {
    throw new Error('Médico não possui certificado digital ativo');
  }
  
  if (error.message.includes('timeout')) {
    throw new Error('Tempo esgotado. Verifique o app no celular.');
  }
  
  throw error;
}
```

---

*Documento técnico de implementação para integração ClickMedicos + CFM.*
