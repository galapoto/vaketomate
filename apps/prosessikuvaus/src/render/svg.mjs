import { NODE_TYPES, EDGE_TYPES, nodeActor } from '../canonical-model.mjs';
import { VAKE_COLORS } from '../guide-policy.mjs';

const LANE_LABEL_WIDTH=150;
const LANE_HEIGHT=120;
const HEADER_HEIGHT=48;
const NODE_WIDTH=150;
const NODE_HEIGHT=58;
const X_GAP=195;
const START_X=185;

/**
 * Lightweight canonical-model renderer used by the simple browser UI and HTML reports.
 * DrawIO remains a separate export renderer. Systems/documents are node shapes inside
 * responsibility lanes; they never create generic auxiliary lanes.
 */
export function renderProcessSvg(model,{minWidth=900}={}) {
  const actors=orderedActors(model);
  const actorIndex=new Map(actors.map((a,i)=>[a.id,i]));
  const positions=layoutNodes(model,actorIndex);
  const maxX=Math.max(0,...[...positions.values()].map(p=>p.x));
  const width=Math.max(minWidth,maxX+NODE_WIDTH+90);
  const height=HEADER_HEIGHT+Math.max(1,actors.length)*LANE_HEIGHT+38;
  const title=escapeXml(model.title||'Prosessi');

  const parts=[`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="${title}">`,styles(),`<rect width="100%" height="100%" fill="#ffffff"/>`];
  parts.push(`<text x="${width/2}" y="29" text-anchor="middle" class="process-title">${title}</text>`);

  actors.forEach((actor,i)=>{
    const y=HEADER_HEIGHT+i*LANE_HEIGHT;
    parts.push(`<rect x="0" y="${y}" width="${width}" height="${LANE_HEIGHT}" class="lane"/>`);
    parts.push(`<rect x="0" y="${y}" width="${LANE_LABEL_WIDTH}" height="${LANE_HEIGHT}" class="lane-label-bg"/>`);
    parts.push(`<text x="${LANE_LABEL_WIDTH/2}" y="${y+LANE_HEIGHT/2}" text-anchor="middle" dominant-baseline="middle" class="lane-label">${wrapTspans(actor.name,LANE_LABEL_WIDTH/2,y+LANE_HEIGHT/2,20,18)}</text>`);
  });

  // If no resolved actor exists yet, keep one quiet review lane instead of rendering a blank canvas.
  if(!actors.length){
    parts.push(`<rect x="0" y="${HEADER_HEIGHT}" width="${width}" height="${LANE_HEIGHT}" class="lane"/>`);
    parts.push(`<rect x="0" y="${HEADER_HEIGHT}" width="${LANE_LABEL_WIDTH}" height="${LANE_HEIGHT}" class="lane-label-bg unresolved"/>`);
    parts.push(`<text x="${LANE_LABEL_WIDTH/2}" y="${HEADER_HEIGHT+LANE_HEIGHT/2}" text-anchor="middle" class="lane-label">Tarkista toimija</text>`);
  }

  for(const edge of model.edges||[]){
    const from=positions.get(edge.from),to=positions.get(edge.to);
    if(!from||!to) continue;
    parts.push(renderEdge(edge,from,to));
  }

  for(const node of model.nodes||[]){
    const pos=positions.get(node.id);
    if(!pos) continue;
    parts.push(renderNode(model,node,pos));
  }

  parts.push('</svg>');
  return parts.join('');
}

export function layoutNodes(model,actorIndex=new Map(orderedActors(model).map((a,i)=>[a.id,i]))) {
  const positions=new Map();
  const sequence=displayOrder(model);
  let column=0;
  for(const node of sequence){
    if(node.type===NODE_TYPES.START){
      positions.set(node.id,{x:LANE_LABEL_WIDTH+24,y:HEADER_HEIGHT+LANE_HEIGHT/2-20,w:40,h:40});
      continue;
    }
    if(node.type===NODE_TYPES.END) continue;
    const lane=Math.max(0,actorIndex.get(node.actor_id)??0);
    const x=START_X+column*X_GAP;
    const y=HEADER_HEIGHT+lane*LANE_HEIGHT+(LANE_HEIGHT-NODE_HEIGHT)/2;
    positions.set(node.id,{x,y,w:NODE_WIDTH,h:NODE_HEIGHT,lane});
    column++;
  }
  const end=model.nodes.find(n=>n.type===NODE_TYPES.END);
  if(end){
    const x=START_X+Math.max(1,column)*X_GAP;
    positions.set(end.id,{x,y:HEADER_HEIGHT+LANE_HEIGHT/2-20,w:40,h:40});
  }
  return positions;
}

function orderedActors(model){
  const used=[];const seen=new Set();
  for(const node of displayOrder(model)){
    if(!node.actor_id||seen.has(node.actor_id)) continue;
    const actor=nodeActor(model,node);
    if(!actor) continue;
    seen.add(node.actor_id);used.push(actor);
  }
  return used;
}

function displayOrder(model){
  // Canonical parser currently emits source-order nodes. For edited/branched graphs,
  // stable array order remains preferable to inventing a topological ordering that
  // could hide returns. Future branch layout can replace this without changing UI.
  return [...(model.nodes||[])];
}

function renderEdge(edge,from,to){
  const x1=from.x+from.w,y1=from.y+from.h/2;
  const x2=to.x,y2=to.y+to.h/2;
  const mid=Math.max(x1+22,(x1+x2)/2);
  const dashed=edge.type===EDGE_TYPES.DATA_FLOW?' stroke-dasharray="5 5"':'';
  const cls=edge.type===EDGE_TYPES.RETURN?'edge return-edge':'edge';
  const marker=edge.type===EDGE_TYPES.INTERACTION?' marker-start="url(#arrowStart)"':'';
  const path=`M ${x1} ${y1} L ${mid} ${y1} L ${mid} ${y2} L ${x2} ${y2}`;
  const label=String(edge.label||edge.condition||'').trim();
  return `<g><path d="${path}" class="${cls}"${dashed}${marker} marker-end="url(#arrowEnd)"/>${label?`<text x="${mid+4}" y="${Math.min(y1,y2)+Math.abs(y1-y2)/2-5}" class="edge-label">${escapeXml(label)}</text>`:''}</g>`;
}

function renderNode(model,node,p){
  if(node.type===NODE_TYPES.START||node.type===NODE_TYPES.END){
    const r=17,cx=p.x+20,cy=p.y+20;
    return `<circle cx="${cx}" cy="${cy}" r="${r}" class="terminal ${node.type}"/>`;
  }
  const text=escapeXml(node.text||'');
  const data=`data-node-id="${escapeXml(node.id)}"`;
  if(node.type===NODE_TYPES.DECISION){
    const cx=p.x+p.w/2,cy=p.y+p.h/2;
    const pts=`${cx},${p.y-8} ${p.x+p.w+8},${cy} ${cx},${p.y+p.h+8} ${p.x-8},${cy}`;
    return `<g class="diagram-node" ${data}><polygon points="${pts}" fill="${VAKE_COLORS.activity_green}" class="node-shape"/><text x="${cx}" y="${cy-8}" text-anchor="middle" class="node-text">${wrapTspans(text,cx,cy-8,23,15)}</text></g>`;
  }
  if(node.type===NODE_TYPES.SYSTEM){
    return `<g class="diagram-node" ${data}><path d="M ${p.x} ${p.y+10} C ${p.x} ${p.y-2},${p.x+p.w} ${p.y-2},${p.x+p.w} ${p.y+10} L ${p.x+p.w} ${p.y+p.h-8} C ${p.x+p.w} ${p.y+p.h+4},${p.x} ${p.y+p.h+4},${p.x} ${p.y+p.h-8} Z" fill="${VAKE_COLORS.neutral_fill}" class="node-shape neutral"/><ellipse cx="${p.x+p.w/2}" cy="${p.y+10}" rx="${p.w/2}" ry="10" fill="${VAKE_COLORS.neutral_fill}" class="node-shape neutral"/><text x="${p.x+p.w/2}" y="${p.y+27}" text-anchor="middle" class="node-text">${wrapTspans(text,p.x+p.w/2,p.y+27,23,15)}</text></g>`;
  }
  if(node.type===NODE_TYPES.DOCUMENT){
    const waveY=p.y+p.h-8;
    const d=`M ${p.x} ${p.y} H ${p.x+p.w} V ${waveY} Q ${p.x+p.w*.75} ${p.y+p.h+5},${p.x+p.w*.5} ${waveY} Q ${p.x+p.w*.25} ${p.y+p.h-16},${p.x} ${waveY} Z`;
    return `<g class="diagram-node" ${data}><path d="${d}" fill="${VAKE_COLORS.neutral_fill}" class="node-shape neutral"/><text x="${p.x+p.w/2}" y="${p.y+21}" text-anchor="middle" class="node-text">${wrapTspans(text,p.x+p.w/2,p.y+21,23,15)}</text></g>`;
  }
  return `<g class="diagram-node" ${data}><rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" rx="2" fill="${VAKE_COLORS.activity_green}" class="node-shape activity"/><text x="${p.x+p.w/2}" y="${p.y+20}" text-anchor="middle" class="node-text">${wrapTspans(text,p.x+p.w/2,p.y+20,23,15)}</text></g>`;
}

function wrapTspans(text,x,y,maxChars,lineHeight){
  const words=String(text||'').replace(/&amp;/g,'&').split(/\s+/u);
  const lines=[];let current='';
  for(const word of words){
    if(!current) current=word;
    else if((current+' '+word).length<=maxChars) current+=' '+word;
    else {lines.push(current);current=word;}
  }
  if(current)lines.push(current);
  return lines.slice(0,4).map((line,i)=>`<tspan x="${x}" dy="${i===0?0:lineHeight}">${escapeXml(line)}</tspan>`).join('');
}

function styles(){return `<defs><marker id="arrowEnd" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#4b5563"/></marker><marker id="arrowStart" markerWidth="8" markerHeight="8" refX="1" refY="4" orient="auto"><path d="M8,0 L0,4 L8,8 z" fill="#4b5563"/></marker></defs><style>.process-title{font:600 15px Arial,sans-serif;fill:#26384a}.lane{fill:#fff;stroke:#c9d2dc;stroke-width:1}.lane-label-bg{fill:#f7f9fb;stroke:#c9d2dc}.lane-label-bg.unresolved{fill:#fff7e6}.lane-label{font:600 12px Arial,sans-serif;fill:#334155}.node-shape{stroke:#7b8794;stroke-width:1}.node-shape.activity{stroke:none;filter:drop-shadow(1px 2px 1px rgba(0,0,0,.12))}.node-shape.neutral{stroke:${VAKE_COLORS.neutral_stroke}}.node-text{font:11px Arial,sans-serif;fill:#203040}.edge{fill:none;stroke:#4b5563;stroke-width:1.15}.return-edge{stroke:#8a5b24}.edge-label{font:10px Arial,sans-serif;fill:#5b6570}.terminal{fill:#fff;stroke:#222;stroke-width:1.5}.terminal.end{stroke-width:2.4}</style>`;}

function escapeXml(value=''){return String(value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');}
