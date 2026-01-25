"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "@tanstack/react-form";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpcClient } from "@/utils/trpc";

const estados = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG",
  "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
];

const formSchema = z.object({
  nome: z.string().min(3, "Nome deve ter no mínimo 3 caracteres"),
  email: z.string().email("Email inválido"),
  telefone: z.string().min(10, "Telefone deve ter no mínimo 10 dígitos"),
  crmNumero: z.string().regex(/^\d{4,6}$/, "CRM deve conter entre 4 e 6 dígitos"),
  crmEstado: z.string().length(2, "Estado deve ter 2 caracteres").toUpperCase(),
  especialidades: z.array(z.string()).min(1, "Selecione pelo menos uma especialidade"),
  experiencia: z.string().min(50, "Descrição de experiência deve ter no mínimo 50 caracteres"),
  disponibilidade: z.string().min(20, "Descrição de disponibilidade deve ter no mínimo 20 caracteres"),
  comoConheceu: z.enum(["google", "indicacao", "linkedin", "instagram", "outro"]),
  comoConheceuOutro: z.string(), // Allow empty string, handle logic in onSubmit
});

export default function CandidaturaPage() {
  const router = useRouter();
  const [newSpecialty, setNewSpecialty] = useState("");

  const form = useForm({
    defaultValues: {
      nome: "",
      email: "",
      telefone: "",
      crmNumero: "",
      crmEstado: "",
      especialidades: [] as string[],
      experiencia: "",
      disponibilidade: "",
      comoConheceu: "google" as "google" | "indicacao" | "linkedin" | "instagram" | "outro",
      comoConheceuOutro: "",
    },
    validators: {
      onSubmit: formSchema,
    },
    onSubmit: async ({ value }) => {
      try {
        await trpcClient.onboarding.submitCandidatura.mutate({
          ...value,
          comoConheceuOutro: value.comoConheceu === "outro" && value.comoConheceuOutro ? value.comoConheceuOutro : undefined,
          anexos: [],
        });
        router.push("/candidatura/sucesso" as any);
      } catch (error: any) {
        toast.error(error.message || "Erro ao enviar candidatura. Tente novamente.");
      }
    },
  });

  const addSpecialty = (field: any) => {
    if (newSpecialty.trim() && !field.state.value.includes(newSpecialty.trim())) {
      field.handleChange([...field.state.value, newSpecialty.trim()]);
      setNewSpecialty("");
    }
  };

  return (
    <div className="container max-w-3xl py-10 px-4 md:px-6">
      <Card className="border-none shadow-none bg-transparent">
        <CardHeader className="px-0">
          <CardTitle className="text-3xl font-bold tracking-tight text-slate-900">
            Trabalhe Conosco
          </CardTitle>
          <CardDescription className="text-lg text-slate-600">
            Faça parte da nossa rede de médicos e transforme a saúde com tecnologia.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              form.handleSubmit();
            }}
            className="space-y-8"
          >
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-900 border-b pb-2">
                Dados Pessoais
              </h3>
              
              <form.Field name="nome">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor={field.name}>Nome Completo</Label>
                    <Input
                      id={field.name}
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="Dr. João Silva"
                    />
                    {field.state.meta.errors.map((error: any) => (
                      <p key={String(error)} className="text-sm text-destructive">
                        {error?.message || String(error)}
                      </p>
                    ))}
                  </div>
                )}
              </form.Field>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <form.Field name="email">
                  {(field) => (
                    <div className="space-y-2">
                      <Label htmlFor={field.name}>Email</Label>
                      <Input
                        id={field.name}
                        name={field.name}
                        type="email"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        placeholder="joao@exemplo.com"
                      />
                      {field.state.meta.errors.map((error: any) => (
                        <p key={String(error)} className="text-sm text-destructive">
                          {error?.message || String(error)}
                        </p>
                      ))}
                    </div>
                  )}
                </form.Field>

                <form.Field name="telefone">
                  {(field) => (
                    <div className="space-y-2">
                      <Label htmlFor={field.name}>Telefone / WhatsApp</Label>
                      <Input
                        id={field.name}
                        name={field.name}
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        placeholder="(11) 99999-9999"
                      />
                      {field.state.meta.errors.map((error: any) => (
                        <p key={String(error)} className="text-sm text-destructive">
                          {error?.message || String(error)}
                        </p>
                      ))}
                    </div>
                  )}
                </form.Field>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-900 border-b pb-2">
                Dados Profissionais
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <form.Field name="crmNumero">
                  {(field) => (
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor={field.name}>Número do CRM</Label>
                      <Input
                        id={field.name}
                        name={field.name}
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        placeholder="123456"
                      />
                      {field.state.meta.errors.map((error: any) => (
                        <p key={String(error)} className="text-sm text-destructive">
                          {error?.message || String(error)}
                        </p>
                      ))}
                    </div>
                  )}
                </form.Field>

                <form.Field name="crmEstado">
                  {(field) => (
                    <div className="space-y-2">
                      <Label htmlFor={field.name}>UF do CRM</Label>
                      <Select
                        value={field.state.value}
                        onValueChange={(val) => field.handleChange(val || "")}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="UF" />
                        </SelectTrigger>
                        <SelectContent>
                          {estados.map((uf) => (
                            <SelectItem key={uf} value={uf}>
                              {uf}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {field.state.meta.errors.map((error: any) => (
                        <p key={String(error)} className="text-sm text-destructive">
                          {error?.message || String(error)}
                        </p>
                      ))}
                    </div>
                  )}
                </form.Field>
              </div>

              <form.Field name="especialidades">
                {(field) => (
                  <div className="space-y-2">
                    <Label>Especialidades</Label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {field.state.value.map((spec, index) => (
                        <div
                          key={index}
                          className="bg-slate-100 text-slate-800 px-3 py-1 rounded-full text-sm flex items-center gap-2"
                        >
                          {spec}
                          <button
                            type="button"
                            onClick={() => {
                              const newSpecs = [...field.state.value];
                              newSpecs.splice(index, 1);
                              field.handleChange(newSpecs);
                            }}
                            className="text-slate-500 hover:text-red-500"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                    
                    <div className="flex gap-2">
                      <Input
                        value={newSpecialty}
                        onChange={(e) => setNewSpecialty(e.target.value)}
                        placeholder="Digite uma especialidade e pressione Enter"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addSpecialty(field);
                          }
                        }}
                      />
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => addSpecialty(field)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    {field.state.meta.errors.map((error: any) => (
                      <p key={String(error)} className="text-sm text-destructive">
                        {error?.message || String(error)}
                      </p>
                    ))}
                  </div>
                )}
              </form.Field>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-900 border-b pb-2">
                Experiência e Disponibilidade
              </h3>

              <form.Field name="experiencia">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor={field.name}>Resumo da Experiência Profissional</Label>
                    <Textarea
                      id={field.name}
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="Conte um pouco sobre sua formação, locais onde trabalhou e principais atuações..."
                      className="min-h-[120px]"
                    />
                    <p className="text-xs text-muted-foreground text-right">
                      {field.state.value.length} caracteres (mínimo 50)
                    </p>
                    {field.state.meta.errors.map((error: any) => (
                      <p key={String(error)} className="text-sm text-destructive">
                        {error?.message || String(error)}
                      </p>
                    ))}
                  </div>
                )}
              </form.Field>

              <form.Field name="disponibilidade">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor={field.name}>Disponibilidade de Horários</Label>
                    <Textarea
                      id={field.name}
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="Ex: Segundas e Quartas pela manhã, Terças à tarde..."
                      className="min-h-[80px]"
                    />
                    <p className="text-xs text-muted-foreground text-right">
                      {field.state.value.length} caracteres (mínimo 20)
                    </p>
                    {field.state.meta.errors.map((error: any) => (
                      <p key={String(error)} className="text-sm text-destructive">
                        {error?.message || String(error)}
                      </p>
                    ))}
                  </div>
                )}
              </form.Field>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-900 border-b pb-2">
                Informações Adicionais
              </h3>

              <form.Field name="comoConheceu">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor={field.name}>Como conheceu a ClickMédicos?</Label>
                    <Select
                      value={field.state.value}
                      onValueChange={(val) => field.handleChange(val as any)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma opção" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="google">Google / Pesquisa</SelectItem>
                        <SelectItem value="indicacao">Indicação</SelectItem>
                        <SelectItem value="linkedin">LinkedIn</SelectItem>
                        <SelectItem value="instagram">Instagram</SelectItem>
                        <SelectItem value="outro">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                    {field.state.meta.errors.map((error: any) => (
                      <p key={String(error)} className="text-sm text-destructive">
                        {error?.message || String(error)}
                      </p>
                    ))}
                  </div>
                )}
              </form.Field>

              <form.Subscribe
                selector={(state) => [state.values.comoConheceu]}
                children={([comoConheceu]) =>
                  comoConheceu === "outro" ? (
                    <form.Field name="comoConheceuOutro">
                      {(field) => (
                        <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                          <Label htmlFor={field.name}>Especifique</Label>
                          <Input
                            id={field.name}
                            name={field.name}
                            value={field.state.value || ""}
                            onBlur={field.handleBlur}
                            onChange={(e) => field.handleChange(e.target.value)}
                            placeholder="Por onde nos conheceu?"
                          />
                        </div>
                      )}
                    </form.Field>
                  ) : null
                }
              />
            </div>

            <div className="pt-6">
              <form.Subscribe
                selector={(state) => [state.canSubmit, state.isSubmitting]}
                children={([canSubmit, isSubmitting]) => (
                  <Button
                    type="submit"
                    size="lg"
                    className="w-full md:w-auto md:min-w-[200px]"
                    disabled={!canSubmit || isSubmitting}
                  >
                    {isSubmitting ? (
                      <span className="flex items-center gap-2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        Enviando...
                      </span>
                    ) : (
                      "Enviar Candidatura"
                    )}
                  </Button>
                )}
              />
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
