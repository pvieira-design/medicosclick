"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
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
import { Loader2, Plus, Trash2, ArrowLeft, ArrowRight, AlertTriangle } from "lucide-react";

export interface ProdutoItem {
  id: string;
  nome: string;
  concentracao?: string;
  quantidade: number;
  posologia: string;
}

interface Step2Props {
  consultingId: number;
  initialProdutos: ProdutoItem[];
  initialAlertas: string;
  onBack: () => void;
  onNext: (produtos: ProdutoItem[], alertas: string) => void;
}

export function Step2Produtos({
  consultingId,
  initialProdutos,
  initialAlertas,
  onBack,
  onNext,
}: Step2Props) {
  const [produtos, setProdutos] = useState<ProdutoItem[]>(
    initialProdutos.length > 0
      ? initialProdutos
      : [{ id: "1", nome: "", quantidade: 1, posologia: "" }]
  );
  const [alertas, setAlertas] = useState(initialAlertas);

  const { data: listaProdutos, isLoading: isLoadingProdutos } = useQuery(
    trpc.receita.listarProdutos.queryOptions()
  );
  const { data: dadosConsulta, isLoading: isLoadingDados } = useQuery(
    trpc.receita.buscarDadosConsulta.queryOptions(
      { consultingId },
      { enabled: !!consultingId }
    )
  );

  // Pre-fill posology if available and not already set
  useEffect(() => {
    if (dadosConsulta?.anamnese && produtos.length === 1 && !produtos[0].posologia) {
      // Logic to extract posology from anamnese could go here if structure was known
    }
  }, [dadosConsulta, produtos]);

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
    setProdutos(
      produtos.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    );
  };

  const handleNext = () => {
    const isValid = produtos.every((p) => p.nome && p.quantidade > 0 && p.posologia);
    if (isValid) {
      onNext(produtos, alertas);
    }
  };

  const isValid = produtos.every((p) => p.nome && p.quantidade > 0 && p.posologia);

  if (isLoadingProdutos || isLoadingDados) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
        <p className="text-sm text-muted-foreground">Carregando dados...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-gray-900">Produtos e Posologia</h2>
        <p className="text-sm text-gray-500">
          Adicione os medicamentos e instruções de uso para o paciente.
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
                    onChange={(e) => updateProduto(produto.id, "quantidade", parseInt(e.target.value) || 0)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Posologia</Label>
                <Textarea
                  placeholder="Ex: Tomar 1 cápsula via oral 2 vezes ao dia..."
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
          Alertas e Observações (Opcional)
        </Label>
        <Textarea
          placeholder="Ex: Suspender uso em caso de reação alérgica..."
          value={alertas}
          onChange={(e) => setAlertas(e.target.value)}
          className="min-h-[80px] border-amber-200 focus:border-amber-500 focus:ring-amber-500/20"
        />
      </div>

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
        <Button
          onClick={handleNext}
          disabled={!isValid}
          className="bg-brand-600 hover:bg-brand-700 text-white min-w-[120px]"
        >
          Revisar
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
