"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Step1SelecaoConsulta } from "@/components/receita/wizard/Step1SelecaoConsulta";
import { Step2Produtos, type ProdutoItem } from "@/components/receita/wizard/Step2Produtos";
import { Step3Revisao } from "@/components/receita/wizard/Step3Revisao";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckCircle2, Download, ArrowLeft } from "lucide-react";
import { trpc } from "@/utils/trpc";

export default function NovaReceitaPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [consultingId, setConsultingId] = useState<number | null>(null);
  const [produtos, setProdutos] = useState<ProdutoItem[]>([]);
  const [alertas, setAlertas] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  const handleStep1Next = (id: number) => {
    setConsultingId(id);
    setStep(2);
  };

  const handleStep2Next = (prods: ProdutoItem[], alts: string) => {
    setProdutos(prods);
    setAlertas(alts);
    setStep(3);
  };

  const handleSuccess = () => {
    setIsSuccess(true);
  };

  if (isSuccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6 animate-in fade-in zoom-in duration-500">
        <div className="bg-green-100 p-6 rounded-full">
          <CheckCircle2 className="h-16 w-16 text-green-600" />
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-gray-900">Receita Gerada com Sucesso!</h2>
          <p className="text-gray-500 max-w-md">
            A receita foi criada e salva no histórico do paciente.
          </p>
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
        <h1 className="text-2xl font-bold text-gray-900">Nova Receita Médica</h1>
        <div className="flex items-center mt-4">
          <div className="flex items-center w-full">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${step >= 1 ? "bg-brand-600 text-white" : "bg-gray-200 text-gray-500"} font-semibold text-sm`}>
              1
            </div>
            <div className={`flex-1 h-1 mx-2 ${step >= 2 ? "bg-brand-600" : "bg-gray-200"}`} />
            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${step >= 2 ? "bg-brand-600 text-white" : "bg-gray-200 text-gray-500"} font-semibold text-sm`}>
              2
            </div>
            <div className={`flex-1 h-1 mx-2 ${step >= 3 ? "bg-brand-600" : "bg-gray-200"}`} />
            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${step >= 3 ? "bg-brand-600 text-white" : "bg-gray-200 text-gray-500"} font-semibold text-sm`}>
              3
            </div>
          </div>
        </div>
        <div className="flex justify-between mt-2 text-xs text-gray-500 font-medium">
          <span>Selecionar Consulta</span>
          <span className="text-center">Produtos e Posologia</span>
          <span className="text-right">Revisar e Assinar</span>
        </div>
      </div>

      <Card className="p-6 border-gray-200 shadow-none">
        {step === 1 && (
          <Step1SelecaoConsulta
            onNext={handleStep1Next}
            selectedConsultingId={consultingId}
          />
        )}
        {step === 2 && consultingId && (
          <Step2Produtos
            consultingId={consultingId}
            initialProdutos={produtos}
            initialAlertas={alertas}
            onBack={() => setStep(1)}
            onNext={handleStep2Next}
          />
        )}
        {step === 3 && consultingId && (
          <Step3Revisao
            consultingId={consultingId}
            produtos={produtos}
            alertas={alertas}
            onBack={() => setStep(2)}
            onSuccess={handleSuccess}
          />
        )}
      </Card>
    </div>
  );
}
