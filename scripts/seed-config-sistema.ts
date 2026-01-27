import { config } from "dotenv";
import { resolve } from "path";
import { PrismaClient } from "../packages/db/prisma/generated/client";
import { PrismaPg } from "@prisma/adapter-pg";

config({ path: resolve(process.cwd(), "apps/web/.env") });

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seeding config_sistema...");

  const faixasConfig = {
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
      slotsMaximo: 120,
      slotsMinimo: 10,
      periodos: ["manha", "tarde", "noite"],
    },
    P3: {
      scoreMinimo: 40,
      consultasMinimas: 25,
      slotsMaximo: 80,
      slotsMinimo: 8,
      periodos: ["tarde", "noite"],
    },
    P4: {
      scoreMinimo: 20,
      consultasMinimas: 10,
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
  };

  const periodosConfig = {
    manha: { inicio: "08:00", fim: "12:00" },
    tarde: { inicio: "12:00", fim: "18:00" },
    noite: { inicio: "18:00", fim: "21:00" },
  };

  await prisma.configSistema.upsert({
    where: { chave: "faixas" },
    update: {
      valor: faixasConfig as any,
      descricao:
        "Configuracao das faixas de performance (P1-P5) com limites e periodos permitidos",
    },
    create: {
      chave: "faixas",
      valor: faixasConfig as any,
      descricao:
        "Configuracao das faixas de performance (P1-P5) com limites e periodos permitidos",
    },
  });

  console.log("✅ Configuracao 'faixas' inserida/atualizada");

  await prisma.configSistema.upsert({
    where: { chave: "periodos" },
    update: {
      valor: periodosConfig as any,
      descricao: "Definicao dos periodos do dia (manha, tarde, noite)",
    },
    create: {
      chave: "periodos",
      valor: periodosConfig as any,
      descricao: "Definicao dos periodos do dia (manha, tarde, noite)",
    },
  });

  console.log("✅ Configuracao 'periodos' inserida/atualizada");

  console.log("\n🎉 Seed concluído com sucesso!");
}

main()
  .catch((error) => {
    console.error("❌ Erro ao executar seed:", error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
