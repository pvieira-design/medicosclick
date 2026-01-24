# Historico de Scores dos Medicos

## Context

### Original Request
Criar um sistema para rastrear o historico de scores dos medicos ao longo do tempo. Deve haver uma nova tabela no banco de dados para armazenar os registros e uma nova tab na tela de detalhes do medico para visualizar a evolucao (grafico + tabela).

### Interview Summary
**Key Discussions**:
- **Frequencia**: Registrar a cada calculo de score (cron diario E recalculos manuais)
- **Dados**: Apenas score (numerico) e faixa (P1-P5) - sem metricas adicionais
- **Visualizacao**: Grafico de linha + tabela de registros detalhados
- **Retencao**: Sem limite de tempo (manter todo o historico)
- **Testes**: Verificacao manual apenas (projeto sem infraestrutura de testes)

**Research Findings**:
- Score calculado em `packages/api/src/services/score.service.ts`
- Formula: `Score = (percentilConversao * 0.66) + (percentilTicket * 0.34)`
- 4 triggers de calculo: cron diario, `recalcularTodosScores`, `calcularScoreMedico`, mutations tRPC
- DoctorDetailDrawer em `apps/web/src/app/(dashboard)/dashboard/medicos/page.tsx` (linha 1404)
- Projeto ja usa **Recharts** (ver `meu-desempenho/page.tsx`)
- Tabs atuais: Agenda, Observacoes, Configuracoes (grid-cols-3)

### Metis Review
**Identified Gaps** (addressed):
- Granularidade definida: salvar TODA vez, mesmo se score nao mudar
- Grid cols-3 precisa virar cols-4: resolvido na task de UI
- Index para performance: incluido no modelo Prisma
- Limit de records na query: aplicado default de 100

---

## Work Objectives

### Core Objective
Implementar rastreamento de historico de scores dos medicos com armazenamento persistente e visualizacao na interface administrativa.

### Concrete Deliverables
1. Modelo Prisma `HistoricoScore` em `packages/db/prisma/schema/app.prisma`
2. Funcao de salvamento no `score.service.ts`
3. Query tRPC `getHistoricoScore` no router de medicos
4. Nova tab "Historico" no `DoctorDetailDrawer` com grafico de linha e tabela

### Definition of Done
- [x] Apos cada recalculo de score (cron ou manual), registro salvo na tabela
- [x] Tab "Historico" visivel no drawer de detalhes do medico
- [x] Grafico mostra evolucao do score ao longo do tempo
- [x] Tabela mostra registros com data, score e faixa

### Must Have
- Registro automatico a cada calculo de score
- Grafico de linha com Recharts (biblioteca ja existente)
- Tabela com colunas: Data, Score, Faixa
- Loading state enquanto carrega dados

### Must NOT Have (Guardrails)
- NAO adicionar novas dependencias (usar Recharts existente)
- NAO criar pagina separada (e uma tab, nao uma rota)
- NAO salvar metricas adicionais (taxaConversao, ticketMedio)
- NAO adicionar exportacao CSV/PDF
- NAO adicionar comparacao entre medicos
- NAO adicionar filtro de data (pode ser feature futura)
- NAO adicionar notificacoes de mudanca de faixa

---

## Verification Strategy (MANDATORY)

### Test Decision
- **Infrastructure exists**: NO
- **User wants tests**: Manual-only
- **Framework**: none

### Manual QA Approach

Cada task inclui procedimentos de verificacao manual detalhados:
- **Database**: Verificar registros via Prisma Studio
- **API**: Verificar queries via network tab ou logs
- **UI**: Verificar via browser interativo

---

## Task Flow

```
Task 1 (Schema) 
    |
    v
Task 2 (Service) --> Task 3 (tRPC Query) 
                          |
                          v
                     Task 4 (UI Tab)
```

## Parallelization

| Group | Tasks | Reason |
|-------|-------|--------|
| - | None | Tarefas sao sequenciais |

| Task | Depends On | Reason |
|------|------------|--------|
| 2 | 1 | Precisa do modelo Prisma |
| 3 | 1 | Precisa do modelo para tipar query |
| 4 | 3 | Precisa da query tRPC |

---

## TODOs

- [x] 1. Criar modelo Prisma HistoricoScore

  **What to do**:
  - Adicionar modelo `HistoricoScore` em `packages/db/prisma/schema/app.prisma`
  - Campos: id (uuid), medicoId (FK para User), score (Decimal 5,2), faixa (Faixa enum), createdAt (DateTime)
  - Relacao: User hasMany HistoricoScore
  - Index composto em (medicoId, createdAt) para queries eficientes
  - Executar `pnpm db:generate` e `pnpm db:push`

  **Must NOT do**:
  - NAO adicionar campos de metricas (taxaConversao, ticketMedio)
  - NAO criar migracao (usar db:push para ambiente de dev)

  **Parallelizable**: NO (primeira task, sem dependencias)

  **References**:

  **Pattern References**:
  - `packages/db/prisma/schema/app.prisma:MedicoObservacao` - Seguir padrao de relacao com User e @@map
  - `packages/db/prisma/schema/app.prisma:MedicoConfig` - Padrao de modelo ligado a medico

  **Type References**:
  - `packages/db/prisma/schema/app.prisma:Faixa` (enum) - Usar enum existente para campo faixa

  **Schema Pattern**:
  ```prisma
  model HistoricoScore {
    id        String   @id @default(uuid())
    medicoId  String
    medico    User     @relation("historicoScores", fields: [medicoId], references: [id], onDelete: Cascade)
    score     Decimal  @db.Decimal(5, 2)
    faixa     Faixa
    createdAt DateTime @default(now())

    @@index([medicoId, createdAt])
    @@map("historico_score")
  }
  ```

  **IMPORTANTE**: Adicionar relacao inversa no modelo User em `auth.prisma`:
  ```prisma
  historicoScores HistoricoScore[] @relation("historicoScores")
  ```

  **Acceptance Criteria**:

  **Manual Execution Verification:**
  - [ ] Apos `pnpm db:generate`:
    - Verificar que `@prisma/client` foi atualizado sem erros
    - Comando: `pnpm db:generate`
    - Expected: "Generated Prisma Client"
  - [ ] Apos `pnpm db:push`:
    - Comando: `pnpm db:push`
    - Expected: Tabela `historico_score` criada no banco
  - [ ] Verificar no Prisma Studio:
    - Comando: `pnpm db:studio`
    - Navigate to: tabela `historico_score`
    - Verify: Tabela existe com colunas corretas (id, medicoId, score, faixa, createdAt)

  **Commit**: YES
  - Message: `feat(db): add HistoricoScore model for tracking doctor score history`
  - Files: `packages/db/prisma/schema/app.prisma`, `packages/db/prisma/schema/auth.prisma`

---

- [x] 2. Modificar score.service.ts para salvar historico

  **What to do**:
  - Importar prisma client para criar registros de historico
  - Apos cada calculo de score bem-sucedido, inserir registro em `historicoScore`
  - Inserir na funcao `calcularScoreMedico` apos o update do User
  - Tambem inserir em `recalcularTodosScores` apos cada medico processado

  **Must NOT do**:
  - NAO verificar se score mudou (salvar sempre)
  - NAO adicionar logica de retencao/limpeza
  - NAO quebrar fluxo existente se insert falhar (usar try-catch)

  **Parallelizable**: NO (depende de Task 1)

  **References**:

  **Pattern References**:
  - `packages/api/src/services/score.service.ts:calcularScoreMedico` - Funcao principal onde inserir historico (apos linha ~133 onde score e calculado)
  - `packages/api/src/services/score.service.ts:recalcularTodosScores` - Funcao batch onde tambem inserir

  **Code Location**:
  - Arquivo: `packages/api/src/services/score.service.ts`
  - Funcao `calcularScoreMedico`: apos `prisma.user.update()` que salva score e faixa
  - Funcao `recalcularTodosScores`: dentro do loop de medicos, apos cada atualizacao

  **Implementation Pattern**:
  ```typescript
  // Apos atualizar o score do medico
  await prisma.historicoScore.create({
    data: {
      medicoId: medico.id,
      score: score,
      faixa: novaFaixa,
    },
  });
  ```

  **Acceptance Criteria**:

  **Manual Execution Verification:**
  - [ ] Verificar TypeScript compila:
    - Comando: `pnpm check-types`
    - Expected: Sem erros de tipo
  - [ ] Testar via recalculo manual:
    - Acao: Logar como admin/diretor, ir em Dashboard > Medicos > Recalcular Scores
    - Ou chamar endpoint diretamente
  - [ ] Verificar registro criado no banco:
    - Comando: `pnpm db:studio`
    - Navigate to: tabela `historico_score`
    - Verify: Novos registros apareceram com medicoId, score, faixa, createdAt
  - [ ] Verificar multiplos medicos:
    - Verify: Registros criados para TODOS os medicos processados

  **Commit**: YES
  - Message: `feat(api): save score history on every calculation`
  - Files: `packages/api/src/services/score.service.ts`

---

- [x] 3. Criar query tRPC getHistoricoScore

  **What to do**:
  - Adicionar query `getHistoricoScore` no router de medicos
  - Input: medicoId (string)
  - Output: array de registros ordenados por createdAt DESC
  - Limitar a 100 registros mais recentes para performance
  - Usar procedure adequada (staffProcedure ou diretorProcedure)

  **Must NOT do**:
  - NAO adicionar paginacao (pode ser feature futura)
  - NAO adicionar filtro de data
  - NAO retornar mais de 100 registros

  **Parallelizable**: NO (depende de Task 1)

  **References**:

  **Pattern References**:
  - `packages/api/src/routers/medico.ts:getMetricasDetalhadas` - Padrao de query que recebe medicoId e retorna dados
  - `packages/api/src/routers/medico.ts` - Estrutura geral do router

  **Type References**:
  - `packages/db` - Import do prisma client
  - Query deve retornar: `{ id, medicoId, score, faixa, createdAt }[]`

  **Implementation Pattern**:
  ```typescript
  getHistoricoScore: staffProcedure
    .input(z.object({ medicoId: z.string() }))
    .query(async ({ ctx, input }) => {
      const historico = await ctx.prisma.historicoScore.findMany({
        where: { medicoId: input.medicoId },
        orderBy: { createdAt: 'desc' },
        take: 100,
        select: {
          id: true,
          score: true,
          faixa: true,
          createdAt: true,
        },
      });
      return historico;
    }),
  ```

  **Acceptance Criteria**:

  **Manual Execution Verification:**
  - [ ] Verificar TypeScript compila:
    - Comando: `pnpm check-types`
    - Expected: Sem erros de tipo
  - [ ] Verificar endpoint funciona via DevTools:
    - Acao: Abrir app no browser, logar como staff/diretor
    - Acao: Abrir DevTools > Network tab
    - Acao: Abrir detalhes de um medico (clicar na linha da tabela)
    - Verify: Query `medico.getHistoricoScore` aparece no network (quando tab for implementada)
  - [ ] Verificar resposta da query:
    - Verify: Retorna array com objetos contendo id, score, faixa, createdAt
    - Verify: Ordenado por data decrescente (mais recente primeiro)
    - Verify: Maximo 100 registros

  **Commit**: YES
  - Message: `feat(api): add getHistoricoScore query for doctor score history`
  - Files: `packages/api/src/routers/medico.ts`

---

- [x] 4. Adicionar tab Historico no DoctorDetailDrawer

  **What to do**:
  - Adicionar nova tab "Historico" na estrutura de tabs existente
  - Ajustar grid de `grid-cols-3` para `grid-cols-4`
  - Implementar componente de grafico de linha com Recharts
  - Implementar tabela de registros abaixo do grafico
  - Adicionar loading state enquanto dados carregam
  - Adicionar empty state para medico sem historico

  **Must NOT do**:
  - NAO instalar nova biblioteca de graficos (usar Recharts existente)
  - NAO adicionar filtro de periodo
  - NAO adicionar exportacao
  - NAO mostrar mais de 100 registros

  **Parallelizable**: NO (depende de Task 3)

  **References**:

  **Pattern References**:
  - `apps/web/src/app/(dashboard)/dashboard/medicos/page.tsx:1497-1524` - Estrutura de tabs existente no DoctorDetailDrawer
  - `apps/web/src/app/(dashboard)/dashboard/meu-desempenho/page.tsx:179-208` - Implementacao de LineChart com Recharts (seguir esse padrao)
  - `apps/web/src/app/(dashboard)/dashboard/medicos/page.tsx:ObservacoesTab` - Padrao de componente de tab interno

  **UI References**:
  - Cores das faixas (FRONTEND_GUIDELINES): P1=green-700, P2=green-500, P3=yellow-500, P4=orange-500, P5=red-500
  - Skeleton loading: usar componente Skeleton existente

  **Implementation Structure**:
  ```tsx
  // 1. Novo componente HistoricoTab (pode ser inline ou separado)
  function HistoricoTab({ medicoId }: { medicoId: string }) {
    const { data: historico, isLoading } = trpc.medico.getHistoricoScore.useQuery(
      { medicoId },
      { enabled: !!medicoId }
    );

    if (isLoading) return <Skeleton className="h-64" />;
    if (!historico?.length) return <EmptyState message="Nenhum historico de score ainda" />;

    // Inverter para grafico (oldest first)
    const chartData = [...historico].reverse().map(h => ({
      data: format(new Date(h.createdAt), 'dd/MM'),
      score: Number(h.score),
      faixa: h.faixa,
    }));

    return (
      <div className="space-y-6">
        {/* Grafico */}
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="data" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Line type="monotone" dataKey="score" stroke="#2563eb" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Tabela */}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Score</TableHead>
              <TableHead>Faixa</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {historico.map(h => (
              <TableRow key={h.id}>
                <TableCell>{format(new Date(h.createdAt), 'dd/MM/yyyy HH:mm')}</TableCell>
                <TableCell>{Number(h.score).toFixed(1)}</TableCell>
                <TableCell><FaixaBadge faixa={h.faixa} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  // 2. Adicionar na TabsList (mudar grid-cols-3 para grid-cols-4)
  <TabsList className="grid w-full grid-cols-4">
    <TabsTrigger value="schedule">Agenda</TabsTrigger>
    <TabsTrigger value="historico">Historico</TabsTrigger>
    <TabsTrigger value="observacoes">Observacoes</TabsTrigger>
    <TabsTrigger value="settings">Configuracoes</TabsTrigger>
  </TabsList>

  // 3. Adicionar TabsContent
  <TabsContent value="historico">
    <HistoricoTab medicoId={selectedDoctorId} />
  </TabsContent>
  ```

  **Imports necessarios** (verificar se ja existem):
  - `import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'`
  - `import { format } from 'date-fns'`
  - `import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'`

  **Acceptance Criteria**:

  **Manual Execution Verification:**
  - [ ] Verificar TypeScript compila:
    - Comando: `pnpm check-types`
    - Expected: Sem erros de tipo
  - [ ] Verificar app roda:
    - Comando: `pnpm dev`
    - Expected: App inicia sem erros
  - [ ] Verificar tab aparece:
    - Using browser: Navigate to `/dashboard/medicos`
    - Action: Clicar em um medico para abrir drawer
    - Verify: Tab "Historico" aparece ao lado de "Agenda", "Observacoes", "Configuracoes"
    - Screenshot: Salvar evidencia
  - [ ] Verificar loading state:
    - Action: Clicar na tab "Historico"
    - Verify: Skeleton/loading aparece enquanto carrega
  - [ ] Verificar grafico:
    - Verify: Grafico de linha aparece com dados do historico
    - Verify: Eixo Y vai de 0 a 100
    - Verify: Eixo X mostra datas
  - [ ] Verificar tabela:
    - Verify: Tabela aparece abaixo do grafico
    - Verify: Colunas: Data, Score, Faixa
    - Verify: Ordenado por data decrescente (mais recente primeiro)
  - [ ] Verificar empty state (se medico sem historico):
    - Action: Abrir medico que nunca teve score calculado
    - Verify: Mensagem "Nenhum historico" ou similar

  **Commit**: YES
  - Message: `feat(web): add Historico tab with score evolution chart and table`
  - Files: `apps/web/src/app/(dashboard)/dashboard/medicos/page.tsx`

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 1 | `feat(db): add HistoricoScore model for tracking doctor score history` | app.prisma, auth.prisma | pnpm db:studio |
| 2 | `feat(api): save score history on every calculation` | score.service.ts | pnpm check-types |
| 3 | `feat(api): add getHistoricoScore query for doctor score history` | medico.ts | pnpm check-types |
| 4 | `feat(web): add Historico tab with score evolution chart and table` | page.tsx | pnpm dev + browser |

---

## Success Criteria

### Verification Commands
```bash
pnpm check-types     # Expected: No errors
pnpm dev             # Expected: App starts without errors
pnpm db:studio       # Expected: historico_score table visible with data
```

### Final Checklist
- [x] Tabela `historico_score` existe no banco com estrutura correta
- [x] Registros sao criados automaticamente apos cada recalculo de score
- [x] Tab "Historico" aparece no drawer de detalhes do medico
- [x] Grafico de linha mostra evolucao do score
- [x] Tabela mostra registros com data, score e faixa
- [x] Loading state funciona enquanto dados carregam
- [x] Empty state aparece para medicos sem historico

### End-to-End Test (Manual)
1. Ir em Dashboard > Medicos
2. Clicar em "Recalcular Scores" (ou aguardar cron)
3. Clicar em um medico para abrir drawer
4. Ir na tab "Historico"
5. Verificar que grafico e tabela mostram o registro recem-criado
