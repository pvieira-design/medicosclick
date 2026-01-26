# Aprovacao Parcial de Cancelamento Emergencial

## Context

### Original Request
Atualizar a feature de cancelamento emergencial para:
1. Staff visualizar detalhes dos slots solicitados (expandir linha na tabela)
2. Staff aprovar/rejeitar individualmente por slot (aprovacao parcial)
3. Historico detalhado para medico e staff mostrando quais slots foram aprovados/rejeitados
4. Adicionar tabs/filtro de status na view staff para ver processados

### Interview Summary
**Key Discussions**:
- Strike: Manter logica atual (1 strike por aprovacao, checkbox no dialog)
- Motivo para slots rejeitados: Opcional (um motivo global, nao por slot)
- UI: Consistencia total com grade de solicitacoes de abertura
- Historico: Legenda de cores + slots coloridos (verde=aprovado, vermelho=rejeitado)
- Slots rejeitados: Permanecem ativos na agenda do medico
- View staff: Adicionar tabs/filtro para ver pendentes e processados

**Research Findings**:
- Padrao existente em `pendentes/page.tsx:203-463`: `SolicitacaoRow` com tabela expansivel
- Padrao existente em `pendentes/page.tsx:466-598`: `SelectableSlotsGrid` com selecao interativa
- Padrao existente em `solicitacoes/page.tsx:649-791`: `ExpandedRequestDetails` com cores por slot
- Modelo `Solicitacao` ja tem campos `slotsAprovados` e `slotsRejeitados` (replicar padrao)
- Endpoint `aprovarSolicitacao` aceita selecao parcial (replicar padrao)

### Metis Review
**Identified Gaps** (addressed):
- Slots rejeitados: Confirmado que permanecem ativos na agenda
- Filtro de status staff: Confirmado que deve adicionar tabs
- Edge case seleção vazia: Bloquear botao aprovar (require at least 1 slot)
- Edge case todos selecionados: `slotsRejeitados` sera array vazio `[]`

---

## Work Objectives

### Core Objective
Permitir aprovacao parcial de cancelamentos emergenciais pelo staff, com visualizacao detalhada por slot tanto na aprovacao quanto no historico.

### Concrete Deliverables
1. Schema atualizado com campos `slotsAprovados` e `slotsRejeitados` em `CancelamentoEmergencial`
2. Endpoint `aprovarCancelamento` aceitando selecao parcial de slots
3. View staff (`cancelamentos-client.tsx`) com tabela expansivel e grade de selecao
4. View staff com tabs para filtrar por status (pendente/aprovado/rejeitado)
5. Historico do medico (`ExpandedCancelamentoDetails`) com cores por slot
6. Notificacao atualizada para informar aprovacao parcial

### Definition of Done
- [ ] Staff consegue expandir linha e ver todos os slots solicitados
- [ ] Staff consegue selecionar/deselecionar slots individualmente
- [ ] Staff consegue aprovar apenas slots selecionados
- [ ] Slots rejeitados permanecem ativos na agenda do medico
- [ ] Medico ve historico com cores por slot (verde=aprovado, vermelho=rejeitado)
- [ ] Staff ve historico de cancelamentos processados com mesma visualizacao
- [ ] Build passa sem erros TypeScript

### Must Have
- Grade de selecao de slots identica ao padrao de solicitacoes de abertura
- Checkbox de strike no dialog de aprovacao
- Botao "Rejeitar Tudo" funciona como antes (rejeicao total)
- Legenda de cores na visualizacao expandida
- Tabs de filtro de status na view staff

### Must NOT Have (Guardrails)
- NAO alterar logica de strikes (manter 1 strike por aprovacao)
- NAO adicionar motivos individuais por slot (manter motivo global)
- NAO modificar fluxo de criacao de cancelamento pelo medico
- NAO adicionar override para cancelamentos
- NAO desativar slots rejeitados (devem permanecer ativos)
- NAO usar sombras (`box-shadow`, `shadow-*`) nos componentes

---

## Verification Strategy (MANDATORY)

### Test Decision
- **Infrastructure exists**: NO
- **User wants tests**: Manual verification
- **Framework**: N/A

### Manual QA Protocol
Cada TODO inclui procedimentos de verificacao manual detalhados:
- Executar app localmente (`pnpm dev`)
- Testar fluxos no browser (http://localhost:3005)
- Verificar dados no banco via Prisma Studio (`pnpm db:studio`)
- Executar `pnpm check-types` para validar TypeScript

---

## Task Flow

```
Task 1 (Schema) 
     |
     v
Task 2 (Endpoint Backend)
     |
     v
Task 3 (View Staff - Expansao) --> Task 4 (View Staff - Tabs) [paralelo]
     |
     v
Task 5 (Historico Medico)
     |
     v
Task 6 (Notificacao)
     |
     v
Task 7 (Verificacao Final)
```

## Parallelization

| Group | Tasks | Reason |
|-------|-------|--------|
| A | 3, 4 | Tasks 3 e 4 podem ser feitas em paralelo apos Task 2 |

| Task | Depends On | Reason |
|------|------------|--------|
| 2 | 1 | Endpoint precisa dos novos campos do schema |
| 3 | 2 | Frontend precisa do endpoint atualizado |
| 4 | 2 | Tabs usam mesmo endpoint com filtro |
| 5 | 2 | Historico precisa dos novos campos |
| 6 | 2 | Notificacao usa dados do endpoint |
| 7 | 3, 4, 5, 6 | Verificacao final de tudo |

---

## TODOs

- [ ] 1. Atualizar Schema do CancelamentoEmergencial

  **What to do**:
  - Adicionar campo `slotsAprovados Json?` no modelo `CancelamentoEmergencial`
  - Adicionar campo `slotsRejeitados Json?` no modelo `CancelamentoEmergencial`
  - Executar `pnpm db:push` para aplicar mudancas
  - Executar `pnpm db:generate` para regenerar cliente Prisma

  **Must NOT do**:
  - NAO alterar outros campos do modelo
  - NAO adicionar campos de motivo individual por slot

  **Parallelizable**: NO (primeira task, sem dependencias)

  **References**:

  **Pattern References** (existing code to follow):
  - `packages/db/prisma/schema/app.prisma:138-167` - Modelo `Solicitacao` que ja tem `slotsAprovados` e `slotsRejeitados` como padrao

  **File to Modify**:
  - `packages/db/prisma/schema/app.prisma:169-205` - Modelo `CancelamentoEmergencial`

  **Acceptance Criteria**:

  **Manual Execution Verification:**
  - [ ] Arquivo `app.prisma` modificado com novos campos
  - [ ] Executar: `pnpm db:push` → Exit code 0, sem erros
  - [ ] Executar: `pnpm db:generate` → Exit code 0, sem erros
  - [ ] Verificar em Prisma Studio (`pnpm db:studio`): tabela `cancelamento_emergencial` tem colunas `slotsAprovados` e `slotsRejeitados`

  **Evidence Required:**
  - [ ] Output do `pnpm db:push` sem erros
  - [ ] Campos visiveis no Prisma Studio

  **Commit**: YES
  - Message: `feat(db): add slotsAprovados and slotsRejeitados to CancelamentoEmergencial`
  - Files: `packages/db/prisma/schema/app.prisma`
  - Pre-commit: `pnpm check-types`

---

- [ ] 2. Atualizar Endpoint aprovarCancelamento para Aprovacao Parcial

  **What to do**:
  - Modificar input do endpoint para aceitar `slotsAprovados` e `slotsRejeitados` opcionais
  - Se nao fornecidos, manter comportamento atual (aprova todos os slots)
  - Atualizar logica para desativar APENAS slots aprovados em `MedicoHorario`
  - Salvar `slotsAprovados` e `slotsRejeitados` no registro do cancelamento
  - Atualizar auditoria para registrar slots aprovados e rejeitados
  - Manter logica de strike (checkbox `aplicarStrike`)

  **Must NOT do**:
  - NAO alterar endpoint `rejeitarCancelamento` (rejeicao total continua igual)
  - NAO desativar slots rejeitados (permanecem ativos)
  - NAO alterar logica de strike

  **Parallelizable**: NO (depende de Task 1)

  **References**:

  **Pattern References** (existing code to follow):
  - `packages/api/src/routers/aprovacoes.ts:59-165` - Endpoint `aprovarSolicitacao` como padrao para aprovacao parcial
  - `packages/api/src/routers/aprovacoes.ts:375-476` - Endpoint atual `aprovarCancelamento` a ser modificado

  **API/Type References**:
  - `packages/db/prisma/schema/app.prisma:13-16` - Schema `SlotSchema` com `diaSemana` e `horario`

  **File to Modify**:
  - `packages/api/src/routers/aprovacoes.ts:375-476`

  **Acceptance Criteria**:

  **Manual Execution Verification:**
  - [ ] Executar: `pnpm check-types` → Exit code 0, sem erros TypeScript
  - [ ] Usando Prisma Studio ou curl, criar um cancelamento pendente de teste com 3 slots
  - [ ] Chamar endpoint aprovando apenas 2 dos 3 slots
  - [ ] Verificar no banco: `slotsAprovados` tem 2 slots, `slotsRejeitados` tem 1 slot
  - [ ] Verificar em `medico_horario`: apenas os 2 slots aprovados tem `ativo = false`
  - [ ] Verificar em `auditoria`: registro mostra slots aprovados e rejeitados

  **Evidence Required:**
  - [ ] Output do `pnpm check-types` sem erros
  - [ ] Query no Prisma Studio mostrando campos preenchidos corretamente

  **Commit**: YES
  - Message: `feat(api): add partial approval support to aprovarCancelamento`
  - Files: `packages/api/src/routers/aprovacoes.ts`
  - Pre-commit: `pnpm check-types`

---

- [ ] 3. Transformar View Staff em Tabela Expansivel com Grade de Selecao

  **What to do**:
  - Transformar tabela atual em tabela expansivel (click na row expande)
  - Criar componente de grade de slots baseado em `SelectableSlotsGrid`
  - Implementar selecao/deselecao de slots individual
  - Adicionar botoes "Selecionar Todos" e "Limpar Selecao"
  - Atualizar dialog de aprovacao para mostrar contagem de selecionados/rejeitados
  - Manter checkbox de strike no dialog
  - Manter botao "Rejeitar Tudo" com comportamento atual

  **Must NOT do**:
  - NAO usar sombras (box-shadow)
  - NAO permitir aprovar com 0 slots selecionados (bloquear botao)
  - NAO alterar comportamento do "Rejeitar Tudo"

  **Parallelizable**: YES (com Task 4, ambas dependem de Task 2)

  **References**:

  **Pattern References** (existing code to follow):
  - `apps/web/src/app/(dashboard)/dashboard/pendentes/page.tsx:203-463` - `SolicitacaoRow` como padrao de row expansivel
  - `apps/web/src/app/(dashboard)/dashboard/pendentes/page.tsx:466-598` - `SelectableSlotsGrid` como padrao de grade de selecao
  - `apps/web/src/app/(dashboard)/dashboard/pendentes/page.tsx:336-413` - Dialogs de aprovacao e rejeicao

  **Component References**:
  - `apps/web/src/components/ui/table.tsx` - Componentes de tabela
  - `apps/web/src/components/ui/checkbox.tsx` - Checkbox para strike

  **File to Modify**:
  - `apps/web/src/app/(dashboard)/dashboard/cancelamentos/cancelamentos-client.tsx`

  **Acceptance Criteria**:

  **Manual Execution Verification:**
  - [ ] Acessar: `http://localhost:3005/dashboard/cancelamentos`
  - [ ] Clicar em uma row da tabela → row expande mostrando grade de slots
  - [ ] Clicar em slots individuais → toggle de selecao (amarelo/verde)
  - [ ] Clicar "Selecionar Todos" → todos os slots ficam verdes
  - [ ] Clicar "Limpar Selecao" → todos os slots ficam amarelos
  - [ ] Com 0 slots selecionados, botao "Aprovar" deve estar desabilitado
  - [ ] Clicar "Aprovar" → dialog mostra contagem correta e checkbox de strike
  - [ ] Confirmar aprovacao → cancelamento processado com sucesso
  - [ ] Executar: `pnpm check-types` → Exit code 0

  **Evidence Required:**
  - [ ] Screenshot da grade expandida com slots selecionaveis
  - [ ] Screenshot do dialog de confirmacao com contagem
  - [ ] Output do `pnpm check-types` sem erros

  **Commit**: YES
  - Message: `feat(web): add expandable slots grid to cancelamentos staff view`
  - Files: `apps/web/src/app/(dashboard)/dashboard/cancelamentos/cancelamentos-client.tsx`
  - Pre-commit: `pnpm check-types`

---

- [ ] 4. Adicionar Tabs de Filtro de Status na View Staff

  **What to do**:
  - Adicionar componente `Tabs` com opcoes: "Pendentes", "Aprovados", "Rejeitados"
  - Filtrar query `listarCancelamentos` por status selecionado
  - Manter contador de cada status visivel nas tabs
  - Cancelamentos processados (aprovados/rejeitados) tambem devem ser expansiveis

  **Must NOT do**:
  - NAO remover funcionalidade de aprovacao (so disponivel em "Pendentes")
  - NAO duplicar componentes desnecessariamente

  **Parallelizable**: YES (com Task 3, ambas dependem de Task 2)

  **References**:

  **Pattern References** (existing code to follow):
  - `apps/web/src/app/(dashboard)/dashboard/solicitacoes/page.tsx:103-136` - Padrao de Tabs com abertura/cancelamento

  **Component References**:
  - `apps/web/src/components/ui/tabs.tsx` - Componente de tabs

  **File to Modify**:
  - `apps/web/src/app/(dashboard)/dashboard/cancelamentos/cancelamentos-client.tsx`

  **Acceptance Criteria**:

  **Manual Execution Verification:**
  - [ ] Acessar: `http://localhost:3005/dashboard/cancelamentos`
  - [ ] Ver tabs: "Pendentes", "Aprovados", "Rejeitados"
  - [ ] Clicar em "Aprovados" → lista apenas cancelamentos aprovados
  - [ ] Clicar em "Rejeitados" → lista apenas cancelamentos rejeitados
  - [ ] Cancelamentos processados sao expansiveis e mostram slots com cores
  - [ ] Botoes de acao (Aprovar/Rejeitar) NAO aparecem em tabs de processados
  - [ ] Executar: `pnpm check-types` → Exit code 0

  **Evidence Required:**
  - [ ] Screenshot das tabs com diferentes status
  - [ ] Screenshot de cancelamento aprovado expandido mostrando slots coloridos

  **Commit**: YES
  - Message: `feat(web): add status tabs to cancelamentos staff view`
  - Files: `apps/web/src/app/(dashboard)/dashboard/cancelamentos/cancelamentos-client.tsx`
  - Pre-commit: `pnpm check-types`

---

- [ ] 5. Atualizar ExpandedCancelamentoDetails para Mostrar Status por Slot

  **What to do**:
  - Adicionar legenda de cores (Verde=Aprovado, Vermelho=Rejeitado, Amarelo=Pendente)
  - Renderizar cada slot com cor baseada em seu status
  - Para status "pendente": todos os slots amarelos
  - Para status "aprovado": slots em `slotsAprovados` verdes, slots em `slotsRejeitados` vermelhos
  - Para status "rejeitado": todos os slots vermelhos
  - Manter exibicao de motivo de rejeicao quando houver
  - Manter exibicao de strike aplicado

  **Must NOT do**:
  - NAO usar sombras nos badges de slots
  - NAO alterar outras partes do componente

  **Parallelizable**: NO (depende de Task 2 para testar)

  **References**:

  **Pattern References** (existing code to follow):
  - `apps/web/src/app/(dashboard)/dashboard/solicitacoes/page.tsx:649-791` - `ExpandedRequestDetails` como padrao de visualizacao com cores

  **File to Modify**:
  - `apps/web/src/app/(dashboard)/dashboard/solicitacoes/page.tsx:569-647` - `ExpandedCancelamentoDetails`

  **Acceptance Criteria**:

  **Manual Execution Verification:**
  - [ ] Acessar: `http://localhost:3005/dashboard/solicitacoes`
  - [ ] Clicar na tab "Cancelamento"
  - [ ] Expandir um cancelamento PENDENTE → todos os slots amarelos
  - [ ] Expandir um cancelamento APROVADO (parcial) → legenda de cores visivel, slots verdes e vermelhos
  - [ ] Expandir um cancelamento APROVADO (total) → todos os slots verdes
  - [ ] Expandir um cancelamento REJEITADO → todos os slots vermelhos, motivo de rejeicao visivel
  - [ ] Executar: `pnpm check-types` → Exit code 0

  **Evidence Required:**
  - [ ] Screenshot de cancelamento aprovado parcialmente com slots coloridos
  - [ ] Screenshot da legenda de cores

  **Commit**: YES
  - Message: `feat(web): add per-slot status colors to ExpandedCancelamentoDetails`
  - Files: `apps/web/src/app/(dashboard)/dashboard/solicitacoes/page.tsx`
  - Pre-commit: `pnpm check-types`

---

- [ ] 6. Atualizar Notificacao para Informar Aprovacao Parcial

  **What to do**:
  - Atualizar funcao `notificarCancelamentoAprovado` para aceitar info de aprovacao parcial
  - Se aprovacao parcial: mensagem indica "X de Y slots aprovados"
  - Se aprovacao total: manter mensagem atual

  **Must NOT do**:
  - NAO criar novos tipos de notificacao
  - NAO alterar outras funcoes de notificacao

  **Parallelizable**: NO (depende de Task 2)

  **References**:

  **Pattern References** (existing code to follow):
  - `packages/api/src/services/notification.service.ts` - Funcao `notificarSolicitacaoAprovada` que ja suporta info parcial

  **File to Modify**:
  - `packages/api/src/services/notification.service.ts` - Funcao `notificarCancelamentoAprovado`

  **Acceptance Criteria**:

  **Manual Execution Verification:**
  - [ ] Aprovar cancelamento parcialmente via UI staff
  - [ ] Verificar no banco (`notificacao` via Prisma Studio): mensagem contem "X de Y slots aprovados"
  - [ ] Executar: `pnpm check-types` → Exit code 0

  **Evidence Required:**
  - [ ] Query no Prisma Studio mostrando notificacao com mensagem de aprovacao parcial

  **Commit**: YES
  - Message: `feat(api): update cancelamento notification for partial approval`
  - Files: `packages/api/src/services/notification.service.ts`
  - Pre-commit: `pnpm check-types`

---

- [ ] 7. Verificacao Final e Integracao

  **What to do**:
  - Executar fluxo completo end-to-end
  - Verificar todos os cenarios de teste
  - Garantir build passa sem erros

  **Must NOT do**:
  - NAO fazer alteracoes de codigo nesta task (apenas verificacao)

  **Parallelizable**: NO (task final, depende de todas as anteriores)

  **References**: N/A

  **Acceptance Criteria**:

  **Manual Execution Verification (Fluxo Completo):**

  **Cenario 1: Aprovacao Parcial**
  - [ ] Como medico: criar cancelamento emergencial com 4 slots
  - [ ] Como staff: acessar `/dashboard/cancelamentos`
  - [ ] Staff: expandir cancelamento, selecionar apenas 2 slots
  - [ ] Staff: clicar "Aprovar", marcar strike, confirmar
  - [ ] Verificar: status = "aprovado", slotsAprovados = 2, slotsRejeitados = 2
  - [ ] Verificar: apenas 2 slots desativados em `medico_horario`
  - [ ] Como medico: verificar notificacao "2 de 4 slots aprovados"
  - [ ] Como medico: acessar `/dashboard/solicitacoes`, tab "Cancelamento"
  - [ ] Medico: expandir cancelamento → ver slots verdes (aprovados) e vermelhos (rejeitados)

  **Cenario 2: Aprovacao Total**
  - [ ] Criar cancelamento com 3 slots
  - [ ] Staff: selecionar TODOS os slots
  - [ ] Staff: aprovar → verificar todos os slots verdes no historico

  **Cenario 3: Rejeicao Total**
  - [ ] Criar cancelamento com 2 slots
  - [ ] Staff: clicar "Rejeitar Tudo" com motivo
  - [ ] Verificar: status = "rejeitado", todos os slots permanecem ativos
  - [ ] Medico: expandir no historico → todos os slots vermelhos

  **Cenario 4: Tabs de Status Staff**
  - [ ] Staff: acessar tab "Aprovados" → ver apenas cancelamentos aprovados
  - [ ] Staff: expandir cancelamento aprovado → ver slots com cores corretas
  - [ ] Staff: acessar tab "Rejeitados" → ver apenas cancelamentos rejeitados

  **Build e TypeScript:**
  - [ ] Executar: `pnpm check-types` → Exit code 0, sem erros
  - [ ] Executar: `pnpm build` → Exit code 0, sem erros

  **Evidence Required:**
  - [ ] Output do `pnpm check-types` sem erros
  - [ ] Output do `pnpm build` sem erros
  - [ ] Screenshots dos cenarios testados

  **Commit**: NO (task de verificacao, nao gera commits)

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 1 | `feat(db): add slotsAprovados and slotsRejeitados to CancelamentoEmergencial` | `packages/db/prisma/schema/app.prisma` | `pnpm db:push && pnpm db:generate` |
| 2 | `feat(api): add partial approval support to aprovarCancelamento` | `packages/api/src/routers/aprovacoes.ts` | `pnpm check-types` |
| 3 | `feat(web): add expandable slots grid to cancelamentos staff view` | `apps/web/.../cancelamentos-client.tsx` | `pnpm check-types` |
| 4 | `feat(web): add status tabs to cancelamentos staff view` | `apps/web/.../cancelamentos-client.tsx` | `pnpm check-types` |
| 5 | `feat(web): add per-slot status colors to ExpandedCancelamentoDetails` | `apps/web/.../solicitacoes/page.tsx` | `pnpm check-types` |
| 6 | `feat(api): update cancelamento notification for partial approval` | `packages/api/src/services/notification.service.ts` | `pnpm check-types` |

---

## Success Criteria

### Verification Commands
```bash
pnpm check-types  # Expected: Exit code 0, sem erros
pnpm build        # Expected: Exit code 0, sem erros
```

### Final Checklist
- [ ] All "Must Have" present
- [ ] All "Must NOT Have" absent
- [ ] Staff consegue aprovar parcialmente cancelamentos
- [ ] Historico mostra slots com cores por status
- [ ] Strike funciona como antes (checkbox no dialog)
- [ ] Rejeicao total funciona como antes
- [ ] Tabs de filtro funcionam na view staff
- [ ] Build passa sem erros
