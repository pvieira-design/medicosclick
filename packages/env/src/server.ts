import "dotenv/config";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().min(1),
    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_URL: z.url(),
    CORS_ORIGIN: z.url(),
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    CLICK_API_BASE_URL: z.string().url().default("https://clickcannabis.app.n8n.cloud/webhook"),
    CLICK_REPLICA_DATABASE_URL: z.string().optional(),
    CRON_SECRET: z.string().min(16).optional(),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
