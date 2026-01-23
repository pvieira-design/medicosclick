"use client";

import { useState } from "react";
import { CalendarDays, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export interface DateRange {
  dataInicio: string;
  dataFim: string;
  label: string;
}

export type PresetKey = "hoje" | "ontem" | "ultimos7" | "ultimos30" | "esteMes" | "mesPassado";

function formatarData(data: Date): string {
  return data.toISOString().split("T")[0]!;
}

function criarPresets(): Record<PresetKey, () => DateRange> {
  return {
    hoje: () => {
      const hoje = new Date();
      return {
        dataInicio: formatarData(hoje),
        dataFim: formatarData(hoje),
        label: "Hoje",
      };
    },
    ontem: () => {
      const ontem = new Date();
      ontem.setDate(ontem.getDate() - 1);
      return {
        dataInicio: formatarData(ontem),
        dataFim: formatarData(ontem),
        label: "Ontem",
      };
    },
    ultimos7: () => {
      const fim = new Date();
      const inicio = new Date();
      inicio.setDate(inicio.getDate() - 7);
      return {
        dataInicio: formatarData(inicio),
        dataFim: formatarData(fim),
        label: "Ultimos 7 dias",
      };
    },
    ultimos30: () => {
      const fim = new Date();
      const inicio = new Date();
      inicio.setDate(inicio.getDate() - 30);
      return {
        dataInicio: formatarData(inicio),
        dataFim: formatarData(fim),
        label: "Ultimos 30 dias",
      };
    },
    esteMes: () => {
      const hoje = new Date();
      const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      return {
        dataInicio: formatarData(inicio),
        dataFim: formatarData(hoje),
        label: "Este mes",
      };
    },
    mesPassado: () => {
      const hoje = new Date();
      const inicioMesPassado = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
      const fimMesPassado = new Date(hoje.getFullYear(), hoje.getMonth(), 0);
      return {
        dataInicio: formatarData(inicioMesPassado),
        dataFim: formatarData(fimMesPassado),
        label: "Mes passado",
      };
    },
  };
}

const PRESETS = criarPresets();

const PRESET_OPTIONS: { key: PresetKey; label: string }[] = [
  { key: "hoje", label: "Hoje" },
  { key: "ontem", label: "Ontem" },
  { key: "ultimos7", label: "Ultimos 7 dias" },
  { key: "ultimos30", label: "Ultimos 30 dias" },
  { key: "esteMes", label: "Este mes" },
  { key: "mesPassado", label: "Mes passado" },
];

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  className?: string;
}

export function DateRangePicker({ value, onChange, className }: DateRangePickerProps) {
  const [open, setOpen] = useState(false);

  const handleSelect = (presetKey: PresetKey) => {
    const preset = PRESETS[presetKey];
    onChange(preset());
    setOpen(false);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        className={cn(
          "inline-flex items-center justify-between gap-2 whitespace-nowrap rounded-md border border-input bg-background px-3 py-2 text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 min-w-[200px]",
          className
        )}
      >
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          <span>{value.label}</span>
        </div>
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[200px]">
        {PRESET_OPTIONS.map((option) => (
          <DropdownMenuItem
            key={option.key}
            onClick={() => handleSelect(option.key)}
            className={cn(value.label === option.label && "bg-accent")}
          >
            {option.label}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <div className="px-2 py-1.5 text-xs text-muted-foreground">
          {value.dataInicio} ate {value.dataFim}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export { PRESETS, type PresetKey as DateRangePreset };
