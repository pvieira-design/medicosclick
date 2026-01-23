"use client";

import { useState, useMemo, Fragment } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { trpc, trpcClient } from "@/utils/trpc";
import { toast } from "sonner";
import { Loader2, Lock, X, Info, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useDiasBloqueados } from "@/hooks/useDiasBloqueados";

type DiaSemana = "dom" | "seg" | "ter" | "qua" | "qui" | "sex" | "sab";

interface Slot {
  diaSemana: DiaSemana;
  horario: string;
}

const DIAS_ORDEM: DiaSemana[] = ["dom", "seg", "ter", "qua", "qui", "sex", "sab"];
const DIAS_LABEL = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function getSlotId(day: string, time: string) {
  return `${day}-${time}`;
}

export default function FecharHorariosPage() {
  const [selectedSlots, setSelectedSlots] = useState<Set<string>>(new Set());
  
  const { isDiaBloqueado, diasBloqueadosArray } = useDiasBloqueados(3);

  const { data: gradeData, isLoading: isLoadingGrade, refetch } = useQuery(trpc.medico.getGradeHorarios.queryOptions());

  const fecharHorarios = useMutation({
    mutationFn: (input: { slots: Slot[] }) => trpcClient.solicitacoes.fecharHorarios.mutate(input),
    onSuccess: (data: { fechados: number }) => {
      toast.success("Horários fechados com sucesso!", {
        description: `${data.fechados} horários foram fechados.`,
      });
      setSelectedSlots(new Set());
      refetch();
    },
    onError: (error: { message: string }) => {
      toast.error("Erro ao fechar horários", {
        description: error.message,
      });
    },
  });

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

  const horariosAbertosMap = useMemo(() => {
    if (!gradeData?.horariosAbertos) return new Map<string, boolean>();
    const map = new Map<string, boolean>();
    for (const h of gradeData.horariosAbertos) {
      map.set(getSlotId(h.diaSemana, h.horario), true);
    }
    return map;
  }, [gradeData]);

  const slotsComConsultaMap = useMemo(() => {
    return gradeData?.slotsComConsulta ?? {};
  }, [gradeData]);

  const handleSlotClick = (day: DiaSemana, time: string) => {
    const id = getSlotId(day, time);
    const isAberto = horariosAbertosMap.get(id);
    const isBloqueado = isDiaBloqueado(day);
    const temConsulta = slotsComConsultaMap[id];
    
    if (!isAberto) return;
    if (isBloqueado) {
      toast.error("Dia bloqueado", {
        description: "Não é possível alterar horários dos próximos 3 dias.",
      });
      return;
    }
    if (temConsulta) {
      toast.error("Horário com consulta", {
        description: "Não é possível fechar horários com consultas agendadas.",
      });
      return;
    }

    const newSelected = new Set(selectedSlots);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedSlots(newSelected);
  };

  const handleFechar = () => {
    if (selectedSlots.size === 0) return;

    const slots = Array.from(selectedSlots).map(id => {
      const [diaSemana, horario] = id.split("-") as [DiaSemana, string];
      return { diaSemana, horario };
    });

    fecharHorarios.mutate({ slots });
  };

  if (isLoadingGrade) {
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

  const totalAbertos = gradeData?.horariosAbertos?.length ?? 0;
  const totalSelecionados = selectedSlots.size;

  return (
    <div className="flex flex-col h-[calc(100vh-theme(spacing.16))] bg-background">
      <div className="flex-none px-4 py-3 border-b bg-card/50 backdrop-blur-sm sticky top-0 z-20">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-bold tracking-tight text-red-600">Fechar Horários</h1>
            <div className="flex items-center gap-3 text-sm">
              <div className="flex items-center gap-1.5 px-2 py-1 bg-muted/50 rounded-md">
                <span className="text-muted-foreground text-xs">Abertos</span>
                <span className="font-bold text-xs text-primary">{totalAbertos}</span>
              </div>
              {totalSelecionados > 0 && (
                <div className="flex items-center gap-1.5 px-2 py-1 bg-red-400/20 rounded-md">
                  <span className="text-red-700 dark:text-red-400 text-xs font-medium">
                    {totalSelecionados} para fechar
                  </span>
                </div>
              )}
            </div>
          </div>
          
          <Button 
            size="sm" 
            variant="destructive"
            onClick={handleFechar} 
            disabled={totalSelecionados === 0 || fecharHorarios.isPending}
          >
            {fecharHorarios.isPending ? (
              <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
            ) : (
              <X className="mr-1.5 h-3 w-3" />
            )}
            Fechar
          </Button>
        </div>
        
        {diasBloqueadosArray.length > 0 && (
          <div className="flex gap-2 mt-2 flex-wrap">
            <div className="flex items-center gap-1.5 text-muted-foreground text-xs bg-muted/50 px-2 py-1 rounded">
              <Info className="h-3 w-3" />
              <span>Bloqueados: {diasBloqueadosArray.map(d => DIAS_LABEL[DIAS_ORDEM.indexOf(d)]?.slice(0,3)).join(", ")}</span>
            </div>
          </div>
        )}
      </div>

      <ScrollArea className="flex-1 p-6 md:p-8">
        <div className="min-w-[800px] pb-20">
          <div className="grid grid-cols-[auto_repeat(7,1fr)] gap-1">
            <div className="sticky top-0 z-10 bg-background/95 backdrop-blur py-2"></div>
            {DIAS_ORDEM.map((day, index) => {
              const isBloqueado = isDiaBloqueado(day);
              return (
                <div 
                  key={day} 
                  className={cn(
                    "sticky top-0 z-10 bg-background/95 backdrop-blur py-1 text-center border-b",
                    isBloqueado ? "border-red-200 dark:border-red-900" : "border-primary/5"
                  )}
                >
                  <span className={cn(
                    "text-xs font-semibold",
                    isBloqueado ? "text-muted-foreground" : "text-foreground"
                  )}>
                    {DIAS_LABEL[index]}
                    {isBloqueado && <Lock className="inline h-2.5 w-2.5 text-red-400 ml-1" />}
                  </span>
                </div>
              );
            })}

            {timeSlots.map((time) => (
              <Fragment key={time}>
                <div className="sticky left-0 bg-background z-10 pr-2 text-right flex items-center justify-end">
                  <span className="text-[10px] text-muted-foreground font-mono">{time}</span>
                </div>
                {DIAS_ORDEM.map((day) => {
                  const id = getSlotId(day, time);
                  const isAberto = horariosAbertosMap.get(id);
                  const isSelected = selectedSlots.has(id);
                  const isBloqueado = isDiaBloqueado(day);
                  const temConsulta = slotsComConsultaMap[id];
                  
                  if (!isAberto) {
                    return (
                      <div
                        key={id}
                        className="relative h-7 rounded border border-transparent bg-muted/20 opacity-30"
                      />
                    );
                  }

                  const canSelect = !isBloqueado && !temConsulta;
                  
                  let bgClass = "bg-green-500/20 border-green-500/30 hover:bg-red-300/20 hover:border-red-300/40";
                  let cursorClass = canSelect ? "cursor-pointer" : "cursor-not-allowed";
                  
                  if (temConsulta) {
                    bgClass = "bg-emerald-600/30 border-emerald-600/50";
                  } else if (isBloqueado) {
                    bgClass = "bg-gray-200 dark:bg-gray-800 border-gray-300 dark:border-gray-700";
                  } else if (isSelected) {
                    bgClass = "bg-red-400/30 border-red-400/50 ring-1 ring-red-400/30 hover:bg-red-500/40";
                  }

                  return (
                    <div
                      key={id}
                      onClick={() => handleSlotClick(day, time)}
                      className={cn(
                        "relative h-7 rounded border transition-all duration-150 flex items-center justify-center gap-0.5",
                        bgClass,
                        cursorClass
                      )}
                    >
                      {temConsulta && <User className="w-2.5 h-2.5 text-emerald-700 dark:text-emerald-400" />}
                      {isBloqueado && <Lock className="w-2.5 h-2.5 text-gray-400" />}
                      {!temConsulta && !isBloqueado && !isSelected && (
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                      )}
                      {isSelected && !temConsulta && !isBloqueado && (
                        <X className="w-3 h-3 text-red-600 dark:text-red-400" />
                      )}
                    </div>
                  );
                })}
              </Fragment>
            ))}
          </div>
        </div>
      </ScrollArea>
      
      <div className="flex-none px-4 py-2 border-t bg-muted/20 text-[10px] text-muted-foreground flex justify-center gap-4">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span>Aberto</span>
        </div>
        <div className="flex items-center gap-1">
          <User className="w-2.5 h-2.5 text-emerald-600" />
          <span>Com consulta</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full border border-red-400 bg-red-400/30" />
          <span>Selecionado</span>
        </div>
        <div className="flex items-center gap-1">
          <Lock className="w-2.5 h-2.5 text-gray-400" />
          <span>Bloqueado</span>
        </div>
      </div>
    </div>
  );
}
