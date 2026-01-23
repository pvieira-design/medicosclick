# Documentação: Tabela `payments`

## Visão Geral

A tabela `payments` registra todos os pagamentos de **consultas médicas** na plataforma Click Cannabis. É uma das tabelas mais importantes do sistema, pois representa a **conversão do lead em paciente pagante**.

> ⚠️ **Importante**: Esta tabela é exclusiva para pagamentos de CONSULTA. Pagamentos de ORÇAMENTO (produtos/medicamentos) ficam na tabela `product_budgets`.

---

## Estrutura da Tabela

| Campo | Tipo | Nullable | Descrição |
|-------|------|----------|-----------|
| `id` | INTEGER | NOT NULL | Chave primária (auto-increment) |
| `user_id` | INTEGER | YES | FK → `users.id` (paciente) |
| `negotiation_id` | INTEGER | YES | FK → `negotiations.id` |
| `consulting_id` | INTEGER | YES | FK → `consultings.id` (quando consulta já foi agendada) |
| `status` | VARCHAR | YES | Status do pagamento: `'confirmed'` ou `'pending'` |
| `payment_at` | TIMESTAMP | YES | Data/hora em que o pagamento foi confirmado |
| `created_at` | TIMESTAMP | YES | Data/hora de criação do registro de pagamento |
| `updated_at` | TIMESTAMP | YES | Data/hora da última atualização |
| `updated_by_id` | INTEGER | YES | FK → `users.id` (atendente que confirmou) |
| `access_at` | TIMESTAMP | YES | Data/hora em que o usuário acessou o link de pagamento |
| `tax_id` | VARCHAR | YES | CPF do pagador (se preenchido = PIX foi gerado) |
| `access_data` | JSONB | YES | Dados do dispositivo usado no acesso |

---

## Relacionamentos

```
payments.user_id ────────────→ users.id (paciente)
payments.negotiation_id ─────→ negotiations.id
payments.consulting_id ──────→ consultings.id (opcional)
payments.updated_by_id ──────→ users.id (atendente responsável)

payments.id ←────────────────── reference_payments.payment_id (indicações)
```

---

## Regras de Negócio

### Status do Pagamento

| Status | Condição | Significado |
|--------|----------|-------------|
| `confirmed` | `status = 'confirmed'` AND `payment_at IS NOT NULL` | ✅ Pagamento confirmado |
| `pending` | `status = 'pending'` | ⏳ Pagamento pendente/aguardando |

### Interação com Link de Pagamento

| Condição | Significado |
|----------|-------------|
| `access_at IS NULL` | Usuário NÃO acessou o link de pagamento |
| `access_at IS NOT NULL` | Usuário acessou o link de pagamento |
| `tax_id IS NULL` | Usuário NÃO gerou o PIX |
| `tax_id IS NOT NULL` | Usuário gerou o PIX (preencheu CPF) |

### Diferença entre Datas

| Campo | Quando Usar |
|-------|-------------|
| `created_at` | Quando o registro foi CRIADO (pode ser antes do pagamento) |
| `payment_at` | **Momento exato do PAGAMENTO** ✅ (usar para filtros de data) |
| `updated_at` | Última modificação (qualquer alteração) |

> ⚠️ **Sempre use `payment_at`** para filtrar pagamentos por data, não `created_at`.

---

## Timezone

Todos os campos de data são armazenados em **UTC**. Para exibir no horário de São Paulo:

```sql
payment_at AT TIME ZONE 'America/Sao_Paulo'
```

---

## Queries Básicas

### 1. Contar Pagamentos Confirmados em um Período

```sql
SELECT COUNT(*) AS total_consultas_pagas
FROM payments
WHERE status = 'confirmed'
  AND payment_at IS NOT NULL
  AND payment_at >= '2025-01-01'
  AND payment_at < '2025-02-01';
```

### 2. Pagamentos por Mês

```sql
SELECT 
    TO_CHAR(payment_at AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM') AS mes,
    COUNT(*) AS total_pagamentos
FROM payments
WHERE status = 'confirmed'
  AND payment_at >= '2024-01-01'
GROUP BY TO_CHAR(payment_at AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM')
ORDER BY mes;
```

### 3. Pagamentos por Hora do Dia

```sql
SELECT 
    EXTRACT(HOUR FROM payment_at AT TIME ZONE 'America/Sao_Paulo') AS hora,
    COUNT(*) AS total_pagamentos
FROM payments
WHERE status = 'confirmed'
  AND payment_at >= '2025-01-01'
  AND payment_at < '2025-02-01'
GROUP BY 1
ORDER BY 1;
```

---

## Queries com Dados do Paciente

### 4. Lista de Pagamentos com Dados Completos

```sql
SELECT
    p.id AS payment_id,
    p.user_id,
    u.first_name,
    u.last_name,
    u.email,
    u.phone,
    p.status AS payment_status,
    p.created_at AT TIME ZONE 'America/Sao_Paulo' AS criado_em,
    p.payment_at AT TIME ZONE 'America/Sao_Paulo' AS pago_em,
    -- Tempo entre criação e pagamento (em minutos)
    EXTRACT(EPOCH FROM (p.payment_at - p.created_at)) / 60.0 AS tempo_para_pagar_minutos,
    -- Links úteis
    'https://clickagendamento.com/pipeline/deal/' || p.negotiation_id || '#payments' AS crm_link,
    u.data->>'linkChat' AS guru_link
FROM payments p
JOIN users u ON u.id = p.user_id
WHERE p.status = 'confirmed'
  AND p.payment_at >= '2025-01-01'
  AND p.payment_at < '2025-02-01'
ORDER BY p.payment_at DESC;
```

### 5. Pagamentos com Pipeline e Funil

```sql
SELECT
    p.user_id,
    p.negotiation_id,
    n.pipeline_id,
    n.funnel_stage_id,
    p.status AS payment_status,
    p.consulting_id,
    CASE
        WHEN p.consulting_id IS NOT NULL THEN 'Já agendou consulta'
        ELSE 'Não agendou consulta'
    END AS status_agendamento,
    p.payment_at AT TIME ZONE 'America/Sao_Paulo' AS data_pagamento,
    'https://clickagendamento.com/pipeline/deal/' || p.negotiation_id || '#overview' AS crm_link
FROM payments p
LEFT JOIN negotiations n ON n.id = p.negotiation_id
WHERE p.status = 'confirmed'
  AND p.payment_at >= '2025-01-01'
ORDER BY p.payment_at DESC;
```

---

## Queries de Análise de Equipe

### 6. Pagamentos por Atendente Responsável

```sql
SELECT 
    CASE 
        WHEN attendant.last_name IS NOT NULL AND attendant.last_name <> '' 
        THEN TRIM(attendant.first_name) || ' ' || UPPER(SUBSTRING(TRIM(attendant.last_name) FROM 1 FOR 1)) || '.'
        ELSE TRIM(attendant.first_name)
    END AS responsavel,
    COUNT(*) AS total_confirmados
FROM payments p
LEFT JOIN users attendant ON attendant.id = p.updated_by_id
WHERE p.status = 'confirmed'
  AND p.payment_at >= '2025-01-01'
  AND p.payment_at < '2025-02-01'
GROUP BY 1
ORDER BY total_confirmados DESC;
```

---

## Queries de Funil de Conversão

### 7. Análise de Interação com Link de Pagamento

```sql
SELECT
    CASE 
        WHEN access_at IS NULL THEN 'Não acessou link'
        ELSE 'Acessou link'
    END AS interacao_link,
    CASE 
        WHEN tax_id IS NULL THEN 'Não gerou PIX'
        ELSE 'Gerou PIX'
    END AS geracao_pix,
    COUNT(*) AS total
FROM payments
WHERE status = 'pending'
  AND created_at >= '2025-01-01'
  AND created_at < '2025-02-01'
GROUP BY 1, 2;
```

### 8. Primeiro Pagamento de Cada Usuário

```sql
SELECT DISTINCT ON (p.user_id)
    p.user_id,
    p.id AS primeiro_payment_id,
    p.payment_at AT TIME ZONE 'America/Sao_Paulo' AS data_primeiro_pagamento,
    u.first_name,
    u.created_at AT TIME ZONE 'America/Sao_Paulo' AS data_cadastro,
    EXTRACT(DAY FROM (p.payment_at - u.created_at)) AS dias_ate_pagar
FROM payments p
JOIN users u ON u.id = p.user_id
WHERE p.status = 'confirmed'
ORDER BY p.user_id, p.payment_at ASC;
```

### 9. Pagamentos de Retorno (Recorrência)

```sql
SELECT COUNT(*) AS consultas_recorrentes
FROM payments p
WHERE p.status = 'confirmed'
  AND p.payment_at >= '2025-01-01'
  AND p.payment_at < '2025-02-01'
  AND EXISTS (
      SELECT 1
      FROM payments p2
      WHERE p2.user_id = p.user_id
        AND p2.status = 'confirmed'
        AND (p.payment_at - p2.payment_at) >= INTERVAL '3 days'
  );
```

---

## Armadilhas Comuns

| Armadilha | Problema | Solução |
|-----------|----------|---------|
| Confundir `payment_at` com `created_at` | `created_at` é quando o registro foi criado, não quando foi pago | Sempre usar `payment_at` para data de pagamento |
| Esquecer conversão de timezone | Datas em UTC, Brasil usa UTC-3 | Usar `AT TIME ZONE 'America/Sao_Paulo'` |
| Não filtrar por status | Inclui pendentes na contagem | Sempre incluir `status = 'confirmed'` |
| Confundir com `product_budgets` | Tabelas diferentes para tipos de pagamento | `payments` = consulta, `product_budgets` = orçamento |
| Usar `=` em datas com horário | Pode não encontrar registros | Usar padrão `>= data_inicio AND < data_fim` |

---

## Resumo: Campos Mais Usados

| Campo | Quando Usar |
|-------|-------------|
| `payment_at` | Data do pagamento confirmado (para análises de conversão) |
| `created_at` | Data de criação do registro (para análise de pendentes) |
| `status` | Filtrar confirmados vs pendentes |
| `user_id` | JOIN com `users` para dados do paciente |
| `negotiation_id` | JOIN com `negotiations` para funil/pipeline |
| `updated_by_id` | Identificar atendente responsável |
| `consulting_id` | Verificar se consulta já foi agendada |
| `access_at` | Análise de interação com link |
| `tax_id` | Verificar se PIX foi gerado |

---

## Changelog

| Data | Versão | Descrição |
|------|--------|-----------|
| 2025-01-22 | 1.0 | Documentação inicial |
