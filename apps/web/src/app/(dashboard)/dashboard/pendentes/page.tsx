"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { 
  Check, 
  X, 
  ChevronDown, 
  ChevronUp, 
  Calendar, 
  Clock, 
  AlertCircle,
  Loader2,
  Filter
} from "lucide-react";
import { toast } from "sonner";

import { Button, buttonVariants } from "@/components/ui/button";
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}

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

export default function PendentesPage() {
  const [page, setPage] = useState(1);
  const perPage = 10;
  
  const { data, isLoading, isError } = useQuery(
    trpc.aprovacoes.listarSolicitacoes.queryOptions({
      status: "pendente",
      page,
      perPage,
    })
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Aprovações Pendentes</h1>
          <p className="text-muted-foreground mt-1 sm:mt-2 text-sm sm:text-base">
            Gerencie as solicitações de alteração de agenda dos médicos.
          </p>
        </div>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5 text-primary" />
            Solicitações Aguardando Análise
          </CardTitle>
          <CardDescription>
            Mostrando {data?.solicitacoes.length ?? 0} de {data?.total ?? 0} solicitações pendentes
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center justify-center py-10 text-destructive">
              <AlertCircle className="h-10 w-10 mb-2" />
              <p>Erro ao carregar solicitações. Tente novamente.</p>
            </div>
          ) : data?.solicitacoes.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground bg-muted/20 rounded-lg border border-dashed">
              <Check className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p>Nenhuma solicitação pendente no momento.</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-[50px]"></TableHead>
                    <TableHead>Médico</TableHead>
                    <TableHead>Faixa</TableHead>
                    <TableHead>Total Slots</TableHead>
                    <TableHead>Data Solicitação</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data as any)?.solicitacoes?.map((solicitacao: any) => (
                    <SolicitacaoRow key={solicitacao.id} solicitacao={solicitacao} />
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {data && data.pages > 1 && (
            <div className="mt-6 flex justify-center">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      className={page === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationLink isActive>{page}</PaginationLink>
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationNext 
                      onClick={() => setPage(p => Math.min(data.pages, p + 1))}
                      className={page === data.pages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

type DiaSemana = "dom" | "seg" | "ter" | "qua" | "qui" | "sex" | "sab";
type SlotType = { diaSemana: DiaSemana; horario: string };

function getSlotKey(slot: { diaSemana: string; horario: string }) {
  return `${slot.diaSemana}-${slot.horario}`;
}

function toSlotType(slot: { diaSemana: string; horario: string }): SlotType {
  return { diaSemana: slot.diaSemana as DiaSemana, horario: slot.horario };
}

function SolicitacaoRow({ solicitacao }: { solicitacao: any }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  
  const allSlots: SlotType[] = Array.isArray(solicitacao.slots) ? solicitacao.slots : [];
  const [selectedSlots, setSelectedSlots] = useState<Set<string>>(() => 
    new Set(allSlots.map(getSlotKey))
  );
  
  const queryClient = useQueryClient();

  const approveMutation = useMutation({
    ...trpc.aprovacoes.aprovarSolicitacao.mutationOptions(),
    onSuccess: (_, variables) => {
      const aprovados = variables.slotsAprovados?.length ?? 0;
      const rejeitados = variables.slotsRejeitados?.length ?? 0;
      toast.success("Solicitação processada!", {
        description: `${aprovados} aprovados, ${rejeitados} rejeitados`,
      });
      setApproveDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: [['aprovacoes', 'listarSolicitacoes']] });
    },
    onError: (err) => {
      toast.error(`Erro ao aprovar: ${err.message}`);
    }
  });

  const rejectMutation = useMutation({
    ...trpc.aprovacoes.rejeitarSolicitacao.mutationOptions(),
    onSuccess: () => {
      toast.success("Solicitação rejeitada com sucesso!");
      setRejectDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: [['aprovacoes', 'listarSolicitacoes']] });
    },
    onError: (err) => {
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
      solicitacaoId: solicitacao.id,
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
      solicitacaoId: solicitacao.id, 
      motivoRejeicao: rejectionReason 
    });
  };

  const selectedCount = selectedSlots.size;
  const rejectedCount = allSlots.length - selectedCount;

  return (
    <>
      <TableRow 
        className={cn("transition-colors hover:bg-muted/30 cursor-pointer", isExpanded && "bg-muted/30")}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <TableCell>
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </TableCell>
        <TableCell>
          <div className="font-medium">{solicitacao.medico?.name || "Médico não encontrado"}</div>
          <div className="text-xs text-muted-foreground">{solicitacao.medico?.email}</div>
        </TableCell>
        <TableCell>
          <Badge variant="outline" className="font-mono bg-background">
            {solicitacao.medico?.faixa || "N/A"}
          </Badge>
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3 text-muted-foreground" />
            <span className="font-medium">{allSlots.length}</span>
            <span className="text-muted-foreground text-xs ml-1">horários</span>
          </div>
        </TableCell>
        <TableCell>
          <div className="text-sm">
            {new Intl.DateTimeFormat("pt-BR").format(new Date(solicitacao.createdAt))}
          </div>
          <div className="text-xs text-muted-foreground">
            {new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(new Date(solicitacao.createdAt))}
          </div>
        </TableCell>
        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
          <div className="flex justify-end gap-2">
            <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
              <DialogTrigger className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-8 border-destructive/50 text-destructive hover:bg-destructive/10 hover:text-destructive hover:border-destructive")}>
                  <X className="mr-1 h-3 w-3" /> Rejeitar Tudo
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Rejeitar Solicitação</DialogTitle>
                  <DialogDescription>
                    Você está prestes a rejeitar TODOS os horários de {solicitacao.medico?.name}.
                    Esta ação não pode ser desfeita.
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  <Label htmlFor="reason" className="mb-2 block">Motivo da rejeição</Label>
                  <Textarea 
                    id="reason" 
                    placeholder="Descreva o motivo..." 
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                  />
                </div>
                <DialogFooter>
                  <Button variant="ghost" onClick={() => setRejectDialogOpen(false)}>Cancelar</Button>
                  <Button 
                    variant="destructive" 
                    onClick={handleReject}
                    disabled={rejectMutation.isPending}
                  >
                    {rejectMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Confirmar Rejeição
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
              <DialogTrigger className={cn(buttonVariants({ variant: "default", size: "sm" }), "h-8 bg-emerald-600 hover:bg-emerald-700 text-white")}>
                  <Check className="mr-1 h-3 w-3" /> Aprovar
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Confirmar Aprovação</DialogTitle>
                  <DialogDescription>
                    Revise os horários selecionados para {solicitacao.medico?.name}
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-3">
                  <div className="flex gap-4 text-sm">
                    <div className="flex items-center gap-2 text-emerald-600">
                      <Check className="h-4 w-4" />
                      <span><strong>{selectedCount}</strong> serão aprovados</span>
                    </div>
                    {rejectedCount > 0 && (
                      <div className="flex items-center gap-2 text-destructive">
                        <X className="h-4 w-4" />
                        <span><strong>{rejectedCount}</strong> serão rejeitados</span>
                      </div>
                    )}
                  </div>
                  {selectedCount === 0 && (
                    <div className="text-amber-600 text-sm bg-amber-50 dark:bg-amber-950/30 p-2 rounded">
                      Nenhum horário selecionado. Selecione ao menos um para aprovar.
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="ghost" onClick={() => setApproveDialogOpen(false)}>Cancelar</Button>
                  <Button 
                    onClick={handleApprove}
                    className="bg-emerald-600 hover:bg-emerald-700"
                    disabled={approveMutation.isPending || selectedCount === 0}
                  >
                    {approveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Confirmar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </TableCell>
      </TableRow>
      
      {isExpanded && (
        <TableRow className="bg-muted/20 hover:bg-muted/20">
          <TableCell colSpan={6} className="p-0">
            <div className="p-4 sm:p-6 border-b border-border/50 animate-in slide-in-from-top-2 duration-200">
               <SelectableSlotsGrid 
                 medicoId={solicitacao.medicoId} 
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
          Selecione os horários para aprovar
        </h4>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 bg-blue-500/30 border border-blue-500 rounded-sm"></div>
            <span className="text-muted-foreground">Já na agenda (Click)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 bg-emerald-500 border border-emerald-600 rounded-sm"></div>
            <span className="text-muted-foreground">Selecionado para aprovar</span>
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
                  } else if (requested) {
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
                          if (requested && !existing) {
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
