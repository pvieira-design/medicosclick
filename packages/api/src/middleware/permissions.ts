import { TRPCError } from "@trpc/server";
import prisma from "@clickmedicos/db";
import { t } from "../trpc";

type UserTipo = "super_admin" | "admin" | "diretor" | "atendente" | "medico";

const PERMISSION_LEVELS: Record<UserTipo, number> = {
  super_admin: 5,
  admin: 4,
  diretor: 3,
  atendente: 2,
  medico: 1,
};

function hasMinPermission(userTipo: UserTipo, minTipo: UserTipo): boolean {
  return PERMISSION_LEVELS[userTipo] >= PERMISSION_LEVELS[minTipo];
}

function isStaff(userTipo: UserTipo): boolean {
  return hasMinPermission(userTipo, "atendente");
}

function isAdmin(userTipo: UserTipo): boolean {
  return hasMinPermission(userTipo, "admin");
}

function isMedico(userTipo: UserTipo): boolean {
  return userTipo === "medico";
}

function canViewSensitiveData(userTipo: UserTipo): boolean {
  return hasMinPermission(userTipo, "diretor");
}

function canOverride(userTipo: UserTipo): boolean {
  return hasMinPermission(userTipo, "diretor");
}

export const authenticatedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Voce precisa estar autenticado",
    });
  }

  const sessionUser = ctx.session.user as { id: string; email: string; name: string };

  const dbUser = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: {
      id: true,
      email: true,
      name: true,
      tipo: true,
      faixa: true,
      strikes: true,
      clickDoctorId: true,
      ativo: true,
      score: true,
    },
  });

  if (!dbUser) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Usuário não encontrado",
    });
  }

  const tipo = dbUser.tipo as UserTipo;

  return next({
    ctx: {
      ...ctx,
      user: {
        id: dbUser.id,
        email: dbUser.email,
        name: dbUser.name,
        tipo,
        faixa: dbUser.faixa,
        strikes: dbUser.strikes,
        clickDoctorId: dbUser.clickDoctorId,
        ativo: dbUser.ativo,
        score: dbUser.score,
      },
      permissions: {
        isStaff: isStaff(tipo),
        isAdmin: isAdmin(tipo),
        isMedico: isMedico(tipo),
        canViewSensitiveData: canViewSensitiveData(tipo),
        canOverride: canOverride(tipo),
      },
    },
  });
});

export const medicoProcedure = authenticatedProcedure.use(({ ctx, next }) => {
  if (!ctx.permissions.isMedico) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Apenas medicos podem acessar este recurso",
    });
  }

  return next({
    ctx: {
      ...ctx,
      medico: ctx.user,
    },
  });
});

export const staffProcedure = authenticatedProcedure.use(({ ctx, next }) => {
  if (!ctx.permissions.isStaff) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Apenas staff pode acessar este recurso",
    });
  }

  return next({ ctx });
});

export const diretorProcedure = authenticatedProcedure.use(({ ctx, next }) => {
  if (!ctx.permissions.canViewSensitiveData) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Apenas diretores ou superiores podem acessar este recurso",
    });
  }

  return next({ ctx });
});

export const adminProcedure = authenticatedProcedure.use(({ ctx, next }) => {
  if (!ctx.permissions.isAdmin) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Apenas administradores podem acessar este recurso",
    });
  }

  return next({ ctx });
});

export const superAdminProcedure = authenticatedProcedure.use(({ ctx, next }) => {
  if (ctx.user.tipo !== "super_admin") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Apenas super administradores podem acessar este recurso",
    });
  }

  return next({ ctx });
});

export function canAccessMedicoData(
  userTipo: UserTipo,
  userId: string,
  targetMedicoId: string
): boolean {
  if (isStaff(userTipo)) return true;
  return userId === targetMedicoId;
}

export const permissionHelpers = {
  hasMinPermission,
  isStaff,
  isAdmin,
  isMedico,
  canViewSensitiveData,
  canOverride,
  canAccessMedicoData,
};
