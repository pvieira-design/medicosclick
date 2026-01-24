
## Schema Creation - Onboarding Pipeline (2026-01-24)

### Completed Tasks
✅ Created `packages/db/prisma/schema/onboarding.prisma` with all 5 models
✅ Added 2 enums: CandidatoEstagio, CandidatoStatus
✅ Updated User model in auth.prisma with 6 onboarding relations
✅ Generated Prisma client successfully
✅ Pushed schema to database successfully

### Models Created
1. **Candidato** - Main candidate model with:
   - Form data (nome, email, telefone, crm, especialidades, experiencia, disponibilidade)
   - Metadata (estagio, status, motivoRejeicao)
   - Interview tracking (entrevistaRealizada, entrevistaNota, entrevistaObservacoes, entrevistadorId)
   - Training dates (treinamentoInicio, treinamentoFim)
   - Activation (clickDoctorId, ativadoPorId, ativadoEm)
   - Relations to tags, historico, anexos, mentores

2. **CandidatoTag** - Tags for candidates with cascade delete
3. **CandidatoHistorico** - Audit trail for candidate changes
4. **CandidatoAnexo** - File attachments for candidates
5. **CandidatoMentor** - Mentor assignments with unique constraint

### Key Design Decisions
- Used explicit constraint names (map: "...") to avoid conflicts with other schemas
- Added composite indexes on (candidatoId, nome) and (candidatoId, mentorId) for performance
- Used cascade delete for child relations (tags, historico, anexos, mentores)
- Email and CRM are unique at Candidato level
- All timestamps use createdAt/updatedAt pattern
- User relations use explicit relation names to avoid ambiguity

### Database Sync
- `npm run db:generate` → ✅ Generated Prisma Client (7.3.0)
- `npm run db:push` → ✅ Database now in sync with schema

### Next Steps
- Create tRPC routers for candidato operations
- Implement form submission endpoint
- Add permission checks for staff operations

## Task 2: Public Candidatura Submission Router

### Implementation Summary
Created `packages/api/src/routers/onboarding.ts` with public endpoint for form submission.

### Key Patterns Used
1. **publicProcedure**: No authentication required for form submission
2. **Zod Validation**: Comprehensive input validation with user-friendly error messages
3. **Duplicate Checking**: Email and CRM (numero + estado) uniqueness constraints
4. **Audit Trail**: Three-part logging:
   - CandidatoHistorico (acao: "CRIADO") with source tracking
   - Auditoria record (acao: "CANDIDATO_CRIADO") with full snapshot
   - CandidatoAnexo for file attachments

### Schema Validation Details
- Email: Standard email format
- CRM: 4-6 digits + 2-char state code (auto-uppercase)
- Especialidades: Array of strings, min 1 required
- Experiencia/Disponibilidade: Min 50/20 chars (prevent spam)
- ComoConheceu: Enum with optional "outro" explanation
- Anexos: Optional array with nome, url, tipo, tamanho

### Database Operations
1. Check email uniqueness (findUnique)
2. Check CRM uniqueness (findFirst with composite key)
3. Create Candidato with estagio="candidato", status="em_andamento"
4. Create CandidatoAnexo records if provided
5. Create CandidatoHistorico with "CRIADO" action
6. Create Auditoria record with full snapshot

### Error Handling
- CONFLICT (409) for duplicate email/CRM
- Zod validation errors for invalid input
- TRPCError for database issues

### Router Export
Added to `packages/api/src/routers/index.ts` as `onboarding: onboardingRouter`
Accessible via `trpc.onboarding.submitCandidatura`

### TypeScript Verification
✓ No compilation errors
✓ All types properly inferred from Zod schema
✓ Prisma types match schema definitions
