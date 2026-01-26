# Integracao CFM - Registro Oficial de Receitas Medicas

## Context

### Original Request
Integrar o sistema de receitas medicas do ClickMedicos com o CFM (Conselho Federal de Medicina) para que receitas assinadas digitalmente recebam um codigo oficial (CFMxxxxxxx) e possam ser validadas por farmacias no portal prescricao.cfm.org.br.

### Interview Summary
**Key Discussions**:
- **Estrategia**: Substituir VIDaaS direto pelo CFM (Certillion -> VIDaaS). O medico continua usando VIDaaS, mas o fluxo passa pelo CFM/Certillion.
- **Credenciais**: Iniciar em modo SIMULACAO (mock), solicitar ao CFM depois
- **Tipo Documento**: RELATORIO_MEDICO para cannabis medicinal
- **Receitas Existentes**: Manter como estao (sem codigo CFM)
- **UX Assinatura**: Modal com iframe CFM
- **Codigo VIDaaS**: Manter desativado/arquivado (nao deletar)
- **Armazenamento PDF**: URL do CFM + copia local
- **Layout PDF**: Adicionar codigo CFM apos assinatura
- **Pagina Verificacao**: Redirecionar para portal CFM

**Research Findings**:
- Sistema atual funciona com VIDaaS (packages/api/src/services/vidaas.service.ts - 632 linhas)
- Biblioteca oficial: @conselho-federal-de-medicina/integracao-prescricao-cfm
- CFM usa Certillion como hub que conecta a todos os PSCs (VIDaaS, BIRDID, VAULTID)
- Biblioteca CFM e frontend-focused (criarIframe, criarPopup)
- Cache de token e OBRIGATORIO - CFM bloqueia sistemas que fazem requests excessivos
- Documentacao completa do sistema atual: docs/rightlogic/sistema-receita-medica-completo.md

### Metis Review
**Identified Gaps** (addressed):
- **Library availability**: Plano inclui Task 0 para validar instalacao ANTES de qualquer codigo
- **Document type**: Usar RELATORIO_MEDICO conforme decisao do usuario (cannabis medicinal)
- **Architecture clarity**: Biblioteca e frontend-focused; backend precisa de token caching separado
- **Edge cases**: Mobile, popup blockers, certificate expiry adicionados como consideracoes

---

## Work Objectives

### Core Objective
Integrar receitas medicas do ClickMedicos com o portal oficial do CFM, permitindo que farmacias validem receitas em prescricao.cfm.org.br atraves de um codigo unico (CFMxxxxxxx).

### Concrete Deliverables
1. **Backend**: cfm.service.ts com cache de token e integracao Certillion
2. **Database**: 3 novos campos no model Receita (cfmCode, cfmUrl, cfmSignedAt)
3. **Frontend**: CfmSignatureModal com iframe CFM
4. **Router**: Novos endpoints tRPC (obterTokenCfm, assinarReceitaCfm)
5. **PDF**: Codigo CFM visivel no documento apos assinatura
6. **Verificacao**: Redirect para portal CFM

### Definition of Done
- [ ] `npm install @conselho-federal-de-medicina/integracao-prescricao-cfm` funciona
- [ ] Medico consegue assinar receita via modal CFM em modo SIMULACAO
- [ ] Receita assinada recebe codigo CFM (ou mock em simulacao)
- [ ] PDF exibe codigo CFM apos assinatura
- [ ] Pagina /verificar/[id] redireciona para prescricao.cfm.org.br (se tiver codigo CFM)
- [ ] Receitas antigas continuam funcionando (validacao via ITI)
- [ ] VIDaaS code arquivado (renomeado para .archived)

### Must Have
- Cache de token CFM com TTL configuravel (padrao: 1 hora)
- Feature flag CFM_ENABLED para rollout gradual
- Modo SIMULACAO funcional sem credenciais reais
- Compatibilidade com receitas existentes (sem codigo CFM)

### Must NOT Have (Guardrails)
- NAO deletar vidaas.service.ts - apenas arquivar/renomear
- NAO modificar receitas ja assinadas (imutaveis)
- NAO armazenar credenciais CFM no banco (env vars only)
- NAO fazer requests ao CFM sem cache de token
- NAO quebrar fluxo existente de receitas sem CFM
- NAO adicionar complexidade ao fluxo do medico (UX igual ou melhor)

---

## Verification Strategy (MANDATORY)

### Test Decision
- **Infrastructure exists**: YES (bun test disponivel)
- **User wants tests**: Manual verification primeiro, tests depois se necessario
- **Framework**: bun test (existente no projeto)

### Manual QA Focus
Cada TODO inclui verificacao manual detalhada porque:
1. Integracao com servico externo (CFM) requer testes end-to-end
2. Modo SIMULACAO permite testar sem credenciais
3. UI iframe requer verificacao visual

---

## Task Flow

```
Task 0 (Validacao) 
    |
    v
Task 1 (Database) --> Task 2 (Service) --> Task 3 (Router)
                                               |
                                               v
                      Task 4 (Hook) --> Task 5 (Modal) --> Task 6 (Step3)
                                                              |
                                                              v
                                        Task 7 (PDF) --> Task 8 (Verificar) --> Task 9 (Cleanup)
```

## Parallelization

| Group | Tasks | Reason |
|-------|-------|--------|
| A | 4, 7 | Hook e PDF sao independentes apos Task 3 |

| Task | Depends On | Reason |
|------|------------|--------|
| 1 | 0 | Schema so faz sentido se biblioteca funcionar |
| 2 | 1 | Service precisa dos tipos do Prisma |
| 3 | 2 | Router depende do service |
| 4 | 3 | Hook consome endpoints do router |
| 5 | 4 | Modal usa o hook |
| 6 | 5 | Step3 usa o modal |
| 7 | 3 | PDF precisa saber formato do codigo CFM |
| 8 | 6, 7 | Verificacao depende de receitas com CFM |
| 9 | 8 | Cleanup so apos tudo funcionar |

---

## TODOs

### Task 0: Validar Biblioteca CFM (PRE-REQUISITO CRITICO)

- [ ] 0. Validar que biblioteca CFM instala e funciona

  **What to do**:
  - Tentar instalar @conselho-federal-de-medicina/integracao-prescricao-cfm
  - Verificar se pacote existe no npm
  - Se NAO existir: PARAR e reportar ao usuario
  - Se existir: verificar exports disponiveis (criarIframe, criarPopup, etc)

  **Must NOT do**:
  - Prosseguir com implementacao se biblioteca nao instalar
  - Assumir que biblioteca funciona sem testar

  **Parallelizable**: NO (blocker para todos os outros)

  **References**:
  - NPM registry: https://www.npmjs.com/package/@conselho-federal-de-medicina/integracao-prescricao-cfm
  - GitHub: https://github.com/Conselho-Federal-de-Medicina/integracao-prescricao-cfm

  **Acceptance Criteria**:
  
  **Manual Execution Verification:**
  - [ ] `npm info @conselho-federal-de-medicina/integracao-prescricao-cfm` retorna informacoes do pacote
  - [ ] `cd apps/web && npm install @conselho-federal-de-medicina/integracao-prescricao-cfm` completa sem erros
  - [ ] Criar arquivo teste `apps/web/src/test-cfm.ts`:
    ```typescript
    import { criarIframe } from '@conselho-federal-de-medicina/integracao-prescricao-cfm';
    console.log('CFM library loaded:', typeof criarIframe);
    ```
  - [ ] `npx tsx apps/web/src/test-cfm.ts` executa sem erros de import
  - [ ] Deletar arquivo teste apos validacao

  **CRITICAL**: Se qualquer verificacao falhar, PARE e reporte:
  - "Biblioteca CFM nao disponivel no npm"
  - "Biblioteca CFM nao exporta criarIframe"
  - etc.

  **Commit**: NO (task de validacao, sem codigo permanente)

---

### Task 1: Migration Prisma - Adicionar campos CFM

- [ ] 1. Adicionar campos CFM no model Receita

  **What to do**:
  - Adicionar 3 novos campos ao model Receita:
    - `cfmCode String?` - Codigo unico do CFM (formato: CFMxxxxxxx)
    - `cfmUrl String?` - URL publica do documento no portal CFM
    - `cfmSignedAt DateTime?` - Data/hora da assinatura via CFM
  - Rodar migration

  **Must NOT do**:
  - Modificar campos existentes
  - Adicionar constraints que quebrem receitas existentes
  - Tornar campos obrigatorios

  **Parallelizable**: NO (depende de Task 0)

  **References**:
  
  **Pattern References**:
  - `packages/db/prisma/schema/app.prisma:327-369` - Model Receita atual com campos pdfUrl, dataEmissao
  
  **Migration Pattern**:
  - `packages/db/prisma/migrations/` - Exemplos de migrations anteriores

  **Acceptance Criteria**:
  
  **Manual Execution Verification:**
  - [ ] Edit `packages/db/prisma/schema/app.prisma` adicionando campos:
    ```prisma
    // CFM Integration (opcional - receitas antigas nao terao)
    cfmCode           String?       // Codigo CFM (ex: CFM1234567)
    cfmUrl            String?       // URL no portal prescricao.cfm.org.br
    cfmSignedAt       DateTime?     // Data/hora da assinatura CFM
    ```
  - [ ] `npm run db:generate` completa sem erros
  - [ ] `npm run db:push` aplica schema ao banco
  - [ ] Abrir Prisma Studio (`npm run db:studio`) e verificar campos na tabela receita

  **Commit**: YES
  - Message: `feat(db): add CFM integration fields to Receita model`
  - Files: `packages/db/prisma/schema/app.prisma`
  - Pre-commit: `npm run db:generate`

---

### Task 2: Criar CFM Service com Cache de Token

- [ ] 2. Criar cfm.service.ts com cache de token e integracao Certillion

  **What to do**:
  - Criar `packages/api/src/services/cfm.service.ts` (NOVO arquivo)
  - Implementar cache de token em memoria com TTL (padrao: 1 hora)
  - Implementar metodos:
    - `getToken()`: Obtem token do IAM (com cache)
    - `prepareSignature()`: Prepara documento para assinatura
    - `getSignatureStatus()`: Verifica status da assinatura
    - `getSignedDocument()`: Obtem documento assinado
  - Suportar modo SIMULACAO (retorna mocks sem chamar API)
  - Implementar error handling robusto

  **Must NOT do**:
  - Modificar vidaas.service.ts
  - Fazer requests sem cache
  - Hardcodar credenciais
  - Ignorar rate limits

  **Parallelizable**: NO (depende de Task 1 para tipos Prisma)

  **References**:
  
  **Pattern References**:
  - `packages/api/src/services/vidaas.service.ts:1-100` - Estrutura de types e interfaces
  - `packages/api/src/services/vidaas.service.ts:106-135` - Constructor pattern com env vars
  - `packages/api/src/services/vidaas.service.ts:524-560` - makeRequest pattern
  - `packages/api/src/services/vidaas.service.ts:562-624` - handleError pattern
  
  **API References**:
  - Certillion IAM: `POST /oauth2/token` (client_credentials grant)
  - Certillion Hub: Documentacao em https://certillion.com/docs (se disponivel)

  **External References**:
  - CFM library source: https://github.com/Conselho-Federal-de-Medicina/integracao-prescricao-cfm
  
  **Environment Variables** (adicionar a .env.example):
  ```
  CFM_AMBIENTE=SIMULACAO  # SIMULACAO | HOMOLOGACAO | PRODUCAO
  CFM_IAM_URL=https://iam.certillion.com
  CFM_CLIENT_ID=
  CFM_CLIENT_SECRET=
  CFM_ENABLED=true  # Feature flag
  ```

  **Acceptance Criteria**:
  
  **Manual Execution Verification:**
  - [ ] Arquivo criado em `packages/api/src/services/cfm.service.ts`
  - [ ] Types exportados: `CfmConfig`, `CfmToken`, `CfmError`, `PrepareSignatureResponse`
  - [ ] Class `CfmService` exportada com metodos documentados
  - [ ] Token caching implementado (verificar com logs):
    ```typescript
    const cfm = new CfmService();
    await cfm.getToken(); // Log: "Obtendo novo token CFM..."
    await cfm.getToken(); // Log: "Usando token do cache (TTL: Xmin)"
    ```
  - [ ] Modo SIMULACAO funciona sem credenciais:
    ```typescript
    process.env.CFM_AMBIENTE = 'SIMULACAO';
    const cfm = new CfmService();
    const result = await cfm.prepareSignature({ /* mock data */ });
    // Deve retornar mock sem chamar API
    ```
  - [ ] Build passa: `npm run build` em packages/api

  **Commit**: YES
  - Message: `feat(api): add CFM service with token caching for prescription registration`
  - Files: `packages/api/src/services/cfm.service.ts`, `apps/web/.env.example`
  - Pre-commit: `npm run check-types`

---

### Task 3: Adicionar Endpoints tRPC para CFM

- [ ] 3. Criar endpoints CFM no receitaRouter

  **What to do**:
  - Adicionar novos endpoints ao `packages/api/src/routers/receita.ts`:
    - `obterTokenCfm`: Retorna token para frontend (via service com cache)
    - `prepararAssinaturaCfm`: Prepara documento e retorna dados para iframe
    - `verificarAssinaturaCfm`: Verifica status da assinatura
    - `finalizarAssinaturaCfm`: Salva codigo CFM e URL na receita
  - Usar `medicoProcedure` (apenas medicos autenticados)
  - Integrar com CfmService

  **Must NOT do**:
  - Modificar endpoints existentes de VIDaaS
  - Remover endpoint `assinarReceita` (manter para compatibilidade)
  - Expor client_secret ao frontend

  **Parallelizable**: NO (depende de Task 2)

  **References**:
  
  **Pattern References**:
  - `packages/api/src/routers/receita.ts:1-50` - Imports e setup
  - `packages/api/src/routers/receita.ts:150-300` - Endpoint assinarReceita (padrao a seguir)
  - `packages/api/src/middleware/permissions.ts:medicoProcedure` - Middleware de autenticacao
  
  **Type References**:
  - `packages/db/prisma/schema/app.prisma:327-369` - Model Receita (incluindo novos campos CFM)

  **Acceptance Criteria**:
  
  **Manual Execution Verification:**
  - [ ] Endpoints adicionados ao router:
    - `receita.obterTokenCfm` - retorna `{ token: string, expiresIn: number }`
    - `receita.prepararAssinaturaCfm` - input: `{ receitaId }`, output: `{ prepareId, iframeUrl }`
    - `receita.verificarAssinaturaCfm` - input: `{ prepareId }`, output: `{ status, cfmCode?, cfmUrl? }`
    - `receita.finalizarAssinaturaCfm` - input: `{ receitaId, cfmCode, cfmUrl }`, output: `{ success }`
  - [ ] Build passa: `npm run check-types`
  - [ ] Dev server inicia: `npm run dev`
  - [ ] Testar via tRPC panel ou curl (modo SIMULACAO):
    ```bash
    # Exemplo de teste manual
    curl -X POST http://localhost:3001/api/trpc/receita.obterTokenCfm \
      -H "Content-Type: application/json" \
      -d '{}' \
      --cookie "session=..."
    ```

  **Commit**: YES
  - Message: `feat(api): add CFM signature endpoints to receitaRouter`
  - Files: `packages/api/src/routers/receita.ts`
  - Pre-commit: `npm run check-types`

---

### Task 4: Criar Hook useCfmSignature

- [ ] 4. Criar hook React para gerenciar fluxo de assinatura CFM

  **What to do**:
  - Criar `apps/web/src/hooks/useCfmSignature.ts`
  - Gerenciar estados: idle, preparing, signing, verifying, success, error
  - Consumir endpoints tRPC criados em Task 3
  - Expor funcoes: `prepare()`, `verify()`, `finalize()`
  - Polling automatico para verificar status

  **Must NOT do**:
  - Modificar hooks existentes de VIDaaS
  - Fazer chamadas diretas ao CFM (sempre via tRPC)

  **Parallelizable**: YES (com Task 7)

  **References**:
  
  **Pattern References**:
  - `apps/web/src/hooks/` - Hooks existentes do projeto
  - `apps/web/src/lib/trpc.ts` - Cliente tRPC
  
  **State Machine Reference**:
  - `docs/rightlogic/sistema-receita-medica-completo.md:420-427` - Estados de ReceitaStatus

  **Acceptance Criteria**:
  
  **Manual Execution Verification:**
  - [ ] Hook exporta interface clara:
    ```typescript
    interface UseCfmSignatureReturn {
      status: 'idle' | 'preparing' | 'signing' | 'verifying' | 'success' | 'error';
      error: string | null;
      cfmCode: string | null;
      prepare: (receitaId: string) => Promise<{ iframeUrl: string }>;
      verify: () => Promise<void>;
      finalize: () => Promise<void>;
      reset: () => void;
    }
    ```
  - [ ] Hook compila sem erros TypeScript
  - [ ] Build do frontend passa: `cd apps/web && npm run build`

  **Commit**: YES
  - Message: `feat(web): add useCfmSignature hook for CFM signature flow`
  - Files: `apps/web/src/hooks/useCfmSignature.ts`
  - Pre-commit: `npm run check-types`

---

### Task 5: Criar CfmSignatureModal

- [ ] 5. Criar componente modal com iframe CFM

  **What to do**:
  - Criar `apps/web/src/components/receita/CfmSignatureModal.tsx`
  - Usar Dialog do Radix UI (padrao do projeto)
  - Renderizar iframe com URL do CFM
  - Mostrar estados: loading, signing (iframe), success, error
  - Usar hook useCfmSignature internamente
  - Callback onSuccess para atualizar UI pai

  **Must NOT do**:
  - Usar popup (prefer iframe para UX consistente)
  - Bloquear UI durante polling

  **Parallelizable**: NO (depende de Task 4)

  **References**:
  
  **Pattern References**:
  - `apps/web/src/components/receita/wizard/` - Componentes existentes de receita
  - `apps/web/src/components/ui/dialog.tsx` - Dialog Radix do projeto
  
  **Style References**:
  - `docs/FRONTEND_GUIDELINES.md` - Design system (cores, espacamento)
  - `CLAUDE.md:Guidelines de Frontend` - O que NAO usar (sombras, bordas decorativas)

  **Acceptance Criteria**:
  
  **Manual Execution Verification:**
  - [ ] Modal renderiza com Dialog do projeto
  - [ ] Iframe carrega URL do CFM (em modo SIMULACAO, pode ser placeholder)
  - [ ] Estados visuais funcionam:
    - Loading: Spinner + "Preparando assinatura..."
    - Signing: Iframe visivel + "Aguardando assinatura..."
    - Success: Checkmark verde + "Receita assinada com sucesso!" + codigo CFM
    - Error: X vermelho + mensagem de erro + botao "Tentar novamente"
  - [ ] Botao "Fechar" funciona em todos os estados
  - [ ] Build passa: `cd apps/web && npm run build`

  **Commit**: YES
  - Message: `feat(web): add CfmSignatureModal component with iframe integration`
  - Files: `apps/web/src/components/receita/CfmSignatureModal.tsx`
  - Pre-commit: `npm run check-types`

---

### Task 6: Integrar CFM no Step3Revisao

- [ ] 6. Substituir VIDaaS por CFM no wizard de receita

  **What to do**:
  - Modificar `apps/web/src/components/receita/wizard/Step3Revisao.tsx`
  - Adicionar feature flag check (CFM_ENABLED)
  - Se CFM_ENABLED: usar CfmSignatureModal
  - Se NAO CFM_ENABLED: manter fluxo VIDaaS atual
  - Atualizar UI apos assinatura (mostrar codigo CFM)

  **Must NOT do**:
  - Remover codigo VIDaaS (apenas desativar via flag)
  - Quebrar fluxo existente se CFM_ENABLED=false

  **Parallelizable**: NO (depende de Task 5)

  **References**:
  
  **Pattern References**:
  - `apps/web/src/components/receita/wizard/Step3Revisao.tsx` - Componente atual
  - `apps/web/src/components/receita/wizard/Step1Consulta.tsx` - Padrao de step
  - `apps/web/src/components/receita/wizard/Step2Prescricao.tsx` - Padrao de step

  **Acceptance Criteria**:
  
  **Manual Execution Verification:**
  - [ ] Using Playwright ou navegador manual:
    1. Fazer login como medico
    2. Navegar para /receitas/nova
    3. Selecionar consulta (Step 1)
    4. Preencher produtos (Step 2)
    5. Chegar no Step 3 (Revisao)
    6. Clicar "Assinar Digitalmente"
    7. CfmSignatureModal abre
    8. Em modo SIMULACAO: modal mostra sucesso apos alguns segundos
    9. Receita atualiza com codigo CFM (mock)
  - [ ] Receita no banco tem cfmCode preenchido
  - [ ] Fluxo VIDaaS ainda funciona se CFM_ENABLED=false

  **Commit**: YES
  - Message: `feat(web): integrate CFM signature in Step3Revisao wizard`
  - Files: `apps/web/src/components/receita/wizard/Step3Revisao.tsx`
  - Pre-commit: `npm run check-types`

---

### Task 7: Atualizar ReceitaPDF com Codigo CFM

- [ ] 7. Adicionar codigo CFM ao layout do PDF

  **What to do**:
  - Modificar `apps/web/src/components/receita/ReceitaPDF.tsx`
  - Adicionar secao condicional para codigo CFM (se existir)
  - Posicao: abaixo da assinatura ou no rodape
  - Incluir: "Codigo CFM: CFM1234567" + "Verifique em: prescricao.cfm.org.br"

  **Must NOT do**:
  - Quebrar layout de receitas sem codigo CFM
  - Adicionar codigo CFM antes da assinatura (so aparece depois)

  **Parallelizable**: YES (com Task 4)

  **References**:
  
  **Pattern References**:
  - `apps/web/src/components/receita/ReceitaPDF.tsx` - Componente atual de PDF
  - `docs/rightlogic/sistema-receita-medica-completo.md:Secao 8` - Geracao de PDF
  
  **Style References**:
  - Design atual do PDF (manter consistencia visual)

  **Acceptance Criteria**:
  
  **Manual Execution Verification:**
  - [ ] PDF de receita SEM codigo CFM renderiza normalmente (sem erro)
  - [ ] PDF de receita COM codigo CFM mostra:
    - "Codigo CFM: CFM1234567" em fonte destacada
    - "Verifique em: prescricao.cfm.org.br"
    - Posicionamento nao quebra layout
  - [ ] Testar geracao de PDF em /receitas/[id]/visualizar

  **Commit**: YES
  - Message: `feat(web): display CFM code in ReceitaPDF when available`
  - Files: `apps/web/src/components/receita/ReceitaPDF.tsx`
  - Pre-commit: `npm run check-types`

---

### Task 8: Atualizar Pagina de Verificacao

- [ ] 8. Redirecionar verificacao para portal CFM quando aplicavel

  **What to do**:
  - Modificar `apps/web/src/app/(public)/verificar/[id]/page.tsx`
  - Se receita tem cfmCode: redirecionar para prescricao.cfm.org.br/{codigo}
  - Se receita NAO tem cfmCode: manter verificacao via ITI (atual)
  - Adicionar link manual para portal CFM (caso redirect falhe)

  **Must NOT do**:
  - Quebrar verificacao de receitas antigas (sem CFM)
  - Remover verificacao ITI existente

  **Parallelizable**: NO (depende de Tasks 6 e 7)

  **References**:
  
  **Pattern References**:
  - `apps/web/src/app/(public)/verificar/[id]/page.tsx` - Pagina atual
  
  **External References**:
  - Portal CFM: https://prescricao.cfm.org.br

  **Acceptance Criteria**:
  
  **Manual Execution Verification:**
  - [ ] Receita SEM cfmCode: pagina mostra verificacao ITI (atual)
  - [ ] Receita COM cfmCode: redirect para prescricao.cfm.org.br ou link visivel
  - [ ] QR Code (se existente) aponta para URL correta

  **Commit**: YES
  - Message: `feat(web): redirect CFM prescriptions to official portal for verification`
  - Files: `apps/web/src/app/(public)/verificar/[id]/page.tsx`
  - Pre-commit: `npm run check-types`

---

### Task 9: Cleanup e Arquivar VIDaaS

- [ ] 9. Arquivar codigo VIDaaS e finalizar integracao

  **What to do**:
  - Renomear `vidaas.service.ts` para `vidaas.service.ts.archived`
  - Atualizar imports que referenciam VIDaaS (se CFM_ENABLED=true, nao usar)
  - Verificar que sistema funciona end-to-end
  - Atualizar documentacao

  **Must NOT do**:
  - Deletar arquivo VIDaaS (apenas renomear)
  - Remover variaveis de ambiente VIDaaS
  - Quebrar sistema se CFM_ENABLED=false

  **Parallelizable**: NO (depende de Task 8)

  **References**:
  
  **Files to Archive**:
  - `packages/api/src/services/vidaas.service.ts` -> `.archived`
  
  **Documentation to Update**:
  - `docs/rightlogic/sistema-receita-medica-completo.md` - Adicionar secao CFM
  - `CLAUDE.md` - Mencionar integracao CFM

  **Acceptance Criteria**:
  
  **Manual Execution Verification:**
  - [ ] `vidaas.service.ts.archived` existe
  - [ ] Build completo passa: `npm run build`
  - [ ] Sistema funciona em modo SIMULACAO:
    1. Criar receita
    2. Assinar via CFM
    3. Ver codigo CFM no PDF
    4. Verificar redirect na pagina publica
  - [ ] Sistema funciona com CFM_ENABLED=false (fallback VIDaaS, se necessario)

  **Commit**: YES
  - Message: `chore(api): archive VIDaaS service, CFM integration complete`
  - Files: `packages/api/src/services/vidaas.service.ts.archived`, docs
  - Pre-commit: `npm run build`

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 0 | (no commit) | - | Package installs |
| 1 | `feat(db): add CFM fields` | schema | db:generate |
| 2 | `feat(api): CFM service` | service | check-types |
| 3 | `feat(api): CFM endpoints` | router | check-types |
| 4 | `feat(web): useCfmSignature` | hook | check-types |
| 5 | `feat(web): CfmSignatureModal` | component | check-types |
| 6 | `feat(web): integrate CFM Step3` | wizard | build |
| 7 | `feat(web): CFM code in PDF` | PDF | check-types |
| 8 | `feat(web): CFM verification` | page | check-types |
| 9 | `chore: archive VIDaaS` | cleanup | build |

---

## Success Criteria

### Verification Commands
```bash
# Build completo
npm run build  # Expected: Success

# Types check
npm run check-types  # Expected: No errors

# Database
npm run db:generate  # Expected: Prisma client generated
npm run db:push      # Expected: Schema applied
```

### Final Checklist
- [ ] Biblioteca CFM instalada e funcionando
- [ ] Medico pode assinar receita via modal CFM
- [ ] Receita recebe codigo CFM (ou mock em SIMULACAO)
- [ ] PDF mostra codigo CFM apos assinatura
- [ ] Verificacao redireciona para portal CFM
- [ ] Receitas antigas continuam funcionando
- [ ] VIDaaS arquivado (nao deletado)
- [ ] Feature flag CFM_ENABLED funciona
- [ ] Build completo passa
- [ ] Documentacao atualizada

---

## Environment Variables (Final)

```env
# CFM Integration
CFM_ENABLED=true
CFM_AMBIENTE=SIMULACAO  # SIMULACAO | HOMOLOGACAO | PRODUCAO
CFM_IAM_URL=https://iam.certillion.com
CFM_CLIENT_ID=          # Obter do CFM
CFM_CLIENT_SECRET=      # Obter do CFM
CFM_TOKEN_TTL=3600      # Cache TTL em segundos (1 hora)

# VIDaaS (manter para fallback)
VIDAAS_BASE_URL=https://certificado.vidaas.com.br
VIDAAS_CLIENT_ID=
VIDAAS_CLIENT_SECRET=
VIDAAS_REDIRECT_URI=push://
```

---

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Biblioteca CFM indisponivel | Task 0 valida ANTES de qualquer codigo |
| CFM bloqueia por rate limit | Cache de token obrigatorio em Task 2 |
| Iframe bloqueado por browser | Testar CSP, adicionar fallback com link direto |
| Mobile nao suporta iframe | Testar responsividade, considerar popup como fallback |
| Receitas antigas quebram | Feature flag + verificacao condicional em todas as tasks |
