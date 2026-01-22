# Modelo de Dados

## Diagrama ER

```mermaid
erDiagram
    User ||--o| MedicoConfig : tem
    User ||--o{ MedicoScore : tem
    User ||--o{ MedicoHorario : tem
    User ||--o{ Sugestao : cria
    User ||--o{ Emergencial : cria
    User ||--o{ EmergencialResposta : responde
    User ||--o{ CancelamentoEmergencial : solicita
    User ||--o{ Notificacao : recebe
    User ||--o{ Auditoria : gera
    User ||--o{ User : gerencia

    Sugestao }o--|| User : aprovadoPor
    MedicoScore }o--|| User : alteradoPor
    CancelamentoEmergencial }o--|| User : processadoPor

    Emergencial ||--o{ EmergencialResposta : tem
    Emergencial ||--o{ EmergencialRecusa : tem

    User {
        string id PK
        string name
        string email UK
        boolean emailVerified
        UserTipo tipo
        boolean ativo
        string clickId
        string gestorId FK
        boolean banned
    }

    Template {
        string id PK
        string nome
        boolean padrao
        json config
    }

    ConfigSistema {
        string id PK
        string chave UK
        json valor
    }

    RetryQueue {
        string id PK
        string tipo
        json payload
        int tentativas
        RetryStatus status
    }

    MedicoConfig {
        string id PK
        string medicoId FK UK
        int slotsMinSemana
        int slotsMaxSemana
        json diasPermitidos
        string horarioInicio
        string horarioFim
        json restricoesDia
    }

    MedicoScore {
        string id PK
        string medicoId FK
        decimal score
        Faixa faixa
        decimal taxaConversao
        decimal ticketMedio
        int consultas2Semanas
        boolean alteradoManualmente
        string justificativa
    }

    MedicoHorario {
        string id PK
        string medicoId FK
        DiaSemana diaSemana
        string horarioInicio
        string horarioFim
        boolean ativo
    }

    Sugestao {
        string id PK
        string medicoId FK
        DiaSemana diaSemana
        string horarioInicio
        string horarioFim
        SugestaoStatus status
        string dadosLote
        boolean automatico
        boolean override
    }

    CancelamentoEmergencial {
        string id PK
        string medicoId FK
        DiaSemana diaSemana
        string horarioInicio
        string horarioFim
        CancelamentoStatus status
        MotivoCancelamento motivoCategoria
        string motivoDescricao
        string motivoRejeicao
    }

    Emergencial {
        string id PK
        string criadoPorId FK
        date data
        Periodo periodo
        string horarioInicio
        string horarioFim
        int slotsNecessarios
        int slotsPreenchidos
        Faixa faixaAtual
        EmergencialStatus status
    }

    EmergencialResposta {
        string id PK
        string emergencialId FK
        string medicoId FK
        json horariosAceitos
        int slotsAceitos
        boolean sincronizadoClick
        boolean cancelado
    }
```

## Enums

### UserTipo
```prisma
enum UserTipo {
  super_admin   // Acesso total
  admin         // Configuracoes do sistema
  diretor       // Override de aprovacoes
  atendente     // Staff operacional
  medico        // Profissional medico
}
```

### DiaSemana
```prisma
enum DiaSemana {
  dom  // Domingo
  seg  // Segunda
  ter  // Terca
  qua  // Quarta
  qui  // Quinta
  sex  // Sexta
  sab  // Sabado
}
```

### Faixa
```prisma
enum Faixa {
  P1  // >= 80 pontos
  P2  // >= 60 pontos
  P3  // >= 40 pontos
  P4  // >= 20 pontos
  P5  // >= 0 pontos
}
```

### SugestaoStatus
```prisma
enum SugestaoStatus {
  pendente   // Aguardando aprovacao
  aprovada   // Staff aprovou
  rejeitada  // Staff rejeitou
}
```

### CancelamentoStatus
```prisma
enum CancelamentoStatus {
  pendente   // Aguardando aprovacao
  aprovado   // Staff aprovou
  rejeitado  // Staff rejeitou
}
```

### MotivoCancelamento
```prisma
enum MotivoCancelamento {
  doenca              // Doenca/problema de saude
  emergencia_familiar // Emergencia familiar
  compromisso_medico  // Compromisso medico urgente
}
```

### EmergencialStatus
```prisma
enum EmergencialStatus {
  aberta      // Aceitando respostas
  preenchida  // Slots completos
  expirada    // Passou do horario
}
```

### Periodo
```prisma
enum Periodo {
  manha  // 08:00 - 12:00
  tarde  // 12:00 - 18:00
  noite  // 18:00 - 21:00
}
```

### RetryStatus
```prisma
enum RetryStatus {
  pendente     // Aguardando processamento
  processando  // Em processamento
  sucesso      // Concluido com sucesso
  falha        // Falhou apos todas tentativas
}
```

## Tabelas Principais

### User
Usuario do sistema (medico ou staff).

| Campo | Tipo | Descricao |
|-------|------|-----------|
| id | string | UUID |
| name | string | Nome completo |
| email | string | Email unico |
| emailVerified | boolean | Email verificado (Better Auth) |
| image | string? | URL da imagem de perfil |
| tipo | UserTipo | Tipo de usuario |
| ativo | boolean | Usuario ativo |
| clickId | string? | ID no Click CRM (medicos) |
| gestorId | string? | FK para User (gestor do medico) |
| banned | boolean? | Usuario banido (Better Auth) |
| banReason | string? | Motivo do banimento |
| banExpires | datetime? | Data de expiracao do banimento |
| role | string? | Role para Better Auth |
| createdAt | datetime | Data de criacao |
| updatedAt | datetime | Data de atualizacao |

**Relacao Gestor/Medicos**:
- Um usuario pode ser gestor de varios medicos (`medicosGerenciados`)
- Um medico pode ter um gestor (`gestor`)
- Usado para hierarquia de aprovacoes e visibilidade

### MedicoConfig
Configuracoes individuais do medico.

| Campo | Tipo | Descricao |
|-------|------|-----------|
| id | string | UUID |
| medicoId | string | FK para User (unico) |
| slotsMinSemana | int? | Minimo de slots por semana |
| slotsMaxSemana | int? | Maximo de slots por semana |
| diasPermitidos | json | Array de dias permitidos |
| horarioInicio | string? | Horario inicio padrao |
| horarioFim | string? | Horario fim padrao |
| restricoesDia | json? | Restricoes por dia |

Exemplo de `restricoesDia`:
```json
{
  "seg": { "inicio": "08:00", "fim": "18:00" },
  "ter": { "inicio": "14:00", "fim": "21:00" }
}
```

### MedicoScore
Historico de scores e faixas do medico.

| Campo | Tipo | Descricao |
|-------|------|-----------|
| id | string | UUID |
| medicoId | string | FK para User |
| score | decimal(5,2) | Score atual (0-100) |
| faixa | Faixa | Faixa calculada (P1-P5) |
| taxaConversao | decimal? | Taxa de conversao |
| ticketMedio | decimal? | Ticket medio |
| consultas2Semanas | int? | Consultas ultimas 2 semanas |
| percentilConversao | decimal? | Percentil de conversao |
| percentilTicket | decimal? | Percentil de ticket |
| calculadoEm | datetime | Data do calculo |
| alteradoManualmente | boolean | Se foi alterado por admin |
| justificativa | string? | Motivo da alteracao manual |
| alteradoPorId | string? | FK para User (admin) |

### MedicoHorario
Horarios aprovados e ativos do medico.

| Campo | Tipo | Descricao |
|-------|------|-----------|
| id | string | UUID |
| medicoId | string | FK para User |
| diaSemana | DiaSemana | Dia da semana |
| horarioInicio | string | Inicio (HH:MM) |
| horarioFim | string | Fim (HH:MM) |
| ativo | boolean | Se esta ativo |

**Constraint**: Unico (medicoId, diaSemana, horarioInicio)

### Sugestao
Solicitacoes de abertura/fechamento de horarios.

| Campo | Tipo | Descricao |
|-------|------|-----------|
| id | string | UUID |
| medicoId | string | FK para User |
| diaSemana | DiaSemana | Dia da semana |
| horarioInicio | string | Inicio (HH:MM) |
| horarioFim | string | Fim (HH:MM) |
| status | SugestaoStatus | Status da solicitacao |
| dadosLote | string? | JSON com dados do lote |
| automatico | boolean | Se foi processado automaticamente |
| motivoRejeicao | string? | Motivo se rejeitada |
| override | boolean | Se usou override |
| overrideJustificativa | string? | Justificativa do override |
| aprovadoPorId | string? | FK para User (staff) |

Exemplo de `dadosLote`:
```json
{
  "tipo": "lote",
  "alteracoes": [
    { "diaSemana": "seg", "horario": "08:00", "acao": "abrir", "status": "pendente" },
    { "diaSemana": "ter", "horario": "14:00", "acao": "fechar", "status": "aprovada" }
  ],
  "totalAbrir": 1,
  "totalFechar": 1
}
```

### CancelamentoEmergencial
Solicitacoes de cancelamento com consulta agendada.

| Campo | Tipo | Descricao |
|-------|------|-----------|
| id | string | UUID |
| medicoId | string | FK para User |
| diaSemana | DiaSemana | Dia da semana |
| horarioInicio | string | Inicio (HH:MM) |
| horarioFim | string | Fim (HH:MM) |
| status | CancelamentoStatus | Status |
| motivoCategoria | MotivoCancelamento | Categoria do motivo |
| motivoDescricao | string? | Descricao adicional |
| motivoRejeicao | string? | Motivo se rejeitado |
| processadoPorId | string? | FK para User (staff) |
| processadoEm | datetime? | Data do processamento |

### Emergencial
Chamados emergenciais para preenchimento de horarios.

| Campo | Tipo | Descricao |
|-------|------|-----------|
| id | string | UUID |
| criadoPorId | string | FK para User (staff) |
| data | date | Data do emergencial |
| periodo | Periodo | Periodo (manha/tarde/noite) |
| horarioInicio | string | Inicio (HH:MM) |
| horarioFim | string | Fim (HH:MM) |
| slotsNecessarios | int | Quantidade de slots necessarios |
| slotsPreenchidos | int | Quantidade ja preenchida |
| mensagem | string? | Mensagem para medicos |
| faixaAtual | Faixa | Faixa que pode ver (expande) |
| status | EmergencialStatus | Status atual |
| ultimaExpansao | datetime | Data da ultima expansao |

### EmergencialResposta
Respostas dos medicos aos emergenciais.

| Campo | Tipo | Descricao |
|-------|------|-----------|
| id | string | UUID |
| emergencialId | string | FK para Emergencial |
| medicoId | string | FK para User |
| horariosAceitos | json | Array de horarios aceitos |
| slotsAceitos | int | Quantidade de slots aceitos |
| sincronizadoClick | boolean | Se sincronizou com Click |
| cancelado | boolean | Se foi cancelado |

### EmergencialRecusa
Registro de recusas (medico nao quer ver mais).

| Campo | Tipo | Descricao |
|-------|------|-----------|
| id | string | UUID |
| emergencialId | string | FK para Emergencial |
| medicoId | string | FK para User |
| createdAt | datetime | Timestamp |

**Constraint**: Unico (emergencialId, medicoId)

### Template
Templates de configuracao de horarios (para aplicacao em lote).

| Campo | Tipo | Descricao |
|-------|------|-----------|
| id | string | UUID |
| nome | string | Nome do template |
| padrao | boolean | Se e o template padrao |
| config | json | Configuracao dos horarios |
| createdAt | datetime | Timestamp |
| updatedAt | datetime | Timestamp |

Exemplo de `config`:
```json
{
  "diasPermitidos": ["seg", "ter", "qua", "qui", "sex"],
  "horarioInicio": "08:00",
  "horarioFim": "18:00",
  "intervaloMinutos": 20
}
```

### ConfigSistema
Configuracoes globais do sistema (key-value).

| Campo | Tipo | Descricao |
|-------|------|-----------|
| id | string | UUID |
| chave | string | Chave unica da configuracao |
| valor | json | Valor da configuracao |
| createdAt | datetime | Timestamp |
| updatedAt | datetime | Timestamp |

**Constraint**: Chave unica

Exemplos de chaves:
- `limites_slots_faixa`: Limites de slots por faixa
- `horarios_funcionamento`: Horarios de funcionamento
- `integracao_click`: Configuracoes da API Click

### RetryQueue
Fila de retry para operacoes que falharam (integracao Click).

| Campo | Tipo | Descricao |
|-------|------|-----------|
| id | string | UUID |
| tipo | string | Tipo da operacao (ex: "sincronizar_horario") |
| payload | json | Dados da operacao |
| tentativas | int | Numero de tentativas realizadas |
| maxTentativas | int | Maximo de tentativas permitidas |
| proximoRetry | datetime | Proximo retry agendado |
| status | RetryStatus | Status atual |
| erro | string? | Ultimo erro registrado |
| createdAt | datetime | Timestamp |
| updatedAt | datetime | Timestamp |

### Auditoria
Log de todas as acoes do sistema.

| Campo | Tipo | Descricao |
|-------|------|-----------|
| id | string | UUID |
| usuarioId | string? | FK para User (null = SISTEMA) |
| acao | string | Tipo da acao |
| entidade | string? | Nome da entidade |
| entidadeId | string? | ID da entidade |
| dadosAntes | json? | Estado anterior |
| dadosDepois | json? | Estado posterior |
| ip | string? | IP do usuario |
| userAgent | string? | User agent |
| createdAt | datetime | Timestamp |

### Notificacao
Notificacoes para usuarios.

| Campo | Tipo | Descricao |
|-------|------|-----------|
| id | string | UUID |
| usuarioId | string | FK para User |
| tipo | string | Tipo da notificacao |
| titulo | string | Titulo |
| mensagem | string? | Corpo |
| lida | boolean | Se foi lida |
| dados | json? | Dados extras |
| createdAt | datetime | Timestamp |
