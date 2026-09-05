import { NODE_TYPES, PROCESS_LEVELS, incoming, outgoing, nodeActor } from './canonical-model.mjs';

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
  phase_fields:['responsibility','critical_tasks','guidance','traceable_information']
});

export function validateAgainstVakeGuide(model) {
  const issues=[];
  const add=(code,severity,message,entityId=null,field=null)=>issues.push({code,severity,message,entity_id:entityId,field});

  if (!model.title?.trim()) add('process.title.missing','error','Prosessin nimi puuttuu.');

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
      if (!node.actor_id || !nodeActor(model,node)) add('node.actor.missing','error','Vaiheen vastuutoimija/uimarata puuttuu.',node.id,'actor');
      if (!node.text?.trim()) add('node.text.missing','error','Vaiheen teksti puuttuu.',node.id,'text');
      if (node.type===NODE_TYPES.DECISION && !isQuestion(node.text)) {
        add('decision.not_question','warning','Valinta/päätös tulisi esittää kysymyksenä.',node.id,'text');
      }
      if (node.type===NODE_TYPES.DECISION && outgoing(model,node.id).length<2) {
        add('decision.no_branch','warning','Päätöksellä ei ole vähintään kahta jatkopolkua.',node.id);
      }
      if (incoming(model,node.id).length===0) add('node.unreachable','error','Vaiheeseen ei johda virtausta.',node.id);
      if (outgoing(model,node.id).length===0) add('node.dead_end','error','Vaiheesta ei jatku virtausta.',node.id);
    }

    for (const edge of model.edges) {
      if (!model.nodes.some(n=>n.id===edge.from)||!model.nodes.some(n=>n.id===edge.to)) add('edge.orphan','error','Virtaus viittaa puuttuvaan vaiheeseen.',edge.id);
    }
  }

  for (const field of VAKE_GUIDE.summary_fields) {
    if (!String(model.summary?.[field]||'').trim()) add(`summary.${field}.missing`,'info','Yhteenvetokenttä on vielä täyttämättä.',model.id,field);
  }

  for (const detail of model.phase_details||[]) {
    if (!model.nodes.some(n=>n.id===detail.node_id)) add('phase.orphan','error','Vaihekuvaus viittaa puuttuvaan kaaviovaiheeseen.',detail.node_id);
    if (!String(detail.responsibility||'').trim()) add('phase.responsibility.missing','warning','Vaiheen vastuu puuttuu.',detail.node_id,'responsibility');
    if (!Array.isArray(detail.critical_tasks)||detail.critical_tasks.length===0) add('phase.critical_tasks.missing','info','Kriittisiä tehtäviä ei ole kuvattu.',detail.node_id,'critical_tasks');
  }

  model.validations=issues;
  return issues;
}

export function qualitySummary(model) {
  const issues=validateAgainstVakeGuide(model);
  const counts={error:0,warning:0,info:0};
  issues.forEach(i=>counts[i.severity]=(counts[i.severity]||0)+1);
  return {
    ready_for_owner_review:counts.error===0,
    counts,
    key_phase_count:model.nodes.filter(n=>![NODE_TYPES.START,NODE_TYPES.END].includes(n.type)).length,
    actor_count:model.actors.length,
    issue_count:issues.length
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

function isQuestion(text='') {
  const value=String(text).trim();
  return value.endsWith('?') || /^(onko|voidaanko|tehdäänkö|hyväksytäänkö|myönnetäänkö|tarvitaanko|jatketaanko|täyttyykö|sopiiko)\b/i.test(value);
}
