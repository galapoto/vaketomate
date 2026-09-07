import { createId } from '../../contracts/src/events.mjs';

export function createArtefact({
  module,
  entityType,
  entityId,
  type,
  filename,
  mimeType,
  version=1,
  checksum=null,
  storageLocation=null,
  classification='internal',
  createdBy=null,
  metadata={}
}) {
  if (!module || !type || !filename) throw new Error('module, type and filename are required');
  return {
    artefact_id:createId('art'),
    module,
    entity_type:entityType || null,
    entity_id:entityId || null,
    type,
    filename,
    mime_type:mimeType || 'application/octet-stream',
    version,
    checksum,
    storage_location:storageLocation,
    classification,
    created_by:createdBy,
    metadata:{...metadata},
    created_at:new Date().toISOString()
  };
}

export class ArtefactRegistry {
  constructor({audit=null}={}) { this.audit=audit; this.items=[]; }
  register(input) {
    const artefact=input.artefact_id ? input : createArtefact(input);
    this.items.push(artefact);
    this.audit?.recordDomain?.({
      eventType:'platform.artefact.created',
      module:artefact.module,
      entityType:artefact.entity_type,
      entityId:artefact.entity_id,
      payload:{artefact_id:artefact.artefact_id,type:artefact.type,filename:artefact.filename,version:artefact.version}
    });
    return artefact;
  }
  list({module=null,entityId=null,type=null}={}) {
    return this.items.filter(a=>(!module||a.module===module)&&(!entityId||a.entity_id===entityId)&&(!type||a.type===type));
  }
  latest({module,entityId,type}) {
    return this.list({module,entityId,type}).sort((a,b)=>b.version-a.version)[0] || null;
  }
}
