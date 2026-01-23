"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { trpc, trpcClient, queryClient } from "@/utils/trpc";
import { toast } from "sonner";
import { Save, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/config/ConfirmDialog";
import { cn } from "@/lib/utils";

interface HorarioDia {
  inicio: string;
  fim: string;
  ativo: boolean;
}

interface HorariosFuncionamento {
  dom: HorarioDia;
  seg: HorarioDia;
  ter: HorarioDia;
  qua: HorarioDia;
  qui: HorarioDia;
  sex: HorarioDia;
  sab: HorarioDia;
}

type DiaKey = keyof HorariosFuncionamento;

const DIAS: { key: DiaKey; label: string }[] = [
  { key: "dom", label: "Domingo" },
  { key: "seg", label: "Segunda-feira" },
  { key: "ter", label: "Terca-feira" },
  { key: "qua", label: "Quarta-feira" },
  { key: "qui", label: "Quinta-feira" },
  { key: "sex", label: "Sexta-feira" },
  { key: "sab", label: "Sabado" },
];

const DEFAULT_HORARIOS: HorariosFuncionamento = {
  dom: { inicio: "08:00", fim: "17:00", ativo: true },
  seg: { inicio: "08:00", fim: "21:00", ativo: true },
  ter: { inicio: "08:00", fim: "21:00", ativo: true },
  qua: { inicio: "08:00", fim: "21:00", ativo: true },
  qui: { inicio: "08:00", fim: "21:00", ativo: true },
  sex: { inicio: "08:00", fim: "21:00", ativo: true },
  sab: { inicio: "08:00", fim: "17:00", ativo: true },
};

export function HorariosTab() {
  const [formData, setFormData] = useState<HorariosFuncionamento>(DEFAULT_HORARIOS);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { data: configData, isLoading } = useQuery(trpc.config.getAll.queryOptions());

  const updateMutation = useMutation({
    mutationFn: (input: HorariosFuncionamento) =>
      trpcClient.config.updateHorariosFuncionamento.mutate(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["config"] });
      toast.success("Horarios atualizados com sucesso!");
      setConfirmOpen(false);
    },
    onError: (error) => {
      toast.error(`Erro ao salvar: ${error.message}`);
    },
  });

  useEffect(() => {
    if (configData?.horarios_funcionamento) {
      setFormData(configData.horarios_funcionamento as HorariosFuncionamento);
    }
  }, [configData]);

  const updateDia = (dia: DiaKey, field: keyof HorarioDia, value: string | boolean) => {
    setFormData((prev) => ({
      ...prev,
      [dia]: {
        ...prev[dia],
        [field]: value,
      },
    }));
  };

  const handleSubmit = () => {
    for (const { key } of DIAS) {
      const dia = formData[key];
      if (dia.ativo && dia.inicio >= dia.fim) {
        toast.error(`${DIAS.find((d) => d.key === key)?.label}: Horario de inicio deve ser menor que o fim`);
        return;
      }
    }
    setConfirmOpen(true);
  };

  if (isLoading) {
    return <HorariosTabSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">
          Configure os horarios de atendimento para cada dia da semana
        </p>
        <Button onClick={handleSubmit} disabled={updateMutation.isPending}>
          <Save className="h-4 w-4 mr-2" />
          Salvar Alteracoes
        </Button>
      </div>

      <Card className="border-border/50 shadow-sm overflow-hidden">
        <CardHeader className="bg-muted/5 border-b border-border/40 pb-4">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Clock className="h-5 w-5 text-primary" />
            </div>
            Agenda Semanal
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">Defina os intervalos de atendimento padrao para cada dia da semana.</p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border/40">
            {DIAS.map(({ key, label }) => {
              const dia = formData[key];
              const isWeekend = key === "dom" || key === "sab";
              return (
                <div
                  key={key}
                  className={cn(
                    "group flex items-center gap-4 p-5 transition-all duration-200 hover:bg-muted/5",
                    !dia.ativo && "bg-muted/20",
                    isWeekend && "bg-muted/10"
                  )}
                >
                  <div className="w-40 flex flex-col">
                    <span className={cn("font-medium text-base", !dia.ativo && "text-muted-foreground")}>{label}</span>
                    {isWeekend && <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/70 mt-0.5">Fim de semana</span>}
                  </div>

                  <div className="flex items-center gap-3 w-32">
                    <Switch
                      checked={dia.ativo}
                      onCheckedChange={(checked) => updateDia(key, "ativo", checked)}
                      className="data-[state=checked]:bg-primary"
                    />
                    <span className={cn("text-sm font-medium", dia.ativo ? "text-primary" : "text-muted-foreground")}>
                      {dia.ativo ? "Aberto" : "Fechado"}
                    </span>
                  </div>

                  <div className={cn("flex items-center gap-3 flex-1 transition-opacity duration-200", !dia.ativo && "opacity-30 pointer-events-none blur-[1px]")}>
                    <div className="relative">
                      <Input
                        type="time"
                        value={dia.inicio}
                        onChange={(e) => updateDia(key, "inicio", e.target.value)}
                        disabled={!dia.ativo}
                        className="w-32 bg-background border-input/80 focus:ring-primary/20 h-9"
                      />
                    </div>
                    <span className="text-muted-foreground font-medium text-sm">ate</span>
                    <div className="relative">
                      <Input
                        type="time"
                        value={dia.fim}
                        onChange={(e) => updateDia(key, "fim", e.target.value)}
                        disabled={!dia.ativo}
                        className="w-32 bg-background border-input/80 focus:ring-primary/20 h-9"
                      />
                    </div>
                  </div>

                  {dia.ativo && (
                    <div className="text-xs font-medium text-muted-foreground bg-muted/30 px-3 py-1.5 rounded-full whitespace-nowrap hidden sm:block">
                      {calculateHours(dia.inicio, dia.fim)}h de jornada
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Confirmar Alteracoes"
        description="Tem certeza que deseja salvar os novos horarios de funcionamento? Isso afetara a disponibilidade de agendamentos."
        onConfirm={() => updateMutation.mutate(formData)}
        isLoading={updateMutation.isPending}
      />
    </div>
  );
}

function calculateHours(inicio: string, fim: string): string {
  const [hInicio, mInicio] = inicio.split(":").map(Number);
  const [hFim, mFim] = fim.split(":").map(Number);
  const totalMinutes = (hFim * 60 + mFim) - (hInicio * 60 + mInicio);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes > 0 ? `${hours}:${String(minutes).padStart(2, "0")}` : String(hours);
}

function HorariosTabSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-96" />
        <Skeleton className="h-10 w-40" />
      </div>
      <Skeleton className="h-[500px]" />
    </div>
  );
}
