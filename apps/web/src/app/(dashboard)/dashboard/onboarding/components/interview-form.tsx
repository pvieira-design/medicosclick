"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { trpcClient } from "@/utils/trpc";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

const CHECKLIST_ITEMS = [
  { id: "crm_valido", label: "CRM válido" },
  { id: "experiencia_adequada", label: "Experiência adequada" },
  { id: "disponibilidade_compativel", label: "Disponibilidade compatível" },
  { id: "perfil_comunicacao", label: "Perfil de comunicação" },
  { id: "conhecimento_tecnico", label: "Conhecimento técnico" },
];

export function InterviewForm({ candidatoId }: { candidatoId: string }) {
  const [nota, setNota] = useState<string>("");
  const [observacoes, setObservacoes] = useState("");
  const [checklist, setChecklist] = useState<Record<string, boolean>>(
    CHECKLIST_ITEMS.reduce((acc, item) => ({ ...acc, [item.id]: false }), {})
  );
  const [entrevistadorId, setEntrevistadorId] = useState("");
  const [resultado, setResultado] = useState<"aprovado" | "reprovado" | "pendente">("pendente");

  const { data: users } = useQuery({
    queryKey: ["users-staff"],
    queryFn: async () => {
      // TODO: Implement listarStaff procedure
      return [];
    },
  });

  const salvarMutation = useMutation({
    mutationFn: async () => {
      if (!nota || !observacoes || !entrevistadorId) {
        throw new Error("Preencha todos os campos obrigatórios");
      }

      return await trpcClient.onboarding.salvarEntrevista.mutate({
        candidatoId,
        nota: parseInt(nota),
        observacoes,
        checklist,
        entrevistadorId,
        resultado,
      });
    },
    onSuccess: () => {
      toast.success("Entrevista salva com sucesso!");
      setNota("");
      setObservacoes("");
      setChecklist(CHECKLIST_ITEMS.reduce((acc, item) => ({ ...acc, [item.id]: false }), {}));
      setEntrevistadorId("");
      setResultado("pendente");
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao salvar entrevista");
    },
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <Label htmlFor="nota" className="text-sm font-medium">
              Nota (1-5) *
            </Label>
            <Select value={nota} onValueChange={setNota}>
              <SelectTrigger id="nota" className="mt-2">
                <SelectValue placeholder="Selecione uma nota" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 - Insuficiente</SelectItem>
                <SelectItem value="2">2 - Fraco</SelectItem>
                <SelectItem value="3">3 - Satisfatório</SelectItem>
                <SelectItem value="4">4 - Bom</SelectItem>
                <SelectItem value="5">5 - Excelente</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="entrevistador" className="text-sm font-medium">
              Entrevistador *
            </Label>
            <Select value={entrevistadorId} onValueChange={setEntrevistadorId}>
              <SelectTrigger id="entrevistador" className="mt-2">
                <SelectValue placeholder="Selecione o entrevistador" />
              </SelectTrigger>
              <SelectContent>
                {users?.map((user: any) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="resultado" className="text-sm font-medium">
              Resultado *
            </Label>
            <Select value={resultado} onValueChange={(val: any) => setResultado(val)}>
              <SelectTrigger id="resultado" className="mt-2">
                <SelectValue placeholder="Selecione o resultado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="aprovado">Aprovado</SelectItem>
                <SelectItem value="reprovado">Reprovado</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium mb-3 block">Checklist de Avaliação</Label>
            <div className="space-y-3 p-4 rounded-lg border border-slate-200 bg-slate-50/50">
              {CHECKLIST_ITEMS.map((item) => (
                <div key={item.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={item.id}
                    checked={checklist[item.id] || false}
                    onCheckedChange={(checked) =>
                      setChecklist((prev) => ({ ...prev, [item.id]: checked }))
                    }
                  />
                  <Label htmlFor={item.id} className="text-sm font-normal cursor-pointer">
                    {item.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="observacoes" className="text-sm font-medium">
            Observações *
          </Label>
          <Textarea
            id="observacoes"
            placeholder="Digite suas observações sobre a entrevista..."
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            className="mt-2 min-h-32"
          />
          <p className="text-xs text-slate-500 mt-1">Mínimo 10 caracteres</p>
        </div>
      </div>

      <Separator />

      <div className="flex gap-3 justify-end">
        <Button
          variant="outline"
          onClick={() => {
            setNota("");
            setObservacoes("");
            setChecklist(CHECKLIST_ITEMS.reduce((acc, item) => ({ ...acc, [item.id]: false }), {}));
            setEntrevistadorId("");
            setResultado("pendente");
          }}
        >
          Limpar
        </Button>
        <Button
          onClick={() => salvarMutation.mutate()}
          disabled={salvarMutation.isPending}
          className="gap-2"
        >
          {salvarMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Salvar Entrevista
        </Button>
      </div>
    </div>
  );
}
