# E2E Test Checklist - Funil de Onboarding

**Date**: 2026-01-24  
**Status**: Ready for Execution  
**Prerequisites**: Dev server running, test database seeded

---

## Pre-Test Setup

```bash
# Start dev server
pnpm dev

# Ensure test user exists with staff role
# Ensure ConfigSistema has email configured for notifications
```

---

## Critical Path Tests (Priority Order)

### 🔴 P0 - Core Flow (MUST PASS)

#### Test 1: Public Candidatura Form
- [ ] Navigate to `http://localhost:3000/candidatura` (NO login required)
- [ ] Form displays all required fields
- [ ] Fill form with test data:
  ```
  Nome: Dr. Teste E2E
  Email: teste-e2e-{timestamp}@example.com
  Telefone: 11999999999
  CRM: 12345
  Estado: SP
  Especialidades: ["Clínica Geral"]
  Experiência: (50+ characters)
  Disponibilidade: (20+ characters)
  Como Conheceu: Google
  ```
- [ ] Submit form → Success page appears
- [ ] **Verify in DB**: `SELECT * FROM candidato WHERE email = 'teste-e2e-...'`
  - estagio = 'candidato'
  - status = 'em_andamento'
  - Histórico has 'CRIADO' entry
  - Auditoria has 'CANDIDATO_CRIADO' entry

#### Test 2: Kanban Display
- [ ] Login as staff user
- [ ] Navigate to `/dashboard/onboarding`
- [ ] Verify: 5 columns visible (Candidatos, Entrevista, Treinamento, Ativo, Performance)
- [ ] Verify: Test candidate appears in "Candidatos" column
- [ ] Verify: Counter shows correct count

#### Test 3: Search & Filters
- [ ] Type candidate name in search → card filters correctly
- [ ] Clear search → all candidates reappear
- [ ] Toggle "Mostrar rejeitados" OFF → rejected candidates hidden
- [ ] Toggle "Mostrar rejeitados" ON → rejected candidates visible

#### Test 4: Drag-and-Drop (Forward Only)
- [ ] Drag candidate from "Candidatos" to "Entrevista"
- [ ] **Verify**: Card moves to new column
- [ ] **Verify**: Toast shows success message
- [ ] **Verify in DB**: `estagio = 'entrevista'`
- [ ] **Verify in DB**: CandidatoHistorico has 'ESTAGIO_ALTERADO' (de: candidato, para: entrevista)
- [ ] **Attempt**: Drag from "Entrevista" back to "Candidatos"
- [ ] **Expected**: Error toast "só é possível avançar etapas"
- [ ] **Verify**: Card stays in "Entrevista"

#### Test 5: Drawer - Dados Tab
- [ ] Click on candidate card → Drawer opens from right
- [ ] **Verify**: All personal info displays correctly
  - Nome, Email, Telefone
  - CRM/Estado
  - Especialidades
  - Experiência, Disponibilidade
- [ ] **Verify**: Status badge shows "Em Andamento"
- [ ] **Verify**: Creation date displays

#### Test 6: Tags System
- [ ] In drawer, find Tags section (Dados tab, bottom)
- [ ] Type "VIP" → Click "Adicionar"
- [ ] **Verify**: Tag appears in drawer with X button
- [ ] Close drawer → Reopen
- [ ] **Verify**: Tag persists
- [ ] **Verify**: Tag appears on candidate card in Kanban
- [ ] Click X on tag → Confirm removal
- [ ] **Verify in DB**: CandidatoHistorico has TAG_ADICIONADA and TAG_REMOVIDA entries

#### Test 7: Interview Form (P0 Fix Applied)
- [ ] Open drawer → Click "Entrevista" tab
- [ ] **Verify**: Form displays correctly
- [ ] **Verify**: Entrevistador dropdown is POPULATED (not empty) ✅ **FIXED**
- [ ] Fill form:
  - Nota: 4
  - Observações: "Boa entrevista, perfil adequado"
  - Check: CRM válido, Experiência adequada
  - Entrevistador: Select a staff user
  - Resultado: Aprovado
- [ ] Click "Salvar Entrevista"
- [ ] **Verify**: Success toast
- [ ] Close drawer → Reopen → Interview tab
- [ ] **Verify**: All data persists
- [ ] **Verify in DB**: `entrevistaRealizada = true`, `entrevistaNota = 4`, etc.

#### Test 8: Stage Transition to Treinamento
- [ ] Drag candidate from "Entrevista" to "Treinamento"
- [ ] **Verify**: Card moves
- [ ] **Verify in DB**: `estagio = 'treinamento'`

#### Test 9: Training Form - Mentor Assignment (P0 Fix Applied)
- [ ] Open drawer → Click "Treinamento" tab
- [ ] **Search for mentor**: Type "Dr" in search field
- [ ] **Verify**: Mentor suggestions appear (from Click database)
- [ ] Select a mentor from list
- [ ] **Verify**: Mentor appears in "Mentores Atribuídos" section
- [ ] Fill dates:
  - Data Início: (today)
  - Data Fim: (1 month from today)
- [ ] Click "Salvar"
- [ ] **Close drawer → Reopen → Training tab**
- [ ] **Verify**: Assigned mentor PERSISTS (doesn't disappear) ✅ **FIXED**
- [ ] **Verify**: Dates persist
- [ ] **Verify in DB**: CandidatoMentor row exists with correct mentorId

#### Test 10: Activation with doctor_id
- [ ] Drag candidate from "Treinamento" to "Ativo" WITHOUT activating
- [ ] **Expected**: Error (or blocked) - requires activation first
- [ ] Open drawer → Click "Ativação" tab
- [ ] Search for doctor: Type a name from Click database
- [ ] **Verify**: Doctor search results appear
- [ ] Select a doctor
- [ ] **Verify**: Selected doctor details display (ID, name, CRM)
- [ ] Click "Confirmar Ativação"
- [ ] **Verify**: Success toast
- [ ] **Verify in DB**: `clickDoctorId` is set to the selected doctor's ID
- [ ] **Now drag** from "Treinamento" to "Ativo"
- [ ] **Verify**: Move succeeds (because clickDoctorId is set)

#### Test 11: Rejection Flow
- [ ] Open drawer of a DIFFERENT candidate (in any stage)
- [ ] Click "Rejeitar Candidato" button (red, bottom of drawer)
- [ ] **Verify**: Modal opens with "Rejeitar Candidato" title
- [ ] Try to confirm WITHOUT entering reason
- [ ] **Verify**: Button is disabled
- [ ] Enter reason: "CRM inválido, documentação incorreta" (10+ chars)
- [ ] **Verify**: Button becomes enabled
- [ ] Click "Confirmar Rejeição"
- [ ] **Verify**: Success toast
- [ ] **Verify**: Drawer closes
- [ ] **Verify**: Card DISAPPEARS from Kanban (rejected filter OFF)
- [ ] Toggle "Mostrar rejeitados" ON
- [ ] **Verify**: Rejected candidate appears with "Rejeitado" badge
- [ ] Open drawer of rejected candidate
- [ ] **Verify**: Status badge shows "Rejeitado"
- [ ] **Verify**: "Rejeitar" button is DISABLED
- [ ] **Verify in DB**: `status = 'rejeitado'`, `motivoRejeicao` contains the reason
- [ ] **Verify**: CandidatoHistorico has 'REJEITADO' entry with motivo in detalhes

#### Test 12: Histórico Tab (Audit Trail)
- [ ] Open drawer of the test candidate (who went through full flow)
- [ ] Click "Histórico" tab
- [ ] **Verify**: Timeline displays chronologically
- [ ] **Verify entries**:
  - CRIADO (with source)
  - ESTAGIO_ALTERADO (candidato → entrevista)
  - TAG_ADICIONADA (VIP)
  - ESTAGIO_ALTERADO (entrevista → treinamento)
  - MENTOR_ATRIBUIDO
  - CANDIDATO_ATIVADO
  - ESTAGIO_ALTERADO (treinamento → ativo)
- [ ] **Verify**: Each entry shows date, user, and action details

---

### 🟡 P1 - Edge Cases

#### Test 13: Duplicate Submission
- [ ] Try to submit candidatura form with SAME email/CRM
- [ ] **Expected**: Error message about duplicate
- [ ] **Verify**: New candidato is NOT created

#### Test 14: Backward Movement Prevention
- [ ] Attempt to drag from later stage to earlier stage
- [ ] **Verify**: Visual feedback (cursor not-allowed OR red drop zone)
- [ ] **Verify**: Error toast if dropped

---

## Database Verification Queries

### Auditoria - All Actions Logged
```sql
SELECT acao, COUNT(*) 
FROM auditoria 
WHERE entidade = 'candidato' 
  AND entidadeId = '<test_candidato_id>'
GROUP BY acao;

-- Expected actions:
-- CANDIDATO_CRIADO
-- ESTAGIO_ALTERADO (multiple)
-- TAG_ADICIONADA
-- TAG_REMOVIDA
-- MENTOR_ATRIBUIDO
-- CANDIDATO_ATIVADO
-- CANDIDATO_REJEITADO
```

### CandidatoHistorico - Complete Timeline
```sql
SELECT acao, de, para, detalhes, createdAt, usuario.name
FROM candidato_historico
WHERE candidatoId = '<test_candidato_id>'
ORDER BY createdAt ASC;

-- Should show progression: CRIADO → ESTAGIO_ALTERADO (x3) → ATIVADO
```

### Final State Check
```sql
SELECT 
  nome,
  estagio,
  status,
  entrevistaRealizada,
  entrevistaNota,
  clickDoctorId,
  ativadoEm
FROM candidato 
WHERE id = '<test_candidato_id>';

-- Expected:
-- estagio: 'ativo'
-- status: 'em_andamento'
-- entrevistaRealizada: true
-- entrevistaNota: 4
-- clickDoctorId: <some_number>
-- ativadoEm: <timestamp>
```

---

## Known Issues (Non-Blocking)

1. **Email Notifications**: Not tested (requires external email service)
2. **File Upload**: Not tested (requires Vercel Blob setup)
3. **ConfigSistema Email**: May need manual configuration

---

## Pass Criteria

- [ ] All P0 tests pass (Tests 1-12)
- [ ] No TypeScript errors
- [ ] No console errors during flow
- [ ] Database state matches expected after each action
- [ ] Audit trail is complete and accurate

---

## Post-Test Cleanup

```sql
-- Remove test candidato
DELETE FROM candidato WHERE email LIKE 'teste-e2e-%';

-- Verify cleanup
SELECT COUNT(*) FROM candidato WHERE email LIKE 'teste-e2e-%';
-- Expected: 0
```

---

**✅ TEST READY FOR EXECUTION**

All P0 blockers have been fixed:
- ✅ Interview form entrevistador dropdown now loads staff
- ✅ Training form mentors now persist on drawer reopen
- ✅ TypeScript compilation passes
- ✅ All 13 prior tasks verified as complete
