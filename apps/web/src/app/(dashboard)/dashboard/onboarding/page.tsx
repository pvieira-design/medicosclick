"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { trpc, trpcClient } from "@/utils/trpc";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Clock, Calendar, FileText, MessageSquare, GraduationCap, CheckCircle, History, User, Mail, Phone, MapPin, FileIcon, AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const STAGES = [
  { id: "candidato", label: "Candidatos", color: "bg-slate-100 dark:bg-slate-800" },
  { id: "entrevista", label: "Entrevista", color: "bg-blue-50 dark:bg-blue-900/20" },
  { id: "treinamento", label: "Treinamento", color: "bg-purple-50 dark:bg-purple-900/20" },
  { id: "ativo", label: "Ativo", color: "bg-emerald-50 dark:bg-emerald-900/20" },
  { id: "performance", label: "Performance", color: "bg-amber-50 dark:bg-amber-900/20" },
] as const;

type StageId = typeof STAGES[number]["id"];

export default function OnboardingPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [showRejected, setShowRejected] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useMemo(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            Funil de Onboarding
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            Gerencie o processo de entrada de novos médicos
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar candidato..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <Switch
              id="show-rejected"
              checked={showRejected}
              onCheckedChange={setShowRejected}
            />
            <Label htmlFor="show-rejected">Mostrar rejeitados</Label>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto">
        <div className="flex h-full gap-4 min-w-[1200px]">
          {STAGES.map((stage) => (
            <KanbanColumn
              key={stage.id}
              stage={stage}
              search={debouncedSearch}
              showRejected={showRejected}
              onSelect={setSelectedId}
            />
          ))}
        </div>
      </div>

      <CandidatoDrawer 
        open={!!selectedId} 
        onOpenChange={(open) => !open && setSelectedId(null)}
        candidatoId={selectedId}
      />
    </div>
  );
}

function KanbanColumn({ 
  stage, 
  search, 
  showRejected,
  onSelect
}: { 
  stage: typeof STAGES[number]; 
  search: string; 
  showRejected: boolean;
  onSelect: (id: string) => void;
}) {
  const { data, isLoading } = useQuery(trpc.onboarding.listarCandidatos.queryOptions({
    estagio: stage.id as StageId,
    busca: search || undefined,
    status: showRejected ? undefined : "em_andamento",
    perPage: 50,
  }));

  const count = data?.total || 0;

  return (
    <div className="flex flex-col w-1/5 min-w-[280px] h-full rounded-xl bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
      <div className={`p-3 border-b border-slate-200 dark:border-slate-800 rounded-t-xl flex items-center justify-between ${stage.color}`}>
        <h3 className="font-semibold text-sm text-slate-700 dark:text-slate-200">
          {stage.label}
        </h3>
        <Badge variant="secondary" className="bg-white/50 dark:bg-black/20 text-slate-600 dark:text-slate-300">
          {isLoading ? "..." : count}
        </Badge>
      </div>

      <ScrollArea className="flex-1 p-3">
        <div className="space-y-3">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full rounded-lg" />
            ))
          ) : data?.candidatos.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">
              Nenhum candidato
            </div>
          ) : (
            data?.candidatos.map((candidato) => (
              <CandidatoCard 
                key={candidato.id} 
                candidato={candidato} 
                onClick={() => onSelect(candidato.id)}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

interface Candidato {
  id: string;
  nome: string;
  createdAt: string | Date;
  status: string;
  especialidades: string[];
}

function CandidatoCard({ candidato, onClick }: { candidato: Candidato; onClick: () => void }) {
  const isRejected = candidato.status === "rejeitado";
  const createdDate = new Date(candidato.createdAt);
  
  const getRelativeTime = (date: Date) => {
    const diff = Date.now() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return "Hoje";
    if (days === 1) return "Ontem";
    return `há ${days} dias`;
  };

  return (
    <Card 
      className={`cursor-pointer hover:shadow-md transition-all duration-200 border-slate-200 dark:border-slate-800 ${isRejected ? 'opacity-60 bg-slate-50' : 'bg-white dark:bg-slate-950'}`}
      onClick={onClick}
    >
      <CardContent className="p-4 space-y-3">
        <div className="flex justify-between items-start gap-2">
          <h4 className="font-medium text-sm text-slate-900 dark:text-slate-100 line-clamp-1" title={candidato.nome}>
            {candidato.nome}
          </h4>
          {isRejected && (
            <Badge variant="destructive" className="h-5 text-[10px] px-1.5">
              Rejeitado
            </Badge>
          )}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Calendar className="h-3 w-3" />
            <span>{createdDate.toLocaleDateString('pt-BR')}</span>
          </div>
          
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Clock className="h-3 w-3" />
            <span>{getRelativeTime(createdDate)}</span>
          </div>
        </div>

        {candidato.especialidades && candidato.especialidades.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1">
            {candidato.especialidades.slice(0, 2).map((esp: string) => (
              <Badge 
                key={esp} 
                variant="outline" 
                className="text-[10px] px-1.5 h-5 border-slate-200 text-slate-600"
              >
                {esp}
              </Badge>
            ))}
            {candidato.especialidades.length > 2 && (
              <Badge variant="outline" className="text-[10px] px-1.5 h-5 border-slate-200 text-slate-500">
                +{candidato.especialidades.length - 2}
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface CandidatoDetail {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  crmNumero: string;
  crmEstado: string;
  especialidades: string[];
  experiencia: string;
  disponibilidade: string;
  status: string;
  createdAt: string | Date;
  anexos: { id: string; nome: string; url: string; tamanho: number; tipo: string }[];
  historico: { id: string; acao: string; de?: string | null; para?: string | null; detalhes?: any; usuario?: { name: string | null } | null; createdAt: string | Date }[];
}

function CandidatoDrawer({ 
  open, 
  onOpenChange, 
  candidatoId 
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void; 
  candidatoId: string | null 
}) {
  const { data: candidato, isLoading } = useQuery({
    queryKey: ["candidato-detail", candidatoId],
    queryFn: async () => {
      const res = await trpcClient.onboarding.getCandidato.query({ id: candidatoId ?? "" });
      return res as unknown as CandidatoDetail;
    },
    enabled: !!candidatoId
  });

  if (!candidatoId) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full !max-w-[800px] overflow-y-auto p-0 sm:p-0 flex flex-col h-full">
        {isLoading || !candidato ? (
          <div className="p-6 space-y-6">
            <div className="flex items-center gap-4">
              <Skeleton className="h-16 w-16 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : (
          <>
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16 border-2 border-white shadow-sm">
                    <AvatarFallback className="bg-brand-100 text-brand-700 text-xl font-bold">
                      {candidato.nome.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                      {candidato.nome}
                    </h2>
                    <div className="flex items-center gap-2 text-sm text-slate-500 mt-1">
                      <Badge variant="outline" className="bg-white">
                        CRM {candidato.crmNumero}/{candidato.crmEstado}
                      </Badge>
                      <span className="text-slate-300">|</span>
                      <span>{candidato.email}</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge className={
                    candidato.status === 'rejeitado' ? 'bg-red-100 text-red-700 hover:bg-red-100' :
                    candidato.status === 'concluido' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' :
                    'bg-blue-100 text-blue-700 hover:bg-blue-100'
                  }>
                    {candidato.status === 'em_andamento' ? 'Em Andamento' : 
                     candidato.status === 'rejeitado' ? 'Rejeitado' : 'Concluído'}
                  </Badge>
                  <span className="text-xs text-slate-400">
                    Criado em {new Date(candidato.createdAt).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col">
              <Tabs defaultValue="dados" className="flex-1 flex flex-col">
                <div className="px-6 pt-4 border-b border-slate-100 dark:border-slate-800">
                  <TabsList className="w-full justify-start h-auto p-0 bg-transparent gap-6">
                    <TabsTrigger 
                      value="dados" 
                      className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-brand-600 rounded-none px-0 pb-3 text-slate-500 data-[state=active]:text-brand-600 gap-2"
                    >
                      <FileText className="h-4 w-4" />
                      Dados
                    </TabsTrigger>
                    <TabsTrigger 
                      value="entrevista" 
                      className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-brand-600 rounded-none px-0 pb-3 text-slate-500 data-[state=active]:text-brand-600 gap-2"
                    >
                      <MessageSquare className="h-4 w-4" />
                      Entrevista
                    </TabsTrigger>
                    <TabsTrigger 
                      value="treinamento" 
                      className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-brand-600 rounded-none px-0 pb-3 text-slate-500 data-[state=active]:text-brand-600 gap-2"
                    >
                      <GraduationCap className="h-4 w-4" />
                      Treinamento
                    </TabsTrigger>
                    <TabsTrigger 
                      value="ativacao" 
                      className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-brand-600 rounded-none px-0 pb-3 text-slate-500 data-[state=active]:text-brand-600 gap-2"
                    >
                      <CheckCircle className="h-4 w-4" />
                      Ativação
                    </TabsTrigger>
                    <TabsTrigger 
                      value="historico" 
                      className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-brand-600 rounded-none px-0 pb-3 text-slate-500 data-[state=active]:text-brand-600 gap-2"
                    >
                      <History className="h-4 w-4" />
                      Histórico
                    </TabsTrigger>
                  </TabsList>
                </div>

                <ScrollArea className="flex-1">
                  <div className="p-6">
                    <TabsContent value="dados" className="mt-0 space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                            <User className="h-4 w-4 text-brand-600" />
                            Informações Pessoais
                          </h3>
                          <div className="grid gap-4 p-4 rounded-lg border border-slate-100 bg-slate-50/50">
                            <div className="grid gap-1">
                              <Label className="text-xs text-slate-500">Nome Completo</Label>
                              <div className="font-medium">{candidato.nome}</div>
                            </div>
                            <div className="grid gap-1">
                              <Label className="text-xs text-slate-500">Email</Label>
                              <div className="flex items-center gap-2">
                                <Mail className="h-3 w-3 text-slate-400" />
                                {candidato.email}
                              </div>
                            </div>
                            <div className="grid gap-1">
                              <Label className="text-xs text-slate-500">Telefone</Label>
                              <div className="flex items-center gap-2">
                                <Phone className="h-3 w-3 text-slate-400" />
                                {candidato.telefone}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-brand-600" />
                            Informações Profissionais
                          </h3>
                          <div className="grid gap-4 p-4 rounded-lg border border-slate-100 bg-slate-50/50">
                            <div className="grid gap-1">
                              <Label className="text-xs text-slate-500">CRM</Label>
                              <div className="font-medium">{candidato.crmNumero} / {candidato.crmEstado}</div>
                            </div>
                            <div className="grid gap-1">
                              <Label className="text-xs text-slate-500">Especialidades</Label>
                              <div className="flex flex-wrap gap-1">
                                {candidato.especialidades.map((esp) => (
                                  <Badge key={esp} variant="secondary" className="bg-white border border-slate-200">
                                    {esp}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <Separator />

                      <div className="space-y-4">
                        <h3 className="font-semibold text-slate-900">Experiência Profissional</h3>
                        <div className="p-4 rounded-lg border border-slate-100 bg-slate-50/50 text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                          {candidato.experiencia}
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h3 className="font-semibold text-slate-900">Disponibilidade</h3>
                        <div className="p-4 rounded-lg border border-slate-100 bg-slate-50/50 text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                          {candidato.disponibilidade}
                        </div>
                      </div>

                      {candidato.anexos && candidato.anexos.length > 0 && (
                        <>
                          <Separator />
                          <div className="space-y-4">
                            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                              <FileIcon className="h-4 w-4 text-brand-600" />
                              Anexos
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {candidato.anexos.map((anexo) => (
                                <a 
                                  key={anexo.id} 
                                  href={anexo.url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:border-brand-300 hover:bg-brand-50/30 transition-colors group"
                                >
                                  <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center group-hover:bg-white transition-colors">
                                    <FileText className="h-5 w-5 text-slate-500 group-hover:text-brand-600" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="font-medium text-sm truncate text-slate-700 group-hover:text-brand-700">
                                      {anexo.nome}
                                    </div>
                                    <div className="text-xs text-slate-400">
                                      {(anexo.tamanho / 1024).toFixed(0)} KB • {anexo.tipo.split('/')[1]?.toUpperCase() || 'FILE'}
                                    </div>
                                  </div>
                                </a>
                              ))}
                            </div>
                          </div>
                        </>
                      )}
                    </TabsContent>

                    <TabsContent value="entrevista" className="mt-0">
                      <div className="flex flex-col items-center justify-center h-64 text-center space-y-4">
                        <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center">
                          <MessageSquare className="h-6 w-6 text-slate-400" />
                        </div>
                        <div>
                          <h3 className="font-medium text-slate-900">Avaliação de Entrevista</h3>
                          <p className="text-sm text-slate-500 max-w-xs mx-auto mt-1">
                            O formulário de avaliação da entrevista será implementado na próxima etapa.
                          </p>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="treinamento" className="mt-0">
                      <div className="flex flex-col items-center justify-center h-64 text-center space-y-4">
                        <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center">
                          <GraduationCap className="h-6 w-6 text-slate-400" />
                        </div>
                        <div>
                          <h3 className="font-medium text-slate-900">Checklist de Treinamento</h3>
                          <p className="text-sm text-slate-500 max-w-xs mx-auto mt-1">
                            O checklist de treinamento e onboarding será implementado em breve.
                          </p>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="ativacao" className="mt-0">
                      <div className="flex flex-col items-center justify-center h-64 text-center space-y-4">
                        <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center">
                          <CheckCircle className="h-6 w-6 text-slate-400" />
                        </div>
                        <div>
                          <h3 className="font-medium text-slate-900">Ativação de Conta</h3>
                          <p className="text-sm text-slate-500 max-w-xs mx-auto mt-1">
                            A criação de usuário e configuração de acesso será feita aqui.
                          </p>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="historico" className="mt-0">
                      <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent">
                        {candidato.historico.map((item, index) => (
                          <div key={item.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                            <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-slate-50 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                              {item.acao === 'CRIADO' ? <User className="w-5 h-5 text-blue-500" /> :
                               item.acao === 'REJEITADO' ? <AlertCircle className="w-5 h-5 text-red-500" /> :
                               item.acao === 'ESTAGIO_ALTERADO' ? <CheckCircle className="w-5 h-5 text-emerald-500" /> :
                               <History className="w-5 h-5 text-slate-500" />}
                            </div>
                            
                            <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-slate-200 bg-white shadow-sm">
                              <div className="flex items-center justify-between space-x-2 mb-1">
                                <div className="font-bold text-slate-900 text-sm">
                                  {item.acao === 'CRIADO' ? 'Candidatura Recebida' :
                                   item.acao === 'REJEITADO' ? 'Candidato Rejeitado' :
                                   item.acao === 'ESTAGIO_ALTERADO' ? `Mudança para ${item.para?.toUpperCase()}` :
                                   item.acao}
                                </div>
                                <time className="font-mono text-xs text-slate-500">
                                  {new Date(item.createdAt).toLocaleDateString('pt-BR')}
                                </time>
                              </div>
                              <div className="text-slate-500 text-sm">
                                {item.acao === 'CRIADO' && (
                                  <span>Fonte: {(item.detalhes as any)?.fonte || 'Desconhecida'}</span>
                                )}
                                {item.acao === 'REJEITADO' && (
                                  <span className="text-red-600">Motivo: {(item.detalhes as any)?.motivo}</span>
                                )}
                                {item.acao === 'ESTAGIO_ALTERADO' && (
                                  <span>De <Badge variant="outline" className="text-[10px]">{item.de}</Badge> para <Badge variant="outline" className="text-[10px]">{item.para}</Badge></span>
                                )}
                              </div>
                              <div className="mt-2 text-xs text-slate-400 flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {item.usuario?.name || 'Sistema'}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </TabsContent>
                  </div>
                </ScrollArea>
              </Tabs>
            </div>

            <SheetFooter className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 sm:justify-between">
              <Button 
                variant="destructive" 
                className="w-full sm:w-auto"
                disabled={candidato.status === 'rejeitado'}
              >
                Rejeitar Candidato
              </Button>
              <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto mt-2 sm:mt-0">
                Fechar
              </Button>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
