export function createMetric({module,name,value=1,unit='count',dimensions={},recordedAt=new Date().toISOString()}) {
  if (!module || !name) throw new Error('module and name are required');
  if (typeof value !== 'number' || Number.isNaN(value)) throw new Error('metric value must be numeric');
  return {module,name,value,unit,dimensions:{...dimensions},recorded_at:recordedAt};
}

export class InMemoryMetricStore {
  constructor(seed=[]) { this.metrics=[...seed]; }
  record(metric) { this.metrics.push(metric); return metric; }
  list({module=null,name=null,since=null}={}) {
    const sinceDate=since ? new Date(since) : null;
    return this.metrics.filter(m =>
      (!module || m.module===module) &&
      (!name || m.name===name) &&
      (!sinceDate || new Date(m.recorded_at)>=sinceDate)
    );
  }
  aggregate({module=null,name=null,since=null}={}) {
    return this.list({module,name,since}).reduce((sum,m)=>sum+m.value,0);
  }
}

export const STANDARD_METRICS = Object.freeze({
  RUNS:'automation.runs',
  FAILURES:'automation.failures',
  WARNINGS:'automation.warnings',
  ARTEFACTS:'artefacts.created',
  SHARES:'shares.sent',
  APPROVALS_PENDING:'approvals.pending',
  REVIEWS_DUE:'reviews.due'
});
