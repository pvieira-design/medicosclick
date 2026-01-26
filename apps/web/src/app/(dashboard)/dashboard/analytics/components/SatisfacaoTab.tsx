"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { trpc, queryClient } from "@/utils/trpc";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { CheckCircle2, Clock, Star, TrendingUp, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

function StatCard({ icon: Icon, label, value, color }: { 
  icon: any; 
  label: string; 
  value: number | string; 
  color: string;
}) {
  return (
    <div className="rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className={`p-2 rounded-lg ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className="text-3xl font-bold text-gray-900 dark:text-gray-50">{value}</div>
      <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">{label}</div>
    </div>
  );
}

const getNpsColor = (nps: number) => {
  if (nps >= 9) return "bg-green-100 text-green-700 border-green-200";
  if (nps >= 7) return "bg-yellow-100 text-yellow-700 border-yellow-200";
  return "bg-red-100 text-red-700 border-red-200";
};

const getFaixaColor = (faixa: string) => {
  switch (faixa) {
    case "P1": return "bg-green-700 text-white";
    case "P2": return "bg-green-500 text-white";
    case "P3": return "bg-yellow-500 text-black";
    case "P4": return "bg-orange-500 text-white";
    case "P5": return "bg-red-500 text-white";
    default: return "bg-gray-200 text-gray-800";
  }
};

export function SatisfacaoTab() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [medicoSelecionado, setMedicoSelecionado] = useState<string | null>(null);

  const { data: stats, isLoading: isLoadingStats } = useQuery({
    ...trpc.formularios.getEstatisticasSatisfacao.queryOptions(undefined),
  });

  const { data: pendentes, isLoading } = useQuery({
    ...trpc.formularios.listarMedicosPendentes.queryOptions(undefined),
  });

  const { data: responderam, isLoading: isLoadingResponderam } = useQuery({
    ...trpc.formularios.listarMedicosQueResponderam.queryOptions(undefined),
  });
  
  const reenviarMutation = useMutation(
    trpc.formularios.reenviarNotificacaoSatisfacao.mutationOptions({
      onSuccess: (data) => {
        if (data.sucesso) {
          toast.success(`Enviado para ${data.emailsEnviados} médico(s)!`);
        } else {
          const erroDetalhes = data.erros.map(e => e.erro).join(', ');
          toast.warning(
            `Enviado para ${data.emailsEnviados}. ${data.erros.length} erro(s): ${erroDetalhes}`
          );
        }
        queryClient.invalidateQueries();
      },
      onError: (error) => {
        toast.error(`Erro: ${error.message}`);
      },
    })
  );

  const handleReenviar = (medicoId: string) => {
    setMedicoSelecionado(medicoId);
    setDialogOpen(true);
  };

  const executarEnvio = (tipoEnvio: 'notificacao' | 'email' | 'ambos') => {
    if (!medicoSelecionado) return;
    reenviarMutation.mutate({ 
      medicoIds: [medicoSelecionado],
      tipoEnvio 
    });
    setDialogOpen(false);
    setMedicoSelecionado(null);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
          <Skeleton className="h-[140px] rounded-xl" />
          <Skeleton className="h-[140px] rounded-xl" />
          <Skeleton className="h-[140px] rounded-xl" />
          <Skeleton className="h-[140px] rounded-xl" />
        </div>
        <Skeleton className="h-[300px] rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        {isLoadingStats ? (
          <>
            <Skeleton className="h-[140px] rounded-xl" />
            <Skeleton className="h-[140px] rounded-xl" />
            <Skeleton className="h-[140px] rounded-xl" />
            <Skeleton className="h-[140px] rounded-xl" />
          </>
        ) : (
          <>
            <StatCard 
              icon={CheckCircle2} 
              label="Total Responderam" 
              value={stats?.totalResponderam ?? 0} 
              color="bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
            />
            <StatCard 
              icon={Clock} 
              label="Total Pendentes" 
              value={stats?.totalPendentes ?? 0} 
              color="bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
            />
            <StatCard 
              icon={Star} 
              label="NPS Suporte" 
              value={stats?.mediaSuporte?.toFixed(1) ?? "0.0"} 
              color="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
            />
            <StatCard 
              icon={TrendingUp} 
              label="NPS Ferramentas" 
              value={stats?.mediaFerramentas?.toFixed(1) ?? "0.0"} 
              color="bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400"
            />
          </>
        )}
      </div>

      <div className="rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50 mb-4">
          Médicos que Responderam ({responderam?.totalRespostas || 0})
        </h3>
        
        {isLoadingResponderam ? (
          <Skeleton className="h-[200px] rounded-xl" />
        ) : responderam && responderam.respostas.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/50 dark:bg-slate-900/50">
                <TableRow className="border-slate-100 hover:bg-transparent">
                  <TableHead className="py-4 font-medium text-slate-500">Médico</TableHead>
                  <TableHead className="py-4 font-medium text-slate-500">Faixa</TableHead>
                  <TableHead className="py-4 font-medium text-slate-500">NPS Suporte</TableHead>
                  <TableHead className="py-4 font-medium text-slate-500">NPS Ferramentas</TableHead>
                  <TableHead className="py-4 font-medium text-slate-500">Data</TableHead>
                  <TableHead className="text-right py-4 pr-6 font-medium text-slate-500">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {responderam.respostas.map((resposta) => (
                  <TableRow key={resposta.id} className="border-slate-50 hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                    <TableCell className="py-4 pl-6 font-medium text-gray-900 dark:text-gray-50">
                      {resposta.user.name}
                    </TableCell>
                    <TableCell className="py-4">
                      {resposta.user.faixa ? (
                        <Badge className={`${getFaixaColor(resposta.user.faixa)} font-medium px-2.5 py-0.5 border-0`}>
                          {resposta.user.faixa}
                        </Badge>
                      ) : (
                        <span className="text-slate-400 text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell className="py-4">
                      <Badge variant="outline" className={`${getNpsColor(resposta.npsSuporte)} border`}>
                        {resposta.npsSuporte}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-4">
                      <Badge variant="outline" className={`${getNpsColor(resposta.npsFerramentas)} border`}>
                        {resposta.npsFerramentas}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-4 text-gray-600 dark:text-gray-400">
                      {new Date(resposta.respondidoEm).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell className="text-right py-4 pr-6">
                      {resposta.sugestoes && resposta.sugestoes.trim() !== "" && (
                        <Dialog>
                          <DialogTrigger>
                            <Button variant="ghost" size="sm" className="h-8 text-xs">
                              <MessageSquare className="h-4 w-4 mr-2" />
                              Ver Sugestões
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Sugestões de {resposta.user.name}</DialogTitle>
                            </DialogHeader>
                            <div className="py-4">
                              <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{resposta.sugestoes}</p>
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400">Nenhum médico respondeu ainda este mês.</p>
          </div>
        )}
      </div>

      <div className="rounded-xl bg-white dark:bg-gray-900 shadow-sm ring-1 ring-gray-200 dark:ring-gray-800 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50 mb-4">
          Médicos Pendentes de Satisfação
        </h3>
        
        {!pendentes?.dentroJanela && (
          <div className="mb-4 p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              A janela de resposta está fechada. Abre no dia 1 de cada mês.
            </p>
          </div>
        )}

        {pendentes && pendentes.medicosPendentes.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/50 dark:bg-slate-900/50">
                <TableRow className="border-slate-100 hover:bg-transparent">
                  <TableHead className="py-4 font-medium text-slate-500">
                    Médico
                  </TableHead>
                  <TableHead className="py-4 font-medium text-slate-500">
                    Email
                  </TableHead>
                  <TableHead className="py-4 font-medium text-slate-500">
                    Faixa
                  </TableHead>
                  <TableHead className="text-right py-4 pr-6 font-medium text-slate-500">
                    Ações
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendentes.medicosPendentes.map((medico) => (
                  <TableRow
                    key={medico.id}
                    className="border-slate-50 hover:bg-slate-50/50 dark:hover:bg-slate-800/50"
                  >
                    <TableCell className="py-4 pl-6 font-medium text-gray-900 dark:text-gray-50">
                      {medico.name}
                    </TableCell>
                    <TableCell className="py-4 text-gray-600 dark:text-gray-400">
                      {medico.email}
                    </TableCell>
                    <TableCell className="py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200">
                        {medico.faixa || "N/A"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right py-4 pr-6">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => handleReenviar(medico.id)}
                        disabled={reenviarMutation.isPending}
                      >
                        {reenviarMutation.isPending ? "Enviando..." : "Reenviar"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400">
              Nenhum médico pendente de resposta.
            </p>
          </div>
        )}
      </div>

      <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Como deseja enviar?</AlertDialogTitle>
            <AlertDialogDescription>
              Escolha como o médico será notificado sobre a pesquisa de satisfação.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="grid gap-3 py-4">
            <Button 
              variant="outline" 
              className="justify-start h-auto py-3 px-4"
              onClick={() => executarEnvio('notificacao')}
            >
              <div className="text-left w-full">
                <div className="font-medium">Apenas Notificação</div>
                <div className="text-xs text-muted-foreground">
                  Cria notificação no sistema (sem email)
                </div>
              </div>
            </Button>
            
            <Button 
              variant="outline" 
              className="justify-start h-auto py-3 px-4"
              onClick={() => executarEnvio('email')}
            >
              <div className="text-left w-full">
                <div className="font-medium">Apenas Email</div>
                <div className="text-xs text-muted-foreground">
                  Envia email (requer domínio verificado)
                </div>
              </div>
            </Button>
            
            <Button 
              variant="default" 
              className="justify-start h-auto py-3 px-4 bg-gradient-brand"
              onClick={() => executarEnvio('ambos')}
            >
              <div className="text-left w-full text-white">
                <div className="font-medium">Notificação + Email</div>
                <div className="text-xs opacity-90">
                  Ambas as formas de notificação
                </div>
              </div>
            </Button>
          </div>
          
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
