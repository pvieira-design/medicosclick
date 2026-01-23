"use client";

import { Settings, Clock, AlertTriangle, Calculator } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { FaixasTab } from "@/components/config/tabs/FaixasTab";
import { HorariosTab } from "@/components/config/tabs/HorariosTab";
import { StrikesTab } from "@/components/config/tabs/StrikesTab";
import { ScoreTab } from "@/components/config/tabs/ScoreTab";

const CONFIG_TABS = [
  {
    value: "faixas",
    label: "Faixas P1-P5",
    icon: Settings,
  },
  {
    value: "horarios",
    label: "Horarios",
    icon: Clock,
  },
  {
    value: "strikes",
    label: "Strikes",
    icon: AlertTriangle,
  },
  {
    value: "score",
    label: "Pesos do Score",
    icon: Calculator,
  },
];

export default function ConfigPage() {
  return (
    <div className="space-y-6 p-6 max-w-6xl mx-auto">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Configuracoes do Sistema</h1>
        <p className="text-muted-foreground">
          Gerencie as configuracoes globais do sistema. Apenas administradores podem acessar.
        </p>
      </div>

      <Tabs defaultValue="faixas" className="w-full">
        <TabsList className="w-full justify-start">
          {CONFIG_TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} className="gap-2">
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="mt-6">
          <TabsContent value="faixas">
            <FaixasTab />
          </TabsContent>

          <TabsContent value="horarios">
            <HorariosTab />
          </TabsContent>

          <TabsContent value="strikes">
            <StrikesTab />
          </TabsContent>

          <TabsContent value="score">
            <ScoreTab />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
