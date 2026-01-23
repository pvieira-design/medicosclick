# Documentação Completa: Schema do Banco de Dados Click Cannabis

**Data de Criação:** 23 de Janeiro de 2026  
**Banco:** PostgreSQL  
**Ferramentas:** Postico, Grafana, Metabase

---

## 1. Visão Geral

A Click Cannabis utiliza PostgreSQL como banco de dados principal. O sistema gerencia toda a jornada do paciente desde o primeiro contato até o acompanhamento pós-tratamento.

### 1.1 Lista Completa de Tabelas

```
activities               addresses               anamnese
api_tokens              attachments             calendly_configs
calls                   changelogs              chat_histories
chat_providers          consulting_reviews      consulting_schedules
consultings             deliveries              delivery_logs
dialogs                 doctor_leads            doctor_requests
doctor_schedules        doctors                 driver_leads
event_blocks            events                  files
form_answers            form_responses          funnel_stages
galleries               gallery_image_store_items   gallery_images
google_auths            histories               inboxes
integrations            jobs                    leads
magic_links             marketing_items         marketings
medical_prescriptions   medical_records         negotiations
notes                   notices                 notifications
nps                     otps                    pacient_tags
participants            payments                pipelines
product_budget_products product_budgets         product_medical_prescriptions
product_stock           products                reference_payments
refunds                 request_consultings     store_items
template_dialogs        tracking_data           user_activities
user_infos              user_sectors            users
```

---

## 2. Tabelas Principais

### 2.1 Tabela `consultings` (Consultas Médicas)

**⚠️ IMPORTANTE:** O campo `start` é **VARCHAR**, não timestamp! Sempre converter: `start::timestamptz`

| Campo | Tipo | Nullable | Descrição |
|-------|------|----------|-----------|
| `id` | INTEGER | NOT NULL | Chave primária |
| `user_id` | INTEGER | YES | FK → users (paciente) |
| `doctor_id` | INTEGER | YES | FK → doctors (médico) |
| `negotiation_id` | INTEGER | YES | FK → negotiations (deal) |
| `data` | JSONB | YES | Dados adicionais |
| `pipe_id` | BIGINT | YES | ID do pipe |
| `event_id` | VARCHAR | YES | ID do evento |
| `status` | TEXT | NOT NULL | Status da consulta |
| `start` | **VARCHAR** | YES | ⚠️ Data/hora - PRECISA CONVERTER |
| `description` | VARCHAR | YES | Descrição |
| `type` | VARCHAR | YES | Tipo de consulta |
| `scheduling` | VARCHAR | YES | Tipo de agendamento |
| `link` | VARCHAR | YES | Link da videochamada |
| `created_at` | TIMESTAMPTZ | YES | Data de criação |
| `updated_at` | TIMESTAMPTZ | YES | Data de atualização |
| `prescription_status` | TEXT | YES | Status da receita |
| `reason_for_cancellation` | VARCHAR | YES | Motivo do não comparecimento |
| `reason_for_no_prescription` | VARCHAR | YES | Motivo de não prescrever |
| `medical_record` | TEXT | YES | Prontuário |
| `completed` | BOOLEAN | YES | Se a consulta foi realizada |
| `meet_data` | JSONB | YES | Dados da videochamada |

#### Valores do campo `status`:
| Status | Descrição |
|--------|-----------|
| `preconsulting` | Slot reservado sem paciente (maioria são bugs) |
| `confirmed` | Consulta confirmada |
| `reschudeled` | Reagendada (note o typo no banco) |
| `cancelled` | Cancelada |

#### Valores do campo `prescription_status`:
| Status | Descrição |
|--------|-----------|
| `required` | Teve receita médica |
| `not_required` | Sem receita |
| `NULL` | Pendente de processamento |

#### Valores do campo `completed`:
| Valor | Descrição |
|-------|-----------|
| `TRUE` | Consulta realizada |
| `FALSE` | Paciente não compareceu (no-show) |
| `NULL` | Pendente de processamento pelo médico |

---

### 2.2 Tabela `doctors` (Médicos)

| Campo | Tipo | Nullable | Descrição |
|-------|------|----------|-----------|
| `id` | INTEGER | NOT NULL | Chave primária |
| `user_id` | INTEGER | YES | FK → users (conta do médico) |
| `name` | VARCHAR | YES | Nome completo |
| `number` | VARCHAR | YES | Número de identificação |
| `priority` | INTEGER | YES | Prioridade de agendamento |
| `schedule` | JSONB | YES | Agenda semanal configurada |
| `created_at` | TIMESTAMPTZ | YES | Data de criação |
| `updated_at` | TIMESTAMPTZ | YES | Data de atualização |
| `crm` | VARCHAR | YES | Número do CRM |
| `dialog_id` | VARCHAR | YES | ID do dialog |
| `doctor_schedule` | JSONB | YES | Agenda alternativa |
| `speciality` | VARCHAR | YES | Especialidade (note o typo) |

#### Formato do campo `schedule` (JSONB):
```json
{
  "SEG": ["08:00-12:00", "14:00-18:00"],
  "TER": ["09:00-17:00"],
  "QUA": ["08:00-12:00"],
  "QUI": ["14:00-20:00"],
  "SEX": ["08:00-12:00"],
  "SAB": null,
  "DOM": null
}
```

**Códigos dos dias da semana:**
| Código | Dia |
|--------|-----|
| SEG | Segunda-feira |
| TER | Terça-feira |
| QUA | Quarta-feira |
| QUI | Quinta-feira |
| SEX | Sexta-feira |
| SAB | Sábado |
| DOM | Domingo |

---

### 2.3 Tabela `users` (Usuários/Pacientes)

**NOTA:** Não existe tabela `patients`. Os pacientes são armazenados em `users`.

| Campo | Tipo | Nullable | Descrição |
|-------|------|----------|-----------|
| `id` | INTEGER | NOT NULL | Chave primária |
| `first_name` | VARCHAR | YES | Primeiro nome |
| `last_name` | VARCHAR | YES | Sobrenome |
| `email` | VARCHAR | NOT NULL | E-mail (único) |
| `id_blip` | VARCHAR | YES | ID do Blip (chat) |
| `national_id` | VARCHAR | YES | CPF |
| `deal_id` | VARCHAR | YES | ID do deal legado |
| `birth_date` | DATE | YES | Data de nascimento |
| `role` | TEXT | NOT NULL | Papel (paciente/admin/médico) |
| `phone` | VARCHAR | YES | Telefone (formato: 55DXXXXXXXXX) |
| `avatar` | VARCHAR | YES | URL do avatar |
| `password` | VARCHAR | YES | Senha hash |
| `remember_me_token` | VARCHAR | YES | Token de sessão |
| `created_at` | TIMESTAMPTZ | NOT NULL | Data de criação |
| `updated_at` | TIMESTAMPTZ | NOT NULL | Data de atualização |
| `chat_provider_id` | INTEGER | YES | FK → chat_providers |
| `data` | JSONB | YES | Dados extras (ex: linkChat) |
| `reference_code` | VARCHAR | YES | Código de indicação |
| `verification_code` | VARCHAR | YES | Código de verificação |
| `verification_code_expires_at` | TIMESTAMPTZ | YES | Expiração do código |
| `user_sector` | INTEGER | YES | Setor do usuário |

#### Acessando o link do Chat Guru:
```sql
u.data->>'linkChat' AS guru_link
```

---

### 2.4 Tabela `negotiations` (Negociações/Deals)

| Campo | Tipo | Nullable | Descrição |
|-------|------|----------|-----------|
| `id` | INTEGER | NOT NULL | Chave primária |
| `user_id` | INTEGER | YES | FK → users |
| `pipeline_id` | INTEGER | YES | FK → pipelines |
| `funnel_stage_id` | INTEGER | YES | FK → funnel_stages |
| `status` | VARCHAR | YES | Status da negociação |
| `notes` | VARCHAR | YES | Notas |
| `created_at` | TIMESTAMPTZ | YES | Data de criação |
| `updated_at` | TIMESTAMPTZ | YES | Data de atualização |
| `origin` | VARCHAR | YES | Origem do lead |
| `note_by` | VARCHAR | YES | Autor da nota |
| `delegated_to` | INTEGER | YES | FK → users (delegado para) |
| `delegated_to_byclico` | INTEGER | YES | Delegação automática |
| `related_negotiation_id` | INTEGER | YES | Negociação relacionada |

**Uso principal:** Representa o "deal" do CRM interno. O filtro `c.negotiation_id IS NOT NULL` em consultas garante que são consultas reais (não testes ou slots vazios).

---

### 2.5 Tabela `deliveries` (Entregas)

| Campo | Tipo | Nullable | Descrição |
|-------|------|----------|-----------|
| `id` | INTEGER | NOT NULL | Chave primária |
| `tracking_code` | VARCHAR | YES | Código de rastreio |
| `user_id` | INTEGER | YES | FK → users |
| `product_budget_id` | INTEGER | YES | FK → product_budgets |
| `negotiation_id` | INTEGER | YES | FK → negotiations |
| `status` | TEXT | YES | Status da entrega |
| `event_date` | TIMESTAMPTZ | YES | Data do evento |
| `created_at` | TIMESTAMPTZ | YES | Data de criação |
| `updated_at` | TIMESTAMPTZ | YES | Data de atualização |
| `address_id` | INTEGER | YES | FK → addresses |
| `observation` | VARCHAR | YES | Observações |
| `files` | JSONB | YES | Arquivos anexos |
| `consulting_id` | INTEGER | YES | FK → consultings |
| `logistics_event` | VARCHAR | YES | Evento logístico |

#### Status de entrega:
| Status | Descrição |
|--------|-----------|
| `Delivered` | Entregue |
| `Cancel` | Cancelado |
| Outros | Em trânsito |

---

### 2.6 Tabela `payments` (Pagamentos de Consulta)

| Campo | Tipo | Nullable | Descrição |
|-------|------|----------|-----------|
| `id` | INTEGER | NOT NULL | Chave primária |
| `user_id` | INTEGER | YES | FK → users |
| `consulting_id` | INTEGER | YES | FK → consultings |
| `negotiation_id` | INTEGER | YES | FK → negotiations |
| `tax_id` | VARCHAR | YES | CPF do pagador |
| `order_id` | VARCHAR | YES | ID do pedido |
| `data` | JSONB | YES | Dados do pagamento |
| `reference_id` | VARCHAR | YES | ID de referência |
| `status` | TEXT | YES | Status do pagamento |
| `payment_method` | VARCHAR | YES | Método de pagamento |
| `expiration_date` | VARCHAR | YES | Data de expiração |
| `created_at` | TIMESTAMPTZ | YES | Data de criação |
| `updated_at` | TIMESTAMPTZ | YES | Data de atualização |
| `updated_by_id` | INTEGER | YES | FK → users (responsável) |
| `payment_at` | TIMESTAMPTZ | YES | Data do pagamento |
| `access_data` | JSONB | YES | Dados de acesso |
| `access_at` | TIMESTAMPTZ | YES | Data de acesso ao link |
| `is_archived` | BOOLEAN | YES | Se está arquivado |

#### Status de pagamento:
| Status | Descrição |
|--------|-----------|
| `confirmed` | Confirmado/Pago |
| `pending` | Pendente |

---

### 2.7 Tabela `product_budgets` (Orçamentos)

| Campo | Tipo | Nullable | Descrição |
|-------|------|----------|-----------|
| `id` | INTEGER | NOT NULL | Chave primária |
| `description` | VARCHAR | YES | Descrição |
| `value` | NUMERIC | YES | Valor total |
| `user_id` | INTEGER | YES | FK → users |
| `status` | TEXT | YES | Status do orçamento |
| `negotiation_id` | INTEGER | YES | FK → negotiations |
| `created_at` | TIMESTAMPTZ | YES | Data de criação |
| `updated_at` | TIMESTAMPTZ | YES | Data de atualização |
| `medical_prescription_id` | INTEGER | YES | FK → medical_prescriptions |
| `closing_date` | TIMESTAMPTZ | YES | Data de fechamento |
| `discount_type` | TEXT | YES | Tipo de desconto |
| `discount_value` | NUMERIC | YES | Valor do desconto |
| `delivery_value` | NUMERIC | YES | Valor do frete |
| `gateway_type` | TEXT | YES | Gateway de pagamento |
| `gateway_url` | VARCHAR | YES | URL do gateway |
| `updated_by_id` | INTEGER | YES | FK → users (responsável) |
| `contacted` | BOOLEAN | YES | Se foi contatado |
| `patient_answered` | VARCHAR | YES | Resposta do paciente |
| `pre_anvisa` | BOOLEAN | YES | Se é pré-Anvisa |
| `payment_at` | TIMESTAMPTZ | YES | Data do pagamento |
| `return_date` | DATE | YES | Data de retorno |
| `confirm_flavors` | BOOLEAN | YES | Confirmação de sabores |
| `installment` | INTEGER | YES | Número de parcelas |
| `payment_method` | VARCHAR | YES | Método de pagamento |
| `is_archived` | BOOLEAN | YES | Se está arquivado |

---

### 2.8 Tabela `medical_prescriptions` (Receitas Médicas)

| Campo | Tipo | Nullable | Descrição |
|-------|------|----------|-----------|
| `id` | INTEGER | NOT NULL | Chave primária |
| `user_id` | INTEGER | YES | FK → users |
| `doctor_id` | INTEGER | YES | FK → doctors |
| `file_id` | INTEGER | YES | FK → files (PDF da receita) |
| `consulting_id` | INTEGER | YES | FK → consultings |
| `negotiation_id` | INTEGER | YES | FK → negotiations |
| `created_at` | TIMESTAMPTZ | YES | Data de criação |
| `updated_at` | TIMESTAMPTZ | YES | Data de atualização |

---

### 2.9 Tabela `products` (Produtos)

| Campo | Tipo | Nullable | Descrição |
|-------|------|----------|-----------|
| `id` | INTEGER | NOT NULL | Chave primária |
| `title` | VARCHAR | YES | Nome do produto |
| `description` | VARCHAR | YES | Descrição |
| `price` | NUMERIC | YES | Preço em BRL |
| `quantity` | INTEGER | YES | Quantidade em estoque |
| `image` | VARCHAR | YES | URL da imagem |
| `created_at` | TIMESTAMPTZ | YES | Data de criação |
| `updated_at` | TIMESTAMPTZ | YES | Data de atualização |
| `category` | VARCHAR | YES | Categoria |
| `type` | VARCHAR | YES | Tipo |
| `formula` | VARCHAR | YES | Fórmula (ex: CBD:THC) |
| `oleo_type` | VARCHAR | YES | Tipo de óleo |
| `volume` | INTEGER | YES | Volume em ml |
| `sku` | VARCHAR | YES | SKU |
| `shipment_item_type` | INTEGER | YES | Tipo de envio |
| `price_usd` | NUMERIC | YES | Preço em USD |
| `is_default` | BOOLEAN | YES | Se é produto padrão |

---

## 3. Tabelas de Pipelines e Funis

### 3.1 Tabela `pipelines`

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | INTEGER | Chave primária |
| `user_id` | INTEGER | FK → users (criador) |
| `name` | VARCHAR | Nome do pipeline |
| `created_at` | TIMESTAMPTZ | Data de criação |
| `updated_at` | TIMESTAMPTZ | Data de atualização |

### 3.2 Tabela `funnel_stages`

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | INTEGER | Chave primária |
| `pipeline_id` | INTEGER | FK → pipelines |
| `name` | VARCHAR | Nome da etapa |
| `order` | INTEGER | Ordem de exibição |
| `created_at` | TIMESTAMPTZ | Data de criação |
| `updated_at` | TIMESTAMPTZ | Data de atualização |

### 3.3 Estrutura Completa dos Pipelines

#### Pipeline 1: Atendimento Inicial
| stage_id | Nome | Ordem |
|----------|------|-------|
| 1 | Enviou a 1a mensagem | 1 |
| 2 | Interagiu | 2 |
| 30 | Paciente faz tratamento | 3 |
| 31 | Paciente teve contato com Cannabis | 4 |
| 3 | Explicação do processo | 5 |
| 4 | Aquecimento - Pagamento | 6 |
| 5 | Aguardando Pagamento | 7 |

#### Pipeline 2: Consulta Médica
| stage_id | Nome | Ordem |
|----------|------|-------|
| 6 | Aguardando Agendamento | 1 |
| 7 | Agendamento Feito | 2 |
| 8 | Agendamento Anamnese | 3 |
| 9 | Aguardando Consulta | 4 |
| 29 | Consulta Não Aconteceu | 4 |
| 10 | Consulta Iniciada | 6 |
| 40 | Consulta sem receita | 7 |
| 11 | Aguardando receita | 8 |

#### Pipeline 3: Receitas e Financeiro
| stage_id | Nome | Ordem |
|----------|------|-------|
| 12 | Receita Enviada | 1 |
| 13 | Orçamento Gerado | 2 |
| 14 | Orçamento Enviado | 3 |
| 15 | Link de Pagamento Enviado | 4 |
| 39 | Pre-Anvisa | 5 |

#### Pipeline 4: Documentação
| stage_id | Nome | Ordem |
|----------|------|-------|
| 28 | Anvisa | 1 |
| 16 | Aguardando Documentos | 2 |
| 17 | Análise de Documentos | 3 |
| 18 | Rastreio Pendente | 4 |
| 19 | Produto em Falta | 5 |

#### Pipeline 5: Entrega
| stage_id | Nome | Ordem |
|----------|------|-------|
| 20 | Código de Rastreio Enviado | 1 |
| 21 | Produto Saiu dos EUA | 2 |
| 22 | Produto na Anvisa | 3 |
| 23 | Recebido Pela Transportadora | 4 |

#### Pipeline 6: Produto Entregue
| stage_id | Nome | Ordem |
|----------|------|-------|
| 24 | Produto Entregue | 1 |
| 25 | Acompanhamento 7 Dias | 2 |
| 26 | Acompanhamento 30 Dias | 3 |
| 27 | Produto Acabando | 4 |

#### Pipeline 7: Pós Venda
| stage_id | Nome | Ordem |
|----------|------|-------|
| 50 | 3d | 1 |
| 49 | 5d | 2 |
| 32 | 15 dias | 3 |
| 33 | 23 dias | 4 |
| 34 | 30 dias | 5 |
| 35 | 45 dias | 6 |
| 36 | 70 dias | 7 |
| 37 | 90 dias | 8 |
| 38 | +180 dias | 9 |

#### Pipeline 8: Pós venda - Consulta Acomp. Realizada
| stage_id | Nome | Ordem |
|----------|------|-------|
| 41 | Finalizou consulta acompanhamento | 1 |
| 42 | 7d Pós Consulta | 2 |
| 43 | 20d Pós Consulta | 3 |
| 44 | 40d+ Pós Consulta (sem pagamento) | 4 |

#### Pipeline 9: Pós venda - 2+ Pedidos
| stage_id | Nome | Ordem |
|----------|------|-------|
| 45 | Pedido recompra entregue | 1 |
| 46 | 7d pós entrega | 2 |
| 47 | 30d pós entrega | 3 |
| 48 | 60d+ pós entrega | 4 |

---

## 4. Diagrama de Relacionamentos

```
                                        ┌───────────────┐
                                        │    doctors    │
                                        └───────┬───────┘
                                                │ doctor_id
                                                ▼
┌───────────────┐    user_id     ┌─────────────────────────┐    consulting_id    ┌──────────────────────────┐
│     users     │◄───────────────│       consultings       │────────────────────►│  medical_prescriptions   │
└───────┬───────┘                └───────────┬─────────────┘                     └────────────┬─────────────┘
        │                                    │                                                │
        │                          negotiation_id                           medical_prescription_id
        │                                    │                                                │
        │                                    ▼                                                ▼
        │                        ┌───────────────────────┐                    ┌─────────────────────────┐
        │                        │     negotiations      │                    │    product_budgets      │
        │                        └───────────┬───────────┘                    └────────────┬────────────┘
        │                                    │                                             │
        │                       ┌────────────┴────────────┐               product_budget_id
        │               pipeline_id              funnel_stage_id                           │
        │                       │                         │                                ▼
        │                       ▼                         ▼                    ┌─────────────────────────┐
        │               ┌───────────────┐       ┌──────────────────┐          │       deliveries        │
        │               │   pipelines   │◄──────│  funnel_stages   │          └─────────────────────────┘
        │               └───────────────┘       └──────────────────┘
        │
        │    user_id
        ├────────────────────────────────────────────────────────────┐
        │                                                            │
        ▼                                                            ▼
┌───────────────────┐                                     ┌───────────────────┐
│     payments      │                                     │   product_budgets │
└───────────────────┘                                     └───────────────────┘

┌────────────────────────────────────────────────────────────────────────────────┐
│                          RELACIONAMENTOS PRINCIPAIS                             │
├────────────────────────────────────────────────────────────────────────────────┤
│ consultings.user_id ─────────────────→ users.id (paciente)                     │
│ consultings.doctor_id ───────────────→ doctors.id (médico)                     │
│ consultings.negotiation_id ──────────→ negotiations.id (deal)                  │
│ doctors.user_id ─────────────────────→ users.id (conta do médico)              │
│ negotiations.user_id ────────────────→ users.id                                │
│ negotiations.pipeline_id ────────────→ pipelines.id                            │
│ negotiations.funnel_stage_id ────────→ funnel_stages.id                        │
│ medical_prescriptions.consulting_id ─→ consultings.id                          │
│ product_budgets.medical_prescription_id → medical_prescriptions.id             │
│ deliveries.product_budget_id ────────→ product_budgets.id                      │
│ deliveries.negotiation_id ───────────→ negotiations.id                         │
│ payments.consulting_id ──────────────→ consultings.id                          │
│ payments.negotiation_id ─────────────→ negotiations.id                         │
└────────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Filtros Padrão para Queries

### 5.1 Consultas Válidas (excluindo testes e slots vazios)

```sql
WHERE c.user_id IS NOT NULL
  AND c.negotiation_id IS NOT NULL
  AND c.status NOT IN ('preconsulting')
```

### 5.2 Consultas Realizadas

```sql
WHERE c.completed = TRUE
```

### 5.3 Consultas com Receita

```sql
WHERE c.prescription_status = 'required'
```

### 5.4 Conversão do campo `start`

```sql
-- SEMPRE converter o campo start antes de usar
c.start::timestamptz

-- Exemplo de filtro por data
WHERE c.start::timestamptz >= '2025-01-01'
  AND c.start::timestamptz < '2025-02-01'

-- Aplicar timezone de São Paulo
(c.start::timestamptz) AT TIME ZONE 'America/Sao_Paulo'
```

### 5.5 Estado do Lead pelo DDD

```sql
CASE
  WHEN SUBSTR(u.phone, 3, 2) IN ('11','12','14','15','16','17','18','19') THEN 'São Paulo'
  WHEN SUBSTR(u.phone, 3, 2) = '13' THEN 'Santos'
  WHEN SUBSTR(u.phone, 3, 2) IN ('21','22','24') THEN 'Rio de Janeiro'
  WHEN SUBSTR(u.phone, 3, 2) IN ('27','28') THEN 'Espírito Santo'
  WHEN SUBSTR(u.phone, 3, 2) IN ('31','32','33','34','35','37','38') THEN 'Minas Gerais'
  -- ... continua para todos os estados
  ELSE 'Outro'
END AS estado
```

### 5.6 Link do CRM

```sql
CONCAT(
  'https://clickagendamento.com/pipeline/deal/',
  n.negotiation_id,
  '#overview'
) AS crm_link
```

---

## 6. Checklist para Novas Queries

### Queries de Consultas:
- [ ] Filtrou `user_id IS NOT NULL`?
- [ ] Filtrou `negotiation_id IS NOT NULL`?
- [ ] Excluiu `status NOT IN ('preconsulting')`?
- [ ] Converteu `start::timestamptz`?
- [ ] Aplicou timezone se necessário?

### Queries de Médicos:
- [ ] Verificou se `schedule` não é vazio?
- [ ] Extraiu corretamente os horários do JSONB?
- [ ] Usou os códigos corretos dos dias (SEG, TER, etc)?

### Queries de Entregas:
- [ ] Verificou status `'Delivered'` para entregas concluídas?
- [ ] Excluiu tracking_code `'0000'` se necessário?
- [ ] Considerou a data do `event_date` para cálculos de tempo?

### Queries de Pipelines:
- [ ] Usou os IDs corretos de pipeline_id e funnel_stage_id?
- [ ] Fez JOIN com funnel_stages para obter nomes das etapas?

---

## 7. Problemas Conhecidos e Soluções

| Problema | Impacto | Solução |
|----------|---------|---------|
| Campo `start` é VARCHAR | Erros de conversão | Sempre usar `::timestamptz` |
| Typo em `reschudeled` | Filtros incorretos | Usar o valor com typo |
| Typo em `speciality` | Consultas incorretas | Usar `speciality` (com typo) |
| ~25% dos médicos usam emails diferentes | Dificulta identificação | Manter lista de emails alternativos |
| Bots aparecem em `meet_data` | Infla contagens | Filtrar por display_name |
| `completed` pode ser NULL | Dados incompletos | Considerar como pendente |

---

## 8. Execução de Queries via n8n

```json
N8N:execute_workflow
workflowId: "6WdaglLNkVEoq1yw"
inputs: {
  "type": "webhook",
  "webhookData": {
    "method": "POST",
    "body": {
      "query": "SUA_QUERY_SQL_AQUI"
    }
  }
}
```

---

## 9. Documentos Relacionados

- [Documentação Completa: Tabela consultings](./Documentacao_Tabela_Consultings_Fluxo_Completo.md)
- [Documentação Completa: Queries de Médicos](./Documentacao_Completa_Queries_Medicos.md)
- [Sistema de Pós-Venda](./Documentacao_Sistema_Pos_Venda.md)
- [Sistema de Tags](./Documentacao_Completa_Sistema_Tags.md)

---

**Última atualização:** 23/01/2026