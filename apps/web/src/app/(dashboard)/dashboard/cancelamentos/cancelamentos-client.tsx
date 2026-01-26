"use client";

import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { trpc, trpcClient } from "@/utils/trpc";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  CalendarOff,
  Stethoscope,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  Check,
  X,
  Calendar,
  Loader2
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

const formatDate = (date: Date | string) => {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(date));
};

const getMotiveBadge = (category: string) => {
  switch (category) {
    case "doenca":
      return <Badge variant="destructive" className="bg-red-100 text-red-700 hover:bg-red-200 border-red-200">Doença</Badge>;
    case "emergencia_familiar":
      return <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-200">Emergência Familiar</Badge>;
    case "compromisso_medico":
      return <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-200">Compromisso Médico</Badge>;
    case "problema_tecnico":
      return <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-200">Problema Técnico</Badge>;
    default:
      return <Badge variant="outline">Outro</Badge>;
  }
};

const WEEKDAYS = ["dom", "seg", "ter", "qua", "qui", "sex", "sab"];
const WEEKDAY_LABELS = {
  dom: "Dom",
  seg: "Seg",
  ter: "Ter",
  qua: "Qua",
  qui: "Qui",
  sex: "Sex",
  sab: "Sáb",
};

const TIME_SLOTS: string[] = [];
for (let h = 7; h < 22; h++) {
  TIME_SLOTS.push(`${h.toString().padStart(2, "0")}:00`);
  TIME_SLOTS.push(`${h.toString().padStart(2, "0")}:20`);
  TIME_SLOTS.push(`${h.toString().padStart(2, "0")}:40`);
}

type DiaSemana = "dom" | "seg" | "ter" | "qua" | "qui" | "sex" | "sab";
type SlotType = { diaSemana: DiaSemana; horario: string };

function getSlotKey(slot: { diaSemana: string; horario: string }) {
  return `${slot.diaSemana}-${slot.horario}`;
}

function toSlotType(slot: { diaSemana: string; horario: string }): SlotType {
  return { diaSemana: slot.diaSemana as DiaSemana, horario: slot.horario };
}

function SelectableSlotsGrid({ 
  medicoId, 
  requestedSlots,
  selectedSlots,
  onToggleSlot,
}: { 
  medicoId: string; 
  requestedSlots: SlotType[];
  selectedSlots: Set<string>;
  onToggleSlot: (slot: SlotType) => void;
}) {
  const { data: existingSlots, isLoading } = useQuery(
    trpc.medico.getHorariosMedico.queryOptions({ medicoId })
  );

  const isExisting = (day: string, time: string) => {
    return existingSlots?.some(s => s.diaSemana === day && s.horario === time);
  };

  const isRequested = (day: string, time: string) => {
    return requestedSlots.some(s => s.diaSemana === day && s.horario === time);
  };

  const isSelected = (day: string, time: string) => {
    return selectedSlots.has(`${day}-${time}`);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin mb-2" />
        <span className="text-xs">Carregando agenda atual...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-semibold flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary" /> 
          Selecione os horários para cancelar
        </h4>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 bg-blue-500/30 border border-blue-500 rounded-sm"></div>
            <span className="text-muted-foreground">Já na agenda (Click)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 bg-emerald-500 border border-emerald-600 rounded-sm"></div>
            <span className="text-muted-foreground">Selecionado para cancelar</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 bg-yellow-400/50 border border-yellow-500 rounded-sm"></div>
            <span className="text-muted-foreground">Solicitado (não selecionado)</span>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-md border border-border/50 bg-background/50">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr>
              <th className="p-2 border-b border-r bg-muted/50 font-medium text-muted-foreground w-16 sticky left-0 z-10">
                Horário
              </th>
              {WEEKDAYS.map((day) => (
                <th key={day} className="p-2 border-b border-r last:border-r-0 bg-muted/50 font-medium text-foreground min-w-[80px]">
                  {WEEKDAY_LABELS[day as keyof typeof WEEKDAY_LABELS]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {TIME_SLOTS.map((time) => (
              <tr key={time} className="group hover:bg-muted/10">
                <td className="p-2 border-b border-r bg-muted/30 font-mono text-xs text-muted-foreground sticky left-0 z-10 group-hover:bg-muted/30">
                  {time}
                </td>
                {WEEKDAYS.map((day) => {
                  const existing = isExisting(day, time);
                  const requested = isRequested(day, time);
                  const selected = isSelected(day, time);
                  
                  let cellClass = "bg-transparent";
                  let cursor = "cursor-default";
                  let content = null;
                  
                  if (existing) {
                    cellClass = "bg-blue-500/20 border-blue-500/40";
                    content = <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />;
                  }
                  
                  // Override if requested (since requested slots are likely existing too, but we want to highlight the request)
                  if (requested) {
                    cursor = "cursor-pointer";
                    if (selected) {
                      cellClass = "bg-emerald-500 border-emerald-600 hover:bg-emerald-600";
                      content = <Check className="w-3 h-3 text-white" />;
                    } else {
                      cellClass = "bg-yellow-400/30 border-yellow-500/50 hover:bg-yellow-400/50";
                      content = <div className="w-1.5 h-1.5 rounded-full bg-yellow-500" />;
                    }
                  }

                  return (
                    <td key={`${day}-${time}`} className="p-1 border-b border-r last:border-r-0 h-8">
                      <div 
                        className={cn(
                          "w-full h-full rounded-sm border transition-all duration-150 flex items-center justify-center",
                          cellClass,
                          cursor
                        )}
                        onClick={() => {
                          if (requested) {
                            onToggleSlot({ diaSemana: day as DiaSemana, horario: time });
                          }
                        }}
                      >
                        {content}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="text-xs text-muted-foreground text-center mt-2">
        Clique nos horários amarelos para selecionar/deselecionar
      </div>
    </div>
  );
}

function CancelamentoRow({ cancelamento }: { cancelamento: any }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [aplicarStrike, setAplicarStrike] = useState(true);
  const rowRef = useRef<HTMLTableRowElement>(null);

  const allSlots: SlotType[] = Array.isArray(cancelamento.slots) ? cancelamento.slots : [];
  const [selectedSlots, setSelectedSlots] = useState<Set<string>>(() => 
    new Set(allSlots.map(getSlotKey))
  );

  const queryClient = useQueryClient();

  const approveMutation = useMutation({
    mutationFn: (input: { 
      cancelamentoId: string; 
      aplicarStrike: boolean;
      slotsAprovados: SlotType[];
      slotsRejeitados: SlotType[];
    }) => 
      trpcClient.aprovacoes.aprovarCancelamento.mutate(input),
    onSuccess: (_, variables) => {
      const aprovados = variables.slotsAprovados?.length ?? 0;
      const rejeitados = variables.slotsRejeitados?.length ?? 0;
      toast.success(
        variables.aplicarStrike 
          ? "Cancelamento aprovado. Strike aplicado ao médico."
          : "Cancelamento aprovado sem aplicar strike.",
        {
          description: `${aprovados} slots cancelados, ${rejeitados} mantidos`,
        }
      );
      setApproveDialogOpen(false);
      queryClient.invalidateQueries();
    },
    onError: (err: { message: string }) => {
      toast.error(`Erro ao aprovar: ${err.message}`);
    }
  });

  const rejectMutation = useMutation({
    mutationFn: (input: { cancelamentoId: string; motivoRejeicao: string }) => 
      trpcClient.aprovacoes.rejeitarCancelamento.mutate(input),
    onSuccess: () => {
      toast.success("Solicitação de cancelamento rejeitada.");
      setRejectDialogOpen(false);
      queryClient.invalidateQueries();
    },
    onError: (err: { message: string }) => {
      toast.error(`Erro ao rejeitar: ${err.message}`);
    }
  });

  const toggleSlot = (slot: SlotType) => {
    const key = getSlotKey(slot);
    const newSelected = new Set(selectedSlots);
    if (newSelected.has(key)) {
      newSelected.delete(key);
    } else {
      newSelected.add(key);
    }
    setSelectedSlots(newSelected);
  };

  const handleApprove = () => {
    const slotsAprovados = allSlots
      .filter(s => selectedSlots.has(getSlotKey(s)))
      .map(toSlotType);
    const slotsRejeitados = allSlots
      .filter(s => !selectedSlots.has(getSlotKey(s)))
      .map(toSlotType);
    
    approveMutation.mutate({ 
      cancelamentoId: cancelamento.id,
      aplicarStrike,
      slotsAprovados,
      slotsRejeitados,
    });
  };

  const handleReject = () => {
    if (!rejectionReason.trim()) {
      toast.error("Por favor, informe o motivo da rejeição.");
      return;
    }
    rejectMutation.mutate({ 
      cancelamentoId: cancelamento.id, 
      motivoRejeicao: rejectionReason 
    });
  };

  const selectedCount = selectedSlots.size;
  const rejectedCount = allSlots.length - selectedCount;

  return (
    <>
      <TableRow 
        ref={rowRef}
        className={cn(
          "transition-colors hover:bg-muted/30 cursor-pointer", 
          isExpanded && "bg-muted/30"
        )}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <TableCell>
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </TableCell>
        <TableCell>
          <div className="flex flex-col">
            <span className="font-semibold text-slate-900 dark:text-slate-100">{cancelamento.medico.name}</span>
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
              <Stethoscope className="h-3 w-3" />
              <span>CRM: {cancelamento.medico.id}</span>
            </div>
          </div>
        </TableCell>
        <TableCell>
          <div className="space-y-1">
            {getMotiveBadge(cancelamento.motivoCategoria)}
            <p className="text-sm text-muted-foreground max-w-[200px] truncate" title={cancelamento.motivoDescricao ?? undefined}>
              {cancelamento.motivoDescricao}
            </p>
          </div>
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-2">
            {cancelamento.medico.strikes >= 2 ? (
              <Badge variant="destructive" className="gap-1 animate-pulse">
                <AlertTriangle className="h-3 w-3" />
                {cancelamento.medico.strikes} Strikes
              </Badge>
            ) : (
              <div className="flex gap-1">
                {[...Array(3)].map((_, i) => (
                  <div 
                    key={i} 
                    className={`h-2 w-2 rounded-full ${i < cancelamento.medico.strikes ? 'bg-amber-500' : 'bg-slate-200 dark:bg-slate-700'}`}
                  />
                ))}
              </div>
            )}
          </div>
        </TableCell>
        <TableCell>
          <Badge variant="secondary" className="font-mono">
            {allSlots.length} slots
          </Badge>
        </TableCell>
        <TableCell className="text-muted-foreground text-sm">
          <div className="flex items-center gap-2">
            <Clock className="h-3 w-3" />
            {formatDate(cancelamento.createdAt)}
          </div>
        </TableCell>
        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
          <div className="flex justify-end gap-2">
            <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
              <DialogTrigger className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-8 border-destructive/50 text-destructive hover:bg-destructive/10 hover:text-destructive hover:border-destructive")}>
                  <XCircle className="mr-1 h-3 w-3" /> Rejeitar
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Rejeitar Solicitação</DialogTitle>
                  <DialogDescription>
                    O médico será notificado que o cancelamento não foi aceito.
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  <Label htmlFor="reason" className="mb-2 block">Motivo da rejeição</Label>
                  <Textarea 
                    id="reason" 
                    placeholder="Explique por que o cancelamento não pode ser aceito..." 
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="min-h-[100px]"
                  />
                </div>
                <DialogFooter>
                  <Button variant="ghost" onClick={() => setRejectDialogOpen(false)}>Cancelar</Button>
                  <Button 
                    variant="destructive" 
                    onClick={handleReject}
                    disabled={rejectMutation.isPending || !rejectionReason.trim()}
                  >
                    {rejectMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Rejeitar Solicitação
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
              <DialogTrigger className={cn(buttonVariants({ variant: "default", size: "sm" }), "h-8 bg-brand-600 hover:bg-brand-700 text-white shadow-sm")}>
                  <CheckCircle2 className="mr-1 h-3 w-3" /> Aprovar
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-rose-600">
                    <ShieldAlert className="h-5 w-5" />
                    Confirmar Aprovação
                  </DialogTitle>
                  <DialogDescription>
                    Revise os horários selecionados para cancelamento.
                  </DialogDescription>
                </DialogHeader>
                
                <div className="py-4 space-y-4">
                  {aplicarStrike && (
                    <Alert variant="destructive" className="bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-900/20 dark:border-rose-900">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>Ação com Penalidade</AlertTitle>
                      <AlertDescription>
                        Um <strong>Strike</strong> será adicionado ao perfil do médico.
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="flex items-center space-x-3 py-2">
                    <Checkbox
                      id="aplicar-strike"
                      checked={aplicarStrike}
                      onCheckedChange={(checked) => setAplicarStrike(checked === true)}
                    />
                    <Label htmlFor="aplicar-strike" className="text-sm font-medium cursor-pointer">
                      Aplicar Strike ao Médico
                    </Label>
                  </div>

                  <div className="flex gap-4 text-sm border-t pt-4">
                    <div className="flex items-center gap-2 text-emerald-600">
                      <Check className="h-4 w-4" />
                      <span><strong>{selectedCount}</strong> serão cancelados</span>
                    </div>
                    {rejectedCount > 0 && (
                      <div className="flex items-center gap-2 text-destructive">
                        <X className="h-4 w-4" />
                        <span><strong>{rejectedCount}</strong> serão mantidos</span>
                      </div>
                    )}
                  </div>
                  
                  {selectedCount === 0 && (
                    <div className="text-amber-600 text-sm bg-amber-50 dark:bg-amber-950/30 p-2 rounded">
                      Nenhum horário selecionado. Selecione ao menos um para aprovar o cancelamento.
                    </div>
                  )}
                </div>

                <DialogFooter>
                  <Button variant="ghost" onClick={() => setApproveDialogOpen(false)}>Cancelar</Button>
                  <Button 
                    onClick={handleApprove}
                    variant={aplicarStrike ? "destructive" : "default"}
                    disabled={approveMutation.isPending || selectedCount === 0}
                  >
                    {approveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {aplicarStrike ? "Confirmar e Aplicar Strike" : "Confirmar sem Strike"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </TableCell>
      </TableRow>
      
      {isExpanded && (
        <TableRow className="bg-muted/20 hover:bg-muted/20">
          <TableCell colSpan={7} className="p-0">
            <div className="p-4 sm:p-6 border-b border-border/50 animate-in slide-in-from-top-2 duration-200">
               <SelectableSlotsGrid 
                 medicoId={cancelamento.medicoId} 
                 requestedSlots={allSlots}
                 selectedSlots={selectedSlots}
                 onToggleSlot={toggleSlot}
               />
               <div className="mt-4 flex items-center justify-between text-sm">
                 <div className="flex gap-4">
                   <span className="text-emerald-600">
                     <Check className="h-4 w-4 inline mr-1" />
                     {selectedCount} selecionados
                   </span>
                   {rejectedCount > 0 && (
                     <span className="text-muted-foreground">
                       <X className="h-4 w-4 inline mr-1" />
                       {rejectedCount} não selecionados
                     </span>
                   )}
                 </div>
                 <div className="flex gap-2">
                   <Button 
                     variant="outline" 
                     size="sm"
                     onClick={() => setSelectedSlots(new Set(allSlots.map(getSlotKey)))}
                   >
                     Selecionar Todos
                   </Button>
                   <Button 
                     variant="outline" 
                     size="sm"
                     onClick={() => setSelectedSlots(new Set())}
                   >
                     Limpar Seleção
                   </Button>
                 </div>
               </div>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

export default function CancelamentosClient() {
  const [page, setPage] = useState(1);
  
  const { data, isLoading } = useQuery(trpc.aprovacoes.listarCancelamentos.queryOptions({
    status: "pendente",
    page,
    perPage: 10,
  }));

  return (
    <div className="container mx-auto py-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50 flex items-center gap-3">
          <CalendarOff className="h-8 w-8 text-rose-500" />
          Cancelamentos de Emergência
        </h1>
        <p className="text-muted-foreground max-w-2xl text-lg">
          Gerencie solicitações de cancelamento de última hora. <br/>
          <span className="text-rose-600 font-medium">Atenção:</span> Aprovar um cancelamento gera um strike automático para o médico.
        </p>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center h-64 space-y-4">
          <div className="relative">
            <div className="h-12 w-12 rounded-full border-4 border-slate-200 opacity-30"></div>
            <div className="absolute top-0 h-12 w-12 rounded-full border-4 border-rose-500 border-t-transparent animate-spin"></div>
          </div>
          <p className="text-muted-foreground animate-pulse">Carregando solicitações...</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50 dark:bg-slate-900/50">
                <TableRow>
                  <TableHead className="w-[50px]"></TableHead>
                  <TableHead className="w-[250px]">Médico</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Strikes Atuais</TableHead>
                  <TableHead>Afeta</TableHead>
                  <TableHead>Solicitado em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.cancelamentos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <CheckCircle2 className="h-8 w-8 text-green-500/50" />
                        <p>Nenhuma solicitação pendente.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  (data?.cancelamentos as any[])?.map((item) => (
                    <CancelamentoRow key={item.id} cancelamento={item} />
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {(data?.pages ?? 0) > 1 && (
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    className={page === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
                <PaginationItem>
                  <span className="px-4 text-sm font-medium text-muted-foreground">
                    Página {page} de {data?.pages ?? 1}
                  </span>
                </PaginationItem>
                <PaginationItem>
                  <PaginationNext 
                    onClick={() => setPage(p => Math.min(data?.pages ?? 1, p + 1))}
                    className={page === (data?.pages ?? 1) ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </div>
      )}
    </div>
  );
}
