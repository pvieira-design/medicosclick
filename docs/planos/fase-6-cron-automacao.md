# Fase 6: Cron Jobs e Automacao

> Duracao estimada: 2-3 dias
> Prioridade: Media
> Dependencias: Fase 1 (Queries), Fase 3 (Sync API)

## Objetivo

Implementar processos automatizados que rodam periodicamente:
- Recalculo de scores dos medicos
- Processamento da fila de retry (sync Click)
- Expansao automatica de faixas em emergenciais
- Limpeza de dados antigos

---

## Arquitetura de Cron Jobs

### Opcao 1: Vercel Cron (Recomendada para Next.js)

```
apps/web/src/app/api/cron/
├── recalcular-scores/
│   └── route.ts
├── processar-retry/
│   └── route.ts
├── expandir-emergenciais/
│   └── route.ts
└── limpeza/
    └── route.ts
```

### Configuracao em vercel.json

```json
{
  "crons": [
    {
      "path": "/api/cron/recalcular-scores",
      "schedule": "0 6 * * *"
    },
    {
      "path": "/api/cron/processar-retry",
      "schedule": "*/5 * * * *"
    },
    {
      "path": "/api/cron/expandir-emergenciais",
      "schedule": "*/30 * * * *"
    },
    {
      "path": "/api/cron/limpeza",
      "schedule": "0 3 * * 0"
    }
  ]
}
```

---

## Jobs Detalhados

### 1. Recalculo de Scores

**Frequencia**: Diario as 06:00
**Duracao estimada**: 2-5 minutos

```typescript
// apps/web/src/app/api/cron/recalcular-scores/route.ts

import { NextResponse } from "next/server";
import prisma from "@clickmedicos/db";
import { recalcularTodosScores } from "@/services/score.service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  // Verificar autorizacao (Vercel envia header especial)
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    console.log("[CRON] Iniciando recalculo de scores...");
    const inicio = Date.now();
    
    const resultado = await recalcularTodosScores();
    
    const duracao = Date.now() - inicio;
    
    // Registrar em auditoria
    await prisma.auditoria.create({
      data: {
        usuarioId: null,
        usuarioNome: "SISTEMA",
        acao: "CRON_RECALCULAR_SCORES",
        entidade: "cron",
        dadosDepois: {
          atualizados: resultado.atualizados,
          erros: resultado.erros.length,
          duracaoMs: duracao,
        },
      },
    });

    console.log(`[CRON] Scores recalculados: ${resultado.atualizados} em ${duracao}ms`);
    
    return NextResponse.json({
      success: true,
      atualizados: resultado.atualizados,
      erros: resultado.erros.length,
      duracaoMs: duracao,
    });
  } catch (error) {
    console.error("[CRON] Erro ao recalcular scores:", error);
    
    await prisma.auditoria.create({
      data: {
        usuarioId: null,
        usuarioNome: "SISTEMA",
        acao: "CRON_RECALCULAR_SCORES_ERRO",
        entidade: "cron",
        dadosDepois: {
          erro: error instanceof Error ? error.message : "Erro desconhecido",
        },
      },
    });
    
    return NextResponse.json(
      { error: "Erro interno" },
      { status: 500 }
    );
  }
}
```

---

### 2. Processar Fila de Retry

**Frequencia**: A cada 5 minutos
**Duracao estimada**: 30 segundos - 2 minutos

```typescript
// apps/web/src/app/api/cron/processar-retry/route.ts

import { NextResponse } from "next/server";
import prisma from "@clickmedicos/db";
import { processarFilaRetry } from "@/services/sync.service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Verificar se ha itens na fila
    const pendentes = await prisma.syncQueue.count({
      where: {
        processadoEm: null,
        tentativas: { lt: 5 },
        proximoRetry: { lte: new Date() },
      },
    });
    
    if (pendentes === 0) {
      return NextResponse.json({
        success: true,
        message: "Fila vazia",
        processados: 0,
      });
    }

    console.log(`[CRON] Processando ${pendentes} itens na fila de retry...`);
    
    const resultado = await processarFilaRetry();
    
    // Registrar em auditoria apenas se processou algo
    if (resultado.processados > 0) {
      await prisma.auditoria.create({
        data: {
          usuarioId: null,
          usuarioNome: "SISTEMA",
          acao: "CRON_PROCESSAR_RETRY",
          entidade: "cron",
          dadosDepois: resultado,
        },
      });
    }

    return NextResponse.json({
      success: true,
      ...resultado,
    });
  } catch (error) {
    console.error("[CRON] Erro ao processar fila:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
```

---

### 3. Expansao de Emergenciais

**Frequencia**: A cada 30 minutos
**Duracao estimada**: < 30 segundos

```typescript
// apps/web/src/app/api/cron/expandir-emergenciais/route.ts

import { NextResponse } from "next/server";
import prisma from "@clickmedicos/db";

export const dynamic = "force-dynamic";

const FAIXA_ORDEM = ["P1", "P2", "P3", "P4", "P5"] as const;
const TEMPO_EXPANSAO_MS = 30 * 60 * 1000; // 30 minutos

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Buscar emergenciais abertas que precisam expandir
    const agora = new Date();
    const emergenciaisParaExpandir = await prisma.emergencial.findMany({
      where: {
        status: "aberta",
        faixaAtual: { not: "P5" }, // Ja esta na ultima faixa
        ultimaExpansao: { lt: new Date(agora.getTime() - TEMPO_EXPANSAO_MS) },
      },
    });

    let expandidas = 0;

    for (const emergencial of emergenciaisParaExpandir) {
      const faixaAtualIndex = FAIXA_ORDEM.indexOf(emergencial.faixaAtual);
      if (faixaAtualIndex < FAIXA_ORDEM.length - 1) {
        const novaFaixa = FAIXA_ORDEM[faixaAtualIndex + 1];
        
        await prisma.emergencial.update({
          where: { id: emergencial.id },
          data: {
            faixaAtual: novaFaixa,
            ultimaExpansao: agora,
          },
        });
        
        expandidas++;
        
        console.log(
          `[CRON] Emergencial ${emergencial.id} expandida: ${emergencial.faixaAtual} -> ${novaFaixa}`
        );
      }
    }

    if (expandidas > 0) {
      await prisma.auditoria.create({
        data: {
          usuarioId: null,
          usuarioNome: "SISTEMA",
          acao: "CRON_EXPANDIR_EMERGENCIAIS",
          entidade: "emergencial",
          dadosDepois: { expandidas },
        },
      });
    }

    return NextResponse.json({
      success: true,
      verificadas: emergenciaisParaExpandir.length,
      expandidas,
    });
  } catch (error) {
    console.error("[CRON] Erro ao expandir emergenciais:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
```

---

### 4. Limpeza de Dados Antigos

**Frequencia**: Semanal (domingo 03:00)
**Duracao estimada**: 1-5 minutos

```typescript
// apps/web/src/app/api/cron/limpeza/route.ts

import { NextResponse } from "next/server";
import prisma from "@clickmedicos/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const agora = new Date();
    
    // 1. Limpar itens processados da fila de retry (> 30 dias)
    const limiteRetry = new Date(agora);
    limiteRetry.setDate(limiteRetry.getDate() - 30);
    
    const retryDeletados = await prisma.syncQueue.deleteMany({
      where: {
        processadoEm: { not: null },
        processadoEm: { lt: limiteRetry },
      },
    });

    // 2. Limpar auditorias antigas (> 90 dias)
    const limiteAuditoria = new Date(agora);
    limiteAuditoria.setDate(limiteAuditoria.getDate() - 90);
    
    const auditoriasDeletadas = await prisma.auditoria.deleteMany({
      where: {
        createdAt: { lt: limiteAuditoria },
      },
    });

    // 3. Limpar emergenciais expiradas (> 60 dias)
    const limiteEmergenciais = new Date(agora);
    limiteEmergenciais.setDate(limiteEmergenciais.getDate() - 60);
    
    const emergenciaisDeletadas = await prisma.emergencial.deleteMany({
      where: {
        status: "expirada",
        createdAt: { lt: limiteEmergenciais },
      },
    });

    const resultado = {
      retryDeletados: retryDeletados.count,
      auditoriasDeletadas: auditoriasDeletadas.count,
      emergenciaisDeletadas: emergenciaisDeletadas.count,
    };

    console.log("[CRON] Limpeza concluida:", resultado);

    await prisma.auditoria.create({
      data: {
        usuarioId: null,
        usuarioNome: "SISTEMA",
        acao: "CRON_LIMPEZA",
        entidade: "cron",
        dadosDepois: resultado,
      },
    });

    return NextResponse.json({
      success: true,
      ...resultado,
    });
  } catch (error) {
    console.error("[CRON] Erro na limpeza:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
```

---

## Monitoramento de Cron Jobs

### Tela Admin para Visualizar Execucoes

```typescript
// apps/web/src/app/(dashboard)/dashboard/admin/cron/page.tsx

"use client";

import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function CronPage() {
  const { data: ultimasExecucoes } = trpc.auditoria.listar.useQuery({
    acao: "CRON_%",
    limite: 20,
  });
  
  const { data: filaRetry } = trpc.sync.filaRetry.useQuery();
  
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Cron Jobs</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Fila de Retry</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {filaRetry?.estatisticas.pendentes ?? 0}
            </div>
            <p className="text-muted-foreground">pendentes</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Ultimo Recalculo</CardTitle>
          </CardHeader>
          <CardContent>
            {ultimasExecucoes?.find(e => e.acao === "CRON_RECALCULAR_SCORES") ? (
              <>
                <div className="text-lg">
                  {formatDistanceToNow(
                    ultimasExecucoes.find(e => e.acao === "CRON_RECALCULAR_SCORES")!.createdAt,
                    { addSuffix: true, locale: ptBR }
                  )}
                </div>
              </>
            ) : (
              <p className="text-muted-foreground">Nunca executado</p>
            )}
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Ultimas Execucoes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {ultimasExecucoes?.map((exec) => (
              <div
                key={exec.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div>
                  <span className="font-medium">{exec.acao}</span>
                  <span className="text-muted-foreground ml-2">
                    {formatDistanceToNow(exec.createdAt, { addSuffix: true, locale: ptBR })}
                  </span>
                </div>
                <code className="text-xs bg-muted p-1 rounded">
                  {JSON.stringify(exec.dadosDepois)}
                </code>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## Seguranca

### Autenticacao de Cron Jobs

```typescript
// Usar CRON_SECRET para autenticar chamadas

// .env
CRON_SECRET=sua-chave-secreta-muito-forte

// No handler
const authHeader = request.headers.get("authorization");
if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
```

### Rate Limiting

Implementar protecao contra execucoes duplicadas:

```typescript
// Usar lock no banco para evitar execucoes simultaneas
const lock = await prisma.$executeRaw`
  SELECT pg_try_advisory_lock(12345)
`;

if (!lock) {
  return NextResponse.json({ message: "Job ja em execucao" });
}

try {
  // ... executar job
} finally {
  await prisma.$executeRaw`SELECT pg_advisory_unlock(12345)`;
}
```

---

## Alertas e Notificacoes

### Webhook para Falhas Criticas

```typescript
async function notificarFalhaCritica(job: string, erro: Error) {
  if (process.env.SLACK_WEBHOOK_URL) {
    await fetch(process.env.SLACK_WEBHOOK_URL, {
      method: "POST",
      body: JSON.stringify({
        text: `[ALERTA] Falha no cron job: ${job}`,
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*Erro:* ${erro.message}`,
            },
          },
        ],
      }),
    });
  }
}
```

---

## Criterios de Aceite

- [ ] Job de recalculo de scores funcionando
- [ ] Job de fila de retry funcionando
- [ ] Job de expansao de emergenciais funcionando
- [ ] Job de limpeza funcionando
- [ ] Autenticacao dos jobs implementada
- [ ] Auditoria de execucoes registrada
- [ ] Tela admin para monitoramento
- [ ] Alertas de falhas configurados

---

## Checklist de Conclusao

- [ ] Routes de cron criadas
- [ ] vercel.json configurado
- [ ] Autenticacao implementada
- [ ] Auditoria funcionando
- [ ] Tela de monitoramento criada
- [ ] Testes manuais realizados
- [ ] Documentacao atualizada
- [ ] Code review realizado
