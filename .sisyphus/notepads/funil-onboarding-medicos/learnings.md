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

## Tag System Implementation (2026-01-24)

### Backend (tRPC Procedures)
- **adicionarTag**: staffProcedure that creates a CandidatoTag with validation
  - Checks for duplicate tags (unique constraint on candidatoId + nome)
  - Creates CandidatoHistorico entry with acao="TAG_ADICIONADA"
  - Logs to Auditoria table
  - Returns tag with creator info and createdAt

- **removerTag**: staffProcedure that deletes a tag
  - Validates tag belongs to the candidate
  - Creates CandidatoHistorico entry with acao="TAG_REMOVIDA"
  - Logs to Auditoria table

- **listarCandidatos**: Updated to include tags in select clause
  - Returns tags with id and nome fields for card display

### Frontend (React Components)
- **TagsSection**: New component for tag management in drawer
  - Uses useMutation for add/remove operations
  - Invalidates getCandidato query on success
  - Shows loading state with Loader2 icon
  - Displays tags as pills with remove button (X icon)
  - Empty state message when no tags

- **CandidatoCard**: Updated to display tags
  - Shows first 2 tags with brand colors (bg-brand-100, text-brand-700)
  - Shows "+N" badge for additional tags
  - Tags appear below especialidades

- **Interfaces Updated**:
  - Candidato: Added optional tags array
  - CandidatoDetail: Added tags array with criadoPor info

### Key Patterns
- Free-form string tags (no predefined list)
- Audit logging for all tag operations
- Optimistic UI updates via React Query invalidation
- Consistent error handling with TRPCError
- Tags are case-sensitive (no normalization)

### Styling
- Tags use brand color scheme (brand-50, brand-100, brand-200, brand-700)
- Rounded pills with px-3 py-1 padding
- Hover state on remove button (text-brand-900)
- Compact display on cards (max 2 tags + count)

## Training Form Implementation (2026-01-24)

### Procedures Added
- `buscarMentores`: Query to search active doctors from Click database
- `atribuirMentor`: Assign mentor to candidate with history tracking
- `removerMentor`: Remove mentor assignment with audit trail
- `salvarDatasTreinamento`: Save training start/end dates with validation

### Key Patterns
1. **Mentor Search**: Uses `clickQueries.getMedicosAtivos()` to fetch active doctors only
2. **Duplicate Prevention**: Unique constraint on candidatoId_mentorId prevents duplicate assignments
3. **History Tracking**: All mutations create CandidatoHistorico entries with action details
4. **Audit Trail**: All mutations create Auditoria entries for compliance

### Component Structure
- TrainingForm: Client component with mentor search, assignment display, and date inputs
- Uses tRPC mutations with proper error handling and toast notifications
- Mentor search filters by name/email in real-time
- Date validation ensures fim > inicio

### Technical Notes
- Mentor IDs are stored as strings (converted from doctor_id numbers)
- Dates are stored as DateTime in database, converted to/from Date objects in frontend
- Form uses React Query for state management and mutations
- Mentor removal updates UI immediately with optimistic updates

