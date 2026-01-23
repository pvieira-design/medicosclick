"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useCallback, useMemo } from "react";
import { PRESETS, type DateRange, type DateRangePreset } from "@/components/dashboard/DateRangePicker";

export function useDashboardFilters() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const dateRange = useMemo<DateRange>(() => {
    const preset = searchParams.get("preset") as DateRangePreset | null;
    if (preset && PRESETS[preset]) {
      return PRESETS[preset]();
    }

    const inicio = searchParams.get("inicio");
    const fim = searchParams.get("fim");

    if (inicio && fim) {
      return {
        dataInicio: inicio,
        dataFim: fim,
        label: "Personalizado",
      };
    }

    return PRESETS.ultimos7();
  }, [searchParams]);

  const medicoId = searchParams.get("medicoId") ? parseInt(searchParams.get("medicoId")!) : undefined;

  const setDateRange = useCallback(
    (range: DateRange) => {
      const params = new URLSearchParams(searchParams.toString());

      const presetKey = Object.entries(PRESETS).find(
        ([, fn]) => fn().label === range.label
      )?.[0];

      if (presetKey) {
        params.set("preset", presetKey);
        params.delete("inicio");
        params.delete("fim");
      } else {
        params.delete("preset");
        params.set("inicio", range.dataInicio);
        params.set("fim", range.dataFim);
      }

      router.push(`${pathname}?${params.toString()}` as any);
    },
    [searchParams, router, pathname]
  );

  const setMedicoId = useCallback(
    (id: number | undefined) => {
      const params = new URLSearchParams(searchParams.toString());
      if (id) {
        params.set("medicoId", id.toString());
      } else {
        params.delete("medicoId");
      }
      router.push(`${pathname}?${params.toString()}` as any);
    },
    [searchParams, router, pathname]
  );

  const clearFilters = useCallback(() => {
    router.push(pathname as any);
  }, [router, pathname]);

  return {
    dateRange,
    medicoId,
    setDateRange,
    setMedicoId,
    clearFilters,
  };
}
