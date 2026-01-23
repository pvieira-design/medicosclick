import "dotenv/config";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

const getVercelUrl = () => {
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  if (process.env.VERCEL_BRANCH_URL) return `https://${process.env.VERCEL_BRANCH_URL}`;
  return process.env.BETTER_AUTH_URL || "http://localhost:3001";
};

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().min(1),
    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_URL: z.string().url().default(getVercelUrl()),
    CORS_ORIGIN: z.string().url().default(getVercelUrl()),
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    CLICK_API_BASE_URL: z.string().url().default("https://clickcannabis.app.n8n.cloud/webhook"),
    CLICK_REPLICA_DATABASE_URL: z.string().optional(),
    CRON_SECRET: z.string().min(16).optional(),
  },
  runtimeEnv: {
    ...process.env,
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL || getVercelUrl(),
    CORS_ORIGIN: process.env.CORS_ORIGIN || getVercelUrl(),
  },
  emptyStringAsUndefined: true,
});
