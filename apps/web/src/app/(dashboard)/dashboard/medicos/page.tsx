"use client";

import { useState, useMemo, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { trpc, trpcClient, queryClient } from "@/utils/trpc";
import { toast } from "sonner";
import { 
  Search, 
  MoreHorizontal, 
  Eye, 
  Stethoscope, 
  Calendar, 
  Clock, 
  AlertCircle,
  CheckCircle2,
  XCircle,
  Star,
  Activity,
  User,
  RefreshCw,
  Calculator,
  KeyRound,
  Settings,
  Lock,
  LockOpen,
  MessageSquare,
  Pencil,
  Trash2,
  Plus,
  Send,
  Camera,
  Upload,
  ImagePlus,
  FileText,
  CreditCard,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
  SheetClose
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';


type FaixaType = "P1" | "P2" | "P3" | "P4" | "P5";

function getFaixaColor(faixa: FaixaType | string) {
  switch (faixa) {
    case "P1":
      return "bg-green-700 hover:bg-green-800 text-white border-green-700";
    case "P2":
      return "bg-green-500 hover:bg-green-600 text-white border-green-500";
    case "P3":
      return "bg-yellow-500 hover:bg-yellow-600 text-black border-yellow-500";
    case "P4":
      return "bg-orange-500 hover:bg-orange-600 text-white border-orange-500";
    case "P5":
      return "bg-red-500 hover:bg-red-600 text-white border-red-500";
    default:
      return "bg-slate-200 text-slate-800";
  }
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

type OrderByField = "name" | "faixa" | "score" | "strikes" | "ativo";
type OrderDir = "asc" | "desc";

function SortableHeader({ 
  children, 
  field, 
  currentField, 
  currentDir, 
  onSort,
  className = ""
}: { 
  children: React.ReactNode; 
  field: OrderByField; 
  currentField: OrderByField; 
  currentDir: OrderDir; 
  onSort: (field: OrderByField) => void;
  className?: string;
}) {
  const isActive = currentField === field;
  
  return (
    <TableHead 
      className={`py-4 font-medium text-slate-500 cursor-pointer hover:text-slate-700 hover:bg-slate-100/50 transition-colors select-none ${className}`}
      onClick={() => onSort(field)}
    >
      <div className="flex items-center gap-1.5">
        {children}
        {isActive ? (
          currentDir === "asc" ? (
            <ArrowUp className="h-3.5 w-3.5 text-slate-700" />
          ) : (
            <ArrowDown className="h-3.5 w-3.5 text-slate-700" />
          )
        ) : (
          <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
        )}
      </div>
    </TableHead>
  );
}

export default function DoctorsPage() {
  const [page, setPage] = useState(1);
  const [faixaFilter, setFaixaFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [orderBy, setOrderBy] = useState<OrderByField>("name");
  const [orderDir, setOrderDir] = useState<OrderDir>("asc");

  const handleSort = (field: OrderByField) => {
    if (orderBy === field) {
      setOrderDir(orderDir === "asc" ? "desc" : "asc");
    } else {
      setOrderBy(field);
      setOrderDir("asc");
    }
    setPage(1);
  };



  const debouncedSearch = useMemo(() => {
    let timeoutId: NodeJS.Timeout;
    return (value: string) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setPage(1);
      }, 300);
    };
  }, []);

  const { data, isLoading } = useQuery(trpc.usuarios.listar.queryOptions({
    page,
    perPage: 10,
    tipo: "medico",
    faixa: faixaFilter !== "all" ? (faixaFilter as FaixaType) : undefined,
    ativo: statusFilter !== "all" ? statusFilter === "ativo" : undefined,
    search: search.trim() || undefined,
    orderBy,
    orderDir,
  }));

  const { data: stats } = useQuery(trpc.usuarios.estatisticas.queryOptions());

  const { data: prioridadesClick } = useQuery(trpc.usuarios.getPrioridadesClick.queryOptions());

  const toggleStatusMutation = useMutation({
    mutationFn: (input: { userId: string; ativo: boolean }) => 
      trpcClient.usuarios.alterarStatus.mutate(input),
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast.success("Status atualizado com sucesso");
    },
  });

  const sincronizarMutation = useMutation({
    mutationFn: () => trpcClient.usuarios.sincronizarMedicos.mutate(),
    onSuccess: (result: { novos: number; atualizados: number; erros: number; totalClick: number }) => {
      queryClient.invalidateQueries();
      toast.success(`Sincronizado! ${result.novos} novos, ${result.atualizados} atualizados`);
    },
    onError: (error: { message: string }) => {
      toast.error(`Erro na sincronização: ${error.message}`);
    },
  });

  const recalcularScoreMutation = useMutation({
    mutationFn: () => trpcClient.medico.recalcularTodosScoresDiretor.mutate(),
    onSuccess: (result: { atualizados: number; erros: { medicoId: string; erro: string }[] }) => {
      queryClient.invalidateQueries();
      toast.success(`Scores recalculados! ${result.atualizados} médicos atualizados`);
    },
    onError: (error: { message: string }) => {
      toast.error(`Erro ao recalcular: ${error.message}`);
    },
  });

  const sincronizarPrioridadesMutation = useMutation({
    mutationFn: () => trpcClient.usuarios.sincronizarPrioridadesClick.mutate(),
    onSuccess: (result) => {
      if ('sincronizados' in result) {
        toast.success(`Prioridades atualizadas! ${result.sincronizados} médicos sincronizados. Atualizando listagem...`);
        setTimeout(() => {
          queryClient.invalidateQueries();
        }, 3000);
      } else {
        toast.info(result.message);
      }
    },
    onError: (error: { message: string }) => {
      toast.error(`Erro ao sincronizar: ${error.message}`);
    },
  });

  const sincronizarPrioridadeMedicoMutation = useMutation({
    mutationFn: (medicoId: string) => trpcClient.usuarios.sincronizarPrioridadeMedicoClick.mutate({ medicoId }),
    onSuccess: () => {
      toast.success("Prioridade atualizada no Click! Atualizando listagem...");
      setTimeout(() => {
        queryClient.invalidateQueries();
      }, 3000);
    },
    onError: (error: { message: string }) => {
      toast.error(`Erro ao sincronizar: ${error.message}`);
    },
  });

  const handleOpenDetail = (id: string) => {
    setSelectedDoctorId(id);
    setIsSheetOpen(true);
  };

  return (
    <div className="container mx-auto py-8 space-y-8 animate-in fade-in duration-500 max-w-7xl">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2 border-b border-slate-100 dark:border-slate-800/50">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            Equipe Médica
          </h1>
          <p className="text-slate-500 mt-2 max-w-2xl">
            Gerencie o desempenho, escalas e status dos médicos da sua equipe.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button 
            variant="outline"
            onClick={() => sincronizarMutation.mutate()}
            disabled={sincronizarMutation.isPending}
            className="border-slate-200 hover:bg-slate-50 text-slate-600"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${sincronizarMutation.isPending ? "animate-spin" : ""}`} />
            Sincronizar
          </Button>
          
          <Button 
            variant="outline"
            onClick={() => recalcularScoreMutation.mutate()}
            disabled={recalcularScoreMutation.isPending}
            className="border-slate-200 hover:bg-slate-50 text-slate-600"
          >
            <Calculator className={`h-4 w-4 mr-2 ${recalcularScoreMutation.isPending ? "animate-spin" : ""}`} />
            Recalcular
          </Button>
          
          <Button 
            variant="outline"
            onClick={() => sincronizarPrioridadesMutation.mutate()}
            disabled={sincronizarPrioridadesMutation.isPending}
            className="border-slate-200 hover:bg-slate-50 text-slate-600"
          >
            <Send className={`h-4 w-4 mr-2 ${sincronizarPrioridadesMutation.isPending ? "animate-spin" : ""}`} />
            Atualizar Prioridades
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <StatsCard 
          title="Total de Médicos" 
          value={stats?.totalMedicos || 0} 
          icon={<Stethoscope className="h-5 w-5 text-emerald-600" />}
          description="Cadastrados no sistema"
        />
        <StatsCard 
          title="Ativos Agora" 
          value={stats?.medicosAtivos || 0} 
          icon={<Activity className="h-5 w-5 text-emerald-600" />}
          description="Disponíveis para consulta"
        />
        <StatsCard 
          title="Alta Performance (P1)" 
          value={stats?.medicosPorFaixa?.P1 || 0} 
          icon={<Star className="h-5 w-5 text-amber-500" />}
          description="Score acima de 80"
        />
        <StatsCard 
          title="Em Risco (P5)" 
          value={stats?.medicosPorFaixa?.P5 || 0} 
          icon={<AlertCircle className="h-5 w-5 text-rose-500" />}
          description="Requer atenção"
          highlight
        />
      </div>

      <div className="flex flex-col gap-6">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white dark:bg-slate-950 p-1 rounded-lg">
          <div className="flex items-center gap-3 w-full md:w-auto flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Buscar por nome, email ou CRM..." 
                className="pl-10 h-11 border-slate-200 bg-slate-50/50 focus:bg-white transition-all focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" 
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  debouncedSearch(e.target.value);
                }}
              />
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
            <Select value={faixaFilter} onValueChange={(v) => setFaixaFilter(v ?? "all")}>
              <SelectTrigger className="w-[160px] h-11 border-slate-200 bg-white">
                <SelectValue placeholder="Todas Faixas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas Faixas</SelectItem>
                <SelectItem value="P1">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500"/> P1 (Excelente)
                  </div>
                </SelectItem>
                <SelectItem value="P2">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-brand-500"/> P2 (Bom)
                  </div>
                </SelectItem>
                <SelectItem value="P3">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-amber-500"/> P3 (Médio)
                  </div>
                </SelectItem>
                <SelectItem value="P4">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-orange-500"/> P4 (Atenção)
                  </div>
                </SelectItem>
                <SelectItem value="P5">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-slate-500"/> P5 (Crítico)
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? "all")}>
              <SelectTrigger className="w-[140px] h-11 border-slate-200 bg-white">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="ativo">Ativo</SelectItem>
                <SelectItem value="inativo">Inativo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 overflow-hidden">
          <Table>
            <TableHeader className="bg-slate-50/50 dark:bg-slate-900/50">
              <TableRow className="border-slate-100 hover:bg-transparent">
                <SortableHeader 
                  field="name" 
                  currentField={orderBy} 
                  currentDir={orderDir} 
                  onSort={handleSort}
                  className="w-[350px] pl-6"
                >
                  Médico
                </SortableHeader>
                <SortableHeader field="faixa" currentField={orderBy} currentDir={orderDir} onSort={handleSort}>
                  Faixa
                </SortableHeader>
                <TableHead className="py-4 font-medium text-slate-500">
                  Prioridade Click
                </TableHead>
                <SortableHeader field="score" currentField={orderBy} currentDir={orderDir} onSort={handleSort}>
                  Score
                </SortableHeader>
                <SortableHeader field="strikes" currentField={orderBy} currentDir={orderDir} onSort={handleSort}>
                  Strikes
                </SortableHeader>
                <SortableHeader field="ativo" currentField={orderBy} currentDir={orderDir} onSort={handleSort}>
                  Status
                </SortableHeader>
                <TableHead className="text-right py-4 pr-6 font-medium text-slate-500">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                 Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i} className="border-slate-50">
                    <TableCell className="pl-6"><div className="flex items-center gap-3"><Skeleton className="h-10 w-10 rounded-full" /><div className="space-y-1"><Skeleton className="h-4 w-32" /><Skeleton className="h-3 w-24" /></div></div></TableCell>
                    <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-10" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-12" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-8" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                    <TableCell className="text-right pr-6"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : data?.usuarios.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Search className="h-8 w-8 text-slate-300" />
                      <p>Nenhum médico encontrado com os filtros atuais.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                data?.usuarios.map((doctor) => (
                  <TableRow 
                    key={doctor.id} 
                    className="group hover:bg-slate-50/80 dark:hover:bg-slate-900/50 cursor-pointer transition-all border-slate-50"
                    onClick={() => handleOpenDetail(doctor.id)}
                  >
                    <TableCell className="pl-6 py-4">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-11 w-11 border border-slate-100 dark:border-slate-800 bg-white">
                          <AvatarImage src={doctor.image || `https://api.dicebear.com/7.x/avataaars/svg?seed=${doctor.name}`} />
                          <AvatarFallback className="bg-emerald-50 text-emerald-700 font-bold text-sm">
                            {getInitials(doctor.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-semibold text-slate-900 dark:text-slate-100 group-hover:text-emerald-700 transition-colors">
                            {doctor.name}
                          </div>
                          <div className="text-sm text-slate-500 dark:text-slate-400 font-normal">
                            {doctor.email}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {doctor.faixa ? (
                        <div className="flex items-center gap-1.5">
                          <Badge className={`${getFaixaColor(doctor.faixa)} font-medium px-2.5 py-0.5 border-0`}>
                            {doctor.faixa}
                          </Badge>
                          {(doctor as any).faixaFixa && (
                            <span title="Faixa fixada manualmente">
                              <Lock className="h-3 w-3 text-slate-400" />
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const prioridadeClick = doctor.clickDoctorId ? prioridadesClick?.[doctor.clickDoctorId] : null;
                        if (prioridadeClick === null || prioridadeClick === undefined) {
                          return <span className="text-slate-400 text-sm">-</span>;
                        }
                        const prioridadeLabel = `P${prioridadeClick}`;
                        const isSynced = doctor.faixa === prioridadeLabel;
                        return (
                          <Badge 
                            variant="outline" 
                            className={isSynced 
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700" 
                              : "border-amber-200 bg-amber-50 text-amber-700"
                            }
                          >
                            P{prioridadeClick}
                          </Badge>
                        );
                      })()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-baseline gap-1">
                        <span className="text-lg font-semibold text-slate-700 dark:text-slate-300">{doctor.score ?? 0}</span>
                        <span className="text-xs text-slate-400">/ 100</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {doctor.strikes > 0 ? (
                        <Badge variant="outline" className="border-rose-200 bg-rose-50 text-rose-700 flex w-fit gap-1 items-center px-2 py-0.5">
                          <AlertCircle className="h-3 w-3" /> {doctor.strikes}
                        </Badge>
                      ) : (
                        <span className="text-slate-400 text-sm pl-2">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={doctor.ativo ? "default" : "secondary"} 
                        className={doctor.ativo ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-0" : "bg-slate-100 text-slate-500 border-0"}
                      >
                        {doctor.ativo ? (
                          <div className="flex items-center gap-1.5"><div className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Ativo</div>
                        ) : (
                          <div className="flex items-center gap-1.5"><div className="h-1.5 w-1.5 rounded-full bg-slate-400" /> Inativo</div>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <div className="flex justify-end items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50" onClick={() => handleOpenDetail(doctor.id)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-md h-8 w-8 text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                            <MoreHorizontal className="h-4 w-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuGroup>
                              <DropdownMenuLabel>Ações</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleOpenDetail(doctor.id)}>
                                Ver Perfil Completo
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => toggleStatusMutation.mutate({ userId: doctor.id, ativo: !doctor.ativo })}>
                                {doctor.ativo ? "Desativar Médico" : "Ativar Médico"}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => sincronizarPrioridadeMedicoMutation.mutate(doctor.id)}
                                disabled={sincronizarPrioridadeMedicoMutation.isPending}
                              >
                                <Send className="h-4 w-4 mr-2" />
                                Sincronizar Prioridade
                              </DropdownMenuItem>
                            </DropdownMenuGroup>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          
          <div className="border-t border-slate-100 dark:border-slate-800 p-4 bg-white dark:bg-slate-900 flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Mostrando <strong>{(page - 1) * 10 + 1}-{Math.min(page * 10, data?.total || 0)}</strong> de <strong>{data?.total || 0}</strong> médicos
            </div>
            <Pagination className="w-auto mx-0">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    className={page === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
                <PaginationItem>
                   <span className="flex items-center px-4 text-sm font-medium">
                    {page} / {data?.pages || 1}
                  </span>
                </PaginationItem>
                <PaginationItem>
                  <PaginationNext 
                    onClick={() => setPage(p => Math.min(data?.pages || 1, p + 1))}
                    className={page === (data?.pages || 1) ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        </div>
      </div>

      <DoctorDetailDrawer 
        open={isSheetOpen} 
        onOpenChange={setIsSheetOpen} 
        doctorId={selectedDoctorId} 
      />
    </div>
  );
}

function StatsCard({ title, value, icon, description, trend, highlight }: { title: string; value: number; icon: React.ReactNode; description?: string; trend?: string; highlight?: boolean }) {
  return (
    <Card className={`border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 ${highlight ? 'border-rose-200 bg-rose-50/50 dark:bg-rose-900/10' : ''}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-slate-900 dark:text-slate-50">{value}</div>
        <p className="text-xs text-muted-foreground mt-1 font-medium">
          {description}
          {trend && <span className="text-emerald-600 ml-1">{trend}</span>}
        </p>
      </CardContent>
    </Card>
  );
}

function FaixaFixaControl({ 
  doctorId, 
  currentFaixaFixa, 
  currentFaixa 
}: { 
  doctorId: string; 
  currentFaixaFixa: boolean; 
  currentFaixa: string | null;
}) {

  const [localFaixaFixa, setLocalFaixaFixa] = useState(currentFaixaFixa);
  const [localFaixa, setLocalFaixa] = useState(currentFaixa);
  
  const mutation = useMutation({
    mutationFn: (input: { medicoId: string; faixaFixa: boolean; faixa: string }) => 
      trpcClient.usuarios.alterarFaixaFixa.mutate({
        ...input,
        faixa: input.faixa as FaixaType
      }),
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast.success("Configuração de faixa atualizada");
    },
    onError: (error, variables) => {
      setLocalFaixaFixa(currentFaixaFixa);
      setLocalFaixa(currentFaixa);
      toast.error(`Erro ao atualizar: ${error.message}`);
    }
  });

  const handleToggle = (checked: boolean) => {
    setLocalFaixaFixa(checked);
    mutation.mutate({
      medicoId: doctorId,
      faixaFixa: checked,
      faixa: localFaixa || "P5"
    });
  };

  const handleFaixaChange = (value: string | null) => {
    if (!value) return;
    setLocalFaixa(value);
    mutation.mutate({
      medicoId: doctorId,
      faixaFixa: true,
      faixa: value
    });
  };

  return (
    <Card className={`border transition-all duration-300 shadow-none ${localFaixaFixa ? 'border-emerald-200 bg-emerald-50/30 dark:bg-emerald-900/10' : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950'}`}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${localFaixaFixa ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
              {localFaixaFixa ? <Lock className="h-5 w-5" /> : <LockOpen className="h-5 w-5" />}
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Controle de Faixa</h3>
              <p className="text-xs text-slate-500">
                {localFaixaFixa 
                  ? "A faixa está fixada manualmente" 
                  : "A faixa é calculada automaticamente"}
              </p>
            </div>
          </div>
          <Switch 
            checked={localFaixaFixa} 
            onCheckedChange={handleToggle}
            disabled={mutation.isPending}
            className="data-[state=checked]:bg-emerald-600"
          />
        </div>

        {localFaixaFixa && (
          <div className="animate-in slide-in-from-top-2 fade-in duration-300">
            <div className="bg-white dark:bg-slate-950 rounded-lg p-4 border border-slate-200 dark:border-slate-800">
              <label className="text-xs font-medium text-slate-500 mb-2 block uppercase tracking-wider">
                Selecionar Faixa Fixa
              </label>
              <Select 
                value={localFaixa || "P5"} 
                onValueChange={handleFaixaChange}
                disabled={mutation.isPending}
              >
                <SelectTrigger className="w-full border-slate-200">
                  <SelectValue placeholder="Selecione a faixa" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="P1">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-emerald-500 hover:bg-emerald-600 border-0">P1</Badge> 
                      <span className="text-slate-600">Alta Performance (Score 80+)</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="P2">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-brand-500 hover:bg-brand-600 border-0">P2</Badge> 
                      <span className="text-slate-600">Bom Desempenho (Score 60+)</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="P3">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-amber-500 hover:bg-amber-600 border-0">P3</Badge> 
                      <span className="text-slate-600">Regular (Score 40+)</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="P4">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-orange-500 hover:bg-orange-600 border-0">P4</Badge> 
                      <span className="text-slate-600">Atenção (Score 20+)</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="P5">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-slate-500 hover:bg-slate-600 border-0">P5</Badge> 
                      <span className="text-slate-600">Crítico (Score &lt; 20)</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-amber-600 mt-2 flex items-center gap-1.5">
                <AlertCircle className="h-3 w-3" />
                Ao fixar, o score continuará sendo calculado mas não alterará a faixa.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PasswordChangeForm({ doctorId }: { doctorId: string }) {
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");

  const alterarSenhaMutation = useMutation({
    mutationFn: (input: { userId: string; novaSenha: string }) =>
      trpcClient.usuarios.alterarSenha.mutate(input),
    onSuccess: () => {
      toast.success("Senha alterada com sucesso!");
      setNovaSenha("");
      setConfirmarSenha("");
    },
    onError: (error: { message: string }) => {
      toast.error(`Erro ao alterar senha: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (novaSenha.length < 6) {
      toast.error("A senha deve ter no mínimo 6 caracteres");
      return;
    }
    if (novaSenha !== confirmarSenha) {
      toast.error("As senhas não coincidem");
      return;
    }
    alterarSenhaMutation.mutate({ userId: doctorId, novaSenha });
  };

  return (
    <Card className="border border-slate-200 dark:border-slate-800 shadow-none">
      <CardContent className="p-5">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4">Alterar Senha</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Nova Senha</label>
            <Input
              type="password"
              placeholder="Digite a nova senha"
              value={novaSenha}
              onChange={(e) => setNovaSenha(e.target.value)}
              className="border-slate-200"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Confirmar Senha</label>
            <Input
              type="password"
              placeholder="Confirme a nova senha"
              value={confirmarSenha}
              onChange={(e) => setConfirmarSenha(e.target.value)}
              className="border-slate-200"
            />
          </div>
          <Button 
            type="submit" 
            disabled={alterarSenhaMutation.isPending}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {alterarSenhaMutation.isPending ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <KeyRound className="h-4 w-4 mr-2" />
            )}
            Alterar Senha
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

interface Observacao {
  id: string;
  conteudo: string;
  createdAt: Date;
  updatedAt: Date;
  autor: { id: string; name: string };
}

function ObservacoesTab({ 
  doctorId, 
  observacoes,
  currentUserId 
}: { 
  doctorId: string; 
  observacoes: Observacao[];
  currentUserId?: string;
}) {
  const [novaObservacao, setNovaObservacao] = useState("");
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editandoConteudo, setEditandoConteudo] = useState("");


  const criarMutation = useMutation({
    mutationFn: (conteudo: string) => 
      trpcClient.usuarios.criarObservacao.mutate({ medicoId: doctorId, conteudo }),
    onSuccess: () => {
      queryClient.invalidateQueries();
      setNovaObservacao("");
      toast.success("Observação adicionada");
    },
    onError: (error: { message: string }) => {
      toast.error(`Erro: ${error.message}`);
    }
  });

  const editarMutation = useMutation({
    mutationFn: ({ observacaoId, conteudo }: { observacaoId: string; conteudo: string }) => 
      trpcClient.usuarios.editarObservacao.mutate({ observacaoId, conteudo }),
    onSuccess: () => {
      queryClient.invalidateQueries();
      setEditandoId(null);
      setEditandoConteudo("");
      toast.success("Observação atualizada");
    },
    onError: (error: { message: string }) => {
      toast.error(`Erro: ${error.message}`);
    }
  });

  const deletarMutation = useMutation({
    mutationFn: (observacaoId: string) => 
      trpcClient.usuarios.deletarObservacao.mutate({ observacaoId }),
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast.success("Observação removida");
    },
    onError: (error: { message: string }) => {
      toast.error(`Erro: ${error.message}`);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novaObservacao.trim()) return;
    criarMutation.mutate(novaObservacao.trim());
  };

  const handleEdit = (obs: Observacao) => {
    setEditandoId(obs.id);
    setEditandoConteudo(obs.conteudo);
  };

  const handleSaveEdit = () => {
    if (!editandoId || !editandoConteudo.trim()) return;
    editarMutation.mutate({ observacaoId: editandoId, conteudo: editandoConteudo.trim() });
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="relative">
          <Textarea
            placeholder="Adicionar uma observação sobre o médico..."
            value={novaObservacao}
            onChange={(e) => setNovaObservacao(e.target.value)}
            className="min-h-[100px] border-slate-200 resize-none pr-16"
            maxLength={5000}
          />
          <span className="absolute bottom-2 right-2 text-xs text-slate-400">
            {novaObservacao.length}/5000
          </span>
        </div>
        <Button 
          type="submit" 
          disabled={criarMutation.isPending || !novaObservacao.trim()}
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          {criarMutation.isPending ? (
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Plus className="h-4 w-4 mr-2" />
          )}
          Adicionar Observação
        </Button>
      </form>

      {observacoes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
          <MessageSquare className="h-10 w-10 text-slate-300 mb-3" />
          <p className="text-sm font-medium text-slate-600">Nenhuma observação</p>
          <p className="text-xs text-slate-400 mt-1">Adicione a primeira observação sobre o médico</p>
        </div>
      ) : (
        <div className="space-y-1">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
            Histórico de Observações ({observacoes.length})
          </h3>
          <div className="relative border-l-2 border-slate-200 ml-3 space-y-6 pb-2">
            {observacoes.map((obs) => {
              const isAuthor = currentUserId === obs.autor.id;
              const isEditing = editandoId === obs.id;
              
              return (
                <div key={obs.id} className="relative pl-6">
                  <div className="absolute -left-[9px] top-0 h-4 w-4 rounded-full border-2 border-white bg-emerald-500 ring-4 ring-emerald-50" />
                  
                  <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800 p-4">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-slate-900 dark:text-slate-100">
                          {obs.autor.name}
                        </span>
                        <span className="text-xs text-slate-400">•</span>
                        <span className="text-xs text-slate-400">
                          {formatDate(obs.createdAt)}
                        </span>
                      </div>
                      {isAuthor && !isEditing && (
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-slate-400 hover:text-slate-600"
                            onClick={() => handleEdit(obs)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-slate-400 hover:text-rose-600"
                            onClick={() => deletarMutation.mutate(obs.id)}
                            disabled={deletarMutation.isPending}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                    
                    {isEditing ? (
                      <div className="space-y-3">
                        <Textarea
                          value={editandoConteudo}
                          onChange={(e) => setEditandoConteudo(e.target.value)}
                          className="min-h-[80px] border-slate-200 resize-none"
                          maxLength={5000}
                        />
                        <div className="flex gap-2">
                          <Button 
                            size="sm"
                            onClick={handleSaveEdit}
                            disabled={editarMutation.isPending}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                          >
                            Salvar
                          </Button>
                          <Button 
                            size="sm"
                            variant="outline"
                            onClick={() => setEditandoId(null)}
                            className="border-slate-200"
                          >
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap">
                        {obs.conteudo}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

const DAYS = [
  { id: "dom", label: "Domingo", short: "Dom" },
  { id: "seg", label: "Segunda", short: "Seg" },
  { id: "ter", label: "Terça", short: "Ter" },
  { id: "qua", label: "Quarta", short: "Qua" },
  { id: "qui", label: "Quinta", short: "Qui" },
  { id: "sex", label: "Sexta", short: "Sex" },
  { id: "sab", label: "Sábado", short: "Sab" },
];

function generateTimeSlots() {
  const slots = [];
  const startHour = 7;
  const endHour = 22;
  
  for (let h = startHour; h < endHour; h++) {
    for (let m = 0; m < 60; m += 20) {
      const hour = h.toString().padStart(2, "0");
      const minute = m.toString().padStart(2, "0");
      slots.push(`${hour}:${minute}`);
    }
  }
  return slots;
}

const TIME_SLOTS = generateTimeSlots();

function DoctorScheduleGrid({ doctorId }: { doctorId: string }) {
  const { data: horarios, isLoading } = useQuery({
    ...trpc.medico.getHorariosMedico.queryOptions({ medicoId: doctorId }),
    enabled: !!doctorId,
  });

  const horariosMap = useMemo(() => {
    const map: Record<string, boolean> = {};
    if (horarios) {
      for (const slot of horarios) {
        map[`${slot.diaSemana}-${slot.horario}`] = true;
      }
    }
    return map;
  }, [horarios]);

  const totalSlots = horarios?.length ?? 0;

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-full" />
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="h-6 w-full" />
        ))}
      </div>
    );
  }

  if (!horarios || horarios.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
        <Calendar className="h-12 w-12 text-slate-200 mb-3" />
        <p className="text-base text-slate-900 font-medium">Nenhum Horário Cadastrado</p>
        <p className="text-sm text-slate-500">Este médico não possui horários abertos.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-slate-500" />
          <span className="text-sm font-medium text-slate-700">{totalSlots} slots abertos</span>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Disponível</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-slate-200" />
            <span>Indisponível</span>
          </div>
        </div>
      </div>

      <div className="border border-slate-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[600px]">
            <div className="grid grid-cols-[60px_1fr_1fr_1fr_1fr_1fr_1fr_1fr] gap-1 p-2 bg-slate-50 border-b border-slate-200">
              <div className="flex items-center justify-center">
                <Clock className="h-3 w-3 text-slate-400" />
              </div>
              {DAYS.map((day) => (
                <div key={day.id} className="text-center">
                  <div className="font-medium text-xs text-slate-700">{day.short}</div>
                </div>
              ))}
            </div>

            <div className="p-2 space-y-1 max-h-[400px] overflow-y-auto">
              {TIME_SLOTS.map((time) => (
                <div key={time} className="grid grid-cols-[60px_1fr_1fr_1fr_1fr_1fr_1fr_1fr] gap-1">
                  <div className="flex items-center justify-center text-[10px] font-mono text-slate-400">
                    {time}
                  </div>
                  {DAYS.map((day) => {
                    const slotKey = `${day.id}-${time}`;
                    const isOpen = horariosMap[slotKey];
                    
                    return (
                      <div
                        key={slotKey}
                        className={`h-5 rounded transition-all flex items-center justify-center ${
                          isOpen
                            ? "bg-emerald-100 border border-emerald-300"
                            : "bg-slate-50"
                        }`}
                      >
                        {isOpen && (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function BigNumberCard({ 
  label, 
  value, 
  footer, 
  className, 
  valueClassName 
}: { 
  label: string; 
  value: React.ReactNode; 
  footer?: React.ReactNode; 
  className?: string; 
  valueClassName?: string;
}) {
  return (
    <div className={`flex flex-col p-4 rounded-lg bg-white border border-slate-200 ${className}`}>
      <div className={`text-2xl font-bold ${valueClassName}`}>{value}</div>
      <div className="text-sm font-medium text-slate-500">{label}</div>
      {footer && <div className="mt-2 text-xs text-slate-400">{footer}</div>}
    </div>
  );
}

function MetricasPerformance({ doctorId }: { doctorId: string }) {
  const { data: metrics, isLoading } = useQuery({
     ...trpc.medico.getMetricasDetalhadas.queryOptions({ medicoId: doctorId }),
     enabled: !!doctorId
  });

  if (isLoading) {
    return (
        <div className="space-y-4 mb-8">
            <Skeleton className="h-6 w-48 mb-4" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Skeleton className="h-24" />
                <Skeleton className="h-24" />
                <Skeleton className="h-24" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Skeleton className="h-24" />
                <Skeleton className="h-24" />
                <Skeleton className="h-24" />
            </div>
        </div>
    )
  }

  if (!metrics) {
      return null; 
  }

  return (
    <div className="space-y-4 mb-6">
      <div>
        <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <Activity className="h-4 w-4 text-slate-500" /> 
            Métricas de Performance
        </h3>
        {metrics.semanasCalculo && (
            <p className="text-xs text-slate-500 mt-1">
                Período: Últimas {metrics.semanasCalculo} semanas
                {metrics.periodoInicio && metrics.periodoFim && (
                  <span className="text-slate-400">
                    {" "}({new Date(metrics.periodoInicio).toLocaleDateString('pt-BR')} - {new Date(metrics.periodoFim).toLocaleDateString('pt-BR')})
                  </span>
                )}
            </p>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Consultas Realizadas</h4>
        <div className="grid grid-cols-3 gap-4 mb-4">
            <BigNumberCard 
                label="Total" 
                value={metrics.totalConsultas.toLocaleString('pt-BR')} 
                valueClassName="text-slate-900"
                className="bg-white shadow-sm"
            />
            <BigNumberCard 
                label="1º Lead" 
                value={metrics.primeiroLead.toLocaleString('pt-BR')} 
                valueClassName="text-emerald-600"
                className="bg-white shadow-sm"
            />
             <BigNumberCard 
                label="Recorrência" 
                value={metrics.recorrencia.toLocaleString('pt-BR')} 
                valueClassName="text-blue-600"
                className="bg-white shadow-sm"
            />
        </div>
        <div className="flex items-center gap-4 text-sm text-slate-600 px-1">
             <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-slate-400" />
                <span><strong>{metrics.consultasComReceita}</strong> geraram receita</span>
             </div>
             <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-slate-400" />
                <span><strong>{metrics.orcamentosPagos}</strong> orçamentos pagos</span>
             </div>
        </div>
      </div>
      
       <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <BigNumberCard 
                label="Conversão" 
                value={`${(metrics.taxaConversao * 100).toFixed(1)}%`}
                valueClassName="text-amber-600"
            />
             <BigNumberCard 
                label="Ticket Médio" 
                value={metrics.ticketMedio.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                valueClassName="text-violet-600"
            />
             <BigNumberCard 
                label="Faturamento" 
                value={metrics.faturamento.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                valueClassName="text-emerald-700"
            />
       </div>

    </div>
  )
}

function CompactDoctorHeader({ doctor, isUploading, handleUploadClick, fileInputRef, handleFileChange }: any) {
    return (
        <div className="flex items-start gap-4 mb-8 pb-6 border-b border-slate-100">
             <div className="relative group cursor-pointer flex-shrink-0" onClick={handleUploadClick}>
                <Avatar className="h-16 w-16 border border-slate-200 transition-opacity group-hover:opacity-90">
                   <AvatarImage 
                     src={doctor.image || `https://api.dicebear.com/7.x/avataaars/svg?seed=${doctor.name}`} 
                     className={`object-cover ${isUploading ? 'opacity-50' : ''}`}
                   />
                   <AvatarFallback className="text-lg bg-emerald-50 text-emerald-700">
                     {getInitials(doctor.name)}
                   </AvatarFallback>
                </Avatar>
                
                 <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-all backdrop-blur-[1px]">
                  {isUploading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  ) : (
                    <Camera className="h-5 w-5 text-white drop-shadow-md" />
                  )}
                </div>

                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  className="hidden" 
                  accept="image/jpeg,image/png,image/webp"
                />
             </div>

             <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap mb-1">
                    <h2 className="text-xl font-bold text-slate-900 truncate">{doctor.name}</h2>
                    <div className="flex items-center gap-2">
                         <Badge className={`${getFaixaColor(doctor.faixa || "P5")} text-xs px-2 py-0.5 border-0 font-medium`}>
                            {doctor.faixa || "N/A"}
                         </Badge>
                          <Badge 
                            variant="outline" 
                            className={`text-xs px-2 py-0.5 border-0 font-medium ${doctor.ativo ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}
                          >
                             {doctor.ativo ? 'Ativo' : 'Inativo'}
                          </Badge>
                    </div>
                </div>
                
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500 mb-2">
                     {doctor.crm && (
                        <div className="flex items-center gap-1.5">
                            <Stethoscope className="h-3.5 w-3.5" /> 
                            <span>CRM: {doctor.crm}</span>
                        </div>
                     )}
                     <div className="flex items-center gap-1.5">
                         <User className="h-3.5 w-3.5" />
                         <span>{doctor.email}</span>
                     </div>
                </div>

                <div className="flex items-center gap-4 text-sm">
                     <div className="flex items-center gap-1.5 font-medium text-slate-700">
                        <Activity className="h-3.5 w-3.5 text-emerald-600" />
                        <span>Score: {doctor.score ?? 0}/100</span>
                     </div>
                      <div className="flex items-center gap-1.5 font-medium text-slate-700">
                        <AlertCircle className={`h-3.5 w-3.5 ${doctor.strikes > 0 ? 'text-rose-500' : 'text-slate-400'}`} />
                        <span>Strikes: {doctor.strikes}</span>
                     </div>
                </div>
             </div>
        </div>
    )
}

function HistoricoTab({ medicoId }: { medicoId: string }) {
  const { data: historico, isLoading } = useQuery({
    ...trpc.medico.getHistoricoScore.queryOptions({ medicoId }),
    enabled: !!medicoId
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-64 w-full" />
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    );
  }

  if (!historico?.length) {
    return (
      <div className="flex flex-col items-center justify-center h-64 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
        <Activity className="h-12 w-12 text-slate-200 mb-3" />
        <p className="text-base text-slate-900 font-medium">Nenhum histórico de score</p>
        <p className="text-sm text-slate-500">Este médico ainda não possui registros de score.</p>
      </div>
    );
  }

  // Reverse for chart (oldest first)
  const chartData = [...historico].reverse().map(h => ({
    data: new Date(h.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
    score: Number(h.score),
  }));

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <Card className="border border-slate-200 shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-slate-700">Evolução do Score</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis 
                  dataKey="data" 
                  stroke="#64748b" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false} 
                  dy={10}
                />
                <YAxis 
                  domain={[0, 100]} 
                  stroke="#64748b" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false} 
                  dx={-10}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #e2e8f0', 
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' 
                  }}
                  itemStyle={{ color: '#0f172a', fontSize: '12px', fontWeight: 500 }}
                  labelStyle={{ color: '#64748b', fontSize: '11px', marginBottom: '4px' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="score" 
                  stroke="#059669" 
                  strokeWidth={2} 
                  dot={{ r: 4, fill: '#059669', strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 6, fill: '#059669', strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="rounded-xl border border-slate-200 overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50/50">
            <TableRow className="border-slate-100 hover:bg-transparent">
              <TableHead className="font-medium text-slate-500">Data</TableHead>
              <TableHead className="font-medium text-slate-500">Score</TableHead>
              <TableHead className="font-medium text-slate-500">Faixa</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {historico.map(h => (
              <TableRow key={h.id} className="border-slate-50 hover:bg-slate-50/50">
                <TableCell className="text-slate-600">
                  {new Date(h.createdAt).toLocaleString('pt-BR', { 
                    day: '2-digit', 
                    month: '2-digit', 
                    year: 'numeric', 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </TableCell>
                <TableCell className="font-medium text-slate-900">
                  {Number(h.score).toFixed(1)}
                </TableCell>
                <TableCell>
                  <Badge className={`${getFaixaColor(h.faixa)} border-0 font-medium px-2 py-0.5`}>
                    {h.faixa}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function NpsTab({ medicoId }: { medicoId: string }) {
  const { data: historico, isLoading } = useQuery({
    ...trpc.formularios.getHistoricoSatisfacaoByMedico.queryOptions({ medicoId }),
    enabled: !!medicoId,
  });

  const formatMes = (mesRef: string) => {
    const [ano, mes] = mesRef.split('-');
    const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    return `${meses[parseInt(mes) - 1]} ${ano}`;
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (!historico || historico.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
        <Star className="h-10 w-10 text-slate-300 mb-3" />
        <p className="text-sm font-medium text-slate-600">Nenhuma resposta de satisfação</p>
        <p className="text-xs text-slate-400 mt-1">Este médico ainda não respondeu pesquisas de NPS</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
        Histórico de Respostas ({historico.length})
      </h3>
      <div className="space-y-3">
        {historico.map((resposta) => (
          <div key={resposta.id} className="bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800 p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {formatMes(resposta.mesReferencia)}
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Respondido em {new Date(resposta.respondidoEm).toLocaleDateString('pt-BR')}
                </p>
              </div>
              <div className="flex gap-2">
                <div className="text-center">
                  <div className="text-xs text-slate-500 mb-1">Suporte</div>
                  <div className="text-lg font-bold text-blue-600">{resposta.npsSuporte}</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-slate-500 mb-1">Ferramentas</div>
                  <div className="text-lg font-bold text-purple-600">{resposta.npsFerramentas}</div>
                </div>
              </div>
            </div>
            {resposta.sugestoes && resposta.sugestoes.trim() !== "" && (
              <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <p className="text-xs font-medium text-slate-500 mb-1">Sugestões:</p>
                <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{resposta.sugestoes}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function DadosPessoaisTab({ medicoId }: { medicoId: string }) {
  const { data: detalhes, isLoading } = useQuery({
    ...trpc.formularios.getDetalhesPessoaisByMedico.queryOptions({ medicoId }),
    enabled: !!medicoId,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!detalhes) {
    return (
      <div className="flex flex-col items-center justify-center py-12 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
        <User className="h-10 w-10 text-slate-300 mb-3" />
        <p className="text-sm font-medium text-slate-600">Nenhum dado pessoal cadastrado</p>
        <p className="text-xs text-slate-400 mt-1">Este médico ainda não preencheu seus dados pessoais</p>
      </div>
    );
  }

  const InfoItem = ({ label, value }: { label: string; value: string | null | undefined }) => {
    if (!value) return null;
    return (
      <div className="flex flex-col">
        <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">{label}</span>
        <span className="text-sm text-slate-900 dark:text-slate-100 mt-1">{value}</span>
      </div>
    );
  };

  const hasVestuario = detalhes.tamanhoCamisa || detalhes.tamanhoCalcado || detalhes.corFavorita;
  const hasEndereco = detalhes.cep || detalhes.rua || detalhes.cidade || detalhes.estado;
  const hasPreferencias = detalhes.hobbies || detalhes.pets || detalhes.destinoViagem || detalhes.esportePratica || detalhes.marcaRoupa;

  return (
    <div className="space-y-6">
      {hasVestuario && (
        <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800 p-5">
          <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-slate-500" />
            Vestuário
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <InfoItem label="Camisa" value={detalhes.tamanhoCamisa} />
            <InfoItem label="Calçado" value={detalhes.tamanhoCalcado} />
            <InfoItem label="Cor Favorita" value={detalhes.corFavorita} />
          </div>
        </div>
      )}

      {detalhes.dataAniversario && (
        <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800 p-5">
          <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-slate-500" />
            Aniversário
          </h4>
          <InfoItem label="Data" value={new Date(detalhes.dataAniversario).toLocaleDateString('pt-BR')} />
        </div>
      )}

      {hasEndereco && (
        <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800 p-5">
          <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4">Endereço</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InfoItem label="CEP" value={detalhes.cep} />
            <InfoItem label="Rua" value={detalhes.rua} />
            <InfoItem label="Número" value={detalhes.numero} />
            <InfoItem label="Complemento" value={detalhes.complemento} />
            <InfoItem label="Bairro" value={detalhes.bairro} />
            <InfoItem label="Cidade" value={detalhes.cidade} />
            <InfoItem label="Estado" value={detalhes.estado} />
          </div>
        </div>
      )}

      {hasPreferencias && (
        <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800 p-5">
          <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4">Preferências</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InfoItem label="Hobbies" value={detalhes.hobbies} />
            <InfoItem label="Pets" value={detalhes.pets} />
            <InfoItem label="Destino de Viagem" value={detalhes.destinoViagem} />
            <InfoItem label="Esporte" value={detalhes.esportePratica} />
            <InfoItem label="Marca de Roupa" value={detalhes.marcaRoupa} />
          </div>
        </div>
      )}
    </div>
  );
}

function DoctorDetailDrawer({ open, onOpenChange, doctorId }: { open: boolean; onOpenChange: (open: boolean) => void; doctorId: string | null }) {
  const { data: doctor, isLoading } = useQuery({
    ...trpc.usuarios.getMedico.queryOptions({ id: doctorId! }),
    enabled: !!doctorId
  });

  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);


  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Formato inválido. Use JPG, PNG ou WebP.');
      return;
    }

    if (file.size > 4 * 1024 * 1024) {
      toast.error('Arquivo muito grande. Máximo 4MB.');
      return;
    }

    try {
      setIsUploading(true);
      
      const ext = file.name.split('.').pop();
      const filename = `doctors/${doctorId}-${Date.now()}.${ext}`;
      
      // Envia o arquivo diretamente como stream (não FormData)
      const response = await fetch(`/api/upload?filename=${filename}`, {
        method: 'POST',
        body: file,
      });

      if (!response.ok) throw new Error('Falha no upload');
      
      const { url } = await response.json();

      await trpcClient.usuarios.atualizarFoto.mutate({
        medicoId: doctorId!,
        imageUrl: url
      });

      await queryClient.invalidateQueries();
      
      toast.success('Foto atualizada com sucesso!');
    } catch (error) {
      console.error(error);
      toast.error('Erro ao atualizar foto');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full !max-w-[900px] overflow-y-auto p-6 sm:p-8">
        <SheetHeader className="mb-8">
          <SheetTitle className="text-2xl font-bold">Perfil do Médico</SheetTitle>
          <SheetDescription>Detalhes completos, indicadores de performance e histórico.</SheetDescription>
        </SheetHeader>

        {isLoading || !doctor ? (
          <div className="space-y-8">
            <div className="flex items-center gap-6">
              <Skeleton className="h-16 w-16 rounded-full" />
              <div className="space-y-3">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : (
          <div className="space-y-8 max-w-full">
            <CompactDoctorHeader 
                doctor={doctor} 
                isUploading={isUploading} 
                handleUploadClick={handleUploadClick} 
                fileInputRef={fileInputRef} 
                handleFileChange={handleFileChange} 
            />

            <MetricasPerformance doctorId={doctor.id} />

            <Tabs defaultValue="schedule" className="w-full">
              <TabsList className="w-full grid grid-cols-3 lg:grid-cols-6 mb-6 bg-slate-100/50 dark:bg-slate-800/50 p-1">
                <TabsTrigger value="schedule">Agenda</TabsTrigger>
                <TabsTrigger value="historico">Histórico</TabsTrigger>
                <TabsTrigger value="nps">NPS</TabsTrigger>
                <TabsTrigger value="dados-pessoais">Dados Pessoais</TabsTrigger>
                <TabsTrigger value="observacoes">Observações</TabsTrigger>
                <TabsTrigger value="settings">Configurações</TabsTrigger>
              </TabsList>
              
              <TabsContent value="schedule">
                <DoctorScheduleGrid doctorId={doctor.id} />
              </TabsContent>

              <TabsContent value="historico">
                <HistoricoTab medicoId={doctor.id} />
              </TabsContent>

              <TabsContent value="nps">
                <NpsTab medicoId={doctor.id} />
              </TabsContent>

              <TabsContent value="dados-pessoais">
                <DadosPessoaisTab medicoId={doctor.id} />
              </TabsContent>

              <TabsContent value="observacoes">
                <ObservacoesTab 
                  doctorId={doctor.id} 
                  observacoes={(doctor as any).observacoes || []}
                  currentUserId={undefined}
                />
              </TabsContent>

              <TabsContent value="settings" className="space-y-6">
                <FaixaFixaControl 
                  doctorId={doctor.id} 
                  currentFaixaFixa={(doctor as any).faixaFixa} 
                  currentFaixa={doctor.faixa} 
                />
                <PasswordChangeForm doctorId={doctor.id} />
              </TabsContent>
            </Tabs>
          </div>
        )}

        <SheetFooter className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
           <Button variant="outline" className="w-full sm:w-auto border-slate-200 text-slate-600 hover:text-slate-900" onClick={() => onOpenChange(false)}>Fechar</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
