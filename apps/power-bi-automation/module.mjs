import { defineModule } from '../../packages/module-registry/src/module-registry.mjs';

export default defineModule({
  id:'power-bi-automation',
  name:'Power BI Automation',
  version:'0.1.0-design',
  description:'Configuration-driven Power BI data/model/report automation',
  routes:[],
  capabilities:[
    'data.validate',
    'data.normalize',
    'report.generate',
    'platform.audit',
    'platform.sharing',
    'platform.reporting',
    'platform.scheduler'
  ],
  integrations:[
    {id:'fabric-power-bi',status:'planned'},
    {id:'sharepoint',status:'planned'},
    {id:'outlook',status:'platform-scaffolded'},
    {id:'teams',status:'platform-scaffolded'}
  ],
  dashboard:[
    {metric:'power-bi-automation.validation_warnings',label:'Datavaroitukset'},
    {metric:'power-bi-automation.refresh_failures',label:'Päivitysvirheet'}
  ]
});
