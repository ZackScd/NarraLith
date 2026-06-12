import { createAuditApi } from "@/lib/audit/createAuditApi";
import { createStubAuditApi } from "@/lib/audit/stub";

/** Singleton — importar desde aquí, no desde `index.ts`, para evitar ciclos con `auditInvoke`. */
export const audit = __AUDIT_ENABLED__ ? createAuditApi() : createStubAuditApi();
