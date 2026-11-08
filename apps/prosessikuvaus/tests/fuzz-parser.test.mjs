import test from 'node:test';
import assert from 'node:assert/strict';
import { parseProcessSection, normalizeInput } from '../src/parser/deterministic-parser.mjs';
import { NODE_TYPES } from '../src/canonical-model.mjs';
import { validateAgainstVakeGuide } from '../src/guide-policy.mjs';

const BASE=`Rahoitusprosessi
1. VAKE-tutkija saa tutkimusidean.
2. TKKI antaa yleistä neuvontaa.
3. Hankinta-asiantuntija tekee hankintatapa-arvion.
4. IT-arkkitehti suunnittelee integraation.
5. VAKE-tutkija laatii rahoitushakemuksen.
6. VAKE-tutkija lisää hankkeen ideasalkkuun Hypergeneen.
7. TKKI tarkistaa hakemuksen.`;

function mutations(source){
  const variants=[];
  const hyphens=['-','‑','–','—','−'];
  const separators=['\n',' ','\u00a0','\u2028','\u2029'];
  const numberStyles=['$1. ','$1) ',' $1 . ',' $1 ) '];
  for(const h of hyphens) variants.push(source.replaceAll('-',h));
  for(const sep of separators) variants.push(source.replace(/\n/g,sep));
  for(const style of numberStyles) variants.push(source.replace(/(\d+)[.)]\s*/g,style));
  variants.push(`**${source.replaceAll('\n','**\n**')}**`);
  variants.push(source.replace(/\n/g,'\n\u200B'));
  variants.push(source.replace(/VAKE-tutkija/g,'VAKE\u00a0-tutkija'));
  variants.push(`qwerty !!!!\n${source}\nRANDOM HEADING\n12345`);
  variants.push(source.replace(/\n/g,'\r\n'));
  variants.push(source.replace(/\n/g,'\r'));
  // Repeat a deterministic corpus to catch order/state sensitivity while keeping CI fast.
  return Array.from({length:120},(_,i)=>variants[i%variants.length]);
}

function keyNodes(model){return model.nodes.filter(n=>![NODE_TYPES.START,NODE_TYPES.END].includes(n.type));}

function assertGraphIntegrity(model){
  const nodeIds=new Set(model.nodes.map(n=>n.id));
  assert.equal(nodeIds.size,model.nodes.length,'duplicate node id');
  assert.equal(new Set(model.edges.map(e=>e.id)).size,model.edges.length,'duplicate edge id');
  for(const edge of model.edges){
    assert.ok(nodeIds.has(edge.from),'edge from missing node');
    assert.ok(nodeIds.has(edge.to),'edge to missing node');
  }
  assert.equal(model.nodes.filter(n=>n.type===NODE_TYPES.START).length,1);
  assert.equal(model.nodes.filter(n=>n.type===NODE_TYPES.END).length,1);
}

test('120 deterministic clipboard mutations do not crash or corrupt graph references',()=>{
  for(const [index,input] of mutations(BASE).entries()){
    const {model}=parseProcessSection(input);
    assertGraphIntegrity(model);
    assert.ok(keyNodes(model).length>=4,`mutation ${index} retained too few process actions`);
    const severe=validateAgainstVakeGuide(model).filter(x=>x.code==='edge.orphan'||x.code.endsWith('.id.duplicate'));
    assert.deepEqual(severe,[],`mutation ${index} created structural validation errors`);
  }
});

test('normalization is idempotent across clipboard mutation corpus',()=>{
  for(const input of mutations(BASE)){
    const once=normalizeInput(input);
    const twice=normalizeInput(once);
    assert.equal(twice,once);
  }
});

test('extreme long but finite process input stays structurally valid',()=>{
  const lines=['Stressiprosessi'];
  for(let i=1;i<=80;i++) lines.push(`${i}. Käsittelijä käsittelee asian ${i}.`);
  const {model}=parseProcessSection(lines.join('\n'));
  assertGraphIntegrity(model);
  assert.equal(keyNodes(model).length,80);
  const issues=validateAgainstVakeGuide(model);
  assert.ok(issues.some(i=>i.code==='diagram.complexity.phases'));
});

test('XML-sensitive and HTML-like text remains data, not executable parser structure',()=>{
  const input=`Turvallisuustesti\n1. Käsittelijä kirjaa tekstin <script>alert("x")</script> & päätöksen.\n2. Käsittelijä käsittelee asian "A&B < C > D".`;
  const {model}=parseProcessSection(input);
  assertGraphIntegrity(model);
  assert.equal(keyNodes(model).length,2);
  assert.ok(keyNodes(model)[0].text.includes('<script>'));
});
