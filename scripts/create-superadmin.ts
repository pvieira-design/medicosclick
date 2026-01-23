import { PrismaClient } from "../packages/db/prisma/generated/client";
import { hashPassword } from "better-auth/crypto";

const prisma = new PrismaClient();

async function main() {
  const email = "superadmin@clickcannabis.com";
  const password = "super123";
  const name = "Super Admin";

  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    console.log("Usuario ja existe:", existingUser.id);
    return;
  }

  const hashedPassword = await hashPassword(password);
  const userId = crypto.randomUUID();
  const accountId = crypto.randomUUID();

  await prisma.$transaction([
    prisma.user.create({
      data: {
        id: userId,
        name,
        email,
        emailVerified: true,
        tipo: "super_admin",
        ativo: true,
      },
    }),
    prisma.account.create({
      data: {
        id: accountId,
        accountId: userId,
        providerId: "credential",
        userId: userId,
        password: hashedPassword,
      },
    }),
  ]);

  console.log("Superadmin criado com sucesso!");
  console.log("Email:", email);
  console.log("User ID:", userId);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
