"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { trpc, trpcClient } from "@/utils/trpc";
import { toast } from "sonner";
import { Loader2, Clock, AlertCircle, CheckCircle2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { useDiasBloqueados } from "@/hooks/useDiasBloqueados";

type DiaSemana = "dom" | "seg" | "ter" | "qua" | "qui" | "sex" | "sab";

interface HorarioFuncionamento {
  inicio: string;
  fim: string;
  ativo: boolean;
}

interface FaixaConfig {
  periodos?: string[];
  slotsMaximo?: number;
}

interface PeriodoConfig {
  inicio: string;
  fim: string;
}

const DAYS: DiaSemana[] = ["dom", "seg", "ter", "qua", "qui", "sex", "sab"];
const DAYS_LABEL = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

function getSlotId(day: string, time: string) {
  return `${day}-${time}`;
}

export default function DoctorRequestSchedulePage() {
  const router = useRouter();
  const [selectedSlots, setSelectedSlots] = useState<Set<string>>(new Set());
  const [lastClickedSlot, setLastClickedSlot] = useState<{ day: DiaSemana; time: string } | null>(null);
  const { isDiaBloqueado, diasBloqueadosArray } = useDiasBloqueados(3);

  const gradeQuery = useQuery(trpc.medico.getGradeHorarios.queryOptions());
  const configQuery = useQuery(trpc.medico.getConfigFaixa.queryOptions());
  
  const gradeData = gradeQuery.data;
  const configData = configQuery.data;
  const isLoadingGrade = gradeQuery.isLoading;
  const isLoadingConfig = configQuery.isLoading;

  const createSolicitacao = useMutation({
    mutationFn: (input: { slots: { diaSemana: DiaSemana; horario: string }[] }) =>
      trpcClient.solicitacoes.criar.mutate(input),
    onSuccess: (data) => {
      toast.success("Solicitação enviada com sucesso!", {
        description: `${data.slotsEnviados} novos horários foram solicitados.`,
      });
      router.push("/dashboard/solicitacoes");
    },
    onError: (error: { message: string }) => {
      toast.error("Erro ao enviar solicitação", {
        description: error.message,
      });
    },
  });

  const isLoading = isLoadingGrade || isLoadingConfig;

  const timeSlots = useMemo(() => {
    const startHour = 7;
    const endHour = 22;
    const slots: string[] = [];
    for (let h = startHour; h < endHour; h++) {
      slots.push(`${h.toString().padStart(2, "0")}:00`);
      slots.push(`${h.toString().padStart(2, "0")}:20`);
      slots.push(`${h.toString().padStart(2, "0")}:40`);
    }
    return slots;
  }, []);

  const horariosFuncionamento = gradeData?.configFuncionamento as Record<string, HorarioFuncionamento> | null;

  const isSlotAllowedByFaixa = (time: string): boolean => {
    const faixaConfig = configData?.configFaixa as FaixaConfig | null;
    const periodos = configData?.periodos as Record<string, PeriodoConfig> | null;
    
    if (!faixaConfig || !periodos) return true;
    
    const [h, m] = time.split(":").map(Number);
    const minutes = (h ?? 0) * 60 + (m ?? 0);

    const allowedPeriodNames = faixaConfig.periodos ?? [];
    
    return allowedPeriodNames.some((periodName: string) => {
      const periodConfig = periodos[periodName];
      if (!periodConfig) return false;

      const [startH, startM] = periodConfig.inicio.split(":").map(Number);
      const [endH, endM] = periodConfig.fim.split(":").map(Number);
      
      const startMin = (startH ?? 0) * 60 + (startM ?? 0);
      const endMin = (endH ?? 0) * 60 + (endM ?? 0);

      return minutes >= startMin && minutes < endMin;
    });
  };

  const isSlotWithinFuncionamento = (day: DiaSemana, time: string) => {
    if (!horariosFuncionamento) return true;
    
    const dayConfig = horariosFuncionamento[day];
    if (!dayConfig || !dayConfig.ativo) return false;
    
    const [h, m] = time.split(":").map(Number);
    const minutes = (h ?? 0) * 60 + (m ?? 0);
    
    const [startH, startM] = dayConfig.inicio.split(":").map(Number);
    const [endH, endM] = dayConfig.fim.split(":").map(Number);
    
    const startMin = (startH ?? 0) * 60 + (startM ?? 0);
    const endMin = (endH ?? 0) * 60 + (endM ?? 0);
    
    return minutes >= startMin && minutes < endMin;
  };

  const isSlotAllowed = (day: DiaSemana, time: string) => {
    return isSlotWithinFuncionamento(day, time) && isSlotAllowedByFaixa(time);
  };

  const handleSlotClick = (
    day: DiaSemana, 
    time: string, 
    isAllowed: boolean, 
    isOpen: boolean,
    shiftKey: boolean
  ) => {
    if (!isAllowed || isOpen) return;

    const newSelected = new Set(selectedSlots);
    const horariosAbertosMap = (gradeData?.horariosMap ?? {}) as Record<string, boolean>;

    if (shiftKey && lastClickedSlot && lastClickedSlot.day === day) {
      const startIdx = timeSlots.indexOf(lastClickedSlot.time);
      const endIdx = timeSlots.indexOf(time);
      const [fromIdx, toIdx] = startIdx < endIdx ? [startIdx, endIdx] : [endIdx, startIdx];
      
      for (let i = fromIdx; i <= toIdx; i++) {
        const slotTime = timeSlots[i];
        if (slotTime && isSlotAllowed(day, slotTime) && !horariosAbertosMap[getSlotId(day, slotTime)]) {
          newSelected.add(getSlotId(day, slotTime));
        }
      }
    } else {
      const id = getSlotId(day, time);
      if (newSelected.has(id)) {
        newSelected.delete(id);
      } else {
        newSelected.add(id);
      }
    }

    setSelectedSlots(newSelected);
    setLastClickedSlot({ day, time });
  };

  const handleSubmit = () => {
    const slots = Array.from(selectedSlots).map(id => {
      const [diaSemana, horario] = id.split("-");
      return { diaSemana: diaSemana as any, horario };
    });
    createSolicitacao.mutate({ slots });
  };

  if (isLoading) {
    return (
      <div className="p-8 space-y-6">
        <Skeleton className="h-12 w-1/3" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
        <Skeleton className="h-[600px] w-full rounded-xl" />
      </div>
    );
  }

  const { minhaFaixa } = configData || {};
  const configFaixa = configData?.configFaixa as { periodos?: string[]; slotsMaximo?: number } | null;
  const horariosMap = (gradeData?.horariosMap ?? {}) as Record<string, boolean>;

  const totalSelected = selectedSlots.size;
  const maxSlots = configFaixa?.slotsMaximo ?? Infinity;
  const isOverLimit = totalSelected > 0 && (configFaixa?.slotsMaximo ? totalSelected > configFaixa.slotsMaximo : false);
  
  const currentOpenCount = gradeData?.horariosAbertos?.length ?? 0;
  const projectedTotal = currentOpenCount + totalSelected;
  const remainingSlots = maxSlots - currentOpenCount;
  const willExceedLimit = maxSlots !== Infinity && projectedTotal > maxSlots;

  return (
    <div className="flex flex-col h-[calc(100vh-theme(spacing.16))] bg-background">
      <div className="flex-none px-4 py-3 border-b bg-card/50 backdrop-blur-sm sticky top-0 z-20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 sm:gap-4">
            <h1 className="text-lg font-bold tracking-tight">Solicitar Horários</h1>
            <div className="flex items-center gap-2 sm:gap-3 text-sm flex-wrap">
              <div className="flex items-center gap-1.5 px-2 py-1 bg-muted/50 rounded-md">
                <span className="text-muted-foreground text-xs hidden sm:inline">Faixa</span>
                <Badge variant="outline" className="font-bold px-1.5 py-0 text-xs border-primary/30 text-primary">
                  {minhaFaixa}
                </Badge>
              </div>
              <div className="flex items-center gap-1.5 px-2 py-1 bg-muted/50 rounded-md">
                <span className={cn("font-bold text-xs", projectedTotal > maxSlots ? "text-destructive" : "text-foreground")}>
                  {projectedTotal}/{maxSlots === Infinity ? "∞" : maxSlots}
                </span>
              </div>
              {totalSelected > 0 && (
                <div className="flex items-center gap-1.5 px-2 py-1 bg-yellow-400/20 rounded-md">
                  <span className="text-yellow-700 dark:text-yellow-400 text-xs font-medium">
                    {totalSelected} sel.
                  </span>
                </div>
              )}
            </div>
          </div>
          
          <Button 
            size="sm" 
            onClick={handleSubmit} 
            disabled={totalSelected === 0 || willExceedLimit || createSolicitacao.isPending}
            className="w-full sm:w-auto"
          >
            {createSolicitacao.isPending ? (
              <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
            ) : (
              <Clock className="mr-1.5 h-3 w-3" />
            )}
            Solicitar
          </Button>
        </div>
        
        {(willExceedLimit || diasBloqueadosArray.length > 0) && (
          <div className="flex gap-2 mt-2 flex-wrap">
            {willExceedLimit && (
              <div className="flex items-center gap-1.5 text-destructive text-xs bg-destructive/10 px-2 py-1 rounded">
                <AlertCircle className="h-3 w-3" />
                <span>Limite excedido! Remova {projectedTotal - maxSlots} slot(s)</span>
              </div>
            )}
            {diasBloqueadosArray.length > 0 && (
              <div className="flex items-center gap-1.5 text-amber-600 text-xs bg-amber-500/10 px-2 py-1 rounded">
                <Info className="h-3 w-3" />
                <span>{diasBloqueadosArray.map(d => DAYS_LABEL[DAYS.indexOf(d)]?.slice(0,3)).join(", ")} = próx. semana</span>
              </div>
            )}
          </div>
        )}
      </div>

      <ScrollArea className="flex-1 p-4 md:p-6">
        <div className="min-w-[700px] pb-10">
          <div className="grid grid-cols-[50px_repeat(7,1fr)] gap-1">
            <div className="sticky top-0 z-10 bg-background/95 backdrop-blur py-1"></div>
            {DAYS.map((day, index) => {
              const isBloqueado = isDiaBloqueado(day);
              return (
                <div 
                  key={day} 
                  className={cn(
                    "sticky top-0 z-10 bg-background/95 backdrop-blur py-2 text-center border-b",
                    isBloqueado ? "border-amber-300 dark:border-amber-800" : "border-border/50"
                  )}
                >
                  <span className={cn(
                    "text-xs font-semibold",
                    isBloqueado ? "text-amber-600 dark:text-amber-400" : "text-foreground"
                  )}>
                    {DAYS_LABEL[index]?.slice(0, 3)}
                  </span>
                  {isBloqueado && (
                    <Clock className="h-2.5 w-2.5 text-amber-500 mx-auto mt-0.5" />
                  )}
                </div>
              );
            })}

            {timeSlots.map((time) => (
              <>
                <div key={`label-${time}`} className="sticky left-0 bg-background z-10 pr-2 py-0.5 text-right flex items-center justify-end">
                  <span className="text-[10px] font-medium text-muted-foreground font-mono">{time}</span>
                </div>
                {DAYS.map((day) => {
                  const id = getSlotId(day, time);
                  const isOpen = !!horariosMap?.[id];
                  const isSelected = selectedSlots.has(id);
                  const allowed = isSlotAllowed(day, time);
                  
                  let bgClass = "bg-card hover:bg-muted/50 border-border/40";
                  let cursorClass = "cursor-pointer";
                  let content = null;

                  if (isOpen) {
                    bgClass = "bg-blue-500/20 border-blue-500/30";
                    cursorClass = "cursor-default";
                    content = <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />;
                  } else if (!allowed) {
                    bgClass = "bg-muted/20 border-transparent opacity-40";
                    cursorClass = "cursor-not-allowed";
                  } else if (isSelected) {
                    bgClass = "bg-yellow-400/30 border-yellow-400/50 ring-1 ring-yellow-400/40";
                    content = <CheckCircle2 className="w-3 h-3 text-yellow-600 dark:text-yellow-400" />;
                  }

                  return (
                    <div
                      key={id}
                      onClick={(e) => handleSlotClick(day, time, allowed, isOpen, e.shiftKey)}
                      className={cn(
                        "relative h-7 rounded-md border transition-all duration-150 flex items-center justify-center select-none",
                        bgClass,
                        cursorClass
                      )}
                    >
                       {content}
                    </div>
                  );
                })}
              </>
            ))}
          </div>
        </div>
      </ScrollArea>
      
      <div className="flex-none py-2 px-4 border-t bg-muted/20 text-[10px] text-muted-foreground flex justify-center gap-4 flex-wrap">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-blue-500" />
          <span>Aberto</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full border border-yellow-400 bg-yellow-400/30" />
          <span>Selecionado</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-muted/50" />
          <span>Bloqueado</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="w-2 h-2 text-amber-500" />
          <span>Próx. semana</span>
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground/70">
          <span>Shift+Click = selecionar intervalo</span>
        </div>
      </div>
    </div>
  );
}
