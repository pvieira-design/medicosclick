# Decisions - Remover Dashboard Médico

## Decisão: Não Deletar Página meu-desempenho

A página `/dashboard/meu-desempenho` NÃO será deletada, apenas removida do fluxo de médicos.

**Razão**: Pode ser útil para staff/admin visualizar performance de médicos no futuro.

## Decisão: Ordem de Execução

1. Primeiro atualizar redirecionamentos (evita médicos caindo em página sem acesso)
2. Depois atualizar sidebar (UI reflete a nova realidade)

## Decisão: Rota Padrão

Nova rota padrão para médicos: `/dashboard/horarios`
