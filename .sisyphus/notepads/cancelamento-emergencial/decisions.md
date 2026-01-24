# Decisions - Cancelamento Emergencial

## [2026-01-24] Architectural Decisions

### Strike Opcional
- Staff sempre decide via checkbox
- Checkbox marcado por padrao
- Backend recebe `aplicarStrike: boolean`

### Verificacao Click
- Batch query para performance
- Timeout 3s para 20 slots
- Graceful fallback se Click offline

### Email
- Resend SDK
- Templates simples (texto)
- Fallback: log warning se nao configurado

### UI
- Pagina dedicada (nao modal automatico)
- Grade filtrada por dia (proximos 3 dias)
- Componentes Untitled UI
