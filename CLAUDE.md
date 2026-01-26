# CLAUDE.md - ClickMedicos

> **Leia este arquivo ANTES de fazer qualquer alteracao no projeto.**

## Visao Geral

ClickMedicos e um sistema de gestao de horarios medicos integrado ao Click CRM. O sistema gerencia agendamentos, scores de medicos (faixas P1-P5), e sincroniza dados com o banco de dados Click (PostgreSQL externo).

### Stack Tecnologico

- **Frontend**: Next.js 15 (App Router) + React 18 + Tailwind CSS
- **Backend**: tRPC + Prisma ORM
- **Bancos**: PostgreSQL (local) + Click Replica (externo, somente leitura)
- **Auth**: Better Auth
- **Monorepo**: npm workspaces

### Estrutura do Projeto

```
clickmedicos/
├── apps/web/              # Aplicacao Next.js
│   └── src/app/           # App Router (pages)
├── packages/
│   ├── api/               # tRPC routers + middlewares
│   ├── auth/              # Better Auth config
│   └── db/                # Prisma + queries Click
└── docs/                  # Documentacao completa
```

---

## REGRA OBRIGATORIA: Documentacao de Queries

**ANTES de criar ou modificar qualquer query SQL para o banco Click, LEIA:**

```
docs/queries/queries-documentacao-schema-consultas.md   # Schema completo
docs/queries/respostas-perguntas-bancodadosclick.md     # Regras de negocio validadas
```

Estes documentos contem informacoes CRITICAS sobre campos, tipos, typos e comportamentos que NAO sao obvios olhando apenas o schema.

---

## NUNCA FACA (Erros Criticos)

| ERRADO | CORRETO | MOTIVO |
|--------|---------|--------|
| `c.scheduled_at` | `c.start::timestamptz` | Campo `scheduled_at` NAO EXISTE |
| `JOIN patients` | `JOIN users` | Tabela `patients` NAO EXISTE |
| `CONCAT(first_name, last_name)` | `TRIM(COALESCE(first_name,'') \|\| ' ' \|\| COALESCE(last_name,''))` | 89.4% so tem first_name |
| `status = 'rescheduled'` | `status = 'reschudeled'` | TYPO no banco: reschudeled |
| `d.speciality` correto? | `d.speciality` (com Y) | TYPO no banco: speciality |
| `d.office_hours` | `d.schedule` | Campo `office_hours` NAO EXISTE |
| `pb.value` para faturamento | `pb.value + COALESCE(pb.delivery_value, 0)` | Incluir valor do frete |
| `vendas / consultas` | `vendas / receitas` | Taxa de conversao correta |
| `tempo_medio = 20` (fixo) | Calcular via `meet_data` | Usar dados reais da videochamada |

---

## Checklist por Tabela

### Tabela `consultings` (Consultas)

```sql
-- FILTROS OBRIGATORIOS para consultas validas
WHERE c.user_id IS NOT NULL           -- Exclui slots vazios
  AND c.negotiation_id IS NOT NULL    -- Exclui testes/bugs
  AND c.status NOT IN ('preconsulting') -- Exclui reservas

-- CONVERSAO DO CAMPO START (e VARCHAR, nao timestamp!)
c.start::timestamptz                  -- SEMPRE converter
c.start::timestamptz AT TIME ZONE 'America/Sao_Paulo' -- Para exibicao

-- CONSULTAS FUTURAS (ainda vao acontecer)
WHERE c.status IN ('confirmed', 'reschudeled')  -- Note o typo!
  AND c.start::timestamptz >= NOW()
  AND (c.completed = false OR c.completed IS NULL)

-- CONSULTAS REALIZADAS
WHERE c.completed = TRUE

-- NO-SHOW (paciente faltou)
WHERE c.completed = FALSE 
  AND c.reason_for_cancellation IS NOT NULL
```

### Tabela `doctors` (Medicos)

```sql
-- MEDICOS ATIVOS com agenda
WHERE d.name IS NOT NULL 
  AND d.name NOT ILIKE '%teste%'
  AND d.priority > 0                  -- priority = -1 significa inativo
  AND d.schedule IS NOT NULL 
  AND d.schedule != '{}'

-- HORARIOS DO MEDICO (campo schedule e JSONB)
-- Formato: { "SEG": ["08:00-12:00", "14:00-18:00"], "TER": [...], ... }
-- Dias: SEG, TER, QUA, QUI, SEX, SAB, DOM
```

### Tabela `users` (Pacientes/Usuarios)

```sql
-- NOME COMPLETO (seguro para NULLs)
TRIM(COALESCE(u.first_name, '') || ' ' || COALESCE(u.last_name, '')) AS nome

-- APENAS PACIENTES
WHERE u.role = 'client'

-- LINK DO CHAT GURU
u.data->>'linkChat' AS guru_link
```

### Tabela `product_budgets` (Orcamentos/Vendas)

```sql
-- VENDAS CONFIRMADAS
WHERE pb.status = 'confirmed'         -- Apenas 2 status: confirmed, pending
  AND pb.payment_at IS NOT NULL

-- VALOR TOTAL (produtos + frete)
SUM(pb.value + COALESCE(pb.delivery_value, 0)) AS faturamento

-- DATA DO PAGAMENTO
pb.payment_at                         -- NAO usar created_at
```

---

## Definicoes de Negocio

### Taxa de Conversao do Medico

```
Taxa de Conversao = Orcamentos Pagos / Receitas Enviadas
```

**NAO e** vendas / consultas. A metrica correta mede quantas receitas geraram venda.

### Tempo Medio de Consulta

Calcular via campo `meet_data` (JSONB) que contem logs da videochamada:

```sql
-- Estrutura do meet_data
{
  "total": 2,
  "registros": [
    {
      "identifier": "email@exemplo.com",
      "duration_seconds": 1348,
      "start_timestamp_seconds": 1742487650
    }
  ]
}

-- Excluir bots de gravacao
WHERE NOT (
  LOWER(r->>'display_name') LIKE '%notetaker%'
  OR LOWER(r->>'display_name') LIKE '%read.ai%'
  OR LOWER(r->>'display_name') LIKE '%fireflies%'
)
```

### No-Show vs Cancelamento

| Situacao | Condicao SQL |
|----------|--------------|
| Realizada | `completed = TRUE` |
| No-show | `completed = FALSE AND reason_for_cancellation IS NOT NULL` |
| Cancelada | `status = 'cancelled'` |
| Futura | `completed IS NULL AND start::timestamptz > NOW()` |

---

## Sistema de Faixas (P1-P5)

Medicos sao classificados em 5 faixas baseado em performance:

| Faixa | Score Min | Max Slots/Sem | Periodos Permitidos |
|-------|-----------|---------------|---------------------|
| P1 | >= 80 | Ilimitado | Manha, Tarde, Noite |
| P2 | >= 60 | 120 | Manha, Tarde, Noite |
| P3 | >= 40 | 80 | Tarde, Noite |
| P4 | >= 20 | 50 | Apenas Tarde |
| P5 | >= 0 | 30 | Apenas Tarde |

### Periodos do Dia

| Periodo | Horario |
|---------|---------|
| Manha | 08:00 - 12:00 |
| Tarde | 12:00 - 18:00 |
| Noite | 18:00 - 21:00 |

### Calculo do Score

```
Score = (percentilConversao * 0.66) + (percentilTicket * 0.34)
```

Documentacao completa: `docs/regras-negocio/sistema-faixas.md`

---

## Sistema de Permissoes tRPC

### Hierarquia de Roles

```typescript
const PERMISSION_LEVELS = {
  super_admin: 5,  // Acesso total
  admin: 4,        // Configuracoes do sistema
  diretor: 3,      // Override de regras, dados sensiveis
  atendente: 2,    // Aprovacoes, gestao de solicitacoes
  medico: 1,       // Apenas seus proprios dados
};
```

### Procedures Disponiveis

| Procedure | Quem Pode Usar | Uso |
|-----------|----------------|-----|
| `authenticatedProcedure` | Qualquer autenticado | Base para outras |
| `medicoProcedure` | Apenas medicos | Horarios, solicitacoes do medico |
| `staffProcedure` | atendente+ | Aprovacoes, gestao |
| `diretorProcedure` | diretor+ | Dados sensiveis, override |
| `adminProcedure` | admin+ | Configuracoes |
| `superAdminProcedure` | super_admin | Acesso total |

### Arquivo de Referencia

```
packages/api/src/middleware/permissions.ts
```

---

## Guidelines de Frontend

### NAO USAR

- **Sombras** (`box-shadow`, `shadow-*`) - Profundidade via cores/bordas
- **Bordas parciais decorativas** (`border-l-4`) 
- **Padding excessivo** (`p-8`) - Monitores pequenos

### USAR

- **Bordas arredondadas**: `rounded-lg` (8px), `rounded-xl` (12px)
- **Bordas sutis**: `border-gray-200`, `border-border/50`
- **Gradiente da marca**: `bg-gradient-brand` para CTAs
- **Espacamento compacto**: `p-4`, `p-5`, `gap-4`

### Cores

| Uso | Classe |
|-----|--------|
| Primaria | `bg-brand-600`, `text-brand-700` |
| Sucesso | `text-green-600`, `bg-green-50` |
| Erro | `text-red-600`, `bg-red-50` |
| Aviso | `text-amber-600`, `bg-amber-50` |

### Faixas (UI)

```
P1: bg-green-700 text-white
P2: bg-green-500 text-white
P3: bg-yellow-500 text-black
P4: bg-orange-500 text-white
P5: bg-red-500 text-white
```

Documentacao completa: `docs/FRONTEND_GUIDELINES.md`

---

## Arquivos Importantes

| Arquivo | Descricao |
|---------|-----------|
| `packages/db/src/click-replica.ts` | Todas as queries do banco Click |
| `packages/api/src/middleware/permissions.ts` | Sistema de permissoes |
| `packages/api/src/routers/medico.ts` | Endpoints do medico |
| `packages/db/prisma/schema/` | Schemas Prisma (por dominio) |

---

## Comandos Uteis

```bash
# Desenvolvimento
npm run dev                 # Inicia todos os apps
npm run build               # Build de producao

# Banco de Dados
npm run db:push             # Aplicar schema ao banco
npm run db:studio           # Abrir Prisma Studio
npm run db:generate         # Gerar cliente Prisma
```

---

## Documentacao Adicional

- **Arquitetura**: `docs/arquitetura/visao-geral.md`
- **Sistema de Faixas**: `docs/regras-negocio/sistema-faixas.md`
- **Schema do Banco Click**: `docs/queries/queries-documentacao-schema-consultas.md`
- **Regras de Negocio**: `docs/queries/respostas-perguntas-bancodadosclick.md`
- **Design System**: `docs/FRONTEND_GUIDELINES.md`
- **Endpoints tRPC**: `docs/api/endpoints.md`
- **Fluxos de Trabalho**: `docs/fluxos/`

---

## Auditoria

Todas as acoes importantes sao registradas na tabela `Auditoria`:

- `APROVAR_SLOTS` - Staff aprovou slots
- `REJEITAR_SLOTS` - Staff rejeitou slots  
- `FECHAMENTO_AUTOMATICO` - Sistema fechou horarios
- `OVERRIDE_APROVACAO` - Aprovacao com override de regras
- `ALTERAR_SCORE_MANUAL` - Admin alterou score manualmente
- `EMERGENCIAL_CRIADA` - Staff criou emergencial
- `EMERGENCIAL_ACEITA` - Medico aceitou emergencial

---

**Ultima atualizacao:** 23/01/2026
