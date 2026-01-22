# Documentacao das APIs (tRPC)

## Visao Geral

O backend utiliza tRPC para definir endpoints type-safe. Os routers sao organizados por dominio.

## Routers Disponiveis

| Router | Arquivo | Descricao |
|--------|---------|-----------|
| `solicitacoes` | solicitacoes.ts | Solicitacoes de horarios |
| `medicos` | medicos.ts | Gestao de medicos |
| `emergenciais` | emergenciais.ts | Emergenciais de demanda |
| `cancelamentoEmergencial` | cancelamento-emergencial.ts | Cancelamentos com consulta |
| `dashboardMetricas` | dashboardMetricas.ts | **Dashboard - Metricas e KPIs** |
| `dashboard` | dashboard.ts | Dashboard (demanda) |
| `usuarios` | usuarios.ts | Gestao de usuarios |
| `config` | config.ts | Configuracoes do sistema |
| `auditoria` | auditoria.ts | Logs de auditoria |

---

## Router: `solicitacoes`

### `solicitacoes.criar`
Cria solicitacao de abertura simples.

**Tipo:** mutation
**Permissao:** medicoProcedure

**Input:**
```typescript
{
  diaSemana: "dom" | "seg" | "ter" | "qua" | "qui" | "sex" | "sab",
  horarioInicio: string, // "HH:MM"
  horarioFim: string     // "HH:MM"
}
```

**Output:**
```typescript
{
  id: string,
  medicoId: string,
  diaSemana: string,
  horarioInicio: string,
  horarioFim: string,
  status: "pendente",
  createdAt: Date
}
```

---

### `solicitacoes.criarLote`
Cria lote de alteracoes (abrir e/ou fechar).

**Tipo:** mutation
**Permissao:** medicoProcedure

**Input:**
```typescript
{
  alteracoes: Array<{
    diaSemana: "dom" | "seg" | "ter" | "qua" | "qui" | "sex" | "sab",
    horario: string,    // "HH:MM"
    acao: "abrir" | "fechar"
  }>
}
```

**Output:**
```typescript
{
  success: true,
  tipo: "misto" | "fechamentos_processados",
  totalAlteracoes: number,
  abrir: number,
  fechar: number,
  fechamentosProcessados: boolean,
  sugestaoId?: string
}
```

---

### `solicitacoes.aprovarSlots`
Aprova slots especificos de uma solicitacao.

**Tipo:** mutation
**Permissao:** staffProcedure

**Input:**
```typescript
{
  medicoId: string,
  slots: Array<{
    diaSemana: "dom" | "seg" | "ter" | "qua" | "qui" | "sex" | "sab",
    horario: string // "HH:MM"
  }>
}
```

**Output:**
```typescript
{
  success: true,
  slotsAprovados: number
}
```

---

### `solicitacoes.rejeitarSlots`
Rejeita slots especificos de uma solicitacao.

**Tipo:** mutation
**Permissao:** staffProcedure

**Input:**
```typescript
{
  medicoId: string,
  slots: Array<{
    diaSemana: string,
    horario: string
  }>,
  motivo?: string
}
```

**Output:**
```typescript
{
  success: true,
  slotsRejeitados: number
}
```

---

### `solicitacoes.listarAgrupado`
Lista solicitacoes agrupadas por medico (para staff).

**Tipo:** query
**Permissao:** staffProcedure

**Input:**
```typescript
{
  status?: "pendente" | "aprovada" | "rejeitada",
  medicoId?: string,
  diaSemana?: string,
  periodo?: "manha" | "tarde" | "noite",
  faixa?: "P1" | "P2" | "P3" | "P4" | "P5",
  apenasAtrasadas?: boolean
}
```

**Output:**
```typescript
Array<{
  sugestaoId: string,
  medico: {
    id: string,
    name: string,
    email: string,
    clickId: string | null
  },
  faixa: string,
  score: number,
  slots: Array<{
    id: string,
    diaSemana: string,
    horarioInicio: string,
    horarioFim: string,
    atrasada: boolean,
    status: string
  }>,
  slotsAprovados: Array<{...}>,
  totalSlots: number,
  primeiraData: Date,
  temAtrasada: boolean
}>
```

---

### `solicitacoes.minhasSugestoes`
Lista solicitacoes do medico logado.

**Tipo:** query
**Permissao:** medicoProcedure

**Output:**
```typescript
Array<{
  id: string,
  diaSemana: string,
  horarioInicio: string,
  horarioFim: string,
  status: "pendente" | "aprovada" | "rejeitada",
  dadosLote: string | null,
  motivoRejeicao: string | null,
  createdAt: Date
}>
```

---

### `solicitacoes.cancelar`
Cancela solicitacao pendente do medico.

**Tipo:** mutation
**Permissao:** medicoProcedure

**Input:**
```typescript
{ id: string }
```

**Output:**
```typescript
{ success: true }
```

---

### `solicitacoes.estatisticas`
Estatisticas para dashboard do staff.

**Tipo:** query
**Permissao:** staffProcedure

**Output:**
```typescript
{
  totalPendentes: number,
  atrasadas: number,
  aprovadasHoje: number,
  rejeitadasHoje: number
}
```

---

## Router: `medicos`

### `medicos.listar`
Lista todos os medicos ativos.

**Tipo:** query
**Permissao:** staffProcedure

**Output:**
```typescript
Array<{
  id: string,
  name: string,
  email: string,
  clickId: string | null,
  ativo: boolean,
  gestor: { id, name, email } | null,
  score: {
    score: number,
    faixa: string,
    taxaConversao: number | null,
    ticketMedio: number | null,
    consultas2Semanas: number | null,
    calculadoEm: Date
  } | null
}>
```

---

### `medicos.meusHorariosComConsultas`
Horarios do medico com info de consultas.

**Tipo:** query
**Permissao:** medicoProcedure

**Output:**
```typescript
{
  horarios: Array<{
    id: string,
    diaSemana: string,
    horarioInicio: string,
    horarioFim: string,
    horario: string,
    origem: "local" | "click"
  }>,
  consultas: Record<string, Array<{
    id: string,
    data: string,
    dataBr: string,
    hora: string
  }>>
}
```

---

### `medicos.meusAgendamentos`
Proximas consultas do medico.

**Tipo:** query
**Permissao:** medicoProcedure

**Output:**
```typescript
Array<{
  id: string,
  pacienteNome: string,
  data: string,
  hora: string,
  dataBr: string,
  diaSemana: string,
  patologias: string | null,
  statusAnamnese: "completed" | "pending" | null,
  linkCrm: string | null,
  linkConsulta: string | null,
  linkAnamnese: string | null,
  tipoConsulta: string | null
}>
```

---

### `medicos.meuScore`
Score e faixa do medico logado.

**Tipo:** query
**Permissao:** medicoProcedure

**Output:**
```typescript
{
  score: number,
  faixa: "P1" | "P2" | "P3" | "P4" | "P5",
  taxaConversao: number | null,
  ticketMedio: number | null,
  consultas2Semanas: number | null
}
```

---

### `medicos.atualizarScore`
Altera score manualmente (admin).

**Tipo:** mutation
**Permissao:** adminProcedure

**Input:**
```typescript
{
  medicoId: string,
  score: number,        // 0-100
  faixa: "P1" | "P2" | "P3" | "P4" | "P5",
  justificativa: string // min 1 char
}
```

**Output:**
```typescript
{ success: true }
```

---

### `medicos.recalcularScoreMedico`
Recalcula score de um medico (admin).

**Tipo:** mutation
**Permissao:** adminProcedure

**Input:**
```typescript
{ medicoId: string }
```

**Output:**
```typescript
{
  success: true,
  score: number,
  faixa: string,
  taxaConversao: number,
  ticketMedio: number,
  percentilConversao: number,
  percentilTicket: number
}
```

---

## Router: `emergenciais`

### `emergenciais.criar`
Cria nova emergencial.

**Tipo:** mutation
**Permissao:** staffProcedure

**Input:**
```typescript
{
  data: string,           // "2024-01-20"
  periodo: "manha" | "tarde" | "noite",
  horarioInicio: string,  // "14:00"
  horarioFim: string,     // "18:00"
  slotsNecessarios: number,
  mensagem?: string
}
```

**Output:**
```typescript
{
  id: string,
  data: Date,
  periodo: string,
  horarioInicio: string,
  horarioFim: string,
  slotsNecessarios: number,
  slotsPreenchidos: 0,
  faixaAtual: "P1",
  status: "aberta"
}
```

---

### `emergenciais.disponiveis`
Lista emergenciais disponiveis para o medico.

**Tipo:** query
**Permissao:** medicoProcedure

**Output:**
```typescript
Array<{
  id: string,
  data: Date,
  periodo: string,
  horarioInicio: string,
  horarioFim: string,
  slotsRestantes: number,
  slotsNecessarios: number,
  mensagem: string | null,
  slotsLivresParaMim: number
}>
```

---

### `emergenciais.aceitar`
Medico aceita emergencial com horarios.

**Tipo:** mutation
**Permissao:** medicoProcedure

**Input:**
```typescript
{
  emergencialId: string,
  horariosAceitos: string[] // ["08:00", "08:20", "09:00"]
}
```

**Output:**
```typescript
{
  success: true,
  resposta: {
    id: string,
    horariosAceitos: string[],
    slotsAceitos: number
  }
}
```

---

### `emergenciais.recusar`
Medico recusa ver emergencial.

**Tipo:** mutation
**Permissao:** medicoProcedure

**Input:**
```typescript
{ emergencialId: string }
```

**Output:**
```typescript
{ success: true, jaRecusada: boolean }
```

---

### `emergenciais.expandirFaixa`
Staff expande faixa da emergencial.

**Tipo:** mutation
**Permissao:** staffProcedure

**Input:**
```typescript
{ id: string }
```

**Output:**
```typescript
{ success: true, novaFaixa: string }
```

---

## Router: `cancelamentoEmergencial`

### `cancelamentoEmergencial.criar`
Medico solicita cancelamento emergencial.

**Tipo:** mutation
**Permissao:** medicoProcedure

**Input:**
```typescript
{
  slots: Array<{
    diaSemana: string,
    horario: string
  }>,
  motivoCategoria: "doenca" | "emergencia_familiar" | "compromisso_medico",
  motivoDescricao?: string
}
```

**Output:**
```typescript
{
  success: true,
  cancelamento: {
    id: string,
    status: "pendente",
    diaSemana: string,
    horarioInicio: string,
    horarioFim: string
  }
}
```

---

### `cancelamentoEmergencial.listarPendentes`
Lista cancelamentos pendentes (staff).

**Tipo:** query
**Permissao:** staffProcedure

**Output:**
```typescript
Array<{
  id: string,
  medico: { id, name, email },
  diaSemana: string,
  horarioInicio: string,
  horarioFim: string,
  status: string,
  motivoCategoria: string,
  motivoDescricao: string | null,
  createdAt: Date
}>
```

---

### `cancelamentoEmergencial.aprovar`
Staff aprova cancelamento.

**Tipo:** mutation
**Permissao:** staffProcedure

**Input:**
```typescript
{ id: string }
```

**Output:**
```typescript
{
  success: true,
  cancelamento: {
    id: string,
    status: "aprovado",
    processadoEm: Date
  }
}
```

---

### `cancelamentoEmergencial.rejeitar`
Staff rejeita cancelamento.

**Tipo:** mutation
**Permissao:** staffProcedure

**Input:**
```typescript
{
  id: string,
  motivo: string // Obrigatorio
}
```

**Output:**
```typescript
{
  success: true,
  cancelamento: {
    id: string,
    status: "rejeitado",
    motivoRejeicao: string
  }
}
```

---

## Router: `me`

### `me`
Retorna dados do usuario logado.

**Tipo:** query
**Permissao:** protectedProcedure

**Output:**
```typescript
{
  id: string,
  name: string,
  email: string,
  tipo: "super_admin" | "admin" | "diretor" | "atendente" | "medico",
  ativo: boolean,
  clickId: string | null
}
```

---

## Codigos de Erro Comuns

| Codigo | Descricao |
|--------|-----------|
| `NOT_FOUND` | Recurso nao encontrado |
| `BAD_REQUEST` | Dados invalidos |
| `FORBIDDEN` | Sem permissao |
| `UNAUTHORIZED` | Nao autenticado |
| `INTERNAL_SERVER_ERROR` | Erro do servidor |
| `PRECONDITION_FAILED` | Pre-condicao falhou (ex: Click offline) |

---

## Router: `dashboardMetricas`

### `dashboardMetricas.listarMedicosParaFiltro`
Lista medicos para dropdown de filtro.

**Tipo:** query
**Permissao:** staffProcedure

**Output:**
```typescript
Array<{
  id: string,
  name: string,
  clickId: string | null
}>
```

---

### `dashboardMetricas.getDadosPrincipais`
Busca metricas principais do dashboard.

**Tipo:** query
**Permissao:** staffProcedure

**Input:**
```typescript
{
  dataInicio: string,  // "YYYY-MM-DD"
  dataFim: string,     // "YYYY-MM-DD"
  doctorId?: number    // Filtro por medico
}
```

**Output:**
```typescript
{
  volume: {
    agendadas: number,
    realizadas: number,
    noShows: number,
    canceladas: number,
    novos: number,
    recorrentes: number
  },
  prescricao: {
    comReceita: number,
    semReceita: number,
    porcentagem: number
  },
  conversao: {
    taxa: number,
    meta: number
  },
  financeiro: {
    faturamento: number,
    ticketMedio: number,
    orcamentosPagos: number
  },
  comparecimento: {
    taxa: number,
    noShow: number
  },
  periodoAnterior: {
    faturamento: number,
    consultas: number,
    conversao: number
  }
}
```

---

### `dashboardMetricas.getDadosComplementares`
Busca dados complementares (eficiencia, reviews, rankings).

**Tipo:** query
**Permissao:** staffProcedure

**Input:**
```typescript
{
  dataInicio: string,
  dataFim: string,
  doctorId?: number
}
```

**Output:**
```typescript
{
  tempo: {
    mediaTempo: number,
    sla1h: number,
    slaMesmoDia: number
  },
  reviews: {
    media: number,
    minima: number,
    maxima: number,
    total: number
  },
  distribuicoes: {
    porHora: Array<{ hora: string, consultas: number }>,
    porDia: Array<{ dia: string, consultas: number }>
  },
  rankingMedicos: Array<{
    id: string,
    nome: string,
    consultas: number,
    receitas: number,
    faturamento: number,
    conversao: number,
    faixa: string
  }>,
  eficiencia: {
    tempoMedioReceita: number,
    slaReceitas1h: number,
    slaReceitasMesmoDia: number
  }
}
```

---

### `dashboardMetricas.getAlertasExpandidos`
Busca alertas categorizados por severidade.

**Tipo:** query
**Permissao:** staffProcedure

**Input:**
```typescript
{
  dataInicio: string,
  dataFim: string
}
```

**Output:**
```typescript
{
  criticos: Array<{
    tipo: string,
    medicoId: string,
    medicoNome: string,
    valor: number,
    meta: number,
    mensagem: string
  }>,
  alertas: Array<{...}>,
  oportunidades: Array<{...}>,
  totais: {
    criticos: number,
    alertas: number,
    oportunidades: number
  },
  medias: {
    conversao: number,
    noShow: number,
    nota: number
  }
}
```

**Tipos de Alertas:**
- `noShowCritico`: Taxa de no-show critica
- `conversaoCritica`: Taxa de conversao muito baixa
- `receitaAtrasada`: Receitas com atraso
- `notaMinima1`: Nota abaixo do minimo
- `riscoRebaixamento`: Risco de rebaixamento de faixa
- `prontoPromocao`: Medico pronto para promocao
- `reviewChampion`: Destaque em avaliacoes

---

### `dashboardMetricas.getPerformanceRanking`
Busca ranking de performance (top e at-risk).

**Tipo:** query
**Permissao:** staffProcedure

**Input:**
```typescript
{
  dataInicio: string,
  dataFim: string
}
```

**Output:**
```typescript
{
  topPerformers: Array<{
    id: string,
    nome: string,
    nota: number,
    conversao: number,
    faturamento: number,
    faixa: string
  }>,
  precisamAtencao: Array<{
    id: string,
    nome: string,
    problema: string,
    valor: number,
    risco: number
  }>
}
```

---

### `dashboardMetricas.getComparativoMedico`
Compara metricas de um medico com a plataforma.

**Tipo:** query
**Permissao:** staffProcedure

**Input:**
```typescript
{
  doctorId: number,
  dataInicio: string,
  dataFim: string
}
```

**Output:**
```typescript
{
  medico: {
    conversao: number,
    noShow: number,
    ticketMedio: number,
    notaMedia: number,
    receita1h: number
  },
  plataforma: {
    conversao: number,
    noShow: number,
    ticketMedio: number,
    notaMedia: number,
    receita1h: number
  },
  desvios: {
    conversao: number,      // % acima/abaixo
    noShow: number,
    ticketMedio: number,
    notaMedia: number,
    receita1h: number
  }
}
```

---

### `dashboardMetricas.getAnaliseNoShows`
Analise detalhada de no-shows por categoria.

**Tipo:** query
**Permissao:** staffProcedure

**Input:**
```typescript
{
  dataInicio: string,
  dataFim: string,
  doctorId?: number
}
```

**Output:**
```typescript
{
  totais: {
    total: number,
    porcentagem: number
  },
  categorias: Array<{
    categoria: string,
    quantidade: number,
    porcentagem: number
  }>,
  porMedico: Array<{
    medicoId: string,
    medicoNome: string,
    total: number,
    porcentagem: number
  }>,
  totalDetalhes: number
}
```

**Categorias de No-Show:**
- Paciente nao compareceu
- Problemas tecnicos/Conexao
- Reagendamento
- Atraso/Tolerancia excedida
- Outros motivos
- Sem motivo registrado
- Retorno medico

---

### `dashboardMetricas.getMediasPlataforma`
Busca medias da plataforma para comparacao.

**Tipo:** query
**Permissao:** staffProcedure

**Input:**
```typescript
{
  dataInicio: string,
  dataFim: string
}
```

**Output:**
```typescript
{
  conversao: number,
  noShow: number,
  ticketMedio: number,
  notaMedia: number,
  receita1h: number,
  totalConsultas: number
}
```

---

### `dashboardMetricas.getDetalhesMedicos`
Busca detalhes de performance de todos os medicos.

**Tipo:** query
**Permissao:** staffProcedure

**Input:**
```typescript
{
  dataInicio: string,
  dataFim: string,
  doctorId?: number
}
```

**Output:**
```typescript
Array<{
  id: number,
  nome: string,
  consultas: number,
  realizadas: number,
  noShows: number,
  conversao: number,
  faturamento: number,
  ticketMedio: number,
  nota: number,
  faixa: string
}>
```

---

## Router: `solicitacoes` (endpoints adicionais)

### `solicitacoes.buscarHorariosClickMedico`
Busca horarios atuais do medico no Click.

**Tipo:** query
**Permissao:** staffProcedure

**Input:**
```typescript
{ clickId: string }
```

**Output:**
```typescript
{
  success: boolean,
  horarios: Array<{
    diaSemana: string,
    horarioInicio: string,
    horarioFim: string
  }>
}
```

---

### `solicitacoes.listarPendentes`
Lista todas solicitacoes pendentes.

**Tipo:** query
**Permissao:** staffProcedure

**Output:**
```typescript
Array<{
  id: string,
  medico: { id, name, email, clickId },
  diaSemana: string,
  horarioInicio: string,
  horarioFim: string,
  status: "pendente",
  dadosLote: string | null,
  createdAt: Date
}>
```

---

### `solicitacoes.listar`
Lista solicitacoes com filtros.

**Tipo:** query
**Permissao:** staffProcedure

**Input:**
```typescript
{
  medicoId?: string,
  status?: "pendente" | "aprovada" | "rejeitada",
  limite?: number
}
```

---

### `solicitacoes.buscarPorId`
Busca solicitacao por ID.

**Tipo:** query
**Permissao:** staffProcedure

**Input:**
```typescript
{ id: string }
```

**Output:**
```typescript
{
  id: string,
  medico: { id, name, email },
  diaSemana: string,
  horarioInicio: string,
  horarioFim: string,
  status: string,
  dadosLote: string | null,
  override: boolean,
  overrideJustificativa: string | null,
  aprovadoPor: { id, name } | null,
  createdAt: Date
}
```

---

### `solicitacoes.aprovar`
Aprova solicitacao individual.

**Tipo:** mutation
**Permissao:** staffProcedure

**Input:**
```typescript
{ id: string }
```

---

### `solicitacoes.aprovarLote`
Aprova multiplas solicitacoes.

**Tipo:** mutation
**Permissao:** staffProcedure

**Input:**
```typescript
{ ids: string[] }
```

**Output:**
```typescript
{
  success: boolean,
  aprovadas: number,
  erros: Array<{ id: string, erro: string }>
}
```

---

### `solicitacoes.rejeitar`
Rejeita solicitacao individual.

**Tipo:** mutation
**Permissao:** staffProcedure

**Input:**
```typescript
{
  id: string,
  motivo?: string
}
```

---

### `solicitacoes.aprovarSlotsComOverride`
Aprova slots usando override (diretor+).

**Tipo:** mutation
**Permissao:** overrideProcedure

**Input:**
```typescript
{
  medicoId: string,
  slots: Array<{ diaSemana: string, horario: string }>,
  justificativa: string  // min 10 caracteres
}
```

---

### `solicitacoes.listarMedicosComPendentes`
Lista medicos que tem solicitacoes pendentes.

**Tipo:** query
**Permissao:** staffProcedure

**Output:**
```typescript
Array<{ id: string, name: string }>
```

---

### `solicitacoes.contarAtrasadas`
Conta solicitacoes pendentes ha mais de 24h.

**Tipo:** query
**Permissao:** staffProcedure

**Output:**
```typescript
{ count: number }
```

---

## Router: `emergenciais` (endpoints adicionais)

### `emergenciais.listar`
Lista emergenciais com filtro de status.

**Tipo:** query
**Permissao:** staffProcedure

**Input:**
```typescript
{
  status?: "aberta" | "preenchida" | "expirada" | "todas"
}
```

**Output:**
```typescript
Array<{
  id: string,
  data: Date,
  periodo: string,
  horarioInicio: string,
  horarioFim: string,
  slotsNecessarios: number,
  slotsPreenchidos: number,
  faixaAtual: string,
  status: string,
  mensagem: string | null,
  criadoPor: { id, name },
  respostas: Array<{...}>
}>
```

---

### `emergenciais.buscarPorId`
Busca emergencial por ID com contagem de medicos.

**Tipo:** query
**Permissao:** staffProcedure

**Input:**
```typescript
{ id: string }
```

**Output:**
```typescript
{
  ...Emergencial,
  medicosUnicos: number
}
```

---

### `emergenciais.atualizar`
Atualiza emergencial aberta.

**Tipo:** mutation
**Permissao:** staffProcedure

**Input:**
```typescript
{
  id: string,
  slotsNecessarios?: number,
  mensagem?: string
}
```

---

### `emergenciais.cancelar`
Cancela emergencial (marca como expirada).

**Tipo:** mutation
**Permissao:** staffProcedure

**Input:**
```typescript
{ id: string }
```

---

### `emergenciais.buscarRespostas`
Busca respostas de uma emergencial.

**Tipo:** query
**Permissao:** staffProcedure

**Input:**
```typescript
{ emergencialId: string }
```

**Output:**
```typescript
Array<{
  id: string,
  medico: { id, name, email, clickId },
  horariosAceitos: string[],
  slotsAceitos: number,
  sincronizadoClick: boolean,
  cancelado: boolean,
  createdAt: Date
}>
```

---

### `emergenciais.estatisticas`
Estatisticas de emergenciais.

**Tipo:** query
**Permissao:** staffProcedure

**Output:**
```typescript
{
  abertas: number,
  preenchidas: number,
  expiradas: number
}
```

---

### `emergenciais.expandirFaixasAutomatico`
Expande faixas automaticamente (chamado por cron).

**Tipo:** mutation
**Permissao:** staffProcedure

**Output:**
```typescript
{
  success: boolean,
  expandidas: number
}
```

**Nota:** Executado a cada 30 minutos pelo cron.

---

### `emergenciais.expirarEmergenciais`
Expira emergenciais antigas (chamado por cron).

**Tipo:** mutation
**Permissao:** staffProcedure

**Output:**
```typescript
{
  success: boolean,
  expiradas: number
}
```

**Nota:** Executado a cada 15 minutos pelo cron.

---

### `emergenciais.buscarHorariosDisponiveis`
Busca horarios disponiveis para aceitar em emergencial.

**Tipo:** query
**Permissao:** medicoProcedure

**Input:**
```typescript
{ emergencialId: string }
```

**Output:**
```typescript
{
  todosSlots: string[],          // Todos os slots da emergencial
  horariosJaAbertos: string[],   // Slots que o medico ja tem
  slotsRestantes: number
}
```

---

### `emergenciais.cancelarHorariosResposta`
Medico cancela horarios ja aceitos.

**Tipo:** mutation
**Permissao:** medicoProcedure

**Input:**
```typescript
{
  respostaId: string,
  horariosParaCancelar: string[]
}
```

---

### `emergenciais.minhasRespostas`
Lista respostas do medico logado.

**Tipo:** query
**Permissao:** medicoProcedure

**Output:**
```typescript
Array<{
  id: string,
  emergencial: {...},
  horariosAceitos: string[],
  slotsAceitos: number,
  cancelado: boolean,
  createdAt: Date
}>
```

---

## Router: `medicos` (endpoints adicionais)

### `medicos.buscarPorId`
Busca medico por ID com historico de scores.

**Tipo:** query
**Permissao:** staffProcedure

**Input:**
```typescript
{ id: string }
```

**Output:**
```typescript
{
  id: string,
  name: string,
  email: string,
  clickId: string | null,
  ativo: boolean,
  gestor: { id, name } | null,
  scores: Array<{
    score: number,
    faixa: string,
    calculadoEm: Date,
    alteradoManualmente: boolean
  }>,
  horariosClick: Array<{...}>
}
```

---

### `medicos.buscarConfig`
Busca configuracoes do medico.

**Tipo:** query
**Permissao:** staffProcedure

**Input:**
```typescript
{ medicoId: string }
```

**Output:**
```typescript
{
  id: string,
  slotsMinSemana: number | null,
  slotsMaxSemana: number | null,
  diasPermitidos: string[],
  horarioInicio: string | null,
  horarioFim: string | null,
  restricoesDia: object | null
}
```

---

### `medicos.buscarHorarios`
Busca horarios ativos do medico.

**Tipo:** query
**Permissao:** staffProcedure

**Input:**
```typescript
{ medicoId: string }
```

**Output:**
```typescript
Array<{
  id: string,
  diaSemana: string,
  horarioInicio: string,
  horarioFim: string,
  ativo: boolean
}>
```

---

### `medicos.buscarScore`
Busca score atual do medico.

**Tipo:** query
**Permissao:** staffProcedure

**Input:**
```typescript
{ medicoId: string }
```

**Output:**
```typescript
{
  score: number,
  faixa: string,
  taxaConversao: number | null,
  ticketMedio: number | null,
  consultas2Semanas: number | null,
  percentilConversao: number | null,
  percentilTicket: number | null,
  calculadoEm: Date,
  alteradoManualmente: boolean,
  justificativa: string | null
}
```

---

### `medicos.recalcularScores`
Recalcula scores de todos os medicos.

**Tipo:** mutation
**Permissao:** adminProcedure

**Output:**
```typescript
{
  success: boolean,
  message: string,
  atualizados: number,
  atualizadosManuais: number,
  total: number,
  erros: Array<{ medicoId: string, erro: string }>
}
```

---

### `medicos.cancelarHorario`
Cancela horario individual do medico.

**Tipo:** mutation
**Permissao:** medicoProcedure

**Input:**
```typescript
{
  id: string,
  motivo?: string
}
```

**Validacoes:**
- Minimo 2 dias de antecedencia
- Nao pode ter consulta agendada

---

### `medicos.cancelarHorariosLote`
Cancela multiplos horarios em lote.

**Tipo:** mutation
**Permissao:** medicoProcedure

**Input:**
```typescript
{
  slots: Array<{
    diaSemana: string,
    horario: string
  }>
}
```

**Output:**
```typescript
{
  success: boolean,
  slotsCancelados: number
}
```

---

### `medicos.sincronizar`
Sincroniza medicos com API Click.

**Tipo:** mutation
**Permissao:** adminProcedure

**Output:**
```typescript
{
  success: boolean,
  total: number,
  criados: number,
  atualizados: number,
  erros: Array<{ clickId: string, erro: string }>
}
```

---

### `medicos.atualizarConfig`
Atualiza configuracoes do medico.

**Tipo:** mutation
**Permissao:** adminProcedure

**Input:**
```typescript
{
  medicoId: string,
  slotsMinSemana?: number,
  slotsMaxSemana?: number,
  diasPermitidos?: string[],
  restricoesDia?: object
}
```

---

## Router: `cancelamentoEmergencial` (endpoints adicionais)

### `cancelamentoEmergencial.listarHorariosDisponiveis`
Lista horarios disponiveis para cancelamento emergencial.

**Tipo:** query
**Permissao:** medicoProcedure

**Output:**
```typescript
Array<{
  diaSemana: string,
  horario: string,
  temConsulta: boolean,
  consultasPorSlot: number
}>
```

---

### `cancelamentoEmergencial.minhasSolicitacoes`
Lista cancelamentos do medico logado.

**Tipo:** query
**Permissao:** medicoProcedure

**Output:**
```typescript
Array<{
  id: string,
  diaSemana: string,
  horarioInicio: string,
  horarioFim: string,
  status: string,
  motivoCategoria: string,
  motivoDescricao: string | null,
  motivoRejeicao: string | null,
  createdAt: Date
}>
```

---

### `cancelamentoEmergencial.cancelarSolicitacao`
Cancela solicitacao de cancelamento pendente.

**Tipo:** mutation
**Permissao:** medicoProcedure

**Input:**
```typescript
{ id: string }
```

---

### `cancelamentoEmergencial.aprovarMultiplos`
Aprova multiplos cancelamentos.

**Tipo:** mutation
**Permissao:** staffProcedure

**Input:**
```typescript
{ ids: string[] }
```

**Output:**
```typescript
{
  success: boolean,
  aprovados: number,
  erros: Array<{ id: string, erro: string }>
}
```

---

### `cancelamentoEmergencial.rejeitarMultiplos`
Rejeita multiplos cancelamentos.

**Tipo:** mutation
**Permissao:** staffProcedure

**Input:**
```typescript
{
  ids: string[],
  motivo: string
}
```

---

### `cancelamentoEmergencial.estatisticas`
Estatisticas de cancelamentos emergenciais.

**Tipo:** query
**Permissao:** staffProcedure

**Output:**
```typescript
{
  pendentes: number,
  aprovadosHoje: number,
  rejeitadosHoje: number,
  total: number
}
```

---

## Integracao com API Click

Endpoints que sincronizam com Click:
- `solicitacoes.aprovarSlots` → `atualizar-hora-medico`
- `solicitacoes.criarLote` (fechamentos) → `atualizar-hora-medico`
- `emergenciais.aceitar` → `atualizar-hora-medico`
- `medicos.recalcularScoreMedico` → `metricas-medicos-para-score`
- `medicos.sincronizar` → `listar-medicos`
- `medicos.meusHorarios` → `ver-calendario-do-medico`
- `medicos.meusAgendamentos` → `consultas-agendadas`

### APIs Externas Utilizadas

| Endpoint | Base URL | Uso |
|----------|----------|-----|
| `ver-calendario-do-medico` | n8n.clickagendamento.com | Calendario do medico |
| `atualizar-hora-medico` | n8n.clickagendamento.com | Sincronizar horarios |
| `validar-consultas-agendadas` | n8n.clickagendamento.com | Verificar consultas |
| `metricas-medicos-para-score` | n8n.clickagendamento.com | Metricas para score |
| `dados-principais-dashboard` | webhook externo | Dashboard principal |
| `dados-complementares-dashboard` | webhook externo | Dashboard complementar |
| `detalhes-medico-dashboard` | webhook externo | Detalhes do medico |
| `analise-noshows-dashboard` | webhook externo | Analise de no-shows |
