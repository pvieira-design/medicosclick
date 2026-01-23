# Documentação: Tabela `users`

## Visão Geral

A tabela `users` é a tabela central do sistema Click Cannabis, armazenando todos os usuários da plataforma: pacientes (leads/clientes), médicos, atendentes e administradores.

**Total de registros:** ~367.260 usuários

---

## Estrutura da Tabela

| Campo | Tipo | Nullable | Descrição |
|-------|------|----------|-----------|
| `id` | INTEGER | NOT NULL | Chave primária (auto-increment) |
| `first_name` | VARCHAR | YES | Primeiro nome do usuário |
| `last_name` | VARCHAR | YES | Sobrenome do usuário |
| `email` | VARCHAR | NOT NULL | E-mail (único, usado para login) |
| `id_blip` | VARCHAR | YES | Identificador do chatbot Blip |
| `national_id` | VARCHAR | YES | CPF do usuário |
| `deal_id` | VARCHAR | YES | ID legado de integração |
| `birth_date` | DATE | YES | Data de nascimento |
| `role` | TEXT | NOT NULL | Tipo de usuário |
| `phone` | VARCHAR | YES | Telefone (formato: +55DDDNUMERO) |
| `avatar` | VARCHAR | YES | URL da foto de perfil |
| `password` | VARCHAR | YES | Hash da senha (pode ser NULL para leads) |
| `remember_me_token` | VARCHAR | YES | Token de sessão persistente |
| `created_at` | TIMESTAMPTZ | NOT NULL | Data de criação do registro |
| `updated_at` | TIMESTAMPTZ | NOT NULL | Data da última atualização |
| `chat_provider_id` | INTEGER | YES | FK → chat_providers |
| `data` | JSONB | YES | Dados extras em JSON |
| `reference_code` | VARCHAR | YES | Código de indicação do usuário |
| `verification_code` | VARCHAR | YES | Código de verificação temporário |
| `verification_code_expires_at` | TIMESTAMPTZ | YES | Expiração do código de verificação |
| `user_sector` | INTEGER | YES | Setor do usuário (interno) |

---

## Valores do Campo `role`

| Role | Quantidade | Descrição |
|------|------------|-----------|
| `client` | 367.099 | Pacientes/Leads |
| `doctor` | 90 | Médicos prescritores |
| `attendant` | 52 | Atendentes/SDRs |
| `admin` | 19 | Administradores |

---

## Campo JSONB `data`

O campo `data` armazena informações extras em formato JSON:

```json
{
  "linkChat": "https://chat.guru.whats.net/...",  // Link do WhatsApp Guru
  "utm_source": "google",                          // Origem do lead
  "utm_medium": "cpc",                             // Meio de aquisição
  "utm_campaign": "...",                           // Campanha
  "utm_term": "...",                               // Termo de busca
  "utm_content": "..."                             // Conteúdo do anúncio
}
```

---

## Relacionamentos Principais

```
users.id ←──────── negotiations.user_id
users.id ←──────── consultings.user_id
users.id ←──────── payments.user_id
users.id ←──────── product_budgets.user_id
users.id ←──────── deliveries.user_id
users.id ←──────── doctors.user_id (para role = 'doctor')
```

---

## Determinação de Estado pelo DDD

O estado do usuário pode ser inferido pelo DDD do telefone:

```sql
CASE
  WHEN SUBSTR(phone, 3, 2) IN ('11','12','14','15','16','17','18','19') THEN 'São Paulo'
  WHEN SUBSTR(phone, 3, 2) = '13' THEN 'Santos'
  WHEN SUBSTR(phone, 3, 2) IN ('21','22','24') THEN 'Rio de Janeiro'
  WHEN SUBSTR(phone, 3, 2) IN ('27','28') THEN 'Espírito Santo'
  WHEN SUBSTR(phone, 3, 2) IN ('31','32','33','34','35','37','38') THEN 'Minas Gerais'
  -- ... demais estados
  ELSE 'Outro'
END AS estado
```

---

## Queries Úteis

### Buscar usuário por ID
```sql
SELECT id, first_name, last_name, email, phone, role, created_at
FROM users
WHERE id = 12345;
```

### Listar leads criados hoje
```sql
SELECT id, first_name, email, phone, created_at
FROM users
WHERE role = 'client'
  AND created_at::date = CURRENT_DATE
ORDER BY created_at DESC;
```

### Buscar leads por período
```sql
SELECT 
  id,
  first_name,
  email,
  phone,
  data->>'linkChat' AS guru_link,
  created_at
FROM users
WHERE role = 'client'
  AND created_at >= '2025-01-01'
  AND created_at < '2025-02-01'
ORDER BY created_at DESC;
```

### Contar leads por estado (DDD)
```sql
SELECT 
  CASE
    WHEN SUBSTR(phone, 3, 2) IN ('11','12','14','15','16','17','18','19') THEN 'São Paulo'
    WHEN SUBSTR(phone, 3, 2) IN ('21','22','24') THEN 'Rio de Janeiro'
    WHEN SUBSTR(phone, 3, 2) IN ('31','32','33','34','35','37','38') THEN 'Minas Gerais'
    ELSE 'Outros'
  END AS estado,
  COUNT(*) AS total
FROM users
WHERE role = 'client'
GROUP BY 1
ORDER BY total DESC;
```

### Formatar nome completo
```sql
SELECT 
  id,
  CASE
    WHEN last_name IS NOT NULL AND last_name <> ''
    THEN TRIM(first_name) || ' ' || UPPER(SUBSTRING(TRIM(last_name) FROM 1 FOR 1)) || '.'
    ELSE TRIM(first_name)
  END AS nome_formatado
FROM users
WHERE id = 12345;
```

---

## Links Úteis

### Link do CRM (via negotiation)
```sql
SELECT 
  u.id,
  u.first_name,
  CONCAT('https://clickagendamento.com/pipeline/deal/', n.id, '#overview') AS crm_link
FROM users u
LEFT JOIN negotiations n ON n.user_id = u.id
WHERE u.id = 12345;
```

### Link do WhatsApp Guru
```sql
SELECT 
  id,
  first_name,
  data->>'linkChat' AS guru_link
FROM users
WHERE id = 12345;
```

---

## Notas Importantes

1. **Timezone:** Campos `created_at` e `updated_at` são armazenados em UTC. Use `AT TIME ZONE 'America/Sao_Paulo'` para exibir no horário de Brasília.

2. **Telefone:** Formato padrão é `+55DDDNUMERO` (ex: +5511999999999). Os 2 primeiros caracteres são sempre `+5`.

3. **Leads sem senha:** Usuários com role `client` podem ter `password = NULL` se nunca fizeram login na plataforma.

4. **Código de indicação:** O campo `reference_code` é único por usuário e usado no programa de indicação.

---

## Changelog

| Data | Versão | Descrição |
|------|--------|-----------|
| 2025-01-22 | 1.0 | Documentação inicial |
