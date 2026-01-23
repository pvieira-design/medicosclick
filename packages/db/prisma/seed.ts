import { PrismaClient } from "./generated/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(__dirname, "../../../apps/web/.env") });

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const configsPadrao = {
  horarios_funcionamento: {
    dom: { inicio: "08:00", fim: "17:00", ativo: true },
    seg: { inicio: "08:00", fim: "21:00", ativo: true },
    ter: { inicio: "08:00", fim: "21:00", ativo: true },
    qua: { inicio: "08:00", fim: "21:00", ativo: true },
    qui: { inicio: "08:00", fim: "21:00", ativo: true },
    sex: { inicio: "08:00", fim: "21:00", ativo: true },
    sab: { inicio: "08:00", fim: "17:00", ativo: true },
  },

  faixas: {
    P1: {
      scoreMinimo: 80,
      consultasMinimas: 100,
      slotsMaximo: null,
      slotsMinimo: 10,
      periodos: ["manha", "tarde", "noite"],
    },
    P2: {
      scoreMinimo: 60,
      consultasMinimas: 50,
      slotsMaximo: 150,
      slotsMinimo: 10,
      periodos: ["manha", "tarde", "noite"],
    },
    P3: {
      scoreMinimo: 40,
      consultasMinimas: 30,
      slotsMaximo: 100,
      slotsMinimo: 8,
      periodos: ["tarde", "noite"],
    },
    P4: {
      scoreMinimo: 20,
      consultasMinimas: 15,
      slotsMaximo: 50,
      slotsMinimo: 5,
      periodos: ["tarde"],
    },
    P5: {
      scoreMinimo: 0,
      consultasMinimas: 0,
      slotsMaximo: 30,
      slotsMinimo: 3,
      periodos: ["tarde"],
    },
  },

  periodos: {
    manha: { inicio: "08:00", fim: "12:00" },
    tarde: { inicio: "12:00", fim: "18:00" },
    noite: { inicio: "18:00", fim: "21:00" },
  },

  pesos_score: {
    conversao: 0.66,
    ticketMedio: 0.34,
  },

  strikes: {
    maxStrikes: 3,
    penalidades: [
      { strikes: 1, reducaoSlots: 10, duracaoDias: 7 },
      { strikes: 2, reducaoSlots: 20, duracaoDias: 14 },
      { strikes: 3, reducaoSlots: 50, duracaoDias: 30 },
    ],
  },
};

async function main() {
  console.log("Iniciando seed...");

  for (const [chave, valor] of Object.entries(configsPadrao)) {
    await prisma.configSistema.upsert({
      where: { chave },
      update: { valor: valor as object },
      create: {
        chave,
        valor: valor as object,
        descricao: getDescricao(chave),
      },
    });
    console.log(`Config '${chave}' criada/atualizada`);
  }

  console.log("Seed concluido!");
}

function getDescricao(chave: string): string {
  const descricoes: Record<string, string> = {
    horarios_funcionamento: "Horarios de funcionamento por dia da semana",
    faixas: "Configuracoes das faixas P1-P5 (score, slots, periodos)",
    periodos: "Definicao dos periodos do dia (manha, tarde, noite)",
    pesos_score: "Pesos para calculo do score (conversao e ticket medio)",
    strikes: "Configuracao de strikes e penalidades",
  };
  return descricoes[chave] || "";
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
