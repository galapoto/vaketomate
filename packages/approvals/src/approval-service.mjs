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
      submitted_revision:null,
      submitted_at:null,
      decided_at:null,
      decision_message:'',
      rejection_reason:'',
      review_interval_months:reviewIntervalMonths,
      next_review_at:null,
      history:[]
    };
  }

  submit(workflow, {requester=workflow.requester, approver=workflow.approver, message='', artefacts=[], revision=null}={}) {
    assertStatus(workflow,[APPROVAL_STATUS.DRAFT,APPROVAL_STATUS.CHANGES_REQUESTED]);
    if (!approver || !identityKey(approver)) throw new Error('Approver is required before submission');
    workflow.status=APPROVAL_STATUS.IN_REVIEW;
    workflow.requester=requester;
    workflow.approver=approver;
    workflow.submitted_revision=revision==null?null:Number(revision);
    workflow.submitted_at=this.now().toISOString();
    // A resubmission is a fresh review decision. Do not carry stale decision state.
    workflow.decided_at=null;
    workflow.decision_message='';
    workflow.rejection_reason='';
    workflow.next_review_at=null;
    pushHistory(workflow,'submitted',{message,artefacts,revision:workflow.submitted_revision,at:workflow.submitted_at});
    this._audit(workflow,'platform.approval.submitted',{message,artefacts,revision:workflow.submitted_revision});
    return workflow;
  }

  approve(workflow,{actor=workflow.approver,message='',revision=null}={}) {
    assertStatus(workflow,[APPROVAL_STATUS.IN_REVIEW]);
    assertAuthorized(workflow,actor);
    assertRevision(workflow,revision);
    workflow.status=APPROVAL_STATUS.APPROVED;
    workflow.decided_at=this.now().toISOString();
    workflow.decision_message=message;
    workflow.rejection_reason='';
    if (workflow.review_interval_months) {
      workflow.next_review_at=addMonthsClamped(this.now(),workflow.review_interval_months).toISOString();
    }
    pushHistory(workflow,'approved',{actor,message,revision:workflow.submitted_revision,at:workflow.decided_at,nextReviewAt:workflow.next_review_at});
    this._audit(workflow,'platform.approval.approved',{actor,message,revision:workflow.submitted_revision,next_review_at:workflow.next_review_at});
    return workflow;
  }

  reject(workflow,{actor=workflow.approver,reason,revision=null}={}) {
    assertStatus(workflow,[APPROVAL_STATUS.IN_REVIEW]);
    assertAuthorized(workflow,actor);
    assertRevision(workflow,revision);
    if (!String(reason||'').trim()) throw new Error('Rejection reason is required');
    workflow.status=APPROVAL_STATUS.CHANGES_REQUESTED;
    workflow.decided_at=this.now().toISOString();
    workflow.decision_message='';
    workflow.rejection_reason=String(reason).trim();
    pushHistory(workflow,'changes_requested',{actor,reason:workflow.rejection_reason,revision:workflow.submitted_revision,at:workflow.decided_at});
    this._audit(workflow,'platform.approval.rejected',{actor,reason:workflow.rejection_reason,revision:workflow.submitted_revision});
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
    workflow.submitted_revision=null;
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
  if (!allowed.includes(workflow.status)) throw new Error(`Invalid approval transition from ${workflow.status}`);
}

function assertAuthorized(workflow,actor) {
  const expected=identityKey(workflow.approver);
  const actual=identityKey(actor);
  if (!expected || !actual || expected!==actual) throw new Error('Actor is not the configured approver');
}

function assertRevision(workflow,revision) {
  if (workflow.submitted_revision==null) return;
  if (revision==null) throw new Error('Approval decision requires the submitted entity revision');
  if (Number(revision)!==Number(workflow.submitted_revision)) throw new Error('Entity changed after submission; submit the new revision for review');
}

function identityKey(identity) {
  if (identity==null) return '';
  if (typeof identity==='string') return identity.trim().toLocaleLowerCase('en-US');
  const value=identity.id||identity.user_id||identity.email||identity.userPrincipalName||identity.upn||'';
  return String(value).trim().toLocaleLowerCase('en-US');
}

function pushHistory(workflow,type,data) {
  workflow.history ||= [];
  workflow.history.push({type,...data});
}

export function addMonthsClamped(date,months) {
  const source=new Date(date);
  if (Number.isNaN(source.getTime())) throw new Error('Invalid date');
  const amount=Number(months);
  if (!Number.isFinite(amount)) throw new Error('Invalid month interval');

  const day=source.getUTCDate();
  const targetMonthIndex=source.getUTCMonth()+amount;
  const targetYear=source.getUTCFullYear()+Math.floor(targetMonthIndex/12);
  const targetMonth=((targetMonthIndex%12)+12)%12;
  const lastDay=new Date(Date.UTC(targetYear,targetMonth+1,0)).getUTCDate();
  const result=new Date(source);
  result.setUTCFullYear(targetYear,targetMonth,Math.min(day,lastDay));
  return result;
}
