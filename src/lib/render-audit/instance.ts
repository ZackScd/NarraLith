import { createRenderAuditApi } from "@/lib/render-audit/createRenderAuditApi";
import { createStubRenderAuditApi } from "@/lib/render-audit/stub";

export const renderAudit = __AUDIT_ENABLED__
  ? createRenderAuditApi()
  : createStubRenderAuditApi();
