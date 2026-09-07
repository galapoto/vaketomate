const SEVERITIES = new Set(['debug','info','warning','error','critical']);

function fallbackId(prefix='evt') {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,10)}`;
}

export function createId(prefix='id') {
  if (globalThis.crypto?.randomUUID) return `${prefix}-${globalThis.crypto.randomUUID()}`;
  return fallbackId(prefix);
}

export function createEvent({
  eventType,
  module,
  entityType,
  entityId,
  actor=null,
  correlationId=null,
  severity='info',
  payload={},
  occurredAt=new Date().toISOString(),
  eventId=createId('evt')
}) {
  if (!eventType || !module) throw new Error('eventType and module are required');
  if (!SEVERITIES.has(severity)) throw new Error(`Unsupported severity: ${severity}`);
  return {
    event_id:eventId,
    event_type:String(eventType),
    module:String(module),
    entity_type:entityType ? String(entityType) : null,
    entity_id:entityId ? String(entityId) : null,
    occurred_at:String(occurredAt),
    actor:actor ? structuredCloneSafe(actor) : null,
    correlation_id:correlationId || createId('corr'),
    severity,
    payload:structuredCloneSafe(payload)
  };
}

export function createCommand({
  commandType,
  module,
  entityType,
  entityId,
  actor=null,
  correlationId=null,
  payload={},
  requestedAt=new Date().toISOString(),
  commandId=createId('cmd')
}) {
  if (!commandType || !module) throw new Error('commandType and module are required');
  return {
    command_id:commandId,
    command_type:String(commandType),
    module:String(module),
    entity_type:entityType ? String(entityType) : null,
    entity_id:entityId ? String(entityId) : null,
    requested_at:String(requestedAt),
    actor:actor ? structuredCloneSafe(actor) : null,
    correlation_id:correlationId || createId('corr'),
    payload:structuredCloneSafe(payload)
  };
}

export function createWorkItem({
  module,
  type,
  title,
  entityType=null,
  entityId=null,
  status='open',
  severity='info',
  dueAt=null,
  assignee=null,
  data={}
}) {
  if (!module || !type || !title) throw new Error('module, type and title are required');
  return {
    work_item_id:createId('work'),
    module,
    type,
    title,
    entity_type:entityType,
    entity_id:entityId,
    status,
    severity,
    due_at:dueAt,
    assignee:assignee ? structuredCloneSafe(assignee) : null,
    data:structuredCloneSafe(data),
    created_at:new Date().toISOString()
  };
}

function structuredCloneSafe(value) {
  if (value == null) return value;
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

export const EVENT_TYPES = Object.freeze({
  MODULE_RUN_STARTED:'platform.module.run.started',
  MODULE_RUN_COMPLETED:'platform.module.run.completed',
  MODULE_RUN_FAILED:'platform.module.run.failed',
  ARTEFACT_CREATED:'platform.artefact.created',
  SHARE_REQUESTED:'platform.share.requested',
  SHARE_COMPLETED:'platform.share.completed',
  SHARE_FAILED:'platform.share.failed',
  APPROVAL_SUBMITTED:'platform.approval.submitted',
  APPROVAL_APPROVED:'platform.approval.approved',
  APPROVAL_REJECTED:'platform.approval.rejected',
  REVIEW_DUE:'platform.review.due'
});
