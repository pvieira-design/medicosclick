# Fluxo de Criacao de Receita Medica

## Context

### Original Request
Criar fluxo de criacao de receita medica no login do medico, onde o medico cria documento PDF e valida usando API VIDaaS para assinatura digital ICP-Brasil.

### Interview Summary
**Key Discussions**:
- Wizard de 3 etapas: Selecionar Consulta -> Produtos/Posologia -> Revisar/Assinar
- Dados do paciente hibridos (buscar do Click OU digitar manualmente)
- Produtos do portfolio fixo (tabela products no Click replica)
- Posologia vem da anamnese.data (JSONB), editavel pelo medico
- Credenciais VIDaaS por medico, configuradas em pagina separada
- Permite receita sem assinatura se VIDaaS nao configurado
- PDF armazenado no Vercel Blob
- Historico paginado com filtros basicos

**Research Findings**:
- Products table: title, formula (concentracao), type, volume
- User model NAO tem CPF/endereco - precisa adicionar
- Anamnese tem campo data (JSONB) com respostas - estrutura desconhecida
- Rotas medico existentes em /dashboard/
- Sidebar definido em apps/web/src/components/sidebar.tsx

### Metis Review
**Identified Gaps** (addressed):
- Estrutura do anamnese.data: Sera investigada na task de implementacao
- Validacao de CRM: Opcional conforme decisao do usuario
- Limite PDF 7MB: Adicionar validacao antes de enviar ao VIDaaS
- Consulta pertence ao medico: Validar no backend

---

## Work Objectives

### Core Objective
Permitir que medicos criem receitas medicas digitais (PDF) com dados de consultas existentes e assinem digitalmente via API VIDaaS.

### Concrete Deliverables
- Nova pagina /dashboard/receitas (lista + criar)
- Pagina de configuracao VIDaaS /dashboard/configuracoes/vidaas
- Modelo Prisma para Receita e credenciais VIDaaS
- Integracao completa com API VIDaaS
- Geracao de PDF com @react-pdf/renderer
- Upload para Vercel Blob

### Definition of Done
- [ ] Medico consegue criar receita via wizard de 3 etapas
- [ ] Receita e assinada digitalmente via VIDaaS
- [ ] PDF armazenado no Vercel Blob e acessivel
- [ ] Historico de receitas visivel com filtros
- [ ] Medico pode duplicar receita existente

### Must Have
- Campos obrigatorios RDC 660/2022 (nome paciente, produto, posologia, data, assinatura, CRM)
- Integracao VIDaaS com OAuth 2.0 + PKCE
- Estados: RASCUNHO, PENDENTE_ASSINATURA, ASSINADA, CANCELADA
- Validacao de consulta pertence ao medico logado

### Must NOT Have (Guardrails)
- NAO implementar notificacao ao paciente (fora do escopo)
- NAO implementar versionamento de receitas
- NAO permitir editar receita ASSINADA
- NAO implementar testes automatizados (manual QA apenas)
- NAO adicionar branding/logo no PDF
- NAO criptografar credenciais VIDaaS

---

## Verification Strategy (MANDATORY)

### Test Decision
- **Infrastructure exists**: NO (projeto nao tem testes configurados)
- **User wants tests**: Manual-only
- **Framework**: none

### Manual QA Only

Cada TODO inclui procedimentos de verificacao manual detalhados:
- Frontend/UI: Playwright browser automation ou verificacao manual
- API/Backend: curl/httpie para testar endpoints
- PDF: Abrir e verificar conteudo gerado

---

## Task Flow

```
1. Schema Prisma
       |
       v
2. Queries Click (products, anamnese)
       |
       v
3. Service VIDaaS (backend)
       |
       v
4. Componente PDF (@react-pdf)
       |
       v
5. Pagina Config VIDaaS
       |
       v
6. tRPC Routers
       |
       v
7. Wizard Criar Receita
       |
       v
8. Historico de Receitas
       |
       v
9. Integracao Sidebar
```

## Parallelization

| Group | Tasks | Reason |
|-------|-------|--------|
| A | 2, 3, 4 | Podem ser desenvolvidas em paralelo apos schema |
| B | 5, 6 | Dependem de 3 (VIDaaS service) |
| C | 7, 8 | Dependem de 4, 6 |

---

## TODOs

### FASE 1: Fundacao (Backend)

- [x] 1. Atualizar Schema Prisma - Modelos Receita e VIDaaS

  **What to do**:
  - Adicionar campos `cpf` e `enderecoConsultorio` ao model User em auth.prisma
  - Criar model `VidaasCredentials` para armazenar client_id/secret por medico
  - Criar model `Receita` com campos: id, status, consultaClickId, medicoId, pacienteNome, pacienteEndereco, produtos (JSON), posologia, alertas, observacoes, dataEmissao, dataValidade, pdfUrl, pdfUrlNaoAssinado, createdAt, updatedAt
  - Criar model `ReceitaAuditoria` para log basico
  - Rodar `pnpm db:push` para aplicar mudancas

  **Must NOT do**:
  - NAO criar relacionamentos complexos com tabelas do Click (sao externas)
  - NAO adicionar campos de versionamento

  **Parallelizable**: NO (primeira task, base para todas)

  **References**:
  - `packages/db/prisma/schema/auth.prisma` - Model User atual (adicionar cpf, enderecoConsultorio)
  - `packages/db/prisma/schema/app.prisma` - Padrao de models do app (seguir convenções)
  - `docs/criacaoreceitamedica/Receita- dados importantes.md` - Campos obrigatorios RDC 660/2022

  **Acceptance Criteria**:
  - [ ] Rodar `pnpm db:push` sem erros
  - [ ] Verificar no Prisma Studio que tabelas foram criadas: `pnpm db:studio`
  - [ ] Campos User.cpf e User.enderecoConsultorio existem
  - [ ] Tabela Receita existe com todos os campos

  **Commit**: YES
  - Message: `feat(db): add Receita and VidaasCredentials models`
  - Files: `packages/db/prisma/schema/*.prisma`

---

- [x] 2. Criar Queries Click Replica - Products e Anamnese

  **What to do**:
  - Adicionar interface `ProductClick` em click-replica.ts
  - Criar funcao `buscarProdutos()` - lista produtos ativos do portfolio
  - Criar funcao `buscarConsultasRecentesMedico(doctorId, limit)` - ultimas 20 consultas realizadas
  - Criar funcao `buscarDadosAnamnese(consultingId)` - retorna data JSONB
  - Criar funcao `buscarDadosPaciente(userId)` - nome, endereco do paciente
  - Investigar estrutura do anamnese.data para extrair posologia

  **Must NOT do**:
  - NAO modificar dados no banco Click (somente leitura)
  - NAO assumir estrutura do anamnese.data sem verificar

  **Parallelizable**: YES (com 3, 4)

  **References**:
  - `packages/db/src/click-replica.ts` - Queries existentes do Click (seguir padrao)
  - `docs/queries/Table_users_Documentacao - cópia.md` - Schema da tabela products
  - `docs/queries/respostas-perguntas-bancodadosclick.md` - Regras de negocio Click

  **Acceptance Criteria**:
  - [ ] Funcao buscarProdutos retorna lista de produtos: `node -e "import('./packages/db/src/click-replica.js').then(m => m.buscarProdutos().then(console.log))"`
  - [ ] Funcao buscarConsultasRecentesMedico retorna consultas com user_id != null
  - [ ] Funcao buscarDadosAnamnese retorna objeto JSONB
  - [ ] Documentar estrutura encontrada no anamnese.data em comentario

  **Commit**: YES
  - Message: `feat(db): add Click replica queries for products and anamnese`
  - Files: `packages/db/src/click-replica.ts`

---

- [x] 3. Criar Service VIDaaS

  **What to do**:
  - Criar arquivo `packages/api/src/services/vidaas.service.ts`
  - Implementar classe VidaasService com metodos:
    - `generatePKCE()` - gerar code_verifier e code_challenge
    - `calculateHash(pdfBase64)` - SHA-256 do PDF
    - `verificarCertificado(cpf)` - POST /user-discovery
    - `solicitarAutorizacaoPush(cpf, lifetime)` - GET /authorize
    - `aguardarAutorizacao(code, timeout)` - polling /authentications
    - `obterAccessToken(authToken, codeVerifier)` - POST /token
    - `assinarPdf(accessToken, pdfBase64, docId, alias)` - POST /signature
    - `assinarReceita(cpf, pdfBase64, receitaId)` - fluxo completo
  - Adicionar variaveis de ambiente no .env.example

  **Must NOT do**:
  - NAO implementar fallback QR Code (apenas push)
  - NAO logar tokens ou conteudo de PDFs

  **Parallelizable**: YES (com 2, 4)

  **References**:
  - `docs/criacaoreceitamedica/documentacao_integracao_click_vidaas.md:930-1133` - Exemplo completo de implementacao
  - `docs/criacaoreceitamedica/documentacao_integracao_click_vidaas.md:358-470` - Endpoints da API
  - `docs/criacaoreceitamedica/documentacao_integracao_click_vidaas.md:782-842` - Tratamento de erros

  **Acceptance Criteria**:
  - [ ] Arquivo vidaas.service.ts criado com todos os metodos
  - [ ] TypeScript compila sem erros: `pnpm check-types`
  - [ ] Variaveis VIDAAS_* documentadas no .env.example

  **Commit**: YES
  - Message: `feat(api): add VIDaaS integration service`
  - Files: `packages/api/src/services/vidaas.service.ts`, `.env.example`

---

- [x] 4. Criar Componente PDF com @react-pdf/renderer

  **What to do**:
  - Instalar dependencia: `pnpm add @react-pdf/renderer --filter web`
  - Criar arquivo `apps/web/src/components/receita/ReceitaPDF.tsx`
  - Implementar componente React que renderiza PDF seguindo layout do exemplo
  - Incluir: cabecalho RELATORIO MEDICO, dados medico, dados paciente, produtos numerados, posologia, rodape com assinatura
  - Criar funcao `gerarReceitaPdfBase64(dados)` que retorna PDF em base64
  - Limite de 7MB para o PDF (validar antes de retornar)

  **Must NOT do**:
  - NAO incluir logo/branding da Click
  - NAO gerar QR Code (so apos assinatura real)

  **Parallelizable**: YES (com 2, 3)

  **References**:
  - `docs/criacaoreceitamedica/Exemplo de uma receita médica.pdf` - Layout visual esperado
  - `docs/criacaoreceitamedica/Receita- dados importantes.md:148-165` - Estrutura minima valida
  - Documentacao @react-pdf: https://react-pdf.org/

  **Acceptance Criteria**:
  - [ ] Componente ReceitaPDF renderiza sem erros
  - [ ] PDF gerado segue layout do exemplo (cabecalho, dados, produtos, rodape)
  - [ ] Funcao gerarReceitaPdfBase64 retorna string base64 valida
  - [ ] PDF abre corretamente em leitor de PDF

  **Commit**: YES
  - Message: `feat(web): add ReceitaPDF component with @react-pdf/renderer`
  - Files: `apps/web/src/components/receita/ReceitaPDF.tsx`, `apps/web/package.json`

---

### FASE 2: Configuracao e APIs

- [x] 5. Criar Pagina de Configuracao VIDaaS

  **What to do**:
  - Criar rota `apps/web/src/app/(dashboard)/dashboard/configuracoes/vidaas/page.tsx`
  - Formulario com campos: client_id, client_secret
  - Botao "Validar Credenciais" que chama user-discovery
  - Exibir status: "Nao configurado", "Configurado", "Certificado ativo"
  - Campos CPF e Endereco do consultorio do medico
  - Salvar no banco via tRPC

  **Must NOT do**:
  - NAO permitir ver o client_secret apos salvo (masked)

  **Parallelizable**: YES (com 6)

  **References**:
  - `apps/web/src/app/(dashboard)/dashboard/perfil/page.tsx` - Padrao de pagina de config existente
  - `packages/api/src/services/vidaas.service.ts` - Metodo verificarCertificado
  - `docs/criacaoreceitamedica/documentacao_integracao_click_vidaas.md:360-398` - Endpoint user-discovery

  **Acceptance Criteria**:
  - [ ] Acessar http://localhost:3001/dashboard/configuracoes/vidaas
  - [ ] Formulario exibe campos client_id, client_secret, CPF, endereco
  - [ ] Botao "Validar" chama API e mostra resultado
  - [ ] Credenciais salvas persistem apos refresh

  **Commit**: YES
  - Message: `feat(web): add VIDaaS configuration page`
  - Files: `apps/web/src/app/(dashboard)/dashboard/configuracoes/vidaas/page.tsx`

---

- [x] 6. Criar tRPC Routers para Receitas

  **What to do**:
  - Criar `packages/api/src/routers/receita.ts`
  - Implementar procedures:
    - `listarConsultasRecentes` - busca ultimas 20 consultas realizadas do medico
    - `buscarDadosConsulta` - retorna paciente + anamnese de uma consulta
    - `listarProdutos` - lista produtos do portfolio Click
    - `criarReceita` - cria receita com status RASCUNHO
    - `atualizarReceita` - atualiza receita pendente
    - `assinarReceita` - inicia fluxo VIDaaS
    - `statusAssinatura` - polling do status da assinatura
    - `listarReceitas` - historico paginado com filtros
    - `buscarReceita` - detalhes de uma receita
    - `duplicarReceita` - cria copia de receita existente
    - `salvarCredenciaisVidaas` - salva client_id/secret
    - `validarCredenciaisVidaas` - testa credenciais
  - Adicionar router ao appRouter
  - Usar medicoProcedure para restringir acesso

  **Must NOT do**:
  - NAO permitir acessar receitas de outros medicos
  - NAO permitir editar receita ASSINADA

  **Parallelizable**: YES (com 5)

  **References**:
  - `packages/api/src/routers/medico.ts` - Padrao de router existente
  - `packages/api/src/middleware/permissions.ts` - medicoProcedure
  - `packages/api/src/root.ts` - Onde adicionar o router

  **Acceptance Criteria**:
  - [ ] TypeScript compila sem erros: `pnpm check-types`
  - [ ] Router registrado em root.ts
  - [ ] Testar via tRPC playground ou curl que endpoints respondem

  **Commit**: YES
  - Message: `feat(api): add receita tRPC router with all procedures`
  - Files: `packages/api/src/routers/receita.ts`, `packages/api/src/root.ts`

---

### FASE 3: Frontend Principal

- [x] 7. Criar Wizard de Criacao de Receita

  **What to do**:
  - Criar rota `apps/web/src/app/(dashboard)/dashboard/receitas/nova/page.tsx`
  - Implementar wizard de 3 etapas com componentes separados:
    - Step1: Selecionar consulta (lista das 20 recentes, so completed=true e user_id != null)
    - Step2: Produtos e posologia (select produto, quantidade, posologia editavel, alertas texto livre)
    - Step3: Revisar e assinar (preview PDF opcional, botao Assinar ou Salvar Rascunho)
  - Modal de loading durante assinatura VIDaaS (aguardando autorizacao)
  - Apos assinatura: mostrar PDF + botao download
  - Upload do PDF para Vercel Blob

  **Must NOT do**:
  - NAO permitir selecionar consulta sem paciente (user_id = null)
  - NAO bloquear se VIDaaS nao configurado (permite salvar sem assinatura)

  **Parallelizable**: NO (depende de 4, 6)

  **References**:
  - `apps/web/src/app/(dashboard)/dashboard/solicitar/page.tsx` - Padrao de formulario existente
  - `apps/web/src/components/receita/ReceitaPDF.tsx` - Componente PDF
  - `docs/FRONTEND_GUIDELINES.md` - Design system

  **Acceptance Criteria**:
  - [ ] Acessar http://localhost:3001/dashboard/receitas/nova
  - [ ] Wizard navega entre 3 etapas
  - [ ] Consultas sem paciente NAO aparecem na lista
  - [ ] Produtos carregam do portfolio Click
  - [ ] Posologia pre-preenche da anamnese se existir
  - [ ] Botao Assinar inicia fluxo VIDaaS
  - [ ] Modal mostra "Aguardando autorizacao..."
  - [ ] Apos sucesso, PDF e exibido e pode ser baixado

  **Commit**: YES
  - Message: `feat(web): add prescription creation wizard`
  - Files: `apps/web/src/app/(dashboard)/dashboard/receitas/nova/page.tsx`, `apps/web/src/components/receita/*.tsx`

---

- [x] 8. Criar Pagina de Historico de Receitas

  **What to do**:
  - Criar rota `apps/web/src/app/(dashboard)/dashboard/receitas/page.tsx`
  - Listagem paginada (20 por pagina) com server-side pagination
  - Filtros: data inicial/final, status (RASCUNHO, PENDENTE, ASSINADA)
  - Colunas: data, paciente, status, acoes
  - Acoes: Ver PDF, Editar (se pendente), Duplicar, Tentar Assinar (se pendente)
  - Botao "Nova Receita" no topo
  - Responsivo (funciona em mobile)

  **Must NOT do**:
  - NAO permitir cancelar receita assinada
  - NAO carregar todas receitas de uma vez

  **Parallelizable**: NO (depende de 6, 7)

  **References**:
  - `apps/web/src/app/(dashboard)/dashboard/solicitacoes/page.tsx` - Padrao de listagem existente
  - `docs/FRONTEND_GUIDELINES.md` - Cores e componentes

  **Acceptance Criteria**:
  - [ ] Acessar http://localhost:3001/dashboard/receitas
  - [ ] Lista carrega com paginacao funcionando
  - [ ] Filtros de data e status funcionam
  - [ ] Botao "Ver PDF" abre o PDF
  - [ ] Botao "Duplicar" cria copia e redireciona para wizard
  - [ ] Tela funciona em mobile (testar em viewport pequeno)

  **Commit**: YES
  - Message: `feat(web): add prescription history page with pagination and filters`
  - Files: `apps/web/src/app/(dashboard)/dashboard/receitas/page.tsx`

---

### FASE 4: Finalizacao

- [x] 9. Adicionar Menu Receitas no Sidebar

  **What to do**:
  - Editar `apps/web/src/components/sidebar.tsx`
  - Adicionar item "Receitas" no menu do role medico
  - Icone sugerido: FileText ou ClipboardList
  - Link para /dashboard/receitas

  **Must NOT do**:
  - NAO criar sub-items (item unico)

  **Parallelizable**: NO (ultima task)

  **References**:
  - `apps/web/src/components/sidebar.tsx` - Sidebar atual

  **Acceptance Criteria**:
  - [ ] Item "Receitas" aparece no menu lateral para role medico
  - [ ] Clicar leva para /dashboard/receitas
  - [ ] Icone consistente com outros items

  **Commit**: YES
  - Message: `feat(web): add Receitas menu item to sidebar`
  - Files: `apps/web/src/components/sidebar.tsx`

---

- [x] 10. Teste End-to-End Manual e Ajustes

  **What to do**:
  - Testar fluxo completo como medico:
    1. Configurar VIDaaS em /configuracoes/vidaas
    2. Criar nova receita via wizard
    3. Selecionar consulta, adicionar produtos
    4. Assinar (ou salvar sem assinatura)
    5. Verificar no historico
    6. Duplicar receita
    7. Editar receita pendente
  - Corrigir bugs encontrados
  - Verificar responsividade em mobile

  **Must NOT do**:
  - NAO criar testes automatizados

  **Parallelizable**: NO (ultima task)

  **References**:
  - Todas as paginas criadas

  **Acceptance Criteria**:
  - [ ] Fluxo completo funciona sem erros
  - [ ] PDF gerado contem todos campos obrigatorios RDC 660/2022
  - [ ] PDF assinado valida no https://validar.iti.gov.br (se assinatura real)
  - [ ] Telas funcionam em mobile

  **Commit**: YES (se houver fixes)
  - Message: `fix(web): address issues found in e2e testing`
  - Files: varies

---

## Commit Strategy

| After Task | Message | Files |
|------------|---------|-------|
| 1 | `feat(db): add Receita and VidaasCredentials models` | prisma/schema/*.prisma |
| 2 | `feat(db): add Click replica queries for products and anamnese` | click-replica.ts |
| 3 | `feat(api): add VIDaaS integration service` | vidaas.service.ts |
| 4 | `feat(web): add ReceitaPDF component` | ReceitaPDF.tsx |
| 5 | `feat(web): add VIDaaS configuration page` | configuracoes/vidaas |
| 6 | `feat(api): add receita tRPC router` | receita.ts, root.ts |
| 7 | `feat(web): add prescription creation wizard` | receitas/nova |
| 8 | `feat(web): add prescription history page` | receitas/page.tsx |
| 9 | `feat(web): add Receitas menu to sidebar` | sidebar.tsx |
| 10 | `fix(web): e2e testing fixes` | varies |

---

## Success Criteria

### Verification Commands
```bash
pnpm check-types         # TypeScript sem erros
pnpm build               # Build sem erros
pnpm dev                 # App inicia corretamente
```

### Final Checklist
- [ ] Medico consegue configurar credenciais VIDaaS
- [ ] Medico consegue criar receita com wizard de 3 etapas
- [ ] Receita contem todos campos obrigatorios RDC 660/2022
- [ ] PDF e gerado e armazenado no Vercel Blob
- [ ] Assinatura VIDaaS funciona (push notification)
- [ ] Receitas aparecem no historico com filtros
- [ ] Medico pode duplicar receita existente
- [ ] Telas sao responsivas
- [ ] Auditoria basica registra criacao e assinatura
