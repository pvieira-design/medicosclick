# Deploy - ClickMedicos

Guia para fazer deploy do ClickMedicos na Vercel com Neon.

## Pre-requisitos

- Conta na [Vercel](https://vercel.com)
- Conta no [Neon](https://neon.tech)
- Repositorio no GitHub

---

## 1. Configurar Neon (Banco de Dados)

1. Acesse [console.neon.tech](https://console.neon.tech)
2. Crie um novo projeto
3. Copie a **Connection String** (pooled)
   - Formato: `postgresql://user:password@ep-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require`
4. Guarde essa URL para usar como `DATABASE_URL`

---

## 2. Configurar Vercel

### 2.1 Importar Projeto

1. Acesse [vercel.com/new](https://vercel.com/new)
2. Importe o repositorio do GitHub
3. Configure:
   - **Framework Preset**: Next.js
   - **Root Directory**: `apps/web`
   - **Build Command**: `cd ../.. && npm run build`
   - **Install Command**: `cd ../.. && npm install`

### 2.2 Configurar Variaveis de Ambiente

No dashboard da Vercel, va em **Settings > Environment Variables** e adicione:

| Variavel | Valor | Ambientes |
|----------|-------|-----------|
| `DATABASE_URL` | Connection string do Neon | Production, Preview |
| `BETTER_AUTH_SECRET` | Gere com `openssl rand -base64 32` | Production, Preview |
| `BETTER_AUTH_URL` | `https://seu-dominio.vercel.app` | Production |
| `CORS_ORIGIN` | `https://seu-dominio.vercel.app` | Production |
| `CLICK_REPLICA_DATABASE_URL` | (opcional) URL do banco Click | Production |

### 2.3 Habilitar Blob Storage (Upload de Imagens)

1. No dashboard da Vercel, va em **Storage**
2. Clique em **Create Database**
3. Selecione **Blob**
4. Conecte ao seu projeto
5. O `BLOB_READ_WRITE_TOKEN` sera adicionado automaticamente

---

## 3. Aplicar Schema do Banco

Apos o primeiro deploy, execute localmente para criar as tabelas:

```bash
# Configure DATABASE_URL local apontando para Neon
export DATABASE_URL="sua-connection-string-do-neon"

# Aplique o schema
cd packages/db
npx prisma db push
```

Ou use o Vercel CLI:

```bash
vercel env pull .env.local
cd packages/db
npx prisma db push
```

---

## 4. Verificar Deploy

1. Acesse a URL do deploy
2. Faca login com um usuario admin
3. Verifique se:
   - Dashboard carrega corretamente
   - Listagem de medicos funciona
   - Upload de imagens funciona

---

## Variaveis de Ambiente - Referencia

```env
# Obrigatorias
DATABASE_URL=postgresql://...          # Neon connection string
BETTER_AUTH_SECRET=xxx                  # Secret para autenticacao
BETTER_AUTH_URL=https://...             # URL da aplicacao
CORS_ORIGIN=https://...                 # Mesma URL da aplicacao

# Opcionais
CLICK_REPLICA_DATABASE_URL=...          # Banco Click (metricas)
BLOB_READ_WRITE_TOKEN=...               # Auto-gerado pela Vercel
```

---

## Troubleshooting

### Erro: "The column does not exist in the current database"

O schema nao foi aplicado ao banco. Execute:

```bash
cd packages/db
npx prisma db push
```

### Erro de CORS

Verifique se `CORS_ORIGIN` e `BETTER_AUTH_URL` estao corretos e apontam para a mesma URL.

### Upload de imagens nao funciona

Verifique se o Blob Storage esta habilitado no projeto Vercel e se o `BLOB_READ_WRITE_TOKEN` esta configurado.

---

## Crons (Tarefas Agendadas)

O projeto ja tem crons configurados em `vercel.json`:

| Endpoint | Horario | Descricao |
|----------|---------|-----------|
| `/api/cron/recalcular-scores` | 09:00 diario | Recalcula scores dos medicos |
| `/api/cron/processar-retry` | A cada 5 min | Processa fila de retry |
| `/api/cron/limpeza` | Domingo 06:00 | Limpeza de dados antigos |

Os crons so funcionam em producao na Vercel (plano Pro ou superior para crons frequentes).
