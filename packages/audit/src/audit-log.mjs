import { createEvent } from '../../contracts/src/events.mjs';

export class InMemoryAuditStore {
  constructor(seed=[]) { this.events = [...seed]; }
  append(event) { this.events.push(event); return event; }
  list({module=null, entityId=null, eventType=null}={}) {
    return this.events.filter(event =>
      (!module || event.module === module) &&
      (!entityId || event.entity_id === entityId) &&
      (!eventType || event.event_type === eventType)
    );
  }
  clear() { this.events.length = 0; }
}

export class LocalStorageAuditStore {
  constructor({key='vaketomate.audit.v1', storage=globalThis.localStorage}={}) {
    this.key = key;
    this.storage = storage;
  }
  _read() {
    if (!this.storage) return [];
    try { return JSON.parse(this.storage.getItem(this.key) || '[]'); }
    catch { return []; }
  }
  _write(events) {
    if (this.storage) this.storage.setItem(this.key, JSON.stringify(events));
  }
  append(event) {
    const events = this._read();
    events.push(event);
    this._write(events);
    return event;
  }
  list({module=null, entityId=null, eventType=null}={}) {
    return this._read().filter(event =>
      (!module || event.module === module) &&
      (!entityId || event.entity_id === entityId) &&
      (!eventType || event.event_type === eventType)
    );
  }
  clear() { this._write([]); }
}

export class AuditLog {
  constructor({store=new InMemoryAuditStore()}={}) { this.store = store; }

  record(input) {
    const event = input.event_type ? input : createEvent(input);
    return this.store.append(event);
  }

  recordDomain({eventType, module, entityType, entityId, actor=null, severity='info', payload={}, correlationId=null}) {
    return this.record(createEvent({eventType,module,entityType,entityId,actor,severity,payload,correlationId}));
  }

  list(filters={}) { return this.store.list(filters); }
}
