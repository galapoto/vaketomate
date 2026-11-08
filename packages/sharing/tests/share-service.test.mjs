import test from 'node:test';
import assert from 'node:assert/strict';
import { BrowserDownloadAdapter, ShareService, createSharePackage } from '../src/share-service.mjs';

test('BrowserDownloadAdapter revokes object URL after click task, not synchronously',async()=>{
  const events=[];
  const scheduled=[];
  const documentRef={createElement(){return {href:'',download:'',click(){events.push('click');}};}};
  const urlRef={
    createObjectURL(){events.push('create');return 'blob:test';},
    revokeObjectURL(url){events.push(`revoke:${url}`);}
  };
  const adapter=new BrowserDownloadAdapter({documentRef,urlRef,schedule:fn=>scheduled.push(fn)});
  const pkg=createSharePackage({module:'demo',subject:'Test',attachments:[{filename:'test.txt',content:'hello',mime_type:'text/plain'}]});
  const result=await adapter.send(pkg);
  assert.deepEqual(events,['create','click']);
  assert.deepEqual(result.downloads,['test.txt']);
  assert.equal(scheduled.length,1);
  scheduled[0]();
  assert.deepEqual(events,['create','click','revoke:blob:test']);
});

test('ShareService audits failed and successful adapter calls without swallowing errors',async()=>{
  const auditEvents=[];
  const audit={recordDomain:event=>auditEvents.push(event)};
  const service=new ShareService({audit,adapters:{
    ok:{async send(){return {ok:true};}},
    fail:{async send(){throw new Error('boom');}}
  }});
  const pkg=createSharePackage({module:'demo',entityType:'item',entityId:'1',subject:'Subject'});
  assert.deepEqual(await service.send('ok',pkg),{ok:true});
  await assert.rejects(()=>service.send('fail',pkg),/boom/);
  assert.ok(auditEvents.some(e=>e.eventType==='platform.share.completed'));
  assert.ok(auditEvents.some(e=>e.eventType==='platform.share.failed'&&e.severity==='error'));
});
