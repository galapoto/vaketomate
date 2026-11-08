import test from 'node:test';
import assert from 'node:assert/strict';
import { parseProcessSection } from '../src/parser/deterministic-parser.mjs';
import { renderProcessSvg } from '../src/render/svg.mjs';

test('SVG renderer uses responsibility lanes without generic system/document lanes',()=>{
  const {model}=parseProcessSection(`Rahoitusprosessi\n1. VAKE-tutkija lisää hankkeen ideasalkkuun Hypergeneen.\n2. VAKE-tutkija laatii rahoitushakemuksen.\n3. TKKI tarkistaa hakemuksen.`);
  const svg=renderProcessSvg(model);
  assert.match(svg,/VAKE-tutkija/);
  assert.match(svg,/TKKI-yksikkö/);
  assert.doesNotMatch(svg,/Tietojärjestelmät/);
  assert.doesNotMatch(svg,/Asiakirjat \/ dokumentit/);
  assert.match(svg,/#C7E2AA/i);
  assert.match(svg,/#E6E6E6/i);
  assert.match(svg,/data-node-id=/);
});

test('SVG renderer XML-escapes user-supplied text',()=>{
  const {model}=parseProcessSection(`Turvaprosessi\n1. Käsittelijä kirjaa tekstin <script>alert("x")<\/script> & päätöksen.`);
  const svg=renderProcessSvg(model);
  assert.doesNotMatch(svg,/<script>/);
  assert.match(svg,/&lt;script&gt;/);
  assert.match(svg,/&amp;/);
});

test('SVG renderer exposes unresolved actor as a review lane rather than silently inventing one',()=>{
  const {model}=parseProcessSection(`Tutkimuslupa\nTutkimuslupahakemus tallennetaan pdf-tiedostoksi ja toimitetaan kirjaamoon.`);
  const svg=renderProcessSvg(model);
  assert.match(svg,/Tarkista toimija/);
});
