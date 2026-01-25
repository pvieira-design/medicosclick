import { publicProcedure, router } from "../trpc";
import { authenticatedProcedure } from "../middleware/permissions";
import { configRouter } from "./config";
import { usuariosRouter } from "./usuarios";
import { medicoRouter } from "./medico";
import { solicitacoesRouter } from "./solicitacoes";
import { aprovacoesRouter } from "./aprovacoes";
import { dashboardRouter } from "./dashboard";
import { analyticsRouter } from "./analytics";
import { notificacoesRouter } from "./notificacoes";
import { onboardingRouter } from "./onboarding";
import { receitaRouter } from "./receita";

export const appRouter = router({
  healthCheck: publicProcedure.query(() => {
    return "OK";
  }),
  me: authenticatedProcedure.query(({ ctx }) => {
    return {
      user: ctx.user,
      permissions: ctx.permissions,
    };
  }),
  config: configRouter,
  usuarios: usuariosRouter,
  medico: medicoRouter,
  solicitacoes: solicitacoesRouter,
  aprovacoes: aprovacoesRouter,
  dashboard: dashboardRouter,
  analytics: analyticsRouter,
  notificacoes: notificacoesRouter,
  onboarding: onboardingRouter,
  receita: receitaRouter,
});

export type AppRouter = typeof appRouter;
