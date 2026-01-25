"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { CheckCircle2, XCircle, Loader2, FileText, User, Calendar, Shield } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function VerificarReceitaPage() {
  const params = useParams();
  const receitaId = params.id as string;

  const { data, isLoading, isError } = useQuery(
    trpc.receita.verificarReceita.queryOptions(
      { receitaId },
      { enabled: !!receitaId, retry: false }
    )
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <Loader2 className="h-12 w-12 animate-spin text-brand-600 mx-auto mb-4" />
            <p className="text-gray-600">Verificando receita...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-red-200">
          <CardContent className="p-8 text-center">
            <div className="bg-red-100 p-4 rounded-full w-fit mx-auto mb-4">
              <XCircle className="h-12 w-12 text-red-600" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Receita Nao Encontrada</h1>
            <p className="text-gray-600 text-sm">
              O codigo informado nao corresponde a nenhuma receita valida em nosso sistema.
            </p>
            <p className="text-xs text-gray-400 mt-4 font-mono">{receitaId}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isValid = data.status === "ASSINADA";

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className={`w-full max-w-md ${isValid ? "border-green-200" : "border-yellow-200"}`}>
        <CardContent className="p-8">
          <div className="text-center mb-6">
            <div className={`p-4 rounded-full w-fit mx-auto mb-4 ${isValid ? "bg-green-100" : "bg-yellow-100"}`}>
              {isValid ? (
                <CheckCircle2 className="h-12 w-12 text-green-600" />
              ) : (
                <FileText className="h-12 w-12 text-yellow-600" />
              )}
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-1">
              {isValid ? "Receita Verificada" : "Receita Pendente"}
            </h1>
            <p className="text-sm text-gray-600">
              {isValid 
                ? "Este documento foi assinado digitalmente e e valido."
                : "Esta receita ainda nao foi assinada digitalmente."
              }
            </p>
          </div>

          <div className="space-y-4 border-t pt-4">
            <div className="flex items-start gap-3">
              <User className="h-5 w-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Medico</p>
                <p className="font-medium text-gray-900">{data.medicoNome}</p>
                <p className="text-sm text-gray-600">CRM: {data.medicoCrm}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <User className="h-5 w-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Paciente</p>
                <p className="font-medium text-gray-900">{data.pacienteNome}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Data de Emissao</p>
                <p className="font-medium text-gray-900">
                  {new Date(data.dataEmissao).toLocaleDateString("pt-BR")}
                </p>
              </div>
            </div>

            {isValid && data.dataAssinatura && (
              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-green-500 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Assinatura Digital</p>
                  <p className="font-medium text-gray-900">
                    {new Date(data.dataAssinatura).toLocaleString("pt-BR")}
                  </p>
                  <p className="text-xs text-green-600">ICP-Brasil (VIDaaS)</p>
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t text-center">
            <p className="text-xs text-gray-400">Codigo de Verificacao</p>
            <p className="font-mono text-xs text-gray-600 break-all">{receitaId}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
