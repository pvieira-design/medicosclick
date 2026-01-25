"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Loader2, Calendar, User, ArrowRight, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Step1Props {
  onNext: (consultingId: number) => void;
  selectedConsultingId: number | null;
}

export function Step1SelecaoConsulta({ onNext, selectedConsultingId }: Step1Props) {
  const [selectedId, setSelectedId] = useState<string | null>(
    selectedConsultingId ? selectedConsultingId.toString() : null
  );

  const { data: consultas, isLoading } = useQuery(
    trpc.receita.listarConsultasRecentes.queryOptions({
      limit: 20,
    })
  );

  const validConsultas = consultas?.filter((c: any) => c.user_id !== null && c.completed === true) || [];

  const handleNext = () => {
    if (selectedId) {
      onNext(parseInt(selectedId));
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "Data desconhecida";
    try {
      return new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(dateString));
    } catch (e) {
      return dateString;
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
        <p className="text-sm text-muted-foreground">Carregando consultas recentes...</p>
      </div>
    );
  }

  if (validConsultas.length === 0) {
    return (
      <div className="text-center py-12 space-y-4">
        <div className="bg-muted/30 p-4 rounded-full w-fit mx-auto">
          <Calendar className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium">Nenhuma consulta recente encontrada</h3>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
          Não encontramos consultas finalizadas recentemente para gerar receitas.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-gray-900">Selecione a Consulta</h2>
        <p className="text-sm text-gray-500">
          Escolha a consulta para a qual deseja gerar a receita médica.
        </p>
      </div>

      <Card className="p-0 border-gray-200 overflow-hidden">
        <div className="divide-y divide-gray-100">
          {validConsultas.map((consulta: any) => {
            const isSelected = selectedId === consulta.id.toString();
            return (
              <div
                key={consulta.id}
                className={cn(
                  "flex items-center space-x-4 p-4 hover:bg-gray-50 transition-colors cursor-pointer",
                  isSelected && "bg-brand-50/50"
                )}
                onClick={() => setSelectedId(consulta.id.toString())}
              >
                <div className={cn(
                  "h-5 w-5 rounded-full border flex items-center justify-center transition-colors",
                  isSelected ? "border-brand-600 bg-brand-600" : "border-gray-300"
                )}>
                  {isSelected && <CheckCircle2 className="h-3.5 w-3.5 text-white" />}
                </div>
                
                <div className="flex-1">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-4">
                    <div className="flex items-center gap-2 font-medium text-gray-900">
                      <User className="h-4 w-4 text-gray-400" />
                      {consulta.patient_name || "Paciente sem nome"}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Calendar className="h-3.5 w-3.5" />
                      {formatDate(consulta.start)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <div className="flex justify-end pt-4">
        <Button
          onClick={handleNext}
          disabled={!selectedId}
          className="bg-brand-600 hover:bg-brand-700 text-white min-w-[120px]"
        >
          Próximo
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
