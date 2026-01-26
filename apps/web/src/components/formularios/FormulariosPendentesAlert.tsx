"use client"

import { useEffect, useState } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { AlertTriangle, X } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { trpc } from "@/utils/trpc"
import { DetalhesPessoaisModal } from "./DetalhesPessoaisModal"
import { SatisfacaoModal } from "./SatisfacaoModal"

export function FormulariosPendentesAlert() {
  const [isDismissed, setIsDismissed] = useState(true)
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

  useEffect(() => {
    const dismissedAt = localStorage.getItem("formularios-dismissed-at")
    if (dismissedAt) {
      const date = new Date(dismissedAt)
      const now = new Date()
      const diff = now.getTime() - date.getTime()
      const ONE_DAY_IN_MS = 24 * 60 * 60 * 1000
      
      if (diff < ONE_DAY_IN_MS) {
        setIsDismissed(true)
        return
      }
    }
    setIsDismissed(false)
  }, [])
  
  if (!isMedico) return null
  if (isDismissed) return null
  if (isLoadingDetalhes || isLoadingSatisfacao) return null

  const temDetalhesPendentes = detalhes === null
  const temSatisfacaoPendente = satisfacao?.dentroJanela && !satisfacao?.jaRespondeu

  if (!temDetalhesPendentes && !temSatisfacaoPendente) return null

  const handleDismiss = () => {
    localStorage.setItem("formularios-dismissed-at", new Date().toISOString())
    setIsDismissed(true)
  }

  return (
    <>
      <Alert variant="warning" className="mb-6 relative shadow-sm border-amber-200 bg-amber-50">
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
        <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 h-6 w-6 text-amber-700 hover:text-amber-900 hover:bg-amber-100/50 rounded-full"
            onClick={handleDismiss}
        >
            <X className="h-4 w-4" />
        </Button>
      </Alert>

      <DetalhesPessoaisModal open={showDetalhesModal} onOpenChange={setShowDetalhesModal} />
      <SatisfacaoModal open={showSatisfacaoModal} onOpenChange={setShowSatisfacaoModal} />
    </>
  )
}
