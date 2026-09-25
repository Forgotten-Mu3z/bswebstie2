import { getD1 } from '@/server/db';

// Audit trail of admin actions. Never store passwords, tokens or secrets here.

export type AuditEntry = {
  actorUserId: string;
  action: string;
  resourceType: 'product' | 'product_image' | 'account';
  resourceId?: string | null;
  before?: unknown;
  after?: unknown;
  ipAddress?: string | null;
};

/**
 * A prepared statement, so it can join a batch with the change it records.
 * With onlyIfChanged, it is written only when the statement just before it in
 * the batch changed exactly one row (a lost edit conflict leaves no record).
 */
export function auditStatement(entry: AuditEntry, onlyIfChanged = false) {
  return getD1()
    .prepare(
      `INSERT INTO audit_logs (id, actor_user_id, action, resource_type, resource_id, before, after, ip_address, created_at)
      SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?${onlyIfChanged ? ' WHERE changes() = 1' : ''}`,
    )
    .bind(
      crypto.randomUUID(),
      entry.actorUserId,
      entry.action,
      entry.resourceType,
      entry.resourceId ?? null,
      entry.before === undefined ? null : JSON.stringify(entry.before),
      entry.after === undefined ? null : JSON.stringify(entry.after),
      entry.ipAddress ?? null,
      Math.floor(Date.now() / 1000),
    );
}

export async function recordAudit(entry: AuditEntry) {
  await auditStatement(entry).run();
}
