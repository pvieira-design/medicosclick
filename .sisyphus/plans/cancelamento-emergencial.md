# Cancelamento Emergencial - Work Plan

## Context

### Original Request
Implementar a logica completa de cancelamento emergencial para o sistema ClickMedicos, incluindo:
- Frontend dedicado para medicos solicitarem cancelamentos
- Ajustes no backend (strike opcional, validacao de 3 dias)
- Integracao com Click CRM para verificacao automatica de consultas
- Sistema de notificacoes via email

### Interview Summary

**Key Discussions**:
- Escopo: Frontend completo + Backend ajustes + Integracao Click + Notificacoes
- Verificacao: Automatica via Click API antes de permitir cancelamento
- Periodo: Apenas proximos 3 dias (hoje + 2)
- Strike: Opcional - staff sempre decide (sem padrao por categoria)
- Acao no Click: So fecha slots locais, consulta permanece para atendimento reagendar
- Emergencial de reposicao: NAO criar automaticamente
- Notificacoes: In-app + Email (medico, staff, paciente futuro)
- UI: Usar componentes Untitled UI

**Research Findings**:
- Backend ja implementado em `solicitacoes.ts` e `aprovacoes.ts`
- Frontend parcial: `CancelamentoModal.tsx` existe mas nao integrado
- Tela staff `/dashboard/cancelamentos` ja funciona
- Click integration: `temConsultaNoHorario` disponivel
- Email: Resend configurado em `.env.example`

---

## Work Objectives

### Core Objective
Criar fluxo completo onde medico solicita cancelamento emergencial via pagina dedicada, sistema verifica consultas automaticamente no Click, e staff aprova/rejeita com opcao de aplicar strike.

### Concrete Deliverables
- Pagina `/dashboard/cancelamento-emergencial` com grade de 3 dias
- Endpoint `verificarSlotsComConsultaEmLote` para verificacao batch
- Ajuste no `aprovarCancelamento` para strike opcional
- Validacao de periodo (3 dias) no `criarCancelamentoEmergencial`
- Servico de email com templates para notificacoes
- Campo `prepararReagendamento` no schema para futuro

### Definition of Done
- [ ] Medico consegue acessar pagina de cancelamento emergencial
- [ ] Sistema verifica automaticamente consultas no Click
- [ ] Apenas slots dos proximos 3 dias sao mostrados
- [ ] Staff consegue aprovar COM ou SEM strike
- [ ] Email enviado ao medico quando aprovado/rejeitado
- [ ] Email enviado ao staff quando nova solicitacao criada

### Must Have
- Pagina dedicada para medico com grade de slots
- Verificacao automatica de consultas no Click
- Restricao de 3 dias (hoje + 2)
- Strike opcional controlado pelo staff
- Notificacoes email funcionais

### Must NOT Have (Guardrails)
- NAO criar emergencial de reposicao automatico
- NAO cancelar consulta no Click (apenas fechar slot local)
- NAO implementar API de reagendamento de pacientes (V1 futura)
- NAO usar modal automatico ao fechar slot (pagina dedicada)
- NAO adicionar notificacao WhatsApp
- NAO alterar logica de faixas P1-P5

---

## Verification Strategy (MANDATORY)

### Test Decision
- **Infrastructure exists**: YES (bun test disponivel via packages)
- **User wants tests**: Manual verification prioritaria
- **Framework**: Manual QA + tRPC procedures testing

### Manual QA Protocol

Cada TODO inclui verificacao manual detalhada:

**Para Frontend/UI changes:**
- Usar Playwright browser automation
- Screenshots como evidencia

**Para API/Backend changes:**
- Usar tRPC client para testar mutations
- Verificar banco de dados via Prisma Studio

**Para Integracoes:**
- Logs de request/response
- Verificar sincronizacao com Click

---

## Task Flow

```
[1] Schema Prisma (campo prepararReagendamento)
         |
[2] Backend validacao 3 dias + [3] Backend verificacao batch
         |                              |
         +------------+-----------------+
                      |
                  [4] Backend strike opcional
                      |
                  [5] Servico de Email
                      |
         +------------+-----------------+
         |                              |
[6] Frontend pagina medico    [7] Frontend ajuste tela staff
         |                              |
         +------------+-----------------+
                      |
                  [8] Testes manuais E2E
```

## Parallelization

| Group | Tasks | Reason |
|-------|-------|--------|
| A | 2, 3 | Validacoes backend independentes |
| B | 6, 7 | Frontend independentes apos backend |

| Task | Depends On | Reason |
|------|------------|--------|
| 4 | 2, 3 | Precisa das validacoes antes |
| 5 | - | Independente |
| 6 | 4, 5 | Precisa backend completo |
| 7 | 4 | Precisa strike opcional |
| 8 | 6, 7 | Testes apos implementacao |

---

## TODOs

### - [ ] 1. Ajustar Schema Prisma para preparacao futura

**What to do**:
- Adicionar campo `prepararReagendamento` ao model `CancelamentoEmergencial`
- Campo booleano opcional para marcar se consulta precisa reagendamento
- Rodar `pnpm db:generate` para atualizar cliente Prisma

**Must NOT do**:
- NAO criar tabela separada para reagendamento
- NAO adicionar relacionamentos complexos

**Parallelizable**: NO (base para outros)

**References**:

**Pattern References**:
- `packages/db/prisma/schema/app.prisma:155-186` - Model CancelamentoEmergencial atual

**Acceptance Criteria**:

- [ ] Campo `prepararReagendamento Boolean? @default(false)` adicionado
- [ ] `pnpm db:generate` executa sem erros
- [ ] Prisma Studio mostra novo campo na tabela

**Commit**: YES
- Message: `feat(db): add prepararReagendamento field to CancelamentoEmergencial`
- Files: `packages/db/prisma/schema/app.prisma`
- Pre-commit: `pnpm db:generate`

---

### - [ ] 2. Implementar validacao de periodo (3 dias) no backend

**What to do**:
- Criar funcao `getDiasBloqueadosParaCancelamento()` que retorna dias permitidos
- Adicionar validacao no `criarCancelamentoEmergencial` para bloquear dias fora do range
- Retornar erro claro se medico tentar cancelar dia invalido

**Must NOT do**:
- NAO bloquear por horario especifico, apenas por dia da semana
- NAO validar faixa do medico (P1-P5 nao afeta cancelamento emergencial)

**Parallelizable**: YES (com task 3)

**References**:

**Pattern References**:
- `packages/api/src/routers/solicitacoes.ts:212-248` - Mutation criarCancelamentoEmergencial
- `docs/fluxos/cancelamento-emergencial.md:44-58` - Logica de dias bloqueados

**API/Type References**:
- `DiaSemana` enum: dom, seg, ter, qua, qui, sex, sab

**Documentation References**:
- `CLAUDE.md` - Regras de negocio do sistema

**Acceptance Criteria**:

- [ ] Funcao `getDiasBloqueadosParaCancelamento()` retorna array de dias permitidos
- [ ] Teste: Hoje quinta -> retorna ["qui", "sex", "sab"]
- [ ] Mutation rejeita slot de dia fora do range com mensagem clara
- [ ] Teste via tRPC client:
  ```typescript
  // Input com dia invalido (fora de 3 dias)
  // Expected: TRPCError com message contendo "proximos 3 dias"
  ```

**Commit**: YES
- Message: `feat(api): add 3-day restriction for emergency cancellation`
- Files: `packages/api/src/routers/solicitacoes.ts`

---

### - [ ] 3. Criar endpoint de verificacao de consultas em lote

**What to do**:
- Criar query `verificarSlotsComConsultaEmLote` no router de solicitacoes
- Recebe array de slots, retorna mapa indicando quais tem consulta
- Usar `clickQueries.temConsultaNoHorario` existente em paralelo

**Must NOT do**:
- NAO fazer queries sequenciais (usar Promise.all)
- NAO cachear resultado (sempre consultar Click em tempo real)

**Parallelizable**: YES (com task 2)

**References**:

**Pattern References**:
- `packages/api/src/routers/solicitacoes.ts:278-315` - Query verificarHorariosComConsulta (individual)
- `packages/db/src/click-replica.ts` - clickQueries.temConsultaNoHorario

**API/Type References**:
- Input: `{ slots: Array<{ diaSemana: DiaSemana, horario: string }> }`
- Output: `{ slotsComConsulta: Slot[], slotsSemConsulta: Slot[] }`

**Acceptance Criteria**:

- [ ] Query `verificarSlotsComConsultaEmLote` criada
- [ ] Aceita array de ate 50 slots
- [ ] Retorna em menos de 3 segundos para 20 slots
- [ ] Teste via tRPC client:
  ```typescript
  const result = await trpc.solicitacoes.verificarSlotsComConsultaEmLote.query({
    slots: [{ diaSemana: "seg", horario: "08:00" }, ...]
  })
  // result.slotsComConsulta e result.slotsSemConsulta definidos
  ```

**Commit**: YES
- Message: `feat(api): add batch slot consultation verification`
- Files: `packages/api/src/routers/solicitacoes.ts`

---

### - [ ] 4. Ajustar aprovarCancelamento para strike opcional

**What to do**:
- Adicionar campo `aplicarStrike: boolean` no input da mutation
- Remover `strikeAplicado: true` automatico
- Condicionar incremento de strikes ao valor de `aplicarStrike`
- Atualizar auditoria para registrar decisao de strike

**Must NOT do**:
- NAO remover campo `strikeAplicado` do model (manter para historico)
- NAO alterar logica de rejeicao (nao aplica strike)

**Parallelizable**: NO (depende de 2, 3)

**References**:

**Pattern References**:
- `packages/api/src/routers/aprovacoes.ts:375-465` - Mutation aprovarCancelamento atual
- `packages/db/prisma/schema/auth.prisma` - User.strikes field

**Acceptance Criteria**:

- [ ] Input aceita `aplicarStrike: z.boolean()`
- [ ] Se `aplicarStrike: true`: incrementa strikes e marca `strikeAplicado: true`
- [ ] Se `aplicarStrike: false`: NAO incrementa strikes, marca `strikeAplicado: false`
- [ ] Auditoria registra: `{ strikeAplicado: boolean, strikeAntes: number, strikeDepois: number }`
- [ ] Teste via tRPC:
  ```typescript
  // Aprovar SEM strike
  await trpc.aprovacoes.aprovarCancelamento.mutate({
    cancelamentoId: "...",
    aplicarStrike: false
  })
  // Verificar: medico.strikes NAO incrementou
  ```

**Commit**: YES
- Message: `feat(api): make strike optional on cancellation approval`
- Files: `packages/api/src/routers/aprovacoes.ts`

---

### - [ ] 5. Implementar servico de notificacao por email

**What to do**:
- Criar `packages/api/src/services/email.service.ts`
- Usar Resend SDK para envio
- Criar templates: `cancelamentoSolicitado`, `cancelamentoAprovado`, `cancelamentoRejeitado`
- Integrar com `notificarCancelamentoCriado`, `notificarCancelamentoAprovado`, `notificarCancelamentoRejeitado`

**Must NOT do**:
- NAO implementar email para paciente (apenas preparar estrutura)
- NAO usar HTML complexo (texto simples ou template basico)

**Parallelizable**: YES (independente)

**References**:

**Pattern References**:
- `packages/api/src/services/notification.service.ts` - Servico de notificacao existente
- `apps/web/.env.example:42-43` - RESEND_API_KEY e EMAIL_FROM configurados

**External References**:
- Resend SDK: `https://resend.com/docs/send-with-nodejs`

**Acceptance Criteria**:

- [ ] Arquivo `email.service.ts` criado com funcoes exportadas
- [ ] Template `cancelamentoSolicitado` envia para staff
- [ ] Template `cancelamentoAprovado` envia para medico
- [ ] Template `cancelamentoRejeitado` envia para medico com motivo
- [ ] Teste manual: criar cancelamento -> verificar email recebido
- [ ] Graceful fallback se RESEND_API_KEY nao configurada (log warning, nao quebra)

**Commit**: YES
- Message: `feat(api): add email notification service for cancellations`
- Files: `packages/api/src/services/email.service.ts`, `packages/api/src/services/notification.service.ts`

---

### - [ ] 6. Criar pagina de cancelamento emergencial para medico

**What to do**:
- Criar `/dashboard/cancelamento-emergencial/page.tsx`
- Usar componentes Untitled UI (buttons, badges, select, etc)
- Grade mostrando proximos 3 dias com filtro por dia
- Chamar `verificarSlotsComConsultaEmLote` ao carregar
- Destacar slots que tem consulta (vermelho/amarelo)
- Formulario com: slots selecionados, motivo (select), descricao (textarea)
- Chamar `criarCancelamentoEmergencial` ao submeter

**Must NOT do**:
- NAO mostrar slots alem dos proximos 3 dias
- NAO permitir selecionar slot sem consulta (ou avisar que nao precisa emergencial)
- NAO usar modal (pagina dedicada)

**Parallelizable**: YES (com task 7, apos backend)

**References**:

**Pattern References**:
- `apps/web/src/components/horarios/CancelamentoModal.tsx` - UI de referencia para formulario
- `apps/web/src/app/(dashboard)/dashboard/solicitar/page.tsx` - Padrao de pagina de solicitacao
- `apps/web/src/components/untitled/` - Componentes Untitled UI

**API/Type References**:
- `trpc.solicitacoes.verificarSlotsComConsultaEmLote` - Verificacao de consultas
- `trpc.solicitacoes.criarCancelamentoEmergencial` - Criacao de cancelamento
- `trpc.medico.meusHorarios` - Horarios do medico

**Documentation References**:
- `docs/FRONTEND_GUIDELINES.md` - Padroes visuais
- `docs/fluxos/cancelamento-emergencial.md:219-227` - Estados visuais da grade

**Acceptance Criteria**:

- [ ] Rota `/dashboard/cancelamento-emergencial` acessivel para medico
- [ ] Grade mostra apenas proximos 3 dias (hoje, amanha, depois)
- [ ] Filtro por dia funciona (tabs ou botoes)
- [ ] Slots com consulta destacados visualmente (badge "Tem consulta")
- [ ] Selecao de multiplos slots funciona
- [ ] Select de motivo com opcoes: Doenca, Emergencia Familiar, Compromisso Medico, Problema Tecnico, Outro
- [ ] Textarea para descricao opcional
- [ ] Botao "Solicitar Cancelamento" desabilitado ate selecionar motivo
- [ ] Loading state durante submissao
- [ ] Toast de sucesso/erro apos submissao
- [ ] Redirect para /dashboard apos sucesso

**Manual Verification:**
- [ ] Playwright: Navegar para pagina, selecionar slot, preencher formulario, submeter
- [ ] Screenshot: Estado inicial da grade
- [ ] Screenshot: Slot selecionado + formulario preenchido
- [ ] Screenshot: Toast de sucesso

**Commit**: YES
- Message: `feat(web): add emergency cancellation page for doctors`
- Files: `apps/web/src/app/(dashboard)/dashboard/cancelamento-emergencial/page.tsx`

---

### - [ ] 7. Ajustar tela de staff para strike opcional

**What to do**:
- Adicionar checkbox "Aplicar Strike" no dialog de aprovacao
- Checkbox marcado por padrao
- Passar `aplicarStrike` para mutation
- Atualizar mensagem de confirmacao baseado na escolha

**Must NOT do**:
- NAO alterar fluxo de rejeicao
- NAO remover alerta sobre strikes

**Parallelizable**: YES (com task 6, apos task 4)

**References**:

**Pattern References**:
- `apps/web/src/app/(dashboard)/dashboard/cancelamentos/cancelamentos-client.tsx:286-317` - Dialog de aprovacao atual
- `apps/web/src/components/untitled/base/checkbox/checkbox.tsx` - Checkbox Untitled UI

**Acceptance Criteria**:

- [ ] Checkbox "Aplicar Strike ao Medico" visivel no dialog de aprovacao
- [ ] Checkbox marcado por padrao (checked={true} initial)
- [ ] Mensagem muda: 
  - Com strike: "Confirmar e Aplicar Strike"
  - Sem strike: "Confirmar sem Strike"
- [ ] Mutation chamada com `aplicarStrike: boolean`
- [ ] Toast de sucesso reflete decisao: "aprovado com/sem strike"

**Manual Verification:**
- [ ] Playwright: Abrir dialog aprovacao, desmarcar checkbox, aprovar
- [ ] Verificar no banco: medico.strikes NAO incrementou
- [ ] Screenshot: Dialog com checkbox desmarcado

**Commit**: YES
- Message: `feat(web): add optional strike checkbox to cancellation approval`
- Files: `apps/web/src/app/(dashboard)/dashboard/cancelamentos/cancelamentos-client.tsx`

---

### - [ ] 8. Adicionar link no menu lateral

**What to do**:
- Adicionar item "Cancelamento Emergencial" no sidebar para medicos
- Usar icone apropriado (AlertTriangle ou similar)
- Posicionar abaixo de "Meus Horarios" ou similar

**Must NOT do**:
- NAO mostrar para usuarios que nao sao medicos

**Parallelizable**: NO (apos task 6)

**References**:

**Pattern References**:
- `apps/web/src/components/sidebar.tsx:104` - Estrutura de menu items

**Acceptance Criteria**:

- [ ] Item "Cancelamento Emergencial" visivel no menu para medicos
- [ ] Icone AlertTriangle ou Siren usado
- [ ] Link aponta para `/dashboard/cancelamento-emergencial`
- [ ] Item NAO aparece para staff/admin

**Commit**: YES (agrupa com task 6)
- Message: included in task 6 commit
- Files: `apps/web/src/components/sidebar.tsx`

---

### - [ ] 9. Testes manuais E2E completos

**What to do**:
- Testar fluxo completo: medico solicita -> staff aprova/rejeita
- Verificar emails enviados
- Verificar notificacoes in-app
- Verificar sincronizacao com Click
- Testar edge cases: dia invalido, sem consulta, etc

**Must NOT do**:
- NAO pular verificacao de email
- NAO ignorar erros de sincronizacao Click

**Parallelizable**: NO (final)

**References**:

**Documentation References**:
- `docs/fluxos/cancelamento-emergencial.md` - Fluxo completo documentado

**Acceptance Criteria**:

**Fluxo Feliz - Aprovacao COM Strike:**
- [ ] Medico acessa /dashboard/cancelamento-emergencial
- [ ] Sistema carrega horarios dos proximos 3 dias
- [ ] Sistema marca slots com consulta (verificacao Click)
- [ ] Medico seleciona slot com consulta
- [ ] Medico preenche motivo "Doenca" + descricao
- [ ] Medico clica "Solicitar Cancelamento"
- [ ] Toast sucesso aparece
- [ ] Email enviado para staff
- [ ] Staff acessa /dashboard/cancelamentos
- [ ] Solicitacao aparece na lista
- [ ] Staff clica "Aprovar"
- [ ] Dialog mostra checkbox "Aplicar Strike" (marcado)
- [ ] Staff confirma
- [ ] Cancelamento aprovado
- [ ] Slot fechado no banco local
- [ ] Strike incrementado no medico
- [ ] Email enviado para medico
- [ ] Notificacao in-app criada

**Fluxo Feliz - Aprovacao SEM Strike:**
- [ ] Staff desmarca checkbox "Aplicar Strike"
- [ ] Staff confirma
- [ ] Cancelamento aprovado
- [ ] Slot fechado
- [ ] Strike NAO incrementado

**Fluxo Feliz - Rejeicao:**
- [ ] Staff clica "Rejeitar"
- [ ] Preenche motivo
- [ ] Cancelamento rejeitado
- [ ] Slot permanece aberto
- [ ] Email enviado para medico com motivo

**Edge Cases:**
- [ ] Tentar cancelar dia fora dos 3 dias -> Erro claro
- [ ] Selecionar slot sem consulta -> Aviso ou bloqueio
- [ ] Click offline -> Graceful fallback com aviso
- [ ] Email nao configurado -> Log warning, fluxo continua

**Commit**: NO (apenas documentacao de testes)

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 1 | `feat(db): add prepararReagendamento field` | app.prisma | pnpm db:generate |
| 2 | `feat(api): add 3-day restriction` | solicitacoes.ts | tRPC test |
| 3 | `feat(api): add batch verification` | solicitacoes.ts | tRPC test |
| 4 | `feat(api): make strike optional` | aprovacoes.ts | tRPC test |
| 5 | `feat(api): add email service` | email.service.ts, notification.service.ts | manual email test |
| 6+8 | `feat(web): add emergency cancellation page` | page.tsx, sidebar.tsx | Playwright |
| 7 | `feat(web): add optional strike checkbox` | cancelamentos-client.tsx | Playwright |

---

## Success Criteria

### Verification Commands
```bash
# Verificar schema
pnpm db:generate

# Verificar tipos
pnpm check-types

# Iniciar dev
pnpm dev

# Abrir Prisma Studio para verificar dados
pnpm db:studio
```

### Final Checklist
- [ ] Medico consegue solicitar cancelamento emergencial via pagina dedicada
- [ ] Sistema verifica consultas automaticamente no Click
- [ ] Apenas proximos 3 dias permitidos
- [ ] Staff consegue aprovar com ou sem strike
- [ ] Emails enviados corretamente (staff e medico)
- [ ] Notificacoes in-app funcionando
- [ ] Nenhum erro de tipo (check-types passa)
- [ ] UI usa componentes Untitled UI
- [ ] Campo prepararReagendamento disponivel para futuro
