import { createId, createWorkItem } from '../../contracts/src/events.mjs';

export function scheduleReview({module,entityType,entityId,approvedAt,intervalMonths=12,assignee=null,metadata={}}) {
  if (!module || !entityId || !approvedAt) throw new Error('module, entityId and approvedAt are required');
  const due=new Date(approvedAt);
  due.setMonth(due.getMonth()+Number(intervalMonths));
  return {
    schedule_id:createId('schedule'),
    kind:'review',
    module,
    entity_type:entityType || null,
    entity_id:entityId,
    interval_months:Number(intervalMonths),
    approved_at:new Date(approvedAt).toISOString(),
    due_at:due.toISOString(),
    assignee,
    metadata:{...metadata},
    status:'scheduled'
  };
}

export function reviewWorkItem(schedule,{now=new Date()}={}) {
  if (schedule.status==='completed' || new Date(schedule.due_at)>now) return null;
  return createWorkItem({
    module:schedule.module,
    type:'review_due',
    title:'Katselmointi erääntynyt',
    entityType:schedule.entity_type,
    entityId:schedule.entity_id,
    severity:'warning',
    dueAt:schedule.due_at,
    assignee:schedule.assignee,
    data:{schedule_id:schedule.schedule_id,...schedule.metadata}
  });
}
