"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Loader2, AlertTriangle, Calendar, Clock } from "lucide-react";
import { toast } from "sonner";
import { trpcClient } from "@/utils/trpc";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

type DiaSemana = "dom" | "seg" | "ter" | "qua" | "qui" | "sex" | "sab";
type MotivoCancelamento = "doenca" | "emergencia_familiar" | "compromisso_medico" | "problema_tecnico" | "outro";

interface Slot {
  diaSemana: DiaSemana;
  horario: string;
}

interface CancelamentoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slots: Slot[];
  onSuccess?: () => void;
}

const DIAS_LABEL: Record<DiaSemana, string> = {
  dom: "Domingo",
  seg: "Segunda",
  ter: "Terça",
  qua: "Quarta",
  qui: "Quinta",
  sex: "Sexta",
  sab: "Sábado",
};

const MOTIVOS: { value: MotivoCancelamento; label: string }[] = [
  { value: "doenca", label: "Doença" },
  { value: "emergencia_familiar", label: "Emergência Familiar" },
  { value: "compromisso_medico", label: "Compromisso Médico" },
  { value: "problema_tecnico", label: "Problema Técnico" },
  { value: "outro", label: "Outro" },
];

export function CancelamentoModal({
  open,
  onOpenChange,
  slots,
  onSuccess,
}: CancelamentoModalProps) {
  const [motivoCategoria, setMotivoCategoria] = useState<MotivoCancelamento | "">("");
  const [motivoDescricao, setMotivoDescricao] = useState("");

  const criarCancelamento = useMutation({
    mutationFn: (input: { slots: Slot[]; motivoCategoria: MotivoCancelamento; motivoDescricao?: string }) =>
      trpcClient.solicitacoes.criarCancelamentoEmergencial.mutate(input),
    onSuccess: () => {
      toast.success("Cancelamento emergencial solicitado", {
        description: "Aguarde a aprovação do staff.",
      });
      resetForm();
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error: { message: string }) => {
      toast.error("Erro ao solicitar cancelamento", {
        description: error.message,
      });
    },
  });

  const resetForm = () => {
    setMotivoCategoria("");
    setMotivoDescricao("");
  };

  const handleSubmit = () => {
    if (!motivoCategoria) {
      toast.error("Selecione o motivo do cancelamento");
      return;
    }

    criarCancelamento.mutate({
      slots,
      motivoCategoria,
      motivoDescricao: motivoDescricao || undefined,
    });
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetForm();
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Cancelamento Emergencial
          </DialogTitle>
          <DialogDescription>
            Os horários selecionados possuem consultas agendadas. 
            Um cancelamento emergencial será registrado e você receberá um strike.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-2">
              Horários com consulta ({slots.length}):
            </p>
            <div className="flex flex-wrap gap-2">
              {slots.map((slot) => (
                <Badge
                  key={`${slot.diaSemana}-${slot.horario}`}
                  variant="secondary"
                  className="bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200"
                >
                  <Calendar className="h-3 w-3 mr-1" />
                  {DIAS_LABEL[slot.diaSemana]}
                  <Clock className="h-3 w-3 ml-2 mr-1" />
                  {slot.horario}
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="motivo">Motivo do Cancelamento *</Label>
            <Select
              value={motivoCategoria}
              onValueChange={(value) => setMotivoCategoria(value as MotivoCancelamento)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione o motivo" />
              </SelectTrigger>
              <SelectContent>
                {MOTIVOS.map((motivo) => (
                  <SelectItem key={motivo.value} value={motivo.value}>
                    {motivo.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição adicional (opcional)</Label>
            <Input
              id="descricao"
              placeholder="Forneça mais detalhes se necessário..."
              value={motivoDescricao}
              onChange={(e) => setMotivoDescricao(e.target.value)}
            />
          </div>

          <div className="rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 p-3">
            <p className="text-sm text-red-700 dark:text-red-300">
              <strong>Atenção:</strong> Esta ação resultará em um strike no seu perfil. 
              Strikes acumulados podem resultar em penalidades.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={criarCancelamento.isPending}
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={!motivoCategoria || criarCancelamento.isPending}
          >
            {criarCancelamento.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Confirmar Cancelamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
