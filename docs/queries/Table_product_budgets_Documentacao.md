# Documentação: Tabela `product_budgets`

## Visão Geral

A tabela `product_budgets` registra os **orçamentos de produtos** (medicamentos à base de cannabis) enviados aos pacientes após a consulta médica. É uma das tabelas mais importantes do sistema, pois representa a **conversão final do funil de vendas** e o **faturamento da empresa**.

> ⚠️ **Importante**: Esta tabela é para pagamentos de ORÇAMENTO (produtos/medicamentos). Pagamentos de CONSULTA ficam na tabela `payments`.

---

## Estrutura da Tabela

| Campo | Tipo | Nullable | Descrição |
|-------|------|----------|-----------|
| `id` | INTEGER | NOT NULL | Chave primária (auto-increment) |
| `user_id` | INTEGER | YES | FK → `users.id` (paciente) |
| `negotiation_id` | INTEGER | YES | FK → `negotiations.id` |
| `medical_prescription_id` | INTEGER | YES | FK → `medical_prescriptions.id` (receita médica) |
| `status` | VARCHAR | YES | Status: `'pending'`, `'confirmed'`, `'cancelled'` |
| `value` | NUMERIC | YES | Valor total do orçamento em R$ |
| `created_at` | TIMESTAMP | YES | Data de criação do orçamento |
| `updated_at` | TIMESTAMP | YES | Data da última atualização |
| `payment_at` | TIMESTAMP | YES | **Data do pagamento** ✅ (usar para filtros!) |
| `updated_by_id` | INTEGER | YES | FK → `users.id` (atendente que confirmou) |
| `contacted` | BOOLEAN | YES | Se o paciente foi contatado |
| `patient_answered` | BOOLEAN | YES | Se o paciente respondeu |

---

## Relacionamentos

```
product_budgets.user_id ─────────────────→ users.id (paciente)
product_budgets.negotiation_id ──────────→ negotiations.id
product_budgets.medical_prescription_id ─→ medical_prescriptions.id
product_budgets.updated_by_id ───────────→ users.id (atendente)

product_budgets.id ←─────────────────────── product_budget_products.product_budget_id
product_budgets.id ←─────────────────────── deliveries.product_budget_id
```

---

## Tabelas Relacionadas

### `product_budget_products`
Relaciona orçamentos com produtos (relação N:N).

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | INTEGER | Chave primária |
| `product_budget_id` | INTEGER | FK → `product_budgets.id` |
| `product_id` | INTEGER | FK → `products.id` |
| `quantity` | INTEGER | Quantidade do produto |

### `products`
Catálogo de produtos (medicamentos).

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | INTEGER | Chave primária |
| `title` | VARCHAR | Nome do produto (ex: "CBD/CBG 2:1 60ml") |
| `price` | NUMERIC | Preço unitário |

---

## Regras de Negócio

### Status do Orçamento

| Status | Significado |
|--------|-------------|
| `pending` | Orçamento enviado, aguardando pagamento |
| `confirmed` | ✅ Orçamento pago |
| `cancelled` | Orçamento cancelado |

### Diferença entre Datas

| Campo | Quando Usar |
|-------|-------------|
| `created_at` | Quando o orçamento foi CRIADO |
| `updated_at` | Última modificação (qualquer alteração) |
| `payment_at` | **Momento exato do PAGAMENTO** ✅ |

> ⚠️ **Sempre use `payment_at`** para filtrar orçamentos pagos por data, não `created_at` ou `updated_at`.

---

## Timezone

Todos os campos de data são armazenados em **UTC**. Para exibir no horário de São Paulo:

```sql
payment_at AT TIME ZONE 'America/Sao_Paulo'
```

---

## Queries Básicas

### 1. Contar Orçamentos Pagos em um Período

```sql
SELECT COUNT(*) AS total_orcamentos_pagos
FROM product_budgets
WHERE status = 'confirmed'
  AND payment_at >= '2025-01-01'
  AND payment_at < '2025-02-01';
```

### 2. Faturamento Total em um Período

```sql
SELECT SUM(value) AS faturamento_total
FROM product_budgets
WHERE status = 'confirmed'
  AND payment_at >= '2025-01-01'
  AND payment_at < '2025-02-01';
```

### 3. Orçamentos por Status

```sql
SELECT 
    status,
    COUNT(*) AS quantidade,
    SUM(value) AS valor_total
FROM product_budgets
WHERE created_at >= '2025-01-01'
  AND created_at < '2025-02-01'
GROUP BY status
ORDER BY quantidade DESC;
```

### 4. Ticket Médio

```sql
SELECT
    COUNT(*) AS total_orcamentos,
    SUM(value) AS faturamento_total,
    ROUND(AVG(value), 2) AS ticket_medio,
    ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY value), 2) AS mediana
FROM product_budgets
WHERE status = 'confirmed'
  AND payment_at >= '2025-01-01'
  AND payment_at < '2025-02-01';
```

---

## Queries com Dados do Paciente

### 5. Lista de Orçamentos Pagos com Dados Completos

```sql
SELECT
    pb.id AS orcamento_id,
    pb.user_id,
    u.first_name AS nome_paciente,
    u.phone AS telefone,
    pb.value AS valor,
    pb.payment_at AT TIME ZONE 'America/Sao_Paulo' AS data_pagamento,
    pb.negotiation_id,
    'https://clickagendamento.com/pipeline/deal/' || pb.negotiation_id || '#payments' AS link_crm,
    u.data->>'linkChat' AS link_guru
FROM product_budgets pb
JOIN users u ON u.id = pb.user_id
WHERE pb.status = 'confirmed'
  AND pb.payment_at >= '2025-01-01'
  AND pb.payment_at < '2025-02-01'
ORDER BY pb.payment_at DESC;
```

### 6. Orçamentos por Estado (DDD)

```sql
SELECT
    CASE
        WHEN SUBSTR(u.phone, 3, 2) IN ('11','12','14','15','16','17','18','19') THEN 'São Paulo'
        WHEN SUBSTR(u.phone, 3, 2) IN ('21','22','24') THEN 'Rio de Janeiro'
        WHEN SUBSTR(u.phone, 3, 2) IN ('31','32','33','34','35','37','38') THEN 'Minas Gerais'
        WHEN SUBSTR(u.phone, 3, 2) IN ('41','42','43','44','45','46') THEN 'Paraná'
        WHEN SUBSTR(u.phone, 3, 2) IN ('47','48','49') THEN 'Santa Catarina'
        WHEN SUBSTR(u.phone, 3, 2) IN ('51','53','54','55') THEN 'Rio Grande do Sul'
        WHEN SUBSTR(u.phone, 3, 2) = '61' THEN 'Distrito Federal'
        WHEN SUBSTR(u.phone, 3, 2) IN ('71','73','74','75','77') THEN 'Bahia'
        ELSE 'Outros'
    END AS estado,
    COUNT(DISTINCT pb.id) AS qtd_orcamentos,
    SUM(pb.value) AS faturamento,
    COUNT(DISTINCT pb.user_id) AS clientes_unicos
FROM product_budgets pb
JOIN users u ON u.id = pb.user_id
WHERE pb.status = 'confirmed'
  AND pb.payment_at >= '2025-01-01'
  AND pb.payment_at < '2025-02-01'
GROUP BY 1
ORDER BY faturamento DESC;
```

---

## Queries de Análise de Equipe

### 7. Vendas por Atendente Responsável

```sql
SELECT
    COALESCE(
        CASE
            WHEN att.last_name IS NOT NULL AND att.last_name <> ''
            THEN TRIM(att.first_name) || ' ' || UPPER(SUBSTRING(TRIM(att.last_name) FROM 1 FOR 1)) || '.'
            ELSE TRIM(att.first_name)
        END,
        'Sistema/Outro'
    ) AS atendente,
    COUNT(*) AS qtd_orcamentos,
    SUM(pb.value) AS valor_total
FROM product_budgets pb
LEFT JOIN users att ON att.id = pb.updated_by_id
WHERE pb.status = 'confirmed'
  AND pb.payment_at >= '2025-01-01'
  AND pb.payment_at < '2025-02-01'
GROUP BY 1
ORDER BY valor_total DESC;
```

### IDs de Atendentes Comuns

| updated_by_id | Nome |
|---------------|------|
| 1 | Admin |
| 206 | Bruna |
| 213 | Lucas |
| 214 | Íris |
| 3307 | Marcelo |
| 7765 | Gabriel |
| 8246 | Clico (sistema) |

---

## Queries de Série Temporal

### 8. Faturamento por Mês

```sql
SELECT
    TO_CHAR(payment_at AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM') AS mes,
    COUNT(*) AS qtd_orcamentos,
    SUM(value) AS faturamento
FROM product_budgets
WHERE status = 'confirmed'
  AND payment_at >= '2024-01-01'
GROUP BY 1
ORDER BY 1;
```

### 9. Vendas por Hora do Dia

```sql
SELECT 
    EXTRACT(HOUR FROM payment_at AT TIME ZONE 'America/Sao_Paulo') AS hora,
    COUNT(*) AS qtd_orcamentos,
    SUM(value) AS faturamento
FROM product_budgets
WHERE status = 'confirmed'
  AND payment_at >= '2025-01-01'
  AND payment_at < '2025-02-01'
GROUP BY 1
ORDER BY 1;
```

---

## Queries com Produtos

### 10. Produtos Mais Vendidos

```sql
SELECT
    p.title AS produto,
    SUM(pbp.quantity) AS quantidade_vendida,
    COUNT(DISTINCT pb.id) AS qtd_orcamentos
FROM product_budgets pb
JOIN product_budget_products pbp ON pbp.product_budget_id = pb.id
JOIN products p ON p.id = pbp.product_id
WHERE pb.status = 'confirmed'
  AND pb.payment_at >= '2025-01-01'
  AND pb.payment_at < '2025-02-01'
GROUP BY p.title
ORDER BY quantidade_vendida DESC;
```

### 11. Detalhes de Vendas de um Produto Específico

```sql
SELECT 
    p.title AS produto,
    pbp.quantity AS quantidade,
    pb.value AS valor_orcamento,
    pb.payment_at AT TIME ZONE 'America/Sao_Paulo' AS data_pagamento,
    pb.user_id,
    u.first_name || ' ' || COALESCE(u.last_name, '') AS nome_paciente,
    'https://clickagendamento.com/pipeline/deal/' || pb.negotiation_id || '#overview' AS link_crm
FROM product_budgets pb
JOIN product_budget_products pbp ON pbp.product_budget_id = pb.id
JOIN products p ON p.id = pbp.product_id
LEFT JOIN users u ON u.id = pb.user_id
WHERE pb.status = 'confirmed'
  AND p.title ILIKE '%CBD/CBG 2:1 60ml%'
ORDER BY pb.payment_at DESC;
```

---

## Queries de Recorrência

### 12. Primeira Compra vs Recorrência

```sql
WITH orcamentos_periodo AS (
    SELECT 
        pb.id,
        pb.user_id,
        pb.value,
        pb.payment_at,
        pb.negotiation_id
    FROM product_budgets pb
    WHERE pb.status = 'confirmed'
      AND pb.payment_at >= '2025-01-01'
      AND pb.payment_at < '2025-02-01'
),
recorrencias AS (
    SELECT op.id AS orcamento_id
    FROM orcamentos_periodo op
    JOIN negotiations n ON n.id = op.negotiation_id
    WHERE EXISTS (
        SELECT 1
        FROM deliveries d
        JOIN negotiations n2 ON n2.id = d.negotiation_id
        WHERE d.status = 'Delivered'
          AND d.event_date < op.payment_at
          AND n2.user_id = n.user_id
    )
)
SELECT
    CASE 
        WHEN r.orcamento_id IS NOT NULL THEN 'Recorrência'
        ELSE 'Primeira Compra'
    END AS tipo,
    COUNT(*) AS quantidade,
    SUM(op.value) AS valor_total,
    ROUND(AVG(op.value), 2) AS ticket_medio
FROM orcamentos_periodo op
LEFT JOIN recorrencias r ON r.orcamento_id = op.id
GROUP BY 1
ORDER BY 1;
```

### 13. Distribuição de Recorrência (Pipeline 7)

```sql
SELECT 
    qtd_compras,
    COUNT(*) AS total_leads
FROM (
    SELECT n.user_id, COUNT(DISTINCT pb.id) AS qtd_compras
    FROM negotiations n
    LEFT JOIN product_budgets pb ON pb.user_id = n.user_id AND pb.status = 'confirmed'
    WHERE n.pipeline_id = 7
    GROUP BY n.user_id
) sub
GROUP BY qtd_compras
ORDER BY qtd_compras;
```

**Benchmark de Recorrência (Pipeline 7):**

| Qtd de Compras | % do Total |
|----------------|------------|
| 1 compra | 88,0% |
| 2 compras | 9,9% |
| 3 compras | 1,5% |
| 4+ compras | 0,6% |

### 14. Histórico de Compras por Usuário (Pivotado)

```sql
WITH compras_numeradas AS (
    SELECT 
        pb.user_id,
        pb.payment_at AT TIME ZONE 'America/Sao_Paulo' AS data_compra,
        pb.value,
        ROW_NUMBER() OVER (PARTITION BY pb.user_id ORDER BY pb.payment_at) AS numero_compra
    FROM product_budgets pb
    WHERE pb.status = 'confirmed'
      AND pb.payment_at IS NOT NULL
)
SELECT 
    user_id,
    MAX(CASE WHEN numero_compra = 1 THEN TO_CHAR(data_compra, 'DD/MM/YYYY') END) AS data_1a_compra,
    MAX(CASE WHEN numero_compra = 2 THEN TO_CHAR(data_compra, 'DD/MM/YYYY') END) AS data_2a_compra,
    MAX(CASE WHEN numero_compra = 3 THEN TO_CHAR(data_compra, 'DD/MM/YYYY') END) AS data_3a_compra,
    MAX(CASE WHEN numero_compra = 4 THEN TO_CHAR(data_compra, 'DD/MM/YYYY') END) AS data_4a_compra,
    MAX(CASE WHEN numero_compra = 5 THEN TO_CHAR(data_compra, 'DD/MM/YYYY') END) AS data_5a_compra,
    COUNT(*) AS total_compras,
    SUM(value) AS valor_total_gasto
FROM compras_numeradas
GROUP BY user_id
ORDER BY total_compras DESC;
```

---

## Queries por Pipeline

### 15. Faturamento por Pipeline

```sql
SELECT
    n.pipeline_id,
    COUNT(DISTINCT pb.id) AS qtd_orcamentos,
    SUM(pb.value) AS faturamento
FROM product_budgets pb
JOIN negotiations n ON n.id = pb.negotiation_id
WHERE pb.status = 'confirmed'
  AND pb.payment_at >= '2025-01-01'
  AND pb.payment_at < '2025-02-01'
GROUP BY n.pipeline_id
ORDER BY faturamento DESC;
```

**Pipelines relevantes para vendas:**
- Pipeline 3: Receitas e financeiro (vendas iniciais)
- Pipeline 7: Pós-Venda (recompras)
- Pipeline 8/9: Pós-venda avançado

---

## Armadilhas Comuns

| Armadilha | Problema | Solução |
|-----------|----------|---------|
| Usar `created_at` ao invés de `payment_at` | Data errada para análise de vendas | Sempre usar `payment_at` para pagamentos |
| Esquecer `status = 'confirmed'` | Inclui pendentes e cancelados | Sempre filtrar por status |
| Não usar timezone | Datas deslocadas | Usar `AT TIME ZONE 'America/Sao_Paulo'` |
| Confundir com `payments` | Tabelas diferentes | `payments` = consulta, `product_budgets` = orçamento |
| Esquecer JOIN com `product_budget_products` | Sem detalhes dos produtos | Fazer JOIN para análise de produtos |

---

## Resumo: Campos Mais Usados

| Campo | Quando Usar |
|-------|-------------|
| `payment_at` | Data do pagamento (para análises de faturamento) |
| `value` | Valor do orçamento (para faturamento e ticket médio) |
| `status` | Filtrar confirmados vs pendentes |
| `user_id` | JOIN com `users` para dados do paciente |
| `negotiation_id` | JOIN com `negotiations` para funil/pipeline |
| `updated_by_id` | Identificar atendente responsável pela venda |
| `medical_prescription_id` | Vincular com receita médica |

---

## Changelog

| Data | Versão | Descrição |
|------|--------|-----------|
| 2025-01-22 | 1.0 | Documentação inicial |
