
## Task 7: Drag and Drop Implementation (2026-01-24)

### Implementation Summary
Implemented drag-and-drop functionality for the Kanban board using `react-aria` hooks (`useDrag`, `useDrop`).

### Key Features
1. **Drag and Drop**:
   - Wrapped `CandidatoCard` with `DraggableCandidatoCard` using `useDrag`.
   - Wrapped `KanbanColumn` with `useDrop`.
   - Implemented `handleMove` to validate and execute the move.
2. **Validation**:
   - Client-side validation to ensure candidates can only move forward in the pipeline.
   - Shows error toast if user tries to move backward.
3. **Mutation**:
   - Used `trpc.onboarding.moverEstagio` mutation to update candidate stage.
   - Invalidates queries on success to refresh the board.
4. **Visual Feedback**:
   - Added visual cues (ring, background color) when dragging over a valid drop target.

### Technical Decisions
- **React Aria Hooks**: Used low-level hooks (`useDrag`, `useDrop`) instead of `react-aria-components` for better integration with the existing custom Kanban layout.
- **Optimistic Updates**: Currently using query invalidation. Optimistic UI updates could be added for smoother experience if needed.
- **Type Safety**: Ensured `DropItem` handling and JSON parsing are type-safe (mostly).
