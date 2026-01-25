
## Prescription History Page (Task 3)

### Implementation Details
1. **Page Structure**:
   - Header with "Nova Receita" button
   - Filters: Status (Select) and Date Range (Start/End Inputs)
   - Desktop: Table view with columns (Data, Paciente, Status, Validade, Ações)
   - Mobile: Card view with stacked information (hidden on desktop)
   - Pagination: Server-side pagination via tRPC

2. **tRPC Integration**:
   - Used `trpc.receita.listarReceitas.useQuery` with `queryOptions` pattern (TanStack Query v5)
   - Used `trpc.receita.duplicarReceita.useMutation` for duplication
   - Used `trpc.receita.assinarReceita.useMutation` for signing (placeholder logic for now)

3. **UI/UX Decisions**:
   - Followed "Clean & Chic" guidelines: no shadows, `rounded-xl`, `border-gray-200`
   - Used `Badge` with specific colors for statuses:
     - RASCUNHO: Gray
     - PENDENTE_ASSINATURA: Yellow
     - ASSINADA: Green
     - CANCELADA: Red
   - Responsive design: Table hidden on mobile, Cards hidden on desktop using `hidden md:block` and `md:hidden` classes

4. **Challenges & Solutions**:
   - **Type Safety**: Encountered issues with `Select` `onValueChange` type mismatch (`string | null` vs `string`). Solved by checking `if (val)` before setting state.
   - **Route Types**: Next.js typed routes caused issues with dynamic segments in `router.push`. Solved by casting to `any` temporarily (should be fixed with proper route definitions).
   - **Mobile View**: Explicitly implemented a separate card view for mobile to ensure good UX on small screens, as tables don't scale well.
