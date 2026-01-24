"use client";

import { useState, useMemo, Fragment } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { trpc, trpcClient } from "@/utils/trpc";
import { toast } from "sonner";
import { Loader2, AlertTriangle, CheckCircle2, AlertCircle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

type DiaSemana = "dom" | "seg" | "ter" | "qua" | "qui" | "sex" | "sab";
const DAYS_MAP: Record<number, DiaSemana> = {
  0: "dom", 1: "seg", 2: "ter", 3: "qua", 4: "qui", 5: "sex", 6: "sab"
};
const DAYS_LABEL: Record<DiaSemana, string> = {
  dom: "Domingo", seg: "Segunda", ter: "Terça", qua: "Quarta", qui: "Quinta", sex: "Sexta", sab: "Sábado"
};

const MOTIVOS = [
  { value: "doenca", label: "Doença" },
  { value: "emergencia_familiar", label: "Emergência Familiar" },
  { value: "compromisso_medico", label: "Compromisso Médico" },
  { value: "problema_tecnico", label: "Problema Técnico" },
  { value: "outro", label: "Outro" },
];

export default function EmergencyCancellationPage() {
  const router = useRouter();
  const [selectedSlots, setSelectedSlots] = useState<Set<string>>(new Set());
  const [motivoCategoria, setMotivoCategoria] = useState<string>("");
  const [motivoDescricao, setMotivoDescricao] = useState<string>("");

  const next3Days = useMemo(() => {
    const days = [];
    const today = new Date();
    for (let i = 0; i < 3; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      days.push({
        date: date,
        diaSemana: DAYS_MAP[date.getDay()] as DiaSemana,
        label: `${DAYS_LABEL[DAYS_MAP[date.getDay()] as DiaSemana].slice(0, 3)} ${date.getDate()}/${date.getMonth() + 1}`
      });
    }
    return days;
  }, []);

  const targetDays = useMemo(() => new Set(next3Days.map(d => d.diaSemana)), [next3Days]);

  const { data: gradeData, isLoading: isLoadingGrade } = useQuery(
    trpc.medico.getGradeEmergencial.queryOptions()
  );

  const relevantSlots = useMemo(() => {
    if (!gradeData?.horariosAbertos) return [];
    return gradeData.horariosAbertos.filter(h => targetDays.has(h.diaSemana as DiaSemana));
  }, [gradeData, targetDays]);

  const slotsComConsultaSet = useMemo(() => {
    if (!gradeData?.slotsComConsulta) return new Set<string>();
    const set = new Set<string>();
    Object.keys(gradeData.slotsComConsulta).forEach(key => {
      if (gradeData.slotsComConsulta[key]) {
        set.add(key);
      }
    });
    return set;
  }, [gradeData]);

  const createCancellation = useMutation({
    mutationFn: (input: { slots: { diaSemana: DiaSemana; horario: string }[], motivoCategoria: any, motivoDescricao?: string }) =>
      trpcClient.solicitacoes.criarCancelamentoEmergencial.mutate(input),
    onSuccess: () => {
      toast.success("Cancelamento emergencial solicitado com sucesso!");
      setTimeout(() => router.push("/dashboard"), 1000);
    },
    onError: (error) => {
      toast.error("Erro ao solicitar cancelamento", { description: error.message });
    }
  });

  const handleSlotClick = (diaSemana: DiaSemana, horario: string) => {
    const id = `${diaSemana}-${horario}`;

    const newSelected = new Set(selectedSlots);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedSlots(newSelected);
  };

  const handleSubmit = () => {
    if (!motivoCategoria) return;
    
    const slots = Array.from(selectedSlots).map(id => {
      const [diaSemana, horario] = id.split("-");
      return { diaSemana: diaSemana as DiaSemana, horario };
    });

    createCancellation.mutate({
      slots,
      motivoCategoria: motivoCategoria as any,
      motivoDescricao
    });
  };

  const timeSlots = useMemo(() => {
    const slots: string[] = [];
    for (let h = 7; h < 22; h++) {
      slots.push(`${h.toString().padStart(2, "0")}:00`);
      slots.push(`${h.toString().padStart(2, "0")}:20`);
      slots.push(`${h.toString().padStart(2, "0")}:40`);
    }
    return slots;
  }, []);

  const isLoading = isLoadingGrade;

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-8 w-32" />
        </div>
        <Skeleton className="h-[400px] w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-theme(spacing.4))] bg-background">
      <div className="flex-none px-6 py-4 border-b bg-card/50 backdrop-blur-sm sticky top-0 z-20">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            Cancelamento Emergencial
          </h1>
          <p className="text-sm text-muted-foreground">
            Selecione os horários que precisa fechar nos próximos 3 dias.
          </p>
        </div>
      </div>

      <ScrollArea className="flex-1 p-6">
        <div className="max-w-4xl mx-auto space-y-8">
          
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3 items-start">
            <Info className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-amber-800">Política de Cancelamento Emergencial</p>
              <p className="text-sm text-amber-700">
                Horários <span className="text-red-600 font-medium">vermelhos</span> possuem consulta agendada e podem gerar strike.
                Horários <span className="text-blue-600 font-medium">azuis</span> estão abertos sem consulta.
              </p>
            </div>
          </div>

          <div className="border rounded-xl overflow-hidden bg-card shadow-sm">
            <div className="grid grid-cols-[60px_repeat(3,1fr)] divide-x divide-y border-b">
              <div className="p-3 bg-muted/30"></div>
              {next3Days.map((day) => (
                <div key={day.diaSemana} className="p-3 text-center bg-muted/30">
                  <span className="font-semibold text-sm block">{day.label}</span>
                </div>
              ))}

              {timeSlots.map((time) => (
                <Fragment key={time}>
                  <div className="p-2 text-xs font-mono text-muted-foreground text-right flex items-center justify-end bg-muted/10">
                    {time}
                  </div>
                  {next3Days.map((day) => {
                    const id = `${day.diaSemana}-${time}`;
                    const hasConsulta = slotsComConsultaSet.has(id);
                    const isSelected = selectedSlots.has(id);
                    const isMySlot = relevantSlots.some(s => s.diaSemana === day.diaSemana && s.horario === time);

                    if (!isMySlot) {
                      return <div key={id} className="bg-muted/5" />;
                    }

                    return (
                      <div key={id} className="p-1">
                        <button
                          onClick={() => handleSlotClick(day.diaSemana, time)}
                          className={cn(
                            "w-full h-full min-h-[32px] rounded-md border text-xs font-medium transition-all flex items-center justify-center gap-1.5",
                            isSelected
                              ? hasConsulta
                                ? "bg-red-100 border-red-500 text-red-700 ring-1 ring-red-500"
                                : "bg-yellow-100 border-yellow-500 text-yellow-700 ring-1 ring-yellow-500"
                              : hasConsulta 
                                ? "bg-red-50 border-red-200 text-red-600 hover:border-red-300 hover:bg-red-100/50"
                                : "bg-blue-50 border-blue-200 text-blue-600 hover:border-blue-300 hover:bg-blue-100/50"
                          )}
                        >
                          {isSelected ? (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          ) : hasConsulta ? (
                            <AlertCircle className="h-3.5 w-3.5" />
                          ) : null}
                          <span className="hidden sm:inline">
                            {hasConsulta ? "Consulta" : "Aberto"}
                          </span>
                        </button>
                      </div>
                    );
                  })}
                </Fragment>
              ))}
            </div>
          </div>

          <div className="bg-card border rounded-xl p-6 space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="text-lg font-semibold">Confirmar Solicitação</h3>
              <div className="flex items-center gap-2 flex-wrap">
                {selectedSlots.size > 0 && (
                  <>
                    {Array.from(selectedSlots).filter(id => slotsComConsultaSet.has(id)).length > 0 && (
                      <Badge variant="destructive" className="bg-red-100 text-red-700 border-red-200">
                        {Array.from(selectedSlots).filter(id => slotsComConsultaSet.has(id)).length} com consulta
                      </Badge>
                    )}
                    {Array.from(selectedSlots).filter(id => !slotsComConsultaSet.has(id)).length > 0 && (
                      <Badge variant="secondary" className="bg-blue-100 text-blue-700 border-blue-200">
                        {Array.from(selectedSlots).filter(id => !slotsComConsultaSet.has(id)).length} sem consulta
                      </Badge>
                    )}
                  </>
                )}
                <Badge variant={selectedSlots.size > 0 ? "outline" : "secondary"}>
                  {selectedSlots.size} total
                </Badge>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Motivo do Cancelamento *</label>
                <Select value={motivoCategoria} onValueChange={(val) => setMotivoCategoria(val || "")}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o motivo" />
                  </SelectTrigger>
                  <SelectContent>
                    {MOTIVOS.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Descrição (Opcional)</label>
                <Textarea 
                  placeholder="Detalhes adicionais sobre o cancelamento..."
                  value={motivoDescricao}
                  onChange={(e) => setMotivoDescricao(e.target.value)}
                  className="resize-none h-[100px]"
                />
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t">
              <Button 
                size="lg" 
                variant="destructive"
                onClick={handleSubmit}
                disabled={selectedSlots.size === 0 || !motivoCategoria || createCancellation.isPending}
                className="w-full md:w-auto"
              >
                {createCancellation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Solicitar Cancelamento
              </Button>
            </div>
          </div>

        </div>
      </ScrollArea>
    </div>
  );
}