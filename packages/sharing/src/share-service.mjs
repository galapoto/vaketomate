import { createId } from '../../contracts/src/events.mjs';

export function createSharePackage({
  module,
  entityType,
  entityId,
  subject,
  message='',
  recipients=[],
  cc=[],
  attachments=[],
  links=[],
  classification='internal',
  metadata={}
}) {
  if (!module || !subject) throw new Error('module and subject are required');
  return {
    share_id:createId('share'),
    module,
    entity_type:entityType || null,
    entity_id:entityId || null,
    subject:String(subject),
    message:String(message),
    recipients:[...recipients],
    cc:[...cc],
    attachments:[...attachments],
    links:[...links],
    classification,
    metadata:{...metadata},
    created_at:new Date().toISOString()
  };
}

export class ShareService {
  constructor({adapters={},audit=null,policy=null}={}) {
    this.adapters = new Map(Object.entries(adapters));
    this.audit = audit;
    this.policy = policy;
  }

  register(name,adapter) {
    if (!name || !adapter?.send) throw new Error('Adapter must provide send(package)');
    this.adapters.set(name,adapter);
    return this;
  }

  available() { return [...this.adapters.keys()]; }

  async send(channel,sharePackage,context={}) {
    const adapter=this.adapters.get(channel);
    if (!adapter) throw new Error(`Unknown share channel: ${channel}`);
    if (this.policy?.assertAllowed) await this.policy.assertAllowed({channel,sharePackage,context});
    this._audit('platform.share.requested',sharePackage,{channel});
    try {
      const result=await adapter.send(sharePackage,context);
      this._audit('platform.share.completed',sharePackage,{channel,result:safeResult(result)});
      return result;
    } catch (error) {
      this._audit('platform.share.failed',sharePackage,{channel,error:String(error?.message||error)},'error');
      throw error;
    }
  }

  _audit(eventType,pkg,payload,severity='info') {
    this.audit?.recordDomain?.({
      eventType,
      module:pkg.module,
      entityType:pkg.entity_type,
      entityId:pkg.entity_id,
      severity,
      payload
    });
  }
}

export class BrowserDownloadAdapter {
  constructor({documentRef=globalThis.document,urlRef=globalThis.URL}={}) {
    this.documentRef=documentRef;
    this.urlRef=urlRef;
  }
  async send(pkg) {
    if (!this.documentRef || !this.urlRef) throw new Error('Browser download is unavailable');
    const downloads=[];
    for (const attachment of pkg.attachments) {
      const blob=attachment.blob instanceof Blob
        ? attachment.blob
        : new Blob([attachment.content ?? ''],{type:attachment.mime_type || 'application/octet-stream'});
      const url=this.urlRef.createObjectURL(blob);
      const a=this.documentRef.createElement('a');
      a.href=url;
      a.download=attachment.filename || 'attachment';
      a.click();
      this.urlRef.revokeObjectURL(url);
      downloads.push(a.download);
    }
    return {channel:'download',downloads};
  }
}

export class ClipboardShareAdapter {
  constructor({clipboard=globalThis.navigator?.clipboard}={}) { this.clipboard=clipboard; }
  async send(pkg) {
    if (!this.clipboard?.writeText) throw new Error('Clipboard API is unavailable');
    const text=[pkg.subject,pkg.message,...pkg.links.map(link=>link.url||link)].filter(Boolean).join('\n\n');
    await this.clipboard.writeText(text);
    return {channel:'clipboard',copied:true};
  }
}

function safeResult(result) {
  try { return JSON.parse(JSON.stringify(result)); }
  catch { return {ok:true}; }
}
