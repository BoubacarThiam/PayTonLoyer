// ============================================================
// AUTH — ACCOUNTS STORE
// ============================================================
const ROLES={
  landlord:{label:'Propriétaire',icon:'🏠',dash:'dl',color:'linear-gradient(135deg,#E06050,#B84030)',av:'dl-av',nm:'dl-nm'},
  agent:   {label:'Agent immobilier',icon:'💼',dash:'da',color:'linear-gradient(135deg,#4070D8,#1A5CAE)',av:'da-av',nm:'da-nm'},
  tenant:  {label:'Locataire',icon:'🔑',dash:'dt',color:'linear-gradient(135deg,#50A040,#2E6820)',av:'dt-av',nm:'dt-nm'},
};
function getAcc(){try{return JSON.parse(localStorage.getItem('ptl_v2')||'[]');}catch{return[];}}
function saveAcc(a){localStorage.setItem('ptl_v2',JSON.stringify(a));}
function initials(n){return n.trim().split(' ').slice(0,2).map(w=>w[0].toUpperCase()).join('');}
function selLR(el,r){loginRole=r;document.querySelectorAll('#lr .role-c').forEach(c=>c.classList.remove('on'));el.classList.add('on');}
function swTab(t){
  document.getElementById('tab-l').classList.toggle('on',t==='log');
  document.getElementById('tab-r').classList.toggle('on',t==='reg');
  document.getElementById('f-log').style.display=t==='log'?'block':'none';
  document.getElementById('f-reg').style.display=t==='reg'?'block':'none';
  cErr('le-err');cErr('re-err');
}
function tp(id){const f=document.getElementById(id);f.type=f.type==='password'?'text':'password';}
function cErr(id){const e=document.getElementById(id);if(e)e.style.display='none';}
function sErr(id,msg){const e=document.getElementById(id);if(e){e.textContent='⚠️ '+msg;e.style.display='block';}}
function chkPwd(){
  const v=document.getElementById('rp').value;
  const w=document.getElementById('ps');if(!v){w.style.display='none';return;}w.style.display='block';
  let s=0;if(v.length>=8)s++;if(/[A-Z]/.test(v))s++;if(/[0-9]/.test(v))s++;if(/[^A-Za-z0-9]/.test(v))s++;
  const C=['#B82020','#A86808','#3A7828','#1A5CAE'],L=['Très faible','Faible','Bon','Excellent'];
  ['p1','p2','p3','p4'].forEach((id,i)=>{document.getElementById(id).style.background=i<s?C[s-1]:'var(--border)';});
  const lb=document.getElementById('pl');lb.textContent=L[s-1]||'';lb.style.color=C[s-1]||'var(--muted)';
}
function doLogin(){
  const email=document.getElementById('le').value.trim().toLowerCase();
  const pass=document.getElementById('lp').value;
  if(!email){sErr('le-err','Veuillez saisir votre adresse email.');return;}
  if(!pass){sErr('le-err','Veuillez saisir votre mot de passe.');return;}
  const u=getAcc().find(a=>a.email===email&&a.password===pass);
  if(!u){sErr('le-err','Email ou mot de passe incorrect. Vérifiez vos identifiants ou créez un compte.');return;}
  if(u.role!==loginRole){
    const m=ROLES[u.role]||{};
    sErr('le-err',`Ce compte est un "${m.label}". Sélectionnez le bon profil ci-dessus.`);
    const btn=document.querySelector(`#lr [data-role="${u.role}"]`);
    if(btn)selLR(btn,u.role);
    return;
  }
  cErr('le-err');
  CU=u;role=u.role;
  applyUser(u);
  S(ROLES[u.role].dash);
}
function doReg(){
  const name=document.getElementById('rn').value.trim();
  const tel=document.getElementById('rt').value.trim();
  const email=document.getElementById('re').value.trim().toLowerCase();
  const pass=document.getElementById('rp').value;
  const re=document.querySelector('#rr .role-c.on');
  const r=re?re.dataset.role:'landlord';
  if(!name){sErr('re-err','Veuillez saisir votre nom complet.');return;}
  if(!email||!email.includes('@')){sErr('re-err','Adresse email invalide.');return;}
  if(pass.length<8){sErr('re-err','Le mot de passe doit comporter au moins 8 caractères.');return;}
  const acc=getAcc();
  if(acc.find(a=>a.email===email)){sErr('re-err','Cette adresse email est déjà utilisée. Connectez-vous.');return;}
  const u={email,password:pass,name,tel,role:r,initials:initials(name),color:ROLES[r].color};
  acc.push(u);saveAcc(acc);CU=u;role=r;
  toast(`✅ Bienvenue ${name.split(' ')[0]} !`);
  applyUser(u);S(ROLES[r].dash);
}
function applyUser(u){
  const m=ROLES[u.role]||ROLES.landlord;
  const ini=u.initials||initials(u.name||'??');
  const fname=u.name?u.name.split(' ')[0]:'vous';
  // Profile page
  _el('p-av',e=>{e.textContent=ini;e.style.background=u.color||m.color;});
  _el('p-nm',e=>e.textContent=u.name||'Utilisateur');
  _el('p-rl',e=>e.textContent=m.label+' · Dakar, Sénégal');
  // Edit profile prefill
  _el('ep-name',e=>e.value=u.name||'');_el('ep-tel',e=>e.value=u.tel||'');_el('ep-email',e=>e.value=u.email||'');
  // Badges
  const bm={landlord:['4 propriétés','3 locataires'],agent:['12 mandats','3 baux ce mois'],tenant:['13 paiements','100% ponctuelle']};
  const [b1,b2]=(bm[u.role]||bm.landlord);
  _el('p-b1',e=>e.textContent=b1);_el('p-b2',e=>e.textContent=b2);
  // Header avatar + greeting
  _el(m.av,e=>{e.textContent=ini;e.style.background=u.color||m.color;});
  _el(m.nm,e=>e.textContent=fname+' 👋');
  // Pending count badge
  _el('dl-pending',e=>{if(u.role==='landlord')e.textContent='3';});
}
function showForgot(){
  const email=document.getElementById('le').value.trim().toLowerCase();
  const u=getAcc().find(a=>a.email===email);
  if(!email){toast('📧 Entrez votre email puis appuyez sur "Mot de passe oublié"');return;}
  if(u)toast('📧 Lien de réinitialisation envoyé à '+email);
  else sErr('le-err','Aucun compte trouvé pour cet email.');
}
function doLogout(){
  CU=null;loginRole='landlord';
  document.getElementById('le').value='';document.getElementById('lp').value='';
  cErr('le-err');
  const firstRole=document.querySelector('#lr [data-role="landlord"]');
  if(firstRole)selLR(firstRole,'landlord');
  S('auth');toast('👋 Déconnecté avec succès');
}
function _el(id,fn){const e=document.getElementById(id);if(e)fn(e);}

