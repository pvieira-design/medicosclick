"use client";

import { useState, Fragment, useMemo, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import {
  ChevronDown,
  ChevronUp,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Calendar,
  PlusCircle,
  Siren,
} from "lucide-react";
import { toast } from "sonner";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

const WEEKDAY_ORDER: Record<string, number> = {
  dom: 0, seg: 1, ter: 2, qua: 3, qui: 4, sex: 5, sab: 6,
};

const WEEKDAY_LABELS: Record<string, string> = {
  dom: "Domingo", seg: "Segunda", ter: "Terça", qua: "Quarta",
  qui: "Quinta", sex: "Sexta", sab: "Sábado",
};

type Slot = { diaSemana: string; horario: string };

const formatDate = (date: Date | string) => {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const formatTime = (date: Date | string) => {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

function sortSlotsByWeekdayAndTime(slots: Slot[]): Slot[] {
  return [...slots].sort((a, b) => {
    const dayDiff = (WEEKDAY_ORDER[a.diaSemana] ?? 99) - (WEEKDAY_ORDER[b.diaSemana] ?? 99);
    if (dayDiff !== 0) return dayDiff;
    return a.horario.localeCompare(b.horario);
  });
}

function getDisplayStatus(request: any): "pendente" | "aprovada" | "parcial" | "rejeitada" {
  if (request.status === "pendente") return "pendente";
  if (request.status === "rejeitada") return "rejeitada";
  
  if (request.status === "aprovada") {
    const slotsAprovados = Array.isArray(request.slotsAprovados) ? request.slotsAprovados : [];
    const slotsRejeitados = Array.isArray(request.slotsRejeitados) ? request.slotsRejeitados : [];
    
    const isParciallyApproved = slotsRejeitados.length > 0 && slotsAprovados.length > 0;
    return isParciallyApproved ? "parcial" : "aprovada";
  }
  
  return "pendente";
}

export default function MyRequestsPage() {
  const [activeTab, setActiveTab] = useState<"abertura" | "cancelamento">("abertura");
  
  return (
    <div className="flex flex-col gap-6 p-6 max-w-[1200px] mx-auto animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Minhas Solicitações</h1>
        <p className="text-muted-foreground">
          Acompanhe suas solicitações de abertura e cancelamento de horários.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "abertura" | "cancelamento")}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="abertura" className="gap-2">
            <PlusCircle className="h-4 w-4" />
            Abertura
          </TabsTrigger>
          <TabsTrigger value="cancelamento" className="gap-2">
            <Siren className="h-4 w-4" />
            Cancelamento
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="abertura" className="mt-4">
          <AberturaTab />
        </TabsContent>
        
        <TabsContent value="cancelamento" className="mt-4">
          <CancelamentoTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function AberturaTab() {
  const [page, setPage] = useState(1);
  const searchParams = useSearchParams();
  const highlightId = searchParams.get("id");
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>(() => 
    highlightId ? { [highlightId]: true } : {}
  );
  const rowRefs = useRef<Record<string, HTMLTableRowElement | null>>({});

  const queryClient = useQueryClient();
  const perPage = 10;

  const { data, isLoading, isError } = useQuery(
    trpc.medico.minhasSolicitacoes.queryOptions({
      page,
      perPage,
    })
  );

  useEffect(() => {
    if (highlightId && data?.solicitacoes && rowRefs.current[highlightId]) {
      setExpandedRows(prev => ({ ...prev, [highlightId]: true }));
      setTimeout(() => {
        rowRefs.current[highlightId]?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
    }
  }, [highlightId, data?.solicitacoes]);

  const cancelMutation = useMutation({
    ...trpc.solicitacoes.cancelarPendente.mutationOptions(),
    onSuccess: () => {
      toast.success("Solicitação cancelada com sucesso");
      queryClient.invalidateQueries();
    },
    onError: (error) => {
      toast.error(`Erro ao cancelar: ${error.message}`);
    },
  });

  const handleToggleRow = (id: string) => {
    setExpandedRows((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleCancel = (id: string) => {
    if (confirm("Tem certeza que deseja cancelar esta solicitação?")) {
      cancelMutation.mutate({ solicitacaoId: id });
    }
  };

  const getStatusBadge = (request: any) => {
    const displayStatus = getDisplayStatus(request);
    
    switch (displayStatus) {
      case "pendente":
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border-yellow-200 gap-1">
            <Clock className="w-3 h-3" /> Pendente
          </Badge>
        );
      case "aprovada":
        return (
          <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-200 border-green-200 gap-1">
            <CheckCircle2 className="w-3 h-3" /> Aprovada
          </Badge>
        );
      case "parcial":
        return (
          <Badge variant="secondary" className="bg-amber-100 text-amber-800 hover:bg-amber-200 border-amber-200 gap-1">
            <AlertCircle className="w-3 h-3" /> Parcialmente Aprovada
          </Badge>
        );
      case "rejeitada":
        return (
          <Badge variant="destructive" className="bg-red-100 text-red-800 hover:bg-red-200 border-red-200 gap-1 shadow-none">
            <XCircle className="w-3 h-3" /> Rejeitada
          </Badge>
        );
      default:
        return <Badge variant="outline">{request.status}</Badge>;
    }
  };

  const totalPages = data ? Math.ceil(data.total / perPage) : 0;

  return (
    <Card className="border-none shadow-sm bg-white/50 backdrop-blur-sm">
      <CardContent>
        <div className="rounded-md border bg-white overflow-hidden">
          <Table>
            <TableHeader className="bg-gray-50/50">
              <TableRow>
                <TableHead className="w-[50px]"></TableHead>
                <TableHead>Data Solicitação</TableHead>
                <TableHead>Total Slots</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-24 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : isError ? (
                 <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-red-500">
                    Erro ao carregar solicitações. Tente novamente.
                  </TableCell>
                </TableRow>
              ) : data?.solicitacoes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                    Nenhuma solicitação de abertura encontrada.
                  </TableCell>
                </TableRow>
              ) : (
                data?.solicitacoes.map((request: any) => (
                  <Fragment key={request.id}>
                    <TableRow 
                      ref={(el) => { rowRefs.current[request.id] = el; }}
                      className={cn(
                        "cursor-pointer hover:bg-gray-50/80 transition-colors",
                        expandedRows[request.id] && "bg-gray-50/50 border-b-transparent",
                        highlightId === request.id && "ring-2 ring-primary ring-inset bg-primary/5"
                      )}
                      onClick={() => handleToggleRow(request.id)}
                    >
                      <TableCell>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            {expandedRows[request.id] ? (
                              <ChevronUp className="h-4 w-4 text-gray-500" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-gray-500" />
                            )}
                          </Button>
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatDate(request.createdAt)}
                        <div className="text-xs text-muted-foreground mt-0.5">
                          às {formatTime(request.createdAt)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span>{request.totalSlots} slots</span>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(request)}</TableCell>
                      <TableCell className="text-right">
                        {request.status === "pendente" && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-100"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCancel(request.id);
                            }}
                            disabled={cancelMutation.isPending}
                          >
                            {cancelMutation.isPending ? "Cancelando..." : "Cancelar"}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                    {expandedRows[request.id] && (
                      <TableRow className="bg-gray-50/30 hover:bg-gray-50/30">
                        <TableCell colSpan={5} className="p-0 border-t-0">
                          <ExpandedRequestDetails request={request} />
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {totalPages > 1 && (
          <div className="mt-4 flex justify-center">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    href="#" 
                    onClick={(e) => {
                      e.preventDefault();
                      if (page > 1) setPage(page - 1);
                    }}
                    className={page <= 1 ? "pointer-events-none opacity-50" : ""}
                  />
                </PaginationItem>
                
                {Array.from({ length: totalPages }).map((_, i) => (
                  <PaginationItem key={i}>
                    <PaginationLink 
                      href="#" 
                      isActive={page === i + 1}
                      onClick={(e) => {
                        e.preventDefault();
                        setPage(i + 1);
                      }}
                    >
                      {i + 1}
                    </PaginationLink>
                  </PaginationItem>
                ))}
                
                <PaginationItem>
                  <PaginationNext 
                    href="#" 
                    onClick={(e) => {
                      e.preventDefault();
                      if (page < totalPages) setPage(page + 1);
                    }}
                    className={page >= totalPages ? "pointer-events-none opacity-50" : ""}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const MOTIVO_LABELS: Record<string, string> = {
  doenca: "Doença",
  emergencia_familiar: "Emergência Familiar",
  compromisso_medico: "Compromisso Médico",
  problema_tecnico: "Problema Técnico",
  outro: "Outro",
};

function CancelamentoTab() {
  const [page, setPage] = useState(1);
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const perPage = 10;

  const { data, isLoading, isError } = useQuery(
    trpc.medico.meusCancelamentos.queryOptions({
      page,
      perPage,
    })
  );

  const handleToggleRow = (id: string) => {
    setExpandedRows((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const getCancelamentoStatusBadge = (status: string, strikeAplicado?: boolean) => {
    switch (status) {
      case "pendente":
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border-yellow-200 gap-1">
            <Clock className="w-3 h-3" /> Pendente
          </Badge>
        );
      case "aprovado":
        return (
          <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-200 border-green-200 gap-1">
            <CheckCircle2 className="w-3 h-3" /> Aprovado {strikeAplicado && "(Strike)"}
          </Badge>
        );
      case "rejeitado":
        return (
          <Badge variant="destructive" className="bg-red-100 text-red-800 hover:bg-red-200 border-red-200 gap-1 shadow-none">
            <XCircle className="w-3 h-3" /> Rejeitado
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const totalPages = data ? Math.ceil(data.total / perPage) : 0;

  return (
    <Card className="border-none shadow-sm bg-white/50 backdrop-blur-sm">
      <CardContent>
        <div className="rounded-md border bg-white overflow-hidden">
          <Table>
            <TableHeader className="bg-gray-50/50">
              <TableRow>
                <TableHead className="w-[50px]"></TableHead>
                <TableHead>Data Solicitação</TableHead>
                <TableHead>Motivo</TableHead>
                <TableHead>Total Slots</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-24 rounded-full" /></TableCell>
                  </TableRow>
                ))
              ) : isError ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-red-500">
                    Erro ao carregar cancelamentos. Tente novamente.
                  </TableCell>
                </TableRow>
              ) : data?.cancelamentos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                    Nenhum cancelamento emergencial encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                data?.cancelamentos.map((cancelamento: any) => (
                  <Fragment key={cancelamento.id}>
                    <TableRow 
                      className={cn(
                        "cursor-pointer hover:bg-gray-50/80 transition-colors",
                        expandedRows[cancelamento.id] && "bg-gray-50/50 border-b-transparent"
                      )}
                      onClick={() => handleToggleRow(cancelamento.id)}
                    >
                      <TableCell>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          {expandedRows[cancelamento.id] ? (
                            <ChevronUp className="h-4 w-4 text-gray-500" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-gray-500" />
                          )}
                        </Button>
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatDate(cancelamento.createdAt)}
                        <div className="text-xs text-muted-foreground mt-0.5">
                          às {formatTime(cancelamento.createdAt)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-normal">
                          {MOTIVO_LABELS[cancelamento.motivoCategoria] || cancelamento.motivoCategoria}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Siren className="w-4 h-4 text-red-400" />
                          <span>{cancelamento.totalSlots} slots</span>
                        </div>
                      </TableCell>
                      <TableCell>{getCancelamentoStatusBadge(cancelamento.status, cancelamento.strikeAplicado)}</TableCell>
                    </TableRow>
                    {expandedRows[cancelamento.id] && (
                      <TableRow className="bg-gray-50/30 hover:bg-gray-50/30">
                        <TableCell colSpan={5} className="p-0 border-t-0">
                          <ExpandedCancelamentoDetails cancelamento={cancelamento} />
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {totalPages > 1 && (
          <div className="mt-4 flex justify-center">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    href="#" 
                    onClick={(e) => {
                      e.preventDefault();
                      if (page > 1) setPage(page - 1);
                    }}
                    className={page <= 1 ? "pointer-events-none opacity-50" : ""}
                  />
                </PaginationItem>
                
                {Array.from({ length: totalPages }).map((_, i) => (
                  <PaginationItem key={i}>
                    <PaginationLink 
                      href="#" 
                      isActive={page === i + 1}
                      onClick={(e) => {
                        e.preventDefault();
                        setPage(i + 1);
                      }}
                    >
                      {i + 1}
                    </PaginationLink>
                  </PaginationItem>
                ))}
                
                <PaginationItem>
                  <PaginationNext 
                    href="#" 
                    onClick={(e) => {
                      e.preventDefault();
                      if (page < totalPages) setPage(page + 1);
                    }}
                    className={page >= totalPages ? "pointer-events-none opacity-50" : ""}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ExpandedCancelamentoDetails({ cancelamento }: { cancelamento: any }) {
  const slotsAprovados: Slot[] = Array.isArray(cancelamento.slotsAprovados) ? cancelamento.slotsAprovados : [];
  const slotsRejeitados: Slot[] = Array.isArray(cancelamento.slotsRejeitados) ? cancelamento.slotsRejeitados : [];
  const slotsSolicitados: Slot[] = Array.isArray(cancelamento.slots) ? cancelamento.slots : [];

  const aprovadosSet = new Set(slotsAprovados.map(s => `${s.diaSemana}-${s.horario}`));
  const rejeitadosSet = new Set(slotsRejeitados.map(s => `${s.diaSemana}-${s.horario}`));

  const allSlotsSorted = sortSlotsByWeekdayAndTime(slotsSolicitados);
  
  const slotsByDay = allSlotsSorted.reduce((acc, slot) => {
    const day = slot.diaSemana;
    if (!acc[day]) acc[day] = [];
    acc[day].push(slot);
    return acc;
  }, {} as Record<string, Slot[]>);

  // Determine display status
  let displayStatus = cancelamento.status;
  if (cancelamento.status === "aprovado" && slotsRejeitados.length > 0 && slotsAprovados.length > 0) {
    displayStatus = "parcial";
  }

  if (displayStatus === "pendente") {
    return (
      <div className="p-4 pl-12 animate-in slide-in-from-top-2 duration-200 space-y-4">
        <div>
          <h4 className="font-medium text-sm text-amber-700 flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4" /> Horários Aguardando Aprovação
          </h4>
          <div className="space-y-3">
            {Object.entries(slotsByDay).map(([day, slots]) => (
              <div key={day} className="flex items-start gap-3">
                <span className="text-sm font-medium text-gray-600 w-20 pt-1">
                  {WEEKDAY_LABELS[day] || day}
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {slots.map((slot, idx) => (
                    <span 
                      key={idx} 
                      className="font-mono text-xs px-2 py-1 rounded bg-amber-100 text-amber-800 border border-amber-200"
                    >
                      {slot.horario}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {cancelamento.motivoDescricao && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <h4 className="font-medium text-sm text-gray-700 mb-1">Descrição do Motivo</h4>
            <p className="text-sm text-gray-600">{cancelamento.motivoDescricao}</p>
          </div>
        )}
      </div>
    );
  }

  if (displayStatus === "rejeitado") {
    return (
      <div className="p-4 pl-12 animate-in slide-in-from-top-2 duration-200 space-y-4">
        <div>
          <h4 className="font-medium text-sm text-red-700 flex items-center gap-2 mb-3">
            <XCircle className="w-4 h-4" /> Todos os Horários Foram Rejeitados
          </h4>
          <div className="space-y-3">
            {Object.entries(slotsByDay).map(([day, slots]) => (
              <div key={day} className="flex items-start gap-3">
                <span className="text-sm font-medium text-gray-600 w-20 pt-1">
                  {WEEKDAY_LABELS[day] || day}
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {slots.map((slot, idx) => (
                    <span 
                      key={idx} 
                      className="font-mono text-xs px-2 py-1 rounded bg-red-100 text-red-800 border border-red-200"
                    >
                      {slot.horario}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {cancelamento.motivoDescricao && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <h4 className="font-medium text-sm text-gray-700 mb-1">Descrição do Motivo</h4>
            <p className="text-sm text-gray-600">{cancelamento.motivoDescricao}</p>
          </div>
        )}

        {cancelamento.motivoRejeicao && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <h4 className="font-medium text-sm text-red-700 flex items-center gap-2 mb-1">
              <AlertCircle className="w-4 h-4" /> Motivo da Rejeição
            </h4>
            <p className="text-sm text-red-600">{cancelamento.motivoRejeicao}</p>
          </div>
        )}

        {cancelamento.processadoPor && (
          <div className="text-xs text-muted-foreground">
            Processado por: {cancelamento.processadoPor.name}
            {cancelamento.processadoEm && ` em ${formatDate(cancelamento.processadoEm)}`}
          </div>
        )}
      </div>
    );
  }

  // Aprovado ou Parcial
  return (
    <div className="p-4 pl-12 animate-in slide-in-from-top-2 duration-200 space-y-4">
      <div className="flex items-center gap-4 text-xs mb-2">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-green-500"></div>
          <span className="text-muted-foreground">Aprovado</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-red-500"></div>
          <span className="text-muted-foreground">Não aprovado</span>
        </div>
      </div>

      <div className="space-y-3">
        {Object.entries(slotsByDay).map(([day, slots]) => (
          <div key={day} className="flex items-start gap-3">
            <span className="text-sm font-medium text-gray-600 w-20 pt-1">
              {WEEKDAY_LABELS[day] || day}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {slots.map((slot, idx) => {
                const slotKey = `${slot.diaSemana}-${slot.horario}`;
                const isAprovado = aprovadosSet.has(slotKey);
                const isRejeitado = rejeitadosSet.has(slotKey);
                
                let className = "font-mono text-xs px-2 py-1 rounded border ";
                if (isAprovado) {
                  className += "bg-green-100 text-green-800 border-green-200";
                } else if (isRejeitado) {
                  className += "bg-red-100 text-red-800 border-red-200";
                } else {
                  // Fallback for approved status if not explicitly in sets (should be approved)
                  className += "bg-green-100 text-green-800 border-green-200";
                }
                
                return (
                  <span key={idx} className={className}>
                    {slot.horario}
                  </span>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {cancelamento.motivoDescricao && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
          <h4 className="font-medium text-sm text-gray-700 mb-1">Descrição do Motivo</h4>
          <p className="text-sm text-gray-600">{cancelamento.motivoDescricao}</p>
        </div>
      )}

      {cancelamento.motivoRejeicao && slotsRejeitados.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <h4 className="font-medium text-sm text-red-700 flex items-center gap-2 mb-1">
            <AlertCircle className="w-4 h-4" /> Motivo dos horários não aprovados
          </h4>
          <p className="text-sm text-red-600">{cancelamento.motivoRejeicao}</p>
        </div>
      )}

      {cancelamento.strikeAplicado && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <h4 className="font-medium text-sm text-amber-700 flex items-center gap-2 mb-1">
            <AlertCircle className="w-4 h-4" /> Strike Aplicado
          </h4>
          <p className="text-sm text-amber-600">
            Um strike foi adicionado ao seu perfil devido a este cancelamento.
          </p>
        </div>
      )}

      {cancelamento.processadoPor && (
        <div className="text-xs text-muted-foreground">
          Processado por: {cancelamento.processadoPor.name}
          {cancelamento.processadoEm && ` em ${formatDate(cancelamento.processadoEm)}`}
        </div>
      )}
    </div>
  );
}

function ExpandedRequestDetails({ request }: { request: any }) {
  const displayStatus = getDisplayStatus(request);
  
  const slotsAprovados: Slot[] = Array.isArray(request.slotsAprovados) ? request.slotsAprovados : [];
  const slotsRejeitados: Slot[] = Array.isArray(request.slotsRejeitados) ? request.slotsRejeitados : [];
  const slotsSolicitados: Slot[] = Array.isArray(request.slots) ? request.slots : [];
  
  const aprovadosSet = new Set(slotsAprovados.map(s => `${s.diaSemana}-${s.horario}`));
  const rejeitadosSet = new Set(slotsRejeitados.map(s => `${s.diaSemana}-${s.horario}`));
  
  const allSlotsSorted = sortSlotsByWeekdayAndTime(slotsSolicitados);
  
  const slotsByDay = allSlotsSorted.reduce((acc, slot) => {
    const day = slot.diaSemana;
    if (!acc[day]) acc[day] = [];
    acc[day].push(slot);
    return acc;
  }, {} as Record<string, Slot[]>);

  if (displayStatus === "pendente") {
    return (
      <div className="p-4 pl-12 animate-in slide-in-from-top-2 duration-200">
        <h4 className="font-medium text-sm text-amber-700 flex items-center gap-2 mb-3">
          <Clock className="w-4 h-4" /> Horários Aguardando Aprovação
        </h4>
        <div className="space-y-3">
          {Object.entries(slotsByDay).map(([day, slots]) => (
            <div key={day} className="flex items-start gap-3">
              <span className="text-sm font-medium text-gray-600 w-20 pt-1">
                {WEEKDAY_LABELS[day] || day}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {slots.map((slot, idx) => (
                  <span 
                    key={idx} 
                    className="font-mono text-xs px-2 py-1 rounded bg-amber-100 text-amber-800 border border-amber-200"
                  >
                    {slot.horario}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (displayStatus === "rejeitada") {
    return (
      <div className="p-4 pl-12 animate-in slide-in-from-top-2 duration-200 space-y-4">
        <div>
          <h4 className="font-medium text-sm text-red-700 flex items-center gap-2 mb-3">
            <XCircle className="w-4 h-4" /> Todos os Horários Foram Rejeitados
          </h4>
          <div className="space-y-3">
            {Object.entries(slotsByDay).map(([day, slots]) => (
              <div key={day} className="flex items-start gap-3">
                <span className="text-sm font-medium text-gray-600 w-20 pt-1">
                  {WEEKDAY_LABELS[day] || day}
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {slots.map((slot, idx) => (
                    <span 
                      key={idx} 
                      className="font-mono text-xs px-2 py-1 rounded bg-red-100 text-red-800 border border-red-200"
                    >
                      {slot.horario}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        {request.motivoRejeicao && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <h4 className="font-medium text-sm text-red-700 flex items-center gap-2 mb-1">
              <AlertCircle className="w-4 h-4" /> Motivo da Rejeição
            </h4>
            <p className="text-sm text-red-600">{request.motivoRejeicao}</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-4 pl-12 animate-in slide-in-from-top-2 duration-200 space-y-4">
      <div className="flex items-center gap-4 text-xs mb-2">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-green-500"></div>
          <span className="text-muted-foreground">Aprovado</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-red-500"></div>
          <span className="text-muted-foreground">Não aprovado</span>
        </div>
      </div>
      
      <div className="space-y-3">
        {Object.entries(slotsByDay).map(([day, slots]) => (
          <div key={day} className="flex items-start gap-3">
            <span className="text-sm font-medium text-gray-600 w-20 pt-1">
              {WEEKDAY_LABELS[day] || day}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {slots.map((slot, idx) => {
                const slotKey = `${slot.diaSemana}-${slot.horario}`;
                const isAprovado = aprovadosSet.has(slotKey);
                const isRejeitado = rejeitadosSet.has(slotKey);
                
                let className = "font-mono text-xs px-2 py-1 rounded border ";
                if (isAprovado) {
                  className += "bg-green-100 text-green-800 border-green-200";
                } else if (isRejeitado) {
                  className += "bg-red-100 text-red-800 border-red-200";
                } else {
                  className += "bg-green-100 text-green-800 border-green-200";
                }
                
                return (
                  <span key={idx} className={className}>
                    {slot.horario}
                  </span>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {request.motivoRejeicao && slotsRejeitados.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-3">
          <h4 className="font-medium text-sm text-red-700 flex items-center gap-2 mb-1">
            <AlertCircle className="w-4 h-4" /> Motivo dos horários não aprovados
          </h4>
          <p className="text-sm text-red-600">{request.motivoRejeicao}</p>
        </div>
      )}
    </div>
  );
}
