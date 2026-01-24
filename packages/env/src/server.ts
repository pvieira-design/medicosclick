import "dotenv/config";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

const getAutoUrl = () => {
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return "http://localhost:3001";
};

const autoUrl = getAutoUrl();

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().min(1),
    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_URL: z.string().url(),
    CORS_ORIGIN: z.string().url(),
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    CLICK_API_BASE_URL: z.string().url().default("https://clickcannabis.app.n8n.cloud/webhook"),
    CLICK_REPLICA_DATABASE_URL: z.string().optional(),
    CRON_SECRET: z.string().min(16).optional(),
    RESEND_API_KEY: z.string().min(1).optional(),
    EMAIL_FROM: z.string().min(1).optional(),
  },
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL || autoUrl,
    CORS_ORIGIN: process.env.CORS_ORIGIN || autoUrl,
    NODE_ENV: process.env.NODE_ENV,
    CLICK_API_BASE_URL: process.env.CLICK_API_BASE_URL,
    CLICK_REPLICA_DATABASE_URL: process.env.CLICK_REPLICA_DATABASE_URL,
    CRON_SECRET: process.env.CRON_SECRET,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    EMAIL_FROM: process.env.EMAIL_FROM,
  },
  emptyStringAsUndefined: true,
});
