"use client";

import { useState } from "react";
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
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
  ShieldAlert
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

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
      return <Badge variant="destructive" className="bg-red-100 text-red-700 hover:bg-red-200 border-red-200">Doenca</Badge>;
    case "emergencia_familiar":
      return <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-200">Emergencia Familiar</Badge>;
    case "compromisso_medico":
      return <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-200">Compromisso Medico</Badge>;
    case "problema_tecnico":
      return <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-200">Problema Tecnico</Badge>;
    default:
      return <Badge variant="outline">Outro</Badge>;
  }
};

export default function CancelamentosClient() {
  const [page, setPage] = useState(1);
  const [rejectionReason, setRejectionReason] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isApproveOpen, setIsApproveOpen] = useState(false);
  const [isRejectOpen, setIsRejectOpen] = useState(false);

  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery(trpc.aprovacoes.listarCancelamentos.queryOptions({
    status: "pendente",
    page,
    perPage: 10,
  }));

  const approveMutation = useMutation({
    mutationFn: (input: { cancelamentoId: string }) => 
      trpcClient.aprovacoes.aprovarCancelamento.mutate(input),
    onSuccess: () => {
      toast.success("Cancelamento aprovado. Strike aplicado ao medico.");
      queryClient.invalidateQueries();
      setIsApproveOpen(false);
      setSelectedId(null);
    },
    onError: (err: { message: string }) => {
      toast.error(`Erro ao aprovar: ${err.message}`);
    }
  });

  const rejectMutation = useMutation({
    mutationFn: (input: { cancelamentoId: string; motivoRejeicao: string }) => 
      trpcClient.aprovacoes.rejeitarCancelamento.mutate(input),
    onSuccess: () => {
      toast.success("Solicitacao de cancelamento rejeitada.");
      queryClient.invalidateQueries();
      setIsRejectOpen(false);
      setSelectedId(null);
      setRejectionReason("");
    },
    onError: (err: { message: string }) => {
      toast.error(`Erro ao rejeitar: ${err.message}`);
    }
  });

  const handleApprove = () => {
    if (selectedId) {
      approveMutation.mutate({ cancelamentoId: selectedId });
    }
  };

  const handleReject = () => {
    if (selectedId) {
      rejectMutation.mutate({ cancelamentoId: selectedId, motivoRejeicao: rejectionReason });
    }
  };

  const openApprove = (id: string) => {
    setSelectedId(id);
    setIsApproveOpen(true);
  };

  const openReject = (id: string) => {
    setSelectedId(id);
    setIsRejectOpen(true);
  };

  return (
    <div className="container mx-auto py-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50 flex items-center gap-3">
          <CalendarOff className="h-8 w-8 text-rose-500" />
          Cancelamentos de Emergencia
        </h1>
        <p className="text-muted-foreground max-w-2xl text-lg">
          Gerencie solicitacoes de cancelamento de ultima hora. <br/>
          <span className="text-rose-600 font-medium">Atencao:</span> Aprovar um cancelamento gera um strike automatico para o medico.
        </p>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center h-64 space-y-4">
          <div className="relative">
            <div className="h-12 w-12 rounded-full border-4 border-slate-200 opacity-30"></div>
            <div className="absolute top-0 h-12 w-12 rounded-full border-4 border-rose-500 border-t-transparent animate-spin"></div>
          </div>
          <p className="text-muted-foreground animate-pulse">Carregando solicitacoes...</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50 dark:bg-slate-900/50">
                <TableRow>
                  <TableHead className="w-[250px]">Medico</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Afeta</TableHead>
                  <TableHead>Solicitado em</TableHead>
                  <TableHead>Strikes Atuais</TableHead>
                  <TableHead className="text-right">Acoes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.cancelamentos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <CheckCircle2 className="h-8 w-8 text-green-500/50" />
                        <p>Nenhuma solicitacao pendente.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  (data?.cancelamentos as any[])?.map((item) => (
                    <TableRow key={item.id} className="group transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-900/50">
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-900 dark:text-slate-100">{item.medico.name}</span>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                            <Stethoscope className="h-3 w-3" />
                            <span>CRM: {item.medico.id}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {getMotiveBadge(item.motivoCategoria)}
                          <p className="text-sm text-muted-foreground max-w-[200px] truncate" title={item.motivoDescricao ?? undefined}>
                            {item.motivoDescricao}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-mono">
                          {Array.isArray(item.slots) ? item.slots.length : 0} slots
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        <div className="flex items-center gap-2">
                          <Clock className="h-3 w-3" />
                          {formatDate(item.createdAt)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {item.medico.strikes >= 2 ? (
                            <Badge variant="destructive" className="gap-1 animate-pulse">
                              <AlertTriangle className="h-3 w-3" />
                              {item.medico.strikes} Strikes
                            </Badge>
                          ) : (
                            <div className="flex gap-1">
                              {[...Array(3)].map((_, i) => (
                                <div 
                                  key={i} 
                                  className={`h-2 w-2 rounded-full ${i < item.medico.strikes ? 'bg-amber-500' : 'bg-slate-200 dark:bg-slate-700'}`}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2 opacity-100 transition-opacity">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 dark:border-red-900/30"
                            onClick={() => openReject(item.id)}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Rejeitar
                          </Button>
                          <Button 
                            size="sm" 
                            className="bg-brand-600 hover:bg-brand-700 text-white shadow-sm"
                            onClick={() => openApprove(item.id)}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            Aprovar
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
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
                    Pagina {page} de {data?.pages ?? 1}
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

      <Dialog open={isApproveOpen} onOpenChange={setIsApproveOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600">
              <ShieldAlert className="h-5 w-5" />
              Confirmar Aprovacao e Strike
            </DialogTitle>
            <DialogDescription>
              Voce esta prestes a aprovar o cancelamento desta agenda.
            </DialogDescription>
          </DialogHeader>
          
          <Alert variant="destructive" className="bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-900/20 dark:border-rose-900">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Acao com Penalidade</AlertTitle>
            <AlertDescription>
              Ao aprovar, um <strong>Strike</strong> sera automaticamente adicionado ao perfil do medico. Se o medico atingir 3 strikes, ele podera ser suspenso.
            </AlertDescription>
          </Alert>

          <DialogFooter className="gap-2 sm:justify-end">
            <Button variant="ghost" onClick={() => setIsApproveOpen(false)}>Cancelar</Button>
            <Button 
              variant="destructive" 
              onClick={handleApprove}
              disabled={approveMutation.isPending}
            >
              {approveMutation.isPending ? "Processando..." : "Confirmar e Aplicar Strike"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isRejectOpen} onOpenChange={setIsRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeitar Solicitacao</DialogTitle>
            <DialogDescription>
              O medico sera notificado que o cancelamento nao foi aceito.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-2 py-4">
            <Label htmlFor="reason">Motivo da Rejeicao</Label>
            <Textarea 
              id="reason" 
              placeholder="Explique por que o cancelamento nao pode ser aceito..." 
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="min-h-[100px]"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRejectOpen(false)}>Cancelar</Button>
            <Button 
              onClick={handleReject}
              disabled={!rejectionReason.trim() || rejectMutation.isPending}
              className="bg-slate-900 text-white hover:bg-slate-800"
            >
              {rejectMutation.isPending ? "Enviando..." : "Rejeitar Solicitacao"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
