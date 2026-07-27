// ============================================================
// CHAT
// ============================================================
const REPLIES=['Merci pour votre message, je vais vérifier.','Bien reçu ! Je m\'en occupe.','D\'accord, je vous tiens informé.','Compris. Bonne journée !','Je ferai le nécessaire rapidement.'];
function sendMsg(){
  const inp=document.getElementById('ci');
  const txt=inp.value.trim();if(!txt)return;
  const area=document.getElementById('chat-msgs');
  const now=new Date();const t=now.getHours()+':'+String(now.getMinutes()).padStart(2,'0');
  const s=document.createElement('div');s.className='bubble s';s.innerHTML=`<p>${esc(txt)}</p><div class="bt">${t}</div>`;
  area.appendChild(s);inp.value='';area.scrollTop=9999;
  const ty=document.createElement('div');ty.className='bubble r';ty.id='ty-ind';ty.innerHTML='<p style="opacity:.4;letter-spacing:.12em">•••</p>';
  area.appendChild(ty);area.scrollTop=9999;
  setTimeout(()=>{
    const ind=document.getElementById('ty-ind');if(ind)ind.remove();
    const r=document.createElement('div');r.className='bubble r';r.innerHTML=`<p>${REPLIES[Math.floor(Math.random()*REPLIES.length)]}</p><div class="bt">${t}</div>`;
    area.appendChild(r);area.scrollTop=9999;
  },1100);
}
function esc(s){return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}

