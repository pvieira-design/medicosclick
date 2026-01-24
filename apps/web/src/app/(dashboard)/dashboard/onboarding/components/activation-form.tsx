"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { trpc, trpcClient } from "@/utils/trpc";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface ActivationFormProps {
  candidatoId: string;
  candidatoNome: string;
  clickDoctorId: number | null;
  onSuccess?: () => void;
}

export function ActivationForm({
  candidatoId,
  candidatoNome,
  clickDoctorId,
  onSuccess,
}: ActivationFormProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDoctor, setSelectedDoctor] = useState<{
    id: number;
    nome: string;
    crm: string | null;
    email: string;
  } | null>(null);

  const { data: doctors, isLoading: isSearching } = useQuery({
    queryKey: ["search-doctors", searchTerm],
    queryFn: async () => {
      if (searchTerm.length < 2) return [];
      return await trpcClient.onboarding.searchDoctors.query({
        nome: searchTerm,
      });
    },
    enabled: searchTerm.length >= 2,
  });

  const { mutate: ativar, isPending } = useMutation({
    mutationFn: async () => {
      if (!selectedDoctor) {
        throw new Error("Selecione um médico");
      }
      return await trpcClient.onboarding.ativarCandidato.mutate({
        candidatoId,
        clickDoctorId: selectedDoctor.id,
      });
    },
    onSuccess: () => {
      toast.success("Candidato ativado com sucesso!");
      setSearchTerm("");
      setSelectedDoctor(null);
      onSuccess?.();
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao ativar candidato");
    },
  });

  if (clickDoctorId) {
    return (
      <div className="space-y-4">
        <div className="p-4 rounded-lg border border-emerald-200 bg-emerald-50">
          <div className="flex items-center gap-2 text-emerald-700 font-medium mb-2">
            <AlertCircle className="h-4 w-4" />
            Candidato já ativado
          </div>
          <p className="text-sm text-emerald-600">
            ID do médico no Click: <span className="font-mono font-bold">{clickDoctorId}</span>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div>
          <Label className="text-sm font-medium text-slate-700">
            Buscar Médico no Click
          </Label>
          <p className="text-xs text-slate-500 mt-1">
            Digite o nome do médico para encontrá-lo no banco de dados Click
          </p>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Digite o nome do médico..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            disabled={isPending}
          />
        </div>

        {isSearching && (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
            <span className="ml-2 text-sm text-slate-500">Buscando...</span>
          </div>
        )}

        {doctors && doctors.length > 0 && (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {doctors.map((doctor) => (
              <Card
                key={doctor.id}
                className={`cursor-pointer transition-all ${
                  selectedDoctor?.id === doctor.id
                    ? "border-brand-600 bg-brand-50"
                    : "border-slate-200 hover:border-slate-300"
                }`}
                onClick={() => setSelectedDoctor(doctor)}
              >
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm text-slate-900 truncate">
                        {doctor.nome}
                      </h4>
                      <div className="flex items-center gap-2 mt-1">
                        {doctor.crm && (
                          <Badge variant="outline" className="text-[10px] px-1.5 h-5">
                            CRM {doctor.crm}
                          </Badge>
                        )}
                        <span className="text-xs text-slate-500 truncate">
                          {doctor.email}
                        </span>
                      </div>
                    </div>
                    {selectedDoctor?.id === doctor.id && (
                      <div className="h-5 w-5 rounded-full bg-brand-600 flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-xs">✓</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {searchTerm.length >= 2 && doctors && doctors.length === 0 && !isSearching && (
          <div className="text-center py-6 text-slate-500">
            <p className="text-sm">Nenhum médico encontrado</p>
          </div>
        )}

        {searchTerm.length < 2 && searchTerm.length > 0 && (
          <div className="text-center py-4 text-slate-400">
            <p className="text-sm">Digite pelo menos 2 caracteres</p>
          </div>
        )}
      </div>

      {selectedDoctor && (
        <div className="p-4 rounded-lg border border-slate-200 bg-slate-50">
          <p className="text-sm text-slate-600 mb-2">
            <span className="font-medium">Médico selecionado:</span> {selectedDoctor.nome}
          </p>
          <p className="text-xs text-slate-500">
            ID no Click: <span className="font-mono font-bold">{selectedDoctor.id}</span>
          </p>
        </div>
      )}

      <Button
        onClick={() => ativar()}
        disabled={!selectedDoctor || isPending}
        className="w-full"
      >
        {isPending ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Ativando...
          </>
        ) : (
          "Confirmar Ativação"
        )}
      </Button>
    </div>
  );
}
