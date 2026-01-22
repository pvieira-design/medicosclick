# Sistema de Niveis (Faixas P1-P5)

## Visao Geral

Os medicos sao classificados em 5 faixas (P1 a P5) baseado em seu desempenho. A faixa determina:
- Quais periodos do dia podem abrir horarios
- Quantidade maxima e minima de slots por semana
- Prioridade em emergenciais

## Definicao das Faixas

| Faixa | Score Min | Max Slots/Semana | Min Slots/Semana | Periodos Permitidos |
|-------|-----------|------------------|------------------|---------------------|
| **P1** | >= 80 | Ilimitado | 10 | Manha, Tarde, Noite |
| **P2** | >= 60 | 120 | 10 | Manha, Tarde, Noite |
| **P3** | >= 40 | 80 | 8 | Tarde, Noite |
| **P4** | >= 20 | 50 | 5 | Apenas Tarde |
| **P5** | >= 0 | 30 | 3 | Apenas Tarde |

## Periodos do Dia

| Periodo | Horario Inicio | Horario Fim |
|---------|----------------|-------------|
| Manha | 08:00 | 12:00 |
| Tarde | 12:00 | 18:00 |
| Noite | 18:00 | 21:00 |

## Calculo do Score

O score e calculado usando percentis comparativos entre todos os medicos:

```
Score = (percentilConversao * 0.66) + (percentilTicket * 0.34)
```

### Metricas Usadas

| Metrica | Peso | Fonte |
|---------|------|-------|
| Taxa de Conversao | 66% | API Click (ultimas 8 semanas) |
| Ticket Medio | 34% | API Click (ultimas 8 semanas) |

### Processo de Calculo

1. Buscar metricas de todos os medicos na API Click
2. Ordenar por taxa de conversao e calcular percentil de cada medico
3. Ordenar por ticket medio e calcular percentil de cada medico
4. Aplicar formula do score
5. Determinar faixa baseada no score

### Configuracao dos Pesos

Os pesos e periodo sao configuraveis via tabela `ConfigSistema`:

```json
// Chave: "pesos_score"
{
  "conversao": 66,
  "ticket": 34,
  "semanas": 8
}
```

## Alteracao Manual de Score

Administradores podem alterar o score manualmente:

### Regras
- Requer justificativa obrigatoria (min 10 caracteres)
- E registrado em auditoria
- Score e faixa manual sao preservados em recalculos automaticos

### Fluxo de Alteracao

```
Admin acessa /medicos/[id]
         ↓
Clica em "Alterar Score"
         ↓
Seleciona nova faixa e informa justificativa
         ↓
Sistema cria novo MedicoScore com:
  - alteradoManualmente: true
  - alteradoPorId: ID do admin
  - justificativa: texto informado
         ↓
Registra em Auditoria
```

### Preservacao em Recalculos

Quando o sistema recalcula scores automaticamente (cron):
- Se `alteradoManualmente = true`: preserva score e faixa
- Atualiza apenas metricas brutas (taxaConversao, ticketMedio)

## Impacto da Faixa nas Operacoes

### 1. Abertura de Horarios

```typescript
// Validacao de periodo
const FAIXAS_CONFIG = {
  P1: { periodos: ["manha", "tarde", "noite"], maxSlots: null, minSlots: 10 },
  P2: { periodos: ["manha", "tarde", "noite"], maxSlots: 120, minSlots: 10 },
  P3: { periodos: ["tarde", "noite"], maxSlots: 80, minSlots: 8 },
  P4: { periodos: ["tarde"], maxSlots: 50, minSlots: 5 },
  P5: { periodos: ["tarde"], maxSlots: 30, minSlots: 3 },
};
```

**Exemplo**: Medico P4 tentando abrir horario as 09:00 (manha):
- Sistema verifica: periodo "manha" nao esta em ["tarde"]
- Retorna erro: "Periodo manha nao permitido para sua faixa"

### 2. Fechamento de Horarios

Ao fechar horarios, sistema valida:
- Slots restantes >= minSlots da faixa

**Exemplo**: Medico P3 com 10 slots tenta fechar 4:
- minSlots para P3 = 8
- Slots apos fechamento = 10 - 4 = 6
- 6 < 8, fechamento bloqueado

### 3. Emergenciais

Emergenciais expandem progressivamente por faixa:

```
Criacao → Visivel para P1
   ↓ 30 min
Expansao → Visivel para P1, P2
   ↓ 30 min
Expansao → Visivel para P1, P2, P3
   ↓ ...
```

## Exemplo de Calculo

Medicos no sistema:
- Dr. A: conversao 60%, ticket R$800
- Dr. B: conversao 45%, ticket R$1200
- Dr. C: conversao 75%, ticket R$600

### Passo 1: Percentis de Conversao
Ordenado: B(45%) < A(60%) < C(75%)
- B: percentil 0%
- A: percentil 33%
- C: percentil 67%

### Passo 2: Percentis de Ticket
Ordenado: C(600) < A(800) < B(1200)
- C: percentil 0%
- A: percentil 33%
- B: percentil 67%

### Passo 3: Score Final
```
Dr. A: (33 * 0.66) + (33 * 0.34) = 21.78 + 11.22 = 33.0 → P4
Dr. B: (0 * 0.66) + (67 * 0.34) = 0 + 22.78 = 22.78 → P4
Dr. C: (67 * 0.66) + (0 * 0.34) = 44.22 + 0 = 44.22 → P3
```

## Cores por Faixa (UI)

```css
P1: bg-green-700 text-white   /* Melhor performance */
P2: bg-green-500 text-white   /* Bom */
P3: bg-yellow-500 text-black  /* Medio */
P4: bg-orange-500 text-white  /* Baixo */
P5: bg-red-500 text-white     /* Critico */
```

## Endpoints Relacionados

### Query: `medicos.meuScore`
Retorna score e faixa do medico logado.

### Query: `medicos.buscarScore`
Retorna score de um medico especifico (staff).

### Mutation: `medicos.atualizarScore`
Altera score manualmente (admin).

### Mutation: `medicos.recalcularScores`
Recalcula todos os scores (admin).

### Mutation: `medicos.recalcularScoreMedico`
Recalcula score de um medico especifico (admin).
