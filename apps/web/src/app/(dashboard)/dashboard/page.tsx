import { auth } from "@clickmedicos/auth";
import prisma from "@clickmedicos/db";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import Dashboard from "./dashboard";

export default async function DashboardPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/login");
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { tipo: true },
  });

  if (dbUser?.tipo === "medico") {
    redirect("/dashboard/horarios");
  }

  return (
    <Dashboard session={session} />
  );
}
