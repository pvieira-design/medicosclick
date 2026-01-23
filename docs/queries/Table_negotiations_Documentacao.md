# Documentação: Tabela `negotiations`

## Visão Geral

A tabela `negotiations` representa o CRM da Click Cannabis, controlando a jornada do lead/paciente através dos diferentes pipelines de vendas. Cada negociação vincula um usuário a uma etapa específica do funil de vendas.

**Total de registros:** ~364.283 negociações

---

## Estrutura da Tabela

| Campo | Tipo | Nullable | Descrição |
|-------|------|----------|-----------|
| `id` | INTEGER | NOT NULL | Chave primária (auto-increment) |
| `user_id` | INTEGER | YES | FK → `users.id` (lead/paciente) |
| `pipeline_id` | INTEGER | YES | FK → `pipelines.id` (qual pipeline) |
| `funnel_stage_id` | INTEGER | YES | FK → `funnel_stages.id` (etapa do funil) |
| `status` | VARCHAR | YES | Status da negociação |
| `notes` | VARCHAR | YES | Anotações sobre o lead |
| `created_at` | TIMESTAMPTZ | YES | Data de criação |
| `updated_at` | TIMESTAMPTZ | YES | Data da última atualização |
| `origin` | VARCHAR | YES | Origem do lead (UTM source) |
| `note_by` | VARCHAR | YES | Quem fez a anotação |
| `delegated_to` | INTEGER | YES | FK → users.id (delegação antiga) |
| `delegated_to_byclico` | INTEGER | YES | FK → users.id (delegação atual) |
| `related_negotiation_id` | INTEGER | YES | FK → negotiations.id (negociação relacionada) |

---

## Relacionamentos Principais

```
negotiations.user_id ────────────────→ users.id (lead/paciente)
negotiations.pipeline_id ────────────→ pipelines.id
negotiations.funnel_stage_id ────────→ funnel_stages.id
negotiations.delegated_to_byclico ───→ users.id (atendente responsável)
negotiations.related_negotiation_id ─→ negotiations.id (auto-relacionamento)

negotiations.id ←──────────────────── consultings.negotiation_id
negotiations.id ←──────────────────── payments.negotiation_id
negotiations.id ←──────────────────── product_budgets.negotiation_id
negotiations.id ←──────────────────── deliveries.negotiation_id
negotiations.id ←──────────────────── pacient_tags.negotiation_id
```

---

## Pipelines Disponíveis

| ID | Nome | Total Negociações | Descrição |
|----|------|-------------------|-----------|
| 1 | Atendimento Inicial | 297.473 | Leads novos e em processo de conversão |
| 2 | Consulta Médica | 7.298 | Pagou consulta, aguardando/realizando consulta |
| 3 | Receitas e financeiro | 29.837 | Receita enviada, aguardando compra de orçamento |
| 4 | Documentação | 1.149 | Documentação para ANVISA em processamento |
| 5 | Entrega | 4.343 | Produto em trânsito |
| 6 | Produto Entregue | 64 | Produto recém entregue |
| 7 | Pós Venda | 16.730 | Acompanhamento pós-entrega |
| 8 | Pós venda - Consulta Acomp. | 4.388 | Fez consulta de acompanhamento |
| 9 | Pós venda - 2+ Pedidos | 3.001 | Clientes recorrentes |

---

## Etapas do Funil (funnel_stages)

### Pipeline 1 - Atendimento Inicial
| ID | Nome |
|----|------|
| 1 | Enviou a 1a mensagem |
| 2 | Interagiu |
| 3 | Explicação do processo |
| 4 | Aquecimento - Pagamento |
| 5 | Aguardando Pagamento |
| 30 | Paciente faz tratamento |
| 31 | Paciente teve contato com Cannabis |

### Pipeline 2 - Consulta Médica
| ID | Nome |
|----|------|
| 6 | Aguardando Agendamento |
| 7 | Agendamento Feito |
| 8 | Agendamento Anamnese |
| 9 | Aguardando Consulta |
| 10 | Consulta Iniciada |
| 11 | Aguardando receita |
| 29 | Consulta Não Aconteceu |
| 40 | Consulta sem receita |

### Pipeline 3 - Receitas e financeiro
| ID | Nome |
|----|------|
| 12 | Receita Enviada |
| 13 | Orçamento Gerado |
| 14 | Orçamento Enviado |
| 15 | Link de Pagamento Enviado |
| 39 | Pre-Anvisa |

### Pipeline 4 - Documentação
| ID | Nome |
|----|------|
| 16 | Aguardando Documentos |
| 17 | Análise de Documentos |
| 18 | Rastreio Pendente |
| 19 | Produto em Falta |
| 28 | Anvisa |

### Pipeline 5 - Entrega
| ID | Nome |
|----|------|
| 20 | Código de Rastreio Enviado |
| 21 | Produto Saiu dos EUA |
| 22 | Produto na Anvisa |
| 23 | Recebido Pela Transportadora |

### Pipeline 6 - Produto Entregue
| ID | Nome |
|----|------|
| 24 | Produto Entregue |
| 25 | Acompanhamento 7 Dias |
| 26 | Acompanhamento 30 Dias |
| 27 | Produto Acabando |

### Pipeline 7 - Pós Venda
| ID | Nome | Dias desde entrega |
|----|------|--------------------|
| 50 | 3d | 0-4 dias |
| 49 | 5d | 5-14 dias |
| 32 | 15 dias | 15-22 dias |
| 33 | 23 dias | 23-29 dias |
| 34 | 30 dias | 30-44 dias |
| 35 | 45 dias | 45-69 dias |
| 36 | 70 dias | 70-89 dias |
| 37 | 90 dias | 90-179 dias |
| 38 | +180 dias | 180+ dias |

### Pipeline 8 - Pós venda - Consulta Acomp. Realizada
| ID | Nome |
|----|------|
| 41 | Finalizou consulta acompanhamento |
| 42 | 7d Pós Consulta |
| 43 | 20d Pós Consulta |
| 44 | 40d+ Pós Consulta (sem pagamento) |

### Pipeline 9 - Pós venda - 2+ Pedidos
| ID | Nome |
|----|------|
| 45 | Pedido recompra entregue |
| 46 | 7d pós entrega |
| 47 | 30d pós entrega |
| 48 | 60d+ pós entrega |

---

## Queries Úteis

### Buscar negociação por ID
```sql
SELECT 
  n.id,
  n.user_id,
  u.first_name,
  u.email,
  n.pipeline_id,
  p.name AS pipeline_name,
  n.funnel_stage_id,
  fs.name AS stage_name,
  n.created_at,
  n.updated_at
FROM negotiations n
LEFT JOIN users u ON u.id = n.user_id
LEFT JOIN pipelines p ON p.id = n.pipeline_id
LEFT JOIN funnel_stages fs ON fs.id = n.funnel_stage_id
WHERE n.id = 12345;
```

### Listar negociações de um usuário
```sql
SELECT 
  n.id AS negotiation_id,
  p.name AS pipeline,
  fs.name AS etapa,
  n.created_at,
  n.updated_at
FROM negotiations n
LEFT JOIN pipelines p ON p.id = n.pipeline_id
LEFT JOIN funnel_stages fs ON fs.id = n.funnel_stage_id
WHERE n.user_id = 12345
ORDER BY n.updated_at DESC;
```

### Contar leads por pipeline
```sql
SELECT 
  n.pipeline_id,
  p.name AS pipeline_name,
  COUNT(*) AS total
FROM negotiations n
LEFT JOIN pipelines p ON p.id = n.pipeline_id
GROUP BY n.pipeline_id, p.name
ORDER BY n.pipeline_id;
```

### Contar leads por etapa em um pipeline
```sql
SELECT 
  n.funnel_stage_id,
  fs.name AS stage_name,
  COUNT(*) AS total
FROM negotiations n
LEFT JOIN funnel_stages fs ON fs.id = n.funnel_stage_id
WHERE n.pipeline_id = 7  -- Pós Venda
GROUP BY n.funnel_stage_id, fs.name
ORDER BY total DESC;
```

### Leads delegados para um atendente
```sql
SELECT 
  n.id AS negotiation_id,
  n.user_id,
  u.first_name,
  u.phone,
  p.name AS pipeline,
  fs.name AS etapa
FROM negotiations n
LEFT JOIN users u ON u.id = n.user_id
LEFT JOIN pipelines p ON p.id = n.pipeline_id
LEFT JOIN funnel_stages fs ON fs.id = n.funnel_stage_id
WHERE n.delegated_to_byclico = 123  -- ID do atendente
ORDER BY n.updated_at DESC;
```

### Gerar link do CRM
```sql
SELECT 
  n.id,
  CONCAT('https://clickagendamento.com/pipeline/deal/', n.id, '#overview') AS crm_link
FROM negotiations n
WHERE n.user_id = 12345;
```

---

## Regras de Negócio

### Fluxo Normal do Lead

```
Pipeline 1 (Atendimento Inicial)
    ↓ [Paga consulta]
Pipeline 2 (Consulta Médica)
    ↓ [Recebe receita]
Pipeline 3 (Receitas e financeiro)
    ↓ [Paga orçamento]
Pipeline 4 (Documentação)
    ↓ [Documentos aprovados]
Pipeline 5 (Entrega)
    ↓ [Produto entregue]
Pipeline 7 (Pós Venda)
    ↓ [Fez consulta de acompanhamento]
Pipeline 8 (Pós venda - Consulta Acomp.)
    ↓ [Comprou novamente]
Pipeline 9 (Pós venda - 2+ Pedidos)
```

### Etapa do P7 baseada em dias desde entrega
```sql
CASE 
  WHEN dias_desde_entrega < 5 THEN 50   -- 3d
  WHEN dias_desde_entrega < 15 THEN 49  -- 5d
  WHEN dias_desde_entrega < 23 THEN 32  -- 15 dias
  WHEN dias_desde_entrega < 30 THEN 33  -- 23 dias
  WHEN dias_desde_entrega < 45 THEN 34  -- 30 dias
  WHEN dias_desde_entrega < 70 THEN 35  -- 45 dias
  WHEN dias_desde_entrega < 90 THEN 36  -- 70 dias
  WHEN dias_desde_entrega < 180 THEN 37 -- 90 dias
  ELSE 38                                -- +180 dias
END AS funnel_stage_id_correto
```

---

## Joins Comuns

### Com dados completos do lead
```sql
SELECT 
  n.*,
  u.first_name,
  u.email,
  u.phone,
  u.data->>'linkChat' AS guru_link,
  CONCAT('https://clickagendamento.com/pipeline/deal/', n.id, '#overview') AS crm_link
FROM negotiations n
LEFT JOIN users u ON u.id = n.user_id
WHERE n.pipeline_id = 7;
```

### Com nome do atendente responsável
```sql
SELECT 
  n.id,
  n.user_id,
  n.delegated_to_byclico,
  CASE
    WHEN att.last_name IS NOT NULL AND att.last_name <> ''
    THEN TRIM(att.first_name) || ' ' || UPPER(SUBSTRING(TRIM(att.last_name) FROM 1 FOR 1)) || '.'
    ELSE TRIM(att.first_name)
  END AS atendente_responsavel
FROM negotiations n
LEFT JOIN users att ON att.id = n.delegated_to_byclico
WHERE n.pipeline_id = 1;
```

---

## Notas Importantes

1. **Um usuário pode ter múltiplas negociações:** Especialmente se retornou ao funil após perder interesse.

2. **Timezone:** Campos `created_at` e `updated_at` são armazenados em UTC.

3. **Delegação:** Use `delegated_to_byclico` (não `delegated_to`) para identificar o atendente responsável atual.

4. **Etapas do P7:** As etapas do Pipeline 7 são baseadas no tempo desde a primeira entrega. Um job automático deveria atualizar, mas pode haver atrasos.

5. **related_negotiation_id:** Usado para vincular negociações relacionadas (ex: recompra).

---

## Changelog

| Data | Versão | Descrição |
|------|--------|-----------|
| 2025-01-22 | 1.0 | Documentação inicial |
