import { supabase } from "@/integrations/supabase/client";

/**
 * Record a staff action in the admin audit log.
 * Fails silently — auditing must never block the action itself.
 */
export async function logAdminAction(
  actor: { id: string; email?: string | null } | null | undefined,
  action: string,
  entity: string,
  entityId?: string | null,
  details: Record<string, unknown> = {},
) {
  if (!actor?.id) return;
  try {
    await supabase.from("admin_audit_log" as any).insert({
      actor_user_id: actor.id,
      actor_email: actor.email ?? null,
      action,
      entity,
      entity_id: entityId ?? null,
      details,
    } as any);
  } catch {
    /* ignore */
  }
}
