"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { trpc, trpcClient } from "@/utils/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { X, Plus, Calendar } from "lucide-react";
import { toast } from "sonner";

interface TrainingFormProps {
  candidatoId: string;
}

export function TrainingForm({ candidatoId }: TrainingFormProps) {
  const [searchMentor, setSearchMentor] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [mentoresAtribuidos, setMentoresAtribuidos] = useState<
    Array<{ id: string; nome: string; mentorId: string }>
  >([]);

  const { data: mentores, isLoading: loadingMentores } = useQuery(
    trpc.onboarding.buscarMentores.queryOptions({
      busca: searchMentor || undefined,
    })
  );

  const atribuirMentorMutation = useMutation({
    mutationFn: (input: { candidatoId: string; mentorId: string; mentorNome: string }) =>
      trpcClient.onboarding.atribuirMentor.mutate(input),
    onSuccess: (data) => {
      setMentoresAtribuidos((prev) => [
        ...prev,
        {
          id: data.id,
          nome: data.mentorNome,
          mentorId: data.mentorId,
        },
      ]);
      setSearchMentor("");
      toast.success("Mentor atribuído com sucesso");
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao atribuir mentor");
    },
  });

  const removerMentorMutation = useMutation({
    mutationFn: (input: { candidatoId: string; mentorId: string }) =>
      trpcClient.onboarding.removerMentor.mutate(input),
    onSuccess: (_, variables) => {
      setMentoresAtribuidos((prev) =>
        prev.filter((m) => m.id !== variables.mentorId)
      );
      toast.success("Mentor removido com sucesso");
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao remover mentor");
    },
  });

  const salvarDatasMutation = useMutation({
    mutationFn: (input: { candidatoId: string; dataInicio: Date; dataFim: Date }) =>
      trpcClient.onboarding.salvarDatasTreinamento.mutate(input),
    onSuccess: () => {
      toast.success("Datas de treinamento salvas com sucesso");
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao salvar datas");
    },
  });

  const handleAtribuirMentor = (mentor: any) => {
    if (mentoresAtribuidos.some((m) => m.mentorId === mentor.id)) {
      toast.error("Este mentor já foi atribuído");
      return;
    }

    atribuirMentorMutation.mutate({
      candidatoId,
      mentorId: mentor.id,
      mentorNome: mentor.nome,
    });
  };

  const handleRemoverMentor = (mentorId: string) => {
    removerMentorMutation.mutate({
      candidatoId,
      mentorId,
    });
  };

  const handleSalvarDatas = () => {
    if (!dataInicio || !dataFim) {
      toast.error("Preencha ambas as datas");
      return;
    }

    salvarDatasMutation.mutate({
      candidatoId,
      dataInicio: new Date(dataInicio),
      dataFim: new Date(dataFim),
    });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div>
          <h3 className="font-semibold text-slate-900 mb-3">Atribuir Mentores</h3>
          <div className="space-y-3">
            <div className="relative">
              <Input
                placeholder="Buscar mentor por nome ou email..."
                value={searchMentor}
                onChange={(e) => setSearchMentor(e.target.value)}
                className="pr-10"
              />
            </div>

            {searchMentor && (
              <Card className="border-slate-200">
                <CardContent className="p-3 max-h-48 overflow-y-auto">
                  {loadingMentores ? (
                    <div className="text-sm text-slate-500">Carregando...</div>
                  ) : mentores && mentores.length > 0 ? (
                    <div className="space-y-2">
                      {mentores.map((mentor) => (
                        <button
                          key={mentor.id}
                          onClick={() => handleAtribuirMentor(mentor)}
                          className="w-full text-left p-2 rounded-lg hover:bg-slate-100 transition-colors flex items-center justify-between"
                        >
                          <div>
                            <div className="font-medium text-sm text-slate-900">
                              {mentor.nome}
                            </div>
                            <div className="text-xs text-slate-500">
                              {mentor.email}
                            </div>
                          </div>
                          <Plus className="h-4 w-4 text-slate-400" />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-slate-500">
                      Nenhum mentor encontrado
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {mentoresAtribuidos.length > 0 && (
          <div>
            <Label className="text-xs text-slate-500 mb-2 block">
              Mentores Atribuídos
            </Label>
            <div className="flex flex-wrap gap-2">
              {mentoresAtribuidos.map((mentor) => (
                <Badge
                  key={mentor.id}
                  variant="secondary"
                  className="flex items-center gap-2 px-3 py-1.5"
                >
                  {mentor.nome}
                  <button
                    onClick={() => handleRemoverMentor(mentor.id)}
                    className="ml-1 hover:text-red-600 transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>

      <Separator />

      <div className="space-y-4">
        <h3 className="font-semibold text-slate-900">Datas de Treinamento</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="data-inicio" className="text-sm">
              Data de Início
            </Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                id="data-inicio"
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="data-fim" className="text-sm">
              Data de Fim
            </Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                id="data-fim"
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </div>

        <Button
          onClick={handleSalvarDatas}
          disabled={salvarDatasMutation.isPending || !dataInicio || !dataFim}
          className="w-full"
        >
          {salvarDatasMutation.isPending ? "Salvando..." : "Salvar Datas"}
        </Button>
      </div>
    </div>
  );
}
