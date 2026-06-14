import { createActionAuditApi } from "@/lib/action-audit/createActionAuditApi";
import { createStubActionAuditApi } from "@/lib/action-audit/stub";

export const actionAudit = __AUDIT_ENABLED__
  ? createActionAuditApi()
  : createStubActionAuditApi();
