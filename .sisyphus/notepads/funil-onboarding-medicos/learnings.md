
## Task 5: UI Implementation - Onboarding Kanban (2026-01-24)

### Implementation Summary
Created `apps/web/src/app/(dashboard)/dashboard/onboarding/page.tsx` with a 5-column Kanban board layout.

### Key Features
1. **5-Column Layout**: Visual representation of the onboarding pipeline (Candidatos, Entrevista, Treinamento, Ativo, Performance).
2. **Filters**:
   - **Search**: Debounced input searching by name, email, or CRM.
   - **Show Rejected**: Toggle to include/exclude rejected candidates.
3. **Data Fetching**:
   - Used `useQuery(trpc.onboarding.listarCandidatos.queryOptions(...))` pattern for tRPC v11 compatibility.
   - Fetches data independently for each column to ensure correct distribution.
   - `perPage: 50` to load a sufficient number of items for the board view.
4. **UI Components**:
   - `KanbanColumn`: Reusable component for each stage.
   - `CandidatoCard`: Displays candidate info (name, date, relative time, specialties).
   - Used `Intl` and simple math for date formatting to avoid adding `date-fns` dependency.
   - Followed design guidelines: compact spacing, no shadows, consistent colors for stages.

### Technical Decisions
- **Client-side Debounce**: Implemented `useMemo` + `setTimeout` for search input to prevent excessive API calls.
- **No Drag-and-Drop (Yet)**: Focused on the visual structure and data display first (as per task requirements).
- **No Drawer (Yet)**: Cards are clickable but don't open the details drawer yet (next task).

### Next Steps
- Implement the `DoctorDetailDrawer` for candidate details.
- Implement drag-and-drop functionality for moving candidates between stages.
