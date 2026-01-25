"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { trpc, trpcClient } from "@/utils/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, FileText, CheckCircle, AlertCircle, ArrowLeft, Save, PenTool } from "lucide-react";
import { toast } from "sonner";
import { type ReceitaData, gerarReceitaPdfBase64 } from "@/components/receita/ReceitaPDF";
import { put } from "@vercel/blob";
import { type ProdutoItem } from "./Step2Produtos";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface Step3Props {
  consultingId: number;
  produtos: ProdutoItem[];
  alertas: string;
  onBack: () => void;
  onSuccess: () => void;
}

export function Step3Revisao({ consultingId, produtos, alertas, onBack, onSuccess }: Step3Props) {
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfBase64, setPdfBase64] = useState<string | null>(null);
  const [receitaId, setReceitaId] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [showSignatureModal, setShowSignatureModal] = useState(false);

  const { data: dadosConsulta } = useQuery(
    trpc.receita.buscarDadosConsulta.queryOptions(
      { consultingId },
      { enabled: !!consultingId }
    )
  );

  const { data: credenciaisVidaas } = useQuery(
    trpc.receita.buscarCredenciaisVidaas.queryOptions()
  );

  const criarReceitaMutation = useMutation({
    mutationFn: (input: any) => trpcClient.receita.criarReceita.mutate(input),
  });
  
  const assinarReceitaMutation = useMutation({
    mutationFn: (input: any) => trpcClient.receita.assinarReceita.mutate(input),
  });
  
  const { data: statusAssinatura } = useQuery(
    trpc.receita.statusAssinatura.queryOptions(
      { receitaId: receitaId! },
      { 
        enabled: isPolling && !!receitaId,
        refetchInterval: 2000,
      }
    )
  );

  useEffect(() => {
    if (statusAssinatura?.status === "ASSINADA") {
      setIsPolling(false);
      setShowSignatureModal(false);
      toast.success("Receita assinada com sucesso!");
      onSuccess();
    }
  }, [statusAssinatura, onSuccess]);

  const getReceitaData = (): ReceitaData | null => {
    if (!dadosConsulta) return null;

    return {
      medico: {
        nome: "Médico",
        crm: "00000",
        uf: "UF",
        endereco: "Endereço do Consultório",
      },
      paciente: {
        nome: dadosConsulta.paciente.nome,
      },
      produtos: produtos.map(p => ({
        nome: p.nome,
        concentracao: p.concentracao || "",
        quantidade: p.quantidade,
        posologia: p.posologia,
      })),
      dataEmissao: new Date(),
    };
  };

  const handlePreview = async () => {
    const data = getReceitaData();
    if (!data) return;

    setIsGeneratingPdf(true);
    try {
      const base64 = await gerarReceitaPdfBase64(data);
      setPdfBase64(base64);
      
      const byteCharacters = atob(base64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
    } catch (error) {
      toast.error("Erro ao gerar pré-visualização do PDF");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!dadosConsulta) return;

    try {
      const receita = await criarReceitaMutation.mutateAsync({
        consultaClickId: consultingId,
        pacienteNome: dadosConsulta.paciente.nome,
        pacienteEndereco: dadosConsulta.paciente.endereco,
        produtos: produtos.map(p => ({
          nome: p.nome,
          quantidade: p.quantidade,
          posologia: p.posologia,
          concentracao: p.concentracao,
        })),
        alertas,
        posologia: produtos.map(p => `${p.nome}: ${p.posologia}`).join("\n"),
      });

      setReceitaId(receita.id);
      toast.success("Rascunho salvo com sucesso!");
      onSuccess();
    } catch (error) {
      toast.error("Erro ao salvar rascunho");
    }
  };

  const handleSign = async () => {
    if (!dadosConsulta) return;
    if (!credenciaisVidaas?.isConfigured) {
      toast.error("Configure suas credenciais VIDaaS antes de assinar.");
      return;
    }

    try {
      setShowSignatureModal(true);
      
      let currentReceitaId = receitaId;
      if (!currentReceitaId) {
        const receita = await criarReceitaMutation.mutateAsync({
          consultaClickId: consultingId,
          pacienteNome: dadosConsulta.paciente.nome,
          pacienteEndereco: dadosConsulta.paciente.endereco,
          produtos: produtos.map(p => ({
            nome: p.nome,
            quantidade: p.quantidade,
            posologia: p.posologia,
            concentracao: p.concentracao,
          })),
          alertas,
          posologia: produtos.map(p => `${p.nome}: ${p.posologia}`).join("\n"),
        });
        currentReceitaId = receita.id;
        setReceitaId(receita.id);
      }

      const data = getReceitaData();
      if (!data) throw new Error("Dados incompletos");
      const base64 = await gerarReceitaPdfBase64(data);

      setIsPolling(true);
      await assinarReceitaMutation.mutateAsync({
        receitaId: currentReceitaId,
        pdfBase64: base64,
      });
      
    } catch (error) {
      setShowSignatureModal(false);
      setIsPolling(false);
      toast.error("Erro ao iniciar processo de assinatura");
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-gray-900">Revisar e Assinar</h2>
        <p className="text-sm text-gray-500">
          Confira os dados da receita antes de finalizar.
        </p>
      </div>

      <Card className="p-6 border-gray-200 space-y-6">
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Paciente</h3>
            <p className="text-lg font-medium text-gray-900">{dadosConsulta?.paciente.nome}</p>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">Medicamentos</h3>
            <div className="space-y-3">
              {produtos.map((p, i) => (
                <div key={i} className="bg-gray-50 p-3 rounded-md border border-gray-100">
                  <div className="flex justify-between font-medium text-gray-900">
                    <span>{p.nome}</span>
                    <span className="text-gray-500 text-sm">{p.quantidade} un.</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{p.posologia}</p>
                </div>
              ))}
            </div>
          </div>

          {alertas && (
            <div>
              <h3 className="text-sm font-medium text-amber-600 uppercase tracking-wider flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Alertas
              </h3>
              <p className="text-sm text-gray-700 mt-1 bg-amber-50 p-3 rounded-md border border-amber-100">
                {alertas}
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-center pt-2">
          <Button
            variant="outline"
            onClick={handlePreview}
            disabled={isGeneratingPdf}
            className="w-full sm:w-auto"
          >
            {isGeneratingPdf ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FileText className="mr-2 h-4 w-4" />
            )}
            Visualizar PDF
          </Button>
        </div>
      </Card>

      <div className="flex flex-col-reverse sm:flex-row justify-between gap-4 pt-4">
        <Button variant="outline" onClick={onBack} disabled={isPolling}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            variant="secondary"
            onClick={handleSaveDraft}
            disabled={criarReceitaMutation.isPending || isPolling}
          >
            <Save className="mr-2 h-4 w-4" />
            Salvar Rascunho
          </Button>
          
          <Button
            onClick={handleSign}
            disabled={assinarReceitaMutation.isPending || isPolling || !credenciaisVidaas?.isConfigured}
            className="bg-brand-600 hover:bg-brand-700 text-white"
          >
            {isPolling ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <PenTool className="mr-2 h-4 w-4" />
            )}
            Assinar Digitalmente
          </Button>
        </div>
      </div>

      <Dialog open={showSignatureModal} onOpenChange={setShowSignatureModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Assinando Receita</DialogTitle>
            <DialogDescription>
              Aguardando autorização no aplicativo VIDaaS. Por favor, confirme a assinatura no seu celular.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <div className="relative">
              <div className="absolute inset-0 bg-brand-100 rounded-full animate-ping opacity-75"></div>
              <div className="relative bg-brand-50 p-4 rounded-full">
                <Loader2 className="h-8 w-8 text-brand-600 animate-spin" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground text-center max-w-xs">
              Não feche esta janela até a confirmação.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
