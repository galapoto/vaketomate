import { ModuleRegistry } from '../../packages/module-registry/src/module-registry.mjs';
import prosessikuvaus from '../prosessikuvaus/module.mjs';
import powerBi from '../power-bi-automation/module.mjs';

const registry=new ModuleRegistry([prosessikuvaus,powerBi]);
const modules=document.querySelector('#modules');
const moduleCount=document.querySelector('#moduleCount');
moduleCount.textContent=`${registry.list().length} moduulia rekisteröity`;

for (const module of registry.list()) {
  const card=document.createElement('article');
  card.className='moduleCard';
  const route=module.routes?.[0]?.path;
  const capabilityCount=module.capabilities?.length||0;
  const integrationText=(module.integrations||[]).map(i=>`${i.id}: ${i.status}`).join(' · ');
  card.innerHTML=`
    <div class="moduleTop">
      <div>
        <span class="moduleVersion">${escapeHtml(module.version)}</span>
        <h3>${escapeHtml(module.name)}</h3>
      </div>
      <span class="capabilityCount">${capabilityCount} kyvykkyyttä</span>
    </div>
    <p>${escapeHtml(module.description||'')}</p>
    <div class="integrationLine">${escapeHtml(integrationText||'Ei integraatioita määritelty')}</div>
    <div class="moduleActions">
      ${route ? `<a href="${route}">Avaa sovellus</a>` : '<span class="disabled">Toteutus suunnittelussa</span>'}
    </div>`;
  modules.append(card);
}

function escapeHtml(value='') {
  return String(value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
