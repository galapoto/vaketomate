import {
  NODE_TYPES, EDGE_TYPES, PROCESS_LEVELS,
  incoming, outgoing, nodeActor, canonicalActor
} from './canonical-model.mjs';

export const VAKE_COLORS = Object.freeze({
  activity_green:'#C7E2AA',
  activity_blue:'#C8EAFA',
  activity_pink:'#F7BAD5',
  neutral_fill:'#E6E6E6',
  neutral_stroke:'#808080',
  white:'#FFFFFF',
  black:'#000000'
});

export const VAKE_GUIDE = Object.freeze({
  recommended_max_key_phases:20,
  review_interval_months:12,
  summary_fields:[
    'class','purpose','owner','initial_state','final_state','customers_and_stakeholders',
    'customer_needs_and_requirements','key_resources','goals','metrics','interfaces',
    'governance_and_development','identified_improvements'
  ],
  core_submission_summary_fields:['purpose','owner','initial_state','final_state'],
  phase_fields:['responsibility','critical_tasks','guidance','traceable_information']
});

export function validateAgainstVakeGuide(model) {
  const issues=[];
  const add=(code,severity,message,entityId=null,field=null,metadata={})=>issues.push({code,severity,message,entity_id:entityId,field,metadata});

  if (!model?.title?.trim()) add('process.title.missing','error','Prosessin nimi puuttuu.');
  validateIdentity(model,add);
  validateActorAliases(model,add);

  if (model.process_level===PROCESS_LEVELS.PROCESS_FLOW) {
    const starts=model.nodes.filter(n=>n.type===NODE_TYPES.START);
    const ends=model.nodes.filter(n=>n.type===NODE_TYPES.END);
    if (starts.length!==1) add('diagram.start.count','error',`Prosessin kulku -tasolla tulee olla yksi alkusymboli; löytyi ${starts.length}.`);
    if (ends.length!==1) add('diagram.end.count','error',`Prosessin kulku -tasolla tulee olla yksi loppusymboli; löytyi ${ends.length}.`);

    const keyNodes=model.nodes.filter(n=>![NODE_TYPES.START,NODE_TYPES.END].includes(n.type));
    if (keyNodes.length>VAKE_GUIDE.recommended_max_key_phases) {
      add('diagram.complexity.phases','warning',`Kaaviossa on ${keyNodes.length} keskeistä vaihetta. VAKE-ohje suosittelee enintään noin 20 vaihetta; harkitse aliprosessien käyttöä.`);
    }

    for (const node of keyNodes) {
      const actor=nodeActor(model,node);
      if (!node.actor_id || !actor || isUnresolvedActor(actor.name)) add('node.actor.missing','error','Vaiheen vastuutoimija/uimarata puuttuu tai on vielä vahvistamatta.',node.id,'actor');
      if (!node.text?.trim()) add('node.text.missing','error','Vaiheen teksti puuttuu.',node.id,'text');
      if (node.type===NODE_TYPES.DECISION) validateDecision(model,node,add);
      if (incoming(model,node.id).length===0) add('node.unreachable.local','error','Vaiheeseen ei johda virtausta.',node.id);
      if (outgoing(model,node.id).length===0) add('node.dead_end.local','error','Vaiheesta ei jatku virtausta.',node.id);
    }

    for (const edge of model.edges) {
      if (!model.nodes.some(n=>n.id===edge.from)||!model.nodes.some(n=>n.id===edge.to)) add('edge.orphan','error','Virtaus viittaa puuttuvaan vaiheeseen.',edge.id);
      if (edge.type===EDGE_TYPES.DATA_FLOW && !String(edge.label||'').trim()) {
        add('data_flow.label.missing','warning','Tietovuohon tulee merkitä, mikä tieto liikkuu järjestelmään tai järjestelmästä.',edge.id,'label');
      }
    }

    if (starts.length===1 && ends.length===1) validateGlobalReachability(model,starts[0],ends[0],add);
  }

  for (const field of VAKE_GUIDE.summary_fields) {
    if (!String(model.summary?.[field]||'').trim()) add(`summary.${field}.missing`,'info','Yhteenvetokenttä on vielä täyttämättä.',model.id,field);
  }

  const phaseIds=new Set();
  for (const detail of model.phase_details||[]) {
    if (phaseIds.has(detail.node_id)) add('phase.duplicate','error','Samalle vaiheelle on useampi vaihekuvaus.',detail.node_id);
    phaseIds.add(detail.node_id);
    if (!model.nodes.some(n=>n.id===detail.node_id)) add('phase.orphan','error','Vaihekuvaus viittaa puuttuvaan kaaviovaiheeseen.',detail.node_id);
    if (!String(detail.responsibility||'').trim() || isUnresolvedActor(detail.responsibility)) add('phase.responsibility.missing','warning','Vaiheen vastuu puuttuu tai on vielä vahvistamatta.',detail.node_id,'responsibility');
    if (!Array.isArray(detail.critical_tasks)||detail.critical_tasks.length===0) add('phase.critical_tasks.missing','info','Kriittisiä tehtäviä ei ole kuvattu.',detail.node_id,'critical_tasks');
  }

  model.validations=issues;
  return issues;
}

export function submissionReadiness(model) {
  const issues=validateAgainstVakeGuide(model);
  const blockers=issues.filter(i=>i.severity==='error');
  const missingCore=[];
  for (const field of VAKE_GUIDE.core_submission_summary_fields) {
    if (!String(model.summary?.[field]||'').trim()) {
      missingCore.push({code:`submission.summary.${field}.missing`,field,message:'Täytä tai vahvista tämä keskeinen yhteenvetotieto ennen omistajan hyväksyntää.'});
    }
  }

  for (const node of model.nodes.filter(n=>![NODE_TYPES.START,NODE_TYPES.END].includes(n.type))) {
    const detail=model.phase_details.find(p=>p.node_id===node.id);
    const actor=nodeActor(model,node);
    if (!actor || isUnresolvedActor(actor.name) || !detail || !String(detail.responsibility||'').trim() || isUnresolvedActor(detail.responsibility)) {
      missingCore.push({code:'submission.phase.responsibility.missing',entity_id:node.id,field:'responsibility',message:'Vahvista vaiheen vastuu ennen omistajan hyväksyntää.'});
    }
  }

  return {
    ready:blockers.length===0 && missingCore.length===0,
    blockers,
    missing_core:dedupeByKey(missingCore,x=>`${x.code}|${x.entity_id||''}|${x.field||''}`),
    review_items:issues.filter(i=>i.severity!=='error')
  };
}

export function qualitySummary(model) {
  const issues=validateAgainstVakeGuide(model);
  const counts={error:0,warning:0,info:0};
  issues.forEach(i=>counts[i.severity]=(counts[i.severity]||0)+1);
  const readiness=submissionReadiness(model);
  return {
    ready_for_owner_review:readiness.ready,
    counts,
    key_phase_count:model.nodes.filter(n=>![NODE_TYPES.START,NODE_TYPES.END].includes(n.type)).length,
    actor_count:model.actors.filter(a=>!isUnresolvedActor(a.name)).length,
    issue_count:issues.length,
    missing_core_count:readiness.missing_core.length
  };
}

export function guideFieldHelp(field) {
  const help={
    purpose:'Kuvaa prosessin olemassaolon tarkoitusta ja perustehtävää.',
    owner:'Rooli, joka vastaa prosessin toiminnasta, tuloksesta ja kehittämisestä.',
    initial_state:'Impulssi/heräte, joka käynnistää prosessin. Ei ole tekemistä.',
    final_state:'Prosessin lopputulos tai tuotos. Ei ole tekemistä.',
    customers_and_stakeholders:'Asiakas saa prosessista hyödyn/lisäarvon; sidosryhmät vaikuttavat prosessiin tai ovat siihen kytköksissä.',
    customer_needs_and_requirements:'Tärkeimmät vaatimukset toimintaa, tekemistä tai palvelua kohtaan.',
    key_resources:'Vain olennaiset resurssit kuten osaaminen, henkilöstö, talous, tilat tai laitteet.',
    goals:'Konkreettiset ja mitattavat tavoitteet.',
    metrics:'Prosessin keskeiset mittarit.',
    interfaces:'Kytkökset muihin prosesseihin.',
    governance_and_development:'Miten prosessia ohjataan, arvioidaan ja kehitetään.',
    identified_improvements:'Prosessissa tunnistetut kehittämiskohteet.',
    responsibility:'Rooli, joka vastaa vaiheen tekemisestä; tarvittaessa myös avustava tai informoitava rooli.',
    critical_tasks:'Vaiheessa ehdottomasti suoritettavat tehtävät, allekkain käskymuodossa.',
    guidance:'Ohjeet, asiakirjat, mallit ja tarvittavat IT-järjestelmät. Tässä ei kuvata tekemistä.',
    traceable_information:'Mitä jäljitettävää tietoa syntyy ja mihin se dokumentoidaan.'
  };
  return help[field]||'';
}

function validateIdentity(model,add) {
  for (const [kind,items] of [['node',model.nodes||[]],['edge',model.edges||[]],['actor',model.actors||[]]]) {
    const seen=new Set();
    for (const item of items) {
      if (!item?.id) add(`${kind}.id.missing`,'error',`${kind} ID puuttuu.`);
      else if (seen.has(item.id)) add(`${kind}.id.duplicate`,'error',`Sama ${kind} ID esiintyy useammin kuin kerran.`,item.id);
      else seen.add(item.id);
    }
  }
}

function validateActorAliases(model,add) {
  const canonical=new Map();
  for (const actor of model.actors||[]) {
    const key=canonicalActor(actor.name).toLocaleLowerCase('fi-FI');
    if (canonical.has(key)) {
      add('actor.canonical.duplicate','error',`Sama toimija on mallissa useampana uimaratana (${canonical.get(key)} / ${actor.name}).`,actor.id);
    } else canonical.set(key,actor.name);
  }
}

function validateDecision(model,node,add) {
  if (!isQuestion(node.text)) add('decision.not_question','warning','Valinta/päätös tulisi esittää kysymyksenä.',node.id,'text');
  const outs=outgoing(model,node.id);
  if (outs.length<2) {
    add('decision.no_branch','warning','Päätöksellä ei ole vähintään kahta jatkopolkua.',node.id);
    return;
  }
  const labels=outs.map(e=>String(e.label||e.condition||'').trim()).filter(Boolean);
  if (labels.length!==outs.length) add('decision.branch_label.missing','warning','Päätöksen jokainen jatkopolku tulee nimetä niin, että haarautuminen on yksiselitteinen.',node.id);
  const normalized=labels.map(x=>x.toLocaleLowerCase('fi-FI'));
  if (new Set(normalized).size!==normalized.length) add('decision.branch_label.duplicate','warning','Päätöksen jatkopoluilla on sama nimi; tarkista haarojen merkitys.',node.id);
  if (outs.length===2 && labels.length===2) {
    const yesNo=new Set(normalized.map(x=>x.replace(/[.!]/g,'').trim()));
    if (!(yesNo.has('kyllä')&&yesNo.has('ei'))) add('decision.binary_labels.nonstandard','info','Kaksipolkuisessa päätöksessä tarkista, sopivatko Kyllä/Ei-haarat tähän päätökseen.',node.id);
  }
}

function validateGlobalReachability(model,start,end,add) {
  const fromStart=walk(model,start.id,'forward');
  const toEnd=walk(model,end.id,'reverse');
  for (const node of model.nodes) {
    if (node.id===start.id || node.id===end.id) continue;
    if (!fromStart.has(node.id)) add('node.unreachable.from_start','error','Vaihe ei ole saavutettavissa prosessin alusta.',node.id);
    if (!toEnd.has(node.id)) add('node.cannot_reach_end','error','Vaiheesta ei ole polkua prosessin loppuun.',node.id);
  }
  if (!fromStart.has(end.id)) add('diagram.end.unreachable','error','Prosessin loppuun ei ole yhtenäistä polkua alusta.');
}

function walk(model,seed,direction) {
  const seen=new Set([seed]);
  const stack=[seed];
  while(stack.length) {
    const id=stack.pop();
    const edges=direction==='forward' ? model.edges.filter(e=>e.from===id) : model.edges.filter(e=>e.to===id);
    for (const edge of edges) {
      const next=direction==='forward'?edge.to:edge.from;
      if (!seen.has(next)) { seen.add(next); stack.push(next); }
    }
  }
  return seen;
}

function isQuestion(text='') {
  const value=String(text).trim();
  return value.endsWith('?') || /^(onko|voidaanko|tehdäänkö|hyväksytäänkö|myönnetäänkö|tarvitaanko|jatketaanko|täyttyykö|sopiiko)\b/iu.test(value);
}

function isUnresolvedActor(value='') {
  return canonicalActor(String(value||'')).toLocaleLowerCase('fi-FI')==='tarkista toimija';
}

function dedupeByKey(items,keyFn) {
  const seen=new Set();
  return items.filter(item=>{const key=keyFn(item);if(seen.has(key))return false;seen.add(key);return true;});
}
