## Learnings (ExpandedCancelamentoDetails)

- `ExpandedCancelamentoDetails` and `ExpandedRequestDetails` share very similar logic for displaying slots with status.
- The `cancelamento` object structure for slots (`slots`, `slotsAprovados`, `slotsRejeitados`) mirrors the `request` object structure in `solicitacoes`.
- `getDisplayStatus` logic needed to be adapted locally for `ExpandedCancelamentoDetails` to handle "aprovado" vs "parcial" correctly based on the presence of rejected slots.
- Used `Set` for O(1) lookup of slot status when rendering the grid.
- Preserved existing UI elements like rejection reasons and strike warnings while upgrading the slot visualization.
