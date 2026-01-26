import { useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "@tanstack/react-form";
import { z } from "zod";
import { trpc } from "@/utils/trpc";
import { toast } from "sonner";

const detalhesPessoaisSchema = z.object({
  tamanhoCamisa: z.string().optional(),
  tamanhoCalcado: z.string().optional(),
  marcaRoupa: z.string().optional(),
  cep: z.string().optional(),
  rua: z.string().optional(),
  numero: z.string().optional(),
  complemento: z.string().optional(),
  bairro: z.string().optional(),
  cidade: z.string().optional(),
  estado: z.string().optional(),
  dataAniversario: z.date().optional(),
  hobbies: z.string().optional(),
  pets: z.string().optional(),
  corFavorita: z.string().optional(),
  destinoViagem: z.string().optional(),
  esportePratica: z.string().optional(),
});

type DetalhesPessoais = z.infer<typeof detalhesPessoaisSchema>;

interface DetalhesPessoaisModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ESTADOS_BRASIL = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG",
  "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
];

const TAMANHOS_CAMISA = ["P", "M", "G", "GG", "XG"];
const TAMANHOS_CALCADO = Array.from({ length: 13 }, (_, i) => (34 + i).toString());

export function DetalhesPessoaisModal({ open, onOpenChange }: DetalhesPessoaisModalProps) {
  const { data: detalhes, isLoading } = useQuery({
    ...trpc.formularios.getDetalhesPessoais.queryOptions(undefined),
    enabled: open,
    staleTime: 1000 * 60 * 5,
  });
  
  const upsertMutation = useMutation(trpc.formularios.upsertDetalhesPessoais.mutationOptions({
    onSuccess: () => {
      toast.success("Detalhes salvos com sucesso!");
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao salvar detalhes.");
    },
  }));

  const form = useForm({
    defaultValues: (detalhes as unknown as DetalhesPessoais) || {},
    validators: {
      onChange: detalhesPessoaisSchema,
    },
    onSubmit: async ({ value }) => {
      await upsertMutation.mutateAsync(value);
    },
  });

  useEffect(() => {
    if (detalhes) {
      const dadosFormatados = {
        ...detalhes,
        dataAniversario: detalhes.dataAniversario ? new Date(detalhes.dataAniversario) : undefined,
      };
      form.reset(dadosFormatados as DetalhesPessoais);
    }
  }, [detalhes, form]);

  const handleCepMask = (value: string) => {
    return value
      .replace(/\D/g, "")
      .replace(/^(\d{5})(\d)/, "$1-$2")
      .substring(0, 9);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalhes Pessoais</DialogTitle>
          <DialogDescription>
            Preencha suas informações para que possamos conhecê-lo melhor e enviar presentes personalizados.
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
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-900 border-b pb-2">
                Vestimenta
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <form.Field name="tamanhoCamisa">
                  {(field) => (
                    <div className="space-y-2">
                      <Label htmlFor={field.name}>Tamanho Camisa</Label>
                      <Select
                        value={field.state.value || ""}
                        onValueChange={(val) => field.handleChange(val || undefined)}
                      >
                        <SelectTrigger id={field.name}>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {TAMANHOS_CAMISA.map((t) => (
                            <SelectItem key={t} value={t}>{t}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </form.Field>

                <form.Field name="tamanhoCalcado">
                  {(field) => (
                    <div className="space-y-2">
                      <Label htmlFor={field.name}>Tamanho Calçado</Label>
                      <Select
                        value={field.state.value || ""}
                        onValueChange={(val) => field.handleChange(val || undefined)}
                      >
                        <SelectTrigger id={field.name}>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {TAMANHOS_CALCADO.map((t) => (
                            <SelectItem key={t} value={t}>{t}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </form.Field>

                <form.Field name="marcaRoupa">
                  {(field) => (
                    <div className="space-y-2">
                      <Label htmlFor={field.name}>Marca de Roupa Favorita</Label>
                      <Input
                        id={field.name}
                        value={field.state.value || ""}
                        onChange={(e) => field.handleChange(e.target.value)}
                        placeholder="Ex: Nike, Zara..."
                      />
                    </div>
                  )}
                </form.Field>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-900 border-b pb-2">
                Endereço para Entrega
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <form.Field name="cep">
                  {(field) => (
                    <div className="space-y-2">
                      <Label htmlFor={field.name}>CEP</Label>
                      <Input
                        id={field.name}
                        value={field.state.value || ""}
                        onChange={(e) => field.handleChange(handleCepMask(e.target.value))}
                        placeholder="00000-000"
                        maxLength={9}
                      />
                    </div>
                  )}
                </form.Field>

                <form.Field name="rua">
                  {(field) => (
                    <div className="space-y-2 md:col-span-3">
                      <Label htmlFor={field.name}>Rua</Label>
                      <Input
                        id={field.name}
                        value={field.state.value || ""}
                        onChange={(e) => field.handleChange(e.target.value)}
                        placeholder="Nome da rua"
                      />
                    </div>
                  )}
                </form.Field>

                <form.Field name="numero">
                  {(field) => (
                    <div className="space-y-2">
                      <Label htmlFor={field.name}>Número</Label>
                      <Input
                        id={field.name}
                        value={field.state.value || ""}
                        onChange={(e) => field.handleChange(e.target.value)}
                        placeholder="123"
                      />
                    </div>
                  )}
                </form.Field>

                <form.Field name="complemento">
                  {(field) => (
                    <div className="space-y-2">
                      <Label htmlFor={field.name}>Complemento</Label>
                      <Input
                        id={field.name}
                        value={field.state.value || ""}
                        onChange={(e) => field.handleChange(e.target.value)}
                        placeholder="Apto 101"
                      />
                    </div>
                  )}
                </form.Field>

                <form.Field name="bairro">
                  {(field) => (
                    <div className="space-y-2">
                      <Label htmlFor={field.name}>Bairro</Label>
                      <Input
                        id={field.name}
                        value={field.state.value || ""}
                        onChange={(e) => field.handleChange(e.target.value)}
                        placeholder="Bairro"
                      />
                    </div>
                  )}
                </form.Field>

                <form.Field name="cidade">
                  {(field) => (
                    <div className="space-y-2">
                      <Label htmlFor={field.name}>Cidade</Label>
                      <Input
                        id={field.name}
                        value={field.state.value || ""}
                        onChange={(e) => field.handleChange(e.target.value)}
                        placeholder="Cidade"
                      />
                    </div>
                  )}
                </form.Field>

                <form.Field name="estado">
                  {(field) => (
                    <div className="space-y-2 md:col-span-4">
                      <Label htmlFor={field.name}>Estado</Label>
                      <Select
                        value={field.state.value || ""}
                        onValueChange={(val) => field.handleChange(val || undefined)}
                      >
                        <SelectTrigger id={field.name}>
                          <SelectValue placeholder="UF" />
                        </SelectTrigger>
                        <SelectContent>
                          {ESTADOS_BRASIL.map((uf) => (
                            <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </form.Field>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-900 border-b pb-2">
                Pessoal
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <form.Field name="dataAniversario">
                  {(field) => (
                    <div className="space-y-2">
                      <Label htmlFor={field.name}>Data de Aniversário</Label>
                      <Input
                        id={field.name}
                        type="date"
                        value={field.state.value ? field.state.value.toISOString().split('T')[0] : ""}
                        onChange={(e) => field.handleChange(e.target.valueAsDate || undefined)}
                      />
                    </div>
                  )}
                </form.Field>

                <form.Field name="corFavorita">
                  {(field) => (
                    <div className="space-y-2">
                      <Label htmlFor={field.name}>Cor Favorita</Label>
                      <Input
                        id={field.name}
                        value={field.state.value || ""}
                        onChange={(e) => field.handleChange(e.target.value)}
                        placeholder="Ex: Azul Marinho"
                      />
                    </div>
                  )}
                </form.Field>

                <form.Field name="destinoViagem">
                  {(field) => (
                    <div className="space-y-2">
                      <Label htmlFor={field.name}>Destino de Viagem dos Sonhos</Label>
                      <Input
                        id={field.name}
                        value={field.state.value || ""}
                        onChange={(e) => field.handleChange(e.target.value)}
                        placeholder="Ex: Paris, Maldivas..."
                      />
                    </div>
                  )}
                </form.Field>

                <form.Field name="esportePratica">
                  {(field) => (
                    <div className="space-y-2">
                      <Label htmlFor={field.name}>Esporte que Pratica</Label>
                      <Input
                        id={field.name}
                        value={field.state.value || ""}
                        onChange={(e) => field.handleChange(e.target.value)}
                        placeholder="Ex: Tênis, Corrida..."
                      />
                    </div>
                  )}
                </form.Field>

                <form.Field name="hobbies">
                  {(field) => (
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor={field.name}>Hobbies</Label>
                      <Textarea
                        id={field.name}
                        value={field.state.value || ""}
                        onChange={(e) => field.handleChange(e.target.value)}
                        placeholder="O que você gosta de fazer no tempo livre?"
                        className="min-h-[80px]"
                      />
                    </div>
                  )}
                </form.Field>

                <form.Field name="pets">
                  {(field) => (
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor={field.name}>Pets</Label>
                      <Textarea
                        id={field.name}
                        value={field.state.value || ""}
                        onChange={(e) => field.handleChange(e.target.value)}
                        placeholder="Tem animais de estimação? Quais?"
                        className="min-h-[80px]"
                      />
                    </div>
                  )}
                </form.Field>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={upsertMutation.isPending}
              >
                Cancelar
              </Button>
              <form.Subscribe
                selector={(state) => [state.canSubmit, state.isSubmitting]}
                children={([canSubmit, isSubmitting]) => (
                  <Button
                    type="submit"
                    disabled={!canSubmit || isSubmitting || upsertMutation.isPending}
                  >
                    {isSubmitting || upsertMutation.isPending ? (
                      <span className="flex items-center gap-2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        Salvando...
                      </span>
                    ) : (
                      "Salvar Detalhes"
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
