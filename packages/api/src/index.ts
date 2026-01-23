export { t, router, publicProcedure } from "./trpc";

export {
  authenticatedProcedure,
  medicoProcedure,
  staffProcedure,
  diretorProcedure,
  adminProcedure,
  superAdminProcedure,
  permissionHelpers,
} from "./middleware/permissions";
