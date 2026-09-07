import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createProcessDescription,addActor,addNode,addEdge,setNodeActor,setNodeType,
  reorderLinearFlow,NODE_TYPES,EDGE_TYPES
} from '../src/canonical-model.mjs';
import { validateAgainstVakeGuide, submissionReadiness } from '../src/guide-policy.mjs';

function basicModel(){
  const model=createProcessDescription({title:'Testiprosessi'});
  const actor=addActor(model,{name:'Käsittelijä'});
  const start=addNode(model,{type:NODE_TYPES.START});
  const one=addNode(model,{type:NODE_TYPES.ACTIVITY,text:'Käsittelee asian',actorId:actor.id});
  const two=addNode(model,{type:NODE_TYPES.ACTIVITY,text:'Kirjaa päätöksen',actorId:actor.id});
  const end=addNode(model,{type:NODE_TYPES.END});
  addEdge(model,{from:start.id,to:one.id});
  addEdge(model,{from:one.id,to:two.id});
  addEdge(model,{from:two.id,to:end.id});
  for(const n of [one,two]){
    const p=model.phase_details.find(x=>x.node_id===n.id);
    p.responsibility='Käsittelijä'; p.critical_tasks=['Tee tehtävä'];
  }
  return {model,actor,start,one,two,end};
}

test('addActor enforces TKKI canonical identity at the model boundary',()=>{
  const model=createProcessDescription();
  const a=addActor(model,{name:'TKKI'});
  const b=addActor(model,{name:'TKKI‑yksikkö'});
  assert.equal(a.id,b.id);
  assert.equal(model.actors.length,1);
  assert.equal(model.actors[0].name,'TKKI-yksikkö');
});

test('manual node type is explicit model state and does not need inference',()=>{
  const {model,one}=basicModel();
  setNodeType(model,one.id,NODE_TYPES.ACTIVITY,{source:'manual'});
  assert.equal(one.type,NODE_TYPES.ACTIVITY);
  assert.equal(one.metadata.type_source,'manual');
});

test('changing lane actor preserves richer manual phase responsibility',()=>{
  const {model,one}=basicModel();
  const other=addActor(model,{name:'Esihenkilö'});
  const detail=model.phase_details.find(x=>x.node_id===one.id);
  detail.responsibility='Käsittelijä; esihenkilöä informoidaan';
  setNodeActor(model,one.id,other.id);
  assert.equal(detail.responsibility,'Käsittelijä; esihenkilöä informoidaan');
});

test('linear reorder rewires graph semantics, not only array order',()=>{
  const {model,start,one,two,end}=basicModel();
  reorderLinearFlow(model,[two.id,one.id]);
  const pairs=model.edges.map(e=>[e.from,e.to]);
  assert.deepEqual(pairs,[[start.id,two.id],[two.id,one.id],[one.id,end.id]]);
});

test('linear reorder refuses branched graph',()=>{
  const {model,actor,one,end}=basicModel();
  const branch=addNode(model,{type:NODE_TYPES.ACTIVITY,text:'Tekee vaihtoehdon',actorId:actor.id});
  model.phase_details.find(x=>x.node_id===branch.id).responsibility='Käsittelijä';
  addEdge(model,{from:one.id,to:branch.id});
  addEdge(model,{from:branch.id,to:end.id});
  assert.throws(()=>reorderLinearFlow(model,[one.id,branch.id]),/branched/i);
});

test('global reachability detects disconnected cycle',()=>{
  const {model,actor}=basicModel();
  const a=addNode(model,{type:NODE_TYPES.ACTIVITY,text:'Irrallinen A',actorId:actor.id});
  const b=addNode(model,{type:NODE_TYPES.ACTIVITY,text:'Irrallinen B',actorId:actor.id});
  for(const n of [a,b]) model.phase_details.find(x=>x.node_id===n.id).responsibility='Käsittelijä';
  addEdge(model,{from:a.id,to:b.id});
  addEdge(model,{from:b.id,to:a.id});
  const issues=validateAgainstVakeGuide(model);
  assert.ok(issues.some(i=>i.code==='node.unreachable.from_start'&&i.entity_id===a.id));
  assert.ok(issues.some(i=>i.code==='node.cannot_reach_end'&&i.entity_id===b.id));
});

test('decision branch labels and data-flow information are validated',()=>{
  const model=createProcessDescription({title:'Haarautuva prosessi'});
  const actor=addActor(model,{name:'Käsittelijä'});
  const start=addNode(model,{type:NODE_TYPES.START});
  const d=addNode(model,{type:NODE_TYPES.DECISION,text:'Hyväksytäänkö hakemus?',actorId:actor.id});
  const yes=addNode(model,{type:NODE_TYPES.ACTIVITY,text:'Hyväksyy hakemuksen',actorId:actor.id});
  const no=addNode(model,{type:NODE_TYPES.ACTIVITY,text:'Hylkää hakemuksen',actorId:actor.id});
  const end=addNode(model,{type:NODE_TYPES.END});
  for(const n of [d,yes,no]) model.phase_details.find(x=>x.node_id===n.id).responsibility='Käsittelijä';
  addEdge(model,{from:start.id,to:d.id});
  addEdge(model,{from:d.id,to:yes.id,type:EDGE_TYPES.CONDITIONAL,label:'Kyllä'});
  addEdge(model,{from:d.id,to:no.id,type:EDGE_TYPES.CONDITIONAL,label:''});
  addEdge(model,{from:yes.id,to:end.id});
  addEdge(model,{from:no.id,to:end.id});
  addEdge(model,{from:yes.id,to:no.id,type:EDGE_TYPES.DATA_FLOW,label:''});
  const issues=validateAgainstVakeGuide(model);
  assert.ok(issues.some(i=>i.code==='decision.branch_label.missing'));
  assert.ok(issues.some(i=>i.code==='data_flow.label.missing'));
});

test('submission gate blocks missing core summary without turning optional fields into errors',()=>{
  const {model}=basicModel();
  const readiness=submissionReadiness(model);
  assert.equal(readiness.ready,false);
  assert.ok(readiness.missing_core.some(x=>x.field==='owner'));
  assert.equal(readiness.blockers.length,0);
  Object.assign(model.summary,{purpose:'Kuvaa asian käsittelyn',owner:'Prosessin omistaja',initial_state:'Asia saapuu',final_state:'Asia on käsitelty'});
  assert.equal(submissionReadiness(model).ready,true);
});
