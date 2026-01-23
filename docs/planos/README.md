# Plano de Desenvolvimento ClickMedicos

> Documento gerado em 22/01/2026 - Pos Fase 0 (Design System)

## Visao Geral do Projeto

Sistema de gestao de horarios medicos para clinica de cannabis medicinal, integrando com Click CRM.

### Stack Tecnologico
- **Frontend**: Next.js 15 (App Router) + React 19
- **Backend**: tRPC + Prisma ORM
- **Banco de Dados**: PostgreSQL (local) + PostgreSQL replica (Click)
- **Autenticacao**: Better Auth
- **Estilizacao**: Tailwind CSS + shadcn/ui
- **Monorepo**: Turborepo + pnpm

---

## Estado Atual (Pos Fase 0)

### Concluido
| Area | Status | Observacoes |
|------|--------|-------------|
| Design System | ✅ | Paleta #285E31, componentes UI atualizados |
| Schema Prisma | ✅ | User, MedicoHorario, Solicitacao, CancelamentoEmergencial |
| Autenticacao | ✅ | Better Auth com email/senha |
| Routers Basicos | ✅ | medico, solicitacoes, aprovacoes, dashboard, usuarios, config |
| Conexao Click Replica | ✅ | Pool pg configurado, queries basicas |

### Pendente
| Area | Status | Fase |
|------|--------|------|
| Queries Metricas Click | ❌ | Fase 1 |
| Sistema de Score | ❌ | Fase 1 |
| Grade Interativa Horarios | ❌ | Fase 2 |
| Sincronizacao API Click | ❌ | Fase 3 |
| Dashboard Completo | ❌ | Fase 4 |
| Configuracoes Admin | ❌ | Fase 5 |
| Cron Jobs | ❌ | Fase 6 |
| Testes E2E | ❌ | Fase 7 |

---

## Fases de Desenvolvimento

| Fase | Nome | Duracao | Prioridade | Dependencias |
|------|------|---------|------------|--------------|
| 1 | [Queries Click + Score](./fase-1-queries-click.md) | 3-4 dias | Alta | - |
| 2 | [Grade de Horarios](./fase-2-grade-horarios.md) | 4-5 dias | Alta | Fase 1 |
| 3 | [Sync API Click](./fase-3-sync-api-click.md) | 2-3 dias | Alta | Fase 2 |
| 4 | [Dashboard Completo](./fase-4-dashboard.md) | 3-4 dias | Media | Fase 1 |
| 5 | [Config Admin](./fase-5-config-admin.md) | 2-3 dias | Media | - |
| 6 | [Cron + Automacao](./fase-6-cron-automacao.md) | 2-3 dias | Media | Fase 1, 3 |
| 7 | [Polimento + Testes](./fase-7-polimento.md) | 3-4 dias | Alta | Todas |

---

## Timeline Estimada

```
Semana 1 (Dias 1-5):
├── Fase 1: Queries Click + Score (3-4 dias)
└── Fase 2: Inicio Grade Horarios

Semana 2 (Dias 6-10):
├── Fase 2: Conclusao Grade Horarios
└── Fase 3: Sync API Click (2-3 dias)

Semana 3 (Dias 11-15):
├── Fase 4: Dashboard Completo (3-4 dias)
└── Fase 5: Config Admin (2-3 dias)

Semana 4 (Dias 16-20):
├── Fase 6: Cron + Automacao (2-3 dias)
└── Fase 7: Polimento + Testes (3-4 dias)

Total: 20-25 dias uteis
```

---

## Diagrama de Dependencias

```
Fase 1 (Queries) ─────┬─────> Fase 2 (Grade) ─────> Fase 3 (Sync)
                      │
                      ├─────> Fase 4 (Dashboard)
                      │
                      └─────> Fase 6 (Cron)

Fase 5 (Config) ──────────────> Independente

Todas ────────────────────────> Fase 7 (Polish)
```

---

## Conexoes Externas

### Banco Click Replica (Leitura)
```
Host: click-cannabis-production-postgres-rds-replica.cktooi4cqmri.us-east-1.rds.amazonaws.com
Database: click-database
User: postgres
```

### API Click (Escrita)
```
Base URL: https://clickcannabis.app.n8n.cloud/webhook

Endpoints:
- POST /atualizar-hora-medico
- POST /atualizar-prioridade-medico
```

---

## Arquivos de Referencia

### Documentacao Existente
- `docs/decisoes-mvp.md` - Regras de negocio completas
- `docs/arquitetura/visao-geral.md` - Arquitetura do sistema
- `docs/modelo-dados/schema.md` - Schema detalhado
- `docs/regras-negocio/sistema-faixas.md` - Sistema P1-P5
- `docs/api/endpoints.md` - Documentacao tRPC

### Queries de Exemplo
- `docs/queries/exemplo-query-listar-medicos.md`
- `docs/queries/exemplo-query-metricas-medicos.md`
- `docs/queries/exemplo-query-conversao-ticketmedio-medicos.md`
- `docs/queries/exemplo-query-ver-consultas-agendadas.md`

---

## Checklist Pre-Desenvolvimento

Antes de iniciar cada fase, verificar:

- [ ] Ambiente de desenvolvimento funcionando (`pnpm dev`)
- [ ] Banco de dados local rodando
- [ ] Conexao com Click replica testada
- [ ] Variaveis de ambiente configuradas
- [ ] Branch criada para a fase

---

## Convencoes do Projeto

### Commits
```
feat: nova funcionalidade
fix: correcao de bug
refactor: refatoracao sem mudanca de comportamento
docs: apenas documentacao
style: formatacao, sem mudanca de logica
test: adicao de testes
chore: manutencao, configs
```

### Branches
```
feature/fase-X-descricao
fix/descricao-bug
```

### Codigo
- TypeScript strict mode
- Zod para validacao de inputs
- TRPCError para erros de API
- Prisma transactions para operacoes atomicas
- Decimal para valores monetarios

---

## Contatos e Referencias

### Stakeholder
- Decisoes de negocio documentadas em `docs/decisoes-mvp.md`

### Click CRM
- Tabelas principais: `doctors`, `users`, `consultings`, `medical_prescriptions`, `product_budgets`
- Timezone: America/Sao_Paulo

---

## Atualizacoes do Plano

| Data | Alteracao | Autor |
|------|-----------|-------|
| 22/01/2026 | Criacao inicial do plano | Sistema |
