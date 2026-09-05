import { createId } from '../../contracts/src/events.mjs';

export const APPROVAL_STATUS = Object.freeze({
  DRAFT:'draft',
  IN_REVIEW:'in_review',
  CHANGES_REQUESTED:'changes_requested',
  APPROVED:'approved',
  REVIEW_DUE:'review_due',
  ARCHIVED:'archived'
});

export class ApprovalService {
  constructor({audit=null, now=()=>new Date()}={}) {
    this.audit = audit;
    this.now = now;
  }

  create({module, entityType, entityId, requester=null, approver=null, reviewIntervalMonths=null}) {
    return {
      approval_id:createId('approval'),
      module,
      entity_type:entityType,
      entity_id:entityId,
      status:APPROVAL_STATUS.DRAFT,
      requester,
      approver,
      submitted_at:null,
      decided_at:null,
      decision_message:'',
      rejection_reason:'',
      review_interval_months:reviewIntervalMonths,
      next_review_at:null,
      history:[]
    };
  }

  submit(workflow, {requester=workflow.requester, approver=workflow.approver, message='', artefacts=[]}={}) {
    assertStatus(workflow,[APPROVAL_STATUS.DRAFT,APPROVAL_STATUS.CHANGES_REQUESTED]);
    workflow.status=APPROVAL_STATUS.IN_REVIEW;
    workflow.requester=requester;
    workflow.approver=approver;
    workflow.submitted_at=this.now().toISOString();
    pushHistory(workflow,'submitted',{message,artefacts,at:workflow.submitted_at});
    this._audit(workflow,'platform.approval.submitted',{message,artefacts});
    return workflow;
  }

  approve(workflow,{actor=workflow.approver,message=''}={}) {
    assertStatus(workflow,[APPROVAL_STATUS.IN_REVIEW]);
    workflow.status=APPROVAL_STATUS.APPROVED;
    workflow.decided_at=this.now().toISOString();
    workflow.decision_message=message;
    workflow.rejection_reason='';
    if (workflow.review_interval_months) {
      workflow.next_review_at=addMonths(this.now(),workflow.review_interval_months).toISOString();
    }
    pushHistory(workflow,'approved',{actor,message,at:workflow.decided_at,nextReviewAt:workflow.next_review_at});
    this._audit(workflow,'platform.approval.approved',{actor,message,next_review_at:workflow.next_review_at});
    return workflow;
  }

  reject(workflow,{actor=workflow.approver,reason}={}) {
    assertStatus(workflow,[APPROVAL_STATUS.IN_REVIEW]);
    if (!String(reason||'').trim()) throw new Error('Rejection reason is required');
    workflow.status=APPROVAL_STATUS.CHANGES_REQUESTED;
    workflow.decided_at=this.now().toISOString();
    workflow.rejection_reason=String(reason).trim();
    pushHistory(workflow,'changes_requested',{actor,reason:workflow.rejection_reason,at:workflow.decided_at});
    this._audit(workflow,'platform.approval.rejected',{actor,reason:workflow.rejection_reason});
    return workflow;
  }

  markReviewDue(workflow) {
    if (workflow.status !== APPROVAL_STATUS.APPROVED) return workflow;
    if (!workflow.next_review_at) return workflow;
    if (new Date(workflow.next_review_at) > this.now()) return workflow;
    workflow.status=APPROVAL_STATUS.REVIEW_DUE;
    pushHistory(workflow,'review_due',{at:this.now().toISOString()});
    this._audit(workflow,'platform.review.due',{next_review_at:workflow.next_review_at});
    return workflow;
  }

  reopenForReview(workflow,{actor=null}={}) {
    assertStatus(workflow,[APPROVAL_STATUS.REVIEW_DUE,APPROVAL_STATUS.APPROVED]);
    workflow.status=APPROVAL_STATUS.DRAFT;
    pushHistory(workflow,'review_reopened',{actor,at:this.now().toISOString()});
    return workflow;
  }

  _audit(workflow,eventType,payload) {
    this.audit?.recordDomain?.({
      eventType,
      module:workflow.module,
      entityType:workflow.entity_type,
      entityId:workflow.entity_id,
      payload
    });
  }
}

function assertStatus(workflow,allowed) {
  if (!allowed.includes(workflow.status)) {
    throw new Error(`Invalid approval transition from ${workflow.status}`);
  }
}

function pushHistory(workflow,type,data) {
  workflow.history ||= [];
  workflow.history.push({type,...data});
}

function addMonths(date,months) {
  const d=new Date(date);
  d.setMonth(d.getMonth()+Number(months));
  return d;
}
