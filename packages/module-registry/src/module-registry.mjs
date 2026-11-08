export class ModuleRegistry {
  constructor(seed=[]) {
    this.modules=new Map();
    seed.forEach(manifest=>this.register(manifest));
  }

  register(manifest) {
    validateManifest(manifest);
    this.modules.set(manifest.id,Object.freeze({...manifest}));
    return this.modules.get(manifest.id);
  }

  get(id) { return this.modules.get(id) || null; }
  list() { return [...this.modules.values()]; }
  withCapability(capability) {
    return this.list().filter(m=>(m.capabilities||[]).includes(capability));
  }
}

export function defineModule(manifest) {
  validateManifest(manifest);
  return Object.freeze({
    version:'0.1.0',
    routes:[],
    capabilities:[],
    integrations:[],
    dashboard:[],
    ...manifest
  });
}

function validateManifest(manifest) {
  if (!manifest?.id || !manifest?.name) throw new Error('Module manifest requires id and name');
  if (!/^[a-z0-9-]+$/.test(manifest.id)) throw new Error(`Invalid module id: ${manifest.id}`);
}
