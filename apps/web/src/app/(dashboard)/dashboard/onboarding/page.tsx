"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Clock, Calendar } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

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
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function KanbanColumn({ 
  stage, 
  search, 
  showRejected 
}: { 
  stage: typeof STAGES[number]; 
  search: string; 
  showRejected: boolean;
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
              <CandidatoCard key={candidato.id} candidato={candidato} />
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

function CandidatoCard({ candidato }: { candidato: Candidato }) {
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
    <Card className={`cursor-pointer hover:shadow-md transition-all duration-200 border-slate-200 dark:border-slate-800 ${isRejected ? 'opacity-60 bg-slate-50' : 'bg-white dark:bg-slate-950'}`}>
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
