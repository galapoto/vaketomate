/* Central Teams sharing adapter boundary. Production wiring supplies an approved Microsoft Graph client. */

export class TeamsGraphAdapter {
  constructor({graphClient,targetResolver}={}) {
    if (!graphClient) throw new Error('graphClient is required');
    this.graphClient=graphClient;
    this.targetResolver=targetResolver;
  }

  async send(pkg,context={}) {
    const target=context.teamsTarget || pkg.metadata?.teams_target;
    if (!target) throw new Error('Teams target is required');
    const resolved=this.targetResolver ? await this.targetResolver(target,context) : target;
    const body={
      body:{
        contentType:'html',
        content:renderMessage(pkg)
      }
    };
    if (resolved.replyToId) {
      await this.graphClient.post(`/teams/${resolved.teamId}/channels/${resolved.channelId}/messages/${resolved.replyToId}/replies`,body);
    } else {
      await this.graphClient.post(`/teams/${resolved.teamId}/channels/${resolved.channelId}/messages`,body);
    }
    return {channel:'teams',sent:true,target:resolved};
  }
}

function renderMessage(pkg) {
  const links=(pkg.links||[]).map(link=>{
    const url=typeof link==='string'?link:link.url;
    const label=typeof link==='string'?link:(link.label||url);
    return `<li><a href="${escapeHtml(url)}">${escapeHtml(label)}</a></li>`;
  }).join('');
  return `<h3>${escapeHtml(pkg.subject)}</h3><p>${escapeHtml(pkg.message||'').replace(/\n/g,'<br>')}</p>${links?`<ul>${links}</ul>`:''}`;
}

function escapeHtml(value='') {
  return String(value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
