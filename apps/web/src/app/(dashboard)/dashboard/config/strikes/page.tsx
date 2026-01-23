"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { trpc, trpcClient, queryClient } from "@/utils/trpc";
import { toast } from "sonner";
import { ArrowLeft, Save, Plus, Trash2, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/config/ConfirmDialog";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Penalidade {
  strikes: number;
  reducaoSlots: number;
  duracaoDias: number;
}

interface StrikesConfig {
  maxStrikes: number;
  penalidades: Penalidade[];
}

const DEFAULT_STRIKES: StrikesConfig = {
  maxStrikes: 5,
  penalidades: [
    { strikes: 2, reducaoSlots: 5, duracaoDias: 7 },
    { strikes: 3, reducaoSlots: 10, duracaoDias: 14 },
    { strikes: 4, reducaoSlots: 20, duracaoDias: 30 },
    { strikes: 5, reducaoSlots: 0, duracaoDias: 0 },
  ],
};

export default function StrikesConfigPage() {
  const [formData, setFormData] = useState<StrikesConfig>(DEFAULT_STRIKES);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { data: configData, isLoading } = useQuery(trpc.config.getAll.queryOptions());

  const updateMutation = useMutation({
    mutationFn: (input: StrikesConfig) => trpcClient.config.updateStrikes.mutate(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["config"] });
      toast.success("Configuracao de strikes atualizada!");
      setConfirmOpen(false);
    },
    onError: (error) => {
      toast.error(`Erro ao salvar: ${error.message}`);
    },
  });

  useEffect(() => {
    if (configData?.strikes) {
      setFormData(configData.strikes as StrikesConfig);
    }
  }, [configData]);

  const updatePenalidade = (index: number, field: keyof Penalidade, value: number) => {
    setFormData((prev) => ({
      ...prev,
      penalidades: prev.penalidades.map((p, i) =>
        i === index ? { ...p, [field]: value } : p
      ),
    }));
  };

  const addPenalidade = () => {
    const lastPenalidade = formData.penalidades[formData.penalidades.length - 1];
    const newStrikes = lastPenalidade ? lastPenalidade.strikes + 1 : 1;
    setFormData((prev) => ({
      ...prev,
      penalidades: [
        ...prev.penalidades,
        { strikes: newStrikes, reducaoSlots: 0, duracaoDias: 0 },
      ],
    }));
  };

  const removePenalidade = (index: number) => {
    if (formData.penalidades.length <= 1) {
      toast.error("Deve haver pelo menos uma penalidade configurada");
      return;
    }
    setFormData((prev) => ({
      ...prev,
      penalidades: prev.penalidades.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = () => {
    if (formData.maxStrikes < 1) {
      toast.error("O numero maximo de strikes deve ser pelo menos 1");
      return;
    }
    for (let i = 0; i < formData.penalidades.length; i++) {
      const p = formData.penalidades[i];
      if (p.strikes < 1) {
        toast.error(`Penalidade ${i + 1}: numero de strikes deve ser pelo menos 1`);
        return;
      }
    }
    setConfirmOpen(true);
  };

  if (isLoading) {
    return <StrikesPageSkeleton />;
  }

  return (
    <div className="space-y-6 p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={"/dashboard/config" as any}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Sistema de Strikes</h1>
            <p className="text-muted-foreground text-sm">
              Configure penalidades para medicos que cancelam consultas
            </p>
          </div>
        </div>
        <Button onClick={handleSubmit} disabled={updateMutation.isPending}>
          <Save className="h-4 w-4 mr-2" />
          Salvar Alteracoes
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1 border-border/50 shadow-sm">
          <CardHeader className="bg-orange-50/50 border-b border-orange-100/50 pb-4">
            <CardTitle className="flex items-center gap-2 text-orange-700">
              <AlertTriangle className="h-5 w-5" />
              Limite Critico
            </CardTitle>
            <CardDescription>
              Gatilho para suspensao automatica
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center space-y-2 py-2">
              <div className="relative">
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={formData.maxStrikes}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, maxStrikes: Number(e.target.value) }))
                  }
                  className="w-24 h-16 text-4xl font-bold text-center border-orange-200 focus:ring-orange-500/20 text-orange-950 bg-orange-50/30 rounded-xl"
                />
              </div>
              <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Strikes Maximos</span>
            </div>
            <div className="mt-4 text-xs text-center text-muted-foreground leading-relaxed">
              Ao atingir este numero, o medico sera suspenso automaticamente do sistema.
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2 border-border/50 shadow-sm overflow-hidden flex flex-col">
          <CardHeader className="bg-muted/5 border-b border-border/40 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Regras de Penalidade</CardTitle>
                <CardDescription className="mt-1">
                  Configure as consequencias para cada nivel de strike acumulado
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={addPenalidade} className="border-dashed hover:border-solid hover:bg-muted/50">
                <Plus className="h-4 w-4 mr-2" />
                Nova Regra
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0 flex-1">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="hover:bg-transparent border-border/40">
                  <TableHead className="w-32 font-semibold">Nivel</TableHead>
                  <TableHead className="font-semibold">Reducao de Slots</TableHead>
                  <TableHead className="font-semibold">Duracao (dias)</TableHead>
                  <TableHead className="w-32 font-semibold">Status</TableHead>
                  <TableHead className="w-16"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {formData.penalidades.map((penalidade, index) => {
                  const isSuspensao =
                    penalidade.reducaoSlots === 0 && penalidade.duracaoDias === 0;
                  const isCritical = penalidade.strikes >= formData.maxStrikes;
                  
                  return (
                    <TableRow key={index} className={cn("border-border/40 transition-colors", isCritical ? "bg-red-50/30 hover:bg-red-50/50" : "hover:bg-muted/5")}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-muted-foreground">Strike</span>
                          <Input
                            type="number"
                            min={1}
                            value={penalidade.strikes}
                            onChange={(e) =>
                              updatePenalidade(index, "strikes", Number(e.target.value))
                            }
                            className="w-16 h-8 text-center font-bold bg-background shadow-sm"
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min={0}
                            value={penalidade.reducaoSlots}
                            onChange={(e) =>
                              updatePenalidade(index, "reducaoSlots", Number(e.target.value))
                            }
                            className="w-20 h-8 bg-background"
                            disabled={isSuspensao && isCritical}
                          />
                          <span className="text-muted-foreground text-xs font-medium">slots</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min={0}
                            value={penalidade.duracaoDias}
                            onChange={(e) =>
                              updatePenalidade(index, "duracaoDias", Number(e.target.value))
                            }
                            className="w-20 h-8 bg-background"
                            disabled={isSuspensao && isCritical}
                          />
                          <span className="text-muted-foreground text-xs font-medium">dias</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {isCritical ? (
                          <Badge variant="destructive" className="shadow-sm">Suspensao</Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-muted text-muted-foreground hover:bg-muted font-normal border-border">Penalidade</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removePenalidade(index)}
                          disabled={formData.penalidades.length <= 1}
                          className="h-8 w-8 text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
          <div className="p-4 border-t border-border/40 bg-muted/10">
            <p className="text-xs text-muted-foreground flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" />
              <strong>Nota:</strong> Reducao de slots e duracao "0" significam suspensao total do medico.
            </p>
          </div>
        </Card>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Confirmar Alteracoes"
        description="Tem certeza que deseja salvar as alteracoes no sistema de strikes? Isso pode afetar medicos com strikes ativos."
        onConfirm={() => updateMutation.mutate(formData)}
        isLoading={updateMutation.isPending}
      />
    </div>
  );
}

function StrikesPageSkeleton() {
  return (
    <div className="space-y-6 p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-80 mt-2" />
          </div>
        </div>
        <Skeleton className="h-10 w-40" />
      </div>
      <Skeleton className="h-32" />
      <Skeleton className="h-96" />
    </div>
  );
}
