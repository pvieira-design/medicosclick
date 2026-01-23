"use client";

import { AlertaCard, type Alerta } from "./AlertaCard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, AlertCircle, TrendingUp, CheckCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface AlertasData {
  criticos: Alerta[];
  alertas: Alerta[];
  oportunidades: Alerta[];
  totais: {
    criticos: number;
    alertas: number;
    oportunidades: number;
  };
}

interface AlertasListProps {
  data?: AlertasData | null;
  isLoading?: boolean;
  titulo?: string;
  mostrarTodos?: boolean;
  limite?: number;
}

export function AlertasList({
  data,
  isLoading,
  titulo = "Alertas e Oportunidades",
  mostrarTodos = true,
  limite = 5,
}: AlertasListProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-60" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </CardContent>
      </Card>
    );
  }

  const todosAlertas = [
    ...(data?.criticos ?? []),
    ...(data?.alertas ?? []),
    ...(data?.oportunidades ?? []),
  ];

  const alertasExibidos = mostrarTodos ? todosAlertas : todosAlertas.slice(0, limite);
  const temMais = !mostrarTodos && todosAlertas.length > limite;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">{titulo}</CardTitle>
            <CardDescription>
              {todosAlertas.length === 0 ? "Nenhum alerta no momento" : `${todosAlertas.length} itens de atencao`}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {data?.totais.criticos ? (
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="h-3 w-3" />
                {data.totais.criticos}
              </Badge>
            ) : null}
            {data?.totais.alertas ? (
              <Badge variant="secondary" className="gap-1 bg-amber-100 text-amber-700 hover:bg-amber-200">
                <AlertCircle className="h-3 w-3" />
                {data.totais.alertas}
              </Badge>
            ) : null}
            {data?.totais.oportunidades ? (
              <Badge variant="secondary" className="gap-1 bg-green-100 text-green-700 hover:bg-green-200">
                <TrendingUp className="h-3 w-3" />
                {data.totais.oportunidades}
              </Badge>
            ) : null}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {alertasExibidos.length > 0 ? (
          <div className="space-y-3">
            {alertasExibidos.map((alerta, idx) => (
              <AlertaCard key={alerta.id || idx} alerta={alerta} compact />
            ))}
            {temMais && (
              <p className="text-xs text-muted-foreground text-center pt-2">
                +{todosAlertas.length - limite} outros alertas
              </p>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <CheckCircle className="h-12 w-12 text-green-500/50 mb-3" />
            <p className="text-sm">Tudo em ordem!</p>
            <p className="text-xs">Nenhum alerta ou oportunidade no momento.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
