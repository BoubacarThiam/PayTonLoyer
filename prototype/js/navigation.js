// ============================================================
// NAVIGATION
// ============================================================
function S(id){
  const o=document.getElementById(cur);
  const n=document.getElementById(id);
  if(!n)return;
  if(o)o.classList.add('hidden');
  n.classList.remove('hidden');
  n.style.opacity='0';n.style.transform='translateY(8px)';
  requestAnimationFrame(()=>{
    n.style.transition='opacity .26s ease,transform .26s cubic-bezier(.22,.68,0,1.2)';
    n.style.opacity='1';n.style.transform='translateY(0)';
    setTimeout(()=>{n.style.transition='';},300);
  });
  prev=cur;cur=id;
  if(id==='analytics'||id==='dl')buildCharts();
}
function back(){S(prev);}
function setTabs(tbId,idx){
  const tb=document.getElementById(tbId);
  if(!tb)return;
  tb.querySelectorAll('.tbt').forEach((t,i)=>t.classList.toggle('on',i===idx));
}
function navL(i,id){S(id);setTabs('tl',i);}
function navT(i,id){S(id);setTabs('tt',i);}
function navA(i,id){S(id);setTabs('ta',i);}

