# Funil de Onboarding de Médicos

## Context

### Original Request
Criar um sistema completo de funil de onboarding para médicos candidatos, com visualização Kanban, formulário público de candidatura, e integração com o Click CRM (conectando candidato ao `doctor_id` quando ativado).

Pipeline: Candidatos → Entrevista → Treinamento → Ativo → Performance

### Interview Summary

**Key Discussions:**

1. **Formulário Público**: Campos obrigatórios definidos (nome, email, telefone, CRM, especialidade, experiência, disponibilidade, fonte). Upload de arquivos opcional. Sem validação automática de CRM.

2. **Estágios**: 5 estágios fixos, fluxo só avança (sem voltar). Rejeição possível em qualquer estágio com motivo obrigatório.

3. **Entrevista**: Registro apenas (sem agendamento). Inclui observações, nota 1-5, checklist de critérios, entrevistador e resultado.

4. **Treinamento**: Candidato assiste consultas ao vivo. Atribui médicos mentores (lista de médicos ativos). Registra datas de início/fim. Sem critério formal de conclusão.

5. **Ativação**: Staff cria médico no Click manualmente (processo externo). Obrigatório informar `doctor_id` para mover para Ativo. Busca por nome.

6. **Kanban**: Filtros (busca nome, ganhos/perdidos), cards mostram nome/datas/tempo/tags, drawer lateral para detalhes, drag-drop sem confirmação, tags livres.

7. **Permissões**: Todos os níveis de staff podem ver e gerenciar. Sem aprovação de diretor.

8. **Notificações**: Nenhuma para candidato. Email para staff (configurável) quando novo candidato.

### Research Findings

**Database:**
- Não existe tabela de Candidatos - precisa criar nova
- Padrão `Auditoria` existe e deve ser seguido (`dadosAntes`/`dadosDepois`)
- `User.clickDoctorId` é o link com Click CRM

**Email:**
- Resend configurado e funcionando
- Padrão `enviarEmailCancelamentoParaStaff` existe como referência
- `ConfigSistema` pode armazenar emails destinatários

**UI:**
- React Aria DND está nas dependências (usar para Kanban)
- `Sheet` component existe para drawer (`ui/sheet.tsx`)
- TanStack Form para formulários
- Badges/tags existem no `untitled/`

**Patterns:**
- Audit: `packages/db/prisma/schema/app.prisma:229-250`
- Email to Staff: `packages/api/src/services/email.service.ts:227-248`
- File Upload: `apps/web/src/app/api/upload/route.ts`
- Drawer: `apps/web/src/app/(dashboard)/dashboard/medicos/page.tsx:1404-1532`

### Metis Review

**Identified Gaps (addressed):**

1. **Duplicata de candidatos**: Default aplicado - bloquear se email ou CRM já existe
2. **Formato CRM**: Default aplicado - validar formato "12345-SP" no frontend
3. **Lista de especialidades**: Default aplicado - usar mesma lista do Click (query existente)
4. **Submissão parcial**: Default aplicado - form não persiste parcialmente (dados perdidos se fechar)
5. **Feedback pós-submissão**: Default aplicado - página de sucesso com mensagem

---

## Work Objectives

### Core Objective
Criar sistema de gestão de candidatos a médico com visualização Kanban, permitindo acompanhar todo o processo de onboarding desde a candidatura até a ativação no Click CRM.

### Concrete Deliverables
- Formulário público em `/candidatura`
- Página Kanban em `/dashboard/onboarding`
- Drawer lateral com detalhes do candidato
- Sistema de tags livres
- Notificação por email para staff
- Auditoria completa de movimentações

### Definition of Done
- [ ] Candidato pode submeter formulário e aparecer no Kanban
- [ ] Staff pode mover candidatos entre estágios via drag-drop
- [ ] Staff pode rejeitar candidato com motivo obrigatório
- [ ] Staff pode atribuir mentores no estágio Treinamento
- [ ] Staff pode conectar `doctor_id` ao ativar candidato
- [ ] Todas as ações são registradas na Auditoria
- [ ] Email é enviado quando novo candidato se cadastra

### Must Have
- Formulário público sem autenticação
- 5 estágios fixos + filtro de rejeitados
- Drawer com timeline de histórico
- Validação de CRM duplicado
- Motivo obrigatório na rejeição
- Auditoria de todas as ações

### Must NOT Have (Guardrails)
- **NÃO** adicionar autenticação no formulário público
- **NÃO** criar `Candidato` como tipo de User (candidatos NÃO são usuários até ativação)
- **NÃO** integrar com Click API além do lookup de `doctor_id`
- **NÃO** adicionar WebSocket/real-time (polling é suficiente)
- **NÃO** criar testes automatizados (projeto não tem infraestrutura de testes)
- **NÃO** criar dashboard de métricas (explicitamente adiado)
- **NÃO** enviar notificações para candidato
- **NÃO** over-engineer sistema de tags (apenas strings simples)
- **NÃO** adicionar agendamento de entrevista (apenas registro)
- **NÃO** adicionar critérios formais de conclusão de treinamento
- **NÃO** permitir voltar de estágio no funil

---

## Verification Strategy (MANDATORY)

### Test Decision
- **Infrastructure exists**: NO
- **User wants tests**: Manual-only
- **Framework**: none

### Manual QA Only

**CRITICAL**: Sem testes automatizados, verificação manual DEVE ser exaustiva.

**Por tipo de entrega:**

| Tipo | Ferramenta | Procedimento |
|------|-----------|--------------|
| **Formulário Público** | Playwright browser | Preencher campos, submeter, verificar sucesso |
| **Kanban UI** | Playwright browser | Drag-drop, filtros, visualização |
| **Drawer** | Playwright browser | Abrir, preencher, salvar |
| **API/Backend** | curl/httpie | Testar endpoints tRPC |
| **Email** | Verificar inbox | Confirmar recebimento |

---

## Task Flow

```
[0. Schema] → [1. Form Backend] → [2. Form Frontend] → [3. Email]
                    ↓
            [4. Kanban Backend] → [5. Kanban UI] → [6. Drawer]
                                        ↓
                              [7. Drag-Drop] → [8. Tags]
                                        ↓
                              [9. Entrevista] → [10. Treinamento] → [11. Ativação]
                                        ↓
                              [12. Rejeição] → [13. Auditoria] → [14. Integração Final]
```

## Parallelization

| Group | Tasks | Reason |
|-------|-------|--------|
| A | 3, 4 | Email independe do Kanban backend |
| B | 8, 9, 10, 11, 12 | Features do drawer são independentes |

| Task | Depends On | Reason |
|------|------------|--------|
| 1 | 0 | Precisa do schema para criar procedures |
| 2 | 1 | Frontend precisa da API |
| 5 | 4 | UI precisa do backend |
| 6 | 5 | Drawer faz parte do Kanban |
| 7 | 6 | Drag-drop atualiza drawer |
| 13 | 0-12 | Auditoria integra todas as ações |
| 14 | 0-13 | Integração final requer tudo pronto |

---

## TODOs

### FASE 1: Fundação (Schema + Form)

---

- [x] 0. Criar Schema Prisma para Onboarding

  **What to do**:
  - Criar arquivo `packages/db/prisma/schema/onboarding.prisma`
  - Definir model `Candidato` com todos os campos do formulário + metadados
  - Definir model `CandidatoTag` para tags livres
  - Definir model `CandidatoHistorico` para timeline
  - Definir model `CandidatoAnexo` para arquivos
  - Definir model `CandidatoMentor` para relação candidato-médico mentor
  - Definir enum `CandidatoEstagio` (candidato, entrevista, treinamento, ativo, performance)
  - Definir enum `CandidatoStatus` (em_andamento, rejeitado, concluido)
  - Rodar `pnpm db:generate` e `pnpm db:push`

  **Must NOT do**:
  - NÃO criar relação com User (candidato não é user)
  - NÃO usar campos opcionais para dados obrigatórios

  **Parallelizable**: NO (base para tudo)

  **References**:
  
  **Pattern References**:
  - `packages/db/prisma/schema/app.prisma:1-50` - Padrão de definição de models com campos comuns (id, createdAt, updatedAt)
  - `packages/db/prisma/schema/app.prisma:229-250` - Model `Auditoria` como referência para estrutura de histórico

  **API/Type References**:
  - `packages/db/prisma/schema/app.prisma:52-80` - Enum `UserTipo` como referência para criar enums
  - `packages/db/prisma/schema/app.prisma:82-110` - Relações entre models

  **Documentation References**:
  - `docs/queries/queries-documentacao-schema-consultas.md` - Referência do schema Click para campos de médico

  **Schema esperado**:
  ```prisma
  enum CandidatoEstagio {
    candidato
    entrevista
    treinamento
    ativo
    performance
  }

  enum CandidatoStatus {
    em_andamento
    rejeitado
    concluido
  }

  model Candidato {
    id                    String              @id @default(cuid())
    
    // Dados do formulário
    nome                  String
    email                 String              @unique
    telefone              String
    crmNumero             String
    crmEstado             String
    especialidades        String[]            // Array de especialidades
    experiencia           String              @db.Text
    disponibilidade       String              @db.Text
    comoConheceu          String
    comoConheceuOutro     String?
    
    // Metadados
    estagio               CandidatoEstagio    @default(candidato)
    status                CandidatoStatus     @default(em_andamento)
    motivoRejeicao        String?             @db.Text
    rejeitadoPorId        String?
    rejeitadoPor          User?               @relation("RejeitadoPor", fields: [rejeitadoPorId], references: [id])
    rejeitadoEm           DateTime?
    
    // Entrevista
    entrevistaRealizada   Boolean             @default(false)
    entrevistaNota        Int?                // 1-5
    entrevistaObservacoes String?             @db.Text
    entrevistadorId       String?
    entrevistador         User?               @relation("Entrevistador", fields: [entrevistadorId], references: [id])
    entrevistaChecklist   Json?               // { crmValido: bool, experienciaAdequada: bool, ... }
    entrevistaResultado   String?             // aprovado, reprovado
    
    // Treinamento
    treinamentoInicio     DateTime?
    treinamentoFim        DateTime?
    
    // Ativação
    clickDoctorId         Int?                // Link com Click quando ativado
    ativadoPorId          String?
    ativadoPor            User?               @relation("AtivadoPor", fields: [ativadoPorId], references: [id])
    ativadoEm             DateTime?
    
    // Observações gerais
    observacoesGerais     String?             @db.Text
    
    // Timestamps
    createdAt             DateTime            @default(now())
    updatedAt             DateTime            @updatedAt
    
    // Relações
    tags                  CandidatoTag[]
    historico             CandidatoHistorico[]
    anexos                CandidatoAnexo[]
    mentores              CandidatoMentor[]
  }

  model CandidatoTag {
    id          String      @id @default(cuid())
    nome        String
    candidatoId String
    candidato   Candidato   @relation(fields: [candidatoId], references: [id], onDelete: Cascade)
    criadoPorId String
    criadoPor   User        @relation(fields: [criadoPorId], references: [id])
    createdAt   DateTime    @default(now())

    @@unique([candidatoId, nome])
  }

  model CandidatoHistorico {
    id          String      @id @default(cuid())
    candidatoId String
    candidato   Candidato   @relation(fields: [candidatoId], references: [id], onDelete: Cascade)
    acao        String      // CRIADO, MOVIDO, REJEITADO, TAG_ADICIONADA, etc.
    de          String?     // Estágio anterior (se MOVIDO)
    para        String?     // Estágio novo (se MOVIDO)
    detalhes    Json?       // Dados extras
    usuarioId   String
    usuario     User        @relation(fields: [usuarioId], references: [id])
    createdAt   DateTime    @default(now())
  }

  model CandidatoAnexo {
    id          String      @id @default(cuid())
    candidatoId String
    candidato   Candidato   @relation(fields: [candidatoId], references: [id], onDelete: Cascade)
    nome        String
    url         String
    tipo        String      // pdf, docx, etc.
    tamanho     Int         // bytes
    createdAt   DateTime    @default(now())
  }

  model CandidatoMentor {
    id          String      @id @default(cuid())
    candidatoId String
    candidato   Candidato   @relation(fields: [candidatoId], references: [id], onDelete: Cascade)
    mentorId    String      // clickDoctorId do médico mentor
    mentorNome  String      // Cache do nome para exibição
    atribuidoPorId String
    atribuidoPor User       @relation(fields: [atribuidoPorId], references: [id])
    createdAt   DateTime    @default(now())

    @@unique([candidatoId, mentorId])
  }
  ```

  **Acceptance Criteria**:

  **Manual Execution Verification:**
  - [ ] Rodar `pnpm db:generate` → sem erros
  - [ ] Rodar `pnpm db:push` → "Your database is now in sync"
  - [ ] Abrir Prisma Studio (`pnpm db:studio`) → tabelas `Candidato`, `CandidatoTag`, `CandidatoHistorico`, `CandidatoAnexo`, `CandidatoMentor` visíveis

  **Commit**: YES
  - Message: `feat(db): add onboarding schema for candidate pipeline`
  - Files: `packages/db/prisma/schema/onboarding.prisma`
  - Pre-commit: `pnpm check-types`

---

- [x] 1. Criar Backend do Formulário (tRPC Router)

  **What to do**:
  - Criar arquivo `packages/api/src/routers/onboarding.ts`
  - Implementar `publicProcedure` para submissão do formulário (sem auth)
  - Validar unicidade de email e CRM
  - Criar registro em `Candidato`
  - Criar registro inicial em `CandidatoHistorico`
  - Fazer upload de arquivos via Vercel Blob (se enviados)
  - Disparar notificação de email para staff
  - Registrar na tabela `Auditoria`
  - Exportar router no `packages/api/src/root.ts`

  **Must NOT do**:
  - NÃO exigir autenticação (é formulário público)
  - NÃO criar User para o candidato

  **Parallelizable**: NO (depende de 0)

  **References**:

  **Pattern References**:
  - `packages/api/src/routers/auth.ts:15-50` - Exemplo de `publicProcedure` sem autenticação
  - `packages/api/src/routers/solicitacoes.ts:80-150` - Padrão de criação com auditoria

  **API/Type References**:
  - `packages/api/src/middleware/permissions.ts:1-30` - Definição de `publicProcedure`
  - `packages/db/src/index.ts` - Export do Prisma client

  **External References**:
  - Upload: `apps/web/src/app/api/upload/route.ts` - Padrão Vercel Blob

  **Input schema esperado**:
  ```typescript
  const submitCandidaturaInput = z.object({
    nome: z.string().min(3),
    email: z.string().email(),
    telefone: z.string().min(10),
    crmNumero: z.string().regex(/^\d{4,6}$/),
    crmEstado: z.string().length(2),
    especialidades: z.array(z.string()).min(1),
    experiencia: z.string().min(50),
    disponibilidade: z.string().min(20),
    comoConheceu: z.enum(['google', 'indicacao', 'linkedin', 'instagram', 'outro']),
    comoConheceuOutro: z.string().optional(),
    anexos: z.array(z.object({
      nome: z.string(),
      url: z.string().url(),
      tipo: z.string(),
      tamanho: z.number()
    })).optional()
  });
  ```

  **Acceptance Criteria**:

  **Manual Execution Verification:**
  - [ ] Request: `curl -X POST http://localhost:3000/api/trpc/onboarding.submitCandidatura -H "Content-Type: application/json" -d '{"json":{"nome":"Dr. Teste","email":"teste@email.com","telefone":"11999999999","crmNumero":"12345","crmEstado":"SP","especialidades":["Clínica Geral"],"experiencia":"10 anos de experiência em...","disponibilidade":"Segunda a sexta, manhã e tarde","comoConheceu":"indicacao"}}'`
  - [ ] Response status: 200
  - [ ] Response body contains: `{"result":{"data":{"id":"...","nome":"Dr. Teste"}}}`
  - [ ] Verificar no Prisma Studio: registro criado em `Candidato` com `estagio: candidato`
  - [ ] Verificar no Prisma Studio: registro criado em `CandidatoHistorico` com `acao: CRIADO`
  - [ ] Tentar criar novamente com mesmo email → erro de duplicata

  **Commit**: YES
  - Message: `feat(api): add public candidatura submission endpoint`
  - Files: `packages/api/src/routers/onboarding.ts`, `packages/api/src/root.ts`
  - Pre-commit: `pnpm check-types`

---

- [x] 2. Criar Frontend do Formulário Público

  **What to do**:
  - Criar página `apps/web/src/app/(public)/candidatura/page.tsx`
  - Criar layout `apps/web/src/app/(public)/layout.tsx` (sem sidebar, público)
  - Implementar formulário com TanStack Form
  - Validação client-side com Zod
  - Upload de arquivos com Vercel Blob
  - Página de sucesso após submissão
  - Seguir FRONTEND_GUIDELINES.md (sem sombras, cores da marca)

  **Must NOT do**:
  - NÃO adicionar header/sidebar do dashboard
  - NÃO exigir login

  **Parallelizable**: NO (depende de 1)

  **References**:

  **Pattern References**:
  - `apps/web/src/components/sign-up-form.tsx` - Padrão de formulário com TanStack Form
  - `apps/web/src/app/(auth)/layout.tsx` - Layout sem sidebar

  **API/Type References**:
  - `apps/web/src/lib/api.ts` - Cliente tRPC para chamadas

  **Documentation References**:
  - `docs/FRONTEND_GUIDELINES.md:92-110` - Padrões visuais obrigatórios

  **Estrutura de arquivos**:
  ```
  apps/web/src/app/(public)/
  ├── layout.tsx           # Layout limpo sem dashboard
  └── candidatura/
      ├── page.tsx         # Formulário
      └── sucesso/
          └── page.tsx     # Página de confirmação
  ```

  **Acceptance Criteria**:

  **Manual Execution Verification:**
  - [ ] Usando Playwright:
    - Navegar para: `http://localhost:3000/candidatura`
    - Verificar: Formulário visível, sem sidebar/header do dashboard
    - Preencher todos os campos obrigatórios
    - Clicar em "Enviar Candidatura"
    - Verificar: Redirecionado para `/candidatura/sucesso`
    - Verificar: Mensagem de sucesso exibida
  - [ ] Tentar submeter com campos vazios → erros de validação exibidos
  - [ ] Tentar submeter com email inválido → erro específico

  **Commit**: YES
  - Message: `feat(web): add public candidatura form page`
  - Files: `apps/web/src/app/(public)/**`
  - Pre-commit: `pnpm check-types`

---

- [x] 3. Implementar Notificação de Email para Staff

  **What to do**:
  - Adicionar função `enviarEmailNovoCandidato` em `packages/api/src/services/email.service.ts`
  - Criar template HTML seguindo padrão existente (header verde, layout responsivo)
  - Adicionar entrada em `ConfigSistema` para emails destinatários
  - Chamar notificação no endpoint de submissão (async, com .catch)

  **Must NOT do**:
  - NÃO enviar email para o candidato
  - NÃO bloquear submissão se email falhar

  **Parallelizable**: YES (com 4)

  **References**:

  **Pattern References**:
  - `packages/api/src/services/email.service.ts:227-248` - `enviarEmailCancelamentoParaStaff` como modelo
  - `packages/api/src/services/email.service.ts:50-100` - `buildEmailHtml` para template

  **API/Type References**:
  - `packages/env/src/server.ts:20-30` - Variáveis RESEND_API_KEY e EMAIL_FROM

  **Template esperado**:
  ```
  Assunto: Novo Candidato - {nome}
  
  Corpo:
  - Nome: {nome}
  - Email: {email}
  - CRM: {crmNumero}-{crmEstado}
  - Especialidades: {especialidades}
  - Como conheceu: {comoConheceu}
  
  Link: {url para o kanban}
  ```

  **Acceptance Criteria**:

  **Manual Execution Verification:**
  - [ ] Configurar email de teste em ConfigSistema (via Prisma Studio)
  - [ ] Submeter candidatura via formulário
  - [ ] Verificar inbox: email recebido com dados do candidato
  - [ ] Verificar: link no email direciona para o Kanban

  **Commit**: YES
  - Message: `feat(api): add email notification for new candidates`
  - Files: `packages/api/src/services/email.service.ts`
  - Pre-commit: `pnpm check-types`

---

### FASE 2: Kanban Base

---

- [x] 4. Criar Backend do Kanban (tRPC Procedures)

  **What to do**:
  - Adicionar procedures em `packages/api/src/routers/onboarding.ts`:
    - `listarCandidatos` - Lista todos com filtros (estágio, status, busca)
    - `getCandidato` - Detalhes de um candidato
    - `moverEstagio` - Move candidato entre estágios (forward-only)
    - `rejeitarCandidato` - Rejeita com motivo obrigatório
  - Todas as mutations devem criar registro em `CandidatoHistorico`
  - Usar `staffProcedure` para proteger endpoints

  **Must NOT do**:
  - NÃO permitir mover para estágio anterior
  - NÃO permitir rejeitar sem motivo

  **Parallelizable**: YES (com 3)

  **References**:

  **Pattern References**:
  - `packages/api/src/routers/medico.ts:50-150` - Padrão de listagem com filtros
  - `packages/api/src/routers/solicitacoes.ts:200-280` - Padrão de mutations com auditoria

  **API/Type References**:
  - `packages/api/src/middleware/permissions.ts:40-60` - `staffProcedure`

  **Validação de fluxo**:
  ```typescript
  const ORDEM_ESTAGIOS = ['candidato', 'entrevista', 'treinamento', 'ativo', 'performance'];
  
  function validarTransicao(de: string, para: string): boolean {
    const indexDe = ORDEM_ESTAGIOS.indexOf(de);
    const indexPara = ORDEM_ESTAGIOS.indexOf(para);
    return indexPara === indexDe + 1; // Só pode avançar um estágio
  }
  ```

  **Acceptance Criteria**:

  **Manual Execution Verification:**
  - [ ] (Autenticado como staff) Request: `curl -X POST .../onboarding.listarCandidatos` → lista de candidatos
  - [ ] Request: `curl -X POST .../onboarding.moverEstagio {"candidatoId":"...","para":"entrevista"}` → sucesso
  - [ ] Request: `curl -X POST .../onboarding.moverEstagio {"candidatoId":"...","para":"candidato"}` → erro "não pode voltar"
  - [ ] Request: `curl -X POST .../onboarding.rejeitarCandidato {"candidatoId":"..."}` → erro "motivo obrigatório"
  - [ ] Request: `curl -X POST .../onboarding.rejeitarCandidato {"candidatoId":"...","motivo":"CRM inválido"}` → sucesso

  **Commit**: YES
  - Message: `feat(api): add kanban backend procedures for candidates`
  - Files: `packages/api/src/routers/onboarding.ts`
  - Pre-commit: `pnpm check-types`

---

- [x] 5. Criar UI Base do Kanban

  **What to do**:
  - Criar página `apps/web/src/app/(dashboard)/dashboard/onboarding/page.tsx`
  - Implementar layout de 5 colunas (estágios) + "Rejeitados" (com filtro)
  - Implementar cards de candidato com: nome, data registro, tempo no estágio, tags
  - Implementar barra de filtros: busca por nome, toggle ganhos/perdidos
  - Usar componentes existentes (Card, Badge)
  - Seguir FRONTEND_GUIDELINES.md

  **Must NOT do**:
  - NÃO implementar drag-drop ainda (próxima task)
  - NÃO abrir drawer ainda (próxima task)

  **Parallelizable**: NO (depende de 4)

  **References**:

  **Pattern References**:
  - `apps/web/src/app/(dashboard)/dashboard/medicos/page.tsx:300-400` - Padrão de listagem com filtros
  - `apps/web/src/components/ui/card.tsx` - Componente Card base

  **Documentation References**:
  - `docs/FRONTEND_GUIDELINES.md` - Cores, espaçamento, sem sombras

  **Layout esperado**:
  ```
  ┌─────────────────────────────────────────────────────────────┐
  │ [Busca por nome...] [Toggle: Mostrar rejeitados]            │
  ├─────────────────────────────────────────────────────────────┤
  │ Candidatos │ Entrevista │ Treinamento │ Ativo │ Performance │
  │ (45)       │ (32)       │ (28)        │ (22)  │ (18)        │
  │ ┌────────┐ │ ┌────────┐ │             │       │             │
  │ │ Card 1 │ │ │ Card 2 │ │             │       │             │
  │ └────────┘ │ └────────┘ │             │       │             │
  │ ┌────────┐ │            │             │       │             │
  │ │ Card 2 │ │            │             │       │             │
  │ └────────┘ │            │             │       │             │
  └─────────────────────────────────────────────────────────────┘
  ```

  **Acceptance Criteria**:

  **Manual Execution Verification:**
  - [ ] Usando Playwright:
    - Navegar para: `http://localhost:3000/dashboard/onboarding` (logado como staff)
    - Verificar: 5 colunas visíveis com contadores
    - Verificar: Cards de candidatos nas colunas corretas
    - Digitar no campo de busca → cards filtrados
    - Ativar "Mostrar rejeitados" → coluna/cards de rejeitados aparecem

  **Commit**: YES
  - Message: `feat(web): add kanban board UI for onboarding`
  - Files: `apps/web/src/app/(dashboard)/dashboard/onboarding/page.tsx`
  - Pre-commit: `pnpm check-types`

---

- [x] 6. Implementar Drawer de Detalhes do Candidato

  **What to do**:
  - Criar componente `CandidatoDrawer` usando Sheet
  - Implementar tabs: Dados, Entrevista, Treinamento, Ativação, Histórico
  - Tab Dados: informações do formulário, observações gerais, arquivos
  - Tab Histórico: timeline de todas as ações
  - Botão de rejeitar sempre visível
  - Abrir drawer ao clicar no card

  **Must NOT do**:
  - NÃO implementar formulário de entrevista ainda (task 9)
  - NÃO implementar seleção de mentores ainda (task 10)

  **Parallelizable**: NO (depende de 5)

  **References**:

  **Pattern References**:
  - `apps/web/src/app/(dashboard)/dashboard/medicos/page.tsx:1404-1532` - DoctorDetailDrawer como modelo
  - `apps/web/src/components/ui/sheet.tsx` - Componente Sheet base

  **Estrutura do Drawer**:
  ```
  ┌──────────────────────────────────────┐
  │ Dr. Nome do Candidato         [X]    │
  │ CRM: 12345-SP | Clínica Geral        │
  │ Estágio: Entrevista | 5 dias         │
  ├──────────────────────────────────────┤
  │ [Dados] [Entrevista] [Treino] [Hist] │
  ├──────────────────────────────────────┤
  │ (Conteúdo da tab selecionada)        │
  │                                      │
  │                                      │
  ├──────────────────────────────────────┤
  │            [Rejeitar Candidato]      │
  └──────────────────────────────────────┘
  ```

  **Acceptance Criteria**:

  **Manual Execution Verification:**
  - [ ] Usando Playwright:
    - Clicar em um card de candidato → drawer abre da direita
    - Verificar: Nome, CRM, especialidade exibidos
    - Verificar: Tabs funcionam (Dados, Histórico)
    - Tab Histórico: timeline com eventos
    - Botão Rejeitar visível

  **Commit**: YES
  - Message: `feat(web): add candidate detail drawer with tabs`
  - Files: `apps/web/src/app/(dashboard)/dashboard/onboarding/CandidatoDrawer.tsx`
  - Pre-commit: `pnpm check-types`

---

- [ ] 7. Implementar Drag-and-Drop no Kanban

  **What to do**:
  - Implementar drag-drop com React Aria DND (`@react-aria/dnd`)
  - Permitir arrastar cards entre colunas
  - Validar transição no client-side (só forward)
  - Chamar `moverEstagio` ao soltar
  - Atualizar UI otimisticamente
  - Mostrar feedback visual durante arraste

  **Must NOT do**:
  - NÃO pedir confirmação ao soltar (decisão do usuário)
  - NÃO permitir arrastar para coluna anterior

  **Parallelizable**: NO (depende de 6)

  **References**:

  **Pattern References**:
  - `apps/web/src/components/untitled/base/select/multi-select.tsx` - Uso de React Aria no projeto

  **External References**:
  - React Aria DND: https://react-spectrum.adobe.com/react-aria/dnd.html

  **Feedback visual**:
  - Card sendo arrastado: opacity 0.5, outline destacado
  - Coluna destino válida: background levemente verde
  - Coluna destino inválida: background levemente vermelho, cursor not-allowed

  **Acceptance Criteria**:

  **Manual Execution Verification:**
  - [ ] Usando Playwright:
    - Arrastar card de "Candidatos" para "Entrevista" → card move, API chamada
    - Verificar: CandidatoHistorico registra a movimentação
    - Tentar arrastar de "Entrevista" para "Candidatos" → não permite (feedback visual)
    - Arrastar card rejeitado → não permite

  **Commit**: YES
  - Message: `feat(web): add drag-and-drop to kanban board`
  - Files: `apps/web/src/app/(dashboard)/dashboard/onboarding/page.tsx`
  - Pre-commit: `pnpm check-types`

---

- [ ] 8. Implementar Sistema de Tags

  **What to do**:
  - Adicionar procedures no backend: `adicionarTag`, `removerTag`
  - Criar componente de input de tags no drawer
  - Tags são strings livres (sem lista predefinida)
  - Exibir tags nos cards do Kanban
  - Registrar ação em CandidatoHistorico

  **Must NOT do**:
  - NÃO criar sistema de cores para tags
  - NÃO criar categorias/hierarquia de tags

  **Parallelizable**: YES (com 9, 10, 11, 12)

  **References**:

  **Pattern References**:
  - `apps/web/src/components/untitled/base/select/multi-select.tsx:267` - Renderização de tags
  - `apps/web/src/components/untitled/base/tags/base-components/tag-close-x.tsx` - Botão X para remover

  **Acceptance Criteria**:

  **Manual Execution Verification:**
  - [ ] Abrir drawer de candidato
  - [ ] Digitar tag "VIP" e pressionar Enter → tag adicionada
  - [ ] Tag aparece no card do Kanban
  - [ ] Clicar no X da tag → tag removida
  - [ ] Verificar CandidatoHistorico: ações TAG_ADICIONADA e TAG_REMOVIDA

  **Commit**: YES
  - Message: `feat: add tag system for candidates`
  - Files: `packages/api/src/routers/onboarding.ts`, `apps/web/.../CandidatoDrawer.tsx`
  - Pre-commit: `pnpm check-types`

---

### FASE 3: Features dos Estágios

---

- [ ] 9. Implementar Tab de Entrevista

  **What to do**:
  - Criar formulário na tab "Entrevista" do drawer
  - Campos: Nota (1-5), Observações, Checklist de critérios, Entrevistador, Resultado
  - Checklist: CRM válido, Experiência adequada, Disponibilidade compatível, Perfil de comunicação, Conhecimento técnico
  - Adicionar procedure `salvarEntrevista` no backend
  - Registrar em CandidatoHistorico

  **Must NOT do**:
  - NÃO adicionar agendamento de entrevista
  - NÃO bloquear movimentação se entrevista não preenchida

  **Parallelizable**: YES (com 8, 10, 11, 12)

  **References**:

  **Pattern References**:
  - `apps/web/src/components/config/tabs/StrikesTab.tsx` - Formulário de configuração com checklist

  **Acceptance Criteria**:

  **Manual Execution Verification:**
  - [ ] Abrir drawer de candidato em "Entrevista"
  - [ ] Tab Entrevista: preencher nota, observações, marcar checkboxes, selecionar entrevistador, resultado
  - [ ] Salvar → dados persistidos
  - [ ] Reabrir drawer → dados carregados
  - [ ] CandidatoHistorico: ENTREVISTA_REGISTRADA

  **Commit**: YES
  - Message: `feat: add interview form in candidate drawer`
  - Files: `packages/api/src/routers/onboarding.ts`, `apps/web/.../CandidatoDrawer.tsx`
  - Pre-commit: `pnpm check-types`

---

- [ ] 10. Implementar Tab de Treinamento

  **What to do**:
  - Criar formulário na tab "Treinamento" do drawer
  - Campo de busca para selecionar médicos mentores (lista de médicos ativos)
  - Exibir mentores atribuídos com opção de remover
  - Campos de data início e data fim do treinamento
  - Adicionar procedures: `atribuirMentor`, `removerMentor`, `salvarDataseTreinamento`

  **Must NOT do**:
  - NÃO filtrar mentores por P1/P2 (qualquer médico ativo pode ser mentor)
  - NÃO adicionar critérios de conclusão

  **Parallelizable**: YES (com 8, 9, 11, 12)

  **References**:

  **Pattern References**:
  - `apps/web/src/app/(dashboard)/dashboard/medicos/page.tsx:500-600` - Busca de médicos

  **Busca de médicos ativos**:
  ```typescript
  // Query para médicos ativos do Click
  const medicosAtivos = await clickReplica.query(`
    SELECT d.id, d.name, d.speciality
    FROM doctors d
    WHERE d.priority > 0
      AND d.name IS NOT NULL
      AND d.name NOT ILIKE '%teste%'
    ORDER BY d.name
  `);
  ```

  **Acceptance Criteria**:

  **Manual Execution Verification:**
  - [ ] Mover candidato para "Treinamento"
  - [ ] Abrir drawer, tab Treinamento
  - [ ] Buscar médico por nome → lista de sugestões
  - [ ] Selecionar médico → adicionado como mentor
  - [ ] Preencher data início/fim
  - [ ] Salvar → dados persistidos
  - [ ] CandidatoMentor: registro criado
  - [ ] CandidatoHistorico: MENTOR_ATRIBUIDO

  **Commit**: YES
  - Message: `feat: add training tab with mentor assignment`
  - Files: `packages/api/src/routers/onboarding.ts`, `apps/web/.../CandidatoDrawer.tsx`
  - Pre-commit: `pnpm check-types`

---

- [ ] 11. Implementar Ativação (Conexão com doctor_id)

  **What to do**:
  - Criar tab "Ativação" no drawer (visível apenas no estágio Ativo)
  - Campo de busca para encontrar médico no Click por nome
  - Exibir detalhes do médico encontrado (nome, CRM, especialidade)
  - Ao confirmar, salvar `clickDoctorId` no candidato
  - Bloquear movimentação para "Ativo" sem `doctor_id`
  - Adicionar procedure `ativarCandidato`

  **Must NOT do**:
  - NÃO criar médico automaticamente no Click
  - NÃO validar se médico já tem outro candidato vinculado

  **Parallelizable**: YES (com 8, 9, 10, 12)

  **References**:

  **Pattern References**:
  - `packages/db/src/click-replica.ts` - Queries para o banco Click

  **Query para buscar médico**:
  ```typescript
  const medico = await clickReplica.query(`
    SELECT d.id, d.name, d.crm, d.speciality
    FROM doctors d
    WHERE LOWER(d.name) LIKE LOWER($1)
      AND d.priority > 0
    LIMIT 10
  `, [`%${busca}%`]);
  ```

  **Acceptance Criteria**:

  **Manual Execution Verification:**
  - [ ] Tentar arrastar candidato para "Ativo" sem doctor_id → bloqueado, mensagem de erro
  - [ ] Abrir drawer de candidato em "Treinamento"
  - [ ] Tab Ativação: buscar médico por nome → resultados do Click
  - [ ] Selecionar médico → detalhes exibidos
  - [ ] Confirmar ativação → `clickDoctorId` salvo
  - [ ] Arrastar para "Ativo" → sucesso
  - [ ] CandidatoHistorico: ATIVADO

  **Commit**: YES
  - Message: `feat: add activation flow with doctor_id connection`
  - Files: `packages/api/src/routers/onboarding.ts`, `apps/web/.../CandidatoDrawer.tsx`
  - Pre-commit: `pnpm check-types`

---

- [ ] 12. Implementar Fluxo de Rejeição

  **What to do**:
  - Implementar modal de rejeição (ao clicar no botão)
  - Campo obrigatório para motivo da rejeição
  - Ao confirmar, candidato vai para status `rejeitado`
  - Candidatos rejeitados ficam ocultos por padrão
  - Toggle "Mostrar rejeitados" exibe em coluna separada ou inline

  **Must NOT do**:
  - NÃO permitir rejeitar sem motivo
  - NÃO permitir "desfazer" rejeição

  **Parallelizable**: YES (com 8, 9, 10, 11)

  **References**:

  **Pattern References**:
  - `apps/web/src/components/ui/dialog.tsx` - Modal base

  **Acceptance Criteria**:

  **Manual Execution Verification:**
  - [ ] Abrir drawer de candidato
  - [ ] Clicar "Rejeitar" → modal abre
  - [ ] Tentar confirmar sem motivo → erro
  - [ ] Preencher motivo e confirmar → candidato rejeitado
  - [ ] Card some do Kanban
  - [ ] Ativar "Mostrar rejeitados" → card reaparece (marcado como rejeitado)
  - [ ] CandidatoHistorico: REJEITADO com motivo

  **Commit**: YES
  - Message: `feat: add rejection flow with required reason`
  - Files: `packages/api/src/routers/onboarding.ts`, `apps/web/.../CandidatoDrawer.tsx`
  - Pre-commit: `pnpm check-types`

---

### FASE 4: Finalização

---

- [ ] 13. Integrar com Sistema de Auditoria

  **What to do**:
  - Garantir que todas as ações criam registro na tabela `Auditoria`
  - Ações: CANDIDATO_CRIADO, CANDIDATO_MOVIDO, CANDIDATO_REJEITADO, CANDIDATO_ATIVADO, MENTOR_ATRIBUIDO, TAG_ADICIONADA, etc.
  - Usar entidade "candidato" e entidadeId com o ID do candidato
  - Incluir dadosAntes e dadosDepois para mudanças de estado

  **Must NOT do**:
  - NÃO criar dashboard de auditoria (já existe)

  **Parallelizable**: NO (depende de 0-12)

  **References**:

  **Pattern References**:
  - `packages/api/src/routers/solicitacoes.ts:150-180` - Padrão de registro de auditoria

  **Ações a auditar**:
  ```typescript
  type AcaoOnboarding = 
    | 'CANDIDATO_CRIADO'
    | 'CANDIDATO_MOVIDO'
    | 'CANDIDATO_REJEITADO'
    | 'CANDIDATO_ATIVADO'
    | 'ENTREVISTA_REGISTRADA'
    | 'MENTOR_ATRIBUIDO'
    | 'MENTOR_REMOVIDO'
    | 'TAG_ADICIONADA'
    | 'TAG_REMOVIDA'
    | 'OBSERVACAO_ATUALIZADA';
  ```

  **Acceptance Criteria**:

  **Manual Execution Verification:**
  - [ ] Realizar cada ação no sistema (criar, mover, rejeitar, ativar, etc.)
  - [ ] Verificar tabela `Auditoria` no Prisma Studio
  - [ ] Cada ação tem registro com: usuarioId, acao, entidade="candidato", entidadeId, dadosAntes, dadosDepois, ip, userAgent

  **Commit**: YES
  - Message: `feat: integrate onboarding with audit system`
  - Files: `packages/api/src/routers/onboarding.ts`
  - Pre-commit: `pnpm check-types`

---

- [ ] 14. Teste de Integração End-to-End

  **What to do**:
  - Testar fluxo completo: Formulário → Kanban → Entrevista → Treinamento → Ativação → Performance
  - Verificar todos os registros de histórico e auditoria
  - Verificar email de notificação
  - Testar filtros e busca
  - Testar rejeição em diferentes estágios
  - Documentar bugs encontrados e corrigir

  **Must NOT do**:
  - NÃO criar testes automatizados

  **Parallelizable**: NO (integração final)

  **References**:

  **Checklist de teste**:
  ```
  [ ] Formulário público acessível sem login
  [ ] Candidato aparece no Kanban após submissão
  [ ] Email enviado para staff
  [ ] Drag-drop funciona (forward-only)
  [ ] Entrevista pode ser registrada
  [ ] Mentores podem ser atribuídos
  [ ] Ativação requer doctor_id
  [ ] Rejeição requer motivo
  [ ] Rejeitados ficam arquivados
  [ ] Timeline mostra todas as ações
  [ ] Auditoria completa
  [ ] Tags funcionam
  [ ] Busca por nome funciona
  [ ] Filtro ganhos/perdidos funciona
  ```

  **Acceptance Criteria**:

  **Manual Execution Verification:**
  - [ ] Usando Playwright, executar fluxo completo:
    1. Acessar `/candidatura` (sem login)
    2. Preencher e submeter formulário
    3. Verificar email recebido
    4. Login como staff, ir para `/dashboard/onboarding`
    5. Encontrar candidato na coluna "Candidatos"
    6. Arrastar para "Entrevista"
    7. Abrir drawer, preencher entrevista
    8. Arrastar para "Treinamento"
    9. Atribuir mentor
    10. Preencher datas
    11. Buscar e conectar doctor_id
    12. Arrastar para "Ativo"
    13. Verificar timeline completa
    14. Testar rejeição de outro candidato
  - [ ] Verificar Auditoria: todas as ações registradas

  **Commit**: YES
  - Message: `fix: address issues found in e2e testing`
  - Files: (conforme bugs encontrados)
  - Pre-commit: `pnpm check-types`

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 0 | `feat(db): add onboarding schema for candidate pipeline` | `packages/db/prisma/schema/onboarding.prisma` | `pnpm db:generate && pnpm check-types` |
| 1 | `feat(api): add public candidatura submission endpoint` | `packages/api/src/routers/onboarding.ts`, `packages/api/src/root.ts` | `pnpm check-types` |
| 2 | `feat(web): add public candidatura form page` | `apps/web/src/app/(public)/**` | `pnpm check-types` |
| 3 | `feat(api): add email notification for new candidates` | `packages/api/src/services/email.service.ts` | `pnpm check-types` |
| 4 | `feat(api): add kanban backend procedures for candidates` | `packages/api/src/routers/onboarding.ts` | `pnpm check-types` |
| 5 | `feat(web): add kanban board UI for onboarding` | `apps/web/src/app/(dashboard)/dashboard/onboarding/page.tsx` | `pnpm check-types` |
| 6 | `feat(web): add candidate detail drawer with tabs` | `apps/web/.../CandidatoDrawer.tsx` | `pnpm check-types` |
| 7 | `feat(web): add drag-and-drop to kanban board` | `apps/web/.../onboarding/page.tsx` | `pnpm check-types` |
| 8 | `feat: add tag system for candidates` | `packages/api/...`, `apps/web/...` | `pnpm check-types` |
| 9 | `feat: add interview form in candidate drawer` | `packages/api/...`, `apps/web/...` | `pnpm check-types` |
| 10 | `feat: add training tab with mentor assignment` | `packages/api/...`, `apps/web/...` | `pnpm check-types` |
| 11 | `feat: add activation flow with doctor_id connection` | `packages/api/...`, `apps/web/...` | `pnpm check-types` |
| 12 | `feat: add rejection flow with required reason` | `packages/api/...`, `apps/web/...` | `pnpm check-types` |
| 13 | `feat: integrate onboarding with audit system` | `packages/api/src/routers/onboarding.ts` | `pnpm check-types` |
| 14 | `fix: address issues found in e2e testing` | (conforme necessário) | `pnpm check-types && pnpm build` |

---

## Success Criteria

### Verification Commands
```bash
pnpm check-types        # Expected: No errors
pnpm build              # Expected: Build successful
pnpm db:generate        # Expected: Prisma client generated
```

### Final Checklist
- [ ] Formulário público funciona sem autenticação
- [ ] Kanban exibe 5 colunas com candidatos corretos
- [ ] Drag-drop move candidatos (forward-only)
- [ ] Drawer mostra todas as informações e permite edição
- [ ] Entrevista pode ser registrada com checklist
- [ ] Mentores podem ser atribuídos no treinamento
- [ ] Ativação requer e salva doctor_id
- [ ] Rejeição requer motivo e arquiva candidato
- [ ] Email é enviado para staff configurado
- [ ] Todas as ações são auditadas
- [ ] Timeline mostra histórico completo
- [ ] Tags podem ser criadas/removidas livremente
- [ ] Filtros funcionam (busca, ganhos/perdidos)
- [ ] Sem sombras, segue FRONTEND_GUIDELINES.md
