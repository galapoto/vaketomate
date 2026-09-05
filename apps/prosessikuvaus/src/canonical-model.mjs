import { createId } from '../../../packages/contracts/src/events.mjs';

export const PROCESS_LEVELS = Object.freeze({
  PROCESS_MAP:'process_map',
  OPERATING_MODEL:'operating_model',
  PROCESS_FLOW:'process_flow',
  WORK_FLOW:'work_flow'
});

export const PROCESS_STATES = Object.freeze({
  AS_IS:'as_is',
  LIGHTLY_DEVELOPED:'lightly_developed',
  TARGET_STATE:'target_state'
});

export const NODE_TYPES = Object.freeze({
  START:'start',
  END:'end',
  ACTIVITY:'activity',
  DECISION:'decision',
  SYSTEM:'system',
  DOCUMENT:'document',
  PROCESS_LINK:'process_link',
  SUPPORT_PROCESS:'support_process'
});

export const EDGE_TYPES = Object.freeze({
  SEQUENCE:'sequence',
  INTERACTION:'interaction',
  DATA_FLOW:'data_flow',
  CONDITIONAL:'conditional',
  RETURN:'return'
});

export function createProcessDescription({title='Prosessi',processLevel=PROCESS_LEVELS.PROCESS_FLOW,stateMode=PROCESS_STATES.AS_IS,sourceText=''}={}) {
  const now=new Date().toISOString();
  return {
    schema_version:1,
    id:createId('process'),
    title,
    process_level:processLevel,
    state_mode:stateMode,
    hierarchy_parent:null,
    source_text:sourceText,
    source_evidence:[],
    summary:createEmptySummary(),
    actors:[],
    nodes:[],
    edges:[],
    phase_details:[],
    validations:[],
    warnings:[],
    artefacts:[],
    approval:null,
    review:null,
    created_at:now,
    updated_at:now
  };
}

export function createEmptySummary() {
  return {
    class:'',
    purpose:'',
    owner:'',
    initial_state:'',
    final_state:'',
    customers_and_stakeholders:'',
    customer_needs_and_requirements:'',
    key_resources:'',
    goals:'',
    metrics:'',
    interfaces:'',
    governance_and_development:'',
    identified_improvements:''
  };
}

export function addActor(model,{name,sourceName=name,aliases=[]}={}) {
  if (!name) throw new Error('Actor name is required');
  const existing=model.actors.find(a=>a.name===name);
  if (existing) {
    const merged=new Set([...(existing.aliases||[]),...aliases,sourceName].filter(Boolean));
    existing.aliases=[...merged].filter(x=>x!==name);
    touch(model);
    return existing;
  }
  const actor={id:createId('actor'),name,source_name:sourceName,aliases:[...new Set(aliases)].filter(x=>x!==name)};
  model.actors.push(actor);
  touch(model);
  return actor;
}

export function addNode(model,{type=NODE_TYPES.ACTIVITY,text='',actorId=null,sourceRef=null,metadata={}}={}) {
  if (!Object.values(NODE_TYPES).includes(type)) throw new Error(`Unsupported node type: ${type}`);
  const node={
    id:createId('node'),
    type,
    text:String(text||''),
    actor_id:actorId,
    source_ref:sourceRef,
    metadata:{...metadata},
    x:null,
    y:null
  };
  model.nodes.push(node);
  if (![NODE_TYPES.START,NODE_TYPES.END].includes(type)) ensurePhaseDetail(model,node);
  touch(model);
  return node;
}

export function addEdge(model,{from,to,type=EDGE_TYPES.SEQUENCE,label='',condition=null,metadata={}}={}) {
  if (!from || !to) throw new Error('Edge requires from and to');
  if (!model.nodes.some(n=>n.id===from) || !model.nodes.some(n=>n.id===to)) throw new Error('Edge references unknown node');
  if (!Object.values(EDGE_TYPES).includes(type)) throw new Error(`Unsupported edge type: ${type}`);
  const edge={id:createId('edge'),from,to,type,label,condition,metadata:{...metadata}};
  model.edges.push(edge);
  touch(model);
  return edge;
}

export function ensurePhaseDetail(model,node) {
  let detail=model.phase_details.find(p=>p.node_id===node.id);
  if (!detail) {
    detail={
      node_id:node.id,
      responsibility:'',
      critical_tasks:[],
      guidance:[],
      traceable_information:[],
      source_refs:[]
    };
    model.phase_details.push(detail);
  }
  return detail;
}

export function nodeActor(model,node) {
  return model.actors.find(a=>a.id===node.actor_id) || null;
}

export function outgoing(model,nodeId) { return model.edges.filter(e=>e.from===nodeId); }
export function incoming(model,nodeId) { return model.edges.filter(e=>e.to===nodeId); }

export function removeNode(model,nodeId) {
  model.nodes=model.nodes.filter(n=>n.id!==nodeId);
  model.edges=model.edges.filter(e=>e.from!==nodeId&&e.to!==nodeId);
  model.phase_details=model.phase_details.filter(p=>p.node_id!==nodeId);
  touch(model);
  return model;
}

export function reorderLinearNodes(model,orderedNodeIds) {
  const rank=new Map(orderedNodeIds.map((id,index)=>[id,index]));
  model.nodes.sort((a,b)=>(rank.get(a.id)??Number.MAX_SAFE_INTEGER)-(rank.get(b.id)??Number.MAX_SAFE_INTEGER));
  touch(model);
  return model;
}

export function touch(model) { model.updated_at=new Date().toISOString(); return model; }

export function migrateLegacyStepModel(legacy={}) {
  const model=createProcessDescription({title:legacy.title||'Prosessi',sourceText:legacy.sourceText||legacy.source_text||''});
  Object.assign(model.summary,mapLegacySummary(legacy.summary||{}));
  const actorByName=new Map();
  const start=addNode(model,{type:NODE_TYPES.START,text:''});
  let previous=start;

  for (const step of legacy.steps||[]) {
    const actorName=canonicalActor(step.actor||'Tarkista toimija');
    let actor=actorByName.get(actorName);
    if (!actor) {
      actor=addActor(model,{name:actorName,sourceName:step.actor||actorName});
      actorByName.set(actorName,actor);
    }
    const type=legacyType(step.type);
    const node=addNode(model,{type,text:step.text||step.raw||'',actorId:actor.id,metadata:{legacy_id:step.id||null,systems:step.systems||[],documents:step.documents||[],warning:step.warning||'',confidence:step.confidence??null}});
    const phase=ensurePhaseDetail(model,node);
    phase.responsibility=step.phase?.responsibility||actorName;
    phase.critical_tasks=toLines(step.phase?.criticalTasks || step.phase?.critical_tasks || step.text || '');
    phase.guidance=toLines(step.phase?.guidance||'');
    phase.traceable_information=toLines(step.phase?.traceableInfo||step.phase?.traceable_information||'');
    addEdge(model,{from:previous.id,to:node.id});
    previous=node;
  }

  const end=addNode(model,{type:NODE_TYPES.END,text:''});
  addEdge(model,{from:previous.id,to:end.id});
  model.warnings=[...(legacy.warnings||[])];
  return model;
}

export function canonicalActor(name='') {
  const value=String(name).trim();
  if (/^TKKI$/i.test(value) || /^TKKI-yksikkö$/i.test(value)) return 'TKKI-yksikkö';
  return value || 'Tarkista toimija';
}

function legacyType(type) {
  if (type==='decision') return NODE_TYPES.DECISION;
  if (type==='system') return NODE_TYPES.SYSTEM;
  if (type==='document') return NODE_TYPES.DOCUMENT;
  return NODE_TYPES.ACTIVITY;
}

function toLines(value) {
  if (Array.isArray(value)) return value.map(String).map(x=>x.trim()).filter(Boolean);
  return String(value||'').split(/\n+/).map(x=>x.trim()).filter(Boolean);
}

function mapLegacySummary(s) {
  return {
    class:s.class||'',
    purpose:s.purpose||'',
    owner:s.owner||'',
    initial_state:s.initialState||s.initial_state||'',
    final_state:s.finalState||s.final_state||'',
    customers_and_stakeholders:s.customers||s.customers_and_stakeholders||'',
    customer_needs_and_requirements:s.needs||s.customer_needs_and_requirements||'',
    key_resources:s.resources||s.key_resources||'',
    goals:s.goals||'',
    metrics:s.metrics||'',
    interfaces:s.interfaces||'',
    governance_and_development:s.governance||s.governance_and_development||'',
    identified_improvements:s.improvements||s.identified_improvements||''
  };
}
