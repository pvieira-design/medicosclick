"use client";

import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function CandidaturaSucessoPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md border-none shadow-none bg-transparent">
        <CardHeader className="flex flex-col items-center space-y-4 pb-2">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle2 className="h-8 w-8 text-green-600" />
          </div>
          <CardTitle className="text-center text-2xl font-bold text-slate-900">
            Candidatura Enviada!
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center text-slate-600">
          <p className="mb-4">
            Recebemos suas informações com sucesso. Nossa equipe de recrutamento analisará seu perfil e entrará em contato em breve.
          </p>
          <p className="text-sm text-slate-500">
            Fique atento ao seu email e WhatsApp para os próximos passos.
          </p>
        </CardContent>
        <CardFooter className="flex justify-center pt-4">
          <Link 
            href="/" 
            className={cn(buttonVariants({ variant: "outline" }), "w-full sm:w-auto")}
          >
            Voltar para o início
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
