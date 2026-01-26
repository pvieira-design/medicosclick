"use client"

import { useState } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { AlertTriangle } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { trpc } from "@/utils/trpc"
import { DetalhesPessoaisModal } from "./DetalhesPessoaisModal"
import { SatisfacaoModal } from "./SatisfacaoModal"

export function FormulariosPendentesAlert() {
  const [showDetalhesModal, setShowDetalhesModal] = useState(false)
  const [showSatisfacaoModal, setShowSatisfacaoModal] = useState(false)

  const { data: me } = useQuery(trpc.me.queryOptions())
  
  const isMedico = !!me && me.user.tipo === "medico"
  
  const { data: detalhes, isLoading: isLoadingDetalhes } = useQuery({
    ...trpc.formularios.getDetalhesPessoais.queryOptions(undefined),
    enabled: isMedico,
  })
  
  const { data: satisfacao, isLoading: isLoadingSatisfacao } = useQuery({
    ...trpc.formularios.getSatisfacaoAtual.queryOptions(undefined),
    enabled: isMedico,
  })
  
  if (!isMedico) return null
  if (isLoadingDetalhes || isLoadingSatisfacao) return null

  const temDetalhesPendentes = detalhes === null
  const temSatisfacaoPendente = satisfacao?.dentroJanela && !satisfacao?.jaRespondeu

  if (!temDetalhesPendentes && !temSatisfacaoPendente) return null

  return (
    <>
      <Alert variant="warning" className="mb-6 shadow-sm border-amber-200 bg-amber-50">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <AlertTitle className="text-amber-800 font-semibold ml-2">Ação Necessária</AlertTitle>
        <AlertDescription className="flex flex-col gap-3 mt-2 ml-2 text-amber-700">
          <p>
            Você possui formulários pendentes. Por favor, preencha-os para manter seu cadastro atualizado.
          </p>
          <div className="flex flex-wrap gap-3">
            {temDetalhesPendentes && (
              <Button 
                size="sm" 
                className="bg-amber-600 hover:bg-amber-700 text-white border-none"
                onClick={() => setShowDetalhesModal(true)}
              >
                Preencher Detalhes Pessoais
              </Button>
            )}
            {temSatisfacaoPendente && (
              <Button 
                size="sm" 
                className="bg-amber-600 hover:bg-amber-700 text-white border-none"
                onClick={() => setShowSatisfacaoModal(true)}
              >
                Responder Pesquisa de Satisfação
              </Button>
            )}
          </div>
        </AlertDescription>
      </Alert>

      <DetalhesPessoaisModal open={showDetalhesModal} onOpenChange={setShowDetalhesModal} />
      <SatisfacaoModal open={showSatisfacaoModal} onOpenChange={setShowSatisfacaoModal} />
    </>
  )
}
