// ============================================================
// CHARTS
// ============================================================
const REV=[{m:'Jan',v:450000},{m:'Fév',v:525000},{m:'Mar',v:525000},{m:'Avr',v:525000},{m:'Mai',v:150000}];
function buildCharts(){
  buildBar('rc','rc-l',REV);buildBar('ac','ac-l',REV);buildPropBars();
}
function buildBar(wid,lid,data){
  const w=document.getElementById(wid);const l=document.getElementById(lid);
  if(!w)return;const max=Math.max(...data.map(d=>d.v));
  w.innerHTML='';l.innerHTML='';
  data.forEach((d,i)=>{
    const pct=Math.round((d.v/max)*85)+15;
    const b=document.createElement('div');b.className='bar'+(i===data.length-1?' hi':'');
    b.style.height='4px';b.style.transition=`height .52s cubic-bezier(.22,.68,0,1.2) ${i*55}ms`;
    b.innerHTML=`<div class="bar-v">${(d.v/1000).toFixed(0)}k</div>`;
    b.onclick=()=>{w.querySelectorAll('.bar').forEach(x=>x.classList.remove('hi'));b.classList.add('hi');};
    w.appendChild(b);
    const lb=document.createElement('div');lb.className='bar-l';lb.textContent=d.m;l.appendChild(lb);
    setTimeout(()=>{b.style.height=pct+'px';},50);
  });
}
function buildPropBars(){
  const pb=document.getElementById('pb');if(!pb)return;
  const props=[{n:'Appt. 3B',pct:30,a:'150k'},{n:'Villa 2',pct:40,a:'200k'},{n:'Appt. 1A',pct:35,a:'175k'},{n:'Studio Corniche',pct:0,a:'Vacant'}];
  pb.innerHTML=props.map(p=>`
    <div style="margin-bottom:13px">
      <div style="display:flex;justify-content:space-between;margin-bottom:4px">
        <span style="font-size:13px;font-weight:700;color:var(--ink)">${p.n}</span>
        <span style="font-size:13px;font-weight:800;color:${p.pct>0?'var(--terra)':'var(--hint)'}">${p.a} F/mois</span>
      </div>
      <div style="height:6px;background:var(--softer);border-radius:3px;overflow:hidden;border:1px solid var(--border)">
        <div class="pbar" data-pct="${p.pct}" style="height:100%;background:${p.pct>0?'var(--tg)':'var(--border)'};width:0%;border-radius:3px;transition:width .68s cubic-bezier(.22,.68,0,1.2)"></div>
      </div>
    </div>`).join('');
  setTimeout(()=>pb.querySelectorAll('.pbar').forEach(b=>b.style.width=b.dataset.pct+'%'),80);
}

