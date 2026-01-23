import prisma from "@clickmedicos/db";
import { env } from "@clickmedicos/env/server";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { admin } from "better-auth/plugins";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),

  trustedOrigins: (request) => {
    const origin = request?.headers?.get?.("origin") ?? "";
    const trusted: (string | null)[] = [env.CORS_ORIGIN];
    if (origin.endsWith(".vercel.app")) trusted.push(origin);
    if (origin.includes("localhost")) trusted.push(origin);
    return trusted;
  },
  emailAndPassword: {
    enabled: true,
  },
  plugins: [nextCookies(), admin()],
});
