## Analytics Queries Implementation (2026-01-26)

Successfully added 3 new tRPC queries to `packages/api/src/routers/formularios.ts` for satisfaction analytics:

### 1. listarMedicosQueResponderam (lines 245-275)
- **Purpose**: Lists doctors who responded in a given month with their full response data
- **Input**: Optional `mesReferencia` (defaults to current month)
- **Returns**: 
  - `mesReferencia`: Month reference
  - `respostas`: Array of responses with user data (id, name, email, faixa, image)
  - `totalRespostas`: Count of responses
- **Usage**: For "Satisfação" tab to show who already responded

### 2. getEstatisticasSatisfacao (lines 277-312)
- **Purpose**: Aggregated statistics for big numbers dashboard
- **Input**: None (always uses current month)
- **Returns**:
  - `mesReferencia`: Current month
  - `dentroJanela`: Whether we're in response window (days 1-15)
  - `totalMedicosAtivos`: Total active doctors
  - `totalResponderam`: How many responded
  - `totalPendentes`: How many pending
  - `mediaSuporte`: Average support NPS (1 decimal)
  - `mediaFerramentas`: Average tools NPS (1 decimal)
  - `mediaGeral`: Overall average (1 decimal)
- **Usage**: For big numbers cards in analytics dashboard

### 3. getHistoricoSatisfacaoByMedico (lines 314-328)
- **Purpose**: Get last 12 satisfaction responses for a specific doctor
- **Input**: `medicoId` (required)
- **Returns**: Array of last 12 responses ordered by month descending
- **Usage**: For doctor detail drawer to show NPS history

### Key Patterns Followed
- All queries use `staffProcedure` (only staff can see analytics)
- Consistent use of `getMesReferenciaAtual()` helper
- Proper decimal formatting with `.toFixed(1)` for averages
- Ordered results by most recent first (`orderBy: { respondidoEm: "desc" }`)
- Included user data with `select` to avoid over-fetching

### Build Verification
- TypeScript compilation: ✅ No errors
- LSP diagnostics: ✅ Clean
- Next.js build: ✅ Successful
