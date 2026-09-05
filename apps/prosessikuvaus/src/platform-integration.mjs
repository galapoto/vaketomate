import { AuditLog, InMemoryAuditStore } from '../../../packages/audit/src/audit-log.mjs';
import { ApprovalService } from '../../../packages/approvals/src/approval-service.mjs';
import { ArtefactRegistry } from '../../../packages/artefacts/src/artefact-registry.mjs';
import { ShareService, createSharePackage } from '../../../packages/sharing/src/share-service.mjs';
import { InMemoryMetricStore, createMetric } from '../../../packages/reporting/src/metrics.mjs';
import { scheduleReview } from '../../../packages/scheduler/src/review-scheduler.mjs';
import { VAKE_GUIDE, qualitySummary } from './guide-policy.mjs';

export function createProsessikuvausPlatform({shareAdapters={}}={}) {
  const audit=new AuditLog({store:new InMemoryAuditStore()});
  const artefacts=new ArtefactRegistry({audit});
  const metrics=new InMemoryMetricStore();
  const approvals=new ApprovalService({audit});
  const sharing=new ShareService({adapters:shareAdapters,audit});

  return {
    audit,
    artefacts,
    metrics,
    approvals,
    sharing,

    recordGenerated(model,{artefacts:createdArtefacts=[]}={}) {
      const quality=qualitySummary(model);
      audit.recordDomain({
        eventType:'prosessikuvaus.process.generated',
        module:'prosessikuvaus',
        entityType:'process_description',
        entityId:model.id,
        payload:{quality,title:model.title}
      });
      metrics.record(createMetric({module:'prosessikuvaus',name:'process.generated'}));
      metrics.record(createMetric({module:'prosessikuvaus',name:'validation.warnings',value:quality.counts.warning}));
      for (const artefact of createdArtefacts) artefacts.register({module:'prosessikuvaus',entityType:'process_description',entityId:model.id,...artefact});
      return quality;
    },

    createApproval(model,{requester=null,approver=null}={}) {
      const quality=qualitySummary(model);
      if (!quality.ready_for_owner_review) throw new Error('Process has blocking validation errors');
      const workflow=approvals.create({
        module:'prosessikuvaus',
        entityType:'process_description',
        entityId:model.id,
        requester,
        approver,
        reviewIntervalMonths:VAKE_GUIDE.review_interval_months
      });
      model.approval=workflow;
      return workflow;
    },

    submitForApproval(model,{requester=null,approver=null,message='',artefacts:approvalArtefacts=[]}={}) {
      if (!model.approval) this.createApproval(model,{requester,approver});
      approvals.submit(model.approval,{requester,approver,message,artefacts:approvalArtefacts});
      metrics.record(createMetric({module:'prosessikuvaus',name:'approvals.submitted'}));
      return model.approval;
    },

    approve(model,{actor=null,message=''}={}) {
      if (!model.approval) throw new Error('Approval workflow has not been created');
      approvals.approve(model.approval,{actor,message});
      model.review=scheduleReview({
        module:'prosessikuvaus',
        entityType:'process_description',
        entityId:model.id,
        approvedAt:model.approval.decided_at,
        intervalMonths:VAKE_GUIDE.review_interval_months,
        assignee:model.approval.requester,
        metadata:{title:model.title}
      });
      metrics.record(createMetric({module:'prosessikuvaus',name:'approvals.approved'}));
      return {approval:model.approval,review:model.review};
    },

    requestChanges(model,{actor=null,reason}={}) {
      if (!model.approval) throw new Error('Approval workflow has not been created');
      approvals.reject(model.approval,{actor,reason});
      metrics.record(createMetric({module:'prosessikuvaus',name:'approvals.changes_requested'}));
      return model.approval;
    },

    async share(model,{channel,subject=`Prosessikuvaus: ${model.title}`,message='',recipients=[],cc=[],attachments=[],links=[],classification='internal',context={}}={}) {
      const pkg=createSharePackage({
        module:'prosessikuvaus',entityType:'process_description',entityId:model.id,
        subject,message,recipients,cc,attachments,links,classification,
        metadata:{title:model.title}
      });
      const result=await sharing.send(channel,pkg,context);
      metrics.record(createMetric({module:'prosessikuvaus',name:'shares.sent',dimensions:{channel}}));
      return result;
    }
  };
}
