"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { toast } from "sonner";
import {
  Plus,
  FileText,
  MoreVertical,
  Copy,
  PenSquare,
  PenTool,
  X,
  ExternalLink,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const STATUS_MAP = {
  RASCUNHO: { label: "Rascunho", color: "bg-gray-100 text-gray-700 border-gray-200" },
  PENDENTE_ASSINATURA: { label: "Pendente", color: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  ASSINADA: { label: "Assinada", color: "bg-green-100 text-green-700 border-green-200" },
  CANCELADA: { label: "Cancelada", color: "bg-red-100 text-red-700 border-red-200" },
};

function openPdfFromDataUrl(dataUrl: string, fileName?: string) {
  const base64Match = dataUrl.match(/^data:application\/pdf;base64,(.+)$/);
  if (!base64Match) {
    window.open(dataUrl, "_blank");
    return;
  }
  
  const base64 = base64Match[1];
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  const blob = new Blob([bytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank");
}

export default function ReceitasPage() {
   const router = useRouter();
   const queryClient = useQueryClient();
   const [page, setPage] = useState(1);
   const [status, setStatus] = useState<string>("all");
   const [dataInicio, setDataInicio] = useState<string>("");
   const [dataFim, setDataFim] = useState<string>("");

   const limit = 20;

   const { data, isLoading, isError } = useQuery(
     trpc.receita.listarReceitas.queryOptions({
       page,
       limit,
       status: status !== "all" ? (status as any) : undefined,
       dataInicio: dataInicio ? new Date(dataInicio) : undefined,
       dataFim: dataFim ? new Date(dataFim) : undefined,
     })
   );

   const duplicarMutation = useMutation({
     ...trpc.receita.duplicarReceita.mutationOptions(),
     onSuccess: (novaReceita: any) => {
       toast.success("Receita duplicada com sucesso!");
       queryClient.invalidateQueries();
       router.push(`/dashboard/receitas/${novaReceita.id}/editar` as any);
     },
     onError: (error: any) => {
       toast.error(`Erro ao duplicar receita: ${error.message}`);
     },
   });

  const handleDuplicar = (id: string) => {
    duplicarMutation.mutate({ receitaId: id });
  };

  const handleLimparFiltros = () => {
    setStatus("all");
    setDataInicio("");
    setDataFim("");
    setPage(1);
  };

  const formatDate = (date: Date | string) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("pt-BR");
  };

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 max-w-[1200px] mx-auto animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900">
            Receitas Médicas
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie suas prescrições, emita novas receitas e acompanhe o status.
          </p>
        </div>
        <Button
          onClick={() => router.push("/dashboard/receitas/nova" as any)}
          className="bg-brand-600 hover:bg-brand-700 text-white gap-2 w-full md:w-auto"
        >
          <Plus className="w-4 h-4" />
          Nova Receita
        </Button>
      </div>

      <Card className="border border-gray-200 shadow-none rounded-xl bg-white">
        <CardContent className="p-4 md:p-5">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="w-full md:w-1/4 space-y-1.5">
              <label className="text-xs font-medium text-gray-600">Status</label>
              <Select value={status} onValueChange={(val) => { if(val) { setStatus(val); setPage(1); } }}>
                <SelectTrigger className="w-full bg-white border-gray-200">
                  <SelectValue placeholder="Todos os status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="RASCUNHO">Rascunho</SelectItem>
                  <SelectItem value="PENDENTE_ASSINATURA">Pendente</SelectItem>
                  <SelectItem value="ASSINADA">Assinada</SelectItem>
                  <SelectItem value="CANCELADA">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="w-full md:w-1/4 space-y-1.5">
              <label className="text-xs font-medium text-gray-600">Data Início</label>
              <div className="relative">
                <Input
                  type="date"
                  value={dataInicio}
                  onChange={(e) => { setDataInicio(e.target.value); setPage(1); }}
                  className="w-full bg-white border-gray-200"
                />
              </div>
            </div>

            <div className="w-full md:w-1/4 space-y-1.5">
              <label className="text-xs font-medium text-gray-600">Data Fim</label>
              <div className="relative">
                <Input
                  type="date"
                  value={dataFim}
                  onChange={(e) => { setDataFim(e.target.value); setPage(1); }}
                  className="w-full bg-white border-gray-200"
                />
              </div>
            </div>

            <div className="w-full md:w-auto flex gap-2">
              {(status !== "all" || dataInicio || dataFim) && (
                <Button
                  variant="ghost"
                  onClick={handleLimparFiltros}
                  className="text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                  title="Limpar filtros"
                >
                  <X className="w-4 h-4 mr-2" />
                  Limpar
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="hidden md:block border border-gray-200 shadow-none rounded-xl bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-gray-50/50">
              <TableRow className="hover:bg-transparent border-gray-100">
                <TableHead className="w-[120px]">Data</TableHead>
                <TableHead>Paciente</TableHead>
                <TableHead className="w-[140px]">Status</TableHead>
                <TableHead className="w-[120px]">Validade</TableHead>
                <TableHead className="text-right min-w-[180px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i} className="border-gray-100">
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-24 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : isError ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-red-500">
                    Erro ao carregar receitas. Tente novamente.
                  </TableCell>
                </TableRow>
              ) : data?.receitas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-48 text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground gap-2">
                      <FileText className="w-8 h-8 text-gray-300" />
                      <p>Nenhuma receita encontrada.</p>
                      {(status !== "all" || dataInicio || dataFim) && (
                        <Button variant="link" onClick={handleLimparFiltros} className="text-brand-600">
                          Limpar filtros
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                data?.receitas.map((receita: any) => {
                  const statusConfig = STATUS_MAP[receita.status as keyof typeof STATUS_MAP] || STATUS_MAP.RASCUNHO;
                  
                  return (
                    <TableRow key={receita.id} className="group hover:bg-gray-50/50 border-gray-100 transition-colors">
                      <TableCell className="font-medium text-gray-700">
                        {formatDate(receita.createdAt)}
                      </TableCell>
                      <TableCell className="font-medium text-gray-900">
                        {receita.pacienteNome}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className={cn("font-normal border", statusConfig.color)}
                        >
                          {statusConfig.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-gray-500 text-sm">
                        {formatDate(receita.dataValidade)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {receita.pdfUrl && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-gray-500 hover:text-brand-600 hover:bg-brand-50"
                              onClick={() => openPdfFromDataUrl(receita.pdfUrl!)}
                              title="Ver PDF"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </Button>
                          )}

                          {(receita.status === "RASCUNHO" || receita.status === "PENDENTE_ASSINATURA") && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-gray-500 hover:text-brand-600 hover:bg-brand-50"
                              onClick={() => router.push(`/dashboard/receitas/${receita.id}/editar` as any)}
                              title={receita.status === "PENDENTE_ASSINATURA" ? "Tentar Assinar" : "Editar"}
                            >
                              <PenSquare className="w-4 h-4" />
                            </Button>
                          )}

                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-gray-500 hover:text-brand-600 hover:bg-brand-50"
                            onClick={() => handleDuplicar(receita.id)}
                            disabled={duplicarMutation.isPending}
                            title="Duplicar"
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <div className="md:hidden space-y-4">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="border border-gray-200 shadow-none rounded-xl bg-white">
              <CardContent className="p-4 space-y-3">
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-16" />
                </div>
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-8 w-full" />
              </CardContent>
            </Card>
          ))
        ) : isError ? (
          <Card className="border border-gray-200 shadow-none rounded-xl bg-white">
            <CardContent className="p-8 text-center text-red-500">
              Erro ao carregar receitas.
            </CardContent>
          </Card>
        ) : data?.receitas.length === 0 ? (
          <Card className="border border-gray-200 shadow-none rounded-xl bg-white">
            <CardContent className="p-8 text-center text-muted-foreground">
              <div className="flex flex-col items-center justify-center gap-2">
                <FileText className="w-8 h-8 text-gray-300" />
                <p>Nenhuma receita encontrada.</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          data?.receitas.map((receita: any) => {
            const statusConfig = STATUS_MAP[receita.status as keyof typeof STATUS_MAP] || STATUS_MAP.RASCUNHO;
            
            return (
              <Card key={receita.id} className="border border-gray-200 shadow-none rounded-xl bg-white">
                <CardContent className="p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-gray-900">{receita.pacienteNome}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {formatDate(receita.createdAt)}
                      </p>
                    </div>
                    <Badge 
                      variant="outline" 
                      className={cn("font-normal border text-xs", statusConfig.color)}
                    >
                      {statusConfig.label}
                    </Badge>
                  </div>
                  
                  <div className="flex gap-2 pt-2">
                    {receita.pdfUrl && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1 h-8 text-xs"
                        onClick={() => openPdfFromDataUrl(receita.pdfUrl!)}
                      >
                        <ExternalLink className="w-3 h-3 mr-1.5" />
                        PDF
                      </Button>
                    )}
                    
                    {(receita.status === "RASCUNHO" || receita.status === "PENDENTE_ASSINATURA") ? (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1 h-8 text-xs"
                        onClick={() => router.push(`/dashboard/receitas/${receita.id}/editar` as any)}
                      >
                        <PenSquare className="w-3 h-3 mr-1.5" />
                        Editar
                      </Button>
                    ) : (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1 h-8 text-xs"
                        onClick={() => handleDuplicar(receita.id)}
                      >
                        <Copy className="w-3 h-3 mr-1.5" />
                        Duplicar
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {data && data.pages > 1 && (
        <div className="flex justify-center">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    if (page > 1) setPage(page - 1);
                  }}
                  className={cn(
                    page <= 1 && "pointer-events-none opacity-50"
                  )}
                />
              </PaginationItem>
              
              {page > 2 && (
                <PaginationItem>
                  <PaginationLink href="#" onClick={(e) => { e.preventDefault(); setPage(1); }}>
                    1
                  </PaginationLink>
                </PaginationItem>
              )}
              
              {page > 3 && (
                <PaginationItem>
                  <span className="flex h-9 w-9 items-center justify-center text-muted-foreground">...</span>
                </PaginationItem>
              )}

              {page > 1 && (
                <PaginationItem>
                  <PaginationLink href="#" onClick={(e) => { e.preventDefault(); setPage(page - 1); }}>
                    {page - 1}
                  </PaginationLink>
                </PaginationItem>
              )}

              <PaginationItem>
                <PaginationLink href="#" isActive>
                  {page}
                </PaginationLink>
              </PaginationItem>

              {page < data.pages && (
                <PaginationItem>
                  <PaginationLink href="#" onClick={(e) => { e.preventDefault(); setPage(page + 1); }}>
                    {page + 1}
                  </PaginationLink>
                </PaginationItem>
              )}

              {page < data.pages - 2 && (
                <PaginationItem>
                  <span className="flex h-9 w-9 items-center justify-center text-muted-foreground">...</span>
                </PaginationItem>
              )}

              {page < data.pages - 1 && (
                <PaginationItem>
                  <PaginationLink href="#" onClick={(e) => { e.preventDefault(); setPage(data.pages); }}>
                    {data.pages}
                  </PaginationLink>
                </PaginationItem>
              )}

              <PaginationItem>
                <PaginationNext
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    if (page < data.pages) setPage(page + 1);
                  }}
                  className={cn(
                    page >= data.pages && "pointer-events-none opacity-50"
                  )}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
}
