import {
  createProcessDescription, addActor, addNode, addEdge, addSourceEvidence,
  ensurePhaseDetail, NODE_TYPES, EDGE_TYPES, canonicalActor
} from '../canonical-model.mjs';

const UNKNOWN_ACTOR='Tarkista toimija';

// Deliberately broad for process/work language. The parser also has a conservative
// finite-verb fallback so an explicit actor is not silently inherited simply because
// one legitimate verb is missing from this list.
export const PROCESS_VERBS=Object.freeze([
  'saa','löytää','ottaa','antaa','ohjaa','osallistuu','laatii','valmistelee','lisää','lähettää',
  'julkaisee','uutisoi','mainostaa','noudattaa','tarkastaa','valitsee','siirtää','informoi','vie',
  'käy','pyytää','vastaanottaa','hyväksyy','hylkää','kirjaa','täyttää','toimittaa','ilmoittaa',
  'päättää','arvioi','tarkistaa','käsittelee','sopii','perustaa','seuraa','raportoi','huolehtii',
  'on','pitää','kertoo','esitäyttää','toimii','aloittaa','jatkaa','vastaa','nimeää','tallentaa',
  'päivittää','avaa','syöttää','rekisteröi','allekirjoittaa','hakee','tekee','suunnittelee',
  'suunnittelevat','tunnistaa','keskustelee','selvittää','toteuttaa','toteuttavat','kokoaa',
  'jättää','jättävät','pisteyttää','muodostaa','käynnistää','testaa','testaavat','määrittää',
  'järjestää','tiedottaa','sulkee','viimeistelee','viimeistelevät','varmistaa','johtaa',
  'koordinoi','valvoo','ratkaisee','luo','muokkaa','poistaa','merkitsee','ylläpitää','kehittää',
  'palauttaa','odottaa','liittää','käynnistyy','jatkuu','korjaa','käsittelevät','kirjaavat',
  'seuraavat','arvioivat','valmistelevat','täyttävät','siirtävät','hyväksyvät','hylkäävät'
]);

const KNOWN_ACTORS=[
  ['TKKI-yksikkö tai toimialan erityisasiantuntija',/^TKKI-yksikkö\s+tai\s+toimialan\s+erityisasiantuntija(?=\s|[.,;:!?)]|$)/iu],
  ['VAKEn VTR-yhteyshenkilö',/^VAKEn\s+VTR-yhteyshenkil(?:ö|öllä|ölle|ön|östä)(?=\s|[.,;:!?)]|$)/iu],
  ['VAKEn viranhaltija',/^VAKEn\s+viranhaltij(?:a|alla|alle|an|asta)(?=\s|[.,;:!?)]|$)/iu],
  ['VTR-toimikunta',/^VTR-toimikunta(?:lla|lle|n|ssa|sta)?(?=\s|[.,;:!?)]|$)/iu],
  ['VAKE-tutkija',/^VAKE-tutkija(?:lla|lle|n|ssa|sta|lta)?(?=\s|[.,;:!?)]|$)/iu],
  ['TKKI-yksikkö',/^TKKI-yksikkö(?:ön|ssä|stä|lle|ltä|n)?(?=\s|[.,;:!?)]|$)/iu],
  ['TKKI-yksikkö',/^TKKI(?=\s|[.,;:!?)]|$)/iu],
  ['VAKE',/^VAKE(?=\s|[.,;:!?)]|$)/u],
  ['HUS',/^HUS(?=\s|[.,;:!?)]|$)/u]
];

const SYSTEM_PATTERNS=[
  ['Hypergene',/(?:\bHypergene(?:en|ssa|sta|n)?\b|\bideasalk(?:ku|kuun|ussa|usta|un)\b|\bprojektisalk(?:ku|kuun|ussa|usta|un)\b)/iu],
  ['IMS',/\bIMS\b/u],
  ['Vakka',/\bVakka\b/iu],
  ['HUS sähköinen hakujärjestelmä',/HUS(?::n|in|n)?\s+sähköis(?:een|essä)\s+hakujärjestelm/iu],
  ['HUS e-lomake',/HUS(?::n|in|n)?\s+e-lomakke/iu],
  ['Hakuportaali',/\bhakuportaal/iu],
  ['Intra',/\bintra(?:sta|ssa|an|n)?\b/iu]
];

const DOCUMENT_PATTERNS=[
  ['Rahoitushakemus',/\brahoitushakem(?:us|uksen|usta|ukseen)\b/iu],
  ['Viranhaltijapäätös',/\bviranhaltijapäätö/iu],
  ['Hakuohje',/\bhakuohje/iu],
  ['Hanke-ehdotus',/\bhanke-ehdot/iu],
  ['VIPS-pohja',/\bvips(?:-pohja|iä|in|illä)?\b/iu],
  ['Tutkimuslupahakemus',/\btutkimuslupahakem/iu],
  ['Sopimus',/\bsopim(?:us|uksen|usta|ukseen)\b/iu],
  ['Projektisuunnitelma',/\bprojektisuunnitelm/iu],
  ['Pilotointiraportti',/\bpilotointiraport/iu]
];

const PASSIVE_PATTERNS=[
  /(?:^|\s)tulee\s+(?:ottaa|täyttää|lähettää|toimittaa|kirjata|kuvata|varmistaa|sopia|hakea|arvioida|laatia|tarkistaa)(?=\s|[.,;:!?)]|$)/iu,
  /(?:^|\s)on\s+(?:kuvattava|mainittava|ilmoitettava|tallennettava|toimitettava|täytettävä|kirjattava|haettava|sovittava|varmistettava|arvioitava|laadittava)(?=\s|[.,;:!?)]|$)/iu,
  /(?:^|\s)on\s+tärkeää\s+(?:mainita|kuvata|ilmoittaa|varmistaa)(?=\s|[.,;:!?)]|$)/iu,
  /(?:^|\s)voidaan\s+(?:käyttää|lähettää|toimittaa|hakea|tallentaa|toteuttaa|hyväksyä|järjestää)(?=\s|[.,;:!?)]|$)/iu,
  /(?:^|\s)(?:sovitaan|kysytään|haetaan|tallennetaan|toimitetaan|ilmoitetaan|kuvataan|lähetetään|täytetään|kirjataan|hyväksytään|tarkistetaan|valitaan|siirretään|mainitaan|määritellään|arvioidaan|laaditaan|palautetaan|keskeytetään|järjestetään|päätetään)(?=\s|[.,;:!?)]|$)/iu
];

const DIRECT_SYSTEM_VERBS=new Set(['vie','lisää','kirjaa','tallentaa','lähettää','täyttää','hyväksyy','avaa','siirtää','päivittää','syöttää','rekisteröi','hakee']);
const DOCUMENT_VERBS=new Set(['laatii','valmistelee','täyttää','allekirjoittaa','lähettää','toimittaa','hyväksyy','tarkastaa','tarkistaa','viimeistelee','viimeistelevät']);
const CONDITIONAL_START=/^(jos|kun|mikäli|tarvittaessa|jatkossa|huomaa|ei\s+tarvita|aiehakemuksista)\b/iu;
const CONTEXT_START=/^(ennen|hakemuksessa|sähköpostiviestissä|hakemusta|tämän jälkeen|sen jälkeen)\b/iu;
const VERB_SET=new Set(PROCESS_VERBS.map(v=>v.toLocaleLowerCase('fi-FI')));

export function normalizeInput(raw='') {
  let text=String(raw||'')
    .normalize('NFKC')
    .replace(/[\u2028\u2029\u0085]/g,'\n')
    .replace(/[‐‑‒–—−]/g,'-')
    .replace(/\r\n?/g,'\n')
    .replace(/[\u200B-\u200D\uFEFF]/g,'')
    .replace(/\u00a0/g,' ')
    .replace(/\\:/g,':')
    .replace(/\\_/g,'_')
    .replace(/\*\*/g,'')
    .replace(/[ \t]+$/gm,'')
    .trim();
  if (!text) return '';

  // Number markers can be visually separate but absent as newline boundaries.
  text=text.replace(/([^\n])\s+(?=(?:\d{1,2})\s*[.)]\s+)/g,'$1\n');
  text=text.replace(/([^\n])\s+(Reunaehdot)\s+(?=[-*•])/giu,'$1\n$2\n');

  // Recover the known high-value handoff where the second actor is referenced by a pronoun.
  text=text.replace(/VAKEn\s+VTR-yhteyshenkilölle\s+ja\s+hän\s+(informoi\b)/giu,
    'VAKEn VTR-yhteyshenkilölle\nVAKEn VTR-yhteyshenkilö $1');

  // When lists are flattened, known actors + a real process verb form strong boundaries.
  const actorAlt=[
    'TKKI-yksikkö\\s+tai\\s+toimialan\\s+erityisasiantuntija','VAKEn\\s+VTR-yhteyshenkil(?:ö|öllä|ölle|ön|östä)',
    'VAKEn\\s+viranhaltij(?:a|alla|alle|an|asta)','VTR-toimikunta(?:lla|lle|n|ssa|sta)?',
    'VAKE-tutkija(?:lla|lle|n|ssa|sta|lta)?','TKKI-yksikkö(?:ön|ssä|stä|lle|ltä|n)?','TKKI','VAKE','HUS'
  ].join('|');
  const verbAlt=PROCESS_VERBS.map(escapeRegExp).join('|');
  const boundary=new RegExp(`([^\\n])\\s+(?=(?:${actorAlt})\\s+(?:[^\\s]+\\s+){0,3}(?:${verbAlt})(?=\\s|[.,;:!?)]|$))`,'giu');
  for(let i=0;i<4;i++){
    const next=text.replace(boundary,(match,prefix,offset,full)=>{
      const before=(full.slice(Math.max(0,offset-28),offset)+prefix).toLocaleLowerCase('fi-FI');
      if(/\d{1,2}\s*[.)]\s*$/.test(before)||/(?:jonka|johon|jossa|josta|jolle|jolla|tarvittaessa)\s*$/u.test(before)) return match;
      return `${prefix}\n`;
    });
    if(next===text) break;
    text=next;
  }
  return text.trim();
}

export function splitProcessSections(raw='') {
  const text=normalizeInput(raw);
  if(!text) return [];
  const lines=text.split('\n');
  const nonempty=lines.map((line,index)=>({line:line.trim(),index})).filter(x=>x.line);
  if(!nonempty.length) return [];
  const starts=new Set([nonempty[0].index]);

  for(let i=1;i<nonempty.length-1;i++){
    const current=nonempty[i];
    const previous=nonempty[i-1];
    const next=nonempty[i+1];
    if(!isHeadingCandidate(current.line)) continue;
    if(!isNumbered(next.line) && !looksLikeAction(next.line)) continue;

    const blankBefore=current.index-previous.index>1;
    const blankAfter=next.index-current.index>1;
    const startsNumbered=isNumbered(next.line);
    const stronglyNamed=/\bprosessi\b|prosessi$/iu.test(current.line)||isShortUpperHeading(current.line);
    if(startsNumbered || (stronglyNamed && (blankBefore||blankAfter))) starts.add(current.index);
  }

  const ordered=[...starts].sort((a,b)=>a-b);
  return ordered.map((start,i)=>{
    const end=ordered[i+1]??lines.length;
    const body=lines.slice(start,end).join('\n').trim();
    return {id:`section-${i+1}`,title:lines[start].trim(),text:body};
  }).filter(s=>s.text);
}

export function parseProcessDocument(raw,options={}) {
  const sections=splitProcessSections(raw);
  if(!sections.length) return {sections:[],models:[],diagnostics:[diag('source.empty','warning','Lähdeteksti on tyhjä.')]};
  const models=sections.map(section=>parseProcessSection(section.text,{...options,title:section.title}).model);
  return {sections,models,diagnostics:models.flatMap(m=>m.warnings||[])};
}

export function parseProcessSection(raw,options={}) {
  const text=normalizeInput(raw);
  const lines=text.split('\n');
  const first=lines.find(x=>x.trim())?.trim()||options.title||'Prosessi';
  const title=options.title||first;
  const actions=[];
  const diagnostics=[];
  const constraints=[];
  let previousActor='';
  let lastAction=null;
  let expectedNumber=1;
  let sawNumbered=false;

  for(let lineIndex=0;lineIndex<lines.length;lineIndex++){
    const original=lines[lineIndex];
    const line=original.trim();
    if(!line) continue;
    if(lineIndex===0 && line===title && !looksLikeAction(line) && !isNumbered(line)) continue;
    if(/^Reunaehdot\b/iu.test(line)) continue;

    if(isBullet(line)){
      const value=line.replace(/^[-*•]\s+/u,'').trim();
      if(!actions.length) constraints.push(value);
      else attachGuidance(lastAction,value);
      continue;
    }

    const numbered=line.match(/^\s*(\d+)\s*[.)]\s*(.+)$/u);
    if(numbered){
      sawNumbered=true;
      const n=Number(numbered[1]);
      const content=numbered[2].trim();
      const actionCandidate=looksLikeAction(content,{allowUnknownFinite:true});
      const explicitDetail=CONDITIONAL_START.test(content);
      const previousSub=Number(lastAction?.substeps?.at(-1)?.number||0);
      const continuingSub=Boolean(lastAction?.substeps?.length)&&n===previousSub+1;

      if(lastAction && n<expectedNumber && (explicitDetail||continuingSub||!actionCandidate)){
        lastAction.substeps.push({number:numbered[1],text:content});
        attachGuidance(lastAction,content);
        if(explicitDetail) lastAction.warnings.push('Ehtolause/alakohta havaittu; tarkista tarvitaanko päätöshaara.');
        continue;
      }
      if(lastAction && n!==expectedNumber){
        diagnostics.push(diag('numbering.unreliable','warning',`Numerointi poikkeaa odotetusta kohdassa ${numbered[1]}; lähdetekstin esiintymisjärjestys säilytettiin.`,{line:lineIndex+1}));
      }
      expectedNumber=n+1;
      const item=extractAction(content,{previousActor,sourceNumber:numbered[1],line:lineIndex+1,defaultColor:options.defaultColor});
      if(item){
        actions.push(item); lastAction=item;
        if(item.actor!==UNKNOWN_ACTOR) previousActor=item.actor;
      } else {
        diagnostics.push(diag('numbered.not_action','info','Numeroitu kohta ei näyttänyt prosessivaiheelta ja säilytettiin lisätietona.',{line:lineIndex+1,text:content}));
        if(lastAction) attachGuidance(lastAction,content);
      }
      continue;
    }

    const cleanLine=line.replace(/^[-*•]\s+/u,'').trim();
    if(/^\(/u.test(cleanLine)){
      for(const sentence of splitSentences(cleanLine.replace(/^\(+|\)+$/gu,''))){
        const item=extractAction(sentence,{previousActor,line:lineIndex+1,defaultColor:options.defaultColor});
        if(item){actions.push(item);lastAction=item;if(item.actor!==UNKNOWN_ACTOR)previousActor=item.actor;}
        else if(lastAction)attachGuidance(lastAction,sentence);
      }
      continue;
    }

    let consumed=false;
    for(const sentence of splitSentences(cleanLine)){
      const item=extractAction(sentence,{previousActor,line:lineIndex+1,defaultColor:options.defaultColor});
      if(item){
        actions.push(item);lastAction=item;consumed=true;
        if(item.actor!==UNKNOWN_ACTOR)previousActor=item.actor;
      } else if(CONDITIONAL_START.test(sentence)&&lastAction){
        lastAction.substeps.push({number:'',text:sentence});
        attachGuidance(lastAction,sentence);
        lastAction.warnings.push('Ehto tai lisäohje havaittu; tarkista kuuluuko se kaavioon vai Vaiheiden kuvaukseen.');
        consumed=true;
      }
    }
    if(!consumed && cleanLine!==title && !isHeadingCandidate(cleanLine)) diagnostics.push(diag('source.ignored','info','Tekstiä ei tulkittu prosessivaiheeksi.',{line:lineIndex+1,text:cleanLine}));
  }

  // Last-resort sentence recovery for clipboard content that was effectively one line.
  if(actions.length<=1){
    const recovered=recoverWholeText(text,{defaultColor:options.defaultColor});
    if(recovered.length>actions.length){
      actions.splice(0,actions.length,...recovered);
      diagnostics.push(diag('ordering.source_recovery','warning','Lähdetekstin rakenne oli epäselvä. Vaiheiden järjestys muodostettiin niiden esiintymisjärjestyksen mukaan.'));
    }
  }

  const model=buildCanonical(title,text,actions,{constraints,diagnostics,sawNumbered});
  return {model,actions,diagnostics,parse_mode:sawNumbered?'numbered':actions.some(a=>a.passive)?'prose':'signal'};
}

export function looksLikeAction(text,options={}) {
  return Boolean(analyzeActorAction(text,{...options,dryRun:true})||looksLikePassive(text));
}

export function safeImperativeSuggestion(text='') {
  const value=String(text||'').trim();
  if(!value) return {text:'',status:'empty'};
  const first=value.match(/^([^\s]+)(?:\s+(.*))?$/u);
  const verb=(first?.[1]||'').toLocaleLowerCase('fi-FI');
  const rest=first?.[2]||'';
  const map=new Map([
    ['antaa','Anna'],['ottaa','Ota'],['ohjaa','Ohjaa'],['osallistuu','Osallistu'],['lisää','Lisää'],
    ['lähettää','Lähetä'],['julkaisee','Julkaise'],['uutisoi','Uutisoi'],['mainostaa','Mainosta'],['noudattaa','Noudata'],
    ['informoi','Informoi'],['vie','Vie'],['käy','Käy'],['pyytää','Pyydä'],['vastaanottaa','Vastaanota'],
    ['hyväksyy','Hyväksy'],['hylkää','Hylkää'],['kirjaa','Kirjaa'],['täyttää','Täytä'],['toimittaa','Toimita'],
    ['ilmoittaa','Ilmoita'],['päättää','Päätä'],['arvioi','Arvioi'],['käsittelee','Käsittele'],['sopii','Sovi'],
    ['seuraa','Seuraa'],['raportoi','Raportoi'],['huolehtii','Huolehdi'],['pitää','Pidä'],['kertoo','Kerro']
  ]);
  if(!map.has(verb)) return {text:value,status:'needs_review'};
  const firstObject=(rest.match(/^([^\s,.;:!?]+)/u)?.[1]||'').toLocaleLowerCase('fi-FI');
  // Genitive-looking direct objects often need case conversion in the imperative
  // (hakemuksen -> hakemus). Do not perform unsafe morphology deterministically.
  if(firstObject && /n$/u.test(firstObject) && !/(?:henkilön|organisaation|järjestelmän)$/u.test(firstObject)) return {text:value,status:'needs_review'};
  return {text:`${map.get(verb)}${rest?` ${rest}`:''}`,status:'suggested'};
}

function buildCanonical(title,sourceText,actions,{constraints,diagnostics,sawNumbered}){
  const model=createProcessDescription({title,sourceText});
  model.parse_metadata={mode:sawNumbered?'numbered':'signal',constraints:[...constraints]};
  const actorMap=new Map();
  const start=addNode(model,{type:NODE_TYPES.START,typeSource:'system'});
  let previous=start;

  constraints.forEach(text=>addSourceEvidence(model,{text,kind:'constraint'}));

  for(const action of dedupeActions(actions)){
    const actorName=canonicalActor(action.actor)||UNKNOWN_ACTOR;
    const actorKey=actorName.toLocaleLowerCase('fi-FI');
    let actor=actorMap.get(actorKey);
    if(!actor){actor=addActor(model,{name:actorName,sourceName:action.source_actor||actorName});actorMap.set(actorKey,actor);}
    const evidence=addSourceEvidence(model,{text:action.raw,kind:'process_action',metadata:{line:action.line,source_number:action.sourceNumber||null}});
    const task=safeImperativeSuggestion(action.text);
    const node=addNode(model,{
      type:action.type,
      text:action.text,
      actorId:actor.id,
      sourceRef:evidence.id,
      typeSource:'auto',
      metadata:{
        confidence:action.confidence,systems:action.systems,documents:action.documents,
        warnings:action.warnings,source_number:action.sourceNumber||null,
        critical_task_status:task.status
      }
    });
    const detail=ensurePhaseDetail(model,node);
    detail.responsibility=actorName===UNKNOWN_ACTOR?'':actorName;
    detail.critical_tasks=task.text?[task.text]:[];
    detail.guidance=[...action.guidance];
    if(action.systems.length) detail.guidance.push(`IT-järjestelmät: ${action.systems.join(', ')}`);
    if(action.documents.length) detail.guidance.push(`Asiakirjat: ${action.documents.join(', ')}`);
    detail.traceable_information=action.documents.length?[`Jäljitettävä asiakirja/tieto: ${action.documents.join(', ')}`]:[];
    detail.source_refs=[evidence.id];
    addEdge(model,{from:previous.id,to:node.id});
    previous=node;
    for(const warning of action.warnings) model.warnings.push(diag('parser.review','warning',warning,{entity_id:node.id}));
    if(task.status==='needs_review') model.warnings.push(diag('phase.imperative.review','info','Kriittisen tehtävän käskymuotoa ei muutettu automaattisesti, koska turvallinen suomenkielinen taivutus ei ollut varma.',{entity_id:node.id}));
  }

  const end=addNode(model,{type:NODE_TYPES.END,typeSource:'system'});
  addEdge(model,{from:previous.id,to:end.id});
  model.warnings.push(...diagnostics.filter(x=>x.severity!=='info'));
  return model;
}

function extractAction(text,{previousActor='',sourceNumber='',line=null,defaultColor='green'}={}){
  const raw=String(text||'').trim().replace(/^\d{1,2}\s*[.)]\s*/u,'');
  if(!raw||isHeadingCandidate(raw)) return null;
  const passive=looksLikePassive(raw);
  const analysis=passive?null:analyzeActorAction(raw,{previousActor,allowUnknownFinite:true});
  if(!analysis&&!passive) return null;

  const actor=analysis?.actor||UNKNOWN_ACTOR;
  const sourceActor=analysis?.source_actor||'';
  const systems=detectByPatterns(raw,SYSTEM_PATTERNS);
  const documents=detectByPatterns(raw,DOCUMENT_PATTERNS);
  const coreVerb=analysis?.verb||firstKnownVerb(raw);
  const type=detectType(raw,{systems,documents,verb:coreVerb});
  const stripped=analysis?.matched_actor?stripActor(raw,analysis.matched_actor):raw;
  const warnings=[];
  if(analysis?.warning) warnings.push(analysis.warning);
  if(passive) warnings.push('Toimijaa ei mainita lähdetekstissä; nimeä vastuurooli/uimarata ennen julkaisemista.');
  if(CONDITIONAL_START.test(raw)) warnings.push('Ehtolause havaittu; tarkista tarvitaanko kysymysmuotoinen päätös ja haarat.');
  if(/\b(?:tai|tarvittaessa)\b/iu.test(raw)) warnings.push('Vaihtoehtoinen kulku havaittu; tarkista haarautuminen.');
  const decorated=decorateNodeText(stripped,type,systems);
  return {
    actor,source_actor:sourceActor,type,text:decorated,raw,systems,documents,sourceNumber,line,
    confidence:analysis?.confidence??0,passive,guidance:[],substeps:[],warnings,color:defaultColor
  };
}

function analyzeActorAction(text,{previousActor='',allowUnknownFinite=false,dryRun=false}={}){
  const value=String(text||'').trim();
  if(!value||CONDITIONAL_START.test(value)||CONTEXT_START.test(value)) return null;

  for(const [actor,re] of KNOWN_ACTORS){
    const m=value.match(re);
    if(!m) continue;
    const rest=value.slice(m[0].length).trim();
    const verb=findVerbNearStart(rest,{allowUnknownFinite});
    if(verb) return {actor:canonicalActor(actor),source_actor:m[0],matched_actor:m[0],verb,confidence:1,warning:''};
  }

  const tokens=value.split(/\s+/u);
  const max=Math.min(7,tokens.length-1);
  for(let actorWords=1;actorWords<=max;actorWords++){
    const candidate=tokens.slice(0,actorWords).join(' ').replace(/[,:;]$/u,'');
    const verbToken=stripPunctuation(tokens[actorWords]).toLocaleLowerCase('fi-FI');
    if(!isPlausibleActor(candidate)) continue;
    if(VERB_SET.has(verbToken)||(allowUnknownFinite&&looksLikeFiniteVerb(verbToken))){
      return {
        actor:canonicalActor(candidate),source_actor:candidate,matched_actor:candidate,verb:verbToken,
        confidence:VERB_SET.has(verbToken)?0.82:0.65,
        warning:VERB_SET.has(verbToken)?`Uusi toimija tunnistettu tekstistä: “${candidate}”. Tarkista tarvittaessa.`:`Toimija tunnistettiin tuntemattoman mutta mahdollisen finiittiverbin yhteydestä: “${candidate} ${verbToken}”. Tarkista tulkinta.`
      };
    }
  }

  const first=stripPunctuation(tokens[0]||'').toLocaleLowerCase('fi-FI');
  if(previousActor && VERB_SET.has(first)){
    return {actor:canonicalActor(previousActor),source_actor:'',matched_actor:'',verb:first,confidence:0.35,warning:'Toimijaa ei mainita selvästi; käytettiin edellistä toimijaa. Tarkista vastuu.'};
  }
  return null;
}

function isPlausibleActor(candidate){
  const value=String(candidate||'').trim();
  if(value.length<2||value.length>90||/[;,]/u.test(value)) return false;
  if(CONTEXT_START.test(value)||CONDITIONAL_START.test(value)) return false;
  if(/^(aineistoa|tutkimus|haettu rahoitus|prosessi|reunaehdot|tämä|se|asia|teksti|hakemus)$/iu.test(value)) return false;
  if(/(?:ssa|ssä|sta|stä|lla|llä|lta|ltä|osalta|lähetettäessä|tulee)$/iu.test(value)) return false;
  // Unknown roles in process material are normally title-cased/acronyms at sentence start.
  return /^[A-ZÅÄÖ]/u.test(value)||/^[A-ZÅÄÖ0-9-]{2,}$/u.test(value);
}

function looksLikeFiniteVerb(token){
  const value=stripPunctuation(token).toLocaleLowerCase('fi-FI');
  if(value.length<3) return false;
  if(/^(?:on|voi|saa|luo)$/u.test(value)) return true;
  return /(?:vat|vät|ee|aa|ää|ii|oi|uu|yy)$/u.test(value);
}

function findVerbNearStart(text,{allowUnknownFinite=false}={}){
  const tokens=String(text||'').split(/\s+/u).filter(Boolean).slice(0,4);
  for(const token of tokens){
    const value=stripPunctuation(token).toLocaleLowerCase('fi-FI');
    if(VERB_SET.has(value)||(allowUnknownFinite&&looksLikeFiniteVerb(value))) return value;
  }
  return '';
}

function firstKnownVerb(text){
  for(const token of String(text||'').split(/\s+/u).slice(0,8)){
    const value=stripPunctuation(token).toLocaleLowerCase('fi-FI');
    if(VERB_SET.has(value)) return value;
  }
  return '';
}

function detectType(text,{systems=[],documents=[],verb=''}){
  const t=String(text||'').trim();
  if(/^(onko|voiko|pystyykö|saako|tuleeko|tarvitaanko|valitaanko|hyväksytäänkö|voidaanko|tehdäänkö|jatketaanko)(?=\s|[.,;:!?)]|$)/iu.test(t)||/\?\s*$/u.test(t)) return NODE_TYPES.DECISION;
  if(systems.length&&DIRECT_SYSTEM_VERBS.has(verb)) return NODE_TYPES.SYSTEM;
  if(documents.length&&DOCUMENT_VERBS.has(verb)) return NODE_TYPES.DOCUMENT;
  if(/^(asiakirja|lomake|päätös)\b/iu.test(t)&&t.split(/\s+/u).length<10) return NODE_TYPES.DOCUMENT;
  if(/^(tietojärjestelmä|järjestelmä)\b/iu.test(t)&&t.split(/\s+/u).length<10) return NODE_TYPES.SYSTEM;
  return NODE_TYPES.ACTIVITY;
}

function recoverWholeText(text,options={}){
  const candidates=[];
  for(const match of String(text).matchAll(/[^\n.!?;]+(?:[.!?;]+|$)/gu)){
    const value=(match[0]||'').trim().replace(/^\d{1,2}\s*[.)]\s*/u,'');
    const action=extractAction(value,{line:null,defaultColor:options.defaultColor});
    if(action)candidates.push(action);
  }
  return dedupeActions(candidates);
}

function dedupeActions(actions){
  const seen=new Set();
  return actions.filter(action=>{
    const key=`${canonicalActor(action.actor).toLocaleLowerCase('fi-FI')}|${String(action.text).toLocaleLowerCase('fi-FI').replace(/\s+/g,' ').replace(/[.,;:!?]+$/u,'').trim()}`;
    if(seen.has(key))return false;seen.add(key);return true;
  });
}

function attachGuidance(action,text){if(action&&text&&!action.guidance.includes(text))action.guidance.push(text);}
function looksLikePassive(text){const value=String(text||'').trim();return PASSIVE_PATTERNS.some(re=>re.test(value));}
function detectByPatterns(text,patterns){return [...new Set(patterns.filter(([,re])=>re.test(text)).map(([name])=>name))];}
function stripActor(text,matched){const rest=String(text).slice(String(matched).length).trim();return rest?rest[0].toLocaleUpperCase('fi-FI')+rest.slice(1):String(text).trim();}
function decorateNodeText(text,type,systems){let out=String(text||'').trim();if(type===NODE_TYPES.SYSTEM&&systems.length===1&&!out.toLocaleLowerCase('fi-FI').includes(systems[0].toLocaleLowerCase('fi-FI')))out=`${out.replace(/[.\s]+$/u,'')} (${systems[0]})`;return out;}
function splitSentences(text){return String(text||'').replace(/\s+/g,' ').trim().split(/(?<=[.!?])\s+(?=[A-ZÅÄÖ])/u).map(x=>x.trim()).filter(Boolean);}
function isNumbered(line){return /^\s*\d+\s*[.)]\s+/u.test(line);}
function isBullet(line){return /^\s*[-*•]\s+/u.test(line);}
function isShortUpperHeading(line){return line.length<=50&&/^[A-ZÅÄÖ0-9 /&-]+$/u.test(line);}
function isHeadingCandidate(line){const value=String(line||'').trim();if(!value||value.length>160||isNumbered(value)||isBullet(value)||looksLikePassive(value)||CONDITIONAL_START.test(value))return false;if(analyzeActorAction(value,{allowUnknownFinite:true,dryRun:true}))return false;if(/\b(?:yhdestä|useammasta)\s+organisaatiosta\b/iu.test(value))return false;return isShortUpperHeading(value)||/\bprosessi\b|prosessi$|prosessin\s+(?:kulku|hyväksyminen)|hakeminen|käyttöönotto|pilotointi/iu.test(value);}
function stripPunctuation(value){return String(value||'').replace(/^["'“”‘’([{]+|["'“”‘’\])}.,;:!?]+$/gu,'');}
function escapeRegExp(value){return String(value).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');}
function diag(code,severity,message,metadata={}){return {code,severity,message,...metadata};}
