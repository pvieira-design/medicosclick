"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useCallback, useMemo } from "react";
import { 
  type CalendarDate,
  type DateValue,
  getLocalTimeZone, 
  today,
  parseDate
} from "@internationalized/date";

export interface AnalyticsDateRange {
  dataInicio: string;
  dataFim: string;
}

export interface DateRangeValue {
  start: DateValue;
  end: DateValue;
}

function dateValueToString(date: DateValue): string {
  return `${date.year}-${String(date.month).padStart(2, "0")}-${String(date.day).padStart(2, "0")}`;
}

function getDefaultRange(): DateRangeValue {
  const now = today(getLocalTimeZone());
  return {
    start: now,
    end: now,
  };
}

export function useAnalyticsFilters() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const dateRangeValue = useMemo<DateRangeValue | null>(() => {
    const inicio = searchParams.get("inicio");
    const fim = searchParams.get("fim");

    if (inicio && fim) {
      try {
        return {
          start: parseDate(inicio),
          end: parseDate(fim),
        };
      } catch {
        return getDefaultRange();
      }
    }

    return getDefaultRange();
  }, [searchParams]);

  const dateRangeForApi = useMemo<AnalyticsDateRange>(() => {
    if (!dateRangeValue) {
      const def = getDefaultRange();
      return {
        dataInicio: dateValueToString(def.start),
        dataFim: dateValueToString(def.end),
      };
    }
    return {
      dataInicio: dateValueToString(dateRangeValue.start),
      dataFim: dateValueToString(dateRangeValue.end),
    };
  }, [dateRangeValue]);

  const setDateRange = useCallback(
    (range: DateRangeValue | null) => {
      const params = new URLSearchParams(searchParams.toString());

      if (range) {
        params.set("inicio", dateValueToString(range.start));
        params.set("fim", dateValueToString(range.end));
      } else {
        params.delete("inicio");
        params.delete("fim");
      }

      router.push(`${pathname}?${params.toString()}` as any);
    },
    [searchParams, router, pathname]
  );

  const clearFilters = useCallback(() => {
    router.push(pathname as any);
  }, [router, pathname]);

  return {
    dateRangeValue,
    dateRangeForApi,
    setDateRange,
    clearFilters,
  };
}
