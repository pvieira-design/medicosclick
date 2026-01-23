"use client";

import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, type LucideIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export type KPIFormato = "numero" | "moeda" | "porcentagem";

export interface KPICardProps {
  titulo: string;
  valor: number;
  formato: KPIFormato;
  variacao?: number;
  meta?: number;
  icone: LucideIcon;
  cor: "brand" | "green" | "emerald" | "blue" | "red" | "purple" | "orange" | "yellow";
  isLoading?: boolean;
}

const COR_CLASSES: Record<KPICardProps["cor"], { bg: string; text: string }> = {
  brand: { bg: "bg-brand-100 dark:bg-brand-900/30", text: "text-brand-600" },
  green: { bg: "bg-green-100 dark:bg-green-900/30", text: "text-green-600" },
  emerald: { bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-600" },
  blue: { bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-600" },
  red: { bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-600" },
  purple: { bg: "bg-purple-100 dark:bg-purple-900/30", text: "text-purple-600" },
  orange: { bg: "bg-orange-100 dark:bg-orange-900/30", text: "text-orange-600" },
  yellow: { bg: "bg-yellow-100 dark:bg-yellow-900/30", text: "text-yellow-600" },
};

function formatarValor(valor: number, formato: KPIFormato): string {
  switch (formato) {
    case "moeda":
      return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
      }).format(valor);
    case "porcentagem":
      return `${valor.toFixed(1)}%`;
    default:
      return valor.toLocaleString("pt-BR");
  }
}

export function KPICard({
  titulo,
  valor,
  formato,
  variacao,
  meta,
  icone: Icon,
  cor,
  isLoading,
}: KPICardProps) {
  const variacaoPositiva = variacao !== undefined && variacao > 0;
  const atingiuMeta = meta !== undefined && valor >= meta;
  const corClasses = COR_CLASSES[cor];

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-32" />
            </div>
            <Skeleton className="h-12 w-12 rounded-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="transition-all hover:shadow-md">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{titulo}</p>
            <p className="text-2xl font-bold mt-1">{formatarValor(valor, formato)}</p>
          </div>
          <div className={cn("p-3 rounded-full", corClasses.bg)}>
            <Icon className={cn("h-6 w-6", corClasses.text)} />
          </div>
        </div>

        {variacao !== undefined && (
          <div className="flex items-center mt-3">
            {variacaoPositiva ? (
              <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
            )}
            <span className={cn("text-sm font-medium", variacaoPositiva ? "text-green-600" : "text-red-600")}>
              {variacaoPositiva ? "+" : ""}
              {variacao.toFixed(1)}%
            </span>
            <span className="text-sm text-muted-foreground ml-1">vs periodo anterior</span>
          </div>
        )}

        {meta !== undefined && (
          <div className="mt-3">
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>Meta: {formatarValor(meta, formato)}</span>
              <span className={atingiuMeta ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                {atingiuMeta ? "Atingida" : "Nao atingida"}
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
              <div
                className={cn("h-1.5 rounded-full transition-all", atingiuMeta ? "bg-green-500" : "bg-red-500")}
                style={{ width: `${Math.min((valor / meta) * 100, 100)}%` }}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
