/**
 * Conversor de horarios entre formato local (slots de 20min) e formato Click (blocos)
 *
 * Formato Local: [{ diaSemana: "seg", horario: "08:00" }, ...]
 * Formato Click: { "SEG": ["08:00-12:00", "14:00-18:00"], ... }
 */

export interface SlotLocal {
  diaSemana: "dom" | "seg" | "ter" | "qua" | "qui" | "sex" | "sab";
  horario: string; // "HH:mm"
}

export interface ClickSchedule {
  DOM?: string[];
  SEG?: string[];
  TER?: string[];
  QUA?: string[];
  QUI?: string[];
  SEX?: string[];
  SAB?: string[];
}

// Mapeamento bidirecional de dias
const DIA_LOCAL_PARA_CLICK: Record<string, keyof ClickSchedule> = {
  dom: "DOM",
  seg: "SEG",
  ter: "TER",
  qua: "QUA",
  qui: "QUI",
  sex: "SEX",
  sab: "SAB",
};

const DIA_CLICK_PARA_LOCAL: Record<string, SlotLocal["diaSemana"]> = {
  DOM: "dom",
  SEG: "seg",
  TER: "ter",
  QUA: "qua",
  QUI: "qui",
  SEX: "sex",
  SAB: "sab",
};

const DURACAO_SLOT_MINUTOS = 20;

/**
 * Converte horario "HH:mm" para minutos desde meia-noite
 */
function horarioParaMinutos(horario: string): number {
  const [h, m] = horario.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

/**
 * Converte minutos desde meia-noite para "HH:mm"
 */
function minutosParaHorario(minutos: number): string {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

/**
 * Agrupa slots contiguos em blocos de horario
 * Ex: ["08:00", "08:20", "08:40"] -> ["08:00-09:00"]
 */
function agruparSlotsEmBlocos(horarios: string[]): string[] {
  if (horarios.length === 0) return [];

  // Ordenar por horario
  const sorted = [...horarios].sort((a, b) => horarioParaMinutos(a) - horarioParaMinutos(b));

  const blocos: string[] = [];
  let inicioBloco = sorted[0]!;
  let fimAtual = horarioParaMinutos(sorted[0]!) + DURACAO_SLOT_MINUTOS;

  for (let i = 1; i < sorted.length; i++) {
    const horarioAtual = sorted[i]!;
    const minutosAtual = horarioParaMinutos(horarioAtual);

    // Se o slot atual e contíguo (comeca onde o anterior termina)
    if (minutosAtual === fimAtual) {
      // Continua o bloco
      fimAtual = minutosAtual + DURACAO_SLOT_MINUTOS;
    } else {
      // Fecha o bloco atual e inicia um novo
      blocos.push(`${inicioBloco}-${minutosParaHorario(fimAtual)}`);
      inicioBloco = horarioAtual;
      fimAtual = minutosAtual + DURACAO_SLOT_MINUTOS;
    }
  }

  // Adiciona o ultimo bloco
  blocos.push(`${inicioBloco}-${minutosParaHorario(fimAtual)}`);

  return blocos;
}

/**
 * Expande um bloco de horario em slots de 20 minutos
 * Ex: "08:00-09:00" -> ["08:00", "08:20", "08:40"]
 */
function expandirBlocoEmSlots(bloco: string): string[] {
  const [inicio, fim] = bloco.split("-");
  if (!inicio || !fim) return [];

  const minutosInicio = horarioParaMinutos(inicio);
  const minutosFim = horarioParaMinutos(fim);

  const slots: string[] = [];
  let minutoAtual = minutosInicio;

  while (minutoAtual < minutosFim) {
    slots.push(minutosParaHorario(minutoAtual));
    minutoAtual += DURACAO_SLOT_MINUTOS;
  }

  return slots;
}

/**
 * Converte slots locais para formato Click schedule
 *
 * @param slots Array de slots no formato local
 * @returns Schedule no formato Click
 *
 * @example
 * const slots = [
 *   { diaSemana: "seg", horario: "08:00" },
 *   { diaSemana: "seg", horario: "08:20" },
 *   { diaSemana: "seg", horario: "14:00" },
 *   { diaSemana: "ter", horario: "09:00" },
 * ];
 * const schedule = slotsParaClickSchedule(slots);
 * // Result: { SEG: ["08:00-08:40", "14:00-14:20"], TER: ["09:00-09:20"] }
 */
export function slotsParaClickSchedule(slots: SlotLocal[]): ClickSchedule {
  // Agrupar slots por dia
  const slotsPorDia: Record<string, string[]> = {};

  for (const slot of slots) {
    const diaClick = DIA_LOCAL_PARA_CLICK[slot.diaSemana];
    if (!diaClick) continue;

    if (!slotsPorDia[diaClick]) {
      slotsPorDia[diaClick] = [];
    }
    slotsPorDia[diaClick].push(slot.horario);
  }

  // Converter para blocos
  const schedule: ClickSchedule = {};

  for (const [dia, horarios] of Object.entries(slotsPorDia)) {
    const blocos = agruparSlotsEmBlocos(horarios);
    if (blocos.length > 0) {
      schedule[dia as keyof ClickSchedule] = blocos;
    }
  }

  return schedule;
}

/**
 * Converte Click schedule para slots locais
 *
 * @param schedule Schedule no formato Click
 * @returns Array de slots no formato local
 *
 * @example
 * const schedule = { SEG: ["08:00-09:00"], TER: ["14:00-15:00"] };
 * const slots = clickScheduleParaSlots(schedule);
 * // Result: [
 * //   { diaSemana: "seg", horario: "08:00" },
 * //   { diaSemana: "seg", horario: "08:20" },
 * //   { diaSemana: "seg", horario: "08:40" },
 * //   { diaSemana: "ter", horario: "14:00" },
 * //   { diaSemana: "ter", horario: "14:20" },
 * //   { diaSemana: "ter", horario: "14:40" },
 * // ]
 */
export function clickScheduleParaSlots(schedule: ClickSchedule | null): SlotLocal[] {
  if (!schedule) return [];

  const slots: SlotLocal[] = [];

  for (const [diaClick, blocos] of Object.entries(schedule)) {
    const diaLocal = DIA_CLICK_PARA_LOCAL[diaClick];
    if (!diaLocal || !Array.isArray(blocos)) continue;

    for (const bloco of blocos) {
      const horariosExpandidos = expandirBlocoEmSlots(bloco);
      for (const horario of horariosExpandidos) {
        slots.push({ diaSemana: diaLocal, horario });
      }
    }
  }

  return slots;
}

/**
 * Verifica se um schedule Click esta vazio
 */
export function isScheduleVazio(schedule: ClickSchedule | null): boolean {
  if (!schedule) return true;

  for (const blocos of Object.values(schedule)) {
    if (Array.isArray(blocos) && blocos.length > 0) {
      return false;
    }
  }

  return true;
}

/**
 * Conta o total de slots em um schedule Click
 */
export function contarSlotsSchedule(schedule: ClickSchedule | null): number {
  if (!schedule) return 0;

  let total = 0;

  for (const blocos of Object.values(schedule)) {
    if (!Array.isArray(blocos)) continue;

    for (const bloco of blocos) {
      const slots = expandirBlocoEmSlots(bloco);
      total += slots.length;
    }
  }

  return total;
}
