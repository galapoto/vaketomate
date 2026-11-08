import { defineModule } from '../../packages/module-registry/src/module-registry.mjs';

export default defineModule({
  id:'prosessikuvaus',
  name:'Prosessikuvaus',
  version:'0.6.0-vaketomate.1',
  description:'VAKE/IMS-compliant process-description automation',
  routes:[
    {id:'prosessikuvaus.main',path:'/apps/prosessikuvaus/web/',label:'Prosessikuvaus'}
  ],
  capabilities:[
    'process.parse',
    'process.validate',
    'process.render.drawio',
    'process.render.html',
    'process.export',
    'platform.audit',
    'platform.sharing',
    'platform.approvals',
    'platform.reporting'
  ],
  integrations:[
    {id:'ims',status:'planned',mode:'approved-adapter-only'},
    {id:'outlook',status:'platform-scaffolded'},
    {id:'teams',status:'platform-scaffolded'},
    {id:'sharepoint',status:'planned'}
  ],
  dashboard:[
    {metric:'prosessikuvaus.drafts',label:'Luonnokset'},
    {metric:'prosessikuvaus.approvals_pending',label:'Odottaa hyväksyntää'},
    {metric:'prosessikuvaus.reviews_due',label:'Katselmointi tulossa'},
    {metric:'prosessikuvaus.validation_warnings',label:'Tarkistettavaa'}
  ]
});
