/*
 * Central Outlook adapter boundary for VakeTomate.
 *
 * This file intentionally does not contain credentials or an OAuth implementation.
 * Production wiring must provide an organization-approved Graph client/token provider.
 * Every app calls the shared ShareService; no domain app implements its own Outlook sender.
 */

export class OutlookGraphAdapter {
  constructor({graphClient,fromUser='me'}={}) {
    if (!graphClient) throw new Error('graphClient is required');
    this.graphClient=graphClient;
    this.fromUser=fromUser;
  }

  async send(pkg) {
    if (!pkg.recipients?.length) throw new Error('At least one recipient is required');
    const message={
      subject:pkg.subject,
      body:{contentType:'HTML',content:toHtml(pkg.message,pkg.links)},
      toRecipients:pkg.recipients.map(toRecipient),
      ccRecipients:(pkg.cc||[]).map(toRecipient),
      attachments:(pkg.attachments||[])
        .filter(a=>a.base64_content)
        .map(a=>({
          '@odata.type':'#microsoft.graph.fileAttachment',
          name:a.filename,
          contentType:a.mime_type || 'application/octet-stream',
          contentBytes:a.base64_content
        }))
    };

    await this.graphClient.post(`/users/${encodeURIComponent(this.fromUser)}/sendMail`,{
      message,
      saveToSentItems:true
    });
    return {channel:'outlook',sent:true,recipient_count:pkg.recipients.length};
  }
}

function toRecipient(address) {
  if (typeof address === 'string') return {emailAddress:{address}};
  return {emailAddress:{address:address.address,name:address.name}};
}

function toHtml(message,links=[]) {
  const body=escapeHtml(message||'').replace(/\n/g,'<br>');
  const linkHtml=(links||[]).map(link=>{
    const url=typeof link === 'string' ? link : link.url;
    const label=typeof link === 'string' ? link : (link.label || link.url);
    return `<p><a href="${escapeHtml(url)}">${escapeHtml(label)}</a></p>`;
  }).join('');
  return `<div>${body}${linkHtml}</div>`;
}

function escapeHtml(value='') {
  return String(value)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#39;');
}
