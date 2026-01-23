"use client";

import { AlertTriangle, AlertCircle, TrendingUp, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { cn } from "@/lib/utils";

export type AlertaSeveridade = "critico" | "alerta" | "oportunidade";

export interface Alerta {
  id: string;
  tipo: string;
  severidade: AlertaSeveridade;
  medicoId?: string;
  medicoNome?: string;
  valor: number;
  meta?: number;
  mensagem: string;
}

const SEVERIDADE_CONFIG = {
  critico: {
    bg: "bg-red-50 dark:bg-red-950/20",
    border: "border-red-200 dark:border-red-900",
    text: "text-red-700 dark:text-red-400",
    icon: AlertTriangle,
  },
  alerta: {
    bg: "bg-amber-50 dark:bg-amber-950/20",
    border: "border-amber-200 dark:border-amber-900",
    text: "text-amber-700 dark:text-amber-400",
    icon: AlertCircle,
  },
  oportunidade: {
    bg: "bg-green-50 dark:bg-green-950/20",
    border: "border-green-200 dark:border-green-900",
    text: "text-green-700 dark:text-green-400",
    icon: TrendingUp,
  },
};

interface AlertaCardProps {
  alerta: Alerta;
  compact?: boolean;
}

export function AlertaCard({ alerta, compact = false }: AlertaCardProps) {
  const config = SEVERIDADE_CONFIG[alerta.severidade];
  const Icon = config.icon;

  if (compact) {
    return (
      <div className={cn("flex items-center gap-3 p-3 rounded-lg border", config.bg, config.border)}>
        <Icon className={cn("h-4 w-4 shrink-0", config.text)} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{alerta.mensagem}</p>
          {alerta.medicoNome && (
            <p className="text-xs text-muted-foreground truncate">{alerta.medicoNome}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <Card className={cn(config.bg, config.border, "border")}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Icon className={cn("h-5 w-5 mt-0.5 shrink-0", config.text)} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className={cn("font-medium text-sm", config.text)}>{alerta.tipo}</span>
              {alerta.medicoNome && (
                <span className="text-xs text-muted-foreground truncate">{alerta.medicoNome}</span>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">{alerta.mensagem}</p>
            {alerta.medicoId && (
              <Link href={`/dashboard/medicos/${alerta.medicoId}` as any}>
                <Button variant="link" className="p-0 h-auto mt-2 text-xs">
                  Ver detalhes
                  <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </Link>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
