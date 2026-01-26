import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "@tanstack/react-form";
import { z } from "zod";
import { trpc } from "@/utils/trpc";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const satisfacaoSchema = z.object({
  npsSuporte: z.number().int().min(0).max(10),
  npsFerramentas: z.number().int().min(0).max(10),
  sugestoes: z.string(),
});

interface SatisfacaoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function getMesReferenciaAtual(): string {
  const agora = new Date();
  const spDate = new Date(agora.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  const mes = (spDate.getMonth() + 1).toString().padStart(2, "0");
  const ano = spDate.getFullYear();
  return `${mes}/${ano}`;
}

export function SatisfacaoModal({ open, onOpenChange }: SatisfacaoModalProps) {
  const { data: satisfacaoAtual, isLoading } = useQuery({
    ...trpc.formularios.getSatisfacaoAtual.queryOptions(undefined),
    enabled: open,
  });
  
  const responderMutation = useMutation(
    trpc.formularios.responderSatisfacao.mutationOptions({
      onSuccess: () => {
        toast.success("Obrigado pelo seu feedback!");
        onOpenChange(false);
      },
      onError: (error: any) => {
        toast.error(error.message || "Erro ao enviar resposta.");
      },
    })
  );

  const form = useForm({
    defaultValues: {
      npsSuporte: undefined as unknown as number,
      npsFerramentas: undefined as unknown as number,
      sugestoes: "",
    },
    validators: {
      onChange: satisfacaoSchema,
    },
    onSubmit: async ({ value }) => {
      await responderMutation.mutateAsync({
        ...value,
        sugestoes: value.sugestoes || undefined,
      });
    },
  });

  if (satisfacaoAtual?.jaRespondeu && satisfacaoAtual.resposta) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pesquisa de Satisfação</DialogTitle>
            <DialogDescription>
              Você já respondeu a pesquisa deste mês. Obrigado!
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg border p-3 bg-muted/50">
                <p className="text-xs text-muted-foreground uppercase font-semibold">Suporte</p>
                <p className="text-2xl font-bold text-brand-600">{satisfacaoAtual.resposta.npsSuporte}/10</p>
              </div>
              <div className="rounded-lg border p-3 bg-muted/50">
                <p className="text-xs text-muted-foreground uppercase font-semibold">Ferramentas</p>
                <p className="text-2xl font-bold text-brand-600">{satisfacaoAtual.resposta.npsFerramentas}/10</p>
              </div>
            </div>
            {satisfacaoAtual.resposta.sugestoes && (
              <div className="rounded-lg border p-3 bg-muted/50">
                <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">Suas sugestões</p>
                <p className="text-sm text-muted-foreground">{satisfacaoAtual.resposta.sugestoes}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => onOpenChange(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Pesquisa de Satisfação - {getMesReferenciaAtual()}</DialogTitle>
          <DialogDescription>
            Sua opinião é muito importante para melhorarmos nossos serviços.
          </DialogDescription>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              form.handleSubmit();
            }}
            className="space-y-8 py-4"
          >
            <div className="space-y-6">
              <form.Field name="npsSuporte">
                {(field) => (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <Label className="text-base">Como você avalia o suporte da equipe?</Label>
                      <span className={cn(
                        "text-sm font-bold",
                        field.state.value >= 9 ? "text-green-600" :
                        field.state.value >= 7 ? "text-yellow-600" :
                        field.state.value !== undefined ? "text-red-600" : "text-transparent"
                      )}>
                        {field.state.value !== undefined ? field.state.value : "-"}
                      </span>
                    </div>
                    <div className="flex gap-1 flex-wrap justify-center sm:justify-start">
                      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                        <Button
                          key={num}
                          type="button"
                          variant={field.state.value === num ? "default" : "outline"}
                          size="sm"
                          onClick={() => field.handleChange(num)}
                          className={cn(
                            "w-9 h-9 p-0 font-medium transition-all",
                            field.state.value === num && "scale-110 shadow-md ring-2 ring-offset-1 ring-brand-200"
                          )}
                        >
                          {num}
                        </Button>
                      ))}
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground px-1">
                      <span>Muito insatisfeito</span>
                      <span>Muito satisfeito</span>
                    </div>
                    {field.state.meta.errors && field.state.meta.errors.length > 0 ? (
                      <p className="text-xs text-red-500">
                        {field.state.meta.errors
                          .filter((err): err is NonNullable<typeof err> => err != null)
                          .map((err) => typeof err === 'string' ? err : String(err))
                          .join(", ")}
                      </p>
                    ) : null}
                   </div>
                 )}
               </form.Field>

               <form.Field name="npsFerramentas">
                 {(field) => (
                   <div className="space-y-3">
                     <div className="flex justify-between items-center">
                       <Label className="text-base">Como você avalia as ferramentas?</Label>
                       <span className={cn(
                         "text-sm font-bold",
                         field.state.value >= 9 ? "text-green-600" :
                         field.state.value >= 7 ? "text-yellow-600" :
                         field.state.value !== undefined ? "text-red-600" : "text-transparent"
                       )}>
                         {field.state.value !== undefined ? field.state.value : "-"}
                       </span>
                     </div>
                     <div className="flex gap-1 flex-wrap justify-center sm:justify-start">
                       {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                         <Button
                           key={num}
                           type="button"
                           variant={field.state.value === num ? "default" : "outline"}
                           size="sm"
                           onClick={() => field.handleChange(num)}
                           className={cn(
                             "w-9 h-9 p-0 font-medium transition-all",
                             field.state.value === num && "scale-110 shadow-md ring-2 ring-offset-1 ring-brand-200"
                           )}
                         >
                           {num}
                         </Button>
                       ))}
                     </div>
                     <div className="flex justify-between text-xs text-muted-foreground px-1">
                       <span>Muito insatisfeito</span>
                       <span>Muito satisfeito</span>
                     </div>
                     {field.state.meta.errors && field.state.meta.errors.length > 0 ? (
                       <p className="text-xs text-red-500">
                         {field.state.meta.errors
                           .filter((err): err is NonNullable<typeof err> => err != null)
                           .map((err) => typeof err === 'string' ? err : String(err))
                           .join(", ")}
                       </p>
                     ) : null}
                   </div>
                 )}
               </form.Field>

               <form.Field name="sugestoes">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor={field.name}>Sugestões ou Comentários (Opcional)</Label>
                    <Textarea
                      id={field.name}
                      value={field.state.value || ""}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="O que podemos fazer para melhorar sua experiência?"
                      className="min-h-[100px] resize-none"
                    />
                  </div>
                )}
              </form.Field>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={responderMutation.isPending}
              >
                Cancelar
              </Button>
              <form.Subscribe
                selector={(state) => [state.canSubmit, state.isSubmitting]}
                children={([canSubmit, isSubmitting]) => (
                  <Button
                    type="submit"
                    disabled={!canSubmit || isSubmitting || responderMutation.isPending}
                    className="bg-gradient-brand"
                  >
                    {isSubmitting || responderMutation.isPending ? (
                      <span className="flex items-center gap-2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        Enviando...
                      </span>
                    ) : (
                      "Enviar Avaliação"
                    )}
                  </Button>
                )}
              />
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
