"use client";

import { useQuery, useMutation } from "@tanstack/react-query";
import { trpc, queryClient } from "@/utils/trpc";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

export function SatisfacaoTab() {
  const { data: pendentes, isLoading } = useQuery({
    ...trpc.formularios.listarMedicosPendentes.queryOptions(undefined),
  });
  
  const reenviarMutation = useMutation(
    trpc.formularios.reenviarNotificacaoSatisfacao.mutationOptions({
      onSuccess: (data) => {
        if (data.sucesso) {
          toast.success(`Email enviado para ${data.emailsEnviados} médico(s)!`);
        } else {
          toast.warning(
            `Enviado para ${data.emailsEnviados}. ${data.erros.length} erro(s).`
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
    reenviarMutation.mutate({ medicoIds: [medicoId] });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-[300px] rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
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
    </div>
  );
}
