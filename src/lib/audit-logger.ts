import { supabase } from "@/integrations/supabase/client";

interface AuditLogParams {
  userId?: string;
  tenantId?: string;
  action: string;
  description: string;
  metadata?: Record<string, any>;
}

export class AuditLogger {
  /**
   * Log an audit event
   */
  static async log({
    userId,
    tenantId,
    action,
    description,
    metadata = {},
  }: AuditLogParams): Promise<void> {
    try {
      const response = await supabase.functions.invoke("audit-log", {
        body: {
          user_id: userId,
          tenant_id: tenantId,
          action: action.substring(0, 100), // Limit action length
          description: description.substring(0, 1000), // Limit description length
          metadata: metadata && typeof metadata === "object" ? metadata : {},
        },
      });
    } catch (error) {
      console.error("Failed to log audit event:", error);
      // Don't throw error to avoid breaking main functionality
    }
  }

  /**
   * Convenience methods for common audit events
   */
  static async logAuth(
    userId: string,
    action: "LOGIN_SUCCESS" | "LOGIN_FAILURE" | "LOGOUT" | "SIGNUP",
    details?: string,
  ) {
    return this.log({
      userId,
      action,
      description: details || `User ${action.toLowerCase().replace("_", " ")}`,
    });
  }

  static async logFileOperation(
    userId: string,
    action: "FILE_UPLOADED" | "FILE_DOWNLOADED" | "FILE_DELETED",
    fileName: string,
    fileId?: string,
    metadata?: Record<string, any>,
  ) {
    return this.log({
      userId,
      action,
      description: `${action.replace("_", " ").toLowerCase()} file: ${fileName}${fileId ? ` (ID: ${fileId})` : ""}`,
      metadata: { fileName, fileId, ...metadata },
    });
  }

  static async logEscalation(
    userId: string,
    action:
      | "ESCALATION_REQUESTED"
      | "ESCALATION_ASSIGNED"
      | "ESCALATION_RESOLVED",
    escalationId: string,
    details?: string,
    consultantId?: string,
  ) {
    return this.log({
      userId,
      action,
      description:
        details ||
        `Escalation ${action.toLowerCase().replace("escalation_", "")} (ID: ${escalationId})`,
      metadata: { escalationId, consultantId },
    });
  }

  static async logSubscription(
    userId: string,
    action:
      | "SUBSCRIPTION_CREATED"
      | "SUBSCRIPTION_UPDATED"
      | "SUBSCRIPTION_CANCELLED",
    planName: string,
    metadata?: Record<string, any>,
  ) {
    return this.log({
      userId,
      action,
      description: `Subscription ${action.toLowerCase().replace("subscription_", "")} - ${planName}`,
      metadata: { planName, ...metadata },
    });
  }

  static async logAdminAction(
    userId: string,
    action: string,
    description: string,
    targetUserId?: string,
    metadata?: Record<string, any>,
  ) {
    return this.log({
      userId,
      action: "ADMIN_ACTION",
      description: `Admin action: ${action} - ${description}`,
      metadata: { adminAction: action, targetUserId, ...metadata },
    });
  }

  static async logSystemEvent(
    action: string,
    description: string,
    metadata?: Record<string, any>,
  ) {
    return this.log({
      action: "SYSTEM_EVENT",
      description: `System event: ${action} - ${description}`,
      metadata: { systemAction: action, ...metadata },
    });
  }
}

// Convenience function for quick logging
export const auditLog = AuditLogger.log;
