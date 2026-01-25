"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { trpc, trpcClient } from "@/utils/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, CheckCircle, XCircle, AlertCircle } from "lucide-react";

const formSchema = z.object({
  clientId: z.string().min(1, "Client ID é obrigatório"),
  clientSecret: z.string().min(1, "Client Secret é obrigatório"),
  cpf: z.string().optional(),
  enderecoConsultorio: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function VidaasConfigPage() {
  const [isValidating, setIsValidating] = useState(false);
  const [validationStatus, setValidationStatus] = useState<"none" | "success" | "error">("none");
  const [validationMessage, setValidationMessage] = useState("");

  const { data: credentials, isLoading, refetch } = useQuery(trpc.receita.buscarCredenciaisVidaas.queryOptions());
  
  const saveMutation = useMutation({
    mutationFn: (values: FormValues) => trpcClient.receita.salvarCredenciaisVidaas.mutate(values),
    onSuccess: () => {
      toast.success("Credenciais salvas com sucesso!");
      refetch();
    },
    onError: (error) => {
      toast.error(`Erro ao salvar: ${error.message}`);
    },
  });

  const validateMutation = useMutation({
    mutationFn: (values: { clientId: string; clientSecret: string; cpf: string }) => 
      trpcClient.receita.validarCredenciaisVidaas.mutate(values),
    onSuccess: (data) => {
      if (data.valido) {
        setValidationStatus("success");
        setValidationMessage("Certificado ativo e válido.");
        toast.success("Credenciais validadas com sucesso!");
      } else {
        setValidationStatus("error");
        setValidationMessage("Credenciais válidas, mas nenhum certificado encontrado para este CPF.");
        toast.error("Nenhum certificado encontrado.");
      }
    },
    onError: (error) => {
      setValidationStatus("error");
      setValidationMessage(error.message);
      toast.error(`Erro na validação: ${error.message}`);
    },
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      clientId: "",
      clientSecret: "",
      cpf: "",
      enderecoConsultorio: "",
    },
  });

  useEffect(() => {
    if (credentials) {
      form.reset({
        clientId: credentials.clientId,
        clientSecret: credentials.clientSecret,
        cpf: credentials.cpf || "",
        enderecoConsultorio: credentials.enderecoConsultorio || "",
      });
      
      if (credentials.isConfigured) {
        // 
      }
    }
  }, [credentials, form]);

  const onValidate = async () => {
    const values = form.getValues();
    if (!values.clientId || !values.clientSecret || !values.cpf) {
      toast.error("Preencha Client ID, Client Secret e CPF para validar.");
      return;
    }

    setIsValidating(true);
    try {
      await validateMutation.mutateAsync({
        clientId: values.clientId,
        clientSecret: values.clientSecret,
        cpf: values.cpf,
      });
    } catch (error) {
      
    } finally {
      setIsValidating(false);
    }
  };

  const onSubmit = (values: FormValues) => {
    saveMutation.mutate(values);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
      </div>
    );
  }

  return (
    <div className="container max-w-2xl py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Configuração VIDaaS</h1>
        <p className="text-gray-500 mt-2">
          Configure suas credenciais para assinatura digital de receitas.
        </p>
      </div>

      <Card className="border-gray-200 shadow-none rounded-lg">
        <CardHeader>
          <CardTitle>Credenciais de Acesso</CardTitle>
          <CardDescription>
            Insira os dados fornecidos pela VIDaaS para habilitar a assinatura digital.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="clientId">Client ID <span className="text-red-500">*</span></Label>
              <Input
                id="clientId"
                placeholder="Insira o Client ID"
                {...form.register("clientId")}
                className="border-gray-200"
              />
              {form.formState.errors.clientId && (
                <p className="text-sm text-red-500">{form.formState.errors.clientId.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="clientSecret">Client Secret <span className="text-red-500">*</span></Label>
              <div className="relative">
                <Input
                  id="clientSecret"
                  type="password"
                  placeholder="Insira o Client Secret"
                  {...form.register("clientSecret")}
                  className="border-gray-200 pr-10"
                />
              </div>
              {form.formState.errors.clientSecret && (
                <p className="text-sm text-red-500">{form.formState.errors.clientSecret.message}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                O segredo será mascarado após salvar. Para alterar, digite o novo valor.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cpf">CPF do Médico <span className="text-red-500">*</span></Label>
              <Input
                id="cpf"
                placeholder="000.000.000-00"
                {...form.register("cpf")}
                className="border-gray-200"
              />
              <p className="text-xs text-gray-500">
                Necessário para validar o certificado digital.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="enderecoConsultorio">Endereço do Consultório</Label>
              <Input
                id="enderecoConsultorio"
                placeholder="Rua Exemplo, 123 - Cidade/UF"
                {...form.register("enderecoConsultorio")}
                className="border-gray-200"
              />
              <p className="text-xs text-gray-500">
                Este endereço aparecerá no rodapé das receitas.
              </p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-medium text-gray-700">Status da Integração:</span>
                {validationStatus === "success" ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    <CheckCircle className="w-3 h-3" />
                    Certificado Ativo
                  </span>
                ) : validationStatus === "error" ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    <XCircle className="w-3 h-3" />
                    Erro na Validação
                  </span>
                ) : credentials?.isConfigured ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    <AlertCircle className="w-3 h-3" />
                    Configurado (Não Validado)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    Não Configurado
                  </span>
                )}
              </div>
              
              {validationMessage && (
                <p className={`text-sm ${validationStatus === "error" ? "text-red-600" : "text-green-600"}`}>
                  {validationMessage}
                </p>
              )}
            </div>

            <div className="flex gap-4 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onValidate}
                disabled={isValidating}
                className="flex-1 border-gray-200 hover:bg-gray-50"
              >
                {isValidating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Validando...
                  </>
                ) : (
                  "Validar Credenciais"
                )}
              </Button>
              
              <Button 
                type="submit" 
                className="flex-1 bg-brand-600 hover:bg-brand-700 text-white"
                disabled={saveMutation.isPending}
              >
                {saveMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  "Salvar Configurações"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
