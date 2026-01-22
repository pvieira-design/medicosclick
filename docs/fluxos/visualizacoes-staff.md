# Telas do Staff

## Visao Geral

O staff tem acesso a diversas telas para gestao de medicos, solicitacoes, emergenciais e dashboard de metricas.

### Mapa de Telas

| Rota | Descricao | Documento |
|------|-----------|-----------|
| `/dashboard` | Centro de comando com KPIs | [dashboard.md](./dashboard.md) |
| `/dashboard/alertas` | Central de alertas | [dashboard.md](./dashboard.md) |
| `/dashboard/medicos` | Performance individual | [dashboard.md](./dashboard.md) |
| `/solicitacoes` | Painel de solicitacoes | Esta pagina |
| `/medicos` | Lista de medicos | Esta pagina |
| `/medicos/[id]` | Detalhe do medico | Esta pagina |
| `/emergenciais` | Painel de emergenciais | Esta pagina |
| `/cancelamentos-emergenciais` | Aprovar cancelamentos | Esta pagina |

---

## 1. Painel de Solicitacoes (`/solicitacoes`)

Tela principal para gestao de solicitacoes de horarios.

### Layout

```
┌─────────────────────────────────────────────────────────────┐
│ Solicitacoes de Horarios                                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐        │
│  │ 23      │  │ 5       │  │ 18      │  │ 3       │        │
│  │Pendentes│  │Atrasadas│  │Aprovadas│  │Rejeitad │        │
│  │         │  │  >24h   │  │  Hoje   │  │  Hoje   │        │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘        │
│                                                             │
│  [Pendentes]  [Historico]                                   │
│  ─────────────────────────                                  │
│                                                             │
│  Filtros: [Medico v] [Dia v] [Periodo v] [Faixa v]         │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Dr. Joao Silva - P2 (Score: 68)            [▼]      │   │
│  │ 3 slots pendentes | Criado ha 2h                    │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │ [Grade expandida com slots]                         │   │
│  │                                                     │   │
│  │ [Aprovar Selecionados] [Rejeitar Selecionados]     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Dra. Maria Santos - P1 (Score: 85)         [▶]      │   │
│  │ 5 slots pendentes | Criado ha 30min                 │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Tabs

| Tab | Descricao | Filtro |
|-----|-----------|--------|
| Pendentes | Solicitacoes aguardando | status = "pendente" |
| Historico | Todas as solicitacoes | Todas |

### Cards KPI

| Card | Cor | Descricao |
|------|-----|-----------|
| Pendentes | Azul | Total de solicitacoes pendentes |
| Atrasadas | Vermelho | Pendentes > 24 horas |
| Aprovadas Hoje | Verde | Aprovadas desde meia-noite |
| Rejeitadas Hoje | Cinza | Rejeitadas desde meia-noite |

### Filtros

- **Medico**: Dropdown com medicos que tem pendentes
- **Dia**: dom, seg, ter, qua, qui, sex, sab
- **Periodo**: manha, tarde, noite
- **Faixa**: P1, P2, P3, P4, P5
- **Apenas Atrasadas**: Toggle

## 2. Grade Expandida (SolicitacaoGradeExpandida)

Componente que mostra horarios do medico para aprovacao.

### Estados Visuais

| Estado | Cor | Significado |
|--------|-----|-------------|
| `ja-aberto` | Azul claro | Ja existe no Click (contexto) |
| `aprovado` | Verde | Aprovado nesta solicitacao |
| `rejeitado` | Vermelho | Rejeitado |
| `pendente` | Amarelo | Aguardando decisao |
| `selecionado` | Azul escuro | Marcado para aprovar |

### Layout da Grade

```
          Seg    Ter    Qua    Qui    Sex    Sab    Dom
08:00     [■]    [ ]    [ ]    [●]    [■]    [ ]    [ ]
08:20     [■]    [ ]    [ ]    [●]    [■]    [ ]    [ ]
08:40     [ ]    [ ]    [ ]    [○]    [ ]    [ ]    [ ]
...

Legenda:
[■] = Ja aberto (azul)
[●] = Pendente selecionado (azul escuro)
[○] = Pendente nao selecionado (amarelo)
```

### Interacoes

#### Click Simples
Seleciona/deseleciona slot pendente para aprovacao.

#### Shift + Click
Seleciona range de slots pendentes.

#### Botoes de Acao
- **Aprovar Selecionados**: Aprova apenas slots marcados
- **Rejeitar Selecionados**: Rejeita apenas slots marcados
- **Aprovar Todos**: Aprova todos os pendentes do lote
- **Rejeitar Todos**: Rejeita todos com motivo

### Integracao com Click

A grade mostra em azul os horarios que o medico JA TEM abertos no Click (vindos de `buscarHorariosClickMedico`). Isso da contexto visual para o staff.

## 3. Gestao de Medicos

### Lista (`/medicos`)

```
┌─────────────────────────────────────────────────────────────┐
│ Gestao de Medicos                                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Filtros: [Faixa v] [Status v]  🔍 Buscar                   │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ Nome          │ Email              │ Faixa │ Score    │ │
│  ├───────────────────────────────────────────────────────┤ │
│  │ Dr. Joao      │ joao@...           │ P2    │ 68       │ │
│  │ Dra. Maria    │ maria@...          │ P1    │ 85       │ │
│  │ Dr. Pedro     │ pedro@...          │ P3    │ 45       │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  [Sincronizar com Click]  [Recalcular Scores]              │
└─────────────────────────────────────────────────────────────┘
```

### Detalhe do Medico (`/medicos/[id]`)

```
┌─────────────────────────────────────────────────────────────┐
│ Dr. Joao Silva                                              │
│ joao@email.com | Click ID: 123                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Score e Faixa                                       │   │
│  │                                                     │   │
│  │   Score: 68/100       Faixa: P2                     │   │
│  │   ████████████░░░░░░                                │   │
│  │                                                     │   │
│  │   Taxa Conversao: 55%    Ticket Medio: R$ 980      │   │
│  │   Consultas 2 sem: 45                               │   │
│  │                                                     │   │
│  │   [Alterar Score/Faixa]  [Recalcular]              │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Configuracoes                                       │   │
│  │                                                     │   │
│  │   Dias Permitidos: [x]Seg [x]Ter [x]Qua ...         │   │
│  │                                                     │   │
│  │   Restricoes por Dia:                               │   │
│  │   Seg: 08:00 - 18:00                                │   │
│  │   Ter: 14:00 - 21:00                                │   │
│  │                                                     │   │
│  │   [Salvar Configuracoes]                            │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Horarios Atuais (do Click)                          │   │
│  │                                                     │   │
│  │   Seg: 08:00-12:00, 14:00-18:00                     │   │
│  │   Ter: 08:00-12:00                                  │   │
│  │   Qui: 14:00-18:00                                  │   │
│  │   Sex: 08:00-12:00, 14:00-18:00                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Historico de Scores                                 │   │
│  │                                                     │   │
│  │   15/01 - Score: 68, Faixa: P2 (Automatico)        │   │
│  │   08/01 - Score: 72, Faixa: P2 (Automatico)        │   │
│  │   01/01 - Score: 65, Faixa: P2 (Manual - Admin)    │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Modal Alterar Score

```
┌─────────────────────────────────────┐
│ Alterar Score/Faixa                 │
├─────────────────────────────────────┤
│                                     │
│ Nova Faixa: [P2 v]                  │
│                                     │
│ Novo Score: [68]                    │
│                                     │
│ Justificativa: *                    │
│ ┌─────────────────────────────────┐ │
│ │ Ajuste manual apos revisao de   │ │
│ │ metricas...                     │ │
│ └─────────────────────────────────┘ │
│                                     │
│ * Minimo 10 caracteres              │
│                                     │
│ [Cancelar]        [Confirmar]       │
└─────────────────────────────────────┘
```

## 4. Painel de Emergenciais

### Lista (`/emergenciais`)

```
┌─────────────────────────────────────────────────────────────┐
│ Emergenciais                               [+ Nova]         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [Abertas] [Preenchidas] [Expiradas]                        │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 20/01 - Tarde (14:00-18:00)                         │   │
│  │ Status: Aberta | Faixa atual: P2                    │   │
│  │ Slots: 8/15 preenchidos | 3 medicos                 │   │
│  │                                                     │   │
│  │ [Ver Detalhes] [Expandir Faixa] [Cancelar]         │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 21/01 - Manha (08:00-12:00)                         │   │
│  │ Status: Preenchida | 15/15 slots                    │   │
│  │                                                     │   │
│  │ [Ver Detalhes]                                      │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Criar Emergencial

```
┌─────────────────────────────────────┐
│ Nova Emergencial                    │
├─────────────────────────────────────┤
│                                     │
│ Data: [📅 20/01/2024]               │
│                                     │
│ Periodo: [Tarde v]                  │
│                                     │
│ Horario Inicio: [14:00]             │
│ Horario Fim: [18:00]                │
│                                     │
│ Slots Necessarios: [15]             │
│                                     │
│ Mensagem (opcional):                │
│ ┌─────────────────────────────────┐ │
│ │ Demanda alta para tarde...      │ │
│ └─────────────────────────────────┘ │
│                                     │
│ [Cancelar]        [Criar]           │
└─────────────────────────────────────┘
```

## 5. Painel de Cancelamentos Emergenciais

### Lista

```
┌─────────────────────────────────────────────────────────────┐
│ Cancelamentos Emergenciais                                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [Pendentes: 3]  [Aprovados] [Rejeitados]                   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Dr. Joao Silva                           Pendente   │   │
│  │ Qui 14:00-14:20 | Motivo: Doenca                    │   │
│  │ "Consulta medica de emergencia"                     │   │
│  │ Criado ha 30 min                                    │   │
│  │                                                     │   │
│  │ Consultas no horario: 1                             │   │
│  │                                                     │   │
│  │ [Aprovar]  [Rejeitar]                              │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Acoes Disponiveis por Role

| Acao | Atendente | Diretor | Admin |
|------|-----------|---------|-------|
| Ver solicitacoes | ✅ | ✅ | ✅ |
| Aprovar/Rejeitar | ✅ | ✅ | ✅ |
| Override aprovacao | ❌ | ✅ | ✅ |
| Ver medicos | ✅ | ✅ | ✅ |
| Alterar config medico | ❌ | ❌ | ✅ |
| Alterar score manual | ❌ | ❌ | ✅ |
| Criar emergencial | ✅ | ✅ | ✅ |
| Expandir faixa | ✅ | ✅ | ✅ |
| Recalcular scores | ❌ | ❌ | ✅ |
| Sincronizar Click | ❌ | ❌ | ✅ |

## Rotas

| Rota | Descricao | Roles |
|------|-----------|-------|
| `/solicitacoes` | Painel de solicitacoes | Staff |
| `/medicos` | Lista de medicos | Staff |
| `/medicos/[id]` | Detalhe do medico | Staff |
| `/emergenciais` | Painel de emergenciais | Staff |
| `/dashboard` | Metricas e KPIs | Staff |

## 6. Dashboard e Metricas

O dashboard principal esta documentado em [dashboard.md](./dashboard.md) e inclui:

- **Centro de Comando** (`/dashboard`): KPIs, rankings, alertas resumidos
- **Central de Alertas** (`/dashboard/alertas`): Alertas por severidade
- **Performance Individual** (`/dashboard/medicos`): Comparativo medico vs plataforma

### Acoes do Staff no Dashboard

| Acao | Descricao |
|------|-----------|
| Filtrar por medico | Seleciona medico especifico |
| Filtrar por periodo | Seleciona range de datas |
| Ver alertas | Navega para central de alertas |
| Ver performance | Navega para pagina do medico |

---

## 7. Funcionalidades de Emergenciais (Staff)

### Expandir Faixa Manualmente

Staff pode expandir a faixa de visibilidade de uma emergencial antes do tempo automatico.

```
Emergencial: 20/01 - Tarde
Faixa Atual: P2
[Expandir para P3]  ← Expande imediatamente
```

**Comportamento:**
1. Click em "Expandir Faixa"
2. Sistema move para proxima faixa (P2 → P3)
3. Mais medicos passam a ver a emergencial
4. Notificacao enviada aos novos medicos visiveis

### Cancelar Emergencial

Staff pode cancelar uma emergencial que nao e mais necessaria.

```
[Cancelar Emergencial]
  ↓
Status: aberta → expirada
```

**Nota:** Respostas ja aceitas permanecem validas.

---

## Hooks Utilizados

### useSmartPolling
```typescript
// Para solicitacoes
const { interval } = useSmartPolling("solicitacoes");
// Ativo: 20s, Background: 60s

// Para emergenciais
const { interval } = useSmartPolling("emergenciais");
// Ativo: 10s, Background: 30s

// Para dashboard
const { interval } = useSmartPolling("dashboard");
// Ativo: 5min, Background: 10min
```

### Invalidacao de Cache
```typescript
// Apos aprovar slots
queryClient.invalidateQueries({ queryKey: [["solicitacoes"]] });
queryClient.invalidateQueries({ queryKey: [["medicos"]] });

// Apos expandir emergencial
queryClient.invalidateQueries({ queryKey: [["emergenciais"]] });

// Apos aprovar cancelamento
queryClient.invalidateQueries({ queryKey: [["cancelamentoEmergencial"]] });
```

---

## Processos Automaticos (Cron)

O sistema executa processos automaticos que afetam as telas do staff:

### Expansao Automatica de Faixas
- **Frequencia:** A cada 30 minutos
- **Acao:** Expande faixas de emergenciais abertas
- **Endpoint:** `emergenciais.expandirFaixasAutomatico`

### Expiracao de Emergenciais
- **Frequencia:** A cada 15 minutos
- **Acao:** Marca emergenciais passadas como expiradas
- **Endpoint:** `emergenciais.expirarEmergenciais`
