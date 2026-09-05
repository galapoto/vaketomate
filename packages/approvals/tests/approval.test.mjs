import test from 'node:test';
import assert from 'node:assert/strict';
import { ApprovalService } from '../src/approval-service.mjs';

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
