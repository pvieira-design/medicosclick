# Learnings - Funil de Onboarding Médicos

## Interview Form Implementation

### Architecture
- **Backend**: tRPC procedure `salvarEntrevista` in `packages/api/src/routers/onboarding.ts`
- **Frontend**: React component `InterviewForm` in `apps/web/src/app/(dashboard)/dashboard/onboarding/components/interview-form.tsx`
- **Database**: Uses existing Candidato model fields:
  - `entrevistaRealizada` (boolean)
  - `entrevistaNota` (1-5 integer)
  - `entrevistaObservacoes` (text)
  - `entrevistaChecklist` (JSON)
  - `entrevistadorId` (foreign key to User)
  - `entrevistaResultado` (enum: aprovado/reprovado/pendente)

### Key Implementation Details

#### Checklist Items
Fixed 5 evaluation criteria:
1. CRM válido
2. Experiência adequada
3. Disponibilidade compatível
4. Perfil de comunicação
5. Conhecimento técnico

#### Form Fields
- **Nota**: Select dropdown (1-5 scale with labels)
- **Entrevistador**: Select dropdown (fetches from `user.listarStaff`)
- **Resultado**: Select dropdown (aprovado/reprovado/pendente)
- **Checklist**: Checkbox group (5 items)
- **Observações**: Textarea (min 10 characters)

#### Validation
- All fields marked with * are required
- Nota must be 1-5
- Observações minimum 10 characters
- Entrevistador must be selected

#### Audit Trail
- Creates `CandidatoHistorico` entry with action "ENTREVISTA_REALIZADA"
- Logs checked checklist items in detalhes
- Creates `Auditoria` entry with full data snapshot

### Component Structure
- Standalone component in `components/interview-form.tsx`
- Uses React hooks: useState, useQuery, useMutation
- Integrates with tRPC client
- Toast notifications for success/error

### UI/UX Patterns
- Grid layout: 2 columns on desktop, 1 on mobile
- Checklist in bordered box with subtle background
- Clear button to reset form
- Loading state on save button with spinner
- Form validation before submission

## Patterns Used

### tRPC Procedure Pattern
```typescript
salvarEntrevista: staffProcedure
  .input(z.object({ ... }))
  .mutation(async ({ ctx, input }) => {
    // Validation
    // Update database
    // Create history entry
    // Create audit entry
    // Return result
  })
```

### Component Pattern
- Separate component file for form
- Props: candidatoId (string)
- Internal state management with useState
- Query for staff list
- Mutation for save operation
- Error handling with toast notifications

### Database Pattern
- Use existing model fields
- Store checklist as JSON object
- Create history entry for audit trail
- Create auditoria entry for compliance

## Conventions Followed

1. **Naming**: camelCase for variables, PascalCase for components
2. **Imports**: Organized by source (react, @tanstack, @clickmedicos, @/components)
3. **Error Handling**: Try-catch in mutations, toast notifications
4. **Validation**: Zod schemas for input validation
5. **Audit**: Always create history + auditoria entries for data changes
6. **UI**: Consistent with existing design system (Tailwind, shadcn/ui)

## Notes

- Interview form does NOT block stage movement (as per requirements)
- Form can be filled multiple times (updates existing data)
- Entrevistador is required (must select from staff list)
- Checklist items are flexible (can check any combination)
- Result can be changed independently of other fields
