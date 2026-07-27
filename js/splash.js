// ============================================================
// SPLASH ANIMATION
// ============================================================
const TAGS=['La solution pour gérer vos loyers en Afrique de l\'Ouest','Paiements mobiles : Orange Money, Wave, MTN...','Contrats numériques et suivi en temps réel'];
let si=0;
setInterval(()=>{
  si=(si+1)%3;
  document.querySelectorAll('.sp-dot').forEach((d,i)=>d.classList.toggle('on',i===si));
  const tag=document.getElementById('sp-tag');
  if(tag){tag.style.opacity='0';tag.style.transform='translateY(6px)';
    setTimeout(()=>{tag.textContent=TAGS[si];tag.style.opacity='1';tag.style.transform='translateY(0)';},280);}
},3000);

