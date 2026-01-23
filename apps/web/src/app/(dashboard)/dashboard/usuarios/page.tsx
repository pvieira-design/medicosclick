"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { trpc, trpcClient } from "@/utils/trpc";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Loader2, 
  MoreHorizontal, 
  UserPlus, 
  Search, 
  Shield, 
  Stethoscope, 
  Users, 
  Import, 
  CheckCircle2, 
  XCircle,
  AlertTriangle
} from "lucide-react";

export default function UsersPage() {
  const [activeTab, setActiveTab] = useState("medicos");

  // Stats
  const { data: stats, isLoading: statsLoading } = useQuery(trpc.usuarios.estatisticas.queryOptions());

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-brand-900 dark:text-brand-50">Gerenciamento de Usuários</h1>
          <p className="text-muted-foreground mt-1">Administre médicos, staff e permissões do sistema.</p>
        </div>
        <CreateStaffDialog />
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard 
          title="Total de Médicos" 
          value={stats?.totalMedicos} 
          icon={<Stethoscope className="h-4 w-4 text-brand-600" />}
          loading={statsLoading}
        />
        <StatsCard 
          title="Médicos Ativos" 
          value={stats?.medicosAtivos} 
          icon={<CheckCircle2 className="h-4 w-4 text-brand-600" />}
          loading={statsLoading}
        />
        <StatsCard 
          title="Equipe Staff" 
          value={stats?.totalStaff} 
          icon={<Shield className="h-4 w-4 text-brand-600" />}
          loading={statsLoading}
        />
        <StatsCard 
          title="Por Faixa (P5)" 
          value={stats?.medicosPorFaixa?.P5 || 0} 
          icon={<Users className="h-4 w-4 text-brand-600" />}
          loading={statsLoading}
        />
      </div>

      <Tabs defaultValue="medicos" value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-brand-50/50 dark:bg-brand-900/20 p-1">
          <TabsTrigger value="medicos" className="data-[state=active]:bg-brand-100 dark:data-[state=active]:bg-brand-900 data-[state=active]:text-brand-900 dark:data-[state=active]:text-brand-100">
            Médicos
          </TabsTrigger>
          <TabsTrigger value="staff" className="data-[state=active]:bg-brand-100 dark:data-[state=active]:bg-brand-900 data-[state=active]:text-brand-900 dark:data-[state=active]:text-brand-100">
            Staff Administrativo
          </TabsTrigger>
          <TabsTrigger value="importar" className="data-[state=active]:bg-brand-100 dark:data-[state=active]:bg-brand-900 data-[state=active]:text-brand-900 dark:data-[state=active]:text-brand-100">
            Importar do Click
          </TabsTrigger>
        </TabsList>

        <TabsContent value="medicos" className="space-y-4">
          <UsersTable type="medico" />
        </TabsContent>

        <TabsContent value="staff" className="space-y-4">
          <UsersTable type="staff" />
        </TabsContent>

        <TabsContent value="importar" className="space-y-4">
          <ImportDoctors />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatsCard({ title, value, icon, loading }: { title: string; value?: number; icon: React.ReactNode; loading: boolean }) {
  return (
    <Card className="border-brand-100 dark:border-brand-900/50 bg-gradient-to-br from-white to-brand-50/30 dark:from-background dark:to-brand-900/10">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-7 w-16 animate-pulse rounded bg-brand-100 dark:bg-brand-900/50" />
        ) : (
          <div className="text-2xl font-bold text-brand-900 dark:text-brand-50">{value ?? 0}</div>
        )}
      </CardContent>
    </Card>
  );
}

type FaixaType = "P1" | "P2" | "P3" | "P4" | "P5";

function UsersTable({ type }: { type: "medico" | "staff" }) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [faixaFilter, setFaixaFilter] = useState<string>("all");
  const [staffTypeFilter, setStaffTypeFilter] = useState<"admin" | "diretor" | "atendente">("admin");
  
  const queryClient = useQueryClient();

  const queryInput = {
    page,
    perPage: 10,
    tipo: type === "medico" ? ("medico" as const) : staffTypeFilter,
    faixa: type === "medico" && faixaFilter !== "all" ? (faixaFilter as FaixaType) : undefined,
    search: search.trim() || undefined,
  };

  const { data: usersData, isLoading: usersLoading } = useQuery(trpc.usuarios.listar.queryOptions(queryInput));

  const toggleStatusMutation = useMutation({
    mutationFn: (input: { userId: string; ativo: boolean }) =>
      trpcClient.usuarios.alterarStatus.mutate(input),
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast.success("Status atualizado com sucesso");
    },
  });

  const changeFaixaMutation = useMutation({
    mutationFn: (input: { userId: string; faixa: FaixaType }) =>
      trpcClient.usuarios.alterarFaixa.mutate(input),
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast.success("Faixa atualizada com sucesso");
    },
  });

  const resetStrikesMutation = useMutation({
    mutationFn: (input: { userId: string }) =>
      trpcClient.usuarios.resetarStrikes.mutate(input),
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast.success("Strikes resetados com sucesso");
    },
  });

  if (usersLoading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar por nome, email ou CRM..." 
            className="pl-8" 
            value={search} 
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        
        {type === "medico" && (
          <Select value={faixaFilter} onValueChange={(v) => setFaixaFilter(v ?? "all")}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filtrar por Faixa" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as Faixas</SelectItem>
              <SelectItem value="P1">P1</SelectItem>
              <SelectItem value="P2">P2</SelectItem>
              <SelectItem value="P3">P3</SelectItem>
              <SelectItem value="P4">P4</SelectItem>
              <SelectItem value="P5">P5</SelectItem>
            </SelectContent>
          </Select>
        )}

        {type === "staff" && (
          <Select value={staffTypeFilter} onValueChange={(v) => setStaffTypeFilter(v as any)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Tipo de Staff" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="diretor">Diretor</SelectItem>
              <SelectItem value="atendente">Atendente</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="rounded-md border border-brand-100 dark:border-brand-900 overflow-hidden">
        <Table>
          <TableHeader className="bg-brand-50/50 dark:bg-brand-900/20">
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Tipo / Faixa</TableHead>
              <TableHead>Status</TableHead>
              {type === "medico" && <TableHead>Strikes</TableHead>}
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {usersData?.usuarios.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <div className="flex gap-2 items-center">
                    <Badge variant="outline" className="border-brand-200 text-brand-700 dark:border-brand-800 dark:text-brand-300">
                      {user.tipo}
                    </Badge>
                    {user.tipo === "medico" && user.faixa && (
                      <Badge className="bg-brand-600 hover:bg-brand-700">{user.faixa}</Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={user.ativo ? "default" : "secondary"} className={user.ativo ? "bg-green-600 hover:bg-green-700" : ""}>
                    {user.ativo ? "Ativo" : "Inativo"}
                  </Badge>
                </TableCell>
                {type === "medico" && (
                  <TableCell>
                    {user.strikes > 0 ? (
                      <div className="flex items-center gap-1 text-amber-600">
                        <AlertTriangle className="h-4 w-4" />
                        <span>{user.strikes}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                )}
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-8 w-8 p-0">
                      <span className="sr-only">Abrir menu</span>
                      <MoreHorizontal className="h-4 w-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Ações</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => toggleStatusMutation.mutate({ userId: user.id, ativo: !user.ativo })}>
                        {user.ativo ? "Desativar Usuário" : "Ativar Usuário"}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {type === "medico" && (
                        <>
                          <DropdownMenuItem onClick={() => changeFaixaMutation.mutate({ userId: user.id, faixa: "P1" })}>Mudar para P1</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => changeFaixaMutation.mutate({ userId: user.id, faixa: "P2" })}>Mudar para P2</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => changeFaixaMutation.mutate({ userId: user.id, faixa: "P3" })}>Mudar para P3</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => changeFaixaMutation.mutate({ userId: user.id, faixa: "P4" })}>Mudar para P4</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => changeFaixaMutation.mutate({ userId: user.id, faixa: "P5" })}>Mudar para P5</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => resetStrikesMutation.mutate({ userId: user.id })}>
                            Resetar Strikes
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious 
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className={page === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
            />
          </PaginationItem>
          <PaginationItem>
            <span className="flex items-center px-4 text-sm font-medium">
              Página {page} de {usersData?.pages || 1}
            </span>
          </PaginationItem>
          <PaginationItem>
            <PaginationNext 
              onClick={() => setPage(p => Math.min(usersData?.pages || 1, p + 1))}
              className={page === (usersData?.pages || 1) ? "pointer-events-none opacity-50" : "cursor-pointer"}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}

function ImportDoctors() {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [showDiagnostico, setShowDiagnostico] = useState(false);
  const queryClient = useQueryClient();
  
  const { data: doctors, isLoading } = useQuery(trpc.usuarios.getMedicosClick.queryOptions());
  const { data: diagnostico, isLoading: diagLoading } = useQuery({
    ...trpc.usuarios.diagnosticoMedicosClick.queryOptions(),
    enabled: showDiagnostico,
  });
  
  const importMutation = useMutation({
    mutationFn: (input: { doctorIds: number[] }) =>
      trpcClient.usuarios.importarMedicos.mutate(input),
    onSuccess: (data: { importados: number; ignorados: number }) => {
      toast.success(`${data.importados} médicos importados com sucesso!`);
      queryClient.invalidateQueries();
      setSelectedIds([]);
    },
    onError: (error: { message: string }) => {
      toast.error(`Erro ao importar: ${error.message}`);
    }
  });

  const handleSelectAll = (checked: boolean) => {
    if (checked && doctors) {
      const notImported = doctors.filter(d => !d.jaImportado).map(d => d.doctor_id);
      setSelectedIds(notImported);
    } else {
      setSelectedIds([]);
    }
  };

  const toggleSelection = (id: number) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-brand-600" /></div>;

  const notImportedCount = doctors?.filter(d => !d.jaImportado).length || 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="text-lg font-medium">Médicos Disponíveis no Click</h3>
          <p className="text-sm text-muted-foreground">Selecione os médicos para importar para o ClickMédicos.</p>
        </div>
        <Button 
          onClick={() => importMutation.mutate({ doctorIds: selectedIds })}
          disabled={selectedIds.length === 0 || importMutation.isPending}
          className="bg-brand-600 hover:bg-brand-700"
        >
          {importMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Import className="mr-2 h-4 w-4" />}
          Importar Selecionados ({selectedIds.length})
        </Button>
      </div>

      <div className="rounded-md border border-brand-100 dark:border-brand-900 overflow-hidden">
        <Table>
          <TableHeader className="bg-brand-50/50 dark:bg-brand-900/20">
            <TableRow>
              <TableHead className="w-[50px]">
                <Checkbox 
                  checked={selectedIds.length > 0 && selectedIds.length === notImportedCount}
                  onCheckedChange={handleSelectAll}
                  disabled={notImportedCount === 0}
                />
              </TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>ID Click</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {doctors?.map((doctor) => (
              <TableRow key={doctor.doctor_id} className={doctor.jaImportado ? "bg-muted/50" : ""}>
                <TableCell>
                  {!doctor.jaImportado && (
                    <Checkbox 
                      checked={selectedIds.includes(doctor.doctor_id)}
                      onCheckedChange={() => toggleSelection(doctor.doctor_id)}
                    />
                  )}
                </TableCell>
                <TableCell className="font-medium">{doctor.name}</TableCell>
                <TableCell>{doctor.email}</TableCell>
                <TableCell>{doctor.doctor_id}</TableCell>
                <TableCell>
                  {doctor.jaImportado ? (
                    <Badge variant="secondary">Já Importado</Badge>
                  ) : (
                    <Badge variant="outline" className="text-brand-600 border-brand-200">Disponível</Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {doctors?.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  Nenhum médico encontrado no Click.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function CreateStaffDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [tipo, setTipo] = useState<"atendente" | "diretor" | "admin">("atendente");
  
  const queryClient = useQueryClient();
  
  const createMutation = useMutation({
    mutationFn: (input: { name: string; email: string; senha: string; tipo: "atendente" | "diretor" | "admin" }) =>
      trpcClient.usuarios.criarStaff.mutate(input),
    onSuccess: () => {
      toast.success("Staff criado com sucesso!");
      setOpen(false);
      setName("");
      setEmail("");
      setPassword("");
      setTipo("atendente");
      queryClient.invalidateQueries();
    },
    onError: (error: { message: string }) => {
      toast.error(`Erro ao criar staff: ${error.message}`);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({ name, email, senha: password, tipo });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-brand-600 hover:bg-brand-700 text-white shadow h-9 px-4 py-2">
        <UserPlus className="h-4 w-4" />
        Novo Staff
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Criar Novo Membro da Staff</DialogTitle>
          <DialogDescription>
            Adicione um novo administrador, diretor ou atendente ao sistema.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome Completo</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password">Senha Provisória</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="tipo">Tipo de Permissão</Label>
            <Select value={tipo} onValueChange={(v: any) => setTipo(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="atendente">Atendente</SelectItem>
                <SelectItem value="diretor">Diretor</SelectItem>
                <SelectItem value="admin">Administrador</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" className="bg-brand-600 hover:bg-brand-700" disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar Usuário
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
