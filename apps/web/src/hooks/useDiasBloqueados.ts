"use client";

import { useMemo } from "react";

type DiaSemana = "dom" | "seg" | "ter" | "qua" | "qui" | "sex" | "sab";

const DIAS_ORDEM: DiaSemana[] = ["dom", "seg", "ter", "qua", "qui", "sex", "sab"];

interface UseDiasBloqueadosReturn {
  diasBloqueados: Set<DiaSemana>;
  isDiaBloqueado: (dia: DiaSemana) => boolean;
  getProximoDiaPermitido: () => DiaSemana;
  diasBloqueadosArray: DiaSemana[];
}

/**
 * Hook para calcular dias bloqueados (regra dos 3 dias)
 * 
 * Regra: Nao pode alterar horarios para hoje, amanha e depois de amanha
 * Exemplo: Se hoje e segunda (seg), nao pode alterar seg, ter, qua
 * 
 * @param diasAntecedencia - Numero de dias de antecedencia (padrao: 3)
 */
export function useDiasBloqueados(diasAntecedencia: number = 3): UseDiasBloqueadosReturn {
  const { diasBloqueados, diasBloqueadosArray } = useMemo(() => {
    const hoje = new Date();
    const bloqueados = new Set<DiaSemana>();
    
    for (let i = 0; i < diasAntecedencia; i++) {
      const data = new Date(hoje);
      data.setDate(hoje.getDate() + i);
      const diaSemanaIndex = data.getDay();
      const diaSemana = DIAS_ORDEM[diaSemanaIndex];
      if (diaSemana) {
        bloqueados.add(diaSemana);
      }
    }
    
    return {
      diasBloqueados: bloqueados,
      diasBloqueadosArray: Array.from(bloqueados),
    };
  }, [diasAntecedencia]);

  const isDiaBloqueado = useMemo(() => {
    return (dia: DiaSemana) => diasBloqueados.has(dia);
  }, [diasBloqueados]);

  const getProximoDiaPermitido = useMemo(() => {
    return () => {
      const hoje = new Date();
      const proximoDiaPermitido = new Date(hoje);
      proximoDiaPermitido.setDate(hoje.getDate() + diasAntecedencia);
      const diaSemanaIndex = proximoDiaPermitido.getDay();
      return DIAS_ORDEM[diaSemanaIndex] ?? "dom";
    };
  }, [diasAntecedencia]);

  return {
    diasBloqueados,
    isDiaBloqueado,
    getProximoDiaPermitido,
    diasBloqueadosArray,
  };
}

/**
 * Funcao utilitaria para verificar se um slot especifico esta bloqueado
 * considerando o dia da semana e a data especifica
 */
export function isSlotBloqueadoPorData(
  diaSemana: DiaSemana,
  diasAntecedencia: number = 3
): boolean {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  
  for (let i = 0; i < diasAntecedencia; i++) {
    const data = new Date(hoje);
    data.setDate(hoje.getDate() + i);
    const diaSemanaIndex = data.getDay();
    if (DIAS_ORDEM[diaSemanaIndex] === diaSemana) {
      return true;
    }
  }
  
  return false;
}

/**
 * Retorna a proxima ocorrencia de um dia da semana
 * Se o dia ja passou nesta semana, retorna a proxima semana
 */
export function getProximaDataParaDia(diaSemana: DiaSemana): Date {
  const hoje = new Date();
  const diaAtualIndex = hoje.getDay();
  const diaAlvoIndex = DIAS_ORDEM.indexOf(diaSemana);
  
  let diasAteAlvo = diaAlvoIndex - diaAtualIndex;
  if (diasAteAlvo <= 0) {
    diasAteAlvo += 7;
  }
  
  const proximaData = new Date(hoje);
  proximaData.setDate(hoje.getDate() + diasAteAlvo);
  return proximaData;
}

/**
 * Formata a data para exibicao em portugues
 */
export function formatarDataBR(data: Date): string {
  return data.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
  });
}
