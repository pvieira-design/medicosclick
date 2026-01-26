# DoctorsClick - Sistema de Gestao de Horarios Medicos

Sistema completo para gestao de horarios de medicos com integracao ao Click CRM.

## Stack Tecnologico

- **Frontend**: Next.js 15 (App Router) + React 18
- **Backend**: tRPC + Prisma ORM
- **Banco de Dados**: PostgreSQL
- **Autenticacao**: Better Auth
- **Estilizacao**: Tailwind CSS + Radix UI
- **Monorepo**: npm workspaces

## Estrutura da Documentacao

### Arquitetura
- [Visao Geral do Sistema](./arquitetura/visao-geral.md) - Estrutura do projeto e fluxo de dados

### Modelo de Dados
- [Schema do Banco](./modelo-dados/schema.md) - Diagrama ER e descricao das tabelas

### Regras de Negocio
- [Sistema de Faixas (P1-P5)](./regras-negocio/sistema-faixas.md) - Sistema de niveis e scores

### Fluxos de Trabalho
- [Abertura de Horarios](./fluxos/abertura-horarios.md) - Como medicos solicitam e staff aprova
- [Fechamento de Horarios](./fluxos/fechamento-horarios.md) - Fechamento normal e automatico
- [Cancelamento Emergencial](./fluxos/cancelamento-emergencial.md) - Cancelamento de horarios com consulta
- [Visualizacoes do Medico](./fluxos/visualizacoes-medico.md) - Telas e funcionalidades para medicos
- [Visualizacoes do Staff](./fluxos/visualizacoes-staff.md) - Telas e funcionalidades para staff
- [Dashboard](./fluxos/dashboard.md) - Centro de comando, KPIs e alertas

### API
- [Endpoints tRPC](./api/endpoints.md) - Documentacao completa das APIs

### Frontend
- [Design System](./frontend/design-system.md) - Componentes e padroes visuais
- [Polling e Cache](./frontend/polling-e-cache.md) - Sistema de atualizacao em tempo real

## Quick Start para Desenvolvedores

### Pre-requisitos
- Node.js 18+
- npm 10+
- PostgreSQL 14+

### Instalacao

```bash
# Clonar repositorio
git clone [repo-url]
cd my-better-t-app

# Instalar dependencias
npm install

# Configurar variaveis de ambiente
cp .env.example .env

# Gerar cliente Prisma
npm run db:generate

# Executar migrations
npm run db:push

# Iniciar desenvolvimento
npm run dev
```

### Estrutura do Monorepo

```
my-better-t-app/
├── apps/
│   └── web/                 # Aplicacao Next.js
│       ├── src/
│       │   ├── app/         # App Router (pages)
│       │   ├── components/  # Componentes React
│       │   ├── hooks/       # Custom hooks
│       │   └── lib/         # Utilitarios
│       └── package.json
│
├── packages/
│   ├── api/                 # tRPC routers
│   │   └── src/
│   │       ├── routers/     # Endpoints por dominio
│   │       └── middleware/  # Middlewares de permissao
│   │
│   ├── auth/                # Better Auth config
│   │
│   └── db/                  # Prisma + PostgreSQL
│       └── prisma/
│           └── schema/      # Schema dividido por dominio
│
└── docs/                    # Esta documentacao
```

## Tipos de Usuario

| Tipo | Descricao | Acesso |
|------|-----------|--------|
| `medico` | Profissional medico | Visualiza horarios, solicita aberturas/fechamentos |
| `atendente` | Staff operacional | Aprova/rejeita solicitacoes |
| `diretor` | Gestor de operacoes | Override de aprovacoes |
| `admin` | Administrador | Gestao de configuracoes e usuarios |
| `super_admin` | Super administrador | Acesso total ao sistema |

## Integracao com API Click

O sistema se integra com a API Click CRM para:
- Sincronizar horarios aprovados
- Buscar consultas agendadas
- Validar disponibilidade de slots

Endpoints principais:
- `GET /ver-calendario-do-medico?doctor_id={id}` - Calendario atual
- `POST /atualizar-hora-medico` - Sincronizar horarios
- `GET /validar-consultas-agendadas?doctor_id={id}` - Consultas marcadas
