import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseProcessSection,parseProcessDocument,splitProcessSections,normalizeInput,
  safeImperativeSuggestion
} from '../src/parser/deterministic-parser.mjs';
import { NODE_TYPES } from '../src/canonical-model.mjs';

const processNodes=model=>model.nodes.filter(n=>![NODE_TYPES.START,NODE_TYPES.END].includes(n.type));
const actorName=(model,node)=>model.actors.find(a=>a.id===node.actor_id)?.name;

test('unknown but common process verbs do not inherit previous actor',()=>{
  const source=`Hankintaprosessi\n1. Esihenkilö arvioi tarpeen\n2. Hankinta-asiantuntija tekee hankintatapa-arvion\n3. IT-arkkitehti suunnittelee integraation\n4. Palvelua tarvitseva asiantuntija tunnistaa kehittämistarpeen`;
  const {model}=parseProcessSection(source);
  const nodes=processNodes(model);
  assert.equal(nodes.length,4);
  assert.deepEqual(nodes.map(n=>actorName(model,n)),['Esihenkilö','Hankinta-asiantuntija','IT-arkkitehti','Palvelua tarvitseva asiantuntija']);
});

test('ordinary mixed-case unnumbered process headings split into separate sections',()=>{
  const source=`Ensimmäinen prosessi\n\nVAKE-tutkija saa tutkimusidean\n\nToinen prosessi\n\nTKKI-yksikkö antaa neuvontaa`;
  const sections=splitProcessSections(source);
  assert.equal(sections.length,2);
  assert.equal(sections[0].title,'Ensimmäinen prosessi');
  assert.equal(sections[1].title,'Toinen prosessi');
});

test('research-permit passive prose retains actions instead of stopping at headings',()=>{
  const source=`Tutkimusluvan hakeminen\nEnnen tutkimuslupahakemuksen lähettämistä tulee ottaa yhteyttä niihin organisaatioihin ja yksiköihin, joissa tutkimus on tarkoitus toteuttaa. Mikäli yksikkö on kiinnostunut osallistumaan tutkimukseen, sovitaan käytännön toteutuksesta, kuten tutkimuksen kohderyhmästä, aineistonkeruun tavasta, aikataulusta, mahdollisista työaikakustannuksista ja organisaation yhteyshenkilöstä.\n\nYhteyshenkilön nimi ja yhteystiedot kysytään lupahakemuksella. Hakemuksessa on kuvattava selkeästi, missä yksiköissä tutkimus tehdään ja mitä tutkimuksen käytännön toteutuksesta on yhteyshenkilön kanssa sovittu.\n\nTutkimusluvan hakeminen yhdestä organisaatiosta\nMikäli tutkimus on tarkoitus toteuttaa vain yhdessä organisaatiossa, lupaa haetaan kyseisen organisaation omalla tutkimuslupahakemuslomakkeella.\n\nTutkimusluvan hakeminen useammasta organisaatiosta\nMikäli tutkimus kohdistuu useampaan Etelä-Suomen yhteistyöalueen organisaatioon, yhden hyvinvointialueen täytettyä tutkimuslupahakemusta voidaan käyttää luvan hakemiseen myös muilta organisaatioilta. Länsi-Uudenmaan hyvinvointialueen ja HUS:n tutkimuslupia haetaan niiden omien sähköisten järjestelmien kautta.\n\nMikäli yhteen organisaatioon tehty hakemus on tarkoitus lähettää edelleen useampaan organisaatioon, täytetty hakemus tallennetaan pdf-tiedostoksi ja toimitetaan sitten liitteineen sähköpostilla muiden kohdeorganisaatioiden kirjaamoihin. Helsingin kaupungin osalta on tärkeää mainita, että hakemus kohdistuu Helsingin sosiaali-, terveys- ja pelastustoimialaan.\n\nSähköpostiviestissä ilmoitetaan, kuka on yhteyshenkilö kyseisestä kohdeorganisaatiosta ja mitä hänen kanssaan on sovittu tutkimuksen käytännöistä. Hakemusta lähetettäessä on kuvattava tarkasti, miten ja missä yksiköissä tutkimus on tarkoitus toteuttaa kohdeorganisaatiossa.`;
  const {model}=parseProcessSection(source);
  const nodes=processNodes(model);
  assert.ok(nodes.length>=10,`expected >=10 actions, got ${nodes.length}`);
  assert.ok(nodes.some(n=>/ottaa yhteyttä/i.test(n.text)));
  assert.ok(nodes.some(n=>/tallennetaan pdf/i.test(n.text)));
  assert.ok(nodes.some(n=>/ilmoitetaan/i.test(n.text)));
});

test('VTR source preserves numbered 1-13 while nested publication note remains guidance',()=>{
  const source=`VTR\n1. VAKE-tutkijalla on tutkimusidea.\n2) VTR-toimikunta julkaisee hakuohjeen ja kertoo haun ajankohdan.\n3. TKKI uutisoi hausta. VAKE mainostaa omaa VTR-tukiklinikkaa.\n4) VAKE-tutkija ottaa yhteyttä TKKI-yksikköön heti, kun tietää hakevansa VTR:ää.\n5. TKKI pitää VTR-tukiklinikkaa.\n6) VAKE-tutkija noudattaa Valtion tutkimusrahoituksen hakuohjetta tutkijalle ja laatii hanke-ehdotuksen, jonka lähettää hakemuksen määräajassa HUS:n sähköiseen hakujärjestelmään.\n7. TKKI saa hakuajan päätyttyä tiedon kaikista saapuneista VAKEn hanke-ehdotuksista VTR-toimikunnalta.\n8) TKKI tarkastaa hanke-ehdotukset VTR-ohjeistuksen mukaisesti ja valitsee hakemukseen sisällytettävät hanke-ehdotukset.\n9. TKKI valmistelee viranhaltijapäätöksen hakuun mukaan lähtemisestä.\n10) TKKI valmistelee VAKEn hakemuksen liitteineen ja täyttää hakemuksen HUS:n e-lomakkeella.\n1. VAKEn julkaisuluettelo: Muistakaa VAKE-affiliaatio!\n11) TKKI ohjaa tutkijat kirjaamaan haetut rahoitukset VAKEn ideasalkkuun (Hypergene) nimellä VTR-Tutkimuksen nimi.\n12. HUS lähettää tiedon hyväksytyistä hankkeista VAKEn VTR-yhteyshenkilölle ja hän informoi VAKE-tutkijaa päätöksestä.\n13) TKKI siirtää hyväksytyt hankkeet ideasalkusta projektisalkkuun.`;
  const {model}=parseProcessSection(source);
  const nodes=processNodes(model);
  const sourceNumbers=nodes.map(n=>n.metadata.source_number).filter(Boolean);
  for(let i=1;i<=13;i++) assert.ok(sourceNumbers.includes(String(i)),`missing main number ${i}`);
  assert.equal(model.actors.filter(a=>a.name==='TKKI-yksikkö').length,1);
  assert.ok(nodes.some(n=>actorName(model,n)==='VAKE'));
  assert.ok(nodes.some(n=>actorName(model,n)==='VAKEn VTR-yhteyshenkilö'));
  assert.equal(nodes.some(n=>/julkaisuluettelo/i.test(n.text)),false);
});

test('system and document semantics stay inside responsibility actors',()=>{
  const source=`Rahoitusprosessi\n1. VAKE-tutkija lisää hankkeen ideasalkkuun Hypergeneen.\n2. VAKE-tutkija laatii rahoitushakemuksen.\n3. TKKI tarkistaa hakemuksen.`;
  const {model}=parseProcessSection(source);
  const nodes=processNodes(model);
  assert.equal(nodes[0].type,NODE_TYPES.SYSTEM);
  assert.equal(nodes[1].type,NODE_TYPES.DOCUMENT);
  assert.equal(model.actors.some(a=>/Tietojärjestelmät|Asiakirjat/i.test(a.name)),false);
});

test('deterministic imperative helper refuses unsafe object-case rewriting',()=>{
  const unsafe=safeImperativeSuggestion('Laatii rahoitushakemuksen');
  assert.equal(unsafe.status,'needs_review');
  assert.equal(unsafe.text,'Laatii rahoitushakemuksen');
  const safe=safeImperativeSuggestion('Antaa neuvontaa');
  assert.equal(safe.status,'suggested');
  assert.equal(safe.text,'Anna neuvontaa');
});

test('gibberish and unrelated headings do not become process nodes',()=>{
  const source=`Prosessi\nqwerty asdf zzzz !!!!\nTÄMÄ ON SATUNNAINEN OTSIKKO\n12345 !!! ???\nVAKE-tutkija saa tutkimusidean.`;
  const {model}=parseProcessSection(source);
  const nodes=processNodes(model);
  assert.equal(nodes.length,1);
  assert.match(nodes[0].text,/tutkimusidean/i);
});

test('clipboard Unicode and flattened numbering normalize without crashing',()=>{
  const source='Testiprosessi 1. VAKE‑tutkija saa tutkimusidean. 2) TKKI antaa neuvontaa. 3. Hankinta‑asiantuntija tekee arvion.';
  const normalized=normalizeInput(source);
  assert.equal(normalized.includes('‑'),false);
  const {model}=parseProcessSection(source);
  assert.equal(processNodes(model).length,3);
  assert.equal(model.actors.filter(a=>a.name==='TKKI-yksikkö').length,1);
});

test('document parser can return multiple process models',()=>{
  const source=`Ensimmäinen prosessi\n1. VAKE-tutkija saa tutkimusidean.\n\nToinen prosessi\n1. TKKI tarkistaa hakemuksen.`;
  const result=parseProcessDocument(source);
  assert.equal(result.models.length,2);
  assert.equal(processNodes(result.models[0]).length,1);
  assert.equal(processNodes(result.models[1]).length,1);
});
