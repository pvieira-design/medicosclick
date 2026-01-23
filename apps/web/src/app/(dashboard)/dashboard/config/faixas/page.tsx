"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { trpc, trpcClient, queryClient } from "@/utils/trpc";
import { toast } from "sonner";
import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/config/ConfirmDialog";
import { cn } from "@/lib/utils";

interface FaixaConfig {
  scoreMinimo: number;
  consultasMinimas: number;
  slotsMaximo: number | null;
  slotsMinimo: number;
  periodos: ("manha" | "tarde" | "noite")[];
}

interface FaixasConfig {
  P1: FaixaConfig;
  P2: FaixaConfig;
  P3: FaixaConfig;
  P4: FaixaConfig;
  P5: FaixaConfig;
}

type FaixaKey = keyof FaixasConfig;

const FAIXAS_ORDER: FaixaKey[] = ["P1", "P2", "P3", "P4", "P5"];

const FAIXA_COLORS: Record<FaixaKey, { bg: string; text: string; border: string }> = {
  P1: { bg: "bg-green-700", text: "text-white", border: "border-green-700" },
  P2: { bg: "bg-green-500", text: "text-white", border: "border-green-500" },
  P3: { bg: "bg-yellow-500", text: "text-black", border: "border-yellow-500" },
  P4: { bg: "bg-orange-500", text: "text-white", border: "border-orange-500" },
  P5: { bg: "bg-red-500", text: "text-white", border: "border-red-500" },
};

const PERIODOS = [
  { key: "manha" as const, label: "Manha" },
  { key: "tarde" as const, label: "Tarde" },
  { key: "noite" as const, label: "Noite" },
];

const DEFAULT_FAIXAS: FaixasConfig = {
  P1: { scoreMinimo: 80, consultasMinimas: 100, slotsMaximo: null, slotsMinimo: 10, periodos: ["manha", "tarde", "noite"] },
  P2: { scoreMinimo: 60, consultasMinimas: 50, slotsMaximo: 120, slotsMinimo: 10, periodos: ["manha", "tarde", "noite"] },
  P3: { scoreMinimo: 40, consultasMinimas: 25, slotsMaximo: 80, slotsMinimo: 8, periodos: ["tarde", "noite"] },
  P4: { scoreMinimo: 20, consultasMinimas: 10, slotsMaximo: 50, slotsMinimo: 5, periodos: ["tarde"] },
  P5: { scoreMinimo: 0, consultasMinimas: 0, slotsMaximo: 30, slotsMinimo: 3, periodos: ["tarde"] },
};

export default function FaixasConfigPage() {
  const [formData, setFormData] = useState<FaixasConfig>(DEFAULT_FAIXAS);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { data: configData, isLoading } = useQuery(trpc.config.getAll.queryOptions());

  const updateMutation = useMutation({
    mutationFn: (input: FaixasConfig) => trpcClient.config.updateFaixas.mutate(input),
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast.success("Faixas atualizadas com sucesso!");
      setConfirmOpen(false);
    },
    onError: (error) => {
      toast.error(`Erro ao salvar: ${error.message}`);
    },
  });

  useEffect(() => {
    if (configData?.faixas) {
      setFormData(configData.faixas as FaixasConfig);
    }
  }, [configData]);

  const updateFaixa = (faixa: FaixaKey, field: keyof FaixaConfig, value: unknown) => {
    setFormData((prev) => ({
      ...prev,
      [faixa]: {
        ...prev[faixa],
        [field]: value,
      },
    }));
  };

  const togglePeriodo = (faixa: FaixaKey, periodo: "manha" | "tarde" | "noite") => {
    setFormData((prev) => {
      const currentPeriodos = prev[faixa].periodos;
      const newPeriodos = currentPeriodos.includes(periodo)
        ? currentPeriodos.filter((p) => p !== periodo)
        : [...currentPeriodos, periodo];
      return {
        ...prev,
        [faixa]: {
          ...prev[faixa],
          periodos: newPeriodos,
        },
      };
    });
  };

  const handleSubmit = () => {
    for (const faixa of FAIXAS_ORDER) {
      if (formData[faixa].periodos.length === 0) {
        toast.error(`Faixa ${faixa} deve ter pelo menos um periodo selecionado`);
        return;
      }
    }
    setConfirmOpen(true);
  };

  if (isLoading) {
    return <FaixasPageSkeleton />;
  }

  return (
    <div className="space-y-6 p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={"/dashboard/config" as any}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Configuracao de Faixas</h1>
            <p className="text-muted-foreground text-sm">
              Configure os limites e periodos para cada faixa (P1-P5)
            </p>
          </div>
        </div>
        <Button onClick={handleSubmit} disabled={updateMutation.isPending}>
          <Save className="h-4 w-4 mr-2" />
          Salvar Alteracoes
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {FAIXAS_ORDER.map((faixa) => (
          <FaixaCard
            key={faixa}
            faixa={faixa}
            config={formData[faixa]}
            colors={FAIXA_COLORS[faixa]}
            onUpdate={(field, value) => updateFaixa(faixa, field, value)}
            onTogglePeriodo={(periodo) => togglePeriodo(faixa, periodo)}
          />
        ))}
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Confirmar Alteracoes"
        description="Tem certeza que deseja salvar as alteracoes nas configuracoes de faixas? Isso afetara todos os medicos do sistema."
        onConfirm={() => updateMutation.mutate(formData)}
        isLoading={updateMutation.isPending}
      />
    </div>
  );
}

interface FaixaCardProps {
  faixa: FaixaKey;
  config: FaixaConfig;
  colors: { bg: string; text: string; border: string };
  onUpdate: (field: keyof FaixaConfig, value: unknown) => void;
  onTogglePeriodo: (periodo: "manha" | "tarde" | "noite") => void;
}

function FaixaCard({ faixa, config, colors, onUpdate, onTogglePeriodo }: FaixaCardProps) {
  const colorClass = colors.bg.replace("bg-", "");
  const baseColor = colorClass.split("-")[0];
  
  return (
    <Card className="overflow-hidden border-border/50 shadow-sm hover:shadow-md transition-all duration-300 group">
      <div className={cn("h-1.5 w-full opacity-80", colors.bg)} />
      <CardHeader className="pb-4 bg-muted/10 border-b border-border/40">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-3">
            <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl shadow-sm ring-1 ring-inset ring-black/5", colors.bg, "text-white")}>
              <span className="font-bold text-lg">{faixa}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-base font-semibold text-foreground">
                {faixa === "P1" && "Nivel Premium"}
                {faixa === "P2" && "Nivel Ouro"}
                {faixa === "P3" && "Nivel Prata"}
                {faixa === "P4" && "Nivel Bronze"}
                {faixa === "P5" && "Nivel Iniciante"}
              </span>
              <span className="text-xs font-normal text-muted-foreground">Configuracao de regras</span>
            </div>
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        <div className="grid grid-cols-2 gap-5">
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">Score Minimo</label>
            <div className="relative">
              <Input
                type="number"
                min={0}
                max={100}
                value={config.scoreMinimo}
                onChange={(e) => onUpdate("scoreMinimo", Number(e.target.value))}
                className="h-10 border-input/80 focus:ring-primary/20 bg-background"
              />
              <span className="absolute right-3 top-2.5 text-xs text-muted-foreground font-medium">pts</span>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">Consultas Min.</label>
            <div className="relative">
              <Input
                type="number"
                min={0}
                value={config.consultasMinimas}
                onChange={(e) => onUpdate("consultasMinimas", Number(e.target.value))}
                className="h-10 border-input/80 focus:ring-primary/20 bg-background"
              />
              <span className="absolute right-3 top-2.5 text-xs text-muted-foreground font-medium">qtd</span>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">Slots Max.</label>
            <div className="relative">
              <Input
                type="number"
                min={1}
                placeholder="Ilimitado"
                value={config.slotsMaximo ?? ""}
                onChange={(e) => onUpdate("slotsMaximo", e.target.value === "" ? null : Number(e.target.value))}
                className="h-10 border-input/80 focus:ring-primary/20 bg-background"
              />
            </div>
            <span className="text-[10px] text-muted-foreground font-medium ml-1">Vazio = ilimitado</span>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">Slots Min.</label>
            <Input
              type="number"
              min={1}
              value={config.slotsMinimo}
              onChange={(e) => onUpdate("slotsMinimo", Number(e.target.value))}
              className="h-10 border-input/80 focus:ring-primary/20 bg-background"
            />
          </div>
        </div>

        <div className="pt-2 border-t border-border/40">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80 block mb-3">
            Periodos Permitidos
          </label>
          <div className="flex flex-wrap gap-3">
            {PERIODOS.map(({ key, label }) => {
              const isChecked = config.periodos.includes(key);
              return (
                <label 
                  key={key} 
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all duration-200 select-none",
                    isChecked 
                      ? "bg-primary/5 border-primary/30 text-primary font-medium" 
                      : "bg-background border-input hover:border-primary/30 text-muted-foreground"
                  )}
                >
                  <div className="relative flex items-center">
                    <Checkbox
                      checked={isChecked}
                      onCheckedChange={() => onTogglePeriodo(key)}
                      className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                    />
                  </div>
                  <span className="text-sm">{label}</span>
                </label>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function FaixasPageSkeleton() {
  return (
    <div className="space-y-6 p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div>
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96 mt-2" />
          </div>
        </div>
        <Skeleton className="h-10 w-40" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-72" />
        ))}
      </div>
    </div>
  );
}
