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
    revision:0,
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
  const canonical=canonicalActor(name);
  if (!canonical) throw new Error('Actor name is required');
  const existing=model.actors.find(a=>canonicalActor(a.name).toLocaleLowerCase('fi-FI')===canonical.toLocaleLowerCase('fi-FI'));
  if (existing) {
    existing.name=canonical;
    const merged=new Set([...(existing.aliases||[]),...aliases,sourceName,name].map(normalizeActorText).filter(Boolean));
    existing.aliases=[...merged].filter(x=>x.toLocaleLowerCase('fi-FI')!==canonical.toLocaleLowerCase('fi-FI'));
    touch(model);
    return existing;
  }
  const actor={
    id:createId('actor'),
    name:canonical,
    source_name:normalizeActorText(sourceName)||canonical,
    aliases:[...new Set([...aliases,name,sourceName].map(normalizeActorText).filter(Boolean))]
      .filter(x=>x.toLocaleLowerCase('fi-FI')!==canonical.toLocaleLowerCase('fi-FI'))
  };
  model.actors.push(actor);
  touch(model);
  return actor;
}

export function addNode(model,{type=NODE_TYPES.ACTIVITY,text='',actorId=null,sourceRef=null,metadata={},typeSource='auto'}={}) {
  if (!Object.values(NODE_TYPES).includes(type)) throw new Error(`Unsupported node type: ${type}`);
  if (actorId && !model.actors.some(a=>a.id===actorId)) throw new Error('Node references unknown actor');
  const node={
    id:createId('node'),
    type,
    text:String(text||''),
    actor_id:actorId,
    source_ref:sourceRef,
    metadata:{type_source:typeSource,...metadata},
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
  if (from===to && type!==EDGE_TYPES.RETURN) throw new Error('Self edge requires return type');
  if (!model.nodes.some(n=>n.id===from) || !model.nodes.some(n=>n.id===to)) throw new Error('Edge references unknown node');
  if (!Object.values(EDGE_TYPES).includes(type)) throw new Error(`Unsupported edge type: ${type}`);
  const edge={id:createId('edge'),from,to,type,label:String(label||''),condition,metadata:{...metadata}};
  model.edges.push(edge);
  touch(model);
  return edge;
}

export function addSourceEvidence(model,{text='',start=null,end=null,kind='source',metadata={}}={}) {
  const evidence={id:createId('evidence'),kind,text:String(text||''),start,end,metadata:{...metadata}};
  model.source_evidence.push(evidence);
  touch(model);
  return evidence;
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

export function setNodeActor(model,nodeId,actorId,{syncResponsibility=true}={}) {
  const node=requireNode(model,nodeId);
  const previous=nodeActor(model,node)?.name||'';
  if (actorId && !model.actors.some(a=>a.id===actorId)) throw new Error('Unknown actor');
  node.actor_id=actorId;
  if (syncResponsibility) {
    const detail=ensurePhaseDetail(model,node);
    const current=String(detail.responsibility||'').trim();
    if (!current || current===previous) detail.responsibility=nodeActor(model,node)?.name||'';
  }
  touch(model);
  return node;
}

export function setNodeType(model,nodeId,type,{source='manual'}={}) {
  if (!Object.values(NODE_TYPES).includes(type)) throw new Error(`Unsupported node type: ${type}`);
  const node=requireNode(model,nodeId);
  node.type=type;
  node.metadata ||= {};
  node.metadata.type_source=source;
  touch(model);
  return node;
}

export function removeNode(model,nodeId) {
  model.nodes=model.nodes.filter(n=>n.id!==nodeId);
  model.edges=model.edges.filter(e=>e.from!==nodeId&&e.to!==nodeId);
  model.phase_details=model.phase_details.filter(p=>p.node_id!==nodeId);
  touch(model);
  return model;
}

/**
 * Reorder a genuinely linear process and rewire sequence edges so visual order and
 * process semantics cannot diverge. Branch/interaction/data-flow graphs are refused.
 * orderedNodeIds contains all non-start/end node ids exactly once.
 */
export function reorderLinearFlow(model,orderedNodeIds) {
  const starts=model.nodes.filter(n=>n.type===NODE_TYPES.START);
  const ends=model.nodes.filter(n=>n.type===NODE_TYPES.END);
  if (starts.length!==1 || ends.length!==1) throw new Error('Linear reorder requires exactly one start and one end');
  if (model.edges.some(e=>e.type!==EDGE_TYPES.SEQUENCE)) throw new Error('Cannot linearly reorder a branched/non-sequence graph');

  const keyNodes=model.nodes.filter(n=>![NODE_TYPES.START,NODE_TYPES.END].includes(n.type));
  const expected=new Set(keyNodes.map(n=>n.id));
  if (!Array.isArray(orderedNodeIds) || orderedNodeIds.length!==expected.size || new Set(orderedNodeIds).size!==expected.size || orderedNodeIds.some(id=>!expected.has(id))) {
    throw new Error('orderedNodeIds must contain every non-terminal node exactly once');
  }

  // Refuse a graph that is not already linear; otherwise a reorder could erase
  // meaningful topology just because every edge happened to be a sequence edge.
  for (const node of model.nodes) {
    if (incoming(model,node.id).length>1 || outgoing(model,node.id).length>1) throw new Error('Cannot linearly reorder a branched graph');
  }

  const byId=new Map(model.nodes.map(n=>[n.id,n]));
  model.nodes=[starts[0],...orderedNodeIds.map(id=>byId.get(id)),ends[0]];
  model.edges=[];
  const chain=model.nodes.map(n=>n.id);
  for(let i=0;i<chain.length-1;i++) {
    model.edges.push({id:createId('edge'),from:chain[i],to:chain[i+1],type:EDGE_TYPES.SEQUENCE,label:'',condition:null,metadata:{reordered:true}});
  }
  touch(model);
  return model;
}

/** @deprecated Use reorderLinearFlow so graph semantics are updated too. */
export function reorderLinearNodes(model,orderedNodeIds) {
  return reorderLinearFlow(model,orderedNodeIds);
}

export function touch(model,{bumpRevision=true}={}) {
  if (bumpRevision) model.revision=Math.max(0,Number(model.revision||0))+1;
  model.updated_at=new Date().toISOString();
  return model;
}

export function migrateLegacyStepModel(legacy={}) {
  const model=createProcessDescription({title:legacy.title||'Prosessi',sourceText:legacy.sourceText||legacy.source_text||''});
  Object.assign(model.summary,mapLegacySummary(legacy.summary||{}));
  const actorByName=new Map();
  const start=addNode(model,{type:NODE_TYPES.START,text:'',typeSource:'system'});
  let previous=start;

  for (const step of legacy.steps||[]) {
    const actorName=canonicalActor(step.actor||'Tarkista toimija');
    let actor=actorByName.get(actorName.toLocaleLowerCase('fi-FI'));
    if (!actor) {
      actor=addActor(model,{name:actorName,sourceName:step.actor||actorName});
      actorByName.set(actorName.toLocaleLowerCase('fi-FI'),actor);
    }
    const type=legacyType(step.type);
    const node=addNode(model,{
      type,
      text:step.text||step.raw||'',
      actorId:actor.id,
      typeSource:step.typeSource||step.type_source||'auto',
      metadata:{
        legacy_id:step.id||null,
        systems:step.systems||[],
        documents:step.documents||[],
        warning:step.warning||'',
        confidence:step.confidence??null
      }
    });
    const phase=ensurePhaseDetail(model,node);
    phase.responsibility=canonicalResponsibility(step.phase?.responsibility||actorName);
    phase.critical_tasks=toLines(step.phase?.criticalTasks || step.phase?.critical_tasks || step.text || '');
    phase.guidance=toLines(step.phase?.guidance||'');
    phase.traceable_information=toLines(step.phase?.traceableInfo||step.phase?.traceable_information||'');
    addEdge(model,{from:previous.id,to:node.id});
    previous=node;
  }

  const end=addNode(model,{type:NODE_TYPES.END,text:'',typeSource:'system'});
  addEdge(model,{from:previous.id,to:end.id});
  model.warnings=[...(legacy.warnings||[])];
  return model;
}

export function canonicalActor(name='') {
  const value=normalizeActorText(name);
  if (!value) return '';
  if (/^TKKI$/iu.test(value) || /^TKKI-yksikkö$/iu.test(value)) return 'TKKI-yksikkö';
  return value;
}

function canonicalResponsibility(value='') {
  const text=normalizeActorText(value);
  if (/^TKKI$/iu.test(text)||/^TKKI-yksikkö$/iu.test(text)) return 'TKKI-yksikkö';
  return text;
}

function normalizeActorText(value='') {
  return String(value||'')
    .normalize('NFKC')
    .replace(/[‐‑‒–—−]/g,'-')
    .replace(/\s+/g,' ')
    .trim();
}

function legacyType(type) {
  if (type==='decision') return NODE_TYPES.DECISION;
  if (type==='system') return NODE_TYPES.SYSTEM;
  if (type==='document') return NODE_TYPES.DOCUMENT;
  if (type==='process_link') return NODE_TYPES.PROCESS_LINK;
  if (type==='support_process') return NODE_TYPES.SUPPORT_PROCESS;
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

function requireNode(model,nodeId) {
  const node=model.nodes.find(n=>n.id===nodeId);
  if (!node) throw new Error(`Unknown node: ${nodeId}`);
  return node;
}
