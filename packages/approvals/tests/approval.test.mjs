import test from 'node:test';
import assert from 'node:assert/strict';
import { ApprovalService, addMonthsClamped } from '../src/approval-service.mjs';

test('approval requires rejection reason and supports approval',()=>{
  const service=new ApprovalService();
  const rejected=service.create({module:'demo',entityType:'item',entityId:'1',reviewIntervalMonths:12});
  service.submit(rejected,{approver:{id:'owner'}});
  assert.throws(()=>service.reject(rejected,{reason:''}),/reason/i);
  service.reject(rejected,{reason:'Korjaa vastuut'});
  assert.equal(rejected.status,'changes_requested');

  const approved=service.create({module:'demo',entityType:'item',entityId:'2',reviewIntervalMonths:12});
  service.submit(approved,{approver:{id:'owner'}});
  service.approve(approved);
  assert.equal(approved.status,'approved');
  assert.ok(approved.next_review_at);
});

test('submission requires a resolved approver',()=>{
  const service=new ApprovalService();
  const workflow=service.create({module:'demo',entityType:'item',entityId:'1'});
  assert.throws(()=>service.submit(workflow),/approver/i);
});

test('only configured approver can approve or request changes',()=>{
  const service=new ApprovalService();
  const workflow=service.create({module:'demo',entityType:'item',entityId:'1'});
  service.submit(workflow,{approver:{id:'owner'}});
  assert.throws(()=>service.approve(workflow,{actor:{id:'someone-else'}}),/configured approver/i);
  assert.throws(()=>service.reject(workflow,{actor:{id:'someone-else'},reason:'No'}),/configured approver/i);
  service.approve(workflow,{actor:{id:'OWNER'}});
  assert.equal(workflow.status,'approved');
});

test('revision-bound review refuses stale entity',()=>{
  const service=new ApprovalService();
  const workflow=service.create({module:'demo',entityType:'item',entityId:'1'});
  service.submit(workflow,{approver:{id:'owner'},revision:7});
  assert.throws(()=>service.approve(workflow,{actor:{id:'owner'},revision:8}),/changed after submission/i);
  assert.throws(()=>service.approve(workflow,{actor:{id:'owner'}}),/requires the submitted entity revision/i);
  service.approve(workflow,{actor:{id:'owner'},revision:7});
  assert.equal(workflow.status,'approved');
});

test('resubmission clears stale rejection state and binds new revision',()=>{
  const service=new ApprovalService();
  const workflow=service.create({module:'demo',entityType:'item',entityId:'1'});
  service.submit(workflow,{approver:{id:'owner'},revision:1});
  service.reject(workflow,{actor:{id:'owner'},reason:'Korjaa',revision:1});
  assert.equal(workflow.rejection_reason,'Korjaa');
  service.submit(workflow,{approver:{id:'owner'},revision:2,message:'Korjattu'});
  assert.equal(workflow.rejection_reason,'');
  assert.equal(workflow.decided_at,null);
  assert.equal(workflow.submitted_revision,2);
});

test('month arithmetic clamps end-of-month review dates',()=>{
  assert.equal(addMonthsClamped(new Date('2024-02-29T12:00:00.000Z'),12).toISOString(),'2025-02-28T12:00:00.000Z');
  assert.equal(addMonthsClamped(new Date('2025-01-31T12:00:00.000Z'),1).toISOString(),'2025-02-28T12:00:00.000Z');
});
