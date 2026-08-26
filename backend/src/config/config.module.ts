import { Module } from "@nestjs/common";
import { ConfigModule as NestConfigModule } from "@nestjs/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),

  HISTORY_ENCRYPTION_KEY: z.string().min(32),
  FRONTEND_URL: z.string().url().default("http://localhost:3000"),

  BACKEND_URL: z.string().url().default("http://localhost:4000"),

  ANTHROPIC_API_KEY: z.string().optional(),
  AI_MODEL_HAIKU: z.string().default("claude-haiku-4-5"),
  AI_MODEL_SONNET: z.string().default("claude-sonnet-4-5"),

  GITHUB_OAUTH_CLIENT_ID: z.string().optional(),
  GITHUB_OAUTH_CLIENT_SECRET: z.string().optional(),
  GOOGLE_OAUTH_CLIENT_ID: z.string().optional(),
  GOOGLE_OAUTH_CLIENT_SECRET: z.string().optional(),

  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().optional(),

  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
  RAZORPAY_PLAN_ID_PRO: z.string().optional(),
  RAZORPAY_PLAN_ID_TEAM: z.string().optional(),

  SSO_SECRET_ENCRYPTION_KEY: z.string().min(32).optional(),

  SENTRY_DSN: z.string().optional(),
});

@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      validate: (config) => envSchema.parse(config),

      envFilePath: ["../.env", ".env"],
    }),
  ],
})
export class ConfigModule {}
