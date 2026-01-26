# Formulários Medicos - Learnings

## Schema Patterns Observed

### Model Structure
- All models use `id String @id @default(uuid())` for primary keys
- Relations to User use `userId String` field with `@relation` decorator
- Cascade delete is standard: `onDelete: Cascade`
- Timestamps use `createdAt DateTime @default(now())` and `updatedAt DateTime @updatedAt`
- Optional fields use `String?` or `DateTime?` syntax
- Text fields use `@db.Text` for longer content

### Naming Conventions
- Models: PascalCase (e.g., `MedicoDetalhesPessoais`, `SatisfacaoMensal`)
- Fields: camelCase (e.g., `tamanhoCamisa`, `mesReferencia`)
- Database tables: snake_case with `@@map()` (e.g., `medico_detalhes_pessoais`)
- Relations: descriptive names (e.g., `detalhesPessoais`, `satisfacoesMensais`)

### Indexing Strategy
- Always index foreign keys: `@@index([userId])`
- Index frequently queried fields: `@@index([mesReferencia])`
- Unique constraints use `@@unique([field1, field2])`

## Implementation Details

### MedicoDetalhesPessoais Model
- One-to-one relation with User (userId is @unique)
- Stores personal preferences and address information
- All fields are optional (nullable) except userId and id
- Includes timestamps for audit trail

### SatisfacaoMensal Model
- One-to-many relation with User (userId is not unique)
- Composite unique constraint on (userId, mesReferencia) prevents duplicate monthly surveys
- NPS fields are Int type (0-10 range)
- respondidoEm is required DateTime field
- Includes timestamps for audit trail

## Database Operations
- `npm run db:push` applies schema changes without data loss
- `npm run db:generate` regenerates Prisma client types
- Schema files are split: `auth.prisma` for auth models, `app.prisma` for app models
- User model relations are added in `auth.prisma` file

## Key Decisions
1. Used `@unique` on userId in MedicoDetalhesPessoais to enforce one-to-one relation
2. Used composite `@@unique([userId, mesReferencia])` to allow multiple monthly surveys per user
3. Made all personal detail fields optional to allow gradual form completion
4. Used String type for mesReferencia (YYYY-MM format) instead of DateTime for easier querying
5. Included respondidoEm as required field to track when survey was completed
## [2026-01-26 10:41] Task 1: Prisma Models Created

### Patterns Learned
- Project uses `@@map("snake_case")` for table names in Prisma
- Relations use cascade delete: `onDelete: Cascade`
- Indexes added for foreign keys: `@@index([userId])`
- Text fields use `@db.Text` annotation for longer content
- Timestamps always included: `createdAt @default(now())` and `updatedAt @updatedAt`

### Models Created
1. **MedicoDetalhesPessoais** (one-to-one with User)
   - 16 fields: personal details, full address (BR format), preferences
   - All fields nullable (médico fills optionally)
   - Unique userId constraint

2. **SatisfacaoMensal** (one-to-many with User)
   - mesReferencia format: "YYYY-MM"
   - NPS scores: Int 0-10
   - Composite unique: (userId, mesReferencia) - one response per month
   - Indexes on userId and mesReferencia for query performance

### Commands Used
- `npm run db:push` - Apply schema to database
- `npm run db:generate` - Regenerate Prisma client after schema changes
- `npm run build` - Verify TypeScript compilation

## [2026-01-26] Task 2: tRPC Router Created

### Router Structure
- File: `packages/api/src/routers/formularios.ts`
- Registered in: `packages/api/src/routers/index.ts`
- Namespace: `formularios`

### Endpoints Implemented (12 total)

**DetalhesPessoais (4 endpoints):**
1. `getDetalhesPessoais` - medicoProcedure - returns logged-in médico's details
2. `upsertDetalhesPessoais` - medicoProcedure - create or update with Zod validation
3. `getDetalhesPessoaisByMedico` - staffProcedure - staff queries by medicoId
4. `listarMedicosSemDetalhes` - staffProcedure - list médicos without details

**Satisfação (4 endpoints):**
5. `getSatisfacaoAtual` - medicoProcedure - check if responded this month + window status
6. `responderSatisfacao` - medicoProcedure - save response (validates 15-day window)
7. `getHistoricoSatisfacao` - medicoProcedure - paginated history
8. `listarMedicosPendentes` - staffProcedure - who hasn't responded this month

**Dashboard NPS (4 endpoints):**
9. `getNpsGeral` - staffProcedure - overall average (suporte + ferramentas)
10. `getNpsPorCategoria` - staffProcedure - separate averages with NPS distribution
11. `getEvolucaoNps` - staffProcedure - monthly chart data (configurable months)
12. `getSugestoesRecentes` - staffProcedure - recent suggestions with user info

### Patterns Used
- Zod schemas for input validation (mesReferencia regex, NPS 0-10)
- TRPCError for business rule violations (BAD_REQUEST, CONFLICT)
- Prisma upsert for create-or-update pattern
- Composite unique key lookup: `userId_mesReferencia`
- Timezone handling: America/Sao_Paulo for 15-day window validation
- Pagination pattern: `{ page, perPage }` with `skip/take`
- Aggregate queries for NPS calculations

### Business Rules Implemented
- Satisfação window: days 1-15 of month (America/Sao_Paulo timezone)
- NPS scores: integers 0-10
- mesReferencia format: "YYYY-MM" (validated via regex)
- One response per user per month (unique constraint)
- Only active médicos (tipo: medico, ativo: true) in lists

### NPS Calculation
- Promoters: score >= 9
- Passives: score 7-8
- Detractors: score <= 6
- NPS = ((promoters - detractors) / total) * 100

## [2026-01-26] Task 3: DetalhesPessoaisModal Component

### Implementation Details
- **Component**: `DetalhesPessoaisModal.tsx` in `apps/web/src/components/formularios/`
- **Libraries**: `@base-ui/react/dialog`, `@tanstack/react-form`, `zod`, `trpc`
- **UI**: Uses project's `ui/dialog`, `ui/input`, `ui/select`, `ui/textarea`
- **State Management**:
  - `useQuery` fetches existing data (enabled only when modal opens)
  - `useMutation` saves data (upsert)
  - `useEffect` updates form values when data arrives
  - `useForm` manages form state and validation

### Key Learnings
- **TanStack Form + Zod**:
  - Passed Zod schema directly to `validators.onChange` (or `onSubmit`) without adapter import if not available.
  - Form reset required via `useEffect` when async data loads.
- **Date Handling**:
  - HTML `input type="date"` works with strings "YYYY-MM-DD".
  - Zod expects `Date` object.
  - Manual conversion needed: `valueAsDate` in onChange, `toISOString()` in value.
- **Base UI Dialog**:
  - Wrapped in local `ui/dialog.tsx`.
  - Controlled via `open` and `onOpenChange` props.
- **tRPC v11**:
  - Syntax: `trpc.router.procedure.useQuery()`.
  - LSP might show false positives if types aren't regenerated.

## [2026-01-26] Task 7: Cron Job for Monthly Satisfaction Email

### Implementation Details
- **File**: `apps/web/src/app/api/cron/satisfacao-mensal/route.ts`
- **Pattern**: Next.js Route Handler with `export const dynamic = "force-dynamic"` and `export const maxDuration = 60`
- **Authentication**: Bearer token via `CRON_SECRET` environment variable
- **Vercel Config**: `vercel.json` with cron schedule `"0 9 1 * *"` (9 AM UTC on 1st of each month)

### Key Learnings
1. **Cron Job Pattern**:
   - Use Next.js Route Handlers in `/api/cron/` directory
   - Export `GET` function with auth check
   - Set `dynamic = "force-dynamic"` to prevent caching
   - Set `maxDuration = 60` for timeout
   - Return JSON response with status

2. **Prisma Enum Issue**:
   - When adding new enum values to Prisma schema, must:
     1. Update schema file (app.prisma)
     2. Run `npm run db:push` to sync database
     3. Run `npm run db:generate` to regenerate client
     4. Clear Next.js cache (`.next` directory)
     5. Restart dev server
   - Without these steps, Prisma client won't recognize new enum values

3. **Email Service Integration**:
   - `enviarEmailSatisfacaoPendente(email, nome, mesReferencia)` already exists
   - Handles email sending with Resend API
   - Errors are caught and logged, don't block cron execution

4. **Notification Creation**:
   - Create in-app notifications with `tipo: "satisfacao_pendente"`
   - Notifications appear in user dashboard
   - Helps remind doctors to respond to survey

5. **Auditoria Logging**:
   - Log cron execution with action `CRON_ENVIO_SATISFACAO_MENSAL`
   - Include metrics: total pending, emails sent, errors, duration
   - Log errors separately with action `CRON_ENVIO_SATISFACAO_MENSAL_ERRO`

### Database Query Pattern
```typescript
// Find doctors who responded this month
const medicosQueResponderam = await prisma.satisfacaoMensal.findMany({
  where: { mesReferencia },
  select: { userId: true },
});

// Find pending doctors (active, haven't responded)
const medicosPendentes = await prisma.user.findMany({
  where: {
    tipo: "medico",
    ativo: true,
    id: { notIn: idsQueResponderam },
  },
  select: { id: true, name: true, email: true },
});
```

### Testing
- Endpoint tested successfully: `curl -X GET http://localhost:3005/api/cron/satisfacao-mensal -H "Authorization: Bearer test-secret-cron-2026"`
- Executed: 84 emails sent in 18.9 seconds
- Build verification: `npm run build` passed, route listed as `ƒ /api/cron/satisfacao-mensal`

### Configuration
- **Environment Variable**: `CRON_SECRET` (added to .env and .env.example)
- **Vercel Schedule**: `"0 9 1 * *"` = 9 AM UTC on 1st of each month
- **Note**: Vercel crons run in UTC, but logic uses America/Sao_Paulo timezone for date calculations
