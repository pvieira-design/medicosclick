# Formulários para Médicos - Detalhes Pessoais e Satisfação Mensal

## Context

### Original Request
Implementar dois formulários para médicos:
1. **Detalhes Pessoais** - informações para presentear médicos (tamanho camisa, endereço, hobbies, etc.)
2. **Satisfação Mensal** - feedback sobre o mês anterior com NPS e sugestões

### Interview Summary

**Key Discussions:**

- **Formulário de Detalhes Pessoais:**
  - Campos: camisa, endereço (campos separados), hobbies, aniversário, calçado, pets, cor favorita, destino viagem, esporte, marca roupa
  - Sempre editável pelo médico
  - NÃO obrigatório - apenas notificação persistente
  - Todos os médicos existentes devem receber notificação para preencher

- **Formulário de Satisfação Mensal:**
  - Perguntas NPS 0-10: qualidade suporte equipe, ferramentas/sistema
  - Campo texto: sugestões de melhoria
  - Respostas identificadas (não anônimas)
  - NÃO obrigatório - apenas notificação persistente
  - Janela: primeiros 15 dias do mês
  - Histórico completo guardado

- **Dashboard:**
  - Nova tab "Satisfação" na página de Analytics existente
  - Conteúdo: NPS geral, NPS por categoria, gráfico evolução, pendentes, sugestões

**Research Findings:**
- Projeto usa TanStack Form + Zod para formulários
- Dialog usa `@base-ui/react/dialog` (não Radix)
- Email já funciona via Resend (`packages/api/src/services/email.service.ts`)
- Sistema de notificações existe (`Notificacao` model + página)
- Analytics não tem tabs atualmente - é página única
- Não existe página de perfil do médico

### Metis Review

**Identified Gaps (addressed):**
- Mecanismo de bloqueio → Definido como NÃO bloqueante, apenas notificação
- Detecção de primeiro preenchimento → Checar existência de registro `MedicoDetalhesPessoais`
- Timezone → Usar `America/Sao_Paulo` (padrão do projeto)
- CEP lookup → NÃO implementar (manual entry apenas)
- Tamanhos → BR (P/M/G/GG para camisa, 34-46 para calçado)

---

## Work Objectives

### Core Objective
Criar sistema de formulários para coletar informações pessoais dos médicos (para presentes) e feedback mensal de satisfação, com dashboard integrado para visualização de métricas NPS.

### Concrete Deliverables
1. Modelos Prisma: `MedicoDetalhesPessoais`, `SatisfacaoMensal`
2. tRPC routers: endpoints para CRUD dos formulários
3. Componentes: Modal de detalhes pessoais, Modal de satisfação
4. Sistema de notificação: Banner + email para pendentes
5. Tab "Satisfação" na página Analytics com métricas NPS
6. Cron job para disparo mensal de email

### Definition of Done
- [x] Médico consegue preencher/editar detalhes pessoais via modal
- [x] Médico consegue responder pesquisa de satisfação mensal
- [x] Staff vê notificação de quem tem pendências
- [x] Tab de Satisfação mostra NPS, gráficos e listas de pendentes
- [x] Email é enviado automaticamente no dia 1 de cada mês

### Must Have
- Formulário de detalhes pessoais com todos os 10 campos definidos
- Formulário de satisfação com 2 perguntas NPS + 1 campo texto
- Notificação persistente para médicos com pendências
- Dashboard com métricas agregadas
- Histórico completo de respostas de satisfação

### Must NOT Have (Guardrails)
- ❌ Integração com Click CRM
- ❌ Relatórios exportáveis (PDF/Excel)
- ❌ Lembretes automáticos de re-envio
- ❌ Bloqueio de acesso (formulários são opcionais)
- ❌ Auto-complete de CEP (entrada manual)
- ❌ Respostas anônimas
- ❌ Testes automatizados (verificação manual)

---

## Verification Strategy (MANDATORY)

### Test Decision
- **Infrastructure exists**: NO
- **User wants tests**: Manual-only
- **Framework**: none

### Manual QA Approach
Cada TODO inclui procedimentos detalhados de verificação manual usando browser (Playwright para UI) e comandos shell para backend.

---

## Task Flow

```
1. Schema Prisma
       ↓
2. tRPC Routers ──────────────────┐
       ↓                          │
3. Modal Detalhes Pessoais        │
       ↓                          │
4. Modal Satisfação               │
       ↓                          ↓
5. Sistema de Notificação ←───── 6. Tab Analytics (paralelo com 5)
       ↓
7. Cron Job Email
       ↓
8. Verificação Final
```

## Parallelization

| Group | Tasks | Reason |
|-------|-------|--------|
| A | 5, 6 | Notificação e Tab Analytics são independentes após routers prontos |

| Task | Depends On | Reason |
|------|------------|--------|
| 2 | 1 | Routers precisam dos models Prisma |
| 3, 4 | 2 | Modais consomem endpoints tRPC |
| 5 | 2 | Notificação consulta dados via tRPC |
| 6 | 2 | Tab consome endpoints de métricas |
| 7 | 5 | Cron usa mesmo serviço de notificação |

---

## TODOs

- [x] 1. Criar modelos Prisma para formulários

  **What to do**:
  - Criar model `MedicoDetalhesPessoais` com campos: tamanhoCamisa, cep, rua, numero, complemento, bairro, cidade, estado, hobbies, dataAniversario, tamanhoCalcado, pets, corFavorita, destinoViagem, esportePratica, marcaRoupa
  - Criar model `SatisfacaoMensal` com campos: mesReferencia (YYYY-MM), npsSuporte (0-10), npsFerramentas (0-10), sugestoes (text), respondidoEm
  - Ambos com relação `userId` para User
  - Adicionar índice único em SatisfacaoMensal para (userId, mesReferencia)
  - Rodar `pnpm db:push` para aplicar schema

  **Must NOT do**:
  - Não criar campos para Click CRM
  - Não adicionar campos de arquivo/upload

  **Parallelizable**: NO (primeiro passo)

  **References**:

  **Pattern References**:
  - `packages/db/prisma/schema/app.prisma:MedicoConfig` - Padrão de model relacionado a médico
  - `packages/db/prisma/schema/auth.prisma:User` - Model User para relação

  **Acceptance Criteria**:

  **Manual Execution Verification:**
  - [ ] `pnpm db:push` → Executa sem erros
  - [ ] `pnpm db:studio` → Abrir Prisma Studio, verificar tabelas MedicoDetalhesPessoais e SatisfacaoMensal existem
  - [ ] Verificar campos corretos nas tabelas

  **Commit**: YES
  - Message: `feat(db): add MedicoDetalhesPessoais and SatisfacaoMensal models`
  - Files: `packages/db/prisma/schema/app.prisma`

---

- [x] 2. Criar tRPC routers para formulários

  **What to do**:
  - Criar router `formularios.ts` em `packages/api/src/routers/`
  - Endpoints para DetalhesPessoais:
    - `getDetalhesPessoais` (medicoProcedure) - retorna dados do médico logado
    - `upsertDetalhesPessoais` (medicoProcedure) - cria ou atualiza
    - `getDetalhesPessoaisByMedico` (staffProcedure) - staff consulta por medicoId
    - `listarMedicosSemDetalhes` (staffProcedure) - lista quem não preencheu
  - Endpoints para Satisfação:
    - `getSatisfacaoAtual` (medicoProcedure) - retorna se já respondeu este mês
    - `responderSatisfacao` (medicoProcedure) - salva resposta (valida se dentro dos 15 dias)
    - `getHistoricoSatisfacao` (medicoProcedure) - histórico do próprio médico
    - `listarMedicosPendentes` (staffProcedure) - quem não respondeu este mês
  - Endpoints para Dashboard:
    - `getNpsGeral` (staffProcedure) - média geral
    - `getNpsPorCategoria` (staffProcedure) - médias separadas
    - `getEvolucaoNps` (staffProcedure) - dados para gráfico mensal
    - `getSugestoesRecentes` (staffProcedure) - últimas sugestões
  - Registrar router no `_app.ts`
  - Criar schemas Zod para validação de inputs

  **Must NOT do**:
  - Não criar endpoints de export PDF/Excel
  - Não adicionar lógica de bloqueio

  **Parallelizable**: NO (depende do schema Prisma)

  **References**:

  **Pattern References**:
  - `packages/api/src/routers/medico.ts` - Padrão de router com medicoProcedure
  - `packages/api/src/routers/analytics.ts` - Padrão de endpoints de métricas
  - `packages/api/src/middleware/permissions.ts:medicoProcedure` - Procedure para médicos
  - `packages/api/src/middleware/permissions.ts:staffProcedure` - Procedure para staff

  **API/Type References**:
  - `packages/db/prisma/schema/app.prisma:MedicoDetalhesPessoais` - Schema do model
  - `packages/db/prisma/schema/app.prisma:SatisfacaoMensal` - Schema do model

  **Acceptance Criteria**:

  **Manual Execution Verification:**
  - [ ] `pnpm check-types` → Sem erros de tipo
  - [ ] `pnpm dev` → Servidor inicia sem erros
  - [ ] Testar endpoints via Prisma Studio + tRPC panel (se disponível) ou curl

  **Commit**: YES
  - Message: `feat(api): add formularios router with detalhes pessoais and satisfacao endpoints`
  - Files: `packages/api/src/routers/formularios.ts`, `packages/api/src/routers/_app.ts`

---

- [x] 3. Criar modal de Detalhes Pessoais

  **What to do**:
  - Criar componente `DetalhesPessoaisModal.tsx` em `apps/web/src/components/formularios/`
  - Usar `Dialog` de `@base-ui/react/dialog` (NÃO radix)
  - Implementar formulário com TanStack Form + Zod
  - Campos organizados em seções:
    - **Vestimenta**: tamanhoCamisa (select P/M/G/GG/XG), tamanhoCalcado (select 34-46), marcaRoupa (input)
    - **Endereço**: CEP, rua, número, complemento, bairro, cidade, estado (select UFs)
    - **Pessoal**: dataAniversario (date picker), hobbies (textarea), pets (textarea), corFavorita (input), destinoViagem (input), esportePratica (input)
  - Carregar dados existentes se já preencheu
  - Submit via mutation `upsertDetalhesPessoais`
  - Toast de sucesso/erro com sonner
  - Adicionar trigger para abrir modal na área do médico

  **Must NOT do**:
  - Não implementar busca de CEP automática
  - Não bloquear navegação se não preencheu

  **Parallelizable**: NO (depende do router)

  **References**:

  **Pattern References**:
  - `apps/web/src/app/(public)/candidatura/page.tsx:CandidaturaForm` - Padrão completo de formulário TanStack Form + Zod
  - `apps/web/src/components/ui/dialog.tsx` - Componente Dialog base-ui

  **UI Component References**:
  - `apps/web/src/components/ui/input.tsx` - Input component
  - `apps/web/src/components/ui/select.tsx` - Select component
  - `apps/web/src/components/ui/textarea.tsx` - Textarea component
  - `apps/web/src/components/ui/button.tsx` - Button component

  **Acceptance Criteria**:

  **Manual Execution Verification:**
  - [ ] Usando Playwright browser automation:
    - Navegar para dashboard do médico
    - Clicar no trigger para abrir modal
    - Preencher todos os campos
    - Clicar em Salvar
    - Verificar toast de sucesso
    - Reabrir modal e verificar dados persistidos
  - [ ] `pnpm check-types` → Sem erros

  **Commit**: YES
  - Message: `feat(web): add DetalhesPessoaisModal component with form`
  - Files: `apps/web/src/components/formularios/DetalhesPessoaisModal.tsx`

---

- [x] 4. Criar modal de Satisfação Mensal

  **What to do**:
  - Criar componente `SatisfacaoModal.tsx` em `apps/web/src/components/formularios/`
  - Usar `Dialog` de `@base-ui/react/dialog`
  - Implementar formulário com TanStack Form + Zod
  - Campos:
    - NPS Suporte (0-10) - slider ou botões numerados
    - NPS Ferramentas (0-10) - slider ou botões numerados
    - Sugestões (textarea, opcional)
  - Validar se está dentro da janela de 15 dias
  - Se já respondeu este mês, mostrar resumo (não permitir edição)
  - Submit via mutation `responderSatisfacao`
  - Toast de sucesso/erro

  **Must NOT do**:
  - Não permitir resposta anônima
  - Não permitir edição após envio
  - Não permitir resposta fora da janela de 15 dias

  **Parallelizable**: NO (depende do router)

  **References**:

  **Pattern References**:
  - `apps/web/src/app/(public)/candidatura/page.tsx` - Padrão de formulário
  - `apps/web/src/app/(dashboard)/dashboard/onboarding/components/interview-form.tsx` - Padrão de avaliação numérica

  **UI Component References**:
  - `apps/web/src/components/ui/slider.tsx` - Se existir, para NPS visual
  - `apps/web/src/components/ui/button.tsx` - Para botões de seleção NPS

  **Acceptance Criteria**:

  **Manual Execution Verification:**
  - [ ] Usando Playwright browser automation:
    - Navegar para dashboard do médico
    - Abrir modal de satisfação
    - Verificar se mostra mês de referência correto
    - Selecionar NPS para suporte (ex: 8)
    - Selecionar NPS para ferramentas (ex: 9)
    - Preencher sugestão (opcional)
    - Clicar em Enviar
    - Verificar toast de sucesso
    - Reabrir modal e verificar que mostra "já respondido"
  - [ ] Testar fora da janela de 15 dias → modal deve informar que está fechado

  **Commit**: YES
  - Message: `feat(web): add SatisfacaoModal component with NPS form`
  - Files: `apps/web/src/components/formularios/SatisfacaoModal.tsx`

---

- [x] 5. Implementar sistema de notificação para pendentes

  **What to do**:
  - Criar componente `FormulariosPendentesAlert.tsx` - banner/alert que aparece no dashboard
  - Verificar via tRPC se médico tem:
    - Detalhes pessoais não preenchidos
    - Satisfação do mês não respondida (se dentro da janela)
  - Exibir banner persistente com CTAs para abrir os modais
  - Estilo: usar cores de aviso (amber/yellow) do design system
  - Posicionar no topo do layout do médico ou na sidebar
  - Banner deve ser dismissível temporariamente (volta no próximo login)

  **Must NOT do**:
  - Não bloquear navegação
  - Não implementar re-envio automático de email

  **Parallelizable**: YES (com task 6)

  **References**:

  **Pattern References**:
  - `apps/web/src/app/(dashboard)/layout.tsx` - Layout onde adicionar o alert
  - `apps/web/src/components/ui/alert.tsx` - Se existir, componente de alert

  **Acceptance Criteria**:

  **Manual Execution Verification:**
  - [ ] Logar como médico SEM detalhes pessoais → ver banner "Complete seu perfil"
  - [ ] Logar como médico SEM satisfação do mês (dentro da janela) → ver banner "Responda a pesquisa"
  - [ ] Preencher formulários → banner desaparece
  - [ ] Logar como médico com tudo preenchido → sem banner

  **Commit**: YES
  - Message: `feat(web): add FormulariosPendentesAlert notification component`
  - Files: `apps/web/src/components/formularios/FormulariosPendentesAlert.tsx`, `apps/web/src/app/(dashboard)/layout.tsx`

---

- [x] 6. Criar tab "Satisfação" na página Analytics

  **What to do**:
  - Refatorar `apps/web/src/app/(dashboard)/dashboard/analytics/page.tsx` para usar sistema de tabs
  - Usar componente `Tabs` do shadcn/ui ou criar tabs customizadas
  - Tab 1: "Consultas" (conteúdo atual)
  - Tab 2: "Satisfação" (novo conteúdo):
    - Card: NPS Geral (média de todas as respostas)
    - Cards: NPS por categoria (Suporte, Ferramentas) - usar cores verde/amarelo/vermelho baseado no score
    - Gráfico de linha: Evolução do NPS mensal (últimos 12 meses)
    - Tabela: Médicos pendentes de satisfação (nome, último login, link para perfil)
    - Tabela: Médicos sem detalhes pessoais
    - Lista: Sugestões recentes (com data, médico se identificado, texto)
    - **NOVO: Botão "Reenviar Notificação"** para staff enviar email/notificação para médicos pendentes (individual ou em lote)
  - Usar endpoints de `formularios` router para dados
  - Manter DateRangePicker para filtrar dados de satisfação
  - Adicionar endpoint `reenviarNotificacaoSatisfacao` no router para ação de reenvio

  **Must NOT do**:
  - Não adicionar export PDF/Excel
  - Não mostrar dados de médicos inativos

  **Parallelizable**: YES (com task 5)

  **References**:

  **Pattern References**:
  - `apps/web/src/app/(dashboard)/dashboard/analytics/page.tsx` - Página atual a refatorar
  - `apps/web/src/components/untitled/application/charts/bar-charts.tsx` - Componente de gráfico existente

  **UI Component References**:
  - `apps/web/src/components/ui/tabs.tsx` - Componente Tabs se existir
  - `apps/web/src/components/ui/card.tsx` - Para cards de métricas
  - `apps/web/src/components/ui/table.tsx` - Para tabelas de pendentes

  **Acceptance Criteria**:

  **Manual Execution Verification:**
  - [ ] Usando Playwright browser automation:
    - Navegar para `/dashboard/analytics`
    - Verificar que existem 2 tabs: "Consultas" e "Satisfação"
    - Tab "Consultas" mostra conteúdo original
    - Clicar em "Satisfação"
    - Verificar card de NPS geral com número 0-10
    - Verificar cards de NPS por categoria
    - Verificar gráfico de evolução
    - Verificar lista de pendentes
    - Verificar lista de sugestões
  - [ ] Alterar DateRangePicker → dados de satisfação atualizam

  **Commit**: YES
  - Message: `feat(web): add Satisfacao tab to Analytics with NPS dashboard`
  - Files: `apps/web/src/app/(dashboard)/dashboard/analytics/page.tsx`, `apps/web/src/app/(dashboard)/dashboard/analytics/components/SatisfacaoTab.tsx`

---

- [x] 7. Criar cron job para email mensal de satisfação

  **What to do**:
  - Criar endpoint `apps/web/src/app/api/cron/satisfacao-mensal/route.ts`
  - Configurar para rodar no dia 1 de cada mês (via vercel.json)
  - Buscar todos os médicos ativos que não responderam ainda
  - Enviar email usando padrão do `email.service.ts`
  - Criar template de email:
    - Subject: "ClickMedicos - Sua opinião importa!"
    - Body: Link direto para responder a pesquisa
  - Criar notificação in-app para cada médico pendente

  **Must NOT do**:
  - Não implementar re-envio automático (apenas 1 email no dia 1)
  - Não enviar para médicos inativos

  **Parallelizable**: NO (depende de task 5)

  **References**:

  **Pattern References**:
  - `apps/web/src/app/api/cron/recalcular-scores/route.ts` - Padrão de cron job
  - `packages/api/src/services/email.service.ts` - Serviço de email
  - `vercel.json` - Configuração de cron

  **Acceptance Criteria**:

  **Manual Execution Verification:**
  - [ ] Curl para endpoint: `curl -X POST http://localhost:3001/api/cron/satisfacao-mensal`
  - [ ] Verificar logs no terminal → emails enviados listados
  - [ ] Verificar caixa de email de teste → email recebido
  - [ ] Verificar Prisma Studio → notificações criadas para médicos pendentes

  **Commit**: YES
  - Message: `feat(api): add monthly satisfaction survey cron job`
  - Files: `apps/web/src/app/api/cron/satisfacao-mensal/route.ts`, `vercel.json`

---

- [x] 8. Verificação final e ajustes

  **What to do**:
  - Testar fluxo completo como médico:
    1. Login → ver notificação de pendências
    2. Preencher detalhes pessoais
    3. Responder satisfação
    4. Verificar pendências desaparecem
  - Testar fluxo como staff:
    1. Acessar Analytics → tab Satisfação
    2. Verificar métricas corretas
    3. Verificar lista de pendentes atualiza
  - Verificar responsividade mobile
  - Ajustar qualquer bug encontrado

  **Must NOT do**:
  - Não adicionar features novas nesta task

  **Parallelizable**: NO (último passo)

  **References**:

  **Acceptance Criteria**:

  **Manual Execution Verification:**
  - [ ] Fluxo médico completo funciona sem erros
  - [ ] Fluxo staff completo funciona sem erros
  - [ ] Layout responsivo OK no mobile
  - [ ] `pnpm build` → Build de produção sem erros
  - [ ] `pnpm check-types` → Sem erros de tipo

  **Commit**: YES (se houver ajustes)
  - Message: `fix(web): adjust formularios UX based on testing`
  - Files: arquivos ajustados

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 1 | `feat(db): add MedicoDetalhesPessoais and SatisfacaoMensal models` | schema/app.prisma | pnpm db:push |
| 2 | `feat(api): add formularios router` | routers/formularios.ts, _app.ts | pnpm check-types |
| 3 | `feat(web): add DetalhesPessoaisModal` | components/formularios/ | pnpm check-types |
| 4 | `feat(web): add SatisfacaoModal` | components/formularios/ | pnpm check-types |
| 5 | `feat(web): add FormulariosPendentesAlert` | components/formularios/, layout.tsx | pnpm check-types |
| 6 | `feat(web): add Satisfacao tab to Analytics` | analytics/page.tsx, components/ | pnpm check-types |
| 7 | `feat(api): add monthly satisfaction cron job` | api/cron/, vercel.json | curl test |
| 8 | `fix(web): adjust formularios UX` | varied | pnpm build |

---

## Success Criteria

### Verification Commands
```bash
pnpm check-types    # Sem erros TypeScript
pnpm build          # Build produção OK
pnpm db:push        # Schema aplicado
```

### Final Checklist
- [x] Médico consegue preencher detalhes pessoais
- [x] Médico consegue responder satisfação mensal
- [x] Staff vê dashboard de NPS na tab Satisfação
- [x] Notificações aparecem para pendentes
- [x] Email é disparado via cron
- [x] Histórico de respostas é mantido
- [x] Nenhuma integração com Click CRM
- [x] Nenhum export PDF/Excel
- [x] Nenhum bloqueio de acesso
