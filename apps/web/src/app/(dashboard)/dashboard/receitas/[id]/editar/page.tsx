"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { trpc, trpcClient } from "@/utils/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Loader2,
  Plus,
  Trash2,
  ArrowLeft,
  ArrowRight,
  AlertTriangle,
  FileText,
  Save,
  PenTool,
  AlertCircle,
  CheckCircle2,
  Download,
} from "lucide-react";
import { type ReceitaData, gerarReceitaPdfBase64 } from "@/components/receita/ReceitaPDF";
import { type ProdutoItem } from "@/components/receita/wizard/Step2Produtos";

export default function EditarReceitaPage() {
  const router = useRouter();
  const params = useParams();
  const queryClient = useQueryClient();
  const receitaId = params.id as string;

  const [step, setStep] = useState(1);
  const [produtos, setProdutos] = useState<ProdutoItem[]>([]);
  const [alertas, setAlertas] = useState("");
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  const { data: receita, isLoading: isLoadingReceita, isError } = useQuery(
    trpc.receita.buscarReceita.queryOptions(
      { receitaId },
      { enabled: !!receitaId }
    )
  );

  const { data: listaProdutos, isLoading: isLoadingProdutos } = useQuery(
    trpc.receita.listarProdutos.queryOptions()
  );

  const { data: credenciaisVidaas } = useQuery(
    trpc.receita.buscarCredenciaisVidaas.queryOptions()
  );

  const receitaIdLoaded = receita?.id;
  const receitaAlertasStr = receita?.alertas ?? "";
  const receitaProdutosStr = receita ? JSON.stringify((receita as { produtos: unknown }).produtos) : "";
  
  useEffect(() => {
    if (receitaIdLoaded && !isInitialized) {
      type ProdutoRaw = { id?: string; nome: string; concentracao?: string; quantidade: number; posologia: string };
      const produtosRaw = receitaProdutosStr ? (JSON.parse(receitaProdutosStr) as ProdutoRaw[]) : [];
      
      if (produtosRaw.length > 0) {
        setProdutos(
          produtosRaw.map((p, i) => ({
            id: p.id || String(i + 1),
            nome: p.nome,
            concentracao: p.concentracao,
            quantidade: p.quantidade,
            posologia: p.posologia,
          }))
        );
      } else {
        setProdutos([{ id: "1", nome: "", quantidade: 1, posologia: "" }]);
      }
      setAlertas(receitaAlertasStr);
      setIsInitialized(true);
    }
  }, [receitaIdLoaded, isInitialized, receitaProdutosStr, receitaAlertasStr]);

  const { data: statusAssinatura } = useQuery(
    trpc.receita.statusAssinatura.queryOptions(
      { receitaId },
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
      setIsSuccess(true);
    }
  }, [statusAssinatura]);

  const atualizarReceitaMutation = useMutation({
    mutationFn: (input: any) => trpcClient.receita.atualizarReceita.mutate(input),
    onSuccess: () => {
      queryClient.invalidateQueries();
    },
  });

  const assinarReceitaMutation = useMutation({
    mutationFn: (input: any) => trpcClient.receita.assinarReceita.mutate(input),
  });

  const addProduto = () => {
    setProdutos([
      ...produtos,
      { id: Math.random().toString(36).substr(2, 9), nome: "", quantidade: 1, posologia: "" },
    ]);
  };

  const removeProduto = (id: string) => {
    if (produtos.length > 1) {
      setProdutos(produtos.filter((p) => p.id !== id));
    }
  };

  const updateProduto = (id: string, field: keyof ProdutoItem, value: any) => {
    setProdutos(produtos.map((p) => (p.id === id ? { ...p, [field]: value } : p)));
  };

  const isValid = produtos.every((p) => p.nome && p.quantidade > 0 && p.posologia);

  const handleGoToReview = () => {
    if (isValid) {
      setStep(2);
    }
  };

  const getReceitaData = (): ReceitaData | null => {
    if (!receita || !credenciaisVidaas) return null;

    const crmParts = credenciaisVidaas.crm?.split("-") || [];
    const uf = crmParts.length > 1 ? crmParts[1] : "UF";

    return {
      medico: {
        nome: credenciaisVidaas.name || "Medico",
        crm: credenciaisVidaas.crm || "00000",
        uf: uf,
        endereco: credenciaisVidaas.enderecoConsultorio || "Endereco do Consultorio",
      },
      paciente: {
        nome: receita.pacienteNome,
      },
      produtos: produtos.map((p) => ({
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
      toast.error("Erro ao gerar pre-visualizacao do PDF");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleSave = async () => {
    try {
      await atualizarReceitaMutation.mutateAsync({
        receitaId,
        produtos: produtos.map((p) => ({
          nome: p.nome,
          quantidade: p.quantidade,
          posologia: p.posologia,
          concentracao: p.concentracao,
        })),
        alertas,
        posologia: produtos.map((p) => `${p.nome}: ${p.posologia}`).join("\n"),
      });
      toast.success("Receita atualizada com sucesso!");
      router.push("/dashboard/receitas" as any);
    } catch (error) {
      toast.error("Erro ao salvar receita");
    }
  };

  const handleSign = async () => {
    if (!credenciaisVidaas?.isConfigured) {
      toast.error("Configure suas credenciais VIDaaS antes de assinar.");
      return;
    }

    try {
      setShowSignatureModal(true);

      await atualizarReceitaMutation.mutateAsync({
        receitaId,
        produtos: produtos.map((p) => ({
          nome: p.nome,
          quantidade: p.quantidade,
          posologia: p.posologia,
          concentracao: p.concentracao,
        })),
        alertas,
        posologia: produtos.map((p) => `${p.nome}: ${p.posologia}`).join("\n"),
      });

      const data = getReceitaData();
      if (!data) throw new Error("Dados incompletos");
      const base64 = await gerarReceitaPdfBase64(data);

      setIsPolling(true);
      await assinarReceitaMutation.mutateAsync({
        receitaId,
        pdfBase64: base64,
      });
    } catch (error) {
      setShowSignatureModal(false);
      setIsPolling(false);
      toast.error("Erro ao iniciar processo de assinatura");
    }
  };

  if (isLoadingReceita || isLoadingProdutos) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
        <p className="text-sm text-muted-foreground">Carregando receita...</p>
      </div>
    );
  }

  if (isError || !receita) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <AlertCircle className="h-12 w-12 text-red-500" />
        <h2 className="text-xl font-semibold text-gray-900">Receita nao encontrada</h2>
        <p className="text-sm text-muted-foreground">A receita solicitada nao existe ou foi removida.</p>
        <Button variant="outline" onClick={() => router.push("/dashboard/receitas" as any)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar para Lista
        </Button>
      </div>
    );
  }

  if (receita.status === "ASSINADA") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <div className="bg-green-100 p-6 rounded-full">
          <CheckCircle2 className="h-16 w-16 text-green-600" />
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-gray-900">Receita Ja Assinada</h2>
          <p className="text-gray-500 max-w-md">
            Esta receita ja foi assinada e nao pode ser editada.
          </p>
        </div>
        <div className="flex gap-4">
          <Button variant="outline" onClick={() => router.push("/dashboard/receitas" as any)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para Lista
          </Button>
          {receita.pdfUrl && (
            <Button
              className="bg-brand-600 hover:bg-brand-700 text-white"
              onClick={() => window.open(receita.pdfUrl!, "_blank")}
            >
              <Download className="mr-2 h-4 w-4" />
              Baixar PDF
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Success state after signing
  if (isSuccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6 animate-in fade-in zoom-in duration-500">
        <div className="bg-green-100 p-6 rounded-full">
          <CheckCircle2 className="h-16 w-16 text-green-600" />
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-gray-900">Receita Assinada com Sucesso!</h2>
          <p className="text-gray-500 max-w-md">A receita foi atualizada e assinada.</p>
        </div>
        <div className="flex gap-4">
          <Button variant="outline" onClick={() => router.push("/dashboard/receitas" as any)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para Lista
          </Button>
          <Button className="bg-brand-600 hover:bg-brand-700 text-white">
            <Download className="mr-2 h-4 w-4" />
            Baixar PDF
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Editar Receita</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Paciente: <span className="font-medium text-gray-900">{receita.pacienteNome}</span>
        </p>
        <div className="flex items-center mt-4">
          <div className="flex items-center w-full">
            <div
              className={`flex items-center justify-center w-8 h-8 rounded-full ${
                step >= 1 ? "bg-brand-600 text-white" : "bg-gray-200 text-gray-500"
              } font-semibold text-sm`}
            >
              1
            </div>
            <div className={`flex-1 h-1 mx-2 ${step >= 2 ? "bg-brand-600" : "bg-gray-200"}`} />
            <div
              className={`flex items-center justify-center w-8 h-8 rounded-full ${
                step >= 2 ? "bg-brand-600 text-white" : "bg-gray-200 text-gray-500"
              } font-semibold text-sm`}
            >
              2
            </div>
          </div>
        </div>
        <div className="flex justify-between mt-2 text-xs text-gray-500 font-medium">
          <span>Produtos e Posologia</span>
          <span className="text-right">Revisar e Assinar</span>
        </div>
      </div>

      <Card className="p-6 border-gray-200 shadow-none">
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-gray-900">Produtos e Posologia</h2>
              <p className="text-sm text-gray-500">
                Edite os medicamentos e instrucoes de uso para o paciente.
              </p>
            </div>

            <div className="space-y-4">
              {produtos.map((produto, index) => (
                <Card key={produto.id} className="p-4 border-gray-200 relative group">
                  {produtos.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2 text-gray-400 hover:text-red-600 hover:bg-red-50"
                      onClick={() => removeProduto(produto.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}

                  <div className="grid gap-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="md:col-span-3 space-y-2">
                        <Label>Produto {index + 1}</Label>
                        <Select
                          value={produto.nome}
                          onValueChange={(value) => updateProduto(produto.id, "nome", value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione um produto" />
                          </SelectTrigger>
                          <SelectContent>
                            {listaProdutos?.map((p: any) => (
                              <SelectItem key={p.id || p.name} value={p.name}>
                                {p.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Quantidade</Label>
                        <Input
                          type="number"
                          min={1}
                          value={produto.quantidade}
                          onChange={(e) =>
                            updateProduto(produto.id, "quantidade", parseInt(e.target.value) || 0)
                          }
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Posologia</Label>
                      <Textarea
                        placeholder="Ex: Tomar 1 capsula via oral 2 vezes ao dia..."
                        value={produto.posologia}
                        onChange={(e) => updateProduto(produto.id, "posologia", e.target.value)}
                        className="min-h-[80px]"
                      />
                    </div>
                  </div>
                </Card>
              ))}

              <Button
                variant="outline"
                onClick={addProduto}
                className="w-full border-dashed border-gray-300 text-gray-600 hover:border-brand-500 hover:text-brand-600 hover:bg-brand-50"
              >
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Produto
              </Button>
            </div>

            <div className="space-y-2 pt-4">
              <Label className="flex items-center gap-2 text-amber-600">
                <AlertTriangle className="h-4 w-4" />
                Alertas e Observacoes (Opcional)
              </Label>
              <Textarea
                placeholder="Ex: Suspender uso em caso de reacao alergica..."
                value={alertas}
                onChange={(e) => setAlertas(e.target.value)}
                className="min-h-[80px] border-amber-200 focus:border-amber-500 focus:ring-amber-500/20"
              />
            </div>

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => router.push("/dashboard/receitas" as any)}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Cancelar
              </Button>
              <Button
                onClick={handleGoToReview}
                disabled={!isValid}
                className="bg-brand-600 hover:bg-brand-700 text-white min-w-[120px]"
              >
                Revisar
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-gray-900">Revisar e Assinar</h2>
              <p className="text-sm text-gray-500">Confira os dados da receita antes de finalizar.</p>
            </div>

            <Card className="p-6 border-gray-200 space-y-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">
                    Paciente
                  </h3>
                  <p className="text-lg font-medium text-gray-900">{receita.pacienteNome}</p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">
                    Medicamentos
                  </h3>
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
              <Button variant="outline" onClick={() => setStep(1)} disabled={isPolling}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar
              </Button>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  variant="secondary"
                  onClick={handleSave}
                  disabled={atualizarReceitaMutation.isPending || isPolling}
                >
                  <Save className="mr-2 h-4 w-4" />
                  Salvar Alteracoes
                </Button>

                <Button
                  onClick={handleSign}
                  disabled={
                    assinarReceitaMutation.isPending || isPolling || !credenciaisVidaas?.isConfigured
                  }
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
          </div>
        )}
      </Card>

      <Dialog open={showSignatureModal} onOpenChange={setShowSignatureModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Assinando Receita</DialogTitle>
            <DialogDescription>
              Aguardando autorizacao no aplicativo VIDaaS. Por favor, confirme a assinatura no seu
              celular.
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
              Nao feche esta janela ate a confirmacao.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
