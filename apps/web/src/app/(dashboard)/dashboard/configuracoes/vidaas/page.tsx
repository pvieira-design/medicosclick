"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { trpc, trpcClient } from "@/utils/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, CheckCircle, XCircle } from "lucide-react";

const ALLOWED_EMAIL = "isabelaururahy@live.com";

const UF_OPTIONS = ['AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO'];

const formSchema = z.object({
  cpf: z.string().min(11, "CPF é obrigatório"),
  enderecoConsultorio: z.string().optional(),
  ufCrm: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function VidaasConfigPage() {
  const router = useRouter();
  const [ufCrmValue, setUfCrmValue] = useState<string>("");
  const [validationResult, setValidationResult] = useState<{ checked: boolean; valid: boolean; message: string }>({ checked: false, valid: false, message: "" });

  const { data: me, isLoading: isLoadingMe } = useQuery(trpc.me.queryOptions());
  const { data: credentials, isLoading: isLoadingCredentials, refetch } = useQuery(trpc.receita.buscarCredenciaisVidaas.queryOptions());
  
  const userEmail = me?.user?.email;
  const hasAccess = userEmail === ALLOWED_EMAIL;
  
  useEffect(() => {
    if (!isLoadingMe && !hasAccess) {
      router.replace("/dashboard");
    }
  }, [isLoadingMe, hasAccess, router]);
  
  const isLoading = isLoadingMe || isLoadingCredentials;
  
  const saveMutation = useMutation({
    mutationFn: (values: FormValues) => trpcClient.receita.salvarCredenciaisVidaas.mutate(values),
    onSuccess: () => {
      toast.success("Configurações salvas com sucesso!");
      refetch();
    },
    onError: (error) => {
      toast.error(`Erro ao salvar: ${error.message}`);
    },
  });

  const validateMutation = useMutation({
    mutationFn: (values: { cpf: string }) => trpcClient.receita.validarCredenciaisVidaas.mutate(values),
    onSuccess: (data) => {
      if (data.valido) {
        setValidationResult({ checked: true, valid: true, message: "Certificado digital encontrado e ativo." });
        toast.success("Certificado validado com sucesso!");
      } else {
        setValidationResult({ checked: true, valid: false, message: "Nenhum certificado encontrado para este CPF." });
        toast.error("Nenhum certificado encontrado.");
      }
    },
    onError: (error) => {
      setValidationResult({ checked: true, valid: false, message: error.message });
      toast.error(`Erro: ${error.message}`);
    },
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      cpf: "",
      enderecoConsultorio: "",
      ufCrm: "",
    },
  });

  useEffect(() => {
    if (credentials) {
      const ufValue = credentials.ufCrm || "";
      form.reset({
        cpf: credentials.cpf || "",
        enderecoConsultorio: credentials.enderecoConsultorio || "",
        ufCrm: ufValue,
      });
      setUfCrmValue(ufValue);
    }
  }, [credentials, form]);

  const onSubmit = async (values: FormValues) => {
    await saveMutation.mutateAsync(values);
    if (values.cpf) {
      validateMutation.mutate({ cpf: values.cpf });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
      </div>
    );
  }
  
  if (!hasAccess) {
    return null;
  }

  return (
    <div className="container max-w-2xl py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Informações Pessoais</h1>
        <p className="text-gray-500 mt-2">
          Configure seus dados para emissão e assinatura digital de receitas médicas.
        </p>
      </div>

      <Card className="border-gray-200 shadow-none rounded-lg">
        <CardHeader>
          <CardTitle>Dados do Médico</CardTitle>
          <CardDescription>
            Informe seu CPF e dados adicionais para a assinatura digital.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="cpf">CPF <span className="text-red-500">*</span></Label>
              <Input
                id="cpf"
                placeholder="000.000.000-00"
                {...form.register("cpf")}
                className="border-gray-200"
              />
              {form.formState.errors.cpf && (
                <p className="text-sm text-red-500">{form.formState.errors.cpf.message}</p>
              )}
              <p className="text-xs text-gray-500">
                O CPF deve corresponder ao cadastrado no seu certificado VIDaaS.
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

            <div className="space-y-2">
              <Label htmlFor="ufCrm">UF do CRM</Label>
              <Select value={ufCrmValue} onValueChange={(value) => {
                if (value) {
                  setUfCrmValue(value);
                  form.setValue("ufCrm", value);
                }
              }}>
                <SelectTrigger className="border-gray-200">
                  <SelectValue placeholder="Selecione o estado" />
                </SelectTrigger>
                <SelectContent>
                  {UF_OPTIONS.map(uf => (
                    <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                Estado do seu CRM para exibição no PDF da receita.
              </p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-medium text-gray-700">Status do Certificado:</span>
                {validationResult.checked ? (
                  validationResult.valid ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      <CheckCircle className="w-3 h-3" />
                      Certificado Ativo
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      <XCircle className="w-3 h-3" />
                      Não Encontrado
                    </span>
                  )
                ) : credentials?.isConfigured ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    <CheckCircle className="w-3 h-3" />
                    Integração Configurada
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    Aguardando Configuração
                  </span>
                )}
              </div>
              
              {validationResult.message && (
                <p className={`text-sm ${validationResult.valid ? "text-green-600" : "text-red-600"}`}>
                  {validationResult.message}
                </p>
              )}
            </div>

            <div className="pt-4">
              <Button 
                type="submit" 
                className="w-full bg-brand-600 hover:bg-brand-700 text-white"
                disabled={saveMutation.isPending || validateMutation.isPending}
              >
                {saveMutation.isPending || validateMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {validateMutation.isPending ? "Validando certificado..." : "Salvando..."}
                  </>
                ) : (
                  "Salvar e Validar Certificado"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
