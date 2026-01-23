"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { trpc, trpcClient, queryClient } from "@/utils/trpc";
import { toast } from "sonner";
import { ArrowLeft, Save, Calculator, TrendingUp, DollarSign } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/config/ConfirmDialog";
import { cn } from "@/lib/utils";

interface PesosScore {
  conversao: number;
  ticketMedio: number;
}

const DEFAULT_PESOS: PesosScore = {
  conversao: 0.66,
  ticketMedio: 0.34,
};

export default function ScoreConfigPage() {
  const [formData, setFormData] = useState<PesosScore>(DEFAULT_PESOS);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { data: configData, isLoading } = useQuery(trpc.config.getAll.queryOptions());

  const updateMutation = useMutation({
    mutationFn: (input: PesosScore) => trpcClient.config.updatePesosScore.mutate(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["config"] });
      toast.success("Pesos do score atualizados!");
      setConfirmOpen(false);
    },
    onError: (error) => {
      toast.error(`Erro ao salvar: ${error.message}`);
    },
  });

  useEffect(() => {
    if (configData?.pesos_score) {
      setFormData(configData.pesos_score as PesosScore);
    }
  }, [configData]);

  const handleConversaoChange = (value: number[]) => {
    const conversao = value[0] / 100;
    setFormData({
      conversao,
      ticketMedio: Math.round((1 - conversao) * 100) / 100,
    });
  };

  const handleSubmit = () => {
    const sum = formData.conversao + formData.ticketMedio;
    if (Math.abs(sum - 1) > 0.01) {
      toast.error("A soma dos pesos deve ser igual a 100%");
      return;
    }
    setConfirmOpen(true);
  };

  if (isLoading) {
    return <ScorePageSkeleton />;
  }

  const conversaoPercent = Math.round(formData.conversao * 100);
  const ticketPercent = Math.round(formData.ticketMedio * 100);

  return (
    <div className="space-y-6 p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={"/dashboard/config" as any}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Pesos do Score</h1>
            <p className="text-muted-foreground text-sm">
              Configure como o score do medico e calculado
            </p>
          </div>
        </div>
        <Button onClick={handleSubmit} disabled={updateMutation.isPending}>
          <Save className="h-4 w-4 mr-2" />
          Salvar Alteracoes
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2 border-border/50 shadow-sm">
          <CardHeader className="bg-muted/5 border-b border-border/40 pb-4">
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-primary" />
              Composicao do Score
            </CardTitle>
            <CardDescription>
              Defina o peso de cada metrica no calculo do score final
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-10 pt-8">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 shadow-sm ring-1 ring-blue-100">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="font-semibold text-base block">Taxa de Conversao</span>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Percentual de consultas que geram receita
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-3xl font-bold text-blue-600">{conversaoPercent}%</span>
                </div>
              </div>
              <div className="px-1">
                <Slider
                  value={[conversaoPercent]}
                  onValueChange={handleConversaoChange}
                  min={0}
                  max={100}
                  step={1}
                  className="cursor-pointer py-4"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 shadow-sm ring-1 ring-emerald-100">
                    <DollarSign className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="font-semibold text-base block">Ticket Medio</span>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Valor medio das vendas geradas
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-3xl font-bold text-emerald-600">{ticketPercent}%</span>
                </div>
              </div>
              <div className="px-1">
                <Slider
                  value={[ticketPercent]}
                  onValueChange={(value) => {
                    const ticket = value[0] / 100;
                    setFormData({
                      ticketMedio: ticket,
                      conversao: Math.round((1 - ticket) * 100) / 100,
                    });
                  }}
                  min={0}
                  max={100}
                  step={1}
                  className="cursor-pointer py-4"
                />
              </div>
            </div>

            <div className="pt-6 border-t border-border/40">
              <div className="flex items-center justify-between mb-3 text-sm font-medium text-muted-foreground uppercase tracking-wider">
                <span>Distribuicao</span>
                <span>100% Total</span>
              </div>
              <div className="h-4 w-full flex rounded-full overflow-hidden shadow-inner ring-1 ring-black/5">
                <div
                  className="bg-blue-500 h-full flex items-center justify-center text-[10px] font-bold text-white/90 transition-all duration-300"
                  style={{ width: `${conversaoPercent}%` }}
                >
                  {conversaoPercent > 15 && "CONVERSAO"}
                </div>
                <div
                  className="bg-emerald-500 h-full flex items-center justify-center text-[10px] font-bold text-white/90 transition-all duration-300"
                  style={{ width: `${ticketPercent}%` }}
                >
                  {ticketPercent > 15 && "TICKET"}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm bg-muted/10 h-fit">
          <CardHeader>
            <CardTitle className="text-lg">Simulacao</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-background rounded-xl border border-border/50 shadow-sm space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Medico Exemplo:</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="p-2 bg-blue-50/50 rounded border border-blue-100/50">
                  <span className="block text-xs text-blue-600/80 mb-1">Percentil Conv.</span>
                  <span className="font-bold text-blue-700">80</span>
                </div>
                <div className="p-2 bg-emerald-50/50 rounded border border-emerald-100/50">
                  <span className="block text-xs text-emerald-600/80 mb-1">Percentil Ticket</span>
                  <span className="font-bold text-emerald-700">60</span>
                </div>
              </div>
              <div className="pt-2 border-t border-dashed border-border">
                <div className="flex justify-between items-end">
                  <span className="text-sm font-medium text-muted-foreground">Score Final</span>
                  <span className="text-2xl font-bold text-foreground">
                    {(80 * formData.conversao + 60 * formData.ticketMedio).toFixed(1)}
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1 text-right">
                  (80 × {(formData.conversao).toFixed(2)}) + (60 × {(formData.ticketMedio).toFixed(2)})
                </p>
              </div>
            </div>
            
            <p className="text-xs text-muted-foreground leading-relaxed px-1">
              O score define o ranking dos medicos e influencia diretamente em suas faixas e beneficios.
            </p>
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Confirmar Alteracoes"
        description="Tem certeza que deseja alterar os pesos do score? Isso afetara o ranking de todos os medicos do sistema."
        onConfirm={() => updateMutation.mutate(formData)}
        isLoading={updateMutation.isPending}
      />
    </div>
  );
}

function ScorePageSkeleton() {
  return (
    <div className="space-y-6 p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-72 mt-2" />
          </div>
        </div>
        <Skeleton className="h-10 w-40" />
      </div>
      <Skeleton className="h-80" />
      <Skeleton className="h-48" />
    </div>
  );
}
