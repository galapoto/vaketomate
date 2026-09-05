import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createProcessDescription, addActor, addNode, addEdge,
  NODE_TYPES, EDGE_TYPES, migrateLegacyStepModel
} from '../src/canonical-model.mjs';
import { validateAgainstVakeGuide, qualitySummary } from '../src/guide-policy.mjs';
import { createProsessikuvausPlatform } from '../src/platform-integration.mjs';

test('TKKI aliases migrate into one canonical actor',()=>{
  const legacy={title:'Testi',steps:[
    {id:'1',actor:'TKKI',type:'activity',text:'Antaa neuvontaa',phase:{responsibility:'TKKI',criticalTasks:'Anna neuvontaa'}},
    {id:'2',actor:'TKKI-yksikkö',type:'activity',text:'Tarkastaa hakemuksen',phase:{responsibility:'TKKI-yksikkö',criticalTasks:'Tarkasta hakemus'}}
  ]};
  const model=migrateLegacyStepModel(legacy);
  assert.equal(model.actors.filter(a=>a.name==='TKKI-yksikkö').length,1);
  assert.equal(model.nodes.filter(n=>n.type===NODE_TYPES.ACTIVITY).length,2);
});

test('guide validation requires decision branches and question form',()=>{
  const model=createProcessDescription({title:'Päätösprosessi'});
  const actor=addActor(model,{name:'Käsittelijä'});
  const start=addNode(model,{type:NODE_TYPES.START});
  const decision=addNode(model,{type:NODE_TYPES.DECISION,text:'Tarkistaa ehdot',actorId:actor.id});
  const end=addNode(model,{type:NODE_TYPES.END});
  addEdge(model,{from:start.id,to:decision.id});
  addEdge(model,{from:decision.id,to:end.id});
  const issues=validateAgainstVakeGuide(model);
  assert.ok(issues.some(i=>i.code==='decision.not_question'));
  assert.ok(issues.some(i=>i.code==='decision.no_branch'));
});

test('canonical graph supports two decision branches',()=>{
  const model=createProcessDescription({title:'Hyväksyntä'});
  const actor=addActor(model,{name:'Prosessin omistaja'});
  const start=addNode(model,{type:NODE_TYPES.START});
  const decision=addNode(model,{type:NODE_TYPES.DECISION,text:'Hyväksytäänkö prosessi?',actorId:actor.id});
  const approved=addNode(model,{type:NODE_TYPES.ACTIVITY,text:'Hyväksyy prosessin',actorId:actor.id});
  const rejected=addNode(model,{type:NODE_TYPES.ACTIVITY,text:'Hylkää prosessin',actorId:actor.id});
  const end=addNode(model,{type:NODE_TYPES.END});
  addEdge(model,{from:start.id,to:decision.id});
  addEdge(model,{from:decision.id,to:approved.id,type:EDGE_TYPES.CONDITIONAL,label:'Kyllä'});
  addEdge(model,{from:decision.id,to:rejected.id,type:EDGE_TYPES.CONDITIONAL,label:'Ei'});
  addEdge(model,{from:approved.id,to:end.id});
  addEdge(model,{from:rejected.id,to:end.id});
  const issues=validateAgainstVakeGuide(model);
  assert.equal(issues.some(i=>i.code==='decision.not_question'),false);
  assert.equal(issues.some(i=>i.code==='decision.no_branch'),false);
});

test('platform approval schedules 12 month review',()=>{
  const model=createProcessDescription({title:'Valmis prosessi'});
  const actor=addActor(model,{name:'Kuvaaja'});
  const start=addNode(model,{type:NODE_TYPES.START});
  const activity=addNode(model,{type:NODE_TYPES.ACTIVITY,text:'Kuvaa vaiheen',actorId:actor.id});
  const end=addNode(model,{type:NODE_TYPES.END});
  addEdge(model,{from:start.id,to:activity.id});
  addEdge(model,{from:activity.id,to:end.id});
  model.phase_details.find(p=>p.node_id===activity.id).responsibility='Kuvaaja';
  model.phase_details.find(p=>p.node_id===activity.id).critical_tasks=['Kuvaa vaihe'];
  const platform=createProsessikuvausPlatform();
  const quality=qualitySummary(model);
  assert.equal(quality.ready_for_owner_review,true);
  platform.submitForApproval(model,{requester:{id:'u1'},approver:{id:'owner'},message:'Valmis hyväksyttäväksi'});
  const result=platform.approve(model,{actor:{id:'owner'}});
  assert.equal(result.approval.status,'approved');
  assert.equal(result.review.interval_months,12);
  assert.ok(result.review.due_at);
  assert.ok(platform.audit.list({module:'prosessikuvaus'}).length>=2);
});
