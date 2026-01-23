"use client";

import { useQuery } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";


const DAYS = [
  { id: "dom", label: "Domingo", short: "Dom" },
  { id: "seg", label: "Segunda", short: "Seg" },
  { id: "ter", label: "Terça", short: "Ter" },
  { id: "qua", label: "Quarta", short: "Qua" },
  { id: "qui", label: "Quinta", short: "Qui" },
  { id: "sex", label: "Sexta", short: "Sex" },
  { id: "sab", label: "Sábado", short: "Sab" },
];

function generateTimeSlots() {
  const slots = [];
  const startHour = 7;
  const endHour = 22;
  
  for (let h = startHour; h < endHour; h++) {
    for (let m = 0; m < 60; m += 20) {
      const hour = h.toString().padStart(2, "0");
      const minute = m.toString().padStart(2, "0");
      slots.push(`${hour}:${minute}`);
    }
  }
  return slots;
}

const TIME_SLOTS = generateTimeSlots();

export default function HorariosPage() {
  const { data: grade, isLoading: isLoadingGrade } = useQuery(trpc.medico.getGradeHorarios.queryOptions());
  const { data: configFaixa, isLoading: isLoadingConfig } = useQuery(trpc.medico.getConfigFaixa.queryOptions());

  const isLoading = isLoadingGrade || isLoadingConfig;

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  const horariosMap = grade?.horariosMap ?? {};
  const horariosAbertos = grade?.horariosAbertos ?? [];
  const slotsPendentes = grade?.slotsPendentes ?? {};
  const minhaFaixa = configFaixa?.minhaFaixa;
  const faixasData = configFaixa?.configFaixa as { slotsMinimo?: number; slotsMaximo?: number } | null;

  const minSlots = faixasData?.slotsMinimo ?? 0;
  const maxSlots = faixasData?.slotsMaximo ?? 0;
  const totalAbertos = horariosAbertos.length;
  const totalPendentes = Object.keys(slotsPendentes).length;

  return (
    <div className="flex flex-col h-[calc(100vh-theme(spacing.20))] animate-in fade-in duration-500 border rounded-xl overflow-hidden bg-background">
      <div className="flex-none px-4 py-3 border-b bg-card/50 backdrop-blur-sm">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 sm:gap-4">
            <h1 className="text-lg font-bold tracking-tight">Meus Horários</h1>
            <div className="flex items-center gap-1.5 px-2 py-1 bg-muted/50 rounded-md">
              <ShieldCheck className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-medium">{minhaFaixa || "—"}</span>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-1 bg-muted/50 rounded-md">
              <Clock className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs font-medium">{totalAbertos} / {maxSlots} slots</span>
            </div>
          </div>
          
          {totalPendentes > 0 && (
            <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-500/10 text-amber-600 rounded-md border border-amber-500/20">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
              <span className="text-xs font-medium">{totalPendentes} pendentes</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="min-w-[800px] p-4 pb-10">
          <div className="grid grid-cols-[80px_1fr_1fr_1fr_1fr_1fr_1fr_1fr] gap-2 mb-2 sticky top-0 z-10 bg-background/95 backdrop-blur py-2 border-b">
            <div className="flex items-center justify-center font-medium text-muted-foreground text-xs">
              <Clock className="h-3.5 w-3.5" />
            </div>
            {DAYS.map((day) => (
              <div key={day.id} className="text-center">
                <div className="font-semibold text-xs">{day.short}</div>
                <div className="text-[10px] text-muted-foreground hidden sm:block">{day.label}</div>
              </div>
            ))}
          </div>

          <div className="space-y-1">
            {TIME_SLOTS.map((time) => (
              <div key={time} className="grid grid-cols-[80px_1fr_1fr_1fr_1fr_1fr_1fr_1fr] gap-2 group">
                <div className="flex items-center justify-center text-[10px] font-mono text-muted-foreground group-hover:text-foreground transition-colors">
                  {time}
                </div>

                {DAYS.map((day) => {
                  const slotKey = `${day.id}-${time}`;
                  const isOpen = horariosMap?.[slotKey];
                  const isPendente = slotsPendentes?.[slotKey];
                  
                  return (
                    <div
                      key={slotKey}
                      className={cn(
                        "h-7 rounded-md border transition-all duration-200 flex items-center justify-center text-xs",
                        isPendente
                          ? "bg-amber-400/20 border-amber-400/40 text-amber-700 dark:text-amber-300 dark:bg-amber-400/20"
                          : isOpen
                            ? "bg-brand-500/15 border-brand-500/30 text-brand-700 dark:text-brand-300 dark:bg-brand-500/20 hover:bg-brand-500/25 cursor-default"
                            : "bg-muted/30 border-transparent text-muted-foreground/30"
                      )}
                    >
                      {isPendente && (
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                      )}
                      {isOpen && !isPendente && (
                        <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-in zoom-in duration-300" />
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-none py-2 px-4 border-t bg-muted/20 text-[10px] text-muted-foreground flex justify-center gap-4 flex-wrap">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-brand-500" />
          <span>Disponível</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          <span>Pendente</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-muted border border-muted-foreground/20" />
          <span>Indisponível</span>
        </div>
      </div>
    </div>
  );
}


function LoadingSkeleton() {
  return (
    <div className="flex flex-col h-[calc(100vh-theme(spacing.20))] border rounded-xl overflow-hidden bg-background">
      <div className="flex-none px-4 py-3 border-b bg-card/50 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-6 w-24" />
        </div>
      </div>
      <div className="flex-1 overflow-auto p-4 space-y-4">
        <div className="grid grid-cols-[80px_1fr_1fr_1fr_1fr_1fr_1fr_1fr] gap-2">
          <Skeleton className="h-8 w-full" />
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
        <div className="space-y-2">
          {Array.from({ length: 15 }).map((_, i) => (
            <Skeleton key={i} className="h-7 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
