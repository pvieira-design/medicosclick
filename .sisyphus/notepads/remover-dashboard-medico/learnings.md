# Learnings - Remover Dashboard Médico

## Convenções do Projeto

- Rotas de médico usam prefixo `/dashboard/`
- Redirecionamentos após login verificam `user?.tipo === "medico"`
- Sidebar usa role `"medico"` para filtrar menu items
- Primeira opção do menu médico era "Meu Desempenho" (dashboard)
- Segunda opção é "Meus Horários" (`/dashboard/horarios`)

## Arquivos Identificados

### Redirecionamentos
1. `/apps/web/src/app/(dashboard)/dashboard/page.tsx` - Redireciona médicos para dashboard
2. `/apps/web/src/components/sign-in-form.tsx` - Login redireciona para dashboard
3. `/apps/web/src/components/sign-up-form.tsx` - Cadastro redireciona para dashboard

### Navegação
4. `/apps/web/src/components/sidebar.tsx` - Menu lateral com "Meu Desempenho" como primeira opção

## Mudanças Necessárias

- Trocar `/dashboard/meu-desempenho` por `/dashboard/horarios` em todos os redirecionamentos
- Remover item "Meu Desempenho" do menu do médico
- "Meus Horários" passa a ser a primeira opção do menu

## Execução - Tarefa 1

**Data:** 2026-01-25

### Mudança Realizada
- ✅ Arquivo: `/apps/web/src/app/(dashboard)/dashboard/page.tsx`
- ✅ Linha 23: `redirect("/dashboard/meu-desempenho")` → `redirect("/dashboard/horarios")`
- ✅ Verificação: Mudança aplicada e confirmada

### Detalhes
- Redirecionamento de médicos agora aponta para `/dashboard/horarios` (Meus Horários)
- Página "Meu Desempenho" não foi deletada, apenas removida do fluxo de acesso do médico
- Todos os outros redirecionamentos ainda precisam ser atualizados (sign-in-form, sign-up-form)

## Task 2: Updated sign-in-form redirect (2026-01-25)

**Status:** ✅ COMPLETED

**Change Made:**
- File: `/apps/web/src/components/sign-in-form.tsx`
- Line 36: Changed redirect from `/dashboard/meu-desempenho` to `/dashboard/horarios`
- Old: `router.push(user?.tipo === "medico" ? "/dashboard/meu-desempenho" : "/dashboard");`
- New: `router.push(user?.tipo === "medico" ? "/dashboard/horarios" : "/dashboard");`

**Verification:** ✅ File read confirms change applied correctly

**Context:** Part of removing the dashboard from medico flow. Medicos now default to `/dashboard/horarios` on login.

## Task 3: Updated sign-up-form redirect (2026-01-25)

**Status:** ✅ COMPLETED

**Change Made:**
- File: `/apps/web/src/components/sign-up-form.tsx`
- Line 38: Changed redirect from `/dashboard/meu-desempenho` to `/dashboard/horarios`
- Old: `router.push(user?.tipo === "medico" ? "/dashboard/meu-desempenho" : "/dashboard");`
- New: `router.push(user?.tipo === "medico" ? "/dashboard/horarios" : "/dashboard");`

**Verification:** ✅ File read confirms change applied correctly

**Context:** Part of removing the dashboard from medico flow. Medicos now default to `/dashboard/horarios` on sign-up.

**Summary:** All three main redirect points (dashboard/page.tsx, sign-in-form.tsx, sign-up-form.tsx) have been updated to redirect medicos to `/dashboard/horarios` instead of `/dashboard/meu-desempenho`.

## Task 4: Remove "Meu Desempenho" from sidebar (2026-01-25)

**Status:** ✅ COMPLETED

**Change Made:**
- File: `/apps/web/src/components/sidebar.tsx`
- Lines 89-90: Removed "Meu Desempenho" menu item from medico role
- Old: 
  ```
  { title: "Meu Desempenho", icon: LayoutDashboard, href: "/dashboard/meu-desempenho" },
  { title: "Meus Horários", icon: Calendar, href: "/dashboard/horarios" },
  ```
- New:
  ```
  { title: "Meus Horários", icon: Calendar, href: "/dashboard/horarios" },
  ```

**Verification:** ✅ File read confirms "Meus Horários" is now the first menu item (line 90)

**Context:** Final step in removing the dashboard from medico flow. Sidebar now shows "Meus Horários" as the first option for medicos, aligning with the new default route.

**Summary:** All sidebar menu items remain intact except "Meu Desempenho" which has been removed. The medico menu now starts with "Meus Horários" and maintains all other items in their original order.

## Task 3 Verification (2026-01-25 - Re-verification)

**Status:** ✅ ALREADY COMPLETED - VERIFIED

**File:** `/apps/web/src/components/sign-up-form.tsx`
**Line 38:** `router.push(user?.tipo === "medico" ? "/dashboard/horarios" : "/dashboard");`

**Verification Result:** ✅ Correct redirect path confirmed
- Medico users are redirected to `/dashboard/horarios` (not `/dashboard/meu-desempenho`)
- Non-medico users are redirected to `/dashboard`
- No changes needed - task already completed in previous execution

**Note:** This task was already completed and verified. The file contains the correct redirect path.
